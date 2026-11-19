// Notifications on this phone: permission, the push subscription, and what the server needs to know
// (saved plans, bells, settings). The server decides when to send (api/notify.js).
import { API_BASE } from "./images.js";
import { userId } from "./telemetry.js";

export const VAPID_PUBLIC = "BCK6TT-wrC6Gc40EcM_ZNjAO-QP6aABoJ3GgVqD0rAgCNO2MDyrC7Sthty1gwd3DoVLZb5KQVj34w_oJFVynYHg";
export const NOTIF_KEY = "gp_notify_v2";
const DEV = "gp_device_v1";
const dev = () => { try { return localStorage.getItem(DEV) || "anon"; } catch { return "anon"; } };

export const defaultNotif = () => ({ on: false, asked: false, reminders: true, digest: true, digestAt: 12, bells: {} });
export function loadNotif() { try { return { ...defaultNotif(), ...JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}") }; } catch { return defaultNotif(); } }
export function saveNotif(n) { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(n)); } catch { /* full */ } }

export const supported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
export const permission = () => (supported() ? Notification.permission : "unsupported");

const toBytes = (s) => { const b = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...b].map((c) => c.charCodeAt(0))); };
const sameKey = (a, b) => { if (!a) return false; const x = new Uint8Array(a); return x.length === b.length && x.every((v, i) => v === b[i]); };

// The subscription for our current key (an old one made with the previous key is replaced)
export async function subscription(create) {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const key = toBytes(VAPID_PUBLIC);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) { await sub.unsubscribe().catch(() => {}); sub = null; }
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  return sub ? sub.toJSON() : null;
}

// Ask for permission (only from a tap) and subscribe. Returns "on", "denied" or "unsupported".
export async function enable() {
  if (!supported()) return "unsupported";
  const p = await Notification.requestPermission();
  if (p !== "granted") return "denied";
  const sub = await subscription(true);
  return sub ? "on" : "denied";
}

// What a bell on an interest tile listens for, in terms the server can match on new events
export function bellOf(t) {
  const list = t.list || [];
  const acts = [...new Set(list.map((e) => e.act).filter(Boolean))].slice(0, 20);
  const m = /^gen-(\w+)-(.+)$/.exec(t.key || "") || [];
  const kind = m[1], id = m[2] || "";
  const cats = kind === "cat" ? [id] : kind === "sub" ? [id.split("|")[0]] : kind === "fam" || kind === "lens" ? [...new Set(list.map((e) => e.ncat).filter(Boolean))].slice(0, 8) : t.cats || [];
  const words = kind === "term" ? [id] : [];
  return { key: t.key, label: String(t.short || t.title || t.label || "").replace(/\s+/g, " ").slice(0, 40), acts: kind === "act" ? [id] : [...new Set([...acts, ...(t.acts || [])])], cats: kind === "act" ? [] : cats, words };
}
export const venueBell = (ev, label) => ({ key: "venue:" + label.toLowerCase(), label, venue: label.toLowerCase() });
export const seriesBell = (key, label) => ({ key: "series:" + key, label: label.slice(0, 40), series: key });

let timer = null, last = "";
// Tell the server (debounced; skipped when nothing changed). action "test" sends a test notification to this phone.
export function sync(n, saved, action) {
  if (!n.on && action !== "off") return Promise.resolve(null);
  clearTimeout(timer);
  let retried = false;
  const go = async () => {
    // Make sure this phone has a live subscription whenever notifications are allowed (it can vanish after a reinstall)
    const sub = action === "off" ? null : await subscription(permission() === "granted").catch(() => null);
    const body = { user: userId(), dev: dev(), sub, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, saved, bells: Object.values(n.bells || {}), prefs: { reminders: n.reminders, digest: n.digest, digestAt: n.digestAt }, action };
    const sig = JSON.stringify(body);
    if (!action && sig === last) return null;
    last = sig;
    const r = await fetch(API_BASE + "/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: sig });
    const d = r.ok ? await r.json() : null;
    // The push service says this subscription is dead: make a fresh one and try once more
    if (action === "test" && d?.test?.gone && !retried) {
      retried = true;
      try { const reg = await navigator.serviceWorker.ready; const old = await reg.pushManager.getSubscription(); if (old) await old.unsubscribe(); } catch { /* ignore */ }
      return go();
    }
    return d;
  };
  if (action) return go().catch(() => null);
  return new Promise((ok) => { timer = setTimeout(() => go().then(ok, () => ok(null)), 1500); });
}
