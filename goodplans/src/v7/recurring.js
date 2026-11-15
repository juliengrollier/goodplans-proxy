// Recurring events ("weekly regulars"): detected from each feed and kept on the device across refreshes,
// so a weekly night stays in the app even when a refresh misses it.
import { seriesKey, venueKey, isoDay } from "./engine.js";

export const REC_KEY = "gp_recur_v1";
const EXPIRE_DAYS = 90; // forget a regular not seen in any feed for this long
const DOWS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW_RE = new RegExp(`\\b(?:every|each)\\s+(${DOWS.join("|")})\\b|\\b(${DOWS.join("|")})s\\b`, "i");

const recKey = (ev) => seriesKey(ev) + "@" + venueKey(ev);
const dowOf = (iso) => new Date(iso + "T12:00:00").getDay();

function textDow(ev) {
  const m = ((ev.title || "") + " " + (ev.desc || "")).match(DOW_RE);
  if (!m) return null;
  return DOWS.indexOf((m[1] || m[2]).toLowerCase());
}

// Merge what the current feed shows into the stored list. Returns a new store.
export function updateRecurring(events, store, today) {
  const out = { ...(store || {}) };
  const groups = {};
  events.forEach((e) => {
    if (!e.E || e.recurring === "synthetic") return;
    if (!seriesKey(e) || !venueKey(e)) return;
    (groups[recKey(e)] = groups[recKey(e)] || []).push(e);
  });
  const day = isoDay(today);
  Object.entries(groups).forEach(([k, list]) => {
    const single = list.filter((e) => !e.X || e.X === e.E);
    const dates = [...new Set(single.map((e) => e.E))];
    const dows = [...new Set(dates.map(dowOf))];
    let dow = null;
    if (dates.length >= 2 && dows.length === 1) dow = dows[0];
    else { const t = textDow(list[0]); if (t != null && (!dates.length || dates.every((d) => dowOf(d) === t))) dow = t; }
    if (dow == null) return;
    const s = list[0];
    out[k] = {
      key: k, dow, title: s.title, venue: s.venue, time: s.time, cat: s.cat, sub: s.sub, price: s.price, coord: s.coord,
      url: s.url, src: s.src, desc: s.desc, hood: s.hood, tier: s.tier, ticket: s.ticket, tags: s.tags || [],
      firstSeen: out[k]?.firstSeen || day, lastSeen: day,
    };
  });
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - EXPIRE_DAYS);
  Object.keys(out).forEach((k) => { if (out[k].lastSeen < isoDay(cutoff)) delete out[k]; });
  return out;
}

// Next date (today included) for a weekday
export function nextDate(dow, today) {
  const d = new Date(today);
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  return isoDay(d);
}

// The feed plus the next occurrence of each remembered regular that the feed is missing (within 7 days).
// Real events from a regular series are flagged recurring:true.
export function withRegulars(events, store, today) {
  const keys = new Set(Object.keys(store || {}));
  const have = new Set(events.map((e) => recKey(e) + "#" + e.E));
  const flagged = events.map((e) => (keys.has(recKey(e)) ? { ...e, recurring: true, recDow: store[recKey(e)].dow } : e));
  const extra = Object.values(store || {}).map((r) => {
    const E = nextDate(r.dow, today);
    if (have.has(r.key + "#" + E)) return null;
    return { ...r, id: "rec-" + r.key.replace(/[^a-z0-9]+/gi, "-") + "-" + E, E, X: undefined, recurring: "synthetic", recDow: r.dow };
  }).filter(Boolean);
  return [...flagged, ...extra];
}

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOW_LONG = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
