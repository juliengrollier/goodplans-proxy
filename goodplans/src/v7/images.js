// Event images: feed image → event page poster (og:image) → venue photo (Google Places / Wikipedia).
// Results are cached on the device; a picture shared by 3+ events at different venues is treated as a
// generic site image (e.g. a newsletter banner) and replaced by the venue photo.
import { useEffect, useState } from "react";

export const API_BASE = (import.meta.env.VITE_API_BASE || "https://goodplans-proxy.vercel.app").replace(/\/$/, "");
const KEY = "gp_img_v8";
const DAY = 86400000;
const TTL = { event: 14 * DAY, venue: 2 * DAY, none: 1 * DAY };

let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { store = {}; }
const listeners = new Map(); // id -> Set(fn)
const queue = [];
const queued = new Set();
let active = 0;
let saveT = null;

const venueOf = (ev) => (ev.venue || "").split(",")[0].trim();
const fresh = (r) => r && Date.now() - r.at < (TTL[r.kind] || DAY);
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* full: ignore */ } }, 800); };
const emit = (id) => (listeners.get(id) || []).forEach((fn) => fn(store[id]));

function genericCheck(src) {
  const ids = Object.keys(store).filter((k) => !k.startsWith("v:") && store[k]?.kind === "event" && store[k].src === src);
  const venues = new Set(ids.map((k) => store[k].venue));
  if (ids.length >= 3 && venues.size >= 2) {
    ids.forEach((k) => { store[k] = { ...store[k], generic: true, kind: "pending" }; });
    return ids;
  }
  return [];
}

async function run(job) {
  active++;
  const { ev, venueOnly } = job;
  const v = venueOf(ev);
  try {
    // Reuse a venue photo already found for another event at the same venue
    if (venueOnly && v && fresh(store["v:" + v])) {
      store[ev.id] = { ...store["v:" + v], venue: v, at: Date.now() };
    } else {
      const c = ev.coord || [];
      const qs = new URLSearchParams({ u: venueOnly ? "" : ev.url || "", v, lat: c[0] ?? "", lon: c[1] ?? "" });
      const r = await fetch(`${API_BASE}/api/image?${qs}`);
      const d = r.ok ? await r.json() : { src: null, kind: "none" };
      store[ev.id] = { src: d.src || null, kind: d.kind || "none", credit: d.credit || "", venue: v, at: Date.now() };
      if (d.kind === "venue" && v) store["v:" + v] = { src: d.src, kind: "venue", credit: d.credit || "", at: Date.now() };
      if (d.kind === "event") {
        const reset = genericCheck(d.src);
        reset.forEach((id) => { const j = job.lookup?.(id); if (j) enqueue(j, true); });
        if (reset.includes(ev.id)) enqueue(ev, true, job.lookup);
      }
    }
    save();
    emit(ev.id);
  } catch {
    store[ev.id] = { src: null, kind: "none", venue: v, at: Date.now() };
  } finally {
    active--;
    pump();
  }
}

function pump() {
  while (active < 4 && queue.length) {
    const job = queue.shift();
    queued.delete(job.ev.id);
    run(job);
  }
}

const known = new Map(); // id -> ev, so generic resets can re-queue events
function enqueue(ev, venueOnly = false) {
  if (queued.has(ev.id)) return;
  queued.add(ev.id);
  queue.push({ ev, venueOnly, lookup: (id) => known.get(id) });
  pump();
}

export function requestImage(ev) {
  if (!ev || ev.image) return;
  known.set(ev.id, ev);
  const r = store[ev.id];
  if (fresh(r) && r.kind !== "pending") return;
  enqueue(ev, !!r?.generic);
}

export function imageFor(ev) {
  if (ev.image) return { src: ev.image, kind: "event", credit: "" };
  const r = store[ev.id];
  return r && r.kind !== "pending" ? r : null;
}

export function useEventImage(ev) {
  const [img, setImg] = useState(() => imageFor(ev));
  useEffect(() => {
    if (!ev) return;
    setImg(imageFor(ev));
    if (ev.image) return;
    const set = listeners.get(ev.id) || new Set();
    const fn = () => setImg(imageFor(ev));
    set.add(fn); listeners.set(ev.id, set);
    requestImage(ev);
    return () => set.delete(fn);
  }, [ev?.id, ev?.image]);
  return img;
}

// A broken image link (expired photo URL, removed poster): forget it so the next view tries again
export function dropImage(id) {
  if (store[id]) { store[id] = { ...store[id], at: 0 }; save(); }
}
