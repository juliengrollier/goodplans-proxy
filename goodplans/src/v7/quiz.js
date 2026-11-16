// Onboarding v5: a swipe deck. 12 cards, about 20 seconds: right = love, left = meh, tap skip.
// Activity cards adapt as you go: after a love, the next card alternates between a close neighbour on the taste map
// (sharpening what you like) and something far from everything you've seen (keeping the picture wide).
// Three "how you go out" cards use the same swipe: late nights, free stuff first, meeting new people.
import { ACT } from "./activities.js";

export const QUIZ_VERSION = 5;
export const DECK_SIZE = 12;
// A spread across the whole map, in the order they are offered when there is nothing to adapt to yet
export const START = ["standup", "jazz", "pottery", "trivia", "techno", "museum", "pickleball", "wine", "improv", "climbing", "repertory", "karaoke",
  "walking-tour", "yoga", "indie", "board-games", "cooking-class", "beer-garden", "salsa", "book-talks", "run-club", "classical", "market-food", "bowling"];
export const VIBES = {
  late: { label: "Late nights out", sub: "Things that start after 9", at: 3 },
  free: { label: "Free stuff first", sub: "No ticket, no problem", at: 7 },
  meet: { label: "Meeting new people", sub: "Classes, clubs, socials", at: 10 },
};

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);
export const meetFrom = (ans) => (ans.vibe?.meet || 0) > 0;

export function weightsFrom(ans) {
  const w = {}; let price = 0;
  const add = (f, x) => { w[f] = (w[f] || 0) + x; };
  const es = Object.entries(ans.acts || {}); const nL = es.filter(([, v]) => v > 0).length || 1;
  es.forEach(([id, v]) => { const a = ACT[id]; if (!a) return; const k = v > 0 ? 1.6 / Math.sqrt(nL) : -1;
    add("act:" + id, 0.9 * k); add("cat:" + slug(a.ncat), (v > 0 ? 0.3 : 0.08) * k); });
  const v = ans.vibe || {};
  if (v.late > 0) { add("tod:late", 0.7); add("tod:evening", 0.3); add("dim:audience=21+", 0.2); } else if (v.late < 0) { add("tod:late", -0.4); add("tod:afternoon", 0.2); }
  if (v.free > 0) { add("price:free", 0.7); add("price:high", -0.5); price = 2; } else if (v.free < 0) { add("price:high", 0.2); }
  if (v.meet > 0) { add("dim:mode=mingle", 0.9); add("dim:social=solo-friendly", 0.2); } else if (v.meet < 0) { add("dim:mode=mingle", -0.3); }
  return { weights: w, price, far: 0 };
}

// A light name for the toast on the way to Home
export function profileFrom(ans) {
  const loves = Object.entries(ans.acts || {}).filter(([, v]) => v > 0).map(([k]) => ACT[k]).filter(Boolean);
  const time = ans.vibe?.late > 0 ? "Late-Night" : ans.vibe?.late < 0 ? "Daytime" : "Evening";
  const kind = loves.length >= 6 ? "All-Rounder" : loves.length ? "Enthusiast" : "Explorer";
  return { name: "The " + time + " " + kind, lines: loves.length ? ["Into " + loves.slice(0, 3).map((a) => a.label).join(", ")] : [] };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
