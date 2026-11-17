// Recommendation engine v3: one score for "how much would I want this, now", used to order every screen.
//
// An event's score (0–100) blends five things, each worked out on a 0–1 scale:
//   Affinity (55): is this my kind of thing?
//     · explicit — the moods you favourited (strongest), favourite categories / activities, hearts on chips
//     · learned  — the on-device model of what you open, save, read, thumb (learn.js, logistic over ~30 features)
//     · similar  — closeness in the taste space to what you engage with (embed.js), so new things you'd like rank too
//     Explicit choices count most while the model knows little; the learned parts take over as signals build up.
//   Moment (20): can I go, and soon? next day it's on, whether it's still reachable today, weather.
//   Rarity (10): one date only / closing soon beats something on every day for weeks.
//   Quality (10): editors' picks, listed by several sources, at a place you saved in Google Maps.
//   Friction (−): a long trip, a price above your usual.
// Hidden things (thumbed down, muted, categories you hid) score 0. Ties are broken by a small daily jitter so lists
// don't freeze. Category and mood lists are ordered with the same affinity, so every screen agrees.
import * as L from "./learn.js";
import { eventVec, tasteSim, featureOfCat } from "./embed.js";
import { INTENTS, member } from "./intents.js";
import { runLen, evEnd, nextOn, floorDay } from "../lib/core.js";
import { isFree, priceNum } from "./engine.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const DAY = 86400000;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

export const FAV_MOODS_KEY = "gp_intent_fav";
export function readFavMoods() { try { const f = JSON.parse(localStorage.getItem(FAV_MOODS_KEY) || "[]"); return Array.isArray(f) ? f : []; } catch { return []; } }

// Explicit affinity: what you told the app (moods, favourite lists, hearts)
function explicit(e, c) {
  let x = 0;
  if (c.favMoods.length) x = Math.max(x, ...c.favMoods.map((id) => Math.min(1, member(e, id))));
  if (c.favCats.has(e.ncat)) x = Math.max(x, 0.9);
  if (e.act && c.favActs.has(e.act)) x = Math.max(x, 1);
  if (e.nsub && c.favSubs.has(e.ncat + "|" + e.nsub)) x = Math.max(x, 1);
  if (c.stars?.cats?.[e.ncat]) x = Math.max(x, 0.85);
  if (e.nsub && c.stars?.subs?.[e.nsub]) x = Math.max(x, 0.9);
  return x;
}

export function rankContext({ model, space, tasteVec, moodFav = [], favMoods = readFavMoods(), stars = {}, today = new Date() }) {
  const favCats = new Set(moodFav.filter((k) => k.startsWith("gen-cat-")).map((k) => k.slice(8)));
  const favSubs = new Set(moodFav.filter((k) => k.startsWith("gen-sub-")).map((k) => k.slice(8)));
  const favActs = new Set(moodFav.filter((k) => /^(gen-act-|intent-act-)/.test(k)).map((k) => k.replace(/^(gen-act-|intent-act-[a-z]+-)/, "")));
  const strong = model?.strong || 0;
  // How much to trust the learned model vs what you told us: 0 signals → explicit leads; ~40 strong signals → learned leads
  const trust = clamp01(strong / 40);
  return { model, space, tasteVec, favMoods: favMoods.filter((id) => INTENTS.some((m) => m.id === id)), favCats, favSubs, favActs, stars, today: floorDay(today), trust };
}

// The score of one event (adds e.rk, e.aff and short reasons). `s` is the event after scoreEvent (has tt, rain, hidden…)
export function rank(s, c, extra = {}) {
  if (s.hidden || s.bd?.excluded) return { ...s, rk: 0, aff: 0 };
  const now = Date.now();
  // ── Affinity
  const ex = explicit(s, c);
  const lp = c.model ? L.learnedPoints(c.model, s, c.today, now) : { pts: 0, explore: 0 };
  const learned = clamp01(0.5 + lp.pts / 44);              // −22…+22 → 0…1
  const v = c.space && c.tasteVec ? eventVec(c.space, s, c.today) : null;
  const sim = clamp01(0.5 + 0.5 * tasteSim(c.tasteVec, v)); // −1…1 → 0…1
  const hasFav = c.favMoods.length + c.favCats.size + c.favActs.size + c.favSubs.size > 0;
  const wEx = hasFav ? 0.65 - 0.3 * c.trust : 0, wL = (1 - wEx) * 0.6, wS = (1 - wEx) * 0.4;
  let aff = wEx * ex + wL * learned + wS * sim;
  // Something outside every favourite still ranks, but below the things you said you love
  if (hasFav && ex < 0.3) aff *= 0.8 + 0.2 * c.trust;

  // ── Moment: next day it's on
  const nx = nextOn(s, c.today) || c.today;
  const d = Math.max(0, Math.round((floorDay(nx) - c.today) / DAY));
  let moment = d === 0 ? 1 : d === 1 ? 0.88 : Math.max(0.3, 0.92 ** d * 0.92);
  if (s.rain) moment *= 0.6;
  if (s.busy) moment *= 0.3;

  // ── Rarity
  const len = runLen(s), left = Math.round((evEnd(s) - c.today) / DAY);
  const rarity = len <= 1 ? 1 : len <= 4 ? 0.85 : s.recurring ? 0.55 : left <= 3 ? 0.95 : left <= 7 ? 0.7 : left <= 14 ? 0.5 : 0.3;

  // ── Quality
  const quality = clamp01((s.tier === 1 ? 0.6 : s.tier === 3 ? 0.15 : 0.35) + 0.15 * Math.max(0, (s.srcs?.length || 1) - 1) + (s.savedPlace ? 0.35 : 0) + (s.followed ? 0.3 : 0));

  // ── Friction
  const mins = s.tt?.mins;
  let friction = mins == null ? 0 : mins <= 20 ? 0 : mins <= 35 ? 2 : mins <= 50 ? 5 : 9;
  const p = priceNum(s);
  if (!isFree(s) && p != null && c.stars?.priceCeil && p > c.stars.priceCeil) friction += 4;

  const jitter = 1.2 * hash(s.id + c.today.toDateString());
  const explore = lp.explore ? Math.min(4, lp.explore * 0.4) : 0; // a little room for the unknown
  const rk = 55 * aff + 20 * moment + 10 * rarity + 10 * quality - friction + jitter + explore + (extra.boost || 0);

  const why = [...(s.why || [])].filter((w) => !/^(Fits your taste|You like |Something new)/.test(w));
  if (ex >= 0.85 && c.favMoods.some((id) => member(s, id) >= 0.85)) { const m = INTENTS.find((x) => c.favMoods.includes(x.id) && member(s, x.id) >= 0.85); why.unshift("One of your moods · " + m.label); }
  else if (lp.pts >= 8 || sim >= 0.8) why.unshift("Fits your taste");
  else if (explore >= 2) why.push("Something new for you");
  return { ...s, rk: Math.round(rk * 10) / 10, sc: Math.max(0, Math.min(100, Math.round(rk))), aff: Math.round(aff * 100) / 100, why, lp: Math.round(lp.pts), explore: explore >= 2 };
}

// How much you like a category as a whole (orders category groups in Explore and elsewhere), 0–1
export function catAffinity(cat, c) {
  const moodHit = c.favMoods.some((id) => INTENTS.find((m) => m.id === id)?.cats?.includes(cat)) ? 1 : 0;
  const fav = c.favCats.has(cat) || c.stars?.cats?.[cat] ? 0.9 : 0;
  const w = c.model ? L.weightOf(c.model, featureOfCat(cat)) : 0;
  const learned = clamp01(0.5 + Math.tanh(w / 1.5) / 2);
  const hasFav = c.favMoods.length + c.favCats.size > 0;
  return hasFav ? 0.6 * Math.max(moodHit, fav) + 0.4 * learned : learned;
}
// Order [key, events] groups: category affinity first, then the best few events in it
export function orderGroups(groups, c) {
  const best = (l) => { const t = l.map((e) => e.rk ?? e.sc ?? 0).sort((a, b) => b - a).slice(0, 3); return t.reduce((a, b) => a + b, 0) / Math.max(1, t.length) / 100; };
  return groups.map(([k, l]) => [k, l.slice().sort((a, b) => (b.rk ?? b.sc ?? 0) - (a.rk ?? a.sc ?? 0)), 0.6 * catAffinity(k, c) + 0.4 * best(l)])
    .sort((a, b) => b[2] - a[2]).map(([k, l]) => [k, l]);
}
