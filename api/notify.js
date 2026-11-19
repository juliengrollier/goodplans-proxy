/**
 * Good Plans — /api/notify : push notifications
 *
 * POST (from the app)   { user, dev, sub, tz, saved, bells, prefs, action }
 *   action "sync" (default) stores this phone's subscription and the person's saved events, bells and settings;
 *   "test" also sends a test notification to this phone; "off" removes this phone.
 * GET ?run=1            the scheduler (every ~30 min, public, rate-limited): sends what is due.
 * GET ?key=…&stats=1    overview for maintenance.
 *
 * What gets sent
 *   Saved events: one reminder before it starts (about 2½ h before with a "leave by" time, or the evening before
 *   for morning events, or 10 AM the day of when there's no time); "ends soon" for long runs; time or venue changes.
 *   Bells (interests, venues, series): at most one bundle a day, at the time the person picked, with new events that match.
 *   Nothing is sent while the phone's clock is far from New York time (away from the city), except tests.
 * Storage (private Blob): push/u/<user>.json written by the app, push/s/<user>.json written here, push/feed.json cache.
 */
import { getJSON, putJSON, blobApi } from "./_blob.js";
import { sendPush, VAPID_PUBLIC } from "./_webpush.js";
import { ACT_RE } from "./activity-ids.js";
import { CAT_RE } from "./taxonomy-re.js";

export const config = { maxDuration: 60 };
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const NY = "America/New_York";
const uKey = (u) => "push/u/" + u + ".json", sKey = (u) => "push/s/" + u + ".json";
const clean = (s, n = 40) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, n);

function cors(req, res) {
  const o = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(o) ? o : "https://goodplans.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
async function listAll(prefix) {
  const out = []; let cursor = "";
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ prefix, limit: "1000" }); if (cursor) q.set("cursor", cursor);
    const d = await blobApi("?" + q.toString(), { method: "GET" });
    out.push(...(d.blobs || [])); if (!d.hasMore || !d.cursor) break; cursor = d.cursor;
  }
  return out;
}

// ── Time helpers: a date (YYYY-MM-DD) and minutes since midnight in a time zone
function clock(tz, at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((x) => [x.type, x.value]));
  return { day: p.year + "-" + p.month + "-" + p.day, min: +p.hour * 60 + +p.minute };
}
const offsetMin = (tz, at = new Date()) => { try { const c = clock(tz, at), u = clock("UTC", at); let d = c.min - u.min; if (c.day > u.day) d += 1440; if (c.day < u.day) d -= 1440; return d; } catch { return null; } };
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
const hm = (m) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ":" + String(mm).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); };
const wd = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
const shortWhen = (e, today) => { const d = dayDiff(today, e.E < today ? today : e.E); const day = d <= 0 ? "Today" : d === 1 ? "Tomorrow" : wd(e.E < today ? today : e.E); const t = /\d/.test(e.time || "") ? " " + String(e.time).split(/\s*[-–]\s*/)[0].replace(/:00/g, "") : ""; return day + t; };

// ── Matching new events to bells (same notions as the app: activities, categories, words, venue, series)
const parseMin = (t) => { const m = String(t || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i); if (!m) return null; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + (+m[2] || 0); };
const venueKey = (e) => String(e.venue || "").split(",")[0].trim().toLowerCase();
const seriesKey = (e) => String(e.title || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 5).join(" ");
const reCache = {};
const re = (src) => (reCache[src] = reCache[src] || (() => { try { return new RegExp(src, "i"); } catch { return null; } })());
function matches(e, b) {
  if (b.venue) return venueKey(e) === b.venue;
  if (b.series) return seriesKey(e) === b.series;
  const text = (e.title + " " + (e.desc || "") + " " + (e.venue || "")).toLowerCase();
  if ((b.acts || []).some((a) => ACT_RE[a] && re(ACT_RE[a])?.test(text))) return true;
  if ((b.cats || []).some((c) => CAT_RE[c] && re(CAT_RE[c])?.test(text))) return true;
  if ((b.words || []).some((w) => w && text.includes(String(w).toLowerCase()))) return true;
  return false;
}

// ── The event feed, cached for two hours
async function feed() {
  const c = await getJSON("push/feed.json").catch(() => null);
  if (c && Date.now() - c.at < 2 * 3600e3) return c.events;
  const u = process.env.GP_FEED_URL + (process.env.GP_FEED_URL.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(process.env.GP_FEED_KEY || "");
  const f = await (await fetch(u, { redirect: "follow" })).json();
  const events = (f.events || []).filter((e) => e.id && e.E).map((e) => ({ id: e.id, title: e.title, E: e.E, X: e.X, time: e.time, venue: e.venue, desc: String(e.desc || "").slice(0, 240), tier: e.tier }));
  await putJSON("push/feed.json", { at: Date.now(), events }).catch(() => {});
  return events;
}

// ── What is due for one person right now
export function due(doc, st, events, now) {
  const out = [], ny = clock(NY, now), today = ny.day;
  const tz = Object.values(doc.devices || {}).sort((a, b) => (b.at || 0) - (a.at || 0))[0]?.tz || NY;
  const away = Math.abs((offsetMin(tz, now) ?? -300) - offsetMin(NY, now)) > 90;
  const prefs = doc.prefs || {}, sent = st.sent || {};
  const once = (k, msg) => { if (!sent[k]) out.push({ ...msg, key: k }); };
  if (away) return { out, away };

  // Saved events
  if (prefs.reminders !== false) {
    const byId = Object.fromEntries(events.map((e) => [e.id, e]));
    for (const s0 of doc.saved || []) {
      // the feed's latest time wins when it changed since saving
      const f0 = byId[s0.id], fm = f0 && parseMin(f0.time);
      const s = fm != null && fm !== s0.sm && !(s0.X && s0.X > s0.E) ? { ...s0, sm: fm } : s0;
      const days = (s.days && s.days.length ? s.days : [s.E]).filter(Boolean);
      const where = String(s.venue || "").split(",")[0];
      const leave = (start) => (s.tt ? " · leave by " + hm(start - s.tt - 5) + " (" + s.tt + " min)" : "");
      const run = s.X && s.X > s.E && !s.dows; // on every day for a while: no daily reminders, only "ends soon"
      if (!run) {
        const tom = addDays(today, 1);
        if (days.includes(today)) {
          if (s.sm != null && s.sm >= 11.5 * 60) {
            if (ny.min >= s.sm - 150 && ny.min <= s.sm - 20) once("rem:" + s.id + ":" + today, { title: (s.sm >= 17 * 60 ? "Tonight " : "Today ") + hm(s.sm) + " · " + s.title, body: where + leave(s.sm), url: "/?event=" + encodeURIComponent(s.id), tag: "rem-" + s.id });
          } else if (s.sm == null && ny.min >= 600 && ny.min <= 1080) {
            once("rem:" + s.id + ":" + today, { title: "Today · " + s.title, body: where, url: "/?event=" + encodeURIComponent(s.id), tag: "rem-" + s.id });
          }
        }
        // Morning events: the evening before
        if (days.includes(tom) && s.sm != null && s.sm < 11.5 * 60 && ny.min >= 1140 && ny.min <= 1290)
          once("rem:" + s.id + ":" + tom, { title: "Tomorrow " + hm(s.sm) + " · " + s.title, body: where + leave(s.sm), url: "/?event=" + encodeURIComponent(s.id), tag: "rem-" + s.id });
      } else {
        const left = dayDiff(today, s.X);
        if (left >= 0 && left <= 3 && ny.min >= 720 && ny.min <= 1200)
          once("last:" + s.id, { title: (left === 0 ? "Last day today" : "Ends " + (left === 1 ? "tomorrow" : wd(s.X))) + " · " + s.title, body: where + (s.time && /\d/.test(s.time) ? " · " + s.time : ""), url: "/?event=" + encodeURIComponent(s.id), tag: "rem-" + s.id });
      }
      // Changes since it was saved
      const f = byId[s.id];
      const nt = (t) => String(t || "").toLowerCase().replace(/\s+/g, "");
      if (f && (f.X || f.E) >= today && ny.min >= 540 && ny.min <= 1320) {
        if (/\d/.test(f.time || "") && /\d/.test(s.time || "") && nt(f.time) !== nt(s.time))
          once("chg:" + s.id + ":" + nt(f.time), { title: "Time changed · " + s.title, body: "Now " + f.time + " (" + shortWhen(f, today).split(" ")[0] + ")", url: "/?event=" + encodeURIComponent(s.id), tag: "chg-" + s.id });
        if (f.venue && s.venue && venueKey(f) !== venueKey(s))
          once("chg:" + s.id + ":v:" + clean(f.venue), { title: "New venue · " + s.title, body: "Now at " + f.venue, url: "/?event=" + encodeURIComponent(s.id), tag: "chg-" + s.id });
      }
    }
  }

  // Bells: one bundle a day at the chosen hour (phone's local time), new matching events in the next two weeks
  const bells = doc.bells || [];
  if (bells.length && prefs.digest !== false) {
    const loc = clock(tz, now), at = (prefs.digestAt ?? 12) * 60;
    if (loc.min >= at && loc.min <= at + 240 && !sent["dig:" + loc.day]) {
      const seen = new Set(st.seen || []), savedIds = new Set((doc.saved || []).map((s) => s.id));
      const hits = [];
      for (const e of events) {
        if ((e.X || e.E) < today || e.E > addDays(today, 14) || seen.has(e.id) || savedIds.has(e.id)) continue;
        const b = bells.find((x) => matches(e, x));
        if (b) hits.push({ e, b });
      }
      // one listing per series, best first: newsletter top picks, then soonest
      const bySeries = new Map(); hits.forEach((h) => { const k = seriesKey(h.e) + "@" + venueKey(h.e); if (!bySeries.has(k)) bySeries.set(k, h); });
      const list = [...bySeries.values()].sort((a, b) => (a.e.tier || 2) - (b.e.tier || 2) || (a.e.E < b.e.E ? -1 : 1));
      if (list.length) {
        const labels = [...new Set(list.map((h) => h.b.label))];
        const lines = list.slice(0, 3).map((h) => h.e.title + " · " + shortWhen(h.e, today));
        out.push({
          key: "dig:" + loc.day, newIds: hits.map((h) => h.e.id),
          title: "New for you: " + labels.slice(0, 2).join(" & ") + (labels.length > 2 ? " +" + (labels.length - 2) : ""),
          body: lines.join("\n") + (list.length > 3 ? "\n+" + (list.length - 3) + " more" : ""),
          url: "/?ids=" + encodeURIComponent(list.slice(0, 30).map((h) => h.e.id).join(",")) + "&list=" + encodeURIComponent("New for you"),
          tag: "digest",
        });
      }
    }
  }
  return { out, away };
}

async function deliver(u, doc, st, msgs) {
  const devs = Object.entries(doc.devices || {}).filter(([, d]) => d.sub?.endpoint && !(st.gone || []).includes(d.sub.endpoint));
  let ok = 0;
  for (const m of msgs) {
    const r = await Promise.all(devs.map(([, d]) => sendPush(d.sub, { title: m.title, body: m.body, url: m.url, tag: m.tag }).catch((e) => ({ ok: false, err: String(e.message || e) }))));
    r.forEach((x, i) => { if (x.gone) st.gone = [...new Set([...(st.gone || []), devs[i][1].sub.endpoint])].slice(-50); });
    if (r.some((x) => x.ok)) ok++;
    st.sent = st.sent || {}; st.sent[m.key] = Date.now();
    if (m.newIds) st.seen = [...new Set([...(st.seen || []), ...m.newIds])].slice(-3000);
    st.log = [...(st.log || []), { t: Date.now(), title: m.title, ok: r.filter((x) => x.ok).length, of: r.length }].slice(-30);
  }
  // forget old send records
  for (const [k, t] of Object.entries(st.sent || {})) if (Date.now() - t > 40 * 864e5) delete st.sent[k];
  return ok;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Blob store not connected" });
  const authed = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  try {
    // ── From the app
    if (req.method === "POST") {
      if (!ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const u = clean(b.user, 20), dev = clean(b.dev, 20);
      if (!u || !dev) return res.status(400).json({ error: "user and dev required" });
      const doc = (await getJSON(uKey(u)).catch(() => null)) || { user: u, devices: {} };
      if (b.action === "off") delete doc.devices[dev];
      else {
        if (b.sub?.endpoint && b.sub?.keys?.p256dh) doc.devices[dev] = { sub: { endpoint: b.sub.endpoint, keys: b.sub.keys }, tz: String(b.tz || NY).slice(0, 40), at: Date.now(), ua: String(req.headers["user-agent"] || "").slice(0, 120) };
        else if (doc.devices[dev]) doc.devices[dev].tz = String(b.tz || doc.devices[dev].tz || NY).slice(0, 40);
        if (Array.isArray(b.saved)) doc.saved = b.saved.slice(0, 200).map((s) => ({ id: String(s.id).slice(0, 100), title: String(s.title || "").slice(0, 140), venue: String(s.venue || "").slice(0, 120), E: s.E, X: s.X || null, time: String(s.time || "").slice(0, 40), sm: Number.isFinite(s.sm) ? s.sm : null, days: (s.days || []).slice(0, 8), tt: Number.isFinite(s.tt) ? Math.round(s.tt) : null, dows: !!s.dows }));
        if (Array.isArray(b.bells)) doc.bells = b.bells.slice(0, 60).map((x) => ({ key: String(x.key).slice(0, 120), label: String(x.label || "").slice(0, 60), acts: (x.acts || []).slice(0, 30), cats: (x.cats || []).slice(0, 10), words: (x.words || []).slice(0, 10), venue: x.venue || undefined, series: x.series || undefined }));
        if (b.prefs) doc.prefs = { reminders: b.prefs.reminders !== false, digest: b.prefs.digest !== false, digestAt: Math.max(7, Math.min(21, +b.prefs.digestAt || 12)) };
      }
      doc.at = Date.now();
      await putJSON(uKey(u), doc);
      let test = null;
      if (b.action === "test" && doc.devices[dev]) {
        test = await sendPush(doc.devices[dev].sub, { title: "Good Plans notifications are on", body: "Reminders for saved plans, and new events for the things you bell.", url: "/", tag: "test" }, { ttl: 600, urgency: "high" }).catch((e) => ({ ok: false, err: String(e.message || e) }));
      }
      return res.status(200).json({ ok: true, devices: Object.keys(doc.devices).length, test });
    }

    // ── Overview
    if (authed && req.query.stats) {
      const blobs = await listAll("push/u/");
      const users = await Promise.all(blobs.map(async (x) => { const u = x.pathname.slice(7, -5); const [d, s] = await Promise.all([getJSON(uKey(u)), getJSON(sKey(u)).catch(() => null)]); return { user: u, devices: Object.keys(d?.devices || {}).length, saved: (d?.saved || []).length, bells: (d?.bells || []).map((b) => b.label), prefs: d?.prefs, log: (s?.log || []).slice(-8) }; }));
      return res.status(200).json({ users });
    }

    // ── Scheduler
    if (req.query.run) {
      const now = req.query.at && authed ? new Date(req.query.at) : new Date();
      const run = (await getJSON("push/run.json").catch(() => null)) || {};
      if (!authed && Date.now() - (run.at || 0) < 4 * 60e3) return res.status(200).json({ skipped: "ran recently" });
      await putJSON("push/run.json", { at: Date.now() });
      const blobs = await listAll("push/u/");
      if (!blobs.length) return res.status(200).json({ users: 0 });
      const events = await feed().catch(() => []);
      const report = [];
      for (const x of blobs) {
        const u = x.pathname.slice(7, -5);
        const doc = await getJSON(uKey(u)).catch(() => null); if (!doc) continue;
        const st = (await getJSON(sKey(u)).catch(() => null)) || {};
        const { out, away } = due(doc, st, events, now);
        if (req.query.dry && authed) { report.push({ user: u, away, would: out.map((m) => m.title + " — " + m.body) }); continue; }
        const sent = out.length ? await deliver(u, doc, st, out) : 0;
        if (out.length) await putJSON(sKey(u), st);
        report.push({ user: u, away, due: out.length, sent });
      }
      return res.status(200).json({ at: now.toISOString(), feed: events.length, report });
    }

    if (req.query.vapid) return res.status(200).json({ key: VAPID_PUBLIC });
    return res.status(400).json({ error: "Nothing to do" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
