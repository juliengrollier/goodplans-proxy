// Mood engine v2: concepts (the thing itself) x lenses (the moment), scored for taste, rarity, freshness and novelty, then picked for variety.
// Returns tiles shaped like the older generated ones, best mix first.
import { CATEGORIES, FAM } from "./taxonomy.js";
import { daysUntil } from "../lib/core.js";
import { isFree, startMinutes } from "./engine.js";

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
// Fine-grained things people actually go looking for. [label, pattern on title + sub-type + keywords]
const NICHE = [
  ["pickleball", /pickleball/], ["tennis & padel", /padel|\btennis\b(?!.*table)/], ["basketball", /basketball|hoops/], ["soccer", /soccer|futsal/], ["kickball & softball", /kickball|softball/], ["volleyball", /volleyball/],
  ["bowling", /bowling/], ["ping pong", /ping ?pong|table tennis/], ["mini golf", /mini ?golf|putt-?putt/], ["axe throwing", /axe throw/], ["darts", /\bdarts\b/], ["pool & billiards", /billiards|pool (hall|league|tournament)/],
  ["skee-ball & arcades", /skee|arcade|pinball/], ["VR", /virtual reality|\bvr\b/], ["escape rooms", /escape (room|game)/], ["trivia", /trivia|quiz night/], ["bingo", /bingo/], ["board games", /board game|game night|tabletop/],
  ["chess", /\bchess\b/], ["mahjong", /mahjong/], ["poker", /poker/], ["D&D", /d&d|dungeons/], ["karaoke", /karaoke/],
  ["improv", /improv/], ["stand-up", /stand-?up/], ["open mics", /open mic/], ["storytelling", /storytell|\bmoth\b/], ["drag", /\bdrag\b/], ["burlesque & cabaret", /burlesque|cabaret/], ["magic", /magic (show|night)|magician/],
  ["beer gardens", /beer garden|biergarten|oktoberfest/], ["rooftops", /rooftop/], ["wine", /\bwine\b/], ["beer", /brewery|taproom|beer (tasting|fest)/], ["whiskey & spirits", /whisk|mezcal|tequila|\bsake\b/], ["cocktails", /cocktail/],
  ["coffee", /coffee|cupping/], ["cheese & chocolate", /cheese|chocolate/], ["dumplings", /dumpling/], ["pizza", /pizza/], ["noodles", /ramen|noodle/], ["tacos", /\btacos?\b/], ["brunch", /brunch/], ["food crawls", /food crawl|\bcrawl\b/],
  ["supper clubs", /supper club|pop-?up dinner/], ["night markets", /night market|smorgasburg/], ["flea markets", /flea|thrift|vintage market/], ["record fairs", /record fair|vinyl/],
  ["pottery", /pottery|ceramic|wheel throw/], ["painting nights", /paint(ing)? (class|night)|paint (and|&) sip|sip (and|&) paint/], ["life drawing", /life drawing/], ["printmaking", /printmaking|screen ?print|risograph/],
  ["knitting & crochet", /knit|crochet|embroider/], ["cooking classes", /cooking class|pasta[- ]making|dumpling[- ]making|baking class/], ["woodworking & crafts", /woodwork|leather|jewelry making|candle making|terrarium/], ["flowers", /flower arrang|floral/],
  ["run clubs", /run club|running club|group run/], ["races & 5Ks", /\b5k\b|\b10k\b|marathon|turkey trot/], ["group rides", /group ride|bike ride|critical mass/], ["climbing", /climb|boulder/], ["ice skating", /ice skat|\brink\b/],
  ["roller skating", /roller (skat|disco|derby)/], ["kayaking", /kayak|paddle|canoe/], ["yoga", /yoga/], ["sound baths", /sound bath|breathwork|meditat/], ["pilates & barre", /pilates|barre/], ["hikes", /\bhik(e|ing)/], ["boxing & martial arts", /boxing|muay|jiu-?jitsu|karate|martial/],
  ["swing dancing", /swing danc|lindy/], ["salsa & bachata", /salsa|bachata/], ["tango", /tango/], ["silent discos", /silent disco/], ["house & techno", /techno|house music|\brave\b/],
  ["jazz", /\bjazz\b|bebop/], ["blues", /\bblues\b/], ["classical", /classical|orchestra|symphon|chamber music|string quartet/], ["opera", /\bopera\b/], ["ballet", /ballet|nutcracker/], ["folk & bluegrass", /folk|bluegrass/], ["hip-hop", /hip-?hop|\brap\b/],
  ["punk & metal", /punk|metal|hardcore/], ["singer-songwriters", /singer-?songwriter|acoustic/], ["jam sessions", /jam session/], ["outdoor cinema", /rooftop (film|cinema)|outdoor (film|movie)|movie in the park/], ["horror films", /horror/], ["documentaries", /documentar/],
  ["poetry", /poetry|\bpoets?\b/], ["book launches", /book launch|author talk/], ["zines", /\bzine/], ["history walks", /history walk|walking tour|tenement/], ["ghost tours", /ghost|haunted/], ["architecture", /architect/], ["art openings", /opening reception|gallery opening/],
  ["immersive theatre", /immersive/], ["puppets", /puppet/], ["circus", /circus|acrobat/], ["language exchanges", /language (exchange|cafe)|conversation (hour|club)/], ["mixers", /speed dating|mixer|singles/], ["volunteering", /volunteer|clean-?up|community garden/],
  ["birdwatching", /\bbird/], ["stargazing", /stargaz|astronomy|planetarium/], ["holiday markets", /holiday market|christmas market|winter village/],
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
const sm = (e) => startMinutes(e);
const dow = (e) => new Date(e.E + "T12:00:00").getDay();
const price = (e) => { const m = String(e.price || "").match(/\$\s*(\d+)/); return m ? +m[1] : null; };
const LENS = {
  late: { test: (e) => sm(e) != null && sm(e) >= 21 * 60, t: { watch: "Late shows", listen: "Late sets", party: "Out late", eat: "Late bites and pours", play: "Night-owl games", explore: "After-hours wandering", learn: "Night school", make: "Night shift, hands-on" }, teaser: "starting 9 PM or later" },
  early: { test: (e) => sm(e) != null && sm(e) < 12 * 60, t: { move: "Up before the city", eat: "Early bird eats", explore: "Morning wanders", learn: "Morning minds", make: "Morning hands-on", listen: "Matinee sounds", watch: "Matinees" }, teaser: "before noon" },
  free: { test: (e) => isFree(e), t: { watch: "Free to watch", listen: "Free sounds", eat: "Free tastes", play: "Free play", make: "Free to make", move: "Free to move", explore: "Free to wander", learn: "Free to learn", party: "Free to party" }, teaser: "no ticket needed" },
  cheap: { test: (e) => { const p = price(e); return p != null && p > 0 && p <= 20; }, t: { watch: "Cheap seats", listen: "Gigs under $20", eat: "Eat well for $20", play: "Play for under $20", make: "Make something for $20", move: "Move for under $20", party: "Dance for under $20", learn: "Learn for under $20", explore: "Wander for under $20" }, teaser: "paid, but $20 or less" },
  week: { test: (e) => { const d = dow(e); return d >= 1 && d <= 4 && (sm(e) ?? 0) >= 17 * 60; }, t: { watch: "Weeknight shows", listen: "Weeknight gigs", play: "Weeknight games", learn: "Weeknight brains", make: "Weeknight workshops", eat: "Weeknight dinners out", party: "Midweek out-out" }, teaser: "Monday to Thursday evenings" },
  wknd: { test: (e) => { const d = dow(e); return d === 0 || d === 6; }, t: { explore: "Weekend wanders", eat: "Weekend feasts", make: "Weekend projects", move: "Weekend workouts", play: "Weekend games", watch: "Weekend watch list", listen: "Weekend sounds", party: "Weekend blowouts", learn: "Weekend learning" }, teaser: "Saturday and Sunday" },
};
const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const up1 = (s) => s[0].toUpperCase() + s.slice(1);
const lowFirst = (s) => (/^[A-Z]{2,}|\d|&/.test(s) ? s : s[0].toLowerCase() + s.slice(1));
const major = (arr, f) => { const m = {}; arr.forEach((e) => { const k = f(e); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function conceptTiles({ visible, today, hid = { xcats: [], xsubs: [] }, clicks = {}, hoodOf = () => null }) {
  const ok = visible.filter((e) => daysUntil(e, today) <= 14 && !(hid.xcats || []).includes(e.cat) && !(hid.xsubs || []).includes(e.sub));
  if (ok.length < 4) return [];
  const day = Math.floor(today.getTime() / 86400000);
  const scs = ok.map((e) => e.sc || 0).sort((a, b) => a - b), p90 = Math.max(55, scs[Math.floor(scs.length * 0.9)] || 0), p75 = scs[Math.floor(scs.length * 0.75)] || 0;
  const text = (e) => [e.title, e.sub, e.nsub, ...(e.kw || [])].join(" ").toLowerCase();
  const cands = [];
  const add = (kind, id, list, o) => { if (list.length >= 2 || (list.length === 1 && o.allowOne)) cands.push({ kind, id, list, ...o }); };

  // Concepts: the thing itself
  const T = ok.map((e) => [e, text(e)]);
  for (const [label, re] of NICHE) add("niche", label, T.filter(([, t]) => re.test(t)).map(([e]) => e), { label, facet: "cat:" });
  const bySub = new Map();
  ok.forEach((e) => { if (e.nsub && !/^(other|food|history|nature|hip-hop|outdoor|holiday|museums|galleries)/i.test(e.nsub)) { const k = e.ncat + "|" + e.nsub; if (!bySub.has(k)) bySub.set(k, []); bySub.get(k).push(e); } });
  for (const [k, l] of bySub) add("sub", k, l, { label: k.split("|")[1], facet: "sub:" });
  const byCat = new Map(); ok.forEach((e) => { if (e.ncat) { if (!byCat.has(e.ncat)) byCat.set(e.ncat, []); byCat.get(e.ncat).push(e); } });
  for (const [k, l] of byCat) if (l.length >= 3) add("cat", k, l, { label: k.replace(/ & /g, " and ").toLowerCase().replace(/\band\b/g, "&"), facet: "cat:" });
  // Lenses: the moment, only for pairings that read naturally
  for (const [lk, L] of Object.entries(LENS)) for (const [fam, title] of Object.entries(L.t)) {
    const l = ok.filter((e) => e.fam === fam && L.test(e));
    if (l.length >= 3) add("lens", lk + "-" + fam, l, { fixedTitle: title, fam, facet: "fam:", note: L.teaser });
  }
  for (const fam of Object.keys(FAM_TITLE)) { const l = ok.filter((e) => e.fam === fam); if (l.length >= 4) add("fam", fam, l, { fixedTitle: FAM_TITLE[fam], fam, facet: "fam:" }); }
  // One-offs: rare, well matched events with no group of their own
  const crowd = new Set(cands.filter((c) => (c.kind === "niche" || c.kind === "sub") && c.list.length > 2).flatMap((c) => c.list.map((e) => e.id)));
  const lone = ok.filter((e) => !crowd.has(e.id) && (e.sc || 0) >= p75).sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 6);
  add("rare", "oneoffs", lone, { fixedTitle: "One-offs and oddities", note: "things you won't see twice this month", facet: "cat:" });

  // Drop twins (same events): keep the most specific
  const rank = { niche: 5, sub: 4, lens: 3, cat: 2, fam: 1, rare: 3 };
  const sig = new Map();
  for (const c of cands) { const k = c.list.map((e) => e.id).sort().join(","); const o = sig.get(k); if (!o || rank[c.kind] > rank[o.kind]) sig.set(k, c); }
  const kept = [...sig.values()];

  // Score: taste fit, rarity, freshness, novelty; small groups must be a strong match
  const KW = { niche: 1.05, sub: 0.95, lens: 0.9, rare: 0.85, cat: 0.8, fam: 0.7 };
  const scored = [];
  for (const c of kept) {
    const top = c.list.map((e) => e.sc || 0).sort((a, b) => b - a).slice(0, 3), fit = clamp(top.reduce((s, x) => s + x, 0) / top.length / p90, 0, 1.2), n = c.list.length;
    if (n < 3 && c.kind !== "rare" && fit < 0.6) continue;
    const soon = Math.min(...c.list.map((e) => Math.max(0, daysUntil(e, today))));
    const rarity = n <= 2 ? 1 : n <= 4 ? 0.75 : n <= 8 ? 0.4 : 0.1;
    const fresh = soon <= 0 ? 1 : soon === 1 ? 0.8 : soon <= 3 ? 0.5 : 0.2;
    const key = "gen-" + c.kind + "-" + c.id;
    const nov = Math.max(0, 1 - (clicks[key]?.n || 0) / 2);
    const fam = c.fam || major(c.list, (e) => e.fam);
    const ncat = major(c.list, (e) => e.ncat);
    scored.push({ ...c, key, n, fam, ncat, soon, score: (0.42 * fit + 0.2 * rarity + 0.2 * fresh + 0.18 * nov) * (BOOST[fam] || 1) * KW[c.kind], ids: c.list.slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 12).map((e) => e.id) });
  }

  // Variety: greedy pick, penalising near-copies and over-used kinds
  const target = { niche: 0.4, sub: 0.1, cat: 0.08, lens: 0.2, fam: 0.08, rare: 0.06 };
  const chosen = [], pool = scored.slice();
  const sim = (a, b) => { const A = new Set(a.ids), inter = b.ids.filter((i) => A.has(i)).length; return 0.6 * (inter / (a.ids.length + b.ids.length - inter || 1)) + (a.fam === b.fam ? 0.22 : 0) + (a.kind === b.kind ? 0.08 : 0) + (a.ncat && a.ncat === b.ncat ? 0.12 : 0); };
  while (pool.length && chosen.length < 48) {
    let bi = -1, bv = -9;
    pool.forEach((c, i) => {
      const share = chosen.filter((x) => x.kind === c.kind).length / Math.max(1, chosen.length);
      const v = c.score - 0.55 * Math.max(0, ...chosen.map((x) => sim(c, x))) + 0.25 * (target[c.kind] - share) - (c.kind === "rare" && chosen.some((x) => x.kind === "rare") ? 1 : 0);
      if (v > bv) { bv = v; bi = i; }
    });
    chosen.push(pool.splice(bi, 1)[0]);
  }

  // Words
  return chosen.map((c) => {
    const l = c.list, n = l.length, fam = c.fam;
    const title = c.fixedTitle || (() => { const b = TITLES[fam] || TITLES.explore; const t = b[(hash(c.key) + day) % b.length]; return t.replace("{X}", up1(c.label)).replace("{x}", lowFirst(c.label)); })();
    const free = l.filter((e) => isFree(e)).length, paid = l.map(price).filter((p) => p != null && p > 0);
    const when = c.soon <= 0 ? "first up today" : c.soon === 1 ? "first up tomorrow" : "first up in " + c.soon + " days";
    const cost = free === n ? "all free" : paid.length && free ? "free to $" + Math.max(...paid) : paid.length ? "from $" + Math.min(...paid) : null;
    const hk = major(l, hoodOf), share = hk ? l.filter((e) => hoodOf(e) === hk).length / n : 0;
    const bits = [up1(when), cost, share >= 0.6 && n >= 3 ? "mostly in " + hk : null].filter(Boolean);
    const teaser = (c.note ? up1(c.note) + ". " : "") + bits.join(" · ") + ".";
    const node = (c.kind === "lens" || c.kind === "fam" || c.kind === "rare" ? FAM[fam]?.icon : null) || CAT[c.ncat]?.icon || FAM[fam]?.icon;
    const vk = c.ncat === "Comedy" ? "laugh" : c.ncat === "Yoga & Wellness" ? "chill" : VERB_OF_FAM[fam];
    return { key: c.key, title, teaser, n, node, list: l, facet: c.facet, vk, fit: c.score };
  });
}
