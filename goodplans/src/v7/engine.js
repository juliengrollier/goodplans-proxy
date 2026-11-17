// v7 engine: taste learning, scoring wrapper, time helpers, weather, Today sections.
import {
  calcBd, safeCoord, kmdist, transitTime, evCovers, evActive, evStart, evEnd, runLen, daysUntil,
  hasKnownTime, eHour, isImprecise, nextOn, isEventBusy, bookSoon, floorDay, mkDate, DAYS, MONTHS, DEFAULT_SUBS, matchV,
} from "../lib/core.js";

export const LES = [40.7186, -73.9865];

// ── Temperature display. Data stays in °F internally; shown in the user's unit (Celsius by default).
export const UNIT_KEY = "gp_unit";
export const getUnit = () => { try { return localStorage.getItem(UNIT_KEY) || "C"; } catch { return "C"; } };
export const fmtT = (f) => (f == null ? "" : getUnit() === "C" ? Math.round(((f - 32) * 5) / 9) + "°C" : Math.round(f) + "°F");
export const fmtDT = (df) => (getUnit() === "C" ? Math.round((df * 5) / 9) + "°C" : Math.round(df) + "°F");

// ── Keys (normalised strings used for follows and "seen it")
export const venueKey = (ev) => (ev.venue || "").split(",")[0].trim().toLowerCase();
export const venueLabel = (ev) => (ev.venue || "").split(",")[0].trim();
export const seriesKey = (ev) =>
  (ev.title || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 5).join(" ");

// ── Taste model (device-local until accounts land)
export const TASTE_KEY = "gp_taste_v7";
export const emptyTaste = () => ({ thumbs: {}, notForMe: {}, follows: {}, hiddenSeries: {}, catAdj: {}, subAdj: {}, kwAdj: {}, dowAdj: {}, todAdj: {}, priceSens: 0, farSens: 0, log: [] });
export const todOf = (ev) => { const sm = startMinutes(ev); return sm == null ? null : sm < 12 * 60 ? "morning" : sm < 17 * 60 ? "afternoon" : sm < 21 * 60 ? "evening" : "late"; };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function applyReactionRaw(taste, prof, ev, kind, reason) {
  const t = { ...taste, thumbs: { ...taste.thumbs }, notForMe: { ...taste.notForMe }, hiddenSeries: { ...taste.hiddenSeries }, catAdj: { ...taste.catAdj }, subAdj: { ...taste.subAdj } };
  const cat = ev.cat || "Other", sk = cat + "::" + (ev.sub || "");
  const bump = (d, ds) => {
    t.catAdj[cat] = clamp((t.catAdj[cat] || 0) + d, -40, 30);
    if (ev.sub) t.subAdj[sk] = clamp((t.subAdj[sk] || 0) + ds, -50, 40);
  };
  if (kind === "up") { t.thumbs[ev.id] = 1; bump(5, 8); }
  if (kind === "down") { t.thumbs[ev.id] = -1; bump(-5, -8); }
  if (kind === "undo") { delete t.thumbs[ev.id]; delete t.notForMe[ev.id]; delete t.hiddenSeries[seriesKey(ev)]; }
  // Reason picked after a thumb on a card
  if (kind === "why") {
    const [dir, r, ...rest] = String(reason || "").split(":");
    const arg = rest.join(":"), sgn = dir === "up" ? 1 : -1;
    if (r === "kw" && arg) t.kwAdj = { ...(t.kwAdj || {}), [arg]: clamp(((t.kwAdj || {})[arg] || 0) + 6 * sgn, -24, 18) };
    if (r === "dow" && arg !== "") t.dowAdj = { ...(t.dowAdj || {}), [arg]: clamp(((t.dowAdj || {})[arg] || 0) + 4 * sgn, -16, 10) };
    if (r === "tod" && arg) t.todAdj = { ...(t.todAdj || {}), [arg]: clamp(((t.todAdj || {})[arg] || 0) + 4 * sgn, -16, 10) };
    if (r === "outdoor") t.todAdj = { ...(t.todAdj || {}), outdoor: clamp(((t.todAdj || {}).outdoor || 0) + 4 * sgn, -16, 10) };
    // Reasons from the questionnaire (Nov 2026): what actually drives a thumb
    const adj = (key, k, d, lo, hi) => { t[key] = { ...(t[key] || {}) }; t[key][k] = clamp((t[key][k] || 0) + d, lo, hi); };
    const kws = (ev.kw || []).slice(0, 3).map((k) => k.toLowerCase());
    if (r === "act") { adj("seriesAdj", seriesKey(ev), 12, -20, 20); }
    if (r === "genre") { if (ev.ncat) adj("ncatAdj", ev.ncat, 5, -24, 12); if (ev.nsub) adj("nsubAdj", ev.nsub, 6, -24, 12); if (kws[0]) adj("kwAdj", kws[0], 3, -24, 18); }
    if (r === "unique") { t.uniqueAdj = clamp((t.uniqueAdj || 0) + 3, 0, 12); }
    if (r === "vibe") { kws.forEach((k) => adj("kwAdj", k, 4, -24, 18)); }
    if (r === "value") { t.priceSens = clamp((t.priceSens || 0) + 1, 0, 3); }
    if (r === "scene") { if (ev.ncat) adj("ncatAdj", ev.ncat, -6, -24, 12); if (ev.nsub) adj("nsubAdj", ev.nsub, -8, -24, 12); kws.forEach((k) => adj("kwAdj", k, -4, -24, 18)); }
    if (r === "other" && arg) {
      // Free-text reason: kept as a note, and any of its words that describe this event become a mild taste signal
      t.notes = [...(t.notes || []).slice(-49), { id: ev.id, title: ev.title, dir, text: arg.slice(0, 200), at: Date.now() }];
      const evText = [ev.title, ev.desc, ev.sub, ev.ncat, ev.nsub, ...(ev.kw || [])].join(" ").toLowerCase();
      [...new Set(arg.toLowerCase().split(/[^a-z0-9&'-]+/))].filter((w) => w.length > 3 && evText.includes(w)).slice(0, 4)
        .forEach((w) => adj("kwAdj", w, 3 * sgn, -24, 18));
    }
    if (r === "pricey") { t.priceSens = clamp((t.priceSens || 0) + 1, 0, 3); const p = priceNum(ev); if (p) t.priceCeil = Math.min(t.priceCeil || 999, Math.max(10, Math.round(p * 0.8))); }
    if (dir === "up") {
      if (r === "type") bump(5, 8);
      if (r === "venue" && ev.venue) { t.follows = { ...t.follows, [venueKey(ev)]: venueLabel(ev) }; }
      if (r === "price") t.priceSens = clamp((t.priceSens || 0) + 1, 0, 3);
      if (r === "near") t.farSens = clamp((t.farSens || 0) + 1, 0, 3);
    } else {
      if (r === "notus") bump(-10, -15);
      if (r === "far") t.farSens = clamp((t.farSens || 0) + 1, 0, 3);
      if (r === "price") t.priceSens = clamp((t.priceSens || 0) + 1, 0, 3);
      if (r === "seen") t.hiddenSeries[seriesKey(ev)] = ev.title;
      if (r === "venue" && ev.venue) t.mutedVenues = { ...(t.mutedVenues || {}), [venueKey(ev)]: venueLabel(ev) };
    }
    t.reasons = { ...(t.reasons || {}), [dir + ":" + r]: ((t.reasons || {})[dir + ":" + r] || 0) + 1 };
  }
  if (kind === "nfm") {
    t.notForMe[ev.id] = reason;
    if (reason === "far") t.farSens = clamp(t.farSens + 1, 0, 3);
    if (reason === "price") t.priceSens = clamp(t.priceSens + 1, 0, 3);
    if (reason === "seen") t.hiddenSeries[seriesKey(ev)] = ev.title;
    if (reason === "notus") bump(-10, -15);
  }
  t.log = [{ id: ev.id, title: ev.title, cat, kind, reason: reason || null, at: Date.now() }, ...(taste.log || [])].slice(0, 60);
  return t;
}

// Every reaction records exactly what it changed for that event, so undoing the thumb (or switching it) takes it all back
const NUM_MAPS = ["catAdj", "subAdj", "kwAdj", "dowAdj", "todAdj", "ncatAdj", "nsubAdj", "seriesAdj", "reasons"];
const NUM_KEYS = ["uniqueAdj", "priceSens", "farSens"];
const SET_MAPS = ["follows", "mutedVenues", "hiddenSeries"];
function diffTaste(a, b) {
  const d = { n: {}, s: {}, add: {}, prev: {} };
  NUM_MAPS.forEach((m) => { const A = a[m] || {}, B = b[m] || {}; Object.keys(B).forEach((k) => { const x = (B[k] || 0) - (A[k] || 0); if (x) (d.n[m] = d.n[m] || {})[k] = x; }); });
  NUM_KEYS.forEach((k) => { const x = (b[k] || 0) - (a[k] || 0); if (x) d.s[k] = x; });
  SET_MAPS.forEach((m) => { const A = a[m] || {}; Object.keys(b[m] || {}).forEach((k) => { if (!(k in A)) (d.add[m] = d.add[m] || []).push(k); }); });
  if (b.priceCeil !== a.priceCeil) d.prev.priceCeil = a.priceCeil ?? null;
  if ((b.notes || []).length !== (a.notes || []).length) d.note = true;
  return d;
}
function mergeDiff(x, y) {
  if (!x) return y;
  const o = { n: { ...x.n }, s: { ...x.s }, add: { ...x.add }, prev: { ...y.prev, ...x.prev }, note: x.note || y.note };
  Object.entries(y.n).forEach(([m, kv]) => { o.n[m] = { ...(o.n[m] || {}) }; Object.entries(kv).forEach(([k, v]) => { o.n[m][k] = (o.n[m][k] || 0) + v; }); });
  Object.entries(y.s).forEach(([k, v]) => { o.s[k] = (o.s[k] || 0) + v; });
  Object.entries(y.add).forEach(([m, ks]) => { o.add[m] = [...new Set([...(o.add[m] || []), ...ks])]; });
  return o;
}
function revert(t, d, id) {
  if (!d) return t;
  const o = { ...t };
  Object.entries(d.n || {}).forEach(([m, kv]) => { o[m] = { ...(o[m] || {}) }; Object.entries(kv).forEach(([k, v]) => { const r = (o[m][k] || 0) - v; if (Math.abs(r) < 1e-9) delete o[m][k]; else o[m][k] = r; }); });
  Object.entries(d.s || {}).forEach(([k, v]) => { o[k] = (o[k] || 0) - v; });
  Object.entries(d.add || {}).forEach(([m, ks]) => { o[m] = { ...(o[m] || {}) }; ks.forEach((k) => delete o[m][k]); });
  if (d.prev && "priceCeil" in d.prev) { if (d.prev.priceCeil == null) delete o.priceCeil; else o.priceCeil = d.prev.priceCeil; }
  if (d.note) o.notes = (o.notes || []).filter((n) => n.id !== id);
  return o;
}
export function applyReaction(taste, prof, ev, kind, reason) {
  const contrib = { ...(taste.contrib || {}) };
  let base = taste;
  // Undo, or a thumb flipped to the other side: take back everything this event had contributed first
  const flip = (kind === "up" && taste.thumbs?.[ev.id] === -1) || (kind === "down" && taste.thumbs?.[ev.id] === 1);
  if (kind === "undo" || flip) { base = revert(taste, contrib[ev.id], ev.id); delete contrib[ev.id]; }
  const t = applyReactionRaw(base, prof, ev, kind, reason);
  if (kind !== "undo") contrib[ev.id] = mergeDiff(contrib[ev.id], diffTaste(base, t));
  // Keep the record for the latest 300 events only
  const ids = Object.keys(contrib); if (ids.length > 300) ids.slice(0, ids.length - 300).forEach((k) => delete contrib[k]);
  return { ...t, contrib };
}

export function toggleFollow(taste, ev) {
  const k = venueKey(ev);
  const follows = { ...taste.follows };
  if (follows[k]) delete follows[k]; else follows[k] = venueLabel(ev);
  return { ...taste, follows };
}

// Effective preference profile = saved sliders + learned adjustments
export function effectiveProf(prof, taste) {
  const categories = { ...prof.categories };
  Object.entries(taste.catAdj || {}).forEach(([c, d]) => {
    if (categories[c] === 0) return; // a hidden category stays hidden
    categories[c] = clamp((categories[c] ?? 30) + d, 1, 100);
  });
  const subcategories = { ...DEFAULT_SUBS, ...(prof.subcategories || {}) };
  Object.entries(taste.subAdj || {}).forEach(([k, d]) => {
    if (subcategories[k] === 0) return;
    subcategories[k] = clamp((subcategories[k] ?? 50) + d, 1, 100);
  });
  return { ...prof, categories, subcategories };
}

// ── Prices, outdoors
export const isFree = (ev) => /free|pwyw|pay what/i.test(ev.price || "") && !/\$\d/.test((ev.price || "").split("/")[0]);
export const priceNum = (ev) => { const n = parseFloat((ev.price || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };
export const isOutdoor = (ev) =>
  (ev.tags || []).includes("outdoor") || ev.cat === "Outdoors" ||
  /outdoor|open[- ]air|waterfront|park event|walking tour|parade|street fair|rooftop/i.test([ev.sub, ...(ev.kw || [])].join(" ")) ||
  (/\b(park|pier|plaza|garden|green|beach|lawn)\b/i.test((ev.venue || "").split(",")[0]) && !/square garden|garden (theat|hall)|park (ave|slope)/i.test(ev.venue || ""));

// ── Time
// "7 PM", "7–11 PM", "7:30 PM - 1 AM", "19:00" → minutes since midnight; end may be past midnight (> 1440)
export function timeRange(ev) {
  const t = ev.time || "";
  const parts = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm|a\.m\.|p\.m\.)?/g)].filter((m) => +m[1] <= 24).slice(0, 2);
  if (!parts.length) return null;
  const mer = (m) => (m[3] ? (/p/i.test(m[3]) ? "pm" : "am") : null);
  const toMin = (m, ap) => {
    let h = +m[1];
    if (ap) { h = h % 12; if (ap === "pm") h += 12; }
    else if (!/\d:\d/.test(t) || !m[2]) { if (h < 12 && h >= 1 && h <= 11) h += h < 9 ? 12 : 0; }
    return h * 60 + (m[2] ? +m[2] : 0);
  };
  const ap0 = mer(parts[0]), ap1 = parts[1] ? mer(parts[1]) : null;
  if (!ap0 && !ap1 && !/^\d{1,2}:\d{2}/.test(t)) return null;
  let s0 = toMin(parts[0], ap0 || ap1);
  let e = parts[1] ? toMin(parts[1], ap1 || ap0) : null;
  if (!ap0 && ap1 && e != null && s0 > e && s0 - 720 >= 0 && s0 - 720 < e) s0 -= 720; // "11–1 PM" style
  if (/doors|show/i.test(t)) e = null; // "doors 6:30, show 7" is not a range
  if (e != null && e <= s0) e += 1440;
  return { s: s0, e };
}
// What a saved event becomes in Google Calendar: timed when the start is known, otherwise all day.
// Events running over several days go on the next day they're on.
export function calPayload(ev, today) {
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const t0 = iso(today || new Date());
  const day = ev.X && ev.X !== ev.E && ev.E < t0 ? t0 : ev.E;
  const hm = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const s = startMinutes(ev); let e = endMinutes(ev);
  const loc = [ev.venue, ev.hood].filter(Boolean).join(", ");
  const desc = [ev.desc, ev.price && "Price: " + ev.price, ev.url, "Saved from Good Plans"].filter(Boolean).join("\n\n").slice(0, 600);
  if (s == null) return { title: ev.title, start: day, allDay: "1", loc, desc, gpid: ev.id };
  if (e == null || e <= s) e = Math.min(s + 120, 23 * 60 + 59);
  return { title: ev.title, start: day + "T" + hm(s), end: day + "T" + hm(e), allDay: "0", loc, desc, gpid: ev.id };
}
export function startMinutes(ev) { return timeRange(ev)?.s ?? null; }
export function endMinutes(ev) { return timeRange(ev)?.e ?? null; }
// How long things usually last when the listing gives no end (minutes)
const SEATED = /film|screening|movie|comedy|stand-?up|improv|theat|play\b|musical|opera|ballet|dance perf|lecture|talk|reading|panel|conversation|book launch|q&a|concert hall|recital|symphony|orchestra/i;
function typicalLength(ev) {
  const t = [ev.title, ev.sub, ev.nsub, ...(ev.kw || []), ...(ev.tags || [])].join(" ");
  if (/market|fair|festival|flea|bazaar/i.test(t)) return 360;
  if (/party|dj|club|dance night/i.test(t)) return 240;
  if (/tour|walk/i.test(t)) return 100;
  if (/class|workshop/i.test(t)) return 120;
  const c = ev.ncat || ev.cat || "";
  return ({ Film: 120, Comedy: 90, Music: 150, Nightlife: 240, "Talk & Learn": 90, "Food & Drink": 180, Family: 120, Sports: 150, Outdoors: 120, "Art & Culture": 120 })[c] || 120;
}
// The window an event is open today: listed times, else a typical length, else usual opening hours (est: true)
export function eventWindow(ev) {
  const r = timeRange(ev);
  if (r?.s != null) return { s: r.s, e: r.e != null ? r.e : r.s + typicalLength(ev), est: r.e == null };
  const t = [ev.title, ev.sub, ev.nsub, ev.venue, ...(ev.kw || [])].join(" ");
  if (/market|fair|flea/i.test(t)) return { s: 10 * 60, e: 17 * 60, est: true };
  if (/park|garden|outdoor|trail/i.test(t)) return { s: 8 * 60, e: 18 * 60, est: true };
  if (/bar|club|night/i.test(t)) return { s: 18 * 60, e: 24 * 60, est: true };
  return { s: 11 * 60, e: 18 * 60, est: true }; // galleries, museums, installations
}
// Latest arrival that's still worth it: seated shows by 10 min after start, everything else with ≥30 min left
export function lastEntry(ev) {
  const w = eventWindow(ev);
  const t = [ev.title, ev.sub, ev.nsub, ev.ncat, ...(ev.kw || [])].join(" ");
  if (!(ev.X && ev.X !== ev.E) && SEATED.test(t) && !/festival|market/i.test(t)) return Math.min(w.s + 10, w.e - 15);
  return w.e - Math.min(30, Math.max(15, (w.e - w.s) * 0.25));
}
// Could you still get there in time from home, by the fastest way (walk or subway)? Days after today always yes
export function canMake(ev, today, now = nowMinutes()) {
  if (!evCovers(ev, today)) return true;
  return now + (ev.tt?.mins ?? 20) <= lastEntry(ev);
}
// Today is its last day and you can no longer make it in time
export function missed(ev, today, now = nowMinutes()) {
  if (!evCovers(ev, today)) return false;
  if (ev.X && ev.X !== ev.E && ev.X > isoDay(today)) return false;
  return !canMake(ev, today, now);
}
// Over for good: past the (listed or estimated) end today, or a run whose last day is behind us
export function hasEnded(ev, today, now = nowMinutes()) {
  if (!evCovers(ev, today)) return false;
  if (ev.X && ev.X !== ev.E && ev.X > isoDay(today)) return false;
  return now >= eventWindow(ev).e;
}
export const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const fmtClock = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
  return h12 + (m ? ":" + String(m).padStart(2, "0") : "") + " " + ap;
};
export const isoDay = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function whenLabel(ev, today) {
  // Always the day (Today / Tomorrow / weekday + date) and the time when known; runs add "until <date>"
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  const multi = ev.X && ev.X !== ev.E;
  const time = hasKnownTime(ev) ? ev.time.replace(":00", "") : "";
  const t = time ? " " + time : "";
  if (multi) {
    const end = mkDate(ev.X), until = " · until " + MONTHS[end.getMonth()] + " " + end.getDate();
    if (evCovers(ev, today)) return "Today" + t + until;
    if (evCovers(ev, tom) && mkDate(ev.E) <= tom) return "Tomorrow" + t + until;
    const s = nextOn(ev, today) || mkDate(ev.E); // next day it's actually on (runs limited to some weekdays)
    return DAYS[s.getDay()] + " " + MONTHS[s.getMonth()] + " " + s.getDate() + t + until;
  }
  if (evCovers(ev, today)) return "Today" + t;
  if (evCovers(ev, tom)) return "Tomorrow" + t;
  const s = mkDate(ev.E);
  return DAYS[s.getDay()] + " " + MONTHS[s.getMonth()] + " " + s.getDate() + (time ? " · " + time : "");
}
// A single-day event today that started more than 2 h ago is treated as over
export function isOver(ev, today) {
  if ((ev.X && ev.X !== ev.E) || !evCovers(ev, today)) return false;
  const sm = startMinutes(ev);
  return sm != null && sm + 120 < nowMinutes();
}

export function travelLabel(tt) {
  if (!tt) return "";
  if (tt.mode === "walk") return tt.mins + " min walk";
  return tt.mins + " min · " + (tt.line || "subway");
}

// ── Weather (Open-Meteo, no key)
export async function fetchWeather(coord) {
  const [la, lo] = coord || LES;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${la.toFixed(3)}&longitude=${lo.toFixed(3)}` +
    `&hourly=precipitation_probability,precipitation,temperature_2m,apparent_temperature,weather_code,wind_speed_10m,snowfall` +
    `&daily=sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum` +
    `&current=temperature_2m,apparent_temperature,precipitation,snowfall,weather_code,wind_speed_10m` +
    `&timezone=America%2FNew_York&forecast_days=7&past_days=3&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather " + r.status);
  const d = await r.json();
  const byDate = {};
  (d.daily?.time || []).forEach((day, i) => {
    const ss = d.daily.sunset?.[i] ? new Date(d.daily.sunset[i]) : null;
    byDate[day] = { sunset: ss ? ss.getHours() * 60 + ss.getMinutes() : 17 * 60, hi: Math.round(d.daily.temperature_2m_max?.[i] ?? 0), lo: Math.round(d.daily.temperature_2m_min?.[i] ?? 0), pmax: d.daily.precipitation_probability_max?.[i] ?? 0, snow: d.daily.snowfall_sum?.[i] ?? 0, evening: 0, eveTemp: null };
  });
  (d.hourly?.time || []).forEach((t, i) => {
    const day = t.slice(0, 10), h = parseInt(t.slice(11, 13));
    if (byDate[day] && h >= 16 && h <= 23) byDate[day].evening = Math.max(byDate[day].evening, d.hourly.precipitation_probability[i] ?? 0);
    if (byDate[day] && h === 19) byDate[day].eveTemp = Math.round(d.hourly.temperature_2m?.[i] ?? 0);
  });
  Object.values(byDate).forEach((v) => { v.rainy = v.evening >= 50; });
  // Hourly list [{t:"YYYY-MM-DDTHH:00", temp, feels, pp, code, wind, snow}]
  const H = d.hourly || {};
  const hours = (H.time || []).map((t, i) => ({ t, temp: Math.round(H.temperature_2m?.[i] ?? 0), feels: Math.round(H.apparent_temperature?.[i] ?? 0), pp: H.precipitation_probability?.[i] ?? 0, code: H.weather_code?.[i] ?? 0, wind: Math.round(H.wind_speed_10m?.[i] ?? 0), snow: H.snowfall?.[i] ?? 0 }));
  const c = d.current || {};
  return { byDate, hours, now: { temp: Math.round(c.temperature_2m ?? 0), feels: Math.round(c.apparent_temperature ?? c.temperature_2m ?? 0), rainingNow: (c.precipitation ?? 0) > 0.1, snowingNow: (c.snowfall ?? 0) > 0 || [71, 73, 75, 77, 85, 86].includes(c.weather_code), code: c.weather_code ?? 0, wind: Math.round(c.wind_speed_10m ?? 0) }, at: Date.now() };
}

// ── Scoring wrapper: core score + follows, sensitivities, weather, hidden
export function scoreEvent(ev, ctx) {
  const { eprof, beh, today, home, taste, weather, busySlots } = ctx;
  const bd = calcBd(ev, eprof, beh, today, home, null);
  const hidden = bd.excluded || taste.thumbs[ev.id] === -1 || !!taste.notForMe[ev.id] || !!taste.hiddenSeries[seriesKey(ev)];
  let s = bd.total;
  const why = [];
  const followed = !!taste.follows[venueKey(ev)];
  if (followed) { s += 12; why.push("You follow " + venueLabel(ev)); }
  if (taste.thumbs[ev.id] === 1) s += 6;
  if (taste.mutedVenues?.[venueKey(ev)]) s -= 15;
  // Categories hidden or picked in filters (ncatAdj: -24 … +12)
  if (taste.ncatAdj && ev.ncat) s += taste.ncatAdj[ev.ncat] || 0;
  if (taste.seriesAdj) s += taste.seriesAdj[seriesKey(ev)] || 0;
  if (taste.uniqueAdj && (runLen(ev) === 1 || matchV(ev, "weird") || matchV(ev, "nyc"))) s += taste.uniqueAdj;
  if (taste.priceCeil && !isFree(ev) && (priceNum(ev) || 0) > taste.priceCeil) s -= 8;
  if (taste.nsubAdj && ev.nsub) s += taste.nsubAdj[ev.nsub] || 0;
  // Starred (boosted) categories and sub-types
  if (taste.stars?.cats?.[ev.ncat]) { s += 10; why.push("You boosted " + ev.ncat); }
  if (ev.nsub && taste.stars?.subs?.[ev.nsub]) { s += 8; why.push("You boosted " + ev.nsub); }
  // Learned from the "why" picker: keywords, weekday, time of day, outdoors
  if (taste.kwAdj) s += clamp((ev.kw || []).reduce((a, k) => a + (taste.kwAdj[k.toLowerCase()] || 0), 0), -20, 15);
  if (taste.dowAdj && ev.E) s += taste.dowAdj[new Date((evCovers(ev, today) ? isoDay(today) : ev.E) + "T12:00:00").getDay()] || 0;
  if (taste.todAdj) { const td = todOf(ev); if (td) s += taste.todAdj[td] || 0; if (isOutdoor(ev)) s += taste.todAdj.outdoor || 0; }
  const p = priceNum(ev);
  if (!isFree(ev) && p != null && p >= 15 && taste.priceSens) s -= taste.priceSens * 4;
  if (bd.tt?.mins > 20 && taste.farSens) s -= taste.farSens * 4;
  const day = evCovers(ev, today) ? isoDay(today) : ev.E;
  const w = weather?.byDate?.[day];
  const outdoor = isOutdoor(ev);
  let rain = false, dark = false;
  if (w && outdoor) {
    if (w.rainy) { s -= 15; rain = true; }
    const sm = startMinutes(ev);
    if (sm != null && sm + 150 > w.sunset && sm < w.sunset + 60) dark = true;
  }
  const busy = isEventBusy(ev, busySlots);
  // Plain-language reasons, first = strongest
  if (bd.tt?.mins <= 10) why.push(bd.tt.mode === "walk" ? "Around the corner" : "Quick ride");
  if (isFree(ev)) why.push("Free");
  if ((bd.taste || 0) > 25) why.push("You like " + (ev.sub || ev.cat).toLowerCase());
  if (runLen(ev) === 1) why.push("One night only");
  else if (Math.round((evEnd(ev) - today) / 86400000) <= 5 && runLen(ev) > 3) why.push("Ends soon");
  if (ev.tier === 1 && ev.src) why.push("Picked by " + ev.src);
  return { ...ev, sc: Math.max(0, Math.min(100, Math.round(s))), bd, hidden, why, followed, rain, dark, busy, outdoor, tt: bd.tt, wx: w || null };
}

// ── Weather badge for an outdoor event (null when nothing worth saying)
export function weatherBadge(ev) {
  if (!ev.outdoor || !ev.wx) return null;
  const { hi, pmax } = ev.wx;
  if (ev.rain) return { icon: "rain", text: "Rain likely", tone: "warn" };
  if (hi && hi < 48) return { icon: "layer", text: "Cold out · " + fmtT(hi), tone: "plain" };
  if (ev.dark) return { icon: "moon", text: "Ends after dark", tone: "plain" };
  if (pmax < 25 && hi >= 55 && hi <= 84) return { icon: "sun", text: "Great weather", tone: "free" };
  return null;
}

// ── Free-until filter
export function fitsFree(ev, freeUntil, today) {
  if (!freeUntil) return true;
  if (!evCovers(ev, today)) return false;
  const now = nowMinutes(), until = freeUntil;
  const sm = startMinutes(ev), travel = ev.tt?.mins || 15;
  if (sm == null) return eHour(ev.time, ev.cat) < 17 && now < 16 * 60 && until - now >= 90;
  return sm >= now + travel - 15 && sm <= until - 60;
}

// ── Sections for Today
const dedupe = (arr) => { const seen = new Set(); return arr.filter((e) => { const k = seriesKey(e); if (seen.has(k)) return false; seen.add(k); return true; }); };

export function buildToday(scored, { today, freeUntil, eprof }) {
  const live = scored.filter((e) => !e.hidden);
  const now = nowMinutes();
  const used = new Set();
  const take = (arr, n) => { const out = []; for (const e of arr) { if (used.has(e.id)) continue; out.push(e); used.add(e.id); if (out.length === n) break; } return out; };

  // Starting in the next 2.5 h, started in the last 90 min, or running now (end time known)
  const onNow = (e) => { const sm = startMinutes(e), em = endMinutes(e); return sm != null && sm <= now && (em != null ? em > now : sm >= now - 90); };
  const nowSoon = dedupe(live.filter((e) => {
    if (!evCovers(e, today) || isImprecise(e) || !hasKnownTime(e)) return false;
    const sm = startMinutes(e); if (sm == null) return false;
    return (onNow(e) || (sm > now && sm <= now + 150)) && (e.tt?.mins ?? 99) <= 25 && fitsFree(e, freeUntil, today);
  })).sort((a, b) => (onNow(b) - onNow(a)) || (startMinutes(a) - startMinutes(b)) || (b.sc - a.sc)).slice(0, 12);
  nowSoon.forEach((e) => used.add(e.id));

  const tonightPool = dedupe(live.filter((e) => {
    if (!evCovers(e, today)) return false;
    const sm = startMinutes(e);
    const evening = sm != null ? sm >= Math.max(now - 30, 16 * 60) : eHour(e.time, e.cat) >= 17 && now < 21 * 60;
    return evening && fitsFree(e, freeUntil, today);
  })).sort((a, b) => b.sc - a.sc);
  const tonight = take(tonightPool, 8);

  const dow = today.getDay();
  const fri = new Date(today); fri.setDate(today.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const wkStart = dow === 5 || dow === 6 || dow === 0 ? tomorrow : fri;
  const weekend = take(dedupe(live.filter((e) => evStart(e) <= sun && evEnd(e) >= wkStart)).sort((a, b) => b.sc - a.sc), 5);

  const book = take(live.filter((e) => bookSoon(e, today)).sort((a, b) => b.sc - a.sc), 3);

  const wildcard = take(live.filter((e) => (eprof.categories?.[e.cat] ?? 30) < 45 && (e.tier || 2) === 1 && daysUntil(e, today) <= 7 && evActive(e, today))
    .sort((a, b) => (b.bd.qual + b.bd.urg + b.bd.near) - (a.bd.qual + a.bd.urg + a.bd.near)), 1)[0] || null;

  return { nowSoon, tonight, weekend, book, wildcard, total: nowSoon.length + tonight.length + weekend.length + book.length + (wildcard ? 1 : 0) };
}

// ── Taste summary in plain words
export function tasteSummary(eprof, taste, catList) {
  const prefs = catList.filter((c) => c !== "Other").map((c) => [c, eprof.categories?.[c] ?? 30]).sort((a, b) => b[1] - a[1]);
  const love = prefs.filter(([, v]) => v >= 70).map(([c]) => c.toLowerCase());
  const like = prefs.filter(([, v]) => v >= 45 && v < 70).map(([c]) => c.toLowerCase());
  const skip = prefs.filter(([, v]) => v > 0 && v < 20).map(([c]) => c.toLowerCase());
  const hide = prefs.filter(([, v]) => v === 0).map(([c]) => c.toLowerCase());
  const list = (a) => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const parts = [];
  if (love.length) parts.push("You love " + list(love.slice(0, 3)) + ".");
  if (like.length) parts.push("You like " + list(like.slice(0, 3)) + ".");
  if (skip.length || hide.length) parts.push("You mostly skip " + list([...hide, ...skip].slice(0, 3)) + ".");
  if (taste.priceSens >= 2) parts.push("Pricier nights get pushed down.");
  if (taste.farSens >= 2) parts.push("Long trips get pushed down.");
  const n = Object.keys(taste.thumbs).length + Object.keys(taste.notForMe).length;
  if (n) parts.push("Learned from " + n + " reaction" + (n === 1 ? "" : "s") + ".");
  return parts.join(" ") || "Tap a few thumbs and Good Plans will learn what you like.";
}

export { safeCoord, kmdist, transitTime, floorDay, evCovers, evActive, hasKnownTime };
