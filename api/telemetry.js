/**
 * Good Plans — /api/telemetry  (ranking measurement; private Blob store)
 *
 * POST { device, items: [{ t, k, id, cat, act, rk, c: {ex,le,si,mo,ra,qu,fr}, s, p }] }   from the app
 *   k: imp (card seen 1 s) · fy (For you pick, p = position) · shuffle · open · save · link · share · dwell · bounce · up · down
 * GET  ?weights=<user>            → that person's tuned score weights ({} until tuned), read by the app
 * GET  ?key=FLAGS_KEY&setw=<user>&w={"aff":60,…} → store tuned weights for one person
 * GET  ?key=FLAGS_KEY[&days=14][&user=<user>]  → summary per person (or one person):
 *   counts, For you hit rate by position (acted on within 24 h), open rate by screen and by score decile,
 *   and for each score part: average when opened vs ignored, plus weights fitted by logistic regression.
 */
import { blobApi, putJSON, getJSON } from "./_blob.js";

const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const POS = new Set(["open", "save", "link", "share", "dwell", "up", "directions", "went"]);
const PARTS = ["ex", "le", "si", "mo", "ra", "qu", "fr"];
export const config = { maxDuration: 60 };

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function listAll(prefix) {
  const out = []; let cursor = "";
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ prefix, limit: "1000" }); if (cursor) q.set("cursor", cursor);
    const d = await blobApi("?" + q.toString(), { method: "GET" });
    out.push(...(d.blobs || [])); if (!d.hasMore || !d.cursor) break; cursor = d.cursor;
  }
  return out;
}

function fitLogistic(rows) {
  // rows: [x[], y]; plain gradient descent with L2, features roughly 0..1
  const k = rows[0]?.[0].length || 0, w = new Array(k + 1).fill(0);
  if (!rows.length) return w;
  for (let it = 0; it < 400; it++) {
    const g = new Array(k + 1).fill(0);
    for (const [x, y] of rows) { let z = w[k]; for (let j = 0; j < k; j++) z += w[j] * x[j]; const p = 1 / (1 + Math.exp(-z)); const e = p - y; for (let j = 0; j < k; j++) g[j] += e * x[j]; g[k] += e; }
    for (let j = 0; j <= k; j++) w[j] -= 0.5 * (g[j] / rows.length + (j < k ? 0.01 * w[j] : 0));
  }
  return w.map((x) => Math.round(x * 100) / 100);
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Blob store not connected" });
  try {
    if (req.method === "GET" && req.query.weights) {
      const u = String(req.query.weights).replace(/[^a-z0-9]/gi, "").slice(0, 17);
      res.setHeader("Cache-Control", "public, max-age=600");
      return res.status(200).json((await getJSON(`weights/${u}.json`).catch(() => null)) || {});
    }
    if (req.method === "POST") {
      if (!ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const items = (b.items || []).slice(0, 400).filter((x) => x && x.k && x.id);
      if (!items.length) return res.status(200).json({ ok: true, n: 0 });
      const day = new Date().toISOString().slice(0, 10);
      const dev = String(b.device || "anon").replace(/[^a-z0-9]/gi, "").slice(0, 12);
      const user = String(b.user || "p" + dev).replace(/[^a-z0-9]/gi, "").slice(0, 17);
      await putJSON(`telemetry/${day}/${user}-${dev}-${Date.now()}.json`, { device: dev, user, items });
      return res.status(200).json({ ok: true, n: items.length });
    }
    if (!process.env.FLAGS_KEY || req.query.key !== process.env.FLAGS_KEY) return res.status(401).json({ error: "Unauthorized" });
    if (req.query.setw) {
      const u = String(req.query.setw).replace(/[^a-z0-9]/gi, "").slice(0, 17);
      const w = JSON.parse(req.query.w || "{}");
      await putJSON(`weights/${u}.json`, { ...w, at: new Date().toISOString() });
      return res.status(200).json({ ok: true, user: u, w });
    }
    if (req.query.test) { await putJSON(`telemetry/${new Date().toISOString().slice(0, 10)}/test-${Date.now()}.json`, { device: "test", items: [{ t: Date.now(), k: "fy", id: "test", p: 0, rk: 50, c: { ex: 1, le: 0.5, si: 0.5, mo: 1, ra: 1, qu: 0.5, fr: 0 }, s: "foryou" }] }); }
    const days = Math.min(60, Number(req.query.days) || 14);
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const blobs = (await listAll("telemetry/")).filter((x) => x.pathname.slice(10, 20) >= since);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const files = await Promise.all(blobs.map(async (x) => { const r = await fetch(x.url, { headers: { authorization: "Bearer " + token } }); return r.ok ? r.json() : null; }));
    const all = files.filter(Boolean).flatMap((f) => f.items.map((i) => ({ ...i, dev: f.device, user: f.user || "p" + f.device }))).sort((a, b) => a.t - b.t);
    const users = [...new Set(all.map((e) => e.user))].filter((u) => !req.query.user || u === req.query.user);
    const summarize = (ev) => {

    const counts = {}; ev.forEach((e) => { counts[e.k] = (counts[e.k] || 0) + 1; });
    // acted on: a positive action on the same event by the same phone within 24 h after being shown
    const acts = {}; ev.filter((e) => POS.has(e.k)).forEach((e) => { (acts[e.dev + "|" + e.id] = acts[e.dev + "|" + e.id] || []).push(e.t); });
    const hit = (e) => (acts[e.dev + "|" + e.id] || []).some((t) => t >= e.t - 5000 && t <= e.t + 864e5);

    const fy = ev.filter((e) => e.k === "fy");
    const byPos = [0, 1, 2, 3].map((p) => { const l = fy.filter((e) => e.p === p); return { pos: p + 1, shown: l.length, actedOn: l.filter(hit).length }; });
    const shuffles = counts.shuffle || 0;

    const imps = ev.filter((e) => e.k === "imp");
    const byScreen = {}; imps.forEach((e) => { const s = byScreen[e.s || "?"] = byScreen[e.s || "?"] || { shown: 0, opened: 0 }; s.shown++; if (hit(e)) s.opened++; });
    const dec = Array.from({ length: 10 }, (_, i) => ({ score: i * 10 + "–" + (i * 10 + 9), shown: 0, opened: 0 }));
    imps.forEach((e) => { const d = dec[Math.max(0, Math.min(9, Math.floor((e.rk || 0) / 10)))]; d.shown++; if (hit(e)) d.opened++; });

    const rows = imps.filter((e) => e.c && PARTS.every((p) => e.c[p] != null)).map((e) => [PARTS.map((p) => (p === "fr" ? e.c[p] / 10 : e.c[p])), hit(e) ? 1 : 0]);
    const avg = (l, j) => (l.length ? Math.round((l.reduce((a, r) => a + r[0][j], 0) / l.length) * 100) / 100 : null);
    const yes = rows.filter((r) => r[1]), no = rows.filter((r) => !r[1]);
    const parts = PARTS.map((p, j) => ({ part: { ex: "your moods & favourites", le: "learned taste", si: "similar to what you like", mo: "moment", ra: "rarity", qu: "quality", fr: "friction" }[p], openedAvg: avg(yes, j), ignoredAvg: avg(no, j) }));
    const enough = yes.length >= 25 && no.length >= 100;
    const w = enough ? fitLogistic(rows) : null;
    if (w) parts.forEach((x, j) => { x.fittedWeight = w[j]; });

    // Event-page chains: opens by block (make a night of it, next dates, more like this, venue, up next, trail) and trail lengths
    const rails = {}; ev.filter((e) => e.k === "open" && e.r).forEach((e) => { rails[e.r] = (rails[e.r] || 0) + 1; });
    const tl = ev.filter((e) => e.k === "trail").map((e) => e.n || 0);
    const trails = { chains: tl.length, avgLength: tl.length ? Math.round((tl.reduce((a, b) => a + b, 0) / tl.length) * 10) / 10 : null, longest: tl.length ? Math.max(...tl) : null };
    return { events: ev.length, phones: [...new Set(ev.map((e) => e.dev))].length, counts, forYou: { byPos, shuffles }, openRateByScreen: byScreen, openRateByScore: dec.filter((d) => d.shown), eventPage: { opensByBlock: rails, trails }, parts, note: enough ? "Fitted weights: how much each part predicts an open (bigger = stronger)." : `Need more data to fit weights (have ${yes.length} opened / ${no.length} ignored impressions; want 25 / 100).` };
    };
    const out = {};
    for (const u of users) { out[u] = summarize(all.filter((e) => e.user === u)); out[u].weights = (await getJSON(`weights/${u}.json`).catch(() => null)) || "default"; }
    return res.status(200).json({ days, users: out });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
