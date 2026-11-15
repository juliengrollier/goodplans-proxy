// Taste space: every feature of every event (activity, category, sub-type, keyword, venue, area, price, time of day, feel)
// gets a 24-dimensional vector learned from which features appear together, the same distributional idea that word
// embeddings and LLMs rest on ("you know a thing by the company it keeps"). Skip-gram embeddings are known to factorise
// a shifted PMI matrix (Levy & Goldberg 2014), so we compute that directly: positive PMI with context smoothing, then a
// truncated eigen-projection by subspace iteration. It runs in the browser in a few milliseconds.
// Co-occurrences accumulate across refreshes (each event counted once), so the space keeps growing with the city.
// The activity ontology's "related" links are added as prior co-occurrences, so the space is sensible from day one.
// Your taste is a point in the same space: the learned weight of each feature times its vector, so anything near what
// you engage with scores well even if you've never seen it, and the nearest liked anchor explains why.
import * as L from "./learn.js";
import { ACTS, ACT } from "./activities.js";

const STORE = "gp_emb_v1";
const DIM = 24;
const TYPES = /^(act|cat|sub|kw|venue|hood|price|tod|dim|fam):/;
const TW = { act: 1.6, sub: 1.2, cat: 1, kw: 1, venue: 0.9, hood: 0.6, dim: 0.7, price: 0.5, tod: 0.5, fam: 0.5 };
const tw = (f) => TW[f.slice(0, f.indexOf(":"))] || 0.5;
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9&+/= -]/g, "").trim().slice(0, 40);

export const tokensOf = (e, today) => L.features(e, today).filter((f) => TYPES.test(f) && !/=(any|mixed|all-ages)$/.test(f));

const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "null") || { seen: {}, tf: {}, co: {}, n: 0 }; } catch { return { seen: {}, tf: {}, co: {}, n: 0 }; } };
let mem = null;
const store = () => (mem = mem || load());

// Add events not seen before. Returns how many were added.
export function ingest(events, today) {
  const s = store();
  let added = 0;
  for (const e of events) {
    if (!e.id || s.seen[e.id]) continue;
    const t = [...new Set(tokensOf(e, today))].sort();
    if (t.length < 2) continue;
    s.seen[e.id] = 1; s.n++; added++;
    t.forEach((a) => { s.tf[a] = (s.tf[a] || 0) + 1; });
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { const k = t[i] + "\t" + t[j]; s.co[k] = (s.co[k] || 0) + tw(t[i]) * tw(t[j]); }
  }
  if (!added) return 0;
  const ids = Object.keys(s.seen); if (ids.length > 5000) ids.slice(0, ids.length - 5000).forEach((k) => delete s.seen[k]);
  const ks = Object.keys(s.co);
  if (ks.length > 30000) { const sorted = ks.map((k) => s.co[k]).sort((a, b) => a - b), cut = sorted[ks.length - 22000]; ks.forEach((k) => { if (s.co[k] < cut) delete s.co[k]; }); }
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* full: keep in memory */ }
  space = null;
  return added;
}

// Prior knowledge: related activities and each activity's category
function priors() {
  const co = {}, tf = {};
  const put = (a, b, w) => { const k = a < b ? a + "\t" + b : b + "\t" + a; co[k] = (co[k] || 0) + w; };
  for (const [id, , ncat, , rel] of ACTS) {
    const a = "act:" + id; tf[a] = (tf[a] || 0) + 2;
    put(a, "cat:" + slug(ncat), 2.5);
    rel.forEach((r, i) => put(a, "act:" + r, 2.2 - i * 0.3));
  }
  return { co, tf };
}

const rng = (seed) => { let x = seed; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296 - 0.5); };
const norm = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s); return s ? v.map((x) => x / s) : v; };
export const cos = (a, b) => { if (!a || !b) return 0; let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

let space = null;
export function getSpace() {
  if (space) return space;
  const s = store(), p = priors();
  const tf = { ...s.tf }; for (const [k, v] of Object.entries(p.tf)) tf[k] = (tf[k] || 0) + v;
  const vocab = Object.keys(tf).filter((k) => tf[k] >= 1.5 || k.startsWith("act:")).sort((a, b) => tf[b] - tf[a]).slice(0, 900);
  const ix = new Map(vocab.map((k, i) => [k, i])), n = vocab.length;
  const rows = Array.from({ length: n }, () => new Map());
  const addC = (k, w) => { const t = k.indexOf("\t"), a = ix.get(k.slice(0, t)), b = ix.get(k.slice(t + 1)); if (a == null || b == null || a === b) return; rows[a].set(b, (rows[a].get(b) || 0) + w); rows[b].set(a, (rows[b].get(a) || 0) + w); };
  for (const [k, w] of Object.entries(s.co)) addC(k, w);
  for (const [k, w] of Object.entries(p.co)) addC(k, w);
  // PPMI with context smoothing (α = 0.75)
  const rs = rows.map((r) => { let x = 0; for (const v of r.values()) x += v; return x; });
  const T = rs.reduce((a, b) => a + b, 0) || 1, Za = rs.reduce((a, b) => a + Math.pow(b, 0.75), 0) || 1;
  const M = rows.map((r, i) => { const out = []; for (const [j, c] of r) { const v = Math.log((c / T) / ((rs[i] / T) * (Math.pow(rs[j], 0.75) / Za))); if (v > 0) out.push([j, v]); } return out; });
  // Subspace iteration for the top DIM directions of the symmetric PPMI matrix
  const d = Math.min(DIM, Math.max(2, n - 1)), r = rng(42);
  let Q = Array.from({ length: n }, () => Array.from({ length: d }, r));
  const mul = (X) => M.map((row) => { const o = new Array(d).fill(0); for (const [j, v] of row) { const xj = X[j]; for (let k = 0; k < d; k++) o[k] += v * xj[k]; } return o; });
  const orth = (X) => { for (let k = 0; k < d; k++) { for (let q = 0; q < k; q++) { let dot = 0; for (let i = 0; i < n; i++) dot += X[i][k] * X[i][q]; for (let i = 0; i < n; i++) X[i][k] -= dot * X[i][q]; } let s2 = 0; for (let i = 0; i < n; i++) s2 += X[i][k] ** 2; s2 = Math.sqrt(s2) || 1; for (let i = 0; i < n; i++) X[i][k] /= s2; } return X; };
  for (let it = 0; it < 8; it++) Q = orth(mul(Q));
  const E = mul(Q);
  const vec = new Map(); vocab.forEach((k, i) => { if (M[i].length) vec.set(k, norm(E[i])); });
  space = { vec, vocab, n: s.n, size: vec.size };
  return space;
}

export function eventVec(sp, e, today) {
  const v = new Array(DIM).fill(0); let any = false;
  for (const f of tokensOf(e, today)) { const x = sp.vec.get(f); if (!x) continue; any = true; const w = tw(f); for (let k = 0; k < x.length; k++) v[k] += w * x[k]; }
  return any ? norm(v) : null;
}
export function centroid(sp, list, today) {
  const v = new Array(DIM).fill(0); let any = false;
  list.slice(0, 15).forEach((e) => { const x = e._v !== undefined ? e._v : (e._v = eventVec(sp, e, today)); if (!x) return; any = true; for (let k = 0; k < x.length; k++) v[k] += x[k]; });
  return any ? norm(v) : null;
}

// Taste: learned feature weights projected into the space; anchors are the strongest liked things, used to explain picks
export function tasteOf(sp, m, now = Date.now()) {
  if (!m) return null;
  const v = new Array(DIM).fill(0); let mass = 0; const anchors = [];
  for (const f of Object.keys(m.w || {})) {
    const x = sp.vec.get(f); if (!x) continue;
    const w = L.weightOf(m, f, now); if (!w) continue;
    const ww = w * tw(f); mass += Math.abs(ww);
    for (let k = 0; k < x.length; k++) v[k] += ww * x[k];
    if (w > 0 && /^(act|sub|cat|kw):/.test(f)) anchors.push({ f, w, x, label: labelOf(f) });
  }
  if (mass < 0.3) return null;
  // Specific things explain better than broad ones: activities first, then sub-types, keywords, categories
  const pri = { act: 1.3, sub: 1.1, kw: 0.9, cat: 0.7 }, top = Math.max(...anchors.map((a) => a.w), 0);
  const strong = anchors.filter((a) => a.w >= 0.25 * top).sort((a, b) => b.w * pri[b.f.split(":")[0]] - a.w * pri[a.f.split(":")[0]]);
  return { v: norm(v), mass, anchors: strong.slice(0, 20) };
}
export function labelOf(f) {
  const [t, ...rest] = f.split(":"); const r = rest.join(":");
  if (t === "act") return ACT[r]?.label || r;
  if (t === "sub") return r.split("/").pop();
  return r;
}
// Multi-interest similarity: one averaged vector would blur "improv + pottery + pickleball" into a point near none of
// them, so a group scores by its best-matching interest (weighted by how strong that interest is), plus a little of the mean
export function tasteSim(taste, v) {
  if (!taste || !v) return 0;
  const top = taste.anchors[0]?.w || 1;
  let best = 0;
  for (const a of taste.anchors) { const c = cos(a.x, v) * Math.sqrt(Math.min(1, a.w / top)); if (c > best) best = c; }
  return 0.3 * cos(taste.v, v) + 0.7 * best;
}
// The liked thing closest to this point (but not the same thing), for "Because you like …"
export function because(taste, v, selfFeats = []) {
  if (!taste || !v) return null;
  let best = null, bs = 0.45;
  for (const a of taste.anchors) { if (selfFeats.includes(a.f) || !/^(act|sub):/.test(a.f)) continue; const c = cos(a.x, v); if (c > bs) { bs = c; best = a; } }
  return best ? { label: best.label, f: best.f, sim: bs } : null;
}
export function neighbours(sp, f, k = 5, prefix = "act:") {
  const x = sp.vec.get(f); if (!x) return [];
  return [...sp.vec].filter(([t]) => t !== f && t.startsWith(prefix)).map(([t, y]) => [t, cos(x, y)]).sort((a, b) => b[1] - a[1]).slice(0, k);
}
export const featureOfAct = (id) => "act:" + id;
export const featureOfCat = (c) => "cat:" + slug(c);
export const featureOfSub = (c, s) => "sub:" + slug(c + "/" + s);
