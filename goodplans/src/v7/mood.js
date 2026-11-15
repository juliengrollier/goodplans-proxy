// The city's mood: what New York as a whole is doing right now (holidays, rituals, seasons, rare weather, feed clusters).
// The person's own mood lives in you.js.
// 1) buildContext() reads the moment: NYC calendar, weather now and in the next hours, time of week,
//    the user's own signals (calendar load, last save, streaks, away from home) and what the feed holds.
// 2) Every mood in MOODS says how well it fits that context (0–1), how rare it is, and which events match.
// 3) scoreMoods() ranks them by the context (rarity of the moment and fit); events only need to exist. Learned affinity nudges.
// The top mood is shown with a Claude-written title (title bank as fallback); the runner-up is offered as a chip.
import { isOutdoor, startMinutes, endMinutes, isoDay, isFree } from "./engine.js";
import { evCovers, matchV, kmdist } from "../lib/core.js";

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
      jump: w && wy ? w.hi - wy.hi : 0, eveRain: w?.evening ?? 0,
    },
    cal, longWeekend,
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
const fmtSun = (m) => `${Math.floor(m / 60) - 12}:${String(m % 60).padStart(2, "0")} PM`;

export const MOODS = [
  // City rituals and holidays
  { id: "marathon", rarity: 95, fit: (c) => (same(c.today, c.cal.marathon) ? 1 : 0), days: 1, match: any(T("marathon|runner|brunch|cheer"), (e) => matchV(e, "sunday")), titles: ["Cheer the runners, then brunch", "26.2 miles of reasons to go out"], facts: () => "NYC Marathon day" },
  { id: "halloween-night", rarity: 95, fit: (c) => (c.m === 9 && c.dom === 31 ? 1 : 0), days: 1, match: T("halloween|costume|parade|haunt|spook|horror|ghost"), titles: ["Costume required (basically)", "Boo-k your Halloween night"], facts: () => "It's Halloween; the Village parade is tonight" },
  { id: "halloween", rarity: 72, fit: (c) => (c.m === 9 && c.dom >= 17 && c.dom < 31 ? 0.6 + (c.dom - 17) / 35 : 0), days: 7, match: T("halloween|haunt|ghost|spook|costume|horror|zombie|witch|pumpkin|scary|occult|tarot"), titles: ["Spooky season, sorted", "Things that go bump this week"], facts: () => "Days before Halloween" },
  { id: "muertos", rarity: 80, fit: (c) => (c.m === 10 && c.dom <= 2 ? 1 : 0), days: 2, match: T("muertos|day of the dead|ofrenda|altar"), titles: ["Marigolds & memories", "Día de Muertos, done right"], facts: () => "Día de Muertos" },
  { id: "diwali", rarity: 85, fit: (c) => (within(c.today, addD(c.cal.diwali, -3), addD(c.cal.diwali, 2)) ? 1 : 0), days: 4, match: T("diwali|deepavali|bollywood|rangoli|diya"), titles: ["Lights up for Diwali", "Festival of lights, city edition"], facts: () => "Diwali" },
  { id: "thanksgiving-day", rarity: 98, fit: (c) => (c.cal.tgDay ? 1 : 0), days: 1, match: T("thanksgiving|parade|balloon|turkey|feast|football|friendsgiving|movie|film"), titles: ["Parade, pie, repeat", "Gobble now, nap later"], facts: () => "Thanksgiving Day; Macy's parade in the morning" },
  { id: "thanksgiving-week", rarity: 85, fit: (c) => (c.cal.tgWeek && !c.cal.tgDay ? 0.9 : 0), days: 5, match: T("thanksgiving|friendsgiving|turkey|parade|balloon|harvest|pie|feast|potluck|gratitude"), titles: ["Stretchy-pants week", "Friendsgiving energy"], facts: () => "Thanksgiving week" },
  { id: "black-friday", rarity: 85, fit: (c) => (c.cal.blackFriday ? 1 : 0), days: 1, match: any(T("market|vintage|flea|maker|craft|museum|walk|hike|film"), outdoorish), titles: ["Skip the mall, do this instead", "Black Friday, no lines"], facts: () => "Black Friday" },
  { id: "tree-lighting", rarity: 92, fit: (c) => (same(c.today, c.cal.treeLighting) ? 1 : 0), days: 1, match: T("tree|lighting|rockefeller|christmas|holiday|lights|rink|skat"), titles: ["The big tree goes on tonight", "Lights, crowds, cocoa"], facts: () => "Rockefeller tree lighting night" },
    { id: "season-opens", theme: "the Christmas season opening in New York", rarity: 60, fit: (c) => (within(c.today, D(c.y, 10, 8), addD(c.cal.tg, -4)) ? (c.dow === 0 || c.dow === 6 ? 0.7 : 0.6) : 0), days: 7, match: (e) => XMAS(e) && !TG(e), titles: ["Tinsel o'clock: the season's open", "Cocoa-in-hand season starts now"], facts: () => "The Christmas season is opening: the tree, rinks and holiday markets are arriving" },
    { id: "holiday-lights", theme: "peak Christmas lights and markets season", rarity: 62, fit: (c) => (within(c.today, addD(c.cal.tg, 4), D(c.y, 11, 17)) ? (c.hour >= 16 ? 0.8 : 0.65) : 0), days: 7, match: (e) => XMAS(e) || T("lights|dyker|window")(e), titles: ["Sparkle hunting season", "Peak twinkle"], facts: () => "Peak holiday lights and markets season" },
  { id: "hanukkah", rarity: 85, fit: (c) => (within(c.today, addD(c.cal.hanukkah, -1), addD(c.cal.hanukkah, 7)) ? 0.95 : 0), days: 3, match: T("hanukkah|chanukah|menorah|latke|jewish|klezmer|sufganiy"), titles: ["Latkes & lights", "Eight nights, good plans"], facts: () => "Hanukkah" },
  { id: "santacon", rarity: 80, fit: (c) => (same(c.today, c.cal.santacon) ? 0.8 : 0), days: 1, match: all(indoor, T(COZY)), titles: ["Santa-free zones", "Dodge the Santas"], facts: () => "SantaCon day; bars full of drunk Santas, these avoid it" },
  { id: "xmas-week", rarity: 88, fit: (c) => (c.m === 11 && c.dom >= 18 && c.dom <= 25 ? 1 : 0), days: 4, match: T("christmas|holiday|carol|nutcracker|santa|lights|market|rink|skat|movie|film"), titles: ["Jingle all the way out", "Last-minute magic"], facts: (c) => (c.dom === 25 ? "Christmas Day" : "Christmas week") },
  { id: "nye", rarity: 90, fit: (c) => (c.m === 11 && c.dom >= 27 ? 1 : 0), days: 5, match: T("new year|nye|countdown|midnight|champagne|ball drop|party|dance|fireworks"), titles: ["Exit the year with style", "Countdown candidates"], facts: () => "Days before New Year's Eve" },
  { id: "new-year", rarity: 80, fit: (c) => (c.m === 0 && c.dom <= 3 ? 1 : 0), days: 3, match: any(T("yoga|run|hike|walk|class|workshop|learn|museum"), outdoorish), titles: ["New year, new plans", "Resolution-friendly fun"], facts: () => "First days of the year" },
  { id: "lunar", rarity: 88, fit: (c) => (within(c.today, addD(c.cal.lunar, -2), addD(c.cal.lunar, 14)) ? (c.today <= addD(c.cal.lunar, 3) ? 1 : 0.6) : 0), days: 7, match: T("lunar new year|chinese new year|year of the|lion dance|chinatown|firecracker|dumpling"), titles: ["Lion dances & dumplings", "Gung hay fat choy, NYC"], facts: () => "Lunar New Year" },
  { id: "superbowl", rarity: 75, fit: (c) => (same(c.today, c.cal.superbowl) ? 0.8 : 0), days: 1, match: any(T("super bowl|football|watch party|wings"), all(indoor, T(COZY))), titles: ["Game day (or anti-game day)", "Touchdowns or tranquility"], facts: () => "Super Bowl Sunday" },
  { id: "valentine", rarity: 82, fit: (c) => (c.m === 1 && c.dom >= 8 && c.dom <= 14 ? 0.6 + (c.dom - 8) / 15 : 0), days: 7, match: any(T("valentine|romance|romantic|date night|couples|candle|wine|tango|salsa|jazz"), (e) => matchV(e, "date")), titles: ["Cupid's shortlist", "Date night, upgraded"], facts: () => "Valentine's week" },
  { id: "holi", rarity: 82, fit: (c) => (within(c.today, addD(c.cal.holi, -2), addD(c.cal.holi, 3)) ? 0.9 : 0), days: 4, match: T("holi|bollywood|spring festival|colou?r run"), titles: ["Throw some color around", "Holi, hello spring"], facts: () => "Holi" },
  { id: "eid", rarity: 82, fit: (c) => (within(c.today, addD(c.cal.eid, -1), addD(c.cal.eid, 3)) ? 0.9 : 0), days: 3, match: T("eid|ramadan|iftar|muslim|bazaar|halal"), titles: ["Eid, celebrated", "Feasts & festivities"], facts: () => "Eid al-Fitr" },
  { id: "stpat", rarity: 80, fit: (c) => (c.m === 2 && c.dom >= 14 && c.dom <= 17 ? 0.9 : 0), days: 4, match: T("st\\.? patrick|irish|celtic|parade|guinness|fiddle|trad"), titles: ["Green is the dress code", "Paddy's, but make it fun"], facts: () => "St. Patrick's Day" },
  { id: "spring-holidays", rarity: 70, fit: (c) => (within(c.today, addD(c.cal.passover, -1), addD(c.cal.passover, 2)) || within(c.today, addD(c.cal.easter, -2), c.cal.easter) ? 0.8 : 0), days: 3, match: T("easter|passover|seder|egg|bonnet|brunch|parade"), titles: ["Spring holidays, city style", "Bonnets, brunch & beyond"], facts: (c) => (same(c.today, c.cal.easter) ? "Easter Sunday; Fifth Avenue bonnet parade" : "Passover and Easter") },
  { id: "first-warm", rarity: 85, fit: (c) => (c.m >= 2 && c.m <= 4 && c.wx.hi >= 68 && c.wx.jump >= 8 && c.wx.pmax < 40 ? 1 : 0), days: 1, match: outdoorish, titles: ["Winter's over. Act accordingly.", "Coats off, plans on"], facts: (c) => `First proper warm day: ${c.wx.hi}°F, ${c.wx.jump}° warmer than yesterday` },
  { id: "memorial-fleet", rarity: 72, fit: (c) => (within(c.today, addD(c.cal.memorial, -6), c.cal.memorial) ? 0.85 : 0), days: 4, match: any(T("fleet week|ship|navy|parade|bbq|barbecue|beach|rooftop|boat|pier"), outdoorish), titles: ["Summer's unofficial kickoff", "Ships ahoy, grills on"], facts: () => "Memorial Day weekend and Fleet Week" },
  { id: "museum-mile", rarity: 80, fit: (c) => (same(c.today, c.cal.museumMile) ? 1 : 0), days: 1, match: T("museum|exhibit|gallery|art"), titles: ["Fifth Avenue's open house", "Museums, free, all mile long"], facts: () => "Museum Mile festival: free museums on Fifth Avenue" },
  { id: "pride", rarity: 65, fit: (c) => (c.m === 5 ? (within(c.today, addD(c.cal.pride, -3), c.cal.pride) ? 1 : 0.55) : 0), days: 5, match: T("pride|queer|lgbt|drag|dyke|trans|ballroom|vogue"), titles: ["Loud, proud & booked", "Pride, all month long"], facts: () => "Pride month" },
  { id: "mermaid", rarity: 85, fit: (c) => (same(c.today, c.cal.mermaid) ? 1 : 0), days: 1, match: T("mermaid|coney|beach|parade|boardwalk"), titles: ["Fins out in Coney Island", "Glitter, sand, sea creatures"], facts: () => "Mermaid Parade at Coney Island" },
  { id: "solstice", rarity: 70, fit: (c) => (c.m === 5 && c.dom >= 19 && c.dom <= 22 ? 0.75 : 0), days: 2, match: all(outdoorish, tn), titles: ["Longest day, longest night out", "Daylight till 8:30. Use it."], facts: () => "Summer solstice, sunset around 8:30 PM" },
  { id: "july4", rarity: 90, fit: (c) => (c.m === 6 && c.dom <= 4 ? (c.dom === 4 ? 1 : 0.7) : 0), days: 4, match: T("fourth of july|4th of july|independence|fireworks|bbq|barbecue|rooftop|pier|boat|beach"), titles: ["Sparklers & skylines", "Red, white & out"], facts: () => "Fourth of July" },
  { id: "summer-streets", rarity: 75, fit: (c) => (c.m === 7 && c.dow === 6 && c.dom <= 21 && c.hour < 13 ? 0.8 : 0), days: 1, match: any(T("summer streets|bike|walk|run|park avenue"), outdoorish), titles: ["Park Avenue, car-free", "The street is yours this morning"], facts: () => "Summer Streets Saturday: Park Avenue closed to cars" },
  { id: "us-open", rarity: 70, fit: (c) => (within(c.today, c.cal.usOpen, addD(c.cal.usOpen, 14)) ? 0.6 : 0), days: 3, match: T("tennis|us open|flushing|watch party"), titles: ["Game, set, plans", "Tennis fever in Queens"], facts: () => "US Open fortnight" },
  { id: "labor", rarity: 72, fit: (c) => (within(c.today, addD(c.cal.labor, -3), c.cal.labor) ? 0.85 : 0), days: 4, match: any(outdoorish, T("bbq|barbecue|beach|rooftop|boat|pier")), titles: ["Squeeze the last drop of summer", "Summer's encore"], facts: () => "Labor Day weekend, last of summer" },
  { id: "rosh", rarity: 75, fit: (c) => (within(c.today, addD(c.cal.rosh, -1), addD(c.cal.rosh, 1)) ? 0.8 : 0), days: 2, match: T("rosh hashanah|jewish|apple|honey|shofar|tashlich|klezmer"), titles: ["Sweet new year", "Apples, honey, good plans"], facts: () => "Rosh Hashanah" },
  { id: "ohny", rarity: 85, fit: (c) => (within(c.today, addD(c.cal.ohny, -1), addD(c.cal.ohny, 1)) ? 1 : 0), days: 2, match: T("open house|architecture|building|tour|behind the scenes|historic"), titles: ["Doors that are usually locked", "Nosy-neighbour weekend"], facts: () => "Open House New York weekend" },
  { id: "foliage", rarity: 60, fit: (c) => ((c.m === 9 && c.dom >= 18) || (c.m === 10 && c.dom <= 12) ? (c.wx.pmax < 40 && c.part !== "late" ? 0.8 : 0) : 0), days: 2, match: all(outdoorish, T("park|garden|walk|hike|botanical|tour|cemetery|green-wood|forest|river")), titles: ["Leaf-peeping, no car needed", "Peak orange, peak plans"], facts: () => "Peak fall foliage" },

  // Weather
  { id: "snow", rarity: 92, fit: (c) => (c.wx.snowNow ? 1 : c.wx.snowToday && c.part !== "late" ? 0.75 : 0), days: 1, match: any(all(outdoorish, T("park|walk|sled|skat|rink|garden")), all(indoor, T(COZY))), titles: ["Snow day, grown-up edition", "Flakes outside, fun inside"], facts: (c) => (c.wx.snowNow ? "It's snowing now" : "Snow forecast today") + `, ${c.wx.temp}°F` },
  { id: "warm-surprise", rarity: 80, fit: (c) => ((c.m >= 9 || c.m <= 2) && c.wx.jump >= 10 && c.wx.hi >= 55 && c.wx.pmax < 40 ? 0.95 : 0), days: 1, match: outdoorish, titles: ["Bonus warm day, don't waste it", "Fake spring: go outside"], facts: (c) => `${c.wx.hi}°F today, ${c.wx.jump}° warmer than yesterday` },

  { id: "long-weekend", rarity: 65, fit: (c) => (c.longWeekend ? 0.8 : 0), days: 4, match: (e) => e.tier === 1 || matchV(e, "big"), titles: ["Long weekend, big plans", "Three days. Use them all."], facts: () => "Long weekend" },


];

// ── 3. Scoring
export function scoreMoods(ctx, events, store = {}) {
  const shown = store.shown || {}, aff = store.aff || {};
  const pool = (days, match) => events.filter((e) => {
    if (e.hidden) return false;
    let ok = false;
    for (let k = 0; k < days && !ok; k++) {
      const d = addD(ctx.today, k);
      if (!evCovers(e, d)) continue;
      if (k > 0) { ok = true; break; }
      const en = endMinutes(e), s = startMinutes(e);
      ok = en != null ? en > ctx.mins : s == null || s > ctx.mins - 60;
    }
    return ok && match(e, ctx);
  }).sort((a, b) => b.sc - a.sc);
  const fill = (s) => s.replace("{hood}", ctx.feed.topHood || "").replace("{cat}", ctx.feed.spike || "");
  const out = [];
  MOODS.forEach((m) => {
    const fit = m.fit(ctx);
    if (!fit) return;
    const list = pool(m.days, m.match);
    if (list.length < (m.rarity >= 85 ? 1 : 2)) return;
    const top = list.slice(0, 4);
    const supply = Math.min(1, list.length / 5) * (top.reduce((a, e) => a + e.sc, 0) / top.length / 100) * (m.days > 1 ? 0.85 : 1);
    const affinity = Math.max(0.7, Math.min(1.3, 1 + 0.08 * (aff[m.id] || 0)));
    // Context first: the moment decides; events only need to exist (supply is a small tie-breaker)
    const score = (0.55 * (m.rarity / 100) + 0.4 * fit + 0.05 * supply) * affinity;
    out.push({ id: m.id, theme: m.theme || m.facts(ctx), score, list, titles: m.titles.map(fill), facts: m.facts(ctx), fallback: fill(m.titles[Math.floor(ctx.today.getTime() / 86400000) % m.titles.length]) });
  });
  out.sort((a, b) => b.score - a.score);
  const first = out[0] || null;
  const firstIds = new Set(first ? first.list.slice(0, 4).map((e) => e.id) : []);
  const second = first ? out.slice(1).find((x) => x.list.slice(0, 4).filter((e) => !firstIds.has(e.id)).length >= 2) || null : null;
  return { first, second, all: out };
}

// The moment in plain words, for the title writer
export function momentSummary(ctx) {
  const w = ctx.wx;
  const parts = [`${DAYN[ctx.dow]} ${ctx.part}`];
  if (w.ok) parts.push(`${w.temp}°F (feels ${w.feels}°F), ${w.rainNow ? "raining" : w.snowNow ? "snowing" : w.pmax + "% rain chance today"}`);
  return parts.join("; ");
}
