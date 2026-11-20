/**
 * Good Plans — /api/ingest  (daily cron; extra sources on top of the Apps Script feed)
 *
 *   cron / ?key=FLAGS_KEY              run the sources that are due (a few per run)
 *   ?key=..&source=<id>[&force=1]      run one source now
 *   ?key=..&probe=<url>                show what a page offers (JSON-LD events, size) without saving
 *   ?feed=1                            public: the merged events the app adds to its list
 *   ?key=..&status=1                   per-source stats
 *
 * Each source is read on its own cadence (daily / weekly / monthly) and skipped when the page is unchanged.
 * Events come from the page's JSON-LD when it has them, otherwise from Claude reading the page text.
 * Nothing is invented: a price or time that the page does not state stays empty.
 */
import { SOURCES as ALL } from "./_sources.js";
const SOURCES = ALL.filter((s) => !s.off);
import { getJSON, putJSON } from "./_blob.js";
import { createHash } from "node:crypto";

export const config = { maxDuration: 60 };
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const STORE = "ingest/events.json";
const DAY = 864e5;
const EVERY = { daily: 20 * 3600e3, weekly: 6 * DAY, monthly: 27 * DAY };
const MAX_PER_RUN = 4;
const BOROUGH = /manhattan|brooklyn|queens|bronx|staten island/i;
const CATS = ["Music", "Comedy", "Art & Culture", "Film", "Food & Drink", "Outdoors", "Sports", "Family", "Talk & Learn", "Nightlife", "Other"];
const iso = (d) => d.toISOString().slice(0, 10);
const clip = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchPage(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return { html: await r.text(), url: r.url || url };
  } finally { clearTimeout(t); }
}

function jsonLdEvents(html) {
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    const ty = [].concat(o["@type"] || []).join(",");
    if (/Event/.test(ty) && o.name && o.startDate) out.push(o);
    if (o["@graph"]) walk(o["@graph"]);
    if (o.itemListElement) walk(o.itemListElement);
    if (o.item) walk(o.item);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { walk(JSON.parse(m[1])); } catch { /* skip */ } }
  return out;
}

function pageText(html, base) {
  const abs = (h) => { try { return new URL(h, base).href; } catch { return ""; } };
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<a [^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => " " + t + " [" + abs(h) + "] ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
}

function fromLd(o, src, base) {
  const loc = [].concat(o.location || [])[0] || {};
  const addr = loc.address || {};
  const offer = [].concat(o.offers || [])[0] || {};
  const s = new Date(o.startDate), e = o.endDate ? new Date(o.endDate) : null;
  if (isNaN(s)) return null;
  const time = /T\d\d:\d\d/.test(o.startDate) ? s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
  const p = offer.price != null && offer.price !== "" ? Number(offer.price) : null;
  let url = o.url || offer.url || ""; try { url = new URL(url, base).href; } catch { url = ""; }
  return { title: clip(o.name, 140), start: /T/.test(o.startDate) ? iso(new Date(s.toLocaleString("en-US", { timeZone: "America/New_York" }))) : o.startDate.slice(0, 10),
    end: e ? o.endDate.slice(0, 10) : "", time, price: p === 0 ? "Free" : p != null && !isNaN(p) ? "$" + p : "", venue: clip(loc.name || "", 100),
    borough: clip(addr.addressLocality || "", 40), desc: clip(String(o.description || "").replace(/<[^>]+>/g, " "), 280), url };
}

async function readWithClaude(src, text, today) {
  const system = `You extract upcoming events from the text of a web page for a New York City events app. Answer with a JSON array only.
Each item: {"title":"","start":"YYYY-MM-DD","end":"YYYY-MM-DD" or "","time":"7:30 PM" or "","price":"Free" | "$25" | "$20–45" or "","venue":"","borough":"Manhattan|Brooklyn|Queens|Bronx|Staten Island|","cat":one of ${CATS.join(" | ")},"sub":"short subtype","desc":"one plain sentence, no hype","url":"absolute link to this event if the text shows one"}
Rules: only events the text states, dated ${today} or later (the page may list past ones: skip them). Skip member-only, private, sold-out-for-members or staff events. Never invent a date, time, price, venue or link: leave it empty when the text does not say. Price only if stated ("Free" counts). Max 60 events, soonest first. Recurring weekly programs: list each of the next 4 dates. Output [] if there are none.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: `Source: ${src.name} (${src.hint})\nToday: ${today}\nPage text:\n${text.slice(0, 26000)}` }] }) });
  const d = await r.json();
  if (!r.ok) throw new Error("claude " + r.status + " " + (d?.error?.message || ""));
  const t = (d.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b < a) throw new Error("no JSON array");
  return JSON.parse(t.slice(a, b + 1));
}

// Normalise to the app's event schema and apply the quality gate
function toEvent(src, x, today, limit) {
  const title = clip(x.title, 140), start = String(x.start || "").slice(0, 10), end = String(x.end || "").slice(0, 10);
  if (!title || !/^\d{4}-\d\d-\d\d$/.test(start)) return null;
  const last = /^\d{4}-\d\d-\d\d$/.test(end) ? end : start;
  if (last < today || start > limit) return null;
  const b = clip(x.borough, 40), venue = clip(x.venue, 100);
  const boro = (b.match(BOROUGH) || [])[0];
  if (b && !boro && !/new york|nyc|harlem|astoria|williamsburg|bushwick|dumbo|long island city|brooklyn/i.test(b)) return null; // clearly outside the city
  const hood = boro ? boro.replace(/^./, (c) => c.toUpperCase()) : "Manhattan";
  const id = src.id + "-" + createHash("sha1").update(title.toLowerCase() + "|" + start + "|" + venue.toLowerCase()).digest("hex").slice(0, 8);
  const price = clip(x.price, 40);
  const e = { id, title, E: start, time: clip(x.time, 30) || undefined, price: price || undefined, venue: venue || src.name, hood,
    cat: CATS.includes(x.cat) ? x.cat : "Other", sub: clip(x.sub, 30) || undefined, tier: 2, ticket: !!price && !/^free/i.test(price),
    src: src.name, url: /^https?:\/\//.test(x.url || "") ? x.url : undefined, desc: clip(x.desc, 280) || undefined, tags: [] };
  if (end && end !== start && /^\d{4}-\d\d-\d\d$/.test(end)) e.X = end;
  if (/^free/i.test(price)) e.tags.push("free");
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}


// NYC Parks' official 14-day feed: structured, so no Claude needed. Recreation-center class sessions are filler (tier 3)
// so they surface for people who like fitness without crowding everyone's lists; everything else is tier 2.
const BORO = { B: "Brooklyn", M: "Manhattan", Q: "Queens", X: "Bronx", R: "Staten Island" };
const t12 = (t) => String(t || "").replace(/\b(am|pm)\b/i, (m) => m.toUpperCase()).trim();
function parkEvent(src, x, today, limit) {
  const title = clip(String(x.title || "").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'"), 140), start = String(x.startdate || "").slice(0, 10);
  if (!title || !/^\d{4}-\d\d-\d\d$/.test(start) || start < today || start > limit) return null;
  const cats = String(x.categories || "").split("|").map((c) => c.trim()).filter(Boolean), has = (re) => cats.some((c) => re.test(c));
  if (/^cancel/i.test(title) || /cancelled/i.test(String(x.description || "").slice(0, 80)) || /\bcamp\b|extended day|regular day/i.test(title)) return null;
  const rec = has(/recreation center/i);
  let cat = "Other", sub = cats[0] || "Park program";
  if (has(/dance/i)) { cat = "Sports"; sub = "Dance class"; }
  else if (has(/yoga|pilates/i)) { cat = "Sports"; sub = "Yoga & Pilates"; }
  else if (has(/running|jogging/i) || /open run|\brun\b/i.test(title)) { cat = "Sports"; sub = "Running"; }
  else if (has(/fitness|exercise|sports|recreation/i)) { cat = "Sports"; sub = has(/fitness|exercise/i) ? "Fitness" : "Sports"; }
  else if (has(/kids|children|family|best for kids/i)) { cat = "Family"; sub = "Kids"; }
  else if (has(/volunteer|it's my park/i)) { cat = "Outdoors"; sub = "Volunteering"; }
  else if (has(/nature|hik|walk|tour|garden|bird|wildlife|conservation/i)) { cat = "Outdoors"; sub = has(/tour/i) ? "Walking tour" : "Nature"; }
  else if (has(/concert|music/i)) { cat = "Music"; sub = "Concert"; }
  else if (has(/movie|film/i)) { cat = "Film"; sub = "Outdoor film"; }
  else if (has(/art|craft|theater|theatre/i)) { cat = "Art & Culture"; sub = cats[0]; }
  else if (has(/history|educat|learn|talk|lecture/i)) { cat = "Talk & Learn"; sub = cats[0]; }
  const park = clip(x.parknames, 70), loc = clip(String(x.location || "").replace(/\s*\(in [^)]*\)\s*$/, ""), 70);
  const venue = loc && park && !loc.toLowerCase().includes(park.toLowerCase()) ? loc + ", " + park : (park || loc || "NYC Parks");
  const ll = String(x.coordinates || "").split(",").map((n) => parseFloat(n));
  const desc = clip(String(x.description || "").replace(/&nbsp;|<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, "").replace(/&amp;/g, "&"), 280);
  const time = x.starttime ? t12(x.starttime) + (x.endtime ? " - " + t12(x.endtime) : "") : "";
  const free = /\bfree\b/i.test(desc) ? "Free" : "";
  const id = src.id + "-" + createHash("sha1").update(String(x.guid || title + start + venue)).digest("hex").slice(0, 8);
  const e = { id, title, E: start, time: time || undefined, price: free || undefined, venue, hood: BORO[String(x.parkids || "")[0]] || "Manhattan",
    cat, sub, tier: rec && cat !== "Family" ? 3 : 2, ticket: false, src: "NYC Parks", url: /^https?:\/\//.test(x.link || "") ? String(x.link).replace(/^http:/, "https:") : undefined,
    desc: desc || undefined, tags: [].concat(free ? ["free"] : [], rec ? ["recurring"] : [], cats.slice(0, 3).map((c) => c.toLowerCase())) };
  if (ll.length === 2 && ll.every((n) => isFinite(n) && n)) e.coord = ll;
  if (x.enddate && x.enddate !== x.startdate && /^\d{4}-\d\d-\d\d$/.test(x.enddate)) e.X = x.enddate;
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

async function runSource(src, store, force) {
  const st = store.by[src.id] || (store.by[src.id] = {});
  const t0 = Date.now(), today = iso(new Date(t0 - 5 * 3600e3)), limit = iso(new Date(t0 + src.horizon * DAY));
  try {
    const { html, url } = await fetchPage(src.url);
    if (src.kind === "nycparks") {
      const hash = createHash("sha1").update(html).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = JSON.parse(html), seen = new Set();
      st.events = raw.map((x) => parkEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "feed", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    const hash = createHash("sha1").update(html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ")).digest("hex");
    if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
    let raw = jsonLdEvents(html).map((o) => fromLd(o, src, url)).filter(Boolean), how = "json-ld";
    if (raw.length < 3) { how = "claude"; raw = await readWithClaude(src, pageText(html, url), today); }
    const evs = raw.map((x) => toEvent(src, x, today, limit)).filter(Boolean);
    const seen = new Set(); st.events = evs.filter((e) => !seen.has(e.id) && seen.add(e.id));
    Object.assign(st, { at: t0, hash, ok: true, how, count: st.events.length, raw: raw.length, err: undefined, note: undefined });
  } catch (e) { Object.assign(st, { at: t0, ok: false, err: clip(e && e.message || e, 160), count: (st.events || []).length }); }
  return st;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const store = (await getJSON(STORE).catch(() => null)) || { by: {} };
  if (!store.by) store.by = {};
  if (req.query.feed) {
    res.setHeader("Cache-Control", "public, max-age=600");
    const today = iso(new Date(Date.now() - 5 * 3600e3));
    const events = Object.values(store.by).flatMap((s) => s.events || []).filter((e) => (e.X || e.E) >= today);
    return res.status(200).json({ events });
  }
  const cron = req.headers.authorization && process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
  const vercelCron = !!req.headers["x-vercel-cron"] || /vercel-cron/i.test(req.headers["user-agent"] || "");
  const manual = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  if (!cron && !vercelCron && !manual) return res.status(401).json({ error: "Unauthorized" });
  if (req.query.status) return res.status(200).json(ALL.map((s) => { const x = store.by[s.id] || {}; return { id: s.id, off: s.off, cadence: s.cadence, at: x.at ? new Date(x.at).toISOString() : null, ok: x.ok, how: x.how, count: x.count, raw: x.raw, err: x.err, note: x.note }; }));
  if (req.query.probe) {
    try {
      const { html, url } = await fetchPage(String(req.query.probe));
      if (/^\s*[\[{]/.test(html)) { try { const j = JSON.parse(html); const a = Array.isArray(j) ? j : j.events || j.items || [j]; return res.status(200).json({ url, bytes: html.length, items: a.length, sample: a.slice(0, Number(req.query.n) || 2), kinds: a.length ? Object.keys(a[0]) : [] }); } catch { /* not JSON */ } }
      const ld = jsonLdEvents(html);
      return res.status(200).json({ url, bytes: html.length, jsonLdEvents: ld.length, sample: ld.slice(0, 2).map((o) => fromLd(o, { id: "p" }, url)), text: pageText(html, url).slice(0, 600) });
    } catch (e) { return res.status(200).json({ error: String(e && e.message || e) }); }
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "ANTHROPIC_API_KEY / BLOB_READ_WRITE_TOKEN not set" });
  const one = req.query.source ? SOURCES.filter((s) => s.id === req.query.source) : null;
  const now = Date.now();
  const due = one || SOURCES.filter((s) => { const x = store.by[s.id]; return !x || !x.at || now - x.at >= EVERY[s.cadence]; })
    .sort((a, b) => ((store.by[a.id] || {}).at || 0) - ((store.by[b.id] || {}).at || 0)).slice(0, MAX_PER_RUN);
  const ran = await Promise.all(due.map(async (s) => { const x = await runSource(s, store, !!req.query.force); return { id: s.id, ok: x.ok, how: x.how, count: x.count, err: x.err, note: x.note }; }));
  SOURCES.length && Object.keys(store.by).forEach((k) => { if (!SOURCES.some((s) => s.id === k)) delete store.by[k]; });
  store.updated = new Date().toISOString();
  await putJSON(STORE, store);
  return res.status(200).json({ ran, remaining: SOURCES.filter((s) => { const x = store.by[s.id]; return !x || !x.at; }).length });
}
