// Onboarding v7: one page, six rows of three outings, one tap per row (tap again to clear).
// Each activity row spans different corners of the taste map, so a handful of taps places you on it; the pick is a
// love, the two you passed over a gentle "less than that". The last rows cover time of day, budget and company.
import { ACT } from "./activities.js";

export const QUIZ_VERSION = 7;
// Six rows, three outings each. Every option carries several signals at once (activity, family, energy, time,
// company, price, novelty), and each row contrasts different axes, so six taps cover the whole profile:
//  1 energy & time · 2 hands vs head vs play · 3 body & outdoors · 4 company · 5 money & polish · 6 novelty
export const ROWS = [
  { id: "night", axis: "Energy", opts: [
    { l: "Late-night DJ set", acts: ["techno", "dj-party"], f: { "fam:party": 0.4, "tod:late": 0.6, "dim:energy=wild": 0.5, "dim:crowd=big": 0.2 } },
    { l: "Sunday jazz brunch", acts: ["jazz", "brunch"], f: { "fam:listen": 0.3, "tod:morning": 0.3, "tod:afternoon": 0.3, "dim:energy=calm": 0.4 } },
    { l: "Comedy after work", acts: ["standup", "improv"], f: { "fam:watch": 0.3, "tod:evening": 0.5, "dim:tone=fun": 0.5 } },
  ] },
  { id: "doing", axis: "Doing", opts: [
    { l: "Pottery class", acts: ["pottery", "painting-class"], f: { "fam:make": 0.5, "dim:mode=take-part": 0.6 } },
    { l: "Museum late night", acts: ["museum-late", "museum"], f: { "fam:explore": 0.4, "fam:learn": 0.2, "dim:tone=thoughtful": 0.4, "dim:noise=quiet": 0.2 } },
    { l: "Bar trivia", acts: ["trivia", "board-games"], f: { "fam:play": 0.5, "dim:social=group": 0.3, "price:free": 0.2 } },
  ] },
  { id: "body", axis: "Moving", opts: [
    { l: "Pickup pickleball", acts: ["pickleball", "volleyball"], f: { "fam:move": 0.5, "dim:body=active": 0.6, "dim:mode=mingle": 0.2 } },
    { l: "Yoga in the park", acts: ["yoga", "meditation"], f: { "dim:setting=outdoor": 0.5, "dim:energy=calm": 0.5, "tod:morning": 0.3 } },
    { l: "Walking food tour", acts: ["food-tour", "walking-tour"], f: { "fam:eat": 0.4, "fam:explore": 0.3, "dim:setting=outdoor": 0.3 } },
  ] },
  { id: "who", axis: "Company", opts: [
    { l: "Supper club with strangers", acts: ["supper-club"], f: { "dim:mode=mingle": 0.8, "fam:eat": 0.3 }, meet: true },
    { l: "A film on my own", acts: ["repertory", "documentary"], f: { "dim:social=solo-friendly": 0.7, "fam:watch": 0.3, "dim:noise=quiet": 0.2 } },
    { l: "Karaoke with friends", acts: ["karaoke", "dive-bar"], f: { "dim:social=group": 0.7, "dim:noise=loud": 0.3 } },
  ] },
  { id: "spend", axis: "Spend", opts: [
    { l: "Free concert outdoors", acts: ["folk", "outdoor-film"], f: { "price:free": 0.7, "price:high": -0.4, "dim:setting=outdoor": 0.4 }, price: 2 },
    { l: "$10 basement show", acts: ["indie", "open-mic-music"], f: { "price:cheap": 0.6, "dim:crowd=intimate": 0.5, "dim:polish=diy": 0.4, "dim:scene=underground": 0.3 }, price: 1 },
    { l: "A big Broadway night", acts: ["broadway", "musicals"], f: { "price:high": 0.5, "dim:polish=polished": 0.4, "dim:scene=mainstream": 0.3 } },
  ] },
  { id: "new", axis: "Novelty", opts: [
    { l: "Something weird and new", acts: ["immersive-art", "murder-mystery"], f: { "dim:novelty=weird": 0.7, "len:oneoff": 0.4 } },
    { l: "A classic I'll love", acts: ["classical", "opera"], f: { "dim:novelty=classic": 0.6, "dim:polish=polished": 0.2 } },
    { l: "Learn a new skill", acts: ["cooking-class", "dance-class"], f: { "dim:mode=take-part": 0.5, "fam:learn": 0.3, "dim:tone=thoughtful": 0.2 } },
  ] },
];

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);
export const meetFrom = (ans) => ROWS.some((r) => r.opts[ans.rows?.[r.id]]?.meet);

export function weightsFrom(ans) {
  const w = {}; let price = 0;
  const add = (f, x) => { w[f] = (w[f] || 0) + x; };
  for (const r of ROWS) {
    const k = ans.rows?.[r.id]; if (k == null) continue;
    r.opts.forEach((o, i) => {
      const on = i === k;
      (o.acts || []).forEach((id, j) => { if (!ACT[id]) return; const x = (on ? 1 : -0.18) * (j ? 0.6 : 1); add("act:" + id, 0.9 * x); add("cat:" + slug(ACT[id].ncat), (on ? 0.3 : 0.05) * x); });
      if (on) { Object.entries(o.f || {}).forEach(([f, x]) => add(f, x)); if (o.price) price = o.price; }
    });
  }
  return { weights: w, price, far: 0 };
}

export function profileFrom(ans) {
  const loves = ROWS.map((r) => r.opts[ans.rows?.[r.id]]).filter((o) => o?.acts).map((o) => ACT[o.acts[0]]).filter(Boolean);
  return { name: "You", lines: loves.length ? ["Into " + loves.slice(0, 3).map((a) => a.label).join(", ")] : [] };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
