/**
 * Good Plans — /api/flags  (dev-mode feedback; Vercel Blob store "goodplans-dev-flags", private)
 *
 * POST { note, target, ev, screen, ... }      from the app (dev mode) → { ok, id }
 * GET  ?key=FLAGS_KEY                          → { flags: [...] }  (oldest first)
 * GET  ?key=FLAGS_KEY&done=id1,id2 | done=all  → deletes them once handled → { deleted }
 * GET  ?key=FLAGS_KEY&test=1                    → writes a test flag (checks the store end to end)
 *
 * Talks to the Blob REST API directly (no npm dependencies in this folder).
 */
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const API = "https://vercel.com/api/blob";
const PREFIX = "flags/";

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function blobHeaders(extra = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  return { authorization: "Bearer " + token, "x-api-version": "13", "x-vercel-blob-store-id": token.split("_")[3] || "", ...extra };
}

async function blobApi(path, init) {
  const r = await fetch(API + path, { ...init, headers: blobHeaders(init.headers) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("blob " + r.status + " " + (d.error?.message || ""));
  return d;
}

async function listAll() {
  const out = [];
  let cursor = "";
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ prefix: PREFIX, limit: "1000" });
    if (cursor) q.set("cursor", cursor);
    const d = await blobApi("?" + q.toString(), { method: "GET" });
    out.push(...(d.blobs || []));
    if (!d.hasMore || !d.cursor) break;
    cursor = d.cursor;
  }
  return out;
}

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : v);

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Blob store not connected" });
  try {
    const authed = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
    if (req.method === "POST" || (authed && req.query.test)) {
      if (req.method === "POST" && !ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
      const b = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}) : { note: "Test flag (setup check)", target: "test", screen: "setup" };
      const id = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
      const flag = { id, at: new Date().toISOString(), note: clip(b.note || "", 2000), target: clip(b.target || "", 600), screen: clip(b.screen || "", 200), section: clip(b.section || "", 200), ev: b.ev || null, ctx: b.ctx || null, ver: clip(b.ver || "", 40) };
      const body = JSON.stringify(flag);
      if (body.length > 20000) return res.status(413).json({ error: "Too big" });
      await blobApi("/?" + new URLSearchParams({ pathname: PREFIX + id + ".json" }).toString(), {
        method: "PUT", body,
        headers: { "x-vercel-blob-access": "private", "x-add-random-suffix": "0", "x-content-type": "application/json" },
      });
      return res.status(200).json({ ok: true, id });
    }
    if (req.method !== "GET") return res.status(405).json({ error: "GET or POST" });
    if (!process.env.FLAGS_KEY || req.query.key !== process.env.FLAGS_KEY) return res.status(401).json({ error: "Unauthorized" });
    const blobs = await listAll();
    if (req.query.done) {
      const ids = String(req.query.done).split(",");
      const urls = blobs.filter((x) => ids.includes("all") || ids.some((id) => x.pathname === PREFIX + id + ".json")).map((x) => x.url);
      if (urls.length) await blobApi("/delete", { method: "POST", body: JSON.stringify({ urls }), headers: { "content-type": "application/json" } });
      return res.status(200).json({ deleted: urls.length });
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const flags = await Promise.all(blobs.sort((a, b) => (a.pathname < b.pathname ? -1 : 1)).map(async (x) => {
      const r = await fetch(x.url, { headers: { authorization: "Bearer " + token } });
      return r.ok ? r.json().catch(() => ({ id: x.pathname, error: "unreadable" })) : { id: x.pathname, error: "HTTP " + r.status };
    }));
    return res.status(200).json({ count: flags.length, flags });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
