// Home "For you" tiles: quick time tiles on top, then mood and pick tiles (each a curated list with a teaser).
// The same tiles come back as "More ideas" at the bottom of Explore after opening one.
import { Moon, PartyPopper, Heart, Smile, Beer, Coffee, Sunrise, Sunset, TreePine, Compass, Landmark, Utensils, Activity, Umbrella, Flame, MapPin, Sun, Tag, Sparkles, BookOpen } from "lucide-react";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { PULSE_ICON } from "./pulseIcons.js";
import { daysUntil } from "../lib/core.js";
import { isFree } from "./engine.js";

const MOOD_ICON = {
  "nightcap": Moon, "big-night": PartyPopper, "date-night": Heart, "laugh": Smile, "shake-week": Beer, "after-work": Coffee,
  "lazy-sunday": Coffee, "sunday-scaries": Sunset, "fresh-air": TreePine, "wander": Compass, "culture": Landmark, "feed-me": Utensils,
  "move": Activity, "hideout": Umbrella, "warm-up": Flame, "explorer": MapPin, "early": Sunrise, "free-ride": Tag,
};
const MOOD_COLOR = ["#7B4BD6", "#0D9488", "#C2410C", "#BE185D", "#2563EB", "#15803D", "#B45309", "#4338CA", "#0891B2"];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? "" : ".") : "");

const QUICK = [
  ["tonight", "Tonight", "#7B4BD6", { when: "tonight" }],
  ["tomorrow", "Tomorrow", "#E5533D", { when: "tomorrow" }],
  ["weekend", "This weekend", "#F2611D", { when: "weekend" }],
  ["week", "This week", "#2563EB", { when: "week" }],
];

// Endless tail: lists generated from what is actually on in the next two weeks (by category, sub-type, area, free)
function facetTiles(visible, today, hid) {
  const ok = visible.filter((e) => { const d = daysUntil(e, today); return d <= 14 && !hid.xcats.includes(e.cat) && !hid.xsubs.includes(e.sub); });
  const by = (key, label, teaser, icon, pick) => { const m = new Map(); ok.forEach((e) => { const k = pick(e); if (k) { if (!m.has(k)) m.set(k, []); m.get(k).push(e); } });
    return [...m.entries()].filter(([, l]) => l.length >= 3).map(([k, l]) => ({ key: "gen-" + key + "-" + k, title: label(k), teaser: teaser(k), n: l.length, icon, list: l })); };
  const all = [
    ...by("cat", (k) => "More " + k.toLowerCase(), (k) => "Everything in " + k.toLowerCase() + " over the next two weeks.", Sparkles, (e) => e.ncat || e.cat),
    ...by("sub", (k) => k, (k) => "Just " + k.toLowerCase() + ", soonest first.", Compass, (e) => e.sub),
    ...by("hood", (k) => "Around " + k, (k) => "What is on in " + k + " in the next two weeks.", MapPin, (e) => e.hood),
    ...by("free", (k) => "Free " + k.toLowerCase(), (k) => "No ticket needed, in " + k.toLowerCase() + ".", Tag, (e) => (isFree(e) ? e.ncat || e.cat : null)),
  ];
  return all.sort((a, b) => b.n - a.n).map((t, i) => ({ ...t, color: MOOD_COLOR[(i + 3) % MOOD_COLOR.length] }));
}

export function buildTiles({ visible, today, filters, youR, youA, youTitle, picks = [], pool = [], book = [], meet, fb = {}, dark }) {
  const hid = { xcats: filters.xcats || [], xsubs: filters.xsubs || [] };
  const quick = QUICK.map(([key, title, color, patch]) => ({ key, title, color, patch, n: applyFilters(visible, { ...EMPTY_FILTERS, ...patch, ...hid }, today).length })).filter((t) => t.n);
  const day = Math.floor(today.getTime() / 86400000);
  const mk = (a, i) => ({
    key: "mood-" + a.id, id: a.id, title: (youA && a.id === youA.id && youTitle) || a.titles?.[day % a.titles.length] || a.label,
    teaser: cap(a.offer), n: a.list.length, color: MOOD_COLOR[i % MOOD_COLOR.length], icon: PULSE_ICON[a.id] || MOOD_ICON[a.id] || Sparkles, list: a.list, moodId: a.id,
  });
  const moods = (youR?.all || []).filter((a) => a.list.length >= 2).map(mk);
  const top = youA ? moods.find((m) => m.id === youA.id) : null;
  const pk = picks.map((p) => ({ key: "pick-" + p.id, title: p.name, teaser: p.teaser, n: p.list.length, color: p.color, icon: p.icon || BookOpen, list: p.list, f: p.f }));
  const have = new Set(picks.map((p) => p.id));
  const fill = pool.filter((p) => !have.has(p.id)).map((p) => ({ key: "pick-" + p.id, title: p.name, teaser: p.teaser, n: p.list.length, color: p.color, icon: p.icon || BookOpen, list: p.list, f: p.f }));
  const bk = book.length ? [{ key: "book", title: "Book ahead", teaser: "Ticketed and selling out soon, so decide early.", n: book.length, color: "#C2410C", icon: Tag, list: book }] : [];
  // Lead with the top mood, then alternate your picks and the other moods, then the rest of the pool and Book ahead
  const rest = moods.filter((m) => m !== top);
  const order = top ? [top] : [];
  for (let i = 0; i < Math.max(pk.length, rest.length); i++) { if (pk[i]) order.push(pk[i]); if (rest[i]) order.push(rest[i]); }
  order.push(...fill, ...bk);
  if (meet) { const i = order.findIndex((t) => t.key === "pick-meet"); if (i > 0) order.unshift(...order.splice(i, 1)); }
  const overlap = (a, b) => { const ids = new Set(a.list.slice(0, 10).map((e) => e.id)); return b.list.slice(0, 10).filter((e) => ids.has(e.id)).length / Math.min(10, Math.max(1, ids.size)); };
  // Near-copies last: strict first, then the looser ones, so "More moods" keeps giving fresh lists. Thumbs-down ones go to the end.
  const out = [];
  for (const limit of [0.6, 0.85, 1.01]) {
    for (const t of order) {
      if (out.includes(t) || t.list.length < 2) continue;
      if (out.some((o) => overlap(o, t) > limit)) continue;
      out.push(t);
    }
  }
  const seen = new Set(out.map((t) => t.title.toLowerCase()));
  const gen = facetTiles(visible, today, hid).filter((t) => !seen.has(t.title.toLowerCase()));
  out.sort((a, b) => (fb[a.key] === -1) - (fb[b.key] === -1));
  const lead = out.length; out.push(...gen); order.push(...gen);
  const base = Math.max(8, Math.min(10, out.length)) - (Math.max(8, Math.min(10, out.length)) % 2);
  return { quick, lists: out.slice(0, base), all: out, every: order, base, curated: lead };
}
