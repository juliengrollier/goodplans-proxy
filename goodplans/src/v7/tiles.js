// Home "For you" tiles: quick time tiles on top, then mood and pick tiles (each a curated list with a teaser).
// The same tiles come back as "More ideas" at the bottom of Explore after opening one.
import { Moon, PartyPopper, Heart, Smile, Beer, Coffee, Sunrise, Sunset, TreePine, Compass, Landmark, Utensils, Activity, Umbrella, Flame, MapPin, Sun, Tag, Sparkles, BookOpen } from "lucide-react";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { PULSE_ICON } from "./pulseIcons.js";

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

export function buildTiles({ visible, today, filters, youR, youA, youTitle, picks = [], pool = [], book = [], dark }) {
  const hid = { xcats: filters.xcats || [], xsubs: filters.xsubs || [] };
  const quick = QUICK.map(([key, title, color, patch]) => ({ key, title, color, patch, n: applyFilters(visible, { ...EMPTY_FILTERS, ...patch, ...hid }, today).length })).filter((t) => t.n);
  const day = Math.floor(today.getTime() / 86400000);
  const mk = (a, i) => ({
    key: "mood-" + a.id, id: a.id, title: (youA && a.id === youA.id && youTitle) || a.titles?.[day % a.titles.length] || a.label,
    teaser: cap(a.offer), n: a.list.length, color: MOOD_COLOR[i % MOOD_COLOR.length], icon: PULSE_ICON[a.id] || MOOD_ICON[a.id] || Sparkles, list: a.list,
  });
  const moods = (youR?.all || []).filter((a) => a.list.length >= 2).map(mk);
  const top = youA ? moods.find((m) => m.id === youA.id) : null;
  const pk = picks.map((p) => ({ key: "pick-" + p.id, title: p.name, teaser: p.teaser, n: p.list.length, color: p.color, icon: p.icon || BookOpen, list: p.list }));
  const have = new Set(picks.map((p) => p.id));
  const fill = pool.filter((p) => !have.has(p.id)).map((p) => ({ key: "pick-" + p.id, title: p.name, teaser: p.teaser, n: p.list.length, color: p.color, icon: p.icon || BookOpen, list: p.list }));
  const bk = book.length ? [{ key: "book", title: "Book ahead", teaser: "Ticketed and selling out soon, so decide early.", n: book.length, color: "#C2410C", icon: Tag, list: book }] : [];
  // Lead with the top mood, then alternate your picks and the other moods, then the rest of the pool and Book ahead
  const rest = moods.filter((m) => m !== top);
  const order = top ? [top] : [];
  for (let i = 0; i < Math.max(pk.length, rest.length); i++) { if (pk[i]) order.push(pk[i]); if (rest[i]) order.push(rest[i]); }
  order.push(...fill, ...bk);
  const overlap = (a, b) => { const ids = new Set(a.list.slice(0, 10).map((e) => e.id)); return b.list.slice(0, 10).filter((e) => ids.has(e.id)).length / Math.min(10, Math.max(1, ids.size)); };
  // Drop near-copies; if that leaves fewer than 8, let the less similar ones back in
  const out = [];
  for (const limit of [0.6, 0.85, 1.01]) {
    for (const t of order) {
      if (out.includes(t) || t.list.length < 2) continue;
      if (out.some((o) => overlap(o, t) > limit)) continue;
      out.push(t);
      if (out.length >= 12) break;
    }
    if (out.length >= 8) break;
  }
  if (out.length > 2 && out.length % 2) out.pop(); // full rows of two
  return { quick, lists: out };
}
