/**
 * Good Plans — /api/flags  (dev-mode feedback; stored via api/_blob.js: Upstash Redis, or the legacy Blob store)
 *
 * POST { note, target, ev, screen, ... }      from the app (dev mode) → { ok, id }
 * GET  ?key=FLAGS_KEY                          → { flags: [...] }  (oldest first)
 * GET  ?key=FLAGS_KEY&done=id1,id2 | done=all  → deletes them once handled → { deleted }
 * GET  ?key=FLAGS_KEY&test=1                    → writes a test flag (checks the store end to end)
 * GET  ?key=FLAGS_KEY&health=1                  → which store is in use and whether it answers
 */
import { okToken } from "./_admin.js";
import { putJSON, listAll, getMany, delMany, hasStore, useRedis } from "./_blob.js";
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const PREFIX = "flags/";

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : v);

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!hasStore()) return res.status(503).json({ error: "Store not connected" });
  try {
    const authed = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
    if (authed && req.query.health) {
      try { await listAll("flags/"); return res.status(200).json({ store: useRedis ? "redis" : "blob", ok: true }); }
      catch (e) { return res.status(200).json({ store: useRedis ? "redis" : "blob", ok: false, error: String(e.message || e) }); }
    }
    if (req.method === "POST" || (authed && req.query.test)) {
      if (req.method === "POST" && !ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
      const b = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}) : { note: "Test flag (setup check)", target: "test", screen: "setup" };
      const id = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
      const flag = { id, at: new Date().toISOString(), note: clip(b.note || "", 2000), target: clip(b.target || "", 600), screen: clip(b.screen || "", 200), section: clip(b.section || "", 200), ev: b.ev || null, ctx: b.ctx || null, ver: clip(b.ver || "", 40), user: clip(b.user || "", 24), name: clip(b.name || "", 60), owner: okToken(b.t), status: okToken(b.t) ? "approved" : "pending" };
      if (JSON.stringify(flag).length > 20000) return res.status(413).json({ error: "Too big" });
      await putJSON(PREFIX + id + ".json", flag);
      return res.status(200).json({ ok: true, id });
    }
    if (req.method !== "GET") return res.status(405).json({ error: "GET or POST" });
    if (!authed) return res.status(401).json({ error: "Unauthorized" });
    const items = await listAll(PREFIX);
    if (req.query.done) {
      const ids = String(req.query.done).split(",");
      const deleted = await delMany(items.filter((x) => ids.includes("all") || ids.some((id) => x.pathname === PREFIX + id + ".json")));
      return res.status(200).json({ deleted });
    }
    const flags = (await getMany(items)).map((f, i) => f || { id: items[i].pathname, error: "unreadable" });
    // Flags from other people wait for the owner's approval; only approved (or the owner's own, or older unlabelled) ones are returned here
    const shown = req.query.all ? flags : flags.filter((f) => !f.status || f.status === "approved");
    return res.status(200).json({ count: shown.length, pending: flags.filter((f) => f.status === "pending").length, flags: shown });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
