// Your mood: a guess at how the two of you probably feel right now, then the events that suit that feeling.
// 1) readState(): dials from the moment (energy, reach, spend, novelty, setting) with the reasons behind them.
// 2) ARCHETYPES: each says how well it fits those dials and which events suit it.
// 3) rankYou(): only events doable now (running, or starting soon), within the reach and the budget the state allows;
//    archetypes ranked by fit, supply and what was learned from "Nailed it" / "Not quite" for this time slot.
import { startMinutes, endMinutes, isFree, priceNum } from "./engine.js";
import { evCovers, matchV } from "../lib/core.js";
import { outdoorish } from "./mood.js";

export const YOU_KEY = "gp_you_v1"; // { learn: { "<slot>": { <archetype>: n } }, shown: {id: ts} }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const text = (e) => [e.title, e.desc, e.sub, e.cat, ...(e.kw || []), ...(e.tags || [])].join(" ").toLowerCase();
const T = (s) => { const r = new RegExp(s, "i"); return (e) => r.test(text(e)); };
const DAYN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Slot = kind of day × part of day; learning is kept per slot ("Saturday late" can differ from "Tuesday evening")
export function slotOf(now) {
  const d = now.getDay(), h = now.getHours();
  const day = d === 0 ? "sun" : d === 6 ? "sat" : d === 5 ? "fri" : "wkd";
  const part = h < 11 ? "morning" : h < 14 ? "midday" : h < 17 ? "afternoon" : h < 21 ? "evening" : "late";
  return day + "-" + part;
}

// ── 1. State
export function readState(ctx) {
  const { hour, dow, wx, me } = ctx;
  const why = [];
  let energy = hour < 9 ? 0.45 : hour < 12 ? 0.6 : hour < 17 ? 0.55 : hour < 21 ? 0.65 : hour < 23 ? 0.5 : 0.35;
  if ((dow === 5 || dow === 6) && hour >= 17) { energy += 0.15; why.push(DAYN[dow] + " night"); }
  if (dow === 0 && hour >= 16) { energy -= 0.15; why.push("Sunday evening"); }
  if (dow === 1) energy -= 0.08;
  if (me.busyHours >= 4) { energy -= 0.2; why.push(`${Math.round(me.busyHours)}h of meetings today`); }
  if (hour >= 21) why.push("it's getting late");

  let reach = 0.6;
  if (wx.feels != null && wx.feels <= 25) { reach -= 0.35; why.push(`feels like ${wx.feels}°F`); }
  else if (wx.feels != null && wx.feels <= 42) { reach -= 0.18; why.push(`${wx.temp}°F out`); }
  if (wx.rainNow) { reach -= 0.3; why.push("it's raining"); }
  if (wx.snowNow) { reach -= 0.2; why.push("it's snowing"); }
  if (hour >= 21) reach -= 0.2;
  reach = clamp(reach + (energy - 0.5) * 0.4, 0.1, 1);

  let spend = 0.55;
  if (ctx.dom >= 25) spend -= 0.2;
  if (dow === 5 || dow === 6) spend += 0.1;
  spend = clamp(spend);

  let novelty = 0.5;
  if (me.streak) novelty -= 0.15;
  if (me.daysSinceSave != null && me.daysSinceSave >= 10) { novelty -= 0.1; why.push("it's been a while"); }

  const cold = wx.feels != null && wx.feels <= 42;
  const nice = !cold && !wx.rainNow && wx.temp != null && wx.temp >= 60 && wx.temp <= 82 && hour < 20;
  if (nice) why.push(`${wx.temp}°F and dry`);
  const cozy = clamp((cold ? 0.4 : 0) + (wx.rainNow ? 0.3 : 0) + (energy < 0.5 ? 0.3 : 0) + (hour >= 21 ? 0.2 : 0));
  const lively = clamp(energy - 0.2 + ((dow === 5 || dow === 6) && hour >= 19 ? 0.3 : 0));

  return {
    energy: clamp(energy), reach, spend, novelty: clamp(novelty), cozy, lively, nice,
    maxMins: Math.round(10 + reach * 35),
    priceCap: spend < 0.4 ? 15 : spend < 0.6 ? 35 : 999,
    why: [...new Set(why)].slice(0, 3),
  };
}

// ── 2. Archetypes: fit(state, ctx) → 0..1, match(e), what it offers (for the subtitle writer), title bank
const lateish = (c) => c.hour >= 20 || c.hour < 2;
const evening = (c) => c.hour >= 17 || c.hour < 2;
export const ARCHETYPES = [
  { id: "nightcap", label: "Nightcap mode", offer: "one easy, warm last stop nearby", fit: (s, c) => (lateish(c) ? 0.5 + s.cozy * 0.4 - s.lively * 0.2 : 0), match: (e) => T("jazz|piano|wine|cocktail|bar|comedy|acoustic|cabaret|lounge|whisk|listening|candle")(e) || matchV(e, "chill"), titles: ["Warm, close, one more round", "Nightcap mode: on"] },
  { id: "big-night", label: "Big night out", offer: "loud, late and worth staying up for", fit: (s, c) => (evening(c) ? s.lively * 0.9 + (s.energy > 0.7 ? 0.1 : 0) - s.cozy * 0.3 : 0), match: (e) => matchV(e, "dance") || matchV(e, "late") || T("party|dj|rave|live band|concert|club|disco")(e), titles: ["Still up for a dance?", "Tonight's not done with you"] },
  { id: "date-night", label: "Date night", offer: "something for the two of you", fit: (s, c) => (evening(c) && !lateish(c) ? 0.45 + (c.dow === 5 || c.dow === 6 ? 0.25 : 0) + s.energy * 0.15 : lateish(c) && (c.dow === 5 || c.dow === 6) ? 0.4 : 0), match: (e) => matchV(e, "date") || T("jazz|wine|cabaret|tango|salsa|candle|film|theat|tasting|chocolate")(e), titles: ["Just the two of you", "Make it a date"] },
  { id: "laugh", label: "Laugh it off", offer: "a guaranteed good laugh", fit: (s, c) => (evening(c) ? 0.4 + (1 - s.energy) * 0.25 + (c.dow === 1 || c.dow === 0 ? 0.1 : 0) : 0), match: (e) => e.cat === "Comedy" || T("comedy|stand-up|improv|sketch|funny")(e), titles: ["Laugh it off", "You need a good laugh"] },
  { id: "shake-week", label: "Shake off the week", offer: "a release after a long week", fit: (s, c) => (c.dow === 5 && c.hour >= 16 && c.hour < 22 ? 0.85 : 0), match: (e) => T("happy hour|live|band|dance|party|dj|drinks|karaoke")(e) || matchV(e, "dance"), titles: ["Shake off the week", "Week: over. Fun: on."] },
  { id: "after-work", label: "Easy after-work", offer: "short, close, no planning needed", fit: (s, c) => (c.dow >= 1 && c.dow <= 4 && c.hour >= 16 && c.hour < 21 ? 0.5 + (c.me.busyHours >= 4 ? 0.3 : 0) : 0), match: (e) => isFree(e) || matchV(e, "chill") || T("happy hour|talk|reading|jazz|comedy|tasting")(e), titles: ["Low effort, high reward", "Long day? Easy wins nearby"] },
  { id: "lazy-sunday", label: "Lazy Sunday", offer: "slow, easy, good for the soul", fit: (s, c) => (c.dow === 0 && c.hour < 16 ? 0.8 : 0), match: (e) => matchV(e, "sunday") || matchV(e, "chill") || T("brunch|market|flea|reading|garden|stroll|record")(e), titles: ["Slow Sunday, no plans required", "Sunday, unhurried"] },
  { id: "sunday-scaries", label: "Sunday-scaries cure", offer: "a soft landing before Monday", fit: (s, c) => (c.dow === 0 && c.hour >= 16 && c.hour < 21 ? 0.8 : 0), match: (e) => matchV(e, "chill") || T("comedy|jazz|film|trivia|reading|acoustic")(e), titles: ["Delay Monday a little", "Cure for the Sunday scaries"] },
  { id: "fresh-air", label: "Fresh-air reset", offer: "time outside while it's nice", fit: (s) => (s.nice ? 0.55 + s.energy * 0.3 : 0), match: outdoorish, titles: ["Too nice to stay in", "Go breathe some fresh air"] },
  { id: "wander", label: "Curious wander", offer: "something you didn't know existed", fit: (s, c) => ((c.dow === 6 || c.dow === 0) && c.hour >= 10 && c.hour < 18 ? 0.45 + s.novelty * 0.3 : 0.15 + s.novelty * 0.2), match: (e) => matchV(e, "weird") || matchV(e, "nyc") || T("tour|hidden|secret|behind the scenes|oddit|history|archive|walk")(e), titles: ["Feeling curious?", "Get a little lost"] },
  { id: "culture", label: "Culture fix", offer: "something to look at or think about", fit: (s, c) => (c.hour >= 10 && c.hour < 21 ? 0.35 + (1 - s.lively) * 0.2 : 0), match: (e) => matchV(e, "culture") || T("museum|exhibit|gallery|theat|talk|lecture|reading|opera|dance perf")(e), titles: ["Feed your head", "A little culture, please"] },
  { id: "feed-me", label: "Feed me", offer: "something delicious", fit: (s, c) => ((c.mins >= 690 && c.mins <= 840) || (c.mins >= 1050 && c.mins <= 1260) ? 0.5 : 0.1), match: (e) => e.cat === "Food & Drink" || matchV(e, "eat") || T("tasting|dumpling|food|supper|dinner|brunch|market|pizza|ramen")(e), titles: ["Hungry? Same.", "Follow your stomach"] },
  { id: "move", label: "Move your body", offer: "get the blood flowing", fit: (s, c) => (c.hour >= 7 && c.hour < 19 && s.energy >= 0.55 && !c.wx.rainNow ? 0.35 + s.energy * 0.3 : 0), match: (e) => matchV(e, "move") || T("yoga|run|dance class|bike|hike|climb|skat|swim|workout")(e), titles: ["Shake out the stiffness", "Move it, move it"] },
  { id: "hideout", label: "Rainy hideout", offer: "a dry, cozy place to be", fit: (s, c) => (c.wx.rainNow || c.wx.snowNow ? 0.85 : 0), match: (e) => !outdoorish(e), titles: ["Hide from the weather", "Stay dry, stay out"] },
  { id: "warm-up", label: "Warm-up", offer: "heated rooms and warm drinks", fit: (s, c) => (c.wx.feels != null && c.wx.feels <= 35 && !c.wx.rainNow ? 0.55 + (35 - c.wx.feels) / 60 : 0), match: (e) => !outdoorish(e) && (T("cocoa|tea|soup|ramen|whisk|wine|fondue|jazz|film|museum|bar|sauna|bath")(e) || matchV(e, "chill")), titles: ["Thaw out somewhere good", "Warm hands, warm hearts"] },
  { id: "explorer", label: "New-neighborhood explorer", offer: "the best of where you are right now", fit: (s, c) => (c.me.awayKm >= 3 ? 0.75 : 0), match: (e) => (e.tt?.mins ?? 99) <= 15, titles: ["While you're over here", "New block, new finds"] },
  { id: "early", label: "Early bird", offer: "worth getting up for", fit: (s, c) => (c.hour < 11 ? 0.5 : 0), match: () => true, titles: ["Worth getting up for", "Early birds, this way"] },
  { id: "free-ride", label: "Wallet off", offer: "great and free", fit: (s) => (s.spend < 0.45 ? 0.5 : 0.15), match: (e) => isFree(e), titles: ["Zero dollars, full night", "Wallet stays home"] },
];

// ── 3. Ranking
export function rankYou(ctx, events, store = {}, now = new Date()) {
  const s = readState(ctx);
  const slot = slotOf(now);
  const learn = store.learn?.[slot] || {};
  const mins = ctx.mins;
  // Doable now: running now, or starting within the horizon; never tomorrow
  const horizon = mins >= 17 * 60 ? 26 * 60 : mins + 5 * 60;
  const doable = events.filter((e) => {
    if (e.hidden || !evCovers(e, ctx.today)) return false;
    const st = startMinutes(e), en = endMinutes(e);
    if (st == null) return mins < 18 * 60 && !e.X; // all-day listings only count in the daytime, and not long runs
    const running = st <= mins && (en != null ? en > mins + 30 : st >= mins - 45);
    return running || (st > mins && st <= horizon);
  });
  const inBudget = (e) => isFree(e) || (priceNum(e) ?? 0) <= s.priceCap;
  // Strict first; if nothing fits, relax distance, then the indoor rule (thin feeds, very late hours)
  let out = [];
  for (const relax of [0, 1, 2]) {
    out = [];
    ARCHETYPES.forEach((a) => {
      const fit = a.fit(s, ctx);
      if (fit <= 0.2) return;
      const roof = (e) => relax >= 2 || s.cozy < 0.5 || a.id === "fresh-air" || a.id === "move" || !outdoorish(e);
      const reach = s.maxMins + [0, 20, 40][relax];
      let list = doable.filter((e) => a.match(e) && roof(e) && (e.tt?.mins ?? 99) <= reach && (relax > 0 || inBudget(e)));
      if (list.length < 2) return;
      list = list.map((e) => {
        const st = startMinutes(e);
        const soon = st == null ? 0 : st <= mins ? 6 : Math.max(0, 8 - (st - mins) / 30);
        return { e, r: e.sc + soon - (e.tt?.mins ?? 30) * 0.2 };
      }).sort((x, y) => y.r - x.r).map((x) => x.e);
      const top = list.slice(0, 4);
      const supply = Math.min(1, list.length / 4) * (top.reduce((acc, e) => acc + e.sc, 0) / top.length / 100);
      const learned = clamp(1 + 0.12 * (learn[a.id] || 0), 0.6, 1.5);
      out.push({ id: a.id, label: a.label, offer: a.offer, titles: a.titles, list, score: (0.65 * fit + 0.35 * supply) * learned * (1 - relax * 0.1) });
    });
    if (out.length) break;
  }
  out.sort((x, y) => y.score - x.score);
  const first = out[0] || null;
  const ids = new Set(first ? first.list.slice(0, 4).map((e) => e.id) : []);
  const second = first ? out.slice(1).find((x) => x.list.slice(0, 4).filter((e) => !ids.has(e.id)).length >= 2) || null : null;
  const readLine = s.why.length ? s.why.join(", ") : DAYN[ctx.dow] + " " + ctx.part;
  const fb = (a) => a && a.titles[Math.floor(ctx.today.getTime() / 86400000) % a.titles.length];
  return {
    state: s, slot, readLine,
    first: first && { ...first, fallback: fb(first) }, second: second && { ...second, fallback: fb(second) }, all: out,
  };
}

export function learnYou(store, slot, id, delta) {
  const learn = { ...(store.learn || {}) };
  learn[slot] = { ...(learn[slot] || {}), [id]: clamp((learn[slot]?.[id] || 0) + delta, -5, 6) };
  return { ...store, learn };
}
