// What to show under an event so one listing leads to the next:
// make a night of it (before and after, a short walk away), the next dates of a series,
// more at the same venue, and an endless "up next for you" queue.
import { CAT } from "./taxonomy.js";
import { startMinutes, endMinutes, seriesKey, venueKey } from "./engine.js";
import { nextOn, evCovers, kmdist, isImprecise, floorDay } from "../lib/core.js";

const famOf = (e) => CAT[e.ncat]?.fam || "";
const pos = (e) => (!isImprecise(e) && Array.isArray(e.coord) && e.coord.length === 2 ? e.coord : null);
const sk = (e) => seriesKey(e) + "@" + venueKey(e);
const rkOf = (e) => e.rk ?? e.sc ?? 50;
// Walking minutes on the street grid (about 80 m a minute, streets add a quarter to the straight line)
export const walkMins = (km) => Math.max(1, Math.round((km * 1000 * 1.25) / 80));
const hm = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + (mm ? ":" + String(mm).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); };
// Venue names too vague to group on ("Various", "Manhattan", "Online")
const VAGUE = /^(various|tbd|tba|online|virtual|manhattan|brooklyn|queens|bronx|staten island|new york|nyc|citywide|multiple locations|see website)$/;

// The day this event is next on (today or later)
export function dayOf(ev, today) {
  const d = nextOn(ev, today);
  return d || floorDay(new Date((ev.E || "") + "T12:00:00"));
}

// Make a night of it: things that end shortly before it starts, or start shortly after it ends,
// on the same day, within about a 20-minute walk. Food, drinks and parties get a head start.
export function nightOf(ev, list, today, n = 2) {
  const p = pos(ev); if (!p) return null;
  const day = dayOf(ev, today), s0 = startMinutes(ev);
  let e0 = endMinutes(ev); if (s0 != null && (e0 == null || e0 <= s0)) e0 = s0 + 120;
  const me = sk(ev), out = { day, before: [], after: [], same: [], coord: p };
  const cands = [];
  for (const e of list) {
    if (e.id === ev.id || e.hidden || sk(e) === me) continue;
    const q = pos(e); if (!q) continue;
    const km = kmdist(q, p); if (km > 1.6) continue;
    if (!evCovers(e, day)) continue;
    cands.push({ e, km, s: startMinutes(e), en: endMinutes(e) });
  }
  const social = (e) => (famOf(e) === "eat" || famOf(e) === "party" ? 18 : 0);
  if (s0 == null) {
    // No start time (an all-day show, a market): the best things nearby that day
    out.same = cands.sort((a, b) => rkOf(b.e) + social(b.e) - b.km * 8 - (rkOf(a.e) + social(a.e) - a.km * 8)).slice(0, n + 1).map((c) => ({ ev: c.e, walk: walkMins(c.km), label: "Same day" }));
    return out.same.length ? out : null;
  }
  const before = [], after = [];
  for (const c of cands) {
    if (c.s == null) continue;
    const en = c.en != null && c.en > c.s ? c.en : c.s + 120;
    const base = rkOf(c.e) + social(c.e) - c.km * 10;
    // Before: done within the 2½ hours before it starts (or a happy hour that's on until shortly before)
    if (en <= s0 + 10 && en >= s0 - 150 && c.s >= s0 - 300) before.push({ ...c, r: base - Math.abs(s0 - en) / 12 });
    // After: starts from just before it ends to 3 hours later
    else if (c.s >= e0 - 15 && c.s <= e0 + 180) after.push({ ...c, r: base - Math.max(0, c.s - e0) / 12 });
  }
  const pick = (l, label) => l.sort((a, b) => b.r - a.r).slice(0, n).map((c) => ({ ev: c.e, walk: walkMins(c.km), label }));
  out.before = pick(before, "Before");
  out.after = pick(after, "After");
  out.startsAt = hm(s0); out.endsAt = hm(e0);
  return out.before.length || out.after.length ? out : null;
}

// Next dates: other listings of the same series, then this listing's own upcoming dates when it repeats
export function nextDatesOf(ev, list, today, n = 4) {
  const me = sk(ev), first = dayOf(ev, today), out = [], seen = new Set([+first]);
  list.filter((e) => e.id !== ev.id && sk(e) === me).forEach((e) => {
    const d = nextOn(e, today); if (!d || seen.has(+d)) return;
    seen.add(+d); out.push({ d, time: e.time, ev: e });
  });
  // Its own dates, only when it repeats on set days (not a show that's simply on every day)
  const daily = !ev.dows && !ev.dates && ev.X && ev.X > ev.E && !ev.recurring;
  if (!daily && ev.X && ev.X > ev.E) {
    let x = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
    for (let k = 0; k < 120 && out.length < n + 2; k++) {
      const d = nextOn(ev, x); if (!d) break;
      if (!seen.has(+d)) { seen.add(+d); out.push({ d, time: ev.time, ev: null }); }
      x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
  }
  return out.sort((a, b) => a.d - b.d).slice(0, n);
}

// A real, specific venue (not "Various", not just a neighbourhood)
export const venueOk = (ev) => { const v = venueKey(ev); return !!v && !VAGUE.test(v) && v !== (ev.hood || "").toLowerCase(); };
// More at this venue: the venue's other upcoming listings, best first
export function atVenueOf(ev, list, n = 4) {
  const v = venueKey(ev);
  if (!venueOk(ev)) return [];
  const me = sk(ev), seen = new Set([me]), out = [];
  [...list].filter((e) => e.id !== ev.id && !e.hidden && venueKey(e) === v).sort((a, b) => rkOf(b) - rkOf(a)).forEach((e) => {
    const k = sk(e); if (seen.has(k)) return; seen.add(k); out.push(e);
  });
  return out.slice(0, n);
}

// Up next for you: your ranking, minus what's already on this page or behind you on the trail.
// A small lean toward the same family as the event you're on keeps the chain coherent.
export function upNextOf(ev, list, skip, n = 6) {
  const fam = famOf(ev), seen = new Set(), out = [];
  [...list].filter((e) => !skip.has(e.id) && e.id !== ev.id && !e.hidden)
    .map((e) => [e, rkOf(e) + (famOf(e) === fam ? 4 : 0)]).sort((a, b) => b[1] - a[1])
    .forEach(([e]) => { const k = sk(e); if (seen.has(k) || out.length >= n) return; seen.add(k); out.push(e); });
  return out;
}

// Google Maps searches near the venue, for dinner before or drinks after (a plain link: no API cost)
export const mapsNear = (coord, what) => "https://www.google.com/maps/search/" + encodeURIComponent(what) + "/@" + coord[0] + "," + coord[1] + ",16z";
