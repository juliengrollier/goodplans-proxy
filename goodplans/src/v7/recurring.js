// Recurring events ("regulars"): detected from each feed and kept on the device across refreshes.
// Patterns: weekly, every other week, monthly (nth weekday, e.g. "first Thursday"), or recurring with varying dates.
import { venueKey, isoDay } from "./engine.js";

export const REC_KEY = "gp_recur_v2";
const EXPIRE_DAYS = 120;
const DOWS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ORD = ["first", "second", "third", "fourth", "last"];
const STOP = new Set(["the", "and", "with", "at", "in", "on", "of", "a", "an", "for", "night", "nights", "weekly", "monthly", "every", "free", "nyc", "presents", "live", ...DOWS, ...DOWS.map((d) => d + "s")]);

// Title words that identify a series, ignoring order, dates, venue words and filler
export function titleTokens(ev) {
  const venueWords = new Set(venueKey(ev).split(/[^a-z0-9]+/));
  const words = (ev.title || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[’']/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const own = [...new Set(words.filter((w) => !venueWords.has(w)))].sort();
  // "Whitney Museum Free Friday Nights" at the Whitney: nothing is left once venue words go, so keep them
  return own.length ? own : [...new Set(words)].sort();
}
const venueRoot = (ev) => venueKey(ev).replace(/[’']/g, "").replace(/^the\s+/, "").split(/[^a-z0-9]+/).filter(Boolean).slice(0, 2).join(" ");
const jacc = (a, b) => { const B = new Set(b); const i = a.filter((x) => B.has(x)).length; return i / Math.max(1, new Set([...a, ...b]).size); };
const sameSeries = (a, b) => a.venue === b.venue && (a.tokens.join(" ") === b.tokens.join(" ") || jacc(a.tokens, b.tokens) >= 0.5);

const dowOf = (iso) => new Date(iso + "T12:00:00").getDay();
const nthOf = (iso) => { const d = new Date(iso + "T12:00:00"); const n = Math.ceil(d.getDate() / 7); const last = new Date(d); last.setDate(d.getDate() + 7); return last.getMonth() !== d.getMonth() ? 5 : n; };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function textPattern(ev) {
  const t = ((ev.title || "") + " " + (ev.desc || "")).toLowerCase();
  const dre = DOWS.join("|");
  let m = t.match(new RegExp(`\\b(${ORD.join("|")})\\s+(${dre})s?\\b(?:\\s+of\\s+(?:each|every|the)\\s+month)?`));
  if (m && /month/.test(t)) return { kind: "monthly", dow: DOWS.indexOf(m[2]), nth: m[1] === "last" ? 5 : ORD.indexOf(m[1]) + 1 };
  m = t.match(new RegExp(`\\bevery\\s+other\\s+(${dre})\\b`));
  if (m) return { kind: "biweekly", dow: DOWS.indexOf(m[1]) };
  m = t.match(new RegExp(`\\b(?:every|each)\\s+(${dre})\\b|\\b(${dre})s\\b`));
  if (m) return { kind: "weekly", dow: DOWS.indexOf(m[1] || m[2]) };
  if (/\b(weekly|every week)\b/.test(t)) return { kind: "weekly", dow: null };
  if (/\b(monthly|every month)\b/.test(t)) return { kind: "monthly", dow: null };
  return null;
}

function datePattern(dates) {
  if (dates.length < 2) return null;
  const gaps0 = dates.slice(1).map((d, i) => Math.round((new Date(d + "T12:00:00") - new Date(dates[i] + "T12:00:00")) / 86400000));
  if (Math.max(...gaps0) < 7) return null; // consecutive nights = a short run, not a regular
  const dows = new Set(dates.map(dowOf));
  const ts = dates.map((d) => new Date(d + "T12:00:00").getTime());
  const gaps = ts.slice(1).map((t, i) => Math.round((t - ts[i]) / 86400000));
  if (dows.size === 1) {
    const dow = dowOf(dates[0]), g = gaps.reduce(gcd);
    if (g === 7) return { kind: "weekly", dow };
    if (g === 14) return { kind: "biweekly", dow };
    const nths = new Set(dates.map(nthOf));
    if (gaps.every((x) => x >= 28 && x <= 35) && nths.size === 1) return { kind: "monthly", dow, nth: [...nths][0] };
    if (g % 7 === 0) return { kind: "weekly", dow }; // gaps of 21, 28…: assume weekly with missed listings
  }
  return { kind: "varies", dow: null };
}

// Merge the current feed into the stored list. Returns a new store.
export function updateRecurring(events, store, today) {
  const out = { ...(store || {}) };
  const day = isoDay(today);
  const groups = [];
  events.forEach((e) => {
    if (!e.E || e.recurring === "synthetic" || !venueKey(e)) return;
    const s = { venue: venueRoot(e), tokens: titleTokens(e) };
    if (!s.tokens.length) return;
    const g = groups.find((x) => sameSeries(x, s));
    if (g) g.list.push(e); else groups.push({ ...s, list: [e] });
  });
  groups.forEach((g) => {
    const single = g.list.filter((e) => !e.X || e.X === e.E);
    const dates = [...new Set(single.map((e) => e.E))].sort();
    const txt = textPattern(g.list[0]);
    let pat = datePattern(dates);
    if (txt && (!pat || pat.kind === "varies" || (txt.dow != null && pat.dow === txt.dow))) pat = { ...pat, ...txt, dow: txt.dow ?? pat?.dow ?? (dates[0] ? dowOf(dates[0]) : null) };
    if (!pat) return;
    // Existing stored series this group belongs to (keeps one entry when titles drift)
    const prevKey = Object.keys(out).find((k) => sameSeries(out[k], g));
    const key = prevKey || g.venue + "|" + g.tokens.join(" ");
    const s = [...g.list].sort((a, b) => (a.E < b.E ? -1 : 1))[0];
    out[key] = {
      key, venue: g.venue, tokens: g.tokens, kind: pat.kind, dow: pat.dow, nth: pat.nth || null,
      ev: { title: s.title, venue: s.venue, time: s.time, cat: s.cat, sub: s.sub, price: s.price, coord: s.coord, url: s.url, src: s.src, desc: s.desc, hood: s.hood, tier: s.tier, ticket: s.ticket, tags: s.tags || [] },
      dates: [...new Set([...(out[key]?.dates || []), ...dates])].sort().slice(-8),
      firstSeen: out[key]?.firstSeen || day, lastSeen: day,
    };
  });
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - EXPIRE_DAYS);
  Object.keys(out).forEach((k) => { if (!out[k].ev || out[k].lastSeen < isoDay(cutoff)) delete out[k]; });
  return out;
}

// Next expected date (today included) or null when the pattern can't predict one
export function nextDate(r, today) {
  if (r.dow == null || r.kind === "varies") return null;
  const d = new Date(today);
  if (r.kind === "weekly") { d.setDate(d.getDate() + ((r.dow - d.getDay() + 7) % 7)); return isoDay(d); }
  if (r.kind === "biweekly") {
    const last = r.dates?.length ? new Date(r.dates[r.dates.length - 1] + "T00:00:00") : null;
    if (!last) return null;
    while (last < d) last.setDate(last.getDate() + 14);
    return isoDay(last);
  }
  if (r.kind === "monthly" && r.nth) {
    for (let m = 0; m < 3; m++) {
      const first = new Date(d.getFullYear(), d.getMonth() + m, 1);
      const cand = new Date(first); cand.setDate(1 + ((r.dow - first.getDay() + 7) % 7) + 7 * (Math.min(r.nth, 5) - 1));
      if (r.nth === 5) { while (cand.getMonth() !== first.getMonth()) cand.setDate(cand.getDate() - 7); const nx = new Date(cand); nx.setDate(cand.getDate() + 7); if (nx.getMonth() === first.getMonth()) cand.setDate(cand.getDate() + 7); }
      if (cand.getMonth() === first.getMonth() && cand >= d) return isoDay(cand);
    }
  }
  return null;
}

export const keyOfEvent = (ev, store) => {
  const s = { venue: venueRoot(ev), tokens: titleTokens(ev) };
  if (!s.tokens.length) return null;
  return Object.keys(store || {}).find((k) => sameSeries(store[k], s)) || null;
};

// The feed plus the next expected date of each remembered series the feed is missing (within 7 days).
export function withRegulars(events, store, today) {
  const st = store || {};
  const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + 7);
  const seen = {};
  const flagged = events.map((e) => {
    const k = keyOfEvent(e, st);
    if (!k) return e;
    (seen[k] = seen[k] || new Set()).add(e.E);
    return { ...e, recurring: true, recKey: k, recLabel: patternLabel(st[k]) };
  });
  const extra = Object.values(st).map((r) => {
    const E = nextDate(r, today);
    if (!E || E > isoDay(lastDay) || seen[r.key]?.size) return null;
    return { ...r.ev, id: "rec-" + r.key.replace(/[^a-z0-9]+/gi, "-") + "-" + E, E, recurring: "synthetic", recKey: r.key, recLabel: patternLabel(r) };
  }).filter(Boolean);
  return [...flagged, ...extra];
}

const DOW_PL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const ORD_L = ["", "1st", "2nd", "3rd", "4th", "Last"];
export function patternLabel(r) {
  if (!r) return "Recurring";
  const d = r.dow != null ? DOW_PL[r.dow] : null;
  if (r.kind === "weekly") return d ? "Every week · " + d : "Every week";
  if (r.kind === "biweekly") return d ? "Every other week · " + d : "Every other week";
  if (r.kind === "monthly") return r.nth && d ? ORD_L[r.nth] + " " + d.slice(0, -1) + " of the month" : "Monthly";
  return "Recurring · dates vary";
}
export { DOW_PL };
