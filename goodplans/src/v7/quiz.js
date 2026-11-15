// Onboarding v3: three screens instead of nine.
// 1. Activities: 24 concrete things spread across the whole taste map, each marked Love or Meh (neutral by default).
//    One tap teaches an activity, its category and its family at once, and "not for me" teaches what to keep away.
// 2. Closer in: neighbours of what you loved, pulled from the taste map (embed.js), to sharpen within your interests.
// 3. Three one-tap questions: when, who with, budget. Rooms and distance are learned from behaviour instead.
// Answers seed the taste model at "first guess" strength; real behaviour overrides them within days.
import { ACT } from "./activities.js";

export const QUIZ_VERSION = 4;
// Chosen to cover the map: every family, quiet and loud, seated and active, cheap and dressy
export const START = ["standup", "improv", "jazz", "indie", "classical", "techno", "salsa", "karaoke", "trivia", "board-games", "bowling", "pickleball",
  "run-club", "climbing", "yoga", "pottery", "cooking-class", "wine", "beer-garden", "market-food", "museum", "walking-tour", "repertory", "book-talks"];

export const PROFILE = [
  { id: "tod", q: "When do you usually go out?", opts: [
    { l: "Daytime", f: { "tod:morning": 0.4, "tod:afternoon": 0.6, "tod:late": -0.3 } },
    { l: "Evenings", f: { "tod:evening": 0.7 } },
    { l: "Late nights", f: { "tod:late": 0.7, "tod:evening": 0.3, "dim:audience=21+": 0.2 } },
  ] },
  { id: "who", q: "Usually with…", opts: [
    { l: "Myself", f: { "dim:social=solo-friendly": 0.7 } }, { l: "A date", f: { "dim:social=date": 0.7, "dim:tone=romantic": 0.2 } },
    { l: "Friends", f: { "dim:social=group": 0.7 } }, { l: "New people", f: { "dim:mode=mingle": 0.9, "dim:social=solo-friendly": 0.2 }, meet: true },
  ] },
  { id: "spend", q: "What do you like to spend on a ticket?", opts: [
    { l: "Free if I can", f: { "price:free": 0.7, "price:high": -0.5 }, price: 2 },
    { l: "Under $20", f: { "price:cheap": 0.5, "price:free": 0.3, "price:high": -0.3 }, price: 1 },
    { l: "Whatever, if it's great", f: { "price:high": 0.3, "price:mid": 0.2 } },
  ] },
];

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);
export const picked = (a) => (Array.isArray(a) ? a : a == null ? [] : [a]);
const loves = (ans) => [...Object.entries(ans.acts || {}), ...Object.entries(ans.more || {})].filter(([, v]) => v > 0).map(([k]) => k);
export const meetFrom = (ans) => picked(ans.who).some((i) => PROFILE[1].opts[i]?.meet);

export function weightsFrom(ans) {
  const w = {}; let price = 0, far = 0;
  const add = (f, x) => { w[f] = (w[f] || 0) + x; };
  const acts = (o, s) => { const es = Object.entries(o || {}); const nL = es.filter(([, v]) => v > 0).length || 1;
    es.forEach(([id, v]) => { const a = ACT[id]; if (!a) return; const k = v > 0 ? s / Math.sqrt(nL) * 1.6 : -s;
      add("act:" + id, 0.9 * k); add("cat:" + slug(a.ncat), (v > 0 ? 0.3 : 0.08) * k); }); };
  acts(ans.acts, 1); acts(ans.more, 0.85);
  PROFILE.forEach((q) => { const ks = picked(ans[q.id]); if (!ks.length) return; const k = 1 / Math.sqrt(ks.length);
    ks.forEach((i) => { const o = q.opts[i]; if (!o) return; Object.entries(o.f).forEach(([f, x]) => add(f, x * k)); price = Math.max(price, o.price || 0); far = Math.max(far, o.far || 0); }); });
  return { weights: w, price, far };
}

const up = (x) => x[0].toUpperCase() + x.slice(1);
export function profileFrom(ans) {
  const L = loves(ans).map((id) => ACT[id]).filter(Boolean);
  const pk = (id) => picked(ans[id]).map((i) => PROFILE.find((q) => q.id === id)?.opts[i]?.l).filter(Boolean);
  const tod = pk("tod"), who = pk("who");
  const time = tod.includes("Late nights") ? "Late-Night" : tod.includes("Daytime") ? "Daytime" : "Evening";
  const fams = {}; L.forEach((a) => { const f = { Comedy: "Laugher", Concerts: "Listener", "Clubs & DJs": "Dancer", "Dance Socials": "Dancer", "Arts & Crafts": "Maker", "Cooking & Cocktails": "Maker", "Pickup Sports": "Mover", Running: "Mover", "Climbing & Skating": "Mover", "Yoga & Wellness": "Mover", "Museums & Galleries": "Explorer", Tours: "Explorer", "Books & Readings": "Curious Mind", Film: "Cinephile" }[a.ncat] || (/Trivia|Board|Bar Games|Karaoke/.test(a.ncat) ? "Player" : /Tastings|Bars|Food/.test(a.ncat) ? "Taster" : "Enthusiast"); fams[f] = (fams[f] || 0) + 1; });
  const kinds = Object.entries(fams).sort((a, b) => b[1] - a[1]);
  const kind = kinds.length > 2 && kinds[0][1] < 3 ? "All-Rounder" : kinds[0]?.[0] || "Explorer";
  const lines = [];
  if (L.length) lines.push("Into " + L.slice(0, 3).map((a) => a.label).join(", ") + (L.length > 3 ? " and " + (L.length - 3) + " more" : ""));
  const r = [...tod.map((x) => x.toLowerCase()), ...who.map((x) => (x === "Myself" ? "happy solo" : "with " + x.toLowerCase()))]; if (r.length) lines.push(up(r.join(" · ")));
  const sp = pk("spend")[0];
  if (sp) lines.push({ "Free if I can": "Free first", "Under $20": "Cheap and cheerful", "Whatever, if it's great": "Pays for quality" }[sp]);
  return { name: "The " + time + " " + kind, lines: lines.slice(0, 3) };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
