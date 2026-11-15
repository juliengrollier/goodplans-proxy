// Duplicates: the same event listed by several sources (same day, near-identical title, same place) is merged into one;
// and lists collapse repeated dates of one series into a single card ("+N more dates").
import { seriesKey, venueKey } from "./engine.js";

const STOP = new Set(["the", "and", "with", "at", "in", "on", "of", "a", "an", "for", "nyc", "new", "york", "presents", "free", "live"]);
const toks = (s) => [...new Set(String(s || "").toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
const jacc = (a, b) => { if (!a.length || !b.length) return 0; const B = new Set(b); const i = a.filter((x) => B.has(x)).length; return i / new Set([...a, ...b]).size; };
const venueRoot = (e) => toks(venueKey(e)).slice(0, 2).join(" ");

const better = (a, b) => {
  const score = (e) => (e.tier === 1 ? 4 : 0) + Math.min(3, (e.desc || "").length / 150) + (e.url ? 1 : 0) + (e.time ? 1 : 0) + (e.coord ? 1 : 0);
  return score(b) > score(a) ? b : a;
};

export function mergeDuplicates(events) {
  const byDay = {};
  events.forEach((e) => { (byDay[e.E] = byDay[e.E] || []).push(e); });
  const out = [];
  Object.values(byDay).forEach((list) => {
    const kept = [];
    list.forEach((e) => {
      const t = toks(e.title), v = venueRoot(e);
      const dup = kept.find((k) => {
        const sim = jacc(t, k._t);
        const sameVenue = !v || !k._v || v === k._v || jacc(v.split(" "), k._v.split(" ")) >= 0.5;
        return (sim >= 0.6 && sameVenue) || (sim >= 0.85);
      });
      if (!dup) { kept.push({ ...e, _t: t, _v: v, srcs: [e.src].filter(Boolean) }); return; }
      const win = better(dup, e);
      const merged = { ...dup, ...win, _t: dup._t, _v: dup._v, srcs: [...new Set([...(dup.srcs || []), e.src].filter(Boolean))] };
      merged.id = dup.id; // keep the first id so saves and thumbs stay attached
      kept[kept.indexOf(dup)] = merged;
    });
    kept.forEach(({ _t, _v, ...e }) => out.push(e));
  });
  return out;
}

// Keep the first occurrence of each series (list already sorted); others become a "+N more dates" count
export function collapseSeries(list) {
  const seen = new Map(), out = [];
  list.forEach((e) => {
    const k = seriesKey(e) + "@" + venueKey(e);
    if (!seriesKey(e)) { out.push(e); return; }
    if (seen.has(k)) { const first = seen.get(k); first.moreDates = (first.moreDates || 0) + 1; return; }
    const c = { ...e, moreDates: 0 }; seen.set(k, c); out.push(c);
  });
  return out;
}
