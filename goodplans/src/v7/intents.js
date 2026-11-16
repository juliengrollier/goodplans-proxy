// "In the mood for…": intentions are overlapping lenses on the feed, not categories. An event's membership in an
// intention comes from its specific activity (strongest), its category or family, and how it feels (Claude's dimensions).
// Several intentions can be picked at once: events matching more than one rank higher. Your taste ranks within the lens.
import { Coffee, Laugh, Users, Palette, Lightbulb, Activity, PartyPopper, Utensils, Heart } from "lucide-react";
import { daysUntil } from "../lib/core.js";

export const INTENTS = [
  { id: "unwind", label: "Unwind", color: "#0D9488", icon: Coffee,
    acts: ["jazz", "blues", "classical", "choral", "organ", "sound-bath", "yoga", "meditation", "sauna", "tea", "wine", "book-club", "repertory", "museum", "botanic-garden", "birding", "poetry", "singer-songwriter", "folk", "outdoor-film", "stargazing"],
    cats: ["Yoga & Wellness", "Parks & Nature"], dims: { "energy=calm": 0.5, "noise=quiet": 0.4, "energy=wild": -0.5, "noise=loud": -0.3 } },
  { id: "fun", label: "Have fun", color: "#D97706", icon: Laugh,
    acts: ["standup", "improv", "sketch", "open-mic-comedy", "storytelling", "trivia", "bingo", "name-that-tune", "spelling-bee", "karaoke", "arcade", "pinball", "skee-ball", "bowling", "mini-golf", "ping-pong", "axe-throwing", "board-games", "escape-room", "murder-mystery", "drag", "magic", "circus"],
    cats: ["Comedy", "Trivia & Quizzes", "Arcades & VR", "Bar Games & Bowling", "Escape Rooms & Puzzles", "Karaoke"], dims: { "tone=fun": 0.5 } },
  { id: "connect", label: "Connect", color: "#DB2777", icon: Users,
    acts: ["language-exchange", "speed-dating", "run-club", "bar-sports-league", "potluck", "volunteering", "board-games", "dance-class", "salsa", "swing-dance", "contra", "cooking-class", "trivia", "book-club", "kickball", "volleyball", "gardening"],
    cats: ["Dance Socials"], dims: { "mode=mingle": 0.8, "social=group": 0.3, "mode=watch": -0.2 } },
  { id: "create", label: "Get creative", color: "#BE185D", icon: Palette,
    acts: ["pottery", "painting-class", "drawing", "printmaking", "zines", "textiles", "woodworking", "flowers", "photography", "cooking-class", "baking-class", "cocktail-class", "maker-fair", "dance-class"],
    cats: ["Arts & Crafts", "Cooking & Cocktails"], dims: { "mode=take-part": 0.5 } },
  { id: "curious", label: "Get curious", color: "#4F46E5", icon: Lightbulb,
    acts: ["talks", "science-talks", "tech-talks", "talks-society", "book-talks", "museum", "museum-late", "gallery", "art-opening", "photo-exhibit", "immersive-art", "art-fair", "design", "walking-tour", "history-tour", "architecture", "ghost-tour", "harbor-history", "food-tour", "documentary", "film-qa", "stargazing", "podcast-taping", "readings-theatre"],
    cats: ["Talks & Panels", "Museums & Galleries", "Tours", "Books & Readings"], dims: { "tone=thoughtful": 0.5, "novelty=weird": 0.2 } },
  { id: "active", label: "Get active", color: "#16A34A", icon: Activity,
    fams: ["move"], acts: ["salsa", "swing-dance", "dance-class", "hiking", "cycling-ride", "ice-skating", "roller-skating"], dims: { "body=active": 0.6, "body=seated": -0.4 } },
  { id: "out", label: "Go out-out", color: "#C026D3", icon: PartyPopper,
    fams: ["party"], acts: ["techno", "disco", "dj-party", "afrobeats", "queer-party", "silent-disco", "ballroom-vogue", "karaoke", "cocktails", "rooftop", "dive-bar", "beer-garden", "drag", "burlesque", "indie", "punk", "hiphop"],
    dims: { "energy=wild": 0.6, "crowd=big": 0.2, "energy=calm": -0.4 }, late: 0.3 },
  { id: "eat", label: "Eat & drink", color: "#EA580C", icon: Utensils,
    fams: ["eat"], acts: ["supper-club", "food-tour", "food-crawl", "cooking-class", "baking-class", "cocktail-class", "farmers-market"], dims: {} },
  { id: "date", label: "Date night", color: "#E11D48", icon: Heart,
    acts: ["wine", "cocktails", "jazz", "cabaret", "repertory", "opera", "ballet", "pottery", "painting-class", "supper-club", "stargazing", "rooftop", "comedy", "standup", "improv", "museum-late", "art-opening", "cooking-class", "tango", "salsa", "classical", "immersive-theatre"],
    dims: { "social=date": 0.8, "tone=romantic": 0.6, "crowd=intimate": 0.2, "social=group": -0.2 } },
];
export const INTENT = Object.fromEntries(INTENTS.map((i) => [i.id, i]));
const SETS = Object.fromEntries(INTENTS.map((i) => [i.id, { acts: new Set(i.acts || []), cats: new Set(i.cats || []), fams: new Set(i.fams || []) }]));

// 0 … 1.2: how much an event belongs to one intention
export function member(e, id) {
  const it = INTENT[id], S = SETS[id]; if (!it) return 0;
  let m = S.acts.has(e.act) ? 1 : S.cats.has(e.ncat) ? 0.7 : S.fams.has(e.fam) ? 0.65 : 0;
  for (const [k, w] of Object.entries(it.dims || {})) { const [d, v] = k.split("="); if (e.dims?.[d] === v) m += w * (m ? 0.4 : 0.7); }
  if (it.late && /PM/i.test(e.time || "") && parseInt(e.time, 10) >= 9 && parseInt(e.time, 10) !== 12) m += it.late;
  return Math.max(0, Math.min(1.2, m));
}
// Blend: best membership, plus a bonus for each further intention it also fits
export function blend(e, ids) {
  const ms = ids.map((id) => member(e, id)).sort((a, b) => b - a);
  return ms.length ? ms[0] + 0.15 * ms.slice(1).filter((x) => x >= 0.45).length : 0;
}
// Ranked events for a set of intentions over the next two weeks
export function intentEvents(events, ids, today) {
  if (!ids.length) return [];
  return events.map((e) => { const d = daysUntil(e, today); if (d < 0 || d > 14) return null; const b = blend(e, ids); if (b < 0.45) return null; return [e, (e.sc || 0) * (0.55 + 0.45 * Math.min(1, b)) * (1 + 0.1 * Math.max(0, b - 1)) * Math.pow(0.97, d)]; })
    .filter(Boolean).sort((a, b) => b[1] - a[1]).map(([e]) => e);
}
export const intentCount = (events, id, today) => events.filter((e) => { const d = daysUntil(e, today); return d >= 0 && d <= 14 && member(e, id) >= 0.45; }).length;
// The intention a list fits best (for labelling and colouring activity tiles in mood terms)
export function bestIntent(list, only) {
  let best = null, bv = 0;
  for (const it of only && only.length ? only.map((id) => INTENT[id]) : INTENTS) { const v = list.slice(0, 12).reduce((a, e) => a + Math.min(1, member(e, it.id)), 0) / Math.min(12, list.length || 1); if (v > bv) { bv = v; best = it; } }
  return best;
}
// "Unwind", "Unwind and have fun", "Unwind, have fun and connect"
export function joinMoods(ids) {
  const l = ids.map((id, i) => (i ? INTENT[id].label.toLowerCase() : INTENT[id].label));
  return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " and " + l[l.length - 1];
}
