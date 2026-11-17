// Duplicates: the same event listed by several sources (same day, near-identical title, same place) is merged into one;
// and lists collapse repeated dates of one series into a single card ("+N more dates").
import { seriesKey, venueKey } from "./engine.js";

const STOP = new Set(["the", "and", "with", "at", "in", "on", "of", "a", "an", "for", "nyc", "new", "york", "presents", "free", "live"]);
const toks = (s) => [...new Set(String(s || "").toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
const jacc = (a, b) => { if (!a.length || !b.length) return 0; const B = new Set(b); const i = a.filter((x) => B.has(x)).length; return i / new Set([...a, ...b]).size; };
// Words match when equal or when one abbreviates the other ("met" / "metropolitan")
const wm = (x, y) => x === y || (Math.min(x.length, y.length) >= 3 && (x.startsWith(y) || y.startsWith(x)));
// Share of the shorter title found in the longer one, so "Met Fridays Under 40" ≈ "Metropolitan Opera Fridays Under 40"
const overlap = (a, b) => { if (!a.length || !b.length) return 0; const [s, l] = a.length <= b.length ? [a, b] : [b, a]; return s.filter((x) => l.some((y) => wm(x, y))).length / s.length; };
const venueRoot = (e) => toks(venueKey(e)).slice(0, 2);
// Title words without the venue's own words: "Open Mic at Pete's Candy Store" → "open mic"
const VENUE_FILLER = new Set(["bar", "club", "cafe", "store", "hall", "room", "theater", "theatre", "house", "park", "center", "centre"]);
const coreToks = (e) => { const v = new Set(toks(e.venue).filter((w) => !VENUE_FILLER.has(w) || toks(e.venue).length <= 1)); const t = toks(e.title); const c = t.filter((w) => !v.has(w) && !(w.length >= 4 && [...v].some((x) => x.startsWith(w) || w.startsWith(x)))); return c.length ? c : t; };
const end = (e) => e.X || e.E;
// Same day, or two date ranges that overlap (season-long listings from different sources)
const sameTime = (a, b) => a.E === b.E || ((a.X || b.X) && a.E <= end(b) && b.E <= end(a));

const better = (a, b) => {
  const score = (e) => (e.recurring === "synthetic" ? -5 : 0) + (e.tier === 1 ? 4 : 0) + Math.min(3, (e.desc || "").length / 150) + (e.url ? 1 : 0) + (e.time ? 1 : 0) + (e.coord ? 1 : 0);
  return score(b) > score(a) ? b : a;
};

export function mergeDuplicates(events) {
  const kept = [], byDay = {}, ranged = [];
  events.forEach((e) => {
    const t = coreToks(e), v = venueRoot(e);
    const pool = [...(byDay[e.E] || []), ...(e.X ? ranged : [])];
    const dup = pool.find((k) => {
      if (!sameTime(e, k)) return false;
      const sim = overlap(t, k._t), n = Math.min(t.length, k._t.length);
      const known = v.length && k._v.length, venueMatch = known && overlap(v, k._v) >= 0.5;
      if (known && !venueMatch) return false; // two named places: two events
      // Same named place, same day: one shared word is enough ("Trivia Night" / "Parklife Trivia")
      if (venueMatch) return (n >= 2 && sim >= 0.75) || (n === 1 && sim === 1);
      return (n >= 3 && sim >= 0.9) || jacc(t, k._t) >= 0.85;
    });
    if (!dup) {
      const k = { ...e, _t: t, _v: v, srcs: [e.src].filter(Boolean) };
      kept.push(k); (byDay[e.E] = byDay[e.E] || []).push(k); if (e.X) ranged.push(k);
      return;
    }
    const win = better(dup, e);
    Object.assign(dup, { ...win, _t: dup._t, _v: dup._v, id: dup.id, // keep the first id so saves and thumbs stay attached
      srcs: [...new Set([...(dup.srcs || []), e.src].filter(Boolean))] });
    if (dup.X || e.X) { delete dup.dates; delete dup.dows; } // merged ranges: the structured day lists no longer apply
    if (dup.X || e.X) { dup.E = dup.E < e.E ? dup.E : e.E; dup.X = end(dup) > end(e) ? end(dup) : end(e); }
  });
  return kept.map(({ _t, _v, ...e }) => e);
}

// Keep the first occurrence of each series (list already sorted); others become a "+N more dates" count
export function collapseSeries(list) {
  const seen = new Map(), out = [];
  list.forEach((e) => {
    const k = coreToks(e).sort().join(" ") + "@" + venueRoot(e).join(" ");
    if (!seriesKey(e)) { out.push(e); return; }
    if (seen.has(k)) { const first = seen.get(k); first.moreDates = (first.moreDates || 0) + 1; return; }
    const c = { ...e, moreDates: 0 }; seen.set(k, c); out.push(c);
  });
  return out;
}
