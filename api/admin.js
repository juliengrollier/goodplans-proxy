/**
 * Good Plans — /api/admin  (owner-only: people, activity, flags review)
 *
 * POST { action:"isadmin", email }                  → { admin } (only used to decide whether to show the Admin card)
 * POST { action:"login", credential }               → Google ID token verified here; if its email is ADMIN_EMAIL → { token, exp }
 * GET  ?t=<token>&view=overview[&days=30]           → registered people + activity (sessions, opens, saves, hearts…)
 * GET  ?t=<token>&view=flags                        → all flags with who sent them and their status
 * GET  ?t=<token>&flag=<id>&set=approved|rejected   → review a flag
 * The token is an HMAC (key FLAGS_KEY) valid 30 days; the same routes also accept ?key=FLAGS_KEY (for scheduled tasks).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { blobApi, putJSON, getJSON } from "./_blob.js";

export const config = { maxDuration: 60 };
const CLIENT_ID = "485243730775-p30fh8ams562nt6b6tm234p3kc3plecb.apps.googleusercontent.com";
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (p) => createHmac("sha256", process.env.FLAGS_KEY || "").update(p).digest("base64url");

export function makeToken(days = 30) { const p = b64(JSON.stringify({ exp: Date.now() + days * 864e5, v: 1 })); return { token: p + "." + sign(p), exp: Date.now() + days * 864e5 }; }
export function okToken(t) {
  const [p, s] = String(t || "").split(".");
  if (!p || !s || !process.env.FLAGS_KEY) return false;
  const e = sign(p); if (e.length !== s.length || !timingSafeEqual(Buffer.from(e), Buffer.from(s))) return false;
  try { return JSON.parse(Buffer.from(p, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
const isAdminReq = (req) => (!!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY) || okToken(req.query.t || req.body?.t);

async function listAll(prefix) {
  const out = []; let cursor = "";
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ prefix, limit: "1000" }); if (cursor) q.set("cursor", cursor);
    const d = await blobApi("?" + q.toString(), { method: "GET" });
    out.push(...(d.blobs || [])); if (!d.hasMore || !d.cursor) break; cursor = d.cursor;
  }
  return out;
}
const fetchBlob = async (x) => { const r = await fetch(x.url, { headers: { authorization: "Bearer " + process.env.BLOB_READ_WRITE_TOKEN } }); return r.ok ? r.json().catch(() => null) : null; };

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Blob store not connected" });
  try {
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const admin = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      if (b.action === "isadmin") return res.status(200).json({ admin: !!admin && String(b.email || "").trim().toLowerCase() === admin });
      if (b.action === "login") {
        const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(String(b.credential || "")));
        const t = await r.json().catch(() => ({}));
        if (!r.ok || t.aud !== CLIENT_ID || String(t.email_verified) !== "true" || !admin || String(t.email || "").toLowerCase() !== admin) return res.status(403).json({ error: "Not the owner" });
        return res.status(200).json(makeToken());
      }
      return res.status(400).json({ error: "Unknown action" });
    }
    if (!isAdminReq(req)) return res.status(401).json({ error: "Unauthorized" });

    if (req.query.flag) {
      const id = String(req.query.flag).replace(/[^A-Za-z0-9_-]/g, ""), set = req.query.set;
      if (!["approved", "rejected"].includes(set)) return res.status(400).json({ error: "set=approved|rejected" });
      const f = await getJSON("flags/" + id + ".json");
      if (!f) return res.status(404).json({ error: "No such flag" });
      f.status = set; f.reviewedAt = new Date().toISOString();
      await putJSON("flags/" + id + ".json", f);
      return res.status(200).json({ ok: true, id, status: set });
    }
    if (req.query.view === "flags") {
      const files = (await listAll("flags/")).sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
      const flags = (await Promise.all(files.map(fetchBlob))).filter(Boolean).map((f) => ({ id: f.id, at: f.at, note: f.note, screen: f.screen, target: f.target, user: f.user || "", name: f.name || "", owner: !!f.owner, status: f.status || "approved", title: f.ev?.title || "" }));
      return res.status(200).json({ flags });
    }
    // overview: registered people + activity
    const days = Math.min(90, Number(req.query.days) || 30), now = Date.now();
    const since = new Date(now - days * 864e5).toISOString().slice(0, 10);
    const [userFiles, tFiles] = await Promise.all([listAll("users/"), listAll("telemetry/")]);
    const reg = (await Promise.all(userFiles.map(fetchBlob))).filter(Boolean);
    const blobs = tFiles.filter((x) => x.pathname.slice(10, 20) >= since).slice(-600);
    const evs = (await Promise.all(blobs.map(fetchBlob))).filter(Boolean).flatMap((f) => (f.items || []).map((i) => ({ ...i, user: f.user || "p" + f.device })));
    const by = {};
    for (const e of evs) {
      const u = by[e.user] || (by[e.user] = { user: e.user, imp: 0, open: 0, save: 0, up: 0, down: 0, share: 0, link: 0, days: new Set(), last: 0 });
      if (["imp", "open", "save", "up", "down", "share", "link"].includes(e.k)) u[e.k]++;
      u.days.add(new Date(e.t).toISOString().slice(0, 10)); if (e.t > u.last) u.last = e.t;
    }
    const regBy = Object.fromEntries(reg.map((r) => [r.user, r]));
    const ids = [...new Set([...Object.keys(by), ...Object.keys(regBy)])];
    const people = ids.map((id) => {
      const a = by[id] || { imp: 0, open: 0, save: 0, up: 0, down: 0, share: 0, link: 0, days: new Set(), last: 0 }, r = regBy[id] || {};
      const ss = (r.sessions || []).filter((s) => s.e >= now - days * 864e5), dur = ss.map((s) => Math.max(0, s.e - s.s));
      return { user: id, signedIn: id.startsWith("g"), name: r.name || "", email: r.email || "", firstSeen: r.first || null, lastSeen: Math.max(r.last || 0, a.last) || null,
        sessions: ss.length, avgSessionSec: dur.length ? Math.round(dur.reduce((x, y) => x + y, 0) / dur.length / 1000) : null, totalSec: Math.round(dur.reduce((x, y) => x + y, 0) / 1000),
        activeDays: a.days.size, shown: a.imp, opened: a.open, saved: a.save, hearted: a.up, dismissed: a.down, shared: a.share, linkClicks: a.link, devices: (r.devices || []).length, app: r.ver || "" };
    }).sort((x, y) => (y.lastSeen || 0) - (x.lastSeen || 0));
    const day = (n) => now - n * 864e5;
    return res.status(200).json({ days, registered: people.filter((p) => p.signedIn).length, anonymous: people.filter((p) => !p.signedIn).length,
      active7: people.filter((p) => (p.lastSeen || 0) > day(7)).length, active1: people.filter((p) => (p.lastSeen || 0) > day(1)).length, people });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
