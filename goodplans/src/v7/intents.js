// "I'm in the mood to…": ten moods. Every category has one home mood (label, colour); some activities also count for a
// second mood, each with a reason noted below. Membership: home category (strongest), a listed activity, how it feels.
// The "who with" switch (Anyone · Date · Meet people) reranks whatever is shown; it is not a mood.
import { Music, Drama, Laugh, Dices, Lightbulb, Compass, Palette, Activity, PartyPopper, Utensils, Heart, Users } from "lucide-react";
import { daysUntil } from "../lib/core.js";

// Ten moods. Each category has exactly one home mood (its label and colour); "acts" lists activities that also belong
// to a second mood, each for a stated reason. lateActs count only when they start at 9 PM or later.
export const INTENTS = [
  { id: "music", label: "Live music", short: "Music", color: "#7C3AED", icon: Music, cats: ["Concerts"], acts: [], dims: {} },
  { id: "show", label: "Showtime", short: "Showtime", color: "#DC2626", icon: Drama, cats: ["Theater", "Dance & Opera", "Film", "Live Sports"], acts: [], dims: {} },
  // Drag, magic and circus are variety entertainment as much as theatre
  { id: "laugh", label: "A laugh", short: "A laugh", color: "#F97316", icon: Laugh, cats: ["Comedy"], acts: ["drag", "magic", "circus"], dims: {} },
  // Improv jams and comedy open mics: you can get up yourself
  { id: "play", label: "Play", short: "Play", color: "#EAB308", icon: Dices, cats: ["Trivia & Quizzes", "Board & Card Games", "Arcades & VR", "Bar Games & Bowling", "Escape Rooms & Puzzles", "Karaoke"], acts: ["open-mic-comedy"], dims: {} },
  // Gardens, birding, stargazing: learning as much as being outdoors
  { id: "curious", label: "Get curious", short: "Curious", color: "#4F46E5", icon: Lightbulb, cats: ["Talks & Panels", "Books & Readings", "Tours", "Museums & Galleries"], acts: ["botanic-garden", "birding", "stargazing", "documentary", "film-qa", "readings-theatre"], dims: { "tone=thoughtful": 0.3 } },
  // Walking, history, architecture and harbour tours: discovering the city on foot
  { id: "explore", label: "Explore", short: "Explore", color: "#0891B2", icon: Compass, cats: ["Parks & Nature", "Markets", "Festivals & Parades"], acts: ["walking-tour", "history-tour", "architecture", "harbor-history", "ghost-tour", "food-tour"], dims: {} },
  // Galleries and art openings: the art scene and inspiration; zines and maker fairs: making things
  { id: "create", label: "Get creative", short: "Creative", color: "#EC4899", icon: Palette, cats: ["Arts & Crafts", "Cooking & Cocktails"], acts: ["gallery", "art-opening", "art-fair", "immersive-art", "zines", "maker-fair"], dims: { "mode=take-part": 0.3 } },
  // Dance classes and socials: you're moving all evening
  { id: "active", label: "Get active", short: "Active", color: "#16A34A", icon: Activity, cats: ["Running", "Cycling", "Pickup Sports", "Climbing & Skating", "Hiking & Walks", "Water Sports", "Yoga & Wellness"], acts: ["dance-class", "salsa", "swing-dance", "tango", "contra", "bar-sports-league"], dims: { "body=active": 0.6, "body=seated": -0.4 } },
  // Loud, late and social; a late gig is a night out
  { id: "party", label: "Party", short: "Party", color: "#C026D3", icon: PartyPopper, cats: ["Clubs & DJs", "Dance Socials"], acts: ["karaoke", "drag", "burlesque", "silent-disco", "queer-party"], lateActs: ["indie", "punk", "hiphop", "electronic", "latin-music"], dims: { "energy=wild": 0.4, "energy=calm": -0.4 }, late: 0.2 },
  // Food is the point; you eat what you make in a class
  { id: "eat", label: "Eat & drink", short: "Eat & drink", color: "#B45309", icon: Utensils, cats: ["Tastings", "Food Markets & Pop-ups", "Bars & Happy Hours"], acts: ["food-tour", "farmers-market", "holiday-market", "cooking-class", "baking-class", "cocktail-class"], dims: {} },
];

// Who with: a switch, not a mood. It reranks whatever is shown toward the company you're in (Kids also filters out
// anything adults-only).
export const SOCIAL = [
  { id: "meet", label: "Meet people",
    acts: ["language-exchange", "speed-dating", "run-club", "bar-sports-league", "kickball", "volleyball", "frisbee", "potluck", "volunteering", "gardening", "board-games", "dnd", "mahjong", "chess", "trivia", "dance-class", "salsa", "swing-dance", "contra", "tango", "cooking-class", "book-club", "open-mic-music", "jam-session", "open-mic-comedy", "cycling-ride", "workshop-career", "karaoke"],
    dims: { "mode=mingle": 0.8, "social=group": 0.3, "mode=take-part": 0.2, "mode=watch": -0.3 } },
  { id: "date", label: "Date",
    acts: ["wine", "cocktails", "rooftop", "jazz", "classical", "cabaret", "repertory", "foreign-film", "opera", "ballet", "dance-performance", "immersive-theatre", "pottery", "painting-class", "cooking-class", "cocktail-class", "supper-club", "museum-late", "art-opening", "stargazing", "tango", "salsa", "chocolate", "cheese", "standup", "improv", "singer-songwriter", "botanic-garden"],
    dims: { "social=date": 0.8, "tone=romantic": 0.6, "crowd=intimate": 0.3, "noise=quiet": 0.2, "crowd=big": -0.3, "audience=kids": -0.8 } },
  { id: "friends", label: "Friends",
    acts: ["trivia", "bowling", "karaoke", "board-games", "escape-room", "mini-golf", "pinball", "arcade", "skee-ball", "ping-pong", "bocce", "darts", "pool", "shuffleboard", "axe-throwing", "beer-garden", "dive-bar", "happy-hour", "brewery", "food-crawl", "watch-party", "standup", "improv", "dj-party", "puzzle-hunt", "murder-mystery"],
    dims: { "social=group": 0.8, "energy=lively": 0.3, "mode=take-part": 0.2, "social=date": -0.3, "audience=kids": -0.5 } },
  { id: "kids", label: "Kids", strict: true,
    acts: ["puppets", "circus", "magic", "animation", "parade", "tree-lighting", "ice-skating", "roller-skating", "botanic-garden", "museum", "mini-golf", "skee-ball", "arcade", "bowling", "street-fair", "cultural-festival", "fireworks", "holiday-market", "farmers-market", "birding", "stargazing", "outdoor-film", "gardening", "baking-class", "pottery", "hiking", "kayaking"],
    dims: { "audience=kids": 1, "audience=all-ages": 0.45, "audience=adults": -0.6, "audience=21+": -2, "energy=wild": -0.3, "noise=loud": -0.2 } },
];
const ADULT_ONLY = new Set(["Clubs & DJs", "Bars & Happy Hours", "Tastings"]);
export const SOCIAL_BY = Object.fromEntries(SOCIAL.map((m) => [m.id, m]));
const SOC_SETS = Object.fromEntries(SOCIAL.map((m) => [m.id, new Set(m.acts)]));
// 0 … 1: how well an event fits a date / meeting people
export function socialFit(e, id) {
  const m = SOCIAL_BY[id]; if (!m) return 1;
  if (id === "kids" && (e.dims?.audience === "21+" || ADULT_ONLY.has(e.ncat) || /21\+|18\+|adults only/i.test([e.title, e.desc, ...(e.tags || [])].join(" ")))) return 0;
  let f = SOC_SETS[id].has(e.act) ? 0.8 : 0;
  for (const [k, w] of Object.entries(m.dims)) { const [d, v] = k.split("="); if (e.dims?.[d] === v) f += w * 0.6; }
  return Math.max(0, Math.min(1, f));
}
// Rerank a list for the switch; drop clear misfits when enough good fits remain
export function applySocial(list, id) {
  if (!id || !SOCIAL_BY[id]) return list;
  const fit = new Map(list.map((e) => [e.id, socialFit(e, id)]));
  const good = list.filter((e) => fit.get(e.id) >= 0.3);
  const base = SOCIAL_BY[id].strict || good.length >= 4 ? good : list;
  return base.map((e, i) => [e, i - 40 * fit.get(e.id)]).sort((a, b) => a[1] - b[1]).map(([e]) => e);
}
export const INTENT = Object.fromEntries(INTENTS.map((i) => [i.id, i]));
const SETS = Object.fromEntries(INTENTS.map((i) => [i.id, { acts: new Set(i.acts || []), late: new Set(i.lateActs || []), cats: new Set(i.cats || []), fams: new Set(i.fams || []) }]));
const isLate = (e) => /PM/i.test(e.time || "") && parseInt(e.time, 10) >= 9 && parseInt(e.time, 10) !== 12;

// 0 … 1.2: how much an event belongs to one intention
export function member(e, id) {
  const it = INTENT[id], S = SETS[id]; if (!it) return 0;
  let m = S.cats.has(e.ncat) ? 1 : S.acts.has(e.act) || (S.late.has(e.act) && isLate(e)) ? 0.9 : S.fams.has(e.fam) ? 0.65 : 0;
  for (const [k, w] of Object.entries(it.dims || {})) { const [d, v] = k.split("="); if (e.dims?.[d] === v) m += w * (m ? 0.4 : 0.7); }
  if (it.late && m && isLate(e)) m += it.late;
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
  return events.map((e) => { const d = daysUntil(e, today); if (d < 0) return null; const b = blend(e, ids); if (b < 0.45) return null; return [e, (e.sc || 0) * (0.55 + 0.45 * Math.min(1, b)) * (1 + 0.1 * Math.max(0, b - 1)) * Math.pow(0.97, d)]; })
    .filter(Boolean).sort((a, b) => b[1] - a[1]).map(([e]) => e);
}
export const intentCount = (events, id, today) => events.filter((e) => { const d = daysUntil(e, today); return d >= 0 && member(e, id) >= 0.45; }).length;
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

// One fixed mood per event: the home mood of its category (else an activity's second mood, else family), so labels don't drift day to day
export function primaryIntent(e0) {
  const e = e0 || {};
  for (const it of INTENTS) if (SETS[it.id].cats.has(e.ncat)) return it;
  for (const it of INTENTS) if (SETS[it.id].acts.has(e.act)) return it;
  for (const it of INTENTS) if (SETS[it.id].fams.has(e.fam)) return it;
  return null;
}
// How much a list fits each mood (for "You may also like": lists with a similar mood profile)
export const moodProfile = (list) => INTENTS.map((it) => list.slice(0, 12).reduce((a, e) => a + Math.min(1, member(e, it.id)), 0) / Math.min(12, list.length || 1));
