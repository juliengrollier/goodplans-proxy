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

export function buildTiles({ visible, today, filters, youR, youA, youTitle, picks = [], book = [], dark }) {
  const hid = { xcats: filters.xcats || [], xsubs: filters.xsubs || [] };
  const quick = QUICK.map(([key, title, color, patch]) => ({ key, title, color, patch, n: applyFilters(visible, { ...EMPTY_FILTERS, ...patch, ...hid }, today).length })).filter((t) => t.n);
  const day = Math.floor(today.getTime() / 86400000);
  const moods = (youR?.all || []).filter((a) => a.list.length >= 3).map((a, i) => ({
    key: "mood-" + a.id, id: a.id, title: (youA && a.id === youA.id && youTitle) || a.titles?.[day % a.titles.length] || a.label,
    teaser: cap(a.offer), n: a.list.length, color: MOOD_COLOR[i % MOOD_COLOR.length], icon: PULSE_ICON[a.id] || MOOD_ICON[a.id] || Sparkles, list: a.list,
  }));
  const top = youA ? moods.find((m) => m.id === youA.id) : null;
  if (top) { top.big = true; top.color = dark ? "#2A2F5C" : "#1B1F3B"; }
  const pk = picks.map((p) => ({ key: "pick-" + p.id, title: p.name, teaser: p.teaser, n: p.list.length, color: p.color, icon: p.icon || BookOpen, list: p.list }));
  const bk = book.length ? [{ key: "book", title: "Book ahead", teaser: "Ticketed and selling out soon, so decide early.", n: book.length, color: "#C2410C", icon: Tag, list: book }] : [];
  // Lead with the top mood, then alternate your picks and the other moods; drop near-copies
  const rest = moods.filter((m) => m !== top);
  const order = top ? [top] : [];
  for (let i = 0; i < Math.max(pk.length, rest.length); i++) { if (pk[i]) order.push(pk[i]); if (rest[i]) order.push(rest[i]); }
  order.push(...bk);
  const out = [];
  for (const t of order) {
    const ids = new Set(t.list.slice(0, 10).map((e) => e.id));
    if (out.some((o) => o.list.slice(0, 10).filter((e) => ids.has(e.id)).length / Math.min(10, Math.max(1, ids.size)) > 0.6)) continue;
    out.push(t);
    if (out.length >= 12) break;
  }
  return { quick, lists: out };
}
