// Home "For you" tiles: quick time tiles on top, then mood and pick tiles (each a curated list with a teaser).
// The same tiles come back as "More ideas" at the bottom of Explore after opening one.
import { Moon, PartyPopper, Heart, Smile, Beer, Coffee, Sunrise, Sunset, TreePine, Compass, Landmark, Utensils, Activity, Umbrella, Flame, MapPin, Sun, Tag, Sparkles, BookOpen } from "lucide-react";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { PULSE_ICON } from "./pulseIcons.js";
import { daysUntil } from "../lib/core.js";
import { isFree, startMinutes } from "./engine.js";

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

// Endless tail: inventive lists built from what is actually on in the next two weeks, ranked by how well they fit your taste
const low = (k) => String(k).toLowerCase();
const priceOf = (e) => { const m = String(e.price || "").match(/\$\s*(\d+)/); return m ? +m[1] : null; };
function facetTiles(visible, today, hid) {
  const ok = visible.filter((e) => { const d = daysUntil(e, today); return d <= 14 && !hid.xcats.includes(e.cat) && !hid.xsubs.includes(e.sub); });
  const sm = (e) => startMinutes(e);
  const dowOf = (e) => new Date(e.E + "T12:00:00").getDay();
  const cat = (e) => e.ncat || e.cat;
  const out = [];
  // [id, group by, keep, title, teaser, icon, facet prefix]
  const T = [
    ["dark", cat, (e) => sm(e) != null && sm(e) >= 21 * 60, (k) => "After dark: " + low(k), (k) => "Starts at 9 PM or later: " + low(k) + " for night owls.", Moon, "cat:"],
    ["cheap", cat, (e) => { const p = priceOf(e); return p != null && p > 0 && p <= 20; }, (k) => "Cheap thrills: " + low(k), (k) => "Paid, but $20 or less: " + low(k) + ".", Tag, "cat:"],
    ["free", cat, (e) => isFree(e), (k) => "Free: " + low(k), (k) => "No ticket needed, in " + low(k) + ".", Tag, "cat:"],
    ["midweek", cat, (e) => { const d = dowOf(e); return d >= 1 && d <= 4 && (sm(e) ?? 0) >= 17 * 60; }, (k) => "Midweek escape: " + low(k), (k) => "Monday to Thursday evenings, so the week isn't wasted: " + low(k) + ".", Coffee, "cat:"],
    ["wkend", cat, (e) => { const d = dowOf(e); return d === 0 || d === 6; }, (k) => "Weekend only: " + low(k), (k) => "Saturday and Sunday: " + low(k) + ".", Sun, "cat:"],
    ["early", cat, (e) => sm(e) != null && sm(e) < 12 * 60, (k) => "Early bird: " + low(k), (k) => "Before noon: " + low(k) + ", with the whole day left.", Sunrise, "cat:"],
    ["deep", (e) => e.sub, (e) => true, (k) => "Deep cut: " + low(k), (k) => "A niche you rarely see: " + low(k) + ", only a few this fortnight.", Compass, "sub:", (l) => l.length >= 3 && l.length <= 8],
    ["sub", (e) => e.sub, (e) => true, (k) => k, (k) => "Just " + low(k) + ", soonest first.", Compass, "sub:", (l) => l.length >= 9],
  ];
  for (const [id, by, keep, title, teaser, icon, facet, test] of T) {
    const m = new Map();
    ok.filter(keep).forEach((e) => { const k = by(e); if (k) { if (!m.has(k)) m.set(k, []); m.get(k).push(e); } });
    for (const [k, l] of m) { if (l.length < 3 || (test && !test(l))) continue; out.push({ key: "gen-" + id + "-" + k, title: title(k), teaser: teaser(k), n: l.length, icon, list: l, facet, fit: l.slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 5).reduce((s, e) => s + (e.sc || 0), 0) }); }
  }
  return out.sort((a, b) => b.fit - a.fit).map((t, i) => ({ ...t, color: MOOD_COLOR[(i + 3) % MOOD_COLOR.length] }));
}

// Colour follows the action verb a list is really about, so the same colour always means the same kind of outing
const VERBS = [
  [/free|cheap|under \$|no ticket/i, "#475569"],
  [/laugh|comedy|stand-?up|funny/i, "#D97706"],
  [/dance|club|\bdj\b|party|big night|nightcap|after dark|night owl/i, "#C026D3"],
  [/eat|food|feed|cocktail|drink|brunch|taste|cook|dinner|beer|wine|shake|market/i, "#EA580C"],
  [/meet|date|social|friends|mingle|together|group/i, "#DB2777"],
  [/music|concert|gig|live|jazz|listen|band/i, "#7C3AED"],
  [/film|movie|screen|watch|theat|stage|show/i, "#2563EB"],
  [/culture|museum|gallery|learn|talk|book|weird|art\b|deep cut|class|workshop/i, "#4F46E5"],
  [/move|run|ride|fresh air|outdoor|walk|park|wander|hike|sport|fitness|explor|bike|yoga/i, "#16A34A"],
  [/lazy|chill|sunday|cosy|cozy|warm|hideout|early|coffee|slow|rain/i, "#0D9488"],
];
export const verbColor = (t) => { const hit = (txt) => VERBS.find(([re]) => re.test(txt)); const h = hit((t.title || "") + " " + (t.key || "")) || hit(t.teaser || ""); return h ? h[1] : "#0891B2"; };

// New York right now, neighbourhood row: where the most good stuff is this week
const topCats = (l) => { const c = {}; l.forEach((e) => { const k = e.ncat || e.cat; if (k) c[k] = (c[k] || 0) + 1; }); const t = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k); return t.length ? "Mostly " + t.join(", ").toLowerCase() : "Busy this week"; };
export function hoodCards(visible, today, hid) {
  const m = new Map();
  const BORO = /^(manhattan|brooklyn|queens|the bronx|bronx|staten island|nyc|new york|new york city|citywide|various)$/i;
  visible.forEach((e) => { if (!e.hood || BORO.test(e.hood.trim()) || daysUntil(e, today) > 7 || hid.xcats.includes(e.cat) || hid.xsubs.includes(e.sub)) return; if (!m.has(e.hood)) m.set(e.hood, []); m.get(e.hood).push(e); });
  return [...m.entries()].filter(([, l]) => l.length >= 3)
    .map(([k, l]) => ({ id: "hood-" + k.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: k, icon: MapPin, title: "Around " + k, sub: topCats(l), list: l, fit: l.slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 5).reduce((x, e) => x + (e.sc || 0), 0) }))
    .sort((a, b) => b.fit - a.fit).slice(0, 3);
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
  // Variety: round-robin over three kinds (what suits this moment, your taste picks, fresh generated lists), each already best-first
  const rest = moods.filter((m) => m !== top);
  const genAll = facetTiles(visible, today, hid);
  const kinds = [rest, [...pk, ...fill], genAll];
  const order = top ? [top] : [];
  for (let i = 0; i < Math.max(...kinds.map((k) => k.length)); i++) for (const k of kinds) if (k[i]) order.push(k[i]);
  order.push(...bk);
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
  out.sort((a, b) => (fb[a.key] === -1) - (fb[b.key] === -1));
  out.forEach((t) => { if (!/^(quick|book)/.test(t.key)) t.color = verbColor(t); });
  order.forEach((t) => { if (t.key !== "book") t.color = verbColor(t); });
  const base = Math.min(6, out.length) - (Math.min(6, out.length) % 2);
  return { quick, lists: out.slice(0, base), all: out, every: order, base };
}
