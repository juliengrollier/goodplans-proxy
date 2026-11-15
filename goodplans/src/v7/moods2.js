// Mood engine v3.
// 1. Candidates at four levels of a hierarchy (family > category > sub-type > specific activity), plus emergent
//    themes mined from the feed's own keywords, lens cuts of big groups (late, free, weeknight…) and one-offs.
// 2. Each candidate is described by what is actually true of most of its events (free, late, one area), and those
//    facts write its title, so names come from the data rather than a fixed template.
// 3. Relevance = taste fit (shrunk toward the feed average) + how soon it is reachable + a Thompson-sampled estimate
//    of how much you engage with this mood (clicks, thumbs, hearts, and impressions you ignored on previous days),
//    pooled by family so a new mood inherits what its family has taught. Specificity and group size trade off, so a
//    thin "pickleball" backs off to its parent automatically. Rainy days damp outdoor groups.
// 4. Selection maximises a submodular objective: relevance, minus overlap with what is already shown (shared events,
//    parent/child), plus diminishing-returns coverage of families and of "thing" vs "moment" moods.
import { CATEGORIES, FAM } from "./taxonomy.js";
import { daysUntil, runLen } from "../lib/core.js";
import { isFree, startMinutes, isOutdoor, whenLabel } from "./engine.js";

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const SEEN_KEY = "gp_moodseen_v1";
const NICHE = [
  ["pickleball", /pickleball/], ["tennis & padel", /padel|\btennis\b(?!.*table)/], ["basketball", /basketball|hoops/], ["soccer", /soccer|futsal/], ["kickball & softball", /kickball|softball/], ["volleyball", /volleyball/],
  ["bowling", /bowling/], ["ping pong", /ping ?pong|table tennis/], ["mini golf", /mini ?golf|putt-?putt/], ["axe throwing", /axe throw/], ["darts", /\bdarts\b/], ["pool & billiards", /billiards|pool (hall|league|tournament)/],
  ["skee-ball & arcades", /skee|arcade|pinball/], ["VR", /virtual reality|\bvr\b/], ["escape rooms", /escape (room|game)/], ["trivia", /trivia|quiz night/], ["bingo", /bingo/], ["board games", /board game|game night|tabletop/],
  ["chess", /\bchess\b/], ["mahjong", /mahjong/], ["poker", /poker/], ["D&D", /d&d|dungeons/], ["karaoke", /karaoke/],
  ["improv", /improv/], ["stand-up", /stand-?up/], ["open mics", /open mic/], ["storytelling", /storytell|\bmoth\b/], ["drag", /\bdrag (show|brunch|bingo|night|queen)/], ["burlesque & cabaret", /burlesque|cabaret/], ["magic", /magic (show|night)|magician/],
  ["beer gardens", /beer garden|biergarten|oktoberfest/], ["rooftops", /rooftop (bar|party|happy hour|lounge)/], ["wine", /wine (tasting|bar|class|night)|natural wine/], ["beer", /brewery|taproom|beer (tasting|fest)/], ["whiskey & spirits", /whisk|mezcal|tequila|\bsake\b/], ["cocktails", /cocktail/],
  ["coffee", /coffee (tasting|crawl|class)|cupping/], ["cheese & chocolate", /cheese|chocolate/], ["dumplings", /dumpling/], ["pizza", /pizza/], ["noodles", /ramen|noodle/], ["tacos", /\btacos?\b/], ["brunch", /brunch/], ["food crawls", /food crawl|\bcrawl\b/],
  ["supper clubs", /supper club|pop-?up dinner/], ["night markets", /night market|smorgasburg/], ["flea markets", /flea|thrift|vintage market/], ["record fairs", /record (fair|swap|show)/],
  ["pottery", /pottery|ceramic|wheel throw/], ["painting nights", /paint(ing)? (class|night)|paint (and|&) sip|sip (and|&) paint/], ["life drawing", /life drawing/], ["printmaking", /printmaking|screen ?print|risograph/],
  ["knitting & crochet", /knit|crochet|embroider/], ["cooking classes", /cooking class|pasta[- ]making|dumpling[- ]making|baking class/], ["woodworking & crafts", /woodwork|leather|jewelry making|candle making|terrarium/], ["flowers", /flower arrang|floral/],
  ["run clubs", /run club|running club|group run/], ["races & 5Ks", /\b5k\b|\b10k\b|marathon|turkey trot/], ["group rides", /group ride|bike ride|critical mass/], ["climbing", /climb|boulder/], ["ice skating", /ice skat|\brink\b/],
  ["roller skating", /roller (skat|disco|derby)/], ["kayaking", /kayak|paddle|canoe/], ["yoga", /yoga/], ["sound baths", /sound bath|breathwork|meditat/], ["pilates & barre", /pilates|barre/], ["hikes", /\bhik(e|ing)/], ["boxing & martial arts", /boxing|muay|jiu-?jitsu|karate|martial/],
  ["swing dancing", /swing danc|lindy/], ["salsa & bachata", /salsa|bachata/], ["tango", /tango/], ["silent discos", /silent disco/], ["house & techno", /techno|house music|\brave\b/],
  ["jazz", /\bjazz\b|bebop/], ["blues", /\bblues\b/], ["classical", /classical|orchestra|symphon|chamber music|string quartet/], ["opera", /\bopera\b/], ["ballet", /ballet|nutcracker/], ["folk & bluegrass", /folk|bluegrass/], ["hip-hop", /hip-?hop|\brap\b/],
  ["punk & metal", /punk|metal|hardcore/], ["singer-songwriters", /singer-?songwriter|acoustic/], ["jam sessions", /jam session/], ["outdoor cinema", /rooftop (film|cinema)|outdoor (film|movie)|movie in the park/], ["horror films", /horror/], ["documentaries", /documentar/],
  ["poetry", /poetry|\bpoets?\b/], ["book launches", /book launch|author talk/], ["zines", /\bzine/], ["history walks", /history walk|walking tour|tenement/], ["ghost tours", /ghost|haunted/], ["architecture", /architecture (tour|walk)|open house new york/], ["art openings", /opening reception|gallery opening/],
  ["immersive theatre", /immersive/], ["puppets", /puppet/], ["circus", /circus|acrobat/], ["language exchanges", /language (exchange|cafe)|conversation (hour|club)/], ["mixers", /speed dating|mixer|singles/], ["volunteering", /volunteer|clean-?up|community garden/],
  ["birdwatching", /bird(ing|watch| walk)/], ["stargazing", /stargaz|astronomy|planetarium/], ["holiday markets", /holiday market|christmas market|winter village/],
];
const TITLES = {
  play: ["{X}, anyone?", "Game on: {x}", "{X} this fortnight", "Your {x} fix"],
  move: ["Get moving: {x}", "Break a sweat: {x}", "Up and at it: {x}", "Sweat a little: {x}"],
  make: ["Hands-on: {x}", "Make something: {x}", "Get your hands dirty: {x}", "Try your hand at {x}"],
  party: ["Out out: {x}", "Go on, {x}", "Make a night of it: {x}", "Dancing shoes: {x}"],
  eat: ["Hungry for {x}?", "Eat and drink: {x}", "Pull up a chair: {x}", "{X}, please"],
  watch: ["Front row: {x}", "Lights down: {x}", "On the bill: {x}", "Sit back for {x}"],
  listen: ["Ears open: {x}", "Tune in: {x}", "{X}, live and local", "Turn it up: {x}"],
  learn: ["Learn something: {x}", "Curious about {x}?", "Smarter evenings: {x}", "Fresh angles: {x}"],
  explore: ["Go see: {x}", "Wander: {x}", "Out of the apartment: {x}", "Worth the trip: {x}"],
};
const FAM_TITLE = { watch: "Something to watch", listen: "Something to hear", eat: "Something to eat", party: "Somewhere to dance", play: "Something to play", make: "Something to make", move: "Something to sweat through", explore: "Somewhere to wander", learn: "Something to learn" };
const VERB_OF_FAM = { watch: "watch", listen: "listen", eat: "eat", party: "dance", play: "play", make: "make", move: "move", explore: "go", learn: "learn" };
const BOOST = { play: 1.3, make: 1.3, move: 1.25, party: 1.25 }; // families Julien asked to see more of
const LENS = {
  late: { test: (e) => sm(e) != null && sm(e) >= 21 * 60, t: { watch: "Late shows", listen: "Late sets", party: "Out late", eat: "Late bites and pours", play: "Night-owl games", explore: "After-hours wandering", learn: "Night school", make: "Night shift, hands-on" }, teaser: "starting 9 PM or later" },
  early: { test: (e) => sm(e) != null && sm(e) < 12 * 60, t: { move: "Up before the city", eat: "Early bird eats", explore: "Morning wanders", learn: "Morning minds", make: "Morning hands-on", listen: "Matinee sounds", watch: "Matinees" }, teaser: "before noon" },
  free: { test: (e) => isFree(e), t: { watch: "Free to watch", listen: "Free sounds", eat: "Free tastes", play: "Free play", make: "Free to make", move: "Free to move", explore: "Free to wander", learn: "Free to learn", party: "Free to party" }, teaser: "no ticket needed" },
  cheap: { test: (e) => { const p = price(e); return p != null && p > 0 && p <= 20; }, t: { watch: "Cheap seats", listen: "Gigs under $20", eat: "Eat well for $20", play: "Play for under $20", make: "Make something for $20", move: "Move for under $20", party: "Dance for under $20", learn: "Learn for under $20", explore: "Wander for under $20" }, teaser: "paid, but $20 or less" },
  week: { test: (e) => { const d = dow(e); return d >= 1 && d <= 4 && (sm(e) ?? 0) >= 17 * 60; }, t: { watch: "Weeknight shows", listen: "Weeknight gigs", play: "Weeknight games", learn: "Weeknight brains", make: "Weeknight workshops", eat: "Weeknight dinners out", party: "Midweek out-out" }, teaser: "Monday to Thursday evenings" },
  wknd: { test: (e) => { const d = dow(e); return d === 0 || d === 6; }, t: { explore: "Weekend wanders", eat: "Weekend feasts", make: "Weekend projects", move: "Weekend workouts", play: "Weekend games", watch: "Weekend watch list", listen: "Weekend sounds", party: "Weekend blowouts", learn: "Weekend learning" }, teaser: "Saturday and Sunday" },
};
const LENS_ADJ = { late: "Late-night", early: "Morning", free: "Free", cheap: "Cheap", week: "Weeknight", wknd: "Weekend" };
const LEVEL = { fam: 0.36, cat: 0.6, sub: 0.82, niche: 1, term: 0.92, cut: 0.7, lens: 0.62, rare: 0.85 };
const series = (l) => new Set(l.map((e) => String(e.title || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24))).size;
const CHILL = ["Slow down: {x}", "Unwind: {x}", "Deep breath: {x}", "Reset with {x}"];
const NEUTRAL = ["{X}, anyone?", "{X} this fortnight", "All about {x}", "In the mood for {x}?"];
const MOMENT = new Set(["lens", "cut", "fam", "rare"]);
const STOP = new Set("the and for with from your our new york nyc brooklyn manhattan queens bronx night nights day days live event events show shows free class classes series edition annual weekly monthly special presents featuring feat party open club pm am tickets ticket session sessions vol part edition hour hours late evening morning afternoon weekend week season holiday holidays winter fall autumn spring summer city center centre hall room bar park street music art arts".split(" "));
const sm = (e) => startMinutes(e);
const dow = (e) => new Date(e.E + "T12:00:00").getDay();
const price = (e) => { const m = String(e.price || "").match(/\$\s*(\d+)/); return m ? +m[1] : null; };
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const rng = (seed) => { let x = seed || 1; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)), ((x ^= x >>> 16) >>> 0) / 4294967296); };
const up1 = (s) => s[0].toUpperCase() + s.slice(1);
const lowFirst = (s) => (/^[A-Z]{2,}|^\d|^D&D|^VR/.test(s) ? s : s[0].toLowerCase() + s.slice(1));
const share = (l, f) => l.filter(f).length / (l.length || 1);
const major = (arr, f) => { const m = {}; arr.forEach((e) => { const k = f(e); if (k) m[k] = (m[k] || 0) + 1; }); const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return top ? [top[0], top[1] / arr.length] : [null, 0]; };
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; } };
// Impressions: counted once a day for the first tiles of Discover; only earlier days count, so today's grid stays put
export function markSeen(keys, today) {
  const day = Math.floor(today.getTime() / 86400000), s = readSeen();
  let ch = false; keys.forEach((k) => { const o = s[k] || { n: 0, d: 0 }; if (o.d !== day) { s[k] = { n: o.n + 1, d: day }; ch = true; } });
  if (ch) try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* full */ }
}
// Normal approximation of a Beta draw (fine for ranking), seeded so the grid is stable through the day
const betaDraw = (a, b, r) => { const m = a / (a + b), sd = Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1))); const z = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()); return Math.min(0.99, Math.max(0.01, m + sd * z)); };

export function conceptTiles({ visible, today, hid = { xcats: [], xsubs: [] }, clicks = {}, fb = {}, favs = [], hoodOf = () => null, now = new Date() }) {
  const ok = visible.filter((e) => daysUntil(e, today) <= 14 && daysUntil(e, today) >= 0 && !(hid.xcats || []).includes(e.cat) && !(hid.xsubs || []).includes(e.sub));
  const day = Math.floor(today.getTime() / 86400000), nowMin = now.getHours() * 60 + now.getMinutes();
  // Drop what is already over today
  for (let i = ok.length - 1; i >= 0; i--) { const e = ok[i], st = sm(e); if (daysUntil(e, today) === 0 && st != null && st + 30 < nowMin && runLen(e) === 1) ok.splice(i, 1); }
  const N = ok.length;
  if (N < 4) return [];
  const scs = ok.map((e) => e.sc || 0).sort((a, b) => a - b), mu = scs.reduce((s, x) => s + x, 0) / N, p90 = Math.max(50, scs[Math.floor(N * 0.9)] || 0);
  const text = (e) => [e.title, e.sub, e.nsub, ...(e.kw || [])].join(" ").toLowerCase();
  const T = ok.map((e) => [e, text(e)]);
  const C = [];
  const add = (c) => { if (c.list.length) C.push({ ...c, ids: new Set(c.list.map((e) => e.id)) }); };

  // ── 1. Candidates
  const byFam = new Map(), byCat = new Map(), bySub = new Map();
  for (const e of ok) {
    if (e.fam) (byFam.get(e.fam) || byFam.set(e.fam, []).get(e.fam)).push(e);
    if (e.ncat) (byCat.get(e.ncat) || byCat.set(e.ncat, []).get(e.ncat)).push(e);
    if (e.ncat && e.nsub && !/^other/i.test(e.nsub)) { const k = e.ncat + "|" + e.nsub; (bySub.get(k) || bySub.set(k, []).get(k)).push(e); }
  }
  for (const [f, l] of byFam) if (l.length >= 4) add({ kind: "fam", id: f, fam: f, label: FAM_TITLE[f], list: l });
  for (const [c, l] of byCat) add({ kind: "cat", id: c, parent: "fam-" + CAT[c]?.fam, label: c.replace(/ & /g, " and ").toLowerCase().replace(/\band\b/g, "&"), list: l });
  for (const [k, l] of bySub) add({ kind: "sub", id: k, parent: "cat-" + k.split("|")[0], label: k.split("|")[1], list: l });
  for (const [label, re] of NICHE) { const l = T.filter(([, t]) => re.test(t)).map(([e]) => e); if (l.length) add({ kind: "niche", id: label, label, list: l }); }
  // Emergent themes: keyword phrases and title words that cluster in one category, are not too common, and no curated activity already covers
  const df = new Map();
  for (const [e] of T) {
    const terms = new Set([...(e.kw || []).map((k) => String(k).toLowerCase().trim()), ...String(e.title || "").toLowerCase().replace(/[^a-z0-9&' -]/g, " ").split(/\s+/).filter((w) => w.length >= 4)]);
    terms.forEach((t) => { if (t && !STOP.has(t) && !/^\d/.test(t) && t.length <= 24) (df.get(t) || df.set(t, []).get(t)).push(e); });
  }
  const hoodWords = new Set(ok.flatMap((e) => String(e.hood || "").toLowerCase().split(/[ ,/]+/)));
  const curated = C.filter((c) => c.kind === "niche" || c.kind === "sub");
  const terms = [];
  for (const [t, l] of df) {
    if (l.length < 2 || l.length > Math.max(6, N * 0.06) || hoodWords.has(t)) continue;
    const [, conc] = major(l, (e) => e.ncat); if (conc < 0.7) continue;
    const ids = new Set(l.map((e) => e.id)); if (curated.some((c) => jac(ids, c.ids) >= 0.6)) continue;
    terms.push({ t, l, ids });
  }
  terms.sort((a, b) => b.l.length - a.l.length || a.t.length - b.t.length);
  const keptT = []; for (const x of terms) if (!keptT.some((y) => jac(x.ids, y.ids) >= 0.6)) keptT.push(x);
  keptT.slice(0, 25).forEach((x) => add({ kind: "term", id: x.t, label: x.t, list: x.l }));
  // Lens cuts of big groups: "Weeknight improv", "Free comedy", "Late-night jazz"
  const tests = Object.fromEntries(Object.entries(LENS).map(([k, L]) => [k, L.test]));
  for (const c of C.filter((c) => (c.kind === "cat" || c.kind === "sub" || c.kind === "niche") && c.list.length >= 5)) {
    for (const [lk, f] of Object.entries(tests)) { const l = c.list.filter(f); if (l.length >= 3 && l.length <= 0.7 * c.list.length) add({ kind: "cut", id: lk + "-" + c.kind + "-" + c.id, parent: c.kind + "-" + c.id, lens: lk, label: c.label, list: l }); }
  }
  // Family moments with hand-written names
  for (const [lk, L] of Object.entries(LENS)) for (const [fam, title] of Object.entries(L.t)) { const l = (byFam.get(fam) || []).filter(L.test); if (l.length >= 3) add({ kind: "lens", id: lk + "-" + fam, parent: "fam-" + fam, fam, fixedTitle: title, note: L.teaser, list: l }); }
  // One-offs: strong matches that belong to no group of three or more specific things
  const grouped = new Set(C.filter((c) => (c.kind === "niche" || c.kind === "sub" || c.kind === "term") && c.list.length >= 3).flatMap((c) => [...c.ids]));
  const lone = ok.filter((e) => !grouped.has(e.id) && runLen(e) <= 2 && (e.sc || 0) >= mu).sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 6);
  if (lone.length >= 2) add({ kind: "rare", id: "oneoffs", fixedTitle: "One-offs and oddities", note: "things you won't see twice this month", list: lone });

  // Same events twice: keep the most specific name
  const rank = { niche: 6, term: 5, sub: 4, cut: 3, rare: 3, cat: 2, lens: 2, fam: 1 };
  const bySig = new Map();
  for (const c of C) { const k = [...c.ids].sort().join(","); const o = bySig.get(k); if (!o || rank[c.kind] > rank[o.kind]) bySig.set(k, c); }
  const cands = [...bySig.values()].map((c) => ({ ...c, key: "gen-" + c.kind + "-" + c.id }));

  // ── 2. Feedback, pooled by family (hierarchical prior)
  const seen = readSeen(), favSet = new Set(favs);
  const sig = (k) => ({ win: 2 * (clicks[k]?.n || 0) + (fb[k] > 0 ? 3 : 0) + (favSet.has(k) ? 2 : 0), loss: 0.35 * Math.max(0, (seen[k]?.n || 0) - (seen[k]?.d === day ? 1 : 0)) + (fb[k] < 0 ? 4 : 0) });
  const famOf = (c) => c.fam || major(c.list, (e) => e.fam)[0];
  const famStats = {};
  for (const k of new Set([...Object.keys(clicks), ...Object.keys(fb), ...Object.keys(seen), ...favs])) { const c = cands.find((x) => x.key === k); const f = c && famOf(c); if (!f) continue; const s = sig(k); const o = (famStats[f] = famStats[f] || { w: 0, l: 0 }); o.w += s.win; o.l += s.loss; }

  // ── 3. Relevance
  const evW = (e) => {
    const d = daysUntil(e, today), st = sm(e);
    if (d === 0 && st != null && st + 30 < nowMin) return 0; // already over today
    const reach = d === 0 ? 1 : d === 1 ? 0.85 : Math.pow(0.88, d);
    return reach * (isOutdoor(e) && (e.wx?.rainy || (e.wx?.hi != null && e.wx.hi < 40)) ? 0.45 : 1);
  };
  for (const c of cands) {
    const l = c.list, n = l.length;
    const fam = famOf(c), ncat = major(l, (e) => e.ncat)[0];
    const top = l.map((e) => (e.sc || 0) * (0.6 + 0.4 * evW(e))).sort((a, b) => b - a).slice(0, 3);
    const fit = Math.min(1.2, ((top.reduce((s, x) => s + x, 0) + 2 * mu) / (top.length + 2)) / p90);
    const moment = Math.max(...l.map(evW));
    const s = sig(c.key), fs = famStats[fam] || { w: 0, l: 0 };
    const prior = (1 + fs.w * 0.3) / (2 + (fs.w + fs.l) * 0.3); // family mean, weak
    const theta = betaDraw(6 * prior + s.win, 6 * (1 - prior) + s.loss, rng(hash(c.key) + day)); // prior worth 6 observations: explores, but feedback wins
    const dn = series(l); // distinct things, not dates of the same one
    const size = (dn === 1 ? 0.5 : dn === 2 ? 0.74 : Math.min(1, Math.log2(dn + 1) / 2.3)) * (n > 24 ? 0.85 : 1);
    const novelty = runLen(l[0]) > 20 && share(l, (e) => runLen(e) > 20) > 0.7 ? 0.8 : 1; // long-running shows are less of a "find"
    // Engagement multiplies: a liked mood (θ≈0.9) is lifted ~45%, an ignored one (θ≈0.25) sinks ~30%; likes also lift the family
    const rel = (0.68 * fit + 0.32 * moment) * (0.4 + 1.2 * theta) * LEVEL[c.kind] * size * (BOOST[fam] || 1) * novelty * (fb[c.key] < 0 ? 0.2 : 1);
    Object.assign(c, { fam, ncat, rel: moment === 0 ? 0 : rel, top: new Set(l.slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 10).map((e) => e.id)) });
  }

  // ── 4. Submodular selection
  const pool = cands.filter((c) => c.rel > 0), chosen = [], famN = {}, axisN = { thing: 0, moment: 0 }, catN = {};
  const related = (a, b) => a.parent === b.kind + "-" + b.id || b.parent === a.kind + "-" + a.id || (a.parent && a.parent === b.parent && a.kind === "cut" && b.kind === "cut");
  while (pool.length && chosen.length < 40) {
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i], ax = MOMENT.has(c.kind) ? "moment" : "thing";
      let red = 0; for (const o of chosen) { const j = jac(c.top, o.top); red = Math.max(red, j + (related(c, o) ? 0.35 : 0) + (c.ncat && c.ncat === o.ncat ? 0.12 : 0)); }
      const cov = 0.22 * (Math.sqrt((famN[c.fam] || 0) + 1) - Math.sqrt(famN[c.fam] || 0)) + 0.12 * (Math.sqrt(axisN[ax] * (ax === "moment" ? 2 : 1) + 1) - Math.sqrt(axisN[ax] * (ax === "moment" ? 2 : 1))) - 0.06 * (catN[c.ncat] || 0);
      const momentHeavy = ax === "moment" && axisN.moment + 1 > 0.34 * (chosen.length + 1) + 1;
      const v = c.rel + cov - 0.6 * red - (momentHeavy ? 0.25 : 0);
      if (v > bv) { bv = v; bi = i; }
    }
    const c = pool.splice(bi, 1)[0]; chosen.push(c);
    famN[c.fam] = (famN[c.fam] || 0) + 1; axisN[MOMENT.has(c.kind) ? "moment" : "thing"]++; if (c.ncat) catN[c.ncat] = (catN[c.ncat] || 0) + 1;
  }

  // ── 5. Words: titles from what is true of most of the list
  return chosen.map((c) => {
    const l = c.list.slice().sort((a, b) => Math.max(0, daysUntil(a, today)) - Math.max(0, daysUntil(b, today)) || (sm(a) ?? 9999) - (sm(b) ?? 9999));
    const n = l.length, fam = c.fam;
    const fFree = share(l, isFree), fLate = share(l, LENS.late.test), [hood, fHood] = major(l, hoodOf);
    let title = c.fixedTitle;
    if (!title) {
      const mods = [];
      if (c.lens) mods.push(LENS_ADJ[c.lens]);
      else if (fFree >= 0.75 && !/free/i.test(c.label)) mods.push("Free");
      else if (fLate >= 0.75) mods.push("Late-night");
      let base = mods.length ? mods[0] + " " + lowFirst(c.label) : null;
      if (!base && hood && fHood >= 0.7 && new Set(l.map((e) => e.venue)).size >= 2 && c.kind !== "fam") base = up1(c.label) + " in " + hood;
      if (c.lens === "cheap") base = up1(c.label) + " under $20";
      if (!base) { const pure = share(l, (e) => e.fam === fam) >= 0.75; const b = c.ncat === "Yoga & Wellness" ? CHILL : pure ? TITLES[fam] || NEUTRAL : NEUTRAL; base = b[(hash(c.key) + day) % b.length].replace("{X}", up1(c.label)).replace("{x}", lowFirst(c.label)); }
      title = up1(base);
    }
    const first = l[0], venue = String(first.venue || "").split(",")[0];
    const lead = whenLabel(first, today).split(" · until")[0] + (venue ? " at " + venue : "");
    const free = l.filter(isFree).length, paid = l.map(price).filter((p) => p != null && p > 0);
    const cost = free === n ? "all free" : paid.length && free ? "free to $" + Math.max(...paid) : paid.length ? "from $" + Math.min(...paid) : null;
    const teaser = c.kind === "rare"
      ? up1(c.note) + ": " + l.slice(0, 2).map((e) => e.title).join(", ") + (n > 2 ? " and more." : ".")
      : (c.note ? up1(c.note) + ". " : "") + "Next: " + lead + [n > 1 ? (series(l) === 1 ? (n - 1) + (n === 2 ? " other date" : " other dates") : (n - 1) + " more") : null, cost].filter(Boolean).map((x) => " · " + x).join("") + ".";
    const node = (MOMENT.has(c.kind) && c.kind !== "cut" ? FAM[fam]?.icon : null) || CAT[c.ncat]?.icon || FAM[fam]?.icon;
    const vk = c.ncat === "Comedy" ? "laugh" : c.ncat === "Yoga & Wellness" ? "chill" : VERB_OF_FAM[fam];
    return { key: c.key, title, teaser, n, node, list: l, facet: c.kind === "fam" || c.kind === "lens" ? "fam:" : c.kind === "sub" ? "sub:" : "cat:", vk, fit: c.rel };
  });
}
