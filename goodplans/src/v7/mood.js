// The city's mood: what New York as a whole is doing right now (holidays, rituals, seasons, rare weather, feed clusters).
// The person's own mood lives in you.js.
// 1) buildContext() reads the moment: NYC calendar, weather now and in the next hours, time of week,
//    the user's own signals (calendar load, last save, streaks, away from home) and what the feed holds.
// 2) Every mood in MOODS says how well it fits that context (0–1), how rare it is, and which events match.
// 3) scoreMoods() ranks them by the context (rarity of the moment and fit); events only need to exist. Learned affinity nudges.
// The top mood is shown with a Claude-written title (title bank as fallback); the runner-up is offered as a chip.
import { isOutdoor, startMinutes, endMinutes, isoDay, isFree, fmtT, fmtDT } from "./engine.js";
import { evCovers, matchV, kmdist } from "../lib/core.js";
import { NYC, activeWindow, confirmedWindow } from "./nyc.js";

export const MOOD_KEY = "gp_mood_v1"; // { shown: {id: ts}, aff: {id: n} }

// ── Small helpers
const text = (e) => [e.title, e.desc, e.sub, e.cat, ...(e.kw || []), ...(e.tags || [])].join(" ").toLowerCase();
const OUT_RE = /outdoor|open[- ]air|rooftop|\bpark\b|pier|tree lighting|parade|street fair|garden|beach|picnic|walking tour|hike|waterfront|plaza|market\b|rink|skating|bike|kayak/;
export const outdoorish = (e) => isOutdoor(e) || OUT_RE.test(((e.title || "") + " " + (e.venue || "")).toLowerCase());
const D = (y, m, d) => new Date(y, m, d);
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const same = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const within = (d, a, b) => !!a && !!b && d >= a && d <= b;
const nthDow = (y, m, dow, n) => { const f = D(y, m, 1); return D(y, m, 1 + ((dow - f.getDay() + 7) % 7) + 7 * (n - 1)); };
const lastDow = (y, m, dow) => { const l = D(y, m + 1, 0); return D(y, m, l.getDate() - ((l.getDay() - dow + 7) % 7)); };
function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return D(y, mo - 1, da); }
// Lunar / lunisolar holidays: first full day, [month (0-based), day]. Approximate within a day; extend each year.
const TABLE = {
  lunar: { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26] },
  diwali: { 2026: [10, 8], 2027: [9, 29], 2028: [9, 17] },
  hanukkah: { 2026: [11, 5], 2027: [11, 25], 2028: [11, 13] },
  eid: { 2026: [2, 20], 2027: [2, 10], 2028: [1, 27] },
  roshhashanah: { 2026: [8, 12], 2027: [9, 2], 2028: [8, 21] },
  passover: { 2026: [3, 2], 2027: [3, 22], 2028: [3, 11] },
  holi: { 2026: [2, 4], 2027: [2, 22], 2028: [2, 11] },
};
const tbl = (k, y) => (TABLE[k][y] ? D(y, TABLE[k][y][0], TABLE[k][y][1]) : null);
const DAYN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── 1. Context
export function buildContext({ events, weather, now = new Date(), busySlots = [], calOk = false, home, homeBase, lastSaveAt, tasteLog = [] }) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear(), m = today.getMonth(), dom = today.getDate(), dow = today.getDay();
  const hour = now.getHours(), mins = hour * 60 + now.getMinutes();
  const iso = isoDay(today), yIso = isoDay(addD(today, -1));
  const w = weather?.byDate?.[iso] || null, wy = weather?.byDate?.[yIso] || null, wn = weather?.now || null;
  const hrs = (weather?.hours || []).filter((h) => h.t >= iso + "T" + String(hour).padStart(2, "0"));
  const next = (n) => hrs.slice(1, n + 1);
  const rainNow = !!wn?.rainingNow, snowNow = !!wn?.snowingNow;
  const rainIn = !rainNow ? next(4).findIndex((h) => h.pp >= 60) : -1;
  const clearIn = rainNow ? next(4).findIndex((h) => h.pp < 25) : -1;

  // Temperature trend: last 3 days vs today vs next 3 days
  const dayW = (k) => weather?.byDate?.[isoDay(addD(today, k))] || null;
  const past = [-3, -2, -1].map(dayW).filter(Boolean), fut = [1, 2, 3].map((k) => ({ k, w: dayW(k) })).filter((x) => x.w);
  const pastAvg = past.length ? past.reduce((a, x) => a + x.hi, 0) / past.length : null;
  const warmest = fut.sort((a, b) => b.w.hi - a.w.hi)[0];
  const trend = {
    drop: w && pastAvg != null ? Math.round(pastAvg - w.hi) : 0,
    firstFreeze: !!w && w.lo <= 32 && past.every((x) => x.lo > 32),
    warming: w && warmest ? warmest.w.hi - w.hi : 0, warmDayK: warmest?.k ?? null, warmHi: warmest?.w.hi ?? null,
    warmDays: fut.filter((x) => w && x.w.hi >= w.hi + 6).map((x) => isoDay(addD(today, x.k))),
  };
  const tg = nthDow(y, 10, 4, 4);
  const cal = {
    tg, tgWeek: within(today, addD(tg, -3), addD(tg, 3)), tgDay: same(today, tg), blackFriday: same(today, addD(tg, 1)),
    treeLighting: addD(tg, 6), // Wednesday after Thanksgiving
    marathon: nthDow(y, 10, 0, 1), dstEnd: nthDow(y, 10, 0, 1),
    easter: easter(y), memorial: lastDow(y, 4, 1), labor: nthDow(y, 8, 1, 1), mlk: nthDow(y, 0, 1, 3), presidents: nthDow(y, 1, 1, 3),
    mothers: nthDow(y, 4, 0, 2), superbowl: nthDow(y, 1, 0, 2), pride: lastDow(y, 5, 0),
    usOpen: lastDow(y, 7, 1), santacon: nthDow(y, 11, 6, 2), museumMile: nthDow(y, 5, 2, 2),
    mermaid: (() => { const s = D(y, 5, 21); return addD(s, (6 - s.getDay() + 7) % 7); })(),
    ohny: nthDow(y, 9, 6, 3), indigenous: nthDow(y, 9, 1, 2),
    dstStart: nthDow(y, 2, 0, 2),
    lunar: tbl("lunar", y), diwali: tbl("diwali", y), hanukkah: tbl("hanukkah", y), eid: tbl("eid", y),
    rosh: tbl("roshhashanah", y), passover: tbl("passover", y), holi: tbl("holi", y),
  };
  const mondayHolidays = [cal.mlk, cal.presidents, cal.memorial, cal.labor, cal.indigenous];
  const longWeekend = mondayHolidays.some((h) => within(today, addD(h, -3), h)) || (cal.tgWeek && dow >= 4);

  const todayBusy = calOk ? busySlots.filter((s) => s.date === iso) : [];
  const busyHours = todayBusy.reduce((a, s) => a + Math.max(0, (s.endH ?? s.startH + 1) - s.startH), 0);
  const eveningBusy = todayBusy.some((s) => (s.endH ?? s.startH + 1) > 17 && s.startH < 23);
  const daysSinceSave = lastSaveAt ? Math.floor((Date.now() - lastSaveAt) / 86400000) : null;
  const awayKm = home && homeBase ? kmdist(home, homeBase) : 0;
  const recentUps = tasteLog.filter((l) => (l.kind === "up" || (l.kind === "why" && String(l.reason).startsWith("up"))) && Date.now() - l.at < 7 * 86400000);
  const catCount = recentUps.reduce((mm, l) => ((mm[l.cat] = (mm[l.cat] || 0) + 1), mm), {});
  const streak = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  const live = events.filter((e) => !e.hidden);
  const notOver = (e) => { const em = endMinutes(e), sm = startMinutes(e); return em != null ? em > mins : sm == null || sm > mins - 60; };
  const todayEv = live.filter((e) => evCovers(e, today) && notOver(e));
  const hoodCount = {};
  todayEv.filter((e) => e.hood && e.sc >= 45 && (startMinutes(e) ?? 18 * 60) >= Math.max(mins, 16 * 60) - 60).forEach((e) => { hoodCount[e.hood] = (hoodCount[e.hood] || 0) + 1; });
  const nTonight = Object.values(hoodCount).reduce((a, b) => a + b, 0);
  // A cluster is interesting only away from the home neighbourhood and when it stands out from the rest
  const topHood = Object.entries(hoodCount).filter(([h, n]) => !/lower east side|^les$/i.test(h) && n / Math.max(1, nTonight) <= 0.6).sort((a, b) => b[1] - a[1])[0];
  const weekEv = live.filter((e) => { for (let k = 0; k < 7; k++) if (evCovers(e, addD(today, k))) return true; return false; });
  const catWeek = weekEv.reduce((mm, e) => ((mm[e.cat] = (mm[e.cat] || 0) + 1), mm), {});
  const spike = Object.entries(catWeek).filter(([c, n]) => c !== "Other" && n >= 8 && n / Math.max(1, weekEv.length) >= 0.22).sort((a, b) => b[1] - a[1])[0];

  return {
    now, today, y, m, dom, dow, hour, mins, iso,
    part: hour < 11 ? "morning" : hour < 14 ? "midday" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "late",
    wx: {
      ok: !!w, temp: wn?.temp ?? w?.hi ?? null, feels: wn?.feels ?? wn?.temp ?? null, hi: w?.hi ?? null, lo: w?.lo ?? null, pmax: w?.pmax ?? 0,
      rainNow, snowNow, snowToday: (w?.snow ?? 0) > 0.2, rainIn, clearIn, wind: wn?.wind ?? 0, sunset: w?.sunset ?? 17 * 60, eveTemp: w?.eveTemp ?? null,
      jump: w && wy ? w.hi - wy.hi : 0, eveRain: w?.evening ?? 0, ...trend,
    },
    cal, longWeekend, events: live,
    me: { busyHours, eveningBusy, calOk, daysSinceSave, awayKm, streak: streak && streak[1] >= 3 ? streak[0] : null },
    feed: { topHood: topHood && topHood[1] >= 3 ? topHood[0] : null, topHoodN: topHood?.[1] || 0, spike: spike ? spike[0] : null, freeTonight: todayEv.filter((e) => isFree(e) && (startMinutes(e) ?? 0) >= 17 * 60).length },
  };
}

// ── 2. Catalogue. id, rarity (0–100), fit(ctx) → 0..1, days (1 = today/tonight), match(e, ctx), titles (fallback bank), facts(ctx) for the writer
const tonightish = (c) => (e) => (startMinutes(e) ?? 19 * 60) >= Math.max(c.mins - 60, 16 * 60);
const indoor = (e) => !outdoorish(e);
const near = (n) => (e) => (e.tt?.mins ?? 99) <= n;
const T = (s) => { const r = new RegExp(s, "i"); return (e) => r.test(text(e)); };
const any = (...fs) => (e, c) => fs.some((f) => f(e, c));
const all = (...fs) => (e, c) => fs.every((f) => f(e, c));
const tn = (e, c) => tonightish(c)(e);
const COZY = "film|screening|cinema|museum|exhibit|gallery|jazz|piano|reading|book|tea|cocoa|hot chocolate|ramen|soup|wine|candle|acoustic|library|talk|comedy|theat|cabaret|board game|trivia|fondue|whisk";
const XMAS = T("christmas|xmas|holiday|tree lighting|tree arrives|\\btree\\b|santa|winter village|rink|skat|nutcracker|carol|festive|ornament|advent|gl[oö]gg|gingerbread|wreath");
const TG = T("thanksgiving|friendsgiving|turkey");
const DAYS_TO = (c, d) => Math.round((d - c.today) / 86400000);
const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const fmtSun = (m) => `${Math.floor(m / 60) - 12}:${String(m % 60).padStart(2, "0")} PM`;

export const MOODS = [
  // Clear seasonal and weather themes (plain, confident, context-first). key = what makes an event truly related.
  { id: "thanksgiving-soon", theme: "Thanksgiving is coming up", rarity: 78, fit: (c) => { const d = DAYS_TO(c, c.cal.tg); return d >= 5 && d <= 21 ? 0.55 + ((21 - d) / 21) * 0.4 : 0; }, days: 14, key: "thanksgiving|friendsgiving|turkey|pumpkin pie|pie[- ]making|gratitude|harvest (dinner|feast|market)|cranberr|stuffing|gravy", titles: ["Thanksgiving is coming", "Getting ready for Thanksgiving"], facts: (c) => `Thanksgiving is in ${DAYS_TO(c, c.cal.tg)} days, on ${fmtDate(c.cal.tg)}` },
  { id: "cold-snap", theme: "a sudden drop in temperature", rarity: 72, fit: (c) => (c.wx.drop >= 8 || c.wx.firstFreeze ? 0.6 + Math.min(0.35, Math.max(c.wx.drop, 8) / 40) : 0), days: 2, key: "cocoa|hot chocolate|soup|ramen|pho|fondue|sauna|bathhouse|bath house|spa|mulled|gl[oö]gg|hot cider|toddy|whisk|fireplace|knit|sweater|warm(ing|th)", titles: ["The cold is here", "Time to warm up"], facts: (c) => (c.wx.firstFreeze ? `First freeze of the season: low of ${fmtT(c.wx.lo)}` : `${fmtDT(c.wx.drop)} colder than the last few days: high of ${fmtT(c.wx.hi)} today`) },
  { id: "warming", theme: "warmer days ahead", rarity: 66, fit: (c) => (c.wx.warming >= 8 ? 0.55 + Math.min(0.35, c.wx.warming / 40) : 0), days: 4, key: "park|walk|hike|garden|market|rooftop|outdoor|open[- ]air|bike|pier|waterfront|picnic|tour", only: (e, c) => outdoorish(e) && c.wx.warmDays.some((d) => evCovers(e, new Date(d + "T12:00:00"))), titles: ["Warmer days ahead", "A warm spell is coming"], facts: (c) => `It warms up to ${fmtT(c.wx.warmHi)} in ${c.wx.warmDayK} day${c.wx.warmDayK > 1 ? "s" : ""} (${fmtDT(c.wx.warming)} warmer than today)` },
  { id: "last-leaves", theme: "the last autumn leaves falling", rarity: 62, fit: (c) => (c.m === 10 && c.dom >= 6 && c.dom <= 25 && c.wx.pmax < 50 ? (c.dow === 0 || c.dow === 6 ? 0.7 : 0.6) : 0), days: 4, key: "foliage|fall colou?r|autumn|leaves|leaf|arboretum|botanic|garden|green-wood|forest|nature walk|park walk|tree walk|ramble|wildlife", titles: ["The last leaves are falling", "Last call for autumn"], facts: () => "Late November: the last autumn leaves are coming down in the parks" },
  { id: "dark-evenings", theme: "darker evenings since the clocks went back", rarity: 66, fit: (c) => { const d = -DAYS_TO(c, c.cal.dstEnd); return d >= 0 && d <= 14 ? 0.75 - d / 30 : 0; }, days: 3, key: "sunset|stargaz|astronom|planetarium|night walk|lantern|light show|after dark|candlelight|night market|glow|illuminat|telescope", titles: ["Darker evenings are here", "Dark by 5? Make it count"], facts: (c) => `The clocks went back ${-DAYS_TO(c, c.cal.dstEnd)} days ago; sunset is now around ${fmtSun(c.wx.sunset)}` },
  { id: "light-evenings", theme: "lighter evenings since the clocks went forward", rarity: 66, fit: (c) => { const d = -DAYS_TO(c, c.cal.dstStart); return d >= 0 && d <= 12 ? 0.75 - d / 30 : 0; }, days: 3, key: "sunset|rooftop|evening walk|golden hour|outdoor|waterfront|pier|park", only: outdoorish, titles: ["Light evenings are back", "Sunset after 7 again"], facts: (c) => `The clocks went forward ${-DAYS_TO(c, c.cal.dstStart)} days ago; sunset is now around ${fmtSun(c.wx.sunset)}` },

    { id: "season-opens", theme: "the Christmas season opening in New York", rarity: 55, fit: (c) => (within(c.today, D(c.y, 10, 8), addD(c.cal.tg, -4)) ? (c.dow === 0 || c.dow === 6 ? 0.7 : 0.6) : 0), days: 7, match: (e) => XMAS(e) && !TG(e), titles: ["Tinsel o'clock: the season's open", "Cocoa-in-hand season starts now"], facts: () => "The Christmas season is opening: the tree, rinks and holiday markets are arriving" },
    { id: "holiday-lights", theme: "peak Christmas lights and markets season", rarity: 62, fit: (c) => (within(c.today, addD(c.cal.tg, 4), D(c.y, 11, 17)) ? (c.hour >= 16 ? 0.8 : 0.65) : 0), days: 7, match: (e) => XMAS(e) || T("lights|dyker|window")(e), titles: ["Sparkle hunting season", "Peak twinkle"], facts: () => "Peak holiday lights and markets season" },
  { id: "first-warm", rarity: 85, fit: (c) => (c.m >= 2 && c.m <= 4 && c.wx.hi >= 68 && c.wx.jump >= 8 && c.wx.pmax < 40 ? 1 : 0), days: 1, match: outdoorish, titles: ["Winter's over. Act accordingly.", "Coats off, plans on"], facts: (c) => `First proper warm day: ${fmtT(c.wx.hi)}, ${fmtDT(c.wx.jump)} warmer than yesterday` },
  { id: "foliage", theme: "peak autumn colours", rarity: 60, fit: (c) => ((c.m === 9 && c.dom >= 18) || (c.m === 10 && c.dom <= 5) ? (c.wx.pmax < 40 && c.part !== "late" ? 0.8 : 0) : 0), days: 2, match: all(outdoorish, T("park|garden|walk|hike|botanical|tour|cemetery|green-wood|forest|river")), titles: ["Leaf-peeping, no car needed", "Peak orange, peak plans"], facts: () => "Peak fall foliage" },

  // Weather
  { id: "snow", rarity: 92, fit: (c) => (c.wx.snowNow ? 1 : c.wx.snowToday && c.part !== "late" ? 0.75 : 0), days: 1, match: any(all(outdoorish, T("park|walk|sled|skat|rink|garden")), all(indoor, T(COZY))), titles: ["Snow day, grown-up edition", "Flakes outside, fun inside"], facts: (c) => (c.wx.snowNow ? "It's snowing now" : "Snow forecast today") + `, ${fmtT(c.wx.temp)}` },
  { id: "warm-surprise", rarity: 80, fit: (c) => ((c.m >= 9 || c.m <= 2) && c.wx.jump >= 10 && c.wx.hi >= 55 && c.wx.pmax < 40 ? 0.95 : 0), days: 1, match: outdoorish, titles: ["Bonus warm day, don't waste it", "Fake spring: go outside"], facts: (c) => `${fmtT(c.wx.hi)} today, ${fmtDT(c.wx.jump)} warmer than yesterday` },

  { id: "long-weekend", rarity: 65, fit: (c) => (c.longWeekend ? 0.8 : 0), days: 4, match: (e) => e.tier === 1 || matchV(e, "big"), titles: ["Long weekend, big plans", "Three days. Use them all."], facts: () => "Long weekend" },


];

// The city's own calendar (nyc.js) becomes moods too, ranked by how much the whole city feels them
const dayDiff = (a, b) => Math.round((a - b) / 86400000);
const fmtShort = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
NYC.forEach((n) => {
  const win = (c) => (n.confirm ? confirmedWindow(n, c.today, c.events) : activeWindow(n, c.today));
  MOODS.push({
    id: "nyc-" + n.id, theme: n.name, rarity: n.p, key: n.key, titles: n.titles, nyc: true,
    fit: (c) => {
      const aw = win(c);
      if (!aw || (n.only && !n.only(c))) return 0;
      if (aw.phase === "during") return 1;
      const lead = Math.max(1, n.lead ?? 2);
      return 0.6 + 0.3 * (1 - dayDiff(aw.start, c.today) / lead);
    },
    daysFor: (c) => { const aw = win(c); return aw ? Math.min(10, dayDiff(aw.end, c.today) + 1) : 1; },
    facts: (c) => {
      const aw = win(c);
      if (!aw) return n.name;
      if (aw.phase === "before") { const k = dayDiff(aw.start, c.today); return `${n.name} is ${k === 1 ? "tomorrow" : "in " + k + " days"}, on ${fmtShort(aw.start)}`; }
      return dayDiff(aw.end, aw.start) === 0 ? `${n.name} is today` : `${n.name} is on now, until ${fmtShort(aw.end)}`;
    },
  });
});

// ── 3. Scoring
export function scoreMoods(ctx, events, store = {}) {
  const aff = store.aff || {};
  // Upcoming within the mood's window; today's undated listings drop out after 6 PM (they may be over)
  const inWindow = (e, days) => {
    for (let k = 0; k < days; k++) {
      const d = addD(ctx.today, k);
      if (!evCovers(e, d)) continue;
      if (k > 0) return true;
      const en = endMinutes(e), st = startMinutes(e);
      if (st == null) return ctx.mins < 18 * 60 || (e.X && e.X !== e.E);
      return en != null ? en > ctx.mins : st > ctx.mins - 60;
    }
    return false;
  };
  const out = [];
  MOODS.forEach((m) => {
    const fit = m.fit(ctx);
    if (!fit) return;
    const keyRe = m.key ? new RegExp(m.key, "i") : null;
    // Relevance: 2 = the title says it, 1 = the description or keywords do, 0 = unrelated (left out)
    const rel = (e) => {
      if (keyRe) { if (keyRe.test(e.title || "")) return 2; if (keyRe.test(text(e))) return 1; return 0; }
      return m.match(e, ctx) ? 1 : 0;
    };
    const days = m.daysFor ? m.daysFor(ctx) : m.days;
    const list = events.filter((e) => !e.hidden && inWindow(e, days) && (!m.only || m.only(e, ctx)))
      .map((e) => ({ e, r: rel(e) })).filter((x) => x.r > 0)
      .sort((x, y) => (y.r - x.r) || ((x.e.E < y.e.E ? -1 : x.e.E > y.e.E ? 1 : 0)) || (y.e.sc - x.e.sc)).map((x) => x.e);
    if (!keyRe && list.length < 1) return; // holidays need at least one real event; clear themes can stand alone
    const top = list.slice(0, 4);
    const supply = top.length ? Math.min(1, list.length / 4) * (top.reduce((acc, e) => acc + e.sc, 0) / top.length / 100) : 0;
    const affinity = Math.max(0.7, Math.min(1.3, 1 + 0.08 * (aff[m.id] || 0)));
    // City events outrank weather and seasons: the city's own calendar gets a bonus
    const score = (0.55 * (m.rarity / 100) + 0.4 * fit + 0.05 * supply + (m.nyc ? 0.06 : 0)) * affinity;
    const fill = (x) => x.replace("{hood}", "").replace("{cat}", "");
    out.push({ id: m.id, theme: m.theme || m.facts(ctx), score, list, titles: m.titles.map(fill), facts: m.facts(ctx), fallback: fill(m.titles[Math.floor(ctx.today.getTime() / 86400000) % m.titles.length]) });
  });
  out.sort((a, b) => b.score - a.score);
  const first = out[0] || null;
  const second = first ? out.find((x) => x.id !== first.id) || null : null;
  return { first, second, all: out };
}

// The moment in plain words, for the title writer
export function momentSummary(ctx) {
  const w = ctx.wx;
  const parts = [`${DAYN[ctx.dow]} ${ctx.part}`];
  if (w.ok) parts.push(`${fmtT(w.temp)} (feels ${fmtT(w.feels)}), ${w.rainNow ? "raining" : w.snowNow ? "snowing" : w.pmax + "% rain chance today"}`);
  return parts.join("; ");
}

// One icon per city theme, shown before the City pulse title
export const MOOD_ICON = {
  "thanksgiving-soon": "🦃", "cold-snap": "🥶", "warming": "☀️", "last-leaves": "🍂", "dark-evenings": "🌙", "light-evenings": "🌅",
  "season-opens": "🎄", "holiday-lights": "✨", "first-warm": "🌷", "foliage": "🍁", "snow": "❄️", "warm-surprise": "😎", "long-weekend": "🗓️",
  "nyc-nye": "🎆", "nyc-polar-bear": "🐻‍❄️", "nyc-restaurant-week-w": "🍽️", "nyc-restaurant-week-s": "🍽️", "nyc-lunar": "🧧", "nyc-black-history": "✊🏿",
  "nyc-fashion-week-feb": "👠", "nyc-fashion-week-sep": "👠", "nyc-valentine": "❤️", "nyc-westminster": "🐕", "nyc-womens-history": "♀️", "nyc-holi": "🎨",
  "nyc-eid": "🌙", "nyc-stpat": "☘️", "nyc-greek-parade": "🇬🇷", "nyc-flower-show": "💐", "nyc-passover": "🍷", "nyc-easter": "👒", "nyc-cherry": "🌸",
  "nyc-tribeca": "🎬", "nyc-five-boro": "🚴", "nyc-aapi": "🏮", "nyc-frieze": "🖼️", "nyc-fleet-week": "⚓", "nyc-manhattanhenge-may": "🌇", "nyc-manhattanhenge-jul": "🌇",
  "nyc-pride-month": "🏳️‍🌈", "nyc-pride-march": "🏳️‍🌈", "nyc-museum-mile": "🏛️", "nyc-gov-ball": "🎤", "nyc-puerto-rican": "🇵🇷", "nyc-philippine": "🇵🇭",
  "nyc-israel-day": "🇮🇱", "nyc-juneteenth": "✊🏿", "nyc-mermaid": "🧜", "nyc-summerstage": "🎶", "nyc-shakespeare": "🎭", "nyc-summer-for-city": "💃",
  "nyc-broadway-bryant": "🎭", "nyc-july4": "🎆", "nyc-summer-streets": "🛼", "nyc-harlem-week": "🎷", "nyc-dominican": "🇩🇴", "nyc-india-day": "🇮🇳",
  "nyc-us-open": "🎾", "nyc-west-indian": "🥁", "nyc-tribute-light": "🕯️", "nyc-san-gennaro": "🇮🇹", "nyc-hispanic-heritage": "🪇", "nyc-steuben": "🇩🇪",
  "nyc-african-american-parade": "✊🏿", "nyc-rosh": "🍎", "nyc-oktoberfest": "🍺", "nyc-atlantic-antic": "🎪", "nyc-nyff": "🎞️", "nyc-pulaski": "🇵🇱",
  "nyc-comic-con": "🦸", "nyc-columbus": "🎺", "nyc-ohny": "🏙️", "nyc-wine-food": "🍷", "nyc-dog-halloween": "🐶", "nyc-halloween": "🎃", "nyc-muertos": "💀",
  "nyc-marathon": "🏃", "nyc-diwali": "🪔", "nyc-veterans": "🎖️", "nyc-thanksgiving": "🦃", "nyc-tree-lighting": "🎄", "nyc-hanukkah": "🕎", "nyc-dyker": "💡",
  "nyc-santacon": "🎅", "nyc-christmas": "🎄", "nyc-kwanzaa": "🕯️",
};
