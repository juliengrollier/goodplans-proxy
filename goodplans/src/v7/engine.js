// v7 engine: taste learning, scoring wrapper, time helpers, weather, Today sections.
import {
  calcBd, safeCoord, kmdist, transitTime, evCovers, evActive, evStart, evEnd, runLen, daysUntil,
  hasKnownTime, eHour, isImprecise, isEventBusy, bookSoon, floorDay, mkDate, DAYS, MONTHS, DEFAULT_SUBS,
} from "../lib/core.js";

export const LES = [40.7186, -73.9865];

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

export function applyReaction(taste, prof, ev, kind, reason) {
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
export function startMinutes(ev) { return timeRange(ev)?.s ?? null; }
export function endMinutes(ev) { return timeRange(ev)?.e ?? null; }
export const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const fmtClock = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
  return h12 + (m ? ":" + String(m).padStart(2, "0") : "") + " " + ap;
};
export const isoDay = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function whenLabel(ev, today) {
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  const multi = ev.X && ev.X !== ev.E;
  const time = hasKnownTime(ev) ? ev.time.replace(":00", "") : "";
  if (multi) {
    const end = mkDate(ev.X);
    if (evCovers(ev, today)) return "Until " + MONTHS[end.getMonth()] + " " + end.getDate();
    const s = mkDate(ev.E);
    return MONTHS[s.getMonth()] + " " + s.getDate() + "–" + (s.getMonth() === end.getMonth() ? "" : MONTHS[end.getMonth()] + " ") + end.getDate();
  }
  if (evCovers(ev, today)) { const sm = startMinutes(ev); return time ? (sm != null && sm >= 17 * 60 ? "Tonight " : "Today ") + time : "Today"; }
  if (evCovers(ev, tom)) return "Tomorrow" + (time ? " " + time : "");
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${la.toFixed(3)}&longitude=${lo.toFixed(3)}&hourly=precipitation_probability,precipitation,temperature_2m&daily=sunset,temperature_2m_max,precipitation_probability_max&current=temperature_2m,precipitation&timezone=America%2FNew_York&forecast_days=7&temperature_unit=fahrenheit`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather " + r.status);
  const d = await r.json();
  const byDate = {};
  (d.daily?.time || []).forEach((day, i) => {
    const ss = d.daily.sunset?.[i] ? new Date(d.daily.sunset[i]) : null;
    byDate[day] = { sunset: ss ? ss.getHours() * 60 + ss.getMinutes() : 17 * 60, hi: Math.round(d.daily.temperature_2m_max?.[i] ?? 0), pmax: d.daily.precipitation_probability_max?.[i] ?? 0, evening: 0 };
  });
  (d.hourly?.time || []).forEach((t, i) => {
    const day = t.slice(0, 10), h = parseInt(t.slice(11, 13));
    if (byDate[day] && h >= 16 && h <= 23) byDate[day].evening = Math.max(byDate[day].evening, d.hourly.precipitation_probability[i] ?? 0);
  });
  Object.values(byDate).forEach((v) => { v.rainy = v.evening >= 50; });
  // Hourly list kept for the forecast strip: [{t:"YYYY-MM-DDTHH:00", temp, pp}]
  const hours = (d.hourly?.time || []).map((t, i) => ({ t, temp: Math.round(d.hourly.temperature_2m?.[i] ?? 0), pp: d.hourly.precipitation_probability?.[i] ?? 0 }));
  return { byDate, hours, now: { temp: Math.round(d.current?.temperature_2m ?? 0), rainingNow: (d.current?.precipitation ?? 0) > 0.1 }, at: Date.now() };
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
  if (hi && hi < 48) return { icon: "layer", text: "Cold out · " + hi + "°", tone: "plain" };
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
