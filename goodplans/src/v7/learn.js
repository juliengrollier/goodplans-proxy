// Taste engine v2: learns from what you do, not only from what you rate.
// Each event is described by features (category, sub-type, keywords, venue, area, price, distance, how it feels,
// when it is, plus a few context crosses). Every signal nudges the weights of those features with a small online
// logistic regression. Weights fade with time, uncertain features earn a little exploration, and everything stays on
// this device. A thumb or a save records exactly what it changed, so undoing it takes it all back.

import { venueKey, todOf, priceNum, isFree } from "./engine.js";
import { runLen } from "../lib/core.js";

export const MODEL_KEY = "gp_model_v1";
const HALF_LIFE_DAYS = 90; // a signal counts half after three months
const LR = 0.35;
const WMAX = 3;

export const emptyModel = () => ({ w: {}, n: {}, t: {}, c: {}, imp: {}, opened: {}, muted: {}, asked: {}, count: 0, strong: 0, card: null });

// How strongly each action says "I like this" (y = 1) or "not for me" (y = 0)
export const SIGNALS = {
  skip: { y: 0, s: 0.12 },       // shown 3, 6, 10 times and never opened
  open: { y: 1, s: 0.25 },
  bounce: { y: 0, s: 0.12 },     // opened and closed within 3 s
  dwell: { y: 1, s: 0.45 },      // read for more than 15 s
  link: { y: 1, s: 0.8 },        // website or tickets
  share: { y: 1, s: 0.8 },
  directions: { y: 1, s: 0.7 },
  save: { y: 1, s: 1.2, undo: true },
  up: { y: 1, s: 1.0, undo: true },
  down: { y: 0, s: 1.0, undo: true },
  went: { y: 1, s: 2.0 },
  missed: { y: 0, s: 0.15 },
};

const DAY = 86400000;
const decayed = (m, f, now) => (m.w[f] || 0) * Math.pow(0.5, (now - (m.t[f] || now)) / (HALF_LIFE_DAYS * DAY));
const sig = (x) => 1 / (1 + Math.exp(-x));
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);

const priceBucket = (ev) => { if (isFree(ev)) return "free"; const p = priceNum(ev); return p == null ? null : p < 20 ? "cheap" : p < 50 ? "mid" : "high"; };
const distBucket = (ev) => { const m = ev.tt?.mins; return m == null ? null : m <= 12 ? "near" : m <= 30 ? "mid" : "far"; };
const evDay = (ev, today) => { const d = ev.X && ev.E < iso(today) ? today : new Date(ev.E + "T12:00:00"); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Features: what the event is, how it feels, where and when it is, and a few context crosses
export function features(ev, today = new Date()) {
  const f = [];
  const add = (k, v) => { if (v != null && v !== "") f.push(k + ":" + slug(v)); };
  add("cat", ev.ncat); if (ev.nsub) add("sub", ev.ncat + "/" + ev.nsub); add("fam", ev.fam);
  (ev.kw || []).slice(0, 4).forEach((k) => add("kw", k));
  add("venue", venueKey(ev)); add("hood", ev.hood);
  const pb = priceBucket(ev), db = distBucket(ev);
  add("price", pb); add("dist", db);
  add("len", runLen(ev) === 1 ? "oneoff" : runLen(ev) <= 7 ? "short" : "run");
  Object.entries(ev.dims || {}).forEach(([d, v]) => add("dim", d + "=" + v));
  const d = evDay(ev, today), dow = DOW[d.getDay()], dt = d.getDay() === 0 || d.getDay() === 6 || (d.getDay() === 5 && (todOf(ev) === "evening" || todOf(ev) === "late")) ? "weekend" : "weekday";
  const tod = todOf(ev) || "anytime";
  add("dow", dow); add("tod", tod);
  // Context crosses: the same person wants different things at different moments
  f.push("x:" + dt + "&" + tod);
  if (ev.ncat) f.push("x:" + tod + "&cat:" + slug(ev.ncat));
  if (db) f.push("x:" + dt + "&dist:" + db);
  if (ev.dims?.energy) f.push("x:" + dt + "&energy:" + ev.dims.energy);
  const wx = ev.wx;
  if (wx && ev.dims?.setting) { const w = wx.rainy ? "rain" : wx.hi != null && wx.hi < 45 ? "cold" : wx.hi != null && wx.hi > 82 ? "hot" : "mild"; f.push("x:" + w + "&setting:" + ev.dims.setting); }
  return [...new Set(f)];
}

const scaleOf = (f) => f.startsWith("x:") ? 0.5 : f.startsWith("kw:") ? 0.6 : f.startsWith("venue:") ? 0.8 : 1;

export function rawScore(m, feats, now = Date.now()) {
  return feats.reduce((a, f) => a + (m.muted[f] ? 0 : decayed(m, f, now)), 0);
}

// Points added to an event's score, and a small exploration bonus for things the model knows little about
export function learnedPoints(m, ev, today, now = Date.now()) {
  const feats = features(ev, today);
  const x = rawScore(m, feats, now);
  const pts = 22 * Math.tanh(x / 2.5);
  const base = feats.filter((f) => !f.startsWith("x:") && !f.startsWith("kw:") && !f.startsWith("dow:") && !f.startsWith("tod:"));
  const unc = base.length ? base.reduce((a, f) => a + 1 / Math.sqrt(1 + (m.n[f] || 0)), 0) / base.length : 0;
  // Stable per day, so lists don't reshuffle on every render
  const r = hash(ev.id + iso(today)) / 4294967295;
  const explore = m.strong >= 5 && x > -0.8 && unc > 0.6 ? Math.round(9 * unc * r) : 0;
  return { pts, explore, x, unc };
}

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// One learning step. Returns the new model; signals marked undo keep their exact change per event
export function learn(m0, ev, kind, today = new Date(), now = Date.now()) {
  const sg = SIGNALS[kind]; if (!sg || !ev) return m0;
  const m = { ...m0, w: { ...m0.w }, n: { ...m0.n }, t: { ...m0.t }, c: { ...m0.c } };
  const feats = features(ev, today).filter((f) => !m.muted[f]);
  const p = sig(rawScore(m, feats, now) - 0.4);
  const g = LR * sg.s * (sg.y - p) / Math.sqrt(Math.max(1, feats.length / 8));
  const delta = {};
  feats.forEach((f) => {
    const before = decayed(m, f, now);
    const after = Math.max(-WMAX, Math.min(WMAX, before + g * scaleOf(f)));
    m.w[f] = after; m.t[f] = now; m.n[f] = (m.n[f] || 0) + sg.s;
    delta[f] = after - before;
  });
  if (sg.undo) {
    const k = ev.id + ":" + kind;
    const prev = m.c[k] || {};
    Object.entries(delta).forEach(([f, d]) => { prev[f] = (prev[f] || 0) + d; });
    m.c = { ...m.c, [k]: { ...prev, _n: sg.s } };
    const keys = Object.keys(m.c); if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((x) => delete m.c[x]);
  }
  m.count = (m.count || 0) + 1;
  if (sg.s >= 0.7) m.strong = (m.strong || 0) + 1;
  return m;
}

// A reason picked after a thumb: learn strongly, but only on the features the reason names
export function learnTargeted(m0, ev, feats, y, today = new Date(), now = Date.now()) {
  if (!feats.length) return m0;
  const m = { ...m0, w: { ...m0.w }, n: { ...m0.n }, t: { ...m0.t }, c: { ...m0.c } };
  const fs = feats.filter((f) => !m.muted[f]);
  const p = sig(rawScore(m, fs, now) - 0.2);
  const g = LR * 1.4 * (y - p) / Math.sqrt(Math.max(1, fs.length / 3));
  const k = ev.id + ":why", prev = { ...(m.c[k] || {}) };
  fs.forEach((f) => {
    const before = decayed(m, f, now), after = Math.max(-WMAX, Math.min(WMAX, before + g));
    m.w[f] = after; m.t[f] = now; m.n[f] = (m.n[f] || 0) + 1; prev[f] = (prev[f] || 0) + after - before;
  });
  m.c[k] = { ...prev, _n: 1 };
  return m;
}

// Which features each thumb reason points at
export function reasonFeatures(ev, r, arg, today = new Date()) {
  const all = features(ev, today), pick = (re) => all.filter((f) => re.test(f));
  switch (r) {
    case "act": return pick(/^venue:/);
    case "genre": case "scene": return [...pick(/^(cat|sub):/), ...(r === "scene" ? pick(/^dim:(energy|crowd|polish|mode)=/) : [])];
    case "unique": return [...pick(/^len:oneoff$/), ...pick(/^dim:novelty=weird$/)];
    case "vibe": return [...pick(/^dim:(energy|crowd|social|polish|mode|setting)=/), ...pick(/^kw:/).slice(0, 2)];
    case "value": case "pricey": return pick(/^price:/);
    case "f": return arg && all.includes(arg) ? [arg, ...(arg.startsWith("x:") ? pick(/^(dow|tod):/) : [])] : [];
    default: return [];
  }
}

// Smart extra options for the thumb picker: this event's traits the model suspects matter (or knows least about)
const TRAIT = {
  "dim:crowd=intimate": ["Small and intimate", "Too small and quiet"], "dim:crowd=big": ["Big crowd buzz", "Too crowded"],
  "dim:energy=wild": ["Wild energy", "Too rowdy"], "dim:energy=calm": ["Calm and easy", "Too tame"],
  "dim:novelty=classic": ["A proper classic", "Too predictable"], "dim:novelty=weird": [null, "Too weird"],
  "dim:social=date": ["Good for a date", "Not a date thing"], "dim:social=group": ["Fun with friends", null],
  "dim:polish=upscale": ["A bit fancy", "Too fancy"], "dim:polish=diy": ["DIY spirit", "Too rough around the edges"],
  "dim:mode=take-part": ["Getting hands-on", "Too much participation"], "dim:mode=mingle": ["Meeting people", "Too much mingling"],
  "dim:mode=watch": [null, "Too passive"], "dim:setting=outdoor": ["Being outdoors", "Outdoors, not now"],
  "dim:audience=kids": [null, "Too kid-focused"],
  "dim:tone=moving": ["Something moving", "Too heavy"], "dim:tone=thoughtful": ["Food for thought", "Too cerebral"], "dim:tone=romantic": ["Romantic", null],
  "dim:tone=nostalgic": ["Nostalgic", null], "dim:scene=underground": ["Underground feel", "Too underground"], "dim:scene=mainstream": [null, "Too mainstream"],
  "dim:scene=indie": ["Indie spirit", null], "dim:body=active": ["Moving my body", "Too physical"], "dim:body=on-your-feet": [null, "Standing all night"],
  "dim:noise=quiet": ["Quiet enough to talk", null], "dim:noise=loud": ["Loud and live", "Too loud"], "dim:length=half-day+": ["A proper outing", "Too long"],
  "dim:length=quick": ["Quick and easy", "Too short to bother"], "dim:food=food": ["Food involved", null], "dim:food=drinks": ["Drinks on hand", null], "dist:near": ["Close by", null], "dist:far": [null, "Too far"],
};
const DAYNAME = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
export function smartReasons(m, ev, dir, today = new Date(), now = Date.now(), max = 3) {
  const all = features(ev, today), sgn = dir === "up" ? 1 : -1, out = [];
  all.forEach((f) => {
    let label = null, detail = null;
    if (TRAIT[f]) { label = TRAIT[f][dir === "up" ? 0 : 1]; if (f === "dist:far" && ev.tt?.mins) detail = ev.tt.mins + " min away"; if (f === "dist:near" && ev.tt?.mins) detail = ev.tt.mins + " min away"; }
    else if (/^x:(weekday|weekend)&(morning|afternoon|evening|late)$/.test(f)) {
      const dow = all.find((x) => x.startsWith("dow:"))?.slice(4), tod = f.split("&")[1];
      label = dir === "up" ? "Good timing" : "Bad timing"; detail = (DAYNAME[dow] || "") + " " + tod;
    } else if (f.startsWith("hood:") && ev.hood) { label = dir === "up" ? "The area" : "Not that area"; detail = ev.hood; }
    if (!label) return;
    const w = m.muted[f] ? 0 : decayed(m, f, now), n = m.n[f] || 0;
    out.push({ f, label, detail, score: sgn * w + 0.6 / Math.sqrt(1 + n) });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}

// Take back a thumb or a save: subtract exactly what it added
export function unlearn(m0, evId, kind) {
  const k = evId + ":" + kind, d = m0.c?.[k]; if (!d) return m0;
  const m = { ...m0, w: { ...m0.w }, n: { ...m0.n }, c: { ...m0.c } };
  Object.entries(d).forEach(([f, x]) => { if (f === "_n") return; m.w[f] = (m.w[f] || 0) - x; m.n[f] = Math.max(0, (m.n[f] || 0) - (d._n || 0)); if (Math.abs(m.w[f]) < 1e-6) delete m.w[f]; });
  delete m.c[k];
  if ((d._n || 0) >= 0.7) m.strong = Math.max(0, (m.strong || 0) - 1);
  return m;
}

// Impressions: a card seen 3, 6 and 10 times without ever being opened counts as a soft "not for me"
export function seen(m0, ev, today) {
  if (m0.opened[ev.id]) return m0;
  const n = (m0.imp[ev.id] || 0) + 1;
  let m = { ...m0, imp: { ...m0.imp, [ev.id]: n } };
  const ids = Object.keys(m.imp); if (ids.length > 1500) { const imp = { ...m.imp }; ids.slice(0, ids.length - 1500).forEach((x) => delete imp[x]); m.imp = imp; }
  if (n === 3 || n === 6 || n === 10) m = learn(m, ev, "skip", today);
  return m;
}
export const markOpened = (m, id) => (m.opened[id] ? m : { ...m, opened: { ...m.opened, [id]: Date.now() } });

// Searches say what's on your mind: matching keywords get a small lift
export function searched(m0, q) {
  const words = slug(q).split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
  if (!words.length) return m0;
  const m = { ...m0, w: { ...m0.w }, t: { ...m0.t }, n: { ...m0.n } }, now = Date.now();
  words.forEach((w) => { const f = "kw:" + w; m.w[f] = Math.min(WMAX, decayed(m, f, now) + 0.15); m.t[f] = now; m.n[f] = (m.n[f] || 0) + 0.2; });
  return m;
}

// The strongest learned patterns, for the taste card
export function topFeatures(m, now = Date.now()) {
  const all = Object.keys(m.w).filter((f) => !m.muted[f] && (m.n[f] || 0) >= 1).map((f) => ({ f, w: decayed(m, f, now), n: m.n[f] || 0 }));
  const strength = (x) => Math.abs(x.w) * Math.sqrt(x.n);
  const likes = all.filter((x) => x.w > 0.05 && !x.f.startsWith("x:") && !/^(dow|tod):/.test(x.f)).sort((a, b) => strength(b) - strength(a)).slice(0, 20);
  const dislikes = all.filter((x) => x.w < -0.05 && !x.f.startsWith("x:") && !/^(dow|tod):/.test(x.f)).sort((a, b) => strength(b) - strength(a)).slice(0, 12);
  const habits = all.filter((x) => Math.abs(x.w) > 0.05 && (x.f.startsWith("x:") || /^(dow|tod):/.test(x.f))).sort((a, b) => strength(b) - strength(a)).slice(0, 12);
  return { likes, dislikes, habits };
}

// "That's not me": a taste-card line switched off zeroes and ignores the features it rests on
export function mute(m0, feats) {
  const m = { ...m0, w: { ...m0.w }, muted: { ...m0.muted } };
  feats.forEach((f) => { m.muted[f] = true; delete m.w[f]; });
  if (m.card) m.card = { ...m.card, lines: m.card.lines.filter((l) => !l.f.some((f) => feats.includes(f))) };
  return m;
}

// A small copy of the model to share with a partner's phone for the "Together" view
export function compact(m, now = Date.now()) {
  const top = Object.keys(m.w).filter((f) => !m.muted[f]).map((f) => [f, decayed(m, f, now)]).filter(([, w]) => Math.abs(w) > 0.03)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  // Fits in one Apps Script property (about 9 KB)
  let k = Math.min(top.length, 260), out;
  do { out = { v: 1, at: now, strong: m.strong || 0, w: Object.fromEntries(top.slice(0, k).map(([f, w]) => [f, Math.round(w * 100) / 100])) }; k -= 20; } while (JSON.stringify(out).length > 8500 && k > 0);
  return out;
}
export function fromCompact(c) {
  if (!c?.w) return null;
  const now = Date.now(), t = {}, n = {};
  Object.keys(c.w).forEach((f) => { t[f] = now; n[f] = 1; });
  return { ...emptyModel(), w: c.w, t, n, strong: c.strong || 0 };
}

// Together: what suits both of you, held back where you disagree
export function togetherPoints(a, b) { return (a + b) / 2 - 0.5 * Math.abs(a - b); }

// Saved events whose day has passed (kept aside when Plans drops them), to ask "Did you go?"
export function pendingGoAsk(m, past, today) {
  const t0 = iso(today), y = iso(new Date(today.getTime() - 4 * DAY));
  return (past || []).filter((e) => e && !m.asked[e.id] && (e.X || e.E) < t0 && (e.X || e.E) >= y && runLen(e) <= 3)[0] || null;
}
export const markAsked = (m, id, ans) => ({ ...m, asked: { ...m.asked, [id]: ans } });


// "You may also like": events that share the most of what this one is (category, sub-type, keywords, how it feels),
// blended with how well each scores for you. Same series and the event itself are left out.
export function similarEvents(ev, list, today = new Date(), n = 5) {
  const core = (e) => features(e, today).filter((f) => /^(cat|sub|kw|dim|price|hood|len):/.test(f));
  const a = new Set(core(ev)), key = (e) => (e.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const out = [];
  for (const e of list) {
    if (e.id === ev.id || e.hidden || key(e) === key(ev)) continue;
    const b = core(e); if (!b.length) continue;
    const inter = b.filter((f) => a.has(f)).length;
    const sim = inter / (a.size + b.length - inter);
    if (sim < 0.15) continue;
    out.push({ e, r: sim * 0.7 + (e.sc || 0) / 100 * 0.3 });
  }
  return out.sort((x, y) => y.r - x.r).slice(0, n).map((x) => x.e);
}

// Feature names for things learned outside events (Google Maps list themes)
export const catFeature = (name) => "cat:" + slug(name);
export const dimFeature = (dim, v) => "dim:" + slug(dim + "=" + v);
