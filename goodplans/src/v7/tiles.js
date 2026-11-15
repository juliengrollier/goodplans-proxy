// Home "For you" tiles: quick time tiles on top, then mood and pick tiles (each a curated list with a teaser).
// The same tiles come back as "More ideas" at the bottom of Explore after opening one.
import { Moon, PartyPopper, Heart, Smile, Beer, Coffee, Sunrise, Sunset, TreePine, Compass, Landmark, Utensils, Activity, Umbrella, Flame, MapPin, Sun, Tag, Sparkles, BookOpen } from "lucide-react";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { PULSE_ICON } from "./pulseIcons.js";
import { daysUntil, isImprecise } from "../lib/core.js";
import { isFree, startMinutes } from "./engine.js";
import { conceptTiles } from "./moods2.js";

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

// Colour follows the action verb a list is really about, so the same colour always means the same kind of outing
const VERB = { play: ["Play", "#CA8A04"], eat: ["Eat", "#EA580C"], dance: ["Dance", "#C026D3"], laugh: ["Laugh", "#D97706"], meet: ["Meet", "#DB2777"], listen: ["Listen", "#7C3AED"], watch: ["Watch", "#2563EB"], learn: ["Learn", "#4F46E5"], move: ["Move", "#16A34A"], chill: ["Chill", "#0D9488"], save: ["Save", "#475569"], make: ["Make", "#BE185D"], go: ["Explore", "#0891B2"] };
const BY_ID = {
  food: "eat", "feed-me": "eat", "shake-week": "eat",
  bignight: "dance", "big-night": "dance", nightcap: "dance", lateloud: "dance", underground: "dance",
  laugh: "laugh", meet: "meet", date: "meet", "date-night": "meet", handson: "make", smallrooms: "listen",
  weird: "learn", think: "learn", culture: "learn", classic: "learn", explorer: "go", saved: "go",
  move: "move", freeout: "move", "fresh-air": "move", wander: "move",
  talk: "chill", "lazy-sunday": "chill", "sunday-scaries": "chill", hideout: "chill", "warm-up": "chill", early: "chill", "after-work": "chill", quick: "go",
  cheap: "save", "free-ride": "save",
};
const BY_TEMPLATE = { dark: "dance", cheap: "save", free: "save", midweek: "chill", wkend: "go", early: "chill", deep: "learn", sub: "go" };
const BY_WORD = [
  [/comedy|stand-?up|improv|laugh/i, "laugh"], [/music|concert|jazz|band|gig|\blive\b|opera|classical|listen/i, "listen"], [/film|movie|cinema|screen|theat|stage|watch/i, "watch"],
  [/dance|club|\bdj\b|party|nightlife/i, "dance"], [/food|eat|drink|cocktail|wine|beer|brunch|tasting|cook|market/i, "eat"], [/run|ride|yoga|sport|fitness|hike|walk|bike|outdoor|park/i, "move"],
  [/museum|gallery|art\b|talk|book|class|workshop|lecture|learn|history/i, "learn"], [/meet|social|mixer|friends|date/i, "meet"],
];
export function verbOf(t) {
  if (t.vk && VERB[t.vk]) return VERB[t.vk];
  const m = /^(mood|pick|gen)-(.+)$/.exec(t.key || ""); const kind = m && m[1], id = m ? m[2] : (t.key || "");
  let v = null;
  if (kind === "gen") { const tm = /^(\w+?)-/.exec(id); const w = BY_WORD.find(([re]) => re.test(t.title)); v = (w && w[1]) || BY_TEMPLATE[tm && tm[1]]; }
  else v = BY_ID[id];
  if (!v) { const w = BY_WORD.find(([re]) => re.test((t.title || "") + " " + (t.teaser || ""))); v = w ? w[1] : "go"; }
  return VERB[v] || VERB.go;
}

// Generic New York cards, used to fill a row up to three
export function genericCards(visible, today) {
  const wk = visible.filter((e) => daysUntil(e, today) <= 7);
  const mk = (id, title, sub, icon, list) => ({ id, title, sub, icon, list });
  return [
    mk("gen-free", "Free this week", "No ticket needed", Tag, wk.filter((e) => isFree(e))),
    mk("gen-late", "Open late", "Starts 9 PM or later", Moon, wk.filter((e) => (startMinutes(e) ?? 0) >= 21 * 60)),
    mk("gen-wknd", "This weekend", "Saturday and Sunday", Sun, wk.filter((e) => { const d = new Date(e.E + "T12:00:00").getDay(); return d === 0 || d === 6; })),
    mk("gen-early", "Before noon", "Start the day out", Sunrise, wk.filter((e) => (startMinutes(e) ?? 1e4) < 12 * 60)),
  ].filter((c) => c.list.length >= 2);
}

// New York right now, neighbourhood row: well-known neighbourhoods (name, lat, lon, radius km, aliases), matched by coordinates or by name
const NEIGH = [
  ["Midtown", 40.7549, -73.984, 0.95, /\bmidtown\b|times square|theat(er|re) district|rockefeller|bryant park/i], ["Hell's Kitchen", 40.7638, -73.9918, 0.7, /hell'?s kitchen/i],
  ["Chelsea", 40.7465, -74.0014, 0.8, /\bchelsea\b|meatpacking|high line/i], ["Flatiron & Gramercy", 40.7411, -73.9897, 0.7, /flatiron|gramercy|union square/i],
  ["Murray Hill", 40.744, -73.977, 0.7, /murray hill|kips bay/i], ["West Village", 40.7358, -74.0036, 0.65, /west village|greenwich village|washington square/i],
  ["East Village", 40.7265, -73.9815, 0.7, /east village|alphabet city/i], ["Lower East Side", 40.715, -73.9843, 0.7, /lower east side|\bles\b/i],
  ["SoHo & Nolita", 40.7233, -74.003, 0.55, /\bsoho\b|nolita|little italy/i], ["Chinatown", 40.7158, -73.997, 0.5, /chinatown/i], ["Tribeca", 40.7163, -74.0086, 0.55, /tribeca/i],
  ["Financial District", 40.7075, -74.0113, 0.75, /financial district|\bfidi\b|battery park|seaport/i], ["Upper West Side", 40.787, -73.9754, 1.2, /upper west side|lincoln center|\buws\b/i],
  ["Upper East Side", 40.7736, -73.9566, 1.2, /upper east side|\bues\b|museum mile/i], ["Harlem", 40.8116, -73.9465, 1.2, /\bharlem\b/i], ["Washington Heights", 40.8417, -73.9393, 1.2, /washington heights|inwood/i],
  ["Williamsburg", 40.7081, -73.9571, 1.0, /williamsburg/i], ["Greenpoint", 40.7304, -73.9515, 0.85, /greenpoint/i], ["Bushwick", 40.6944, -73.9213, 1.2, /bushwick/i],
  ["Bed-Stuy", 40.6872, -73.9418, 1.1, /bed-?stuy|bedford-stuyvesant/i], ["DUMBO", 40.7033, -73.9881, 0.5, /\bdumbo\b/i], ["Downtown Brooklyn", 40.6928, -73.9903, 0.8, /downtown brooklyn|brooklyn heights|boerum hill/i],
  ["Fort Greene", 40.6892, -73.9742, 0.8, /fort greene|clinton hill/i], ["Park Slope", 40.671, -73.9777, 1.0, /park slope|windsor terrace/i], ["Prospect Heights", 40.6775, -73.9692, 0.7, /prospect heights|crown heights/i],
  ["Gowanus & Carroll Gardens", 40.6795, -73.9991, 0.9, /gowanus|carroll gardens|cobble hill|red hook/i], ["Coney Island", 40.5755, -73.9707, 1.2, /coney island|brighton beach/i],
  ["Astoria", 40.7644, -73.9235, 1.2, /\bastoria\b/i], ["Long Island City", 40.7447, -73.9485, 0.9, /long island city|\blic\b/i], ["Flushing", 40.759, -73.83, 1.4, /flushing/i],
  ["Jackson Heights", 40.7557, -73.8831, 1.0, /jackson heights/i], ["Ridgewood", 40.7043, -73.9018, 1.0, /ridgewood/i], ["Mott Haven", 40.8089, -73.9229, 1.2, /mott haven|south bronx/i],
  ["Sunset Park", 40.645, -74.01, 1.1, /sunset park/i], ["Morningside Heights", 40.81, -73.9626, 0.7, /morningside heights|columbia university/i], ["East Harlem", 40.7957, -73.9389, 0.9, /east harlem|spanish harlem/i],
];
const kmBetween = (a, b) => { const dy = (a[0] - b[0]) * 111, dx = (a[1] - b[1]) * 84.1; return Math.sqrt(dx * dx + dy * dy); };
// Coordinates decide when the event has a precise address; otherwise the source's own area label, matched by whole name only
export const neighbourhoodOf = (e) => {
  if (e.coord && !isImprecise(e)) {
    let best = null, bd = 9;
    for (const n of NEIGH) { const d = kmBetween(e.coord, [n[1], n[2]]) / n[3]; if (d < bd) { bd = d; best = n[0]; } }
    return bd <= 1 ? best : null;
  }
  const hit = e.hood ? NEIGH.find((n) => n[4].test(e.hood)) : null;
  return hit ? hit[0] : null;
};
const topCats = (l) => { const c = {}; l.forEach((e) => { const k = e.ncat || e.cat; if (k) c[k] = (c[k] || 0) + 1; }); const t = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k); return t.length ? "Mostly " + t.join(", ").toLowerCase() : "Busy this week"; };
export function hoodCards(visible, today, hid, hoodWeight = () => 0, seed = 0, home = [40.7186, -73.9865]) {
  const mine = neighbourhoodOf({ coord: home });
  const m = new Map();
  visible.forEach((e) => { if (daysUntil(e, today) > 7 || hid.xcats.includes(e.cat) || hid.xsubs.includes(e.sub)) return; const k = neighbourhoodOf(e); if (!k || k === mine) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
  return [...m.entries()].filter(([, l]) => l.length >= 3)
    .map(([k, l]) => { const top = l.slice().sort((x, y) => (y.lp || 0) - (x.lp || 0)).slice(0, 5); const taste = top.reduce((x, e) => x + (e.lp || 0), 0) / top.length + 12 * hoodWeight(l[0]); const jitter = ((seed + k.length * 7) % 5) * 0.4; return { id: "hood-" + k.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: k, icon: MapPin, title: k, sub: topCats(l), list: l, fit: taste + jitter }; })
    .sort((a, b) => b.fit - a.fit).slice(0, 6);
}

export function buildTiles({ clicks = {}, favs = [], space = null, taste = null, tasteB = null, wOf, visible, today, filters, youR, youA, youTitle, picks = [], pool = [], book = [], meet, fb = {}, dark }) {
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
  const genAll = conceptTiles({ visible, today, hid, clicks, fb, favs, hoodOf: neighbourhoodOf, space, taste, tasteB, wOf }).map((t, i) => ({ ...t, color: MOOD_COLOR[(i + 3) % MOOD_COLOR.length] }));
  // Pattern per block of six: four generated moods, one archetype mood, one taste pick, so the specific things (pickleball, improv, pottery) lead
  const queues = { g: genAll.slice(), m: rest.slice(), p: [...pk, ...fill] };
  const order = top ? [top] : [];
  while (queues.g.length || queues.m.length || queues.p.length) for (const k of ["g", "g", "m", "g", "g", "p"]) { const q = queues[k].length ? queues[k] : queues.g.length ? queues.g : queues.m.length ? queues.m : queues.p; if (q.length) order.push(q.shift()); }
  order.push(...bk);
  if (meet) { const i = order.findIndex((t) => t.key === "pick-meet"); if (i > 0) order.unshift(...order.splice(i, 1)); }
  const overlap = (a, b) => { const ids = new Set(a.list.slice(0, 10).map((e) => e.id)); return b.list.slice(0, 10).filter((e) => ids.has(e.id)).length / Math.min(10, Math.max(1, ids.size)); };
  // Near-copies last: strict first, then the looser ones, so "More moods" keeps giving fresh lists. Thumbs-down ones go to the end.
  const out = [];
  for (const limit of [0.6, 0.85, 1.01]) {
    for (const t of order) {
      if (out.includes(t) || t.list.length < (/^gen-/.test(t.key) ? 1 : 2)) continue;
      if (out.some((o) => overlap(o, t) > limit)) continue;
      out.push(t);
    }
  }
  out.sort((a, b) => (fb[a.key] === -1) - (fb[b.key] === -1));
  const tag = (t) => { if (t.key === "book") return; const [verb, color] = verbOf(t); t.verb = verb; t.color = color; };
  out.forEach(tag); order.forEach(tag);
  const base = Math.min(6, out.length) - (Math.min(6, out.length) % 2);
  return { quick, lists: out.slice(0, base), all: out, every: order, base };
}
