// Ranking measurement: what was shown (and where), what you did with it, and the score parts at that moment.
// Batched on the phone, sent to /api/telemetry (private store), summarised there to tune the ranking on evidence.
import { API_BASE } from "./images.js";

const BUF = "gp_tlm_buf_v1", DEV = "gp_device_v1";
const device = (() => { try { let d = localStorage.getItem(DEV); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem(DEV, d); } return d; } catch { return "anon"; } })();
// Who this is: the Google account (a short hash, never the email), else the "This phone is" name, else the phone
let user = "";
export function setUser(u) { user = String(u || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16); }
export const userId = () => user || "p" + device;
let buf = (() => { try { return JSON.parse(localStorage.getItem(BUF) || "[]"); } catch { return []; } })();
const save = () => { try { localStorage.setItem(BUF, JSON.stringify(buf.slice(-800))); } catch { /* full */ } };

const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
export function track(kind, ev, extra = {}) {
  if (!ev?.id) return;
  const c = ev.comp || {};
  buf.push({ t: Date.now(), k: kind, id: String(ev.id).slice(0, 80), cat: ev.ncat || ev.cat || "", act: ev.act || "", rk: r2(ev.rk), c: { ex: r2(c.ex), le: r2(c.learned), si: r2(c.sim), mo: r2(c.moment), ra: r2(c.rarity), qu: r2(c.quality), fr: r2(c.friction) }, ...extra });
  save();
  if (buf.length >= 60) flush();
}
export async function flush(keepalive = false) {
  if (!buf.length) return;
  const items = buf.slice(0, 400);
  try {
    const r = await fetch(API_BASE + "/api/telemetry", { method: "POST", keepalive, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device, user: userId(), items }) });
    if (r.ok) { buf = buf.slice(items.length); save(); }
  } catch { /* offline: keep for later */ }
}
if (typeof window !== "undefined") {
  setInterval(() => flush(), 90000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
}

// Score weights tuned for this person (set after reviewing their data); empty until then
export async function loadWeights() {
  try { const r = await fetch(API_BASE + "/api/telemetry?weights=" + encodeURIComponent(userId())); return r.ok ? await r.json() : {}; } catch { return {}; }
}
