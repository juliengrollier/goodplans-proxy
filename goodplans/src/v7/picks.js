// Picks: personal lists built from your strongest taste combinations.
// Each recipe names the features it stands for (to score how much it suits you) and which events belong in it.
import { weightOf, catFeature, dimFeature } from "./learn.js";
import { isFree, todOf } from "./engine.js";
import { Mic, Users, Sparkles, MessageCircle, Volume2, TreePine, Heart, Activity, Hand, Utensils, Lightbulb, Smile, Layers, Landmark, Zap, PartyPopper, Tag, Bookmark } from "lucide-react";

// What drives each list, in a line (shown under the title on Home)
const ABOUT = {
  smallrooms: [Mic, "Intimate rooms for live music and shows, the kind you lean in for."],
  weird: [Sparkles, "Odd, offbeat and only-in-NYC, ranked by how far from usual."],
  talk: [MessageCircle, "Low-volume places where you can actually hear each other."],
  lateloud: [Volume2, "Loud, energetic and after dark, for a night that runs long."],
  freeout: [TreePine, "Free and outdoors: costs nothing but time."],
  date: [Heart, "Evening plans with a romantic, two-person feel."],
  move: [Activity, "Active things: you'll break a sweat, or at least a stride."],
  handson: [Hand, "You make something or take part instead of watching."],
  food: [Utensils, "Where the food is the main event."],
  think: [Lightbulb, "Talks, shows and ideas that leave you thinking."],
  laugh: [Smile, "Comedy, and anything built to get a laugh."],
  underground: [Layers, "Scene-driven, DIY and under the radar."],
  classic: [Landmark, "Polished New York classics that never get old."],
  quick: [Zap, "Short, within 15 minutes, easy to fit in."],
  bignight: [PartyPopper, "Big crowds, high energy."],
  cheap: [Tag, "Free or under $20, with real energy."],
  meet: [Users, "Social by design: classes, clubs, trivia and mixers where talking to new people is the point."],
  saved: [Bookmark, "Events at places you saved in Google Maps."],
};

const d = (ev, k, ...v) => v.includes(ev.dims?.[k]);
const late = (ev) => todOf(ev) === "late" || todOf(ev) === "evening";
const MEET = /meetup|mixer|mingle|singles|run club|running club|social club|trivia|pub quiz|language exchange|supper club|volunteer|game night|board game|karaoke|open mic|workshop|class\b|walking tour|speed|networking|book club|group ride|community|potluck/i;
export const RECIPES = [
  { id: "smallrooms", name: "Small rooms, big talent", color: "#7B4BD6", f: [dimFeature("crowd", "intimate"), "fam:listen", "fam:watch"], is: (e) => d(e, "crowd", "intimate") && (e.fam === "listen" || e.fam === "watch") },
  { id: "weird", name: "Weird and wonderful", color: "#C026D3", f: [dimFeature("novelty", "weird")], is: (e) => d(e, "novelty", "weird") },
  { id: "talk", name: "Quiet enough to talk", color: "#0D9488", f: [dimFeature("noise", "quiet"), dimFeature("social", "date")], is: (e) => d(e, "noise", "quiet") && !d(e, "audience", "kids") },
  { id: "lateloud", name: "Late and loud", color: "#4338CA", f: [dimFeature("noise", "loud"), dimFeature("energy", "wild"), "tod:late"], is: (e) => d(e, "noise", "loud") && late(e) },
  { id: "freeout", name: "Free and outside", color: "#1E9E5A", f: ["price:free", dimFeature("setting", "outdoor")], is: (e) => isFree(e) && d(e, "setting", "outdoor", "mixed") },
  { id: "date", name: "Date night", color: "#E53935", f: [dimFeature("social", "date"), dimFeature("tone", "romantic")], is: (e) => (d(e, "social", "date") || d(e, "tone", "romantic")) && late(e) },
  { id: "move", name: "Get moving", color: "#16A34A", f: [dimFeature("body", "active"), "fam:move"], is: (e) => d(e, "body", "active") },
  { id: "handson", name: "Hands-on", color: "#DB2777", f: [dimFeature("mode", "take-part"), "fam:make"], is: (e) => d(e, "mode", "take-part") && e.fam !== "move" },
  { id: "food", name: "Food first", color: "#F2611D", f: [dimFeature("food", "food"), "fam:eat"], is: (e) => d(e, "food", "food") },
  { id: "think", name: "Food for thought", color: "#2563EB", f: [dimFeature("tone", "thoughtful"), "fam:learn"], is: (e) => d(e, "tone", "thoughtful") },
  { id: "laugh", name: "Laugh it off", color: "#EA580C", f: [catFeature("Comedy"), dimFeature("tone", "fun")], is: (e) => e.ncat === "Comedy" || (d(e, "tone", "fun") && e.fam === "watch") },
  { id: "underground", name: "Underground NYC", color: "#1B1F3B", f: [dimFeature("scene", "underground")], is: (e) => d(e, "scene", "underground") },
  { id: "classic", name: "Classic New York", color: "#B45309", f: [dimFeature("novelty", "classic"), dimFeature("polish", "polished")], is: (e) => d(e, "novelty", "classic") && d(e, "polish", "polished", "upscale") },
  { id: "quick", name: "Quick and close", color: "#0891B2", f: [dimFeature("length", "quick"), "dist:near"], is: (e) => d(e, "length", "quick") && (e.tt?.mins ?? 99) <= 15 },
  { id: "bignight", name: "Big nights out", color: "#6D28D9", f: [dimFeature("crowd", "big"), dimFeature("energy", "wild")], is: (e) => d(e, "crowd", "big") && d(e, "energy", "wild", "lively") },
  { id: "cheap", name: "Cheap thrills", color: "#15803D", f: ["price:free", "price:cheap", dimFeature("energy", "lively")], is: (e) => (isFree(e) || (/\$\s?(\d+)/.exec(e.price || "") || [])[1] < 20) && d(e, "energy", "lively", "wild") },
  { id: "meet", name: "Meet new people", color: "#DB2777", f: [dimFeature("mode", "mingle"), dimFeature("social", "group")], is: (e) => d(e, "mode", "mingle") || MEET.test([e.title, e.desc, e.sub, ...(e.kw || [])].join(" ")) },
  { id: "saved", name: "Your saved places", color: "#0F766E", f: [], is: (e) => !!e.savedPlace, always: true },
];

// The 4–6 picks that suit you best, each with at least 3 upcoming events and not a near-copy of another
export function buildPicks(m, events, max = 5, meet = false) {
  const scored = RECIPES.map((r) => {
    const list = events.filter(r.is).sort((a, b) => (b.rk ?? b.sc) - (a.rk ?? a.sc));
    const fit = r.always ? 2 : r.id === "meet" && meet ? 3 : r.f.reduce((a, f) => a + weightOf(m, f), 0);
    return { ...r, list, fit, icon: ABOUT[r.id]?.[0], teaser: ABOUT[r.id]?.[1] };
  }).filter((r) => r.list.length >= 3 && (r.always || r.fit > 0.05)).sort((a, b) => b.fit - a.fit);
  const out = [];
  for (const r of scored) {
    const ids = new Set(r.list.slice(0, 10).map((e) => e.id));
    if (out.some((o) => { const oi = o.list.slice(0, 10).filter((e) => ids.has(e.id)).length; return oi / Math.min(10, ids.size) > 0.6; })) continue;
    out.push(r); if (out.length === max) break;
  }
  return out;
}

// Every recipe with enough events, most events first: fills the Home grid when your taste has not singled out eight yet
export function poolPicks(events, min = 2) {
  return RECIPES.map((r) => ({ ...r, list: events.filter(r.is).sort((a, b) => (b.rk ?? b.sc) - (a.rk ?? a.sc)), icon: ABOUT[r.id]?.[0], teaser: ABOUT[r.id]?.[1] }))
    .filter((r) => r.list.length >= min && !r.always).sort((a, b) => b.list.length - a.list.length);
}
