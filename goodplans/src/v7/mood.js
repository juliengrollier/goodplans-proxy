// "Mood of the moment": picks the most fitting theme for right now from the calendar (holidays and seasons),
// the weather (rain, cold, heat, a nice day) and the time (weekday evening, weekend night, Sunday...).
// Each candidate has a priority and a matcher; the winner is the highest priority with at least 2 good events.
import { isOutdoor, startMinutes, endMinutes, isoDay, isFree } from "./engine.js";
import { evCovers, matchV } from "../lib/core.js";

const text = (e) => [e.title, e.desc, e.sub, e.cat, ...(e.kw || []), ...(e.tags || [])].join(" ").toLowerCase();
const has = (re) => (e) => re.test(text(e));

const HALLOWEEN = /halloween|haunt|ghost|spook|costume|horror|zombie|witch|day of the dead|d[ií]a de (los )?muertos|pumpkin|scary/;
const THANKS = /thanksgiving|friendsgiving|turkey|parade|balloon|gratitude|harvest|pie|feast|potluck/;
const HOLIDAY = /christmas|xmas|holiday|tree lighting|lights|santa|winter village|nutcracker|carol|menorah|hanukkah|chanukah|kwanzaa|ice skat|rink|holiday market|gift|ornament|snow|festive|yule|wreath/;
const NYE = /new year|nye|countdown|midnight|ball drop|champagne|resolution/;
const VALENTINE = /valentine|love|romance|romantic|date night|couples|galentine/;
const STPAT = /st\.? patrick|irish|parade|celtic|guinness/;
const PRIDE = /pride|queer|lgbt|drag|dyke march/;
const JULY4 = /fourth of july|4th of july|independence|fireworks|bbq|barbecue/;
const LUNAR = /lunar new year|chinese new year|year of the|lion dance|firecracker/;
const COZY = /film|screening|cinema|museum|exhibit|gallery|jazz|piano|reading|book|tea|cocoa|hot chocolate|ramen|soup|bar|wine|candle|acoustic|library|talk|comedy|theat|cabaret|board game|trivia/;
const HEAT = /pool|swim|beach|water|pier|river|ferry|ice cream|rooftop|evening|night|sunset|outdoor movie|shade|air[- ]?condition|museum|cinema/;

const OUT_RE = /outdoor|open[- ]air|rooftop|\bpark\b|pier|tree lighting|parade|street fair|garden|beach|picnic|walking tour|hike|waterfront|plaza|market\b|rink|skating/;
const outdoorish = (e) => isOutdoor(e) || OUT_RE.test(((e.title || "") + " " + (e.venue || "")).toLowerCase());

// 4th Thursday of November
function thanksgiving(y) { const d = new Date(y, 10, 1); d.setDate(1 + ((4 - d.getDay() + 7) % 7) + 21); return d; }
const between = (d, a, b) => d >= a && d <= b;
const dayAt = (y, m, dd) => new Date(y, m, dd);

export function pickMood({ events, weather, now = new Date() }) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear(), dow = today.getDay(), mins = now.getHours() * 60 + now.getMinutes(), hour = now.getHours();
  const w = weather?.byDate?.[isoDay(today)] || null;
  const temp = weather?.now?.temp ?? w?.hi ?? null;
  const raining = !!weather?.now?.rainingNow;
  const evening = hour >= 17, late = hour >= 21 || hour < 3, weekend = dow === 0 || dow === 6 || (dow === 5 && evening);

  // Events still ahead: today (not over), plus the next days for themes that last longer
  const notOver = (e) => { const em = endMinutes(e), sm = startMinutes(e); return em != null ? em > mins : sm == null || sm > mins - 60; };
  const inDays = (n) => (e) => {
    for (let k = 0; k < n; k++) { const d = new Date(today); d.setDate(d.getDate() + k); if (evCovers(e, d) && (k > 0 || notOver(e))) return true; }
    return false;
  };
  const pool = (n, fn) => events.filter((e) => !e.hidden && inDays(n)(e) && fn(e)).sort((a, b) => b.sc - a.sc);

  const tg = thanksgiving(y), tgStart = new Date(tg), tgEnd = new Date(tg);
  tgStart.setDate(tg.getDate() - 4); tgEnd.setDate(tg.getDate() + 3);
  const C = [];
  const add = (pri, title, sub, icon, days, fn) => C.push({ pri, title, sub, icon, days, fn });

  // Calendar
  if (between(today, dayAt(y, 9, 18), dayAt(y, 9, 31))) add(85, "Halloween's best", today.getDate() === 31 ? "It's Halloween. Costumes encouraged." : "Spooky season picks before the 31st", "spark", 7, has(HALLOWEEN));
  if (between(today, tgStart, tgEnd)) add(86, today.getTime() === tg.getTime() ? "Thanksgiving is here" : "Thanksgiving week", "Parades, feasts and things to do with the long weekend", "spark", 5, has(THANKS));
  if (between(today, dayAt(y, 10, 8), dayAt(y, 11, 17)) && !between(today, tgStart, tgEnd)) add(78, today < tg ? "The holiday season starts" : "Holiday lights & markets", today < tg ? "Trees, markets and rinks are opening around town" : "Lights, markets and festive nights", "spark", 7, has(HOLIDAY));
  if (between(today, dayAt(y, 11, 18), dayAt(y, 11, 25))) add(88, "Christmas week", "The most festive things left before the 25th", "spark", 5, has(HOLIDAY));
  if (between(today, dayAt(y, 11, 26), dayAt(y, 11, 31))) add(88, "Countdown to New Year", "Ways to see the year out", "spark", 6, (e) => has(NYE)(e) || has(HOLIDAY)(e));
  if (between(today, dayAt(y, 1, 8), dayAt(y, 1, 14))) add(80, "Valentine's, sorted", "Date-worthy plans for the two of you", "spark", 7, (e) => has(VALENTINE)(e) || matchV(e, "date"));
  if (between(today, dayAt(y, 2, 13), dayAt(y, 2, 17))) add(78, "St. Patrick's in the city", "Parade, pubs and fiddles", "spark", 5, has(STPAT));
  if (today.getMonth() === 5) add(70, "Pride month", "Parties, parades and queer culture", "spark", 7, has(PRIDE));
  if (between(today, dayAt(y, 5, 30), dayAt(y, 6, 4))) add(82, "Fourth of July", "Fireworks and summer nights", "spark", 5, has(JULY4));
  if (between(today, dayAt(y, 0, 20), dayAt(y, 1, 20))) add(72, "Lunar New Year", "Parades, lion dances and feasts", "spark", 10, has(LUNAR));

  // Weather
  const indoor = (e) => !outdoorish(e);
  if (raining || (w && (w.pmax >= 60 || w.rainy) && !late)) add(raining ? 95 : 82, raining ? "Beat the rain indoors" : "Rain's coming: stay dry", raining ? "It's raining now. Good plans with a roof." : `${w.pmax}% chance of rain today`, "rain", 1, indoor);
  if (temp != null && temp <= 40) add(65, evening ? "Cozy up on a cold night" : "Warm up on a cold " + (hour < 12 ? "morning" : "afternoon"), `${temp}°F out. Warm rooms, good company.`, "cloud", 1, (e) => indoor(e) && has(COZY)(e));
  if (temp != null && temp >= 86) add(65, "Beat the heat", `${temp}°F. Water, shade and cool rooms.`, "sun", 1, has(HEAT));
  if (temp != null && temp >= 60 && temp <= 80 && w && w.pmax < 25 && !late) add(weekend ? 68 : 58, "Get outside while it's nice", `${temp}°F and dry`, "sun", 1, outdoorish);
  if (w && temp != null && temp > 40 && w.pmax < 30 && hour < w.sunset / 60 && hour >= 14) add(52, "Catch the golden hour", "Sunset spots and open-air evenings", "sun", 1, (e) => outdoorish(e) && (startMinutes(e) ?? 0) >= w.sunset - 120);

  // Time of week
  if (dow === 0 && hour < 18) add(55, "Sunday reset", "Slow, easy, good for the soul", "spark", 1, (e) => matchV(e, "sunday"));
  if ((dow === 5 || dow === 6) && evening) add(54, "Out late tonight", "Dance floors and late shows", "spark", 1, (e) => (startMinutes(e) ?? 0) >= 21 * 60 || matchV(e, "late") || matchV(e, "dance"));
  if (dow >= 1 && dow <= 4 && hour >= 15 && hour < 21) add(48, "After-work unwind", "Easy, nearby and done by bedtime", "spark", 1, (e) => (e.tt?.mins ?? 99) <= 25 && (startMinutes(e) ?? 0) >= 17 * 60 && (startMinutes(e) ?? 0) <= 20 * 60);
  if (hour < 11) add(45, "Start the day well", "Morning plans worth getting up for", "sun", 1, (e) => (startMinutes(e) ?? 0) < 13 * 60);
  if (dow === 6 && hour < 17) add(50, "Saturday, wide open", "The day's best, free ones first", "spark", 1, (e) => isFree(e));

  const ranked = C.map((c) => ({ ...c, list: pool(c.days, c.fn) })).filter((c) => c.list.length >= 2).sort((a, b) => b.pri - a.pri);
  return ranked[0] || null;
}
