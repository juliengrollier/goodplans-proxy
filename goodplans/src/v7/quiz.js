// Onboarding v6: one page of "I'd rather…" rows, three options each, one tap per row (tap again to clear).
// Each activity row spans different corners of the taste map, so a handful of taps places you on it; the pick is a
// love, the two you passed over a gentle "less than that". The last rows cover time of day, budget and company.
import { ACT } from "./activities.js";

export const QUIZ_VERSION = 6;
export const ROWS = [
  { id: "laugh", opts: [{ l: "Laugh at stand-up", act: "standup" }, { l: "Catch live jazz", act: "jazz" }, { l: "See a play", act: "off-broadway" }] },
  { id: "play", opts: [{ l: "Win at trivia", act: "trivia" }, { l: "Go bowling", act: "bowling" }, { l: "Play board games", act: "board-games" }] },
  { id: "make", opts: [{ l: "Throw pottery", act: "pottery" }, { l: "Take a cooking class", act: "cooking-class" }, { l: "Sketch at life drawing", act: "drawing" }] },
  { id: "out", opts: [{ l: "Dance till late", act: "dj-party" }, { l: "Sing karaoke", act: "karaoke" }, { l: "Chill in a beer garden", act: "beer-garden" }] },
  { id: "move", opts: [{ l: "Run with a club", act: "run-club" }, { l: "Go climbing", act: "climbing" }, { l: "Do yoga", act: "yoga" }] },
  { id: "learn", opts: [{ l: "Wander a museum", act: "museum" }, { l: "Take a walking tour", act: "walking-tour" }, { l: "Hear an author talk", act: "book-talks" }] },
  { id: "taste", opts: [{ l: "Graze a food market", act: "market-food" }, { l: "Taste natural wine", act: "wine" }, { l: "Watch a classic film", act: "repertory" }] },
  { id: "when", opts: [{ l: "Be out in the daytime", f: { "tod:morning": 0.4, "tod:afternoon": 0.6, "tod:late": -0.3 } }, { l: "Go out in the evening", f: { "tod:evening": 0.7 } }, { l: "Stay out late", f: { "tod:late": 0.7, "tod:evening": 0.3, "dim:audience=21+": 0.2 } }] },
  { id: "spend", opts: [{ l: "Keep it free", f: { "price:free": 0.7, "price:high": -0.5 }, price: 2 }, { l: "Spend under $20", f: { "price:cheap": 0.5, "price:free": 0.3, "price:high": -0.3 }, price: 1 }, { l: "Pay for something great", f: { "price:high": 0.3, "price:mid": 0.2 } }] },
  { id: "who", opts: [{ l: "Go with friends", f: { "dim:social=group": 0.7 } }, { l: "Meet new people", f: { "dim:mode=mingle": 0.9, "dim:social=solo-friendly": 0.2 }, meet: true }, { l: "Go on a date", f: { "dim:social=date": 0.7, "dim:tone=romantic": 0.2 } }] },
];

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);
export const meetFrom = (ans) => ROWS.some((r) => r.opts[ans.rows?.[r.id]]?.meet);

export function weightsFrom(ans) {
  const w = {}; let price = 0;
  const add = (f, x) => { w[f] = (w[f] || 0) + x; };
  for (const r of ROWS) {
    const k = ans.rows?.[r.id]; if (k == null) continue;
    r.opts.forEach((o, i) => {
      if (o.act && ACT[o.act]) { const x = i === k ? 1 : -0.18; add("act:" + o.act, 0.9 * x); add("cat:" + slug(ACT[o.act].ncat), (i === k ? 0.3 : 0.05) * x); }
      if (i === k && o.f) Object.entries(o.f).forEach(([f, x]) => add(f, x));
      if (i === k && o.price) price = o.price;
    });
  }
  return { weights: w, price, far: 0 };
}

export function profileFrom(ans) {
  const loves = ROWS.map((r) => r.opts[ans.rows?.[r.id]]).filter((o) => o?.act).map((o) => ACT[o.act]).filter(Boolean);
  return { name: "You", lines: loves.length ? ["Into " + loves.slice(0, 3).map((a) => a.label).join(", ")] : [] };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
