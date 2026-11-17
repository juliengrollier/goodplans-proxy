// What you'll be doing (9 colour families) and what it is (34 categories, one icon each).
// Families give the colour; categories give the icon and are what you filter by.
// The scoring engine still uses the older 13 categories (ev.cat) internally; this layer is ev.ncat / ev.fam.
import React from "react";
import {
  Popcorn, Headphones, UtensilsCrossed, PartyPopper, Scissors, Activity, Compass, GraduationCap,
  Drama, Laugh, Clapperboard, Sparkles, Trophy, Guitar, Music2, Piano, Star, Heart, Wine, Soup, Martini, Disc3, Footprints, MicVocal,
  Palette, ChefHat, Bike, Flower2, Volleyball, Landmark, ShoppingBasket, FerrisWheel, Trees, Presentation, BookOpen, Signpost,
  Gamepad2, Dices, Joystick, KeyRound, Target, Brain, Waves, Mountain, MountainSnow, Timer,
} from "lucide";

export const FAMILIES = [
  { id: "watch", label: "Watch", light: "#E53935", dark: "#F26260", icon: Popcorn },
  { id: "listen", label: "Listen", light: "#7B4BD6", dark: "#9B70F0", icon: Headphones },
  { id: "eat", label: "Eat & Drink", short: "Eat", light: "#F2611D", dark: "#FF7A3D", icon: UtensilsCrossed },
  { id: "party", label: "Party", light: "#4338CA", dark: "#6A62F0", icon: PartyPopper },
  { id: "play", label: "Play", light: "#C98A00", dark: "#E6A91A", icon: Gamepad2 },
  { id: "make", label: "Make", light: "#C026D3", dark: "#DA5BE8", icon: Scissors },
  { id: "move", label: "Move", light: "#1E9E5A", dark: "#34C47A", icon: Activity },
  { id: "explore", label: "Explore", light: "#0D9488", dark: "#22B8AA", icon: Compass },
  { id: "learn", label: "Learn", light: "#2563EB", dark: "#4F86FF", icon: GraduationCap },
];
export const FAM = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

// Order = classification priority (first match wins). re is tested on the title first, then on the full text.
export const CATEGORIES = [
  { id: "Comedy", fam: "watch", icon: Laugh, re: /comedy|comedian|stand-?up|improv|sketch show|roast|funny/ },
  { id: "Cooking & Cocktails", fam: "make", icon: ChefHat, re: /cooking class|baking class|pie[- ]making|cocktail class|mixology|pasta[- ]making|dumpling[- ]making|cook-?along|knife skills/ },
  { id: "Arts & Crafts", fam: "make", icon: Palette, re: /workshop|pottery|ceramic|wheel throwing|painting class|paint (and|&) sip|sip (and|&) paint|drawing|life drawing|craft|knit|crochet|sew|embroider|printmaking|screen ?print|collage|jewel|candle[- ]making|terrarium|calligraphy|zine|open studio/ },
  { id: "Yoga & Wellness", fam: "move", icon: Flower2, re: /yoga|meditat|sound bath|breathwork|wellness|pilates|tai chi|qigong|sauna|bathhouse/ },
  { id: "Dance Socials", fam: "party", icon: Footprints, re: /salsa|swing danc|lindy|tango|bachata|kizomba|contra danc|square danc|line danc|ballroom|dance social|dance class|silent disco/ },
  { id: "Karaoke", fam: "party", icon: MicVocal, re: /karaoke/ },
  { id: "Trivia & Quizzes", fam: "play", icon: Brain, re: /trivia|quiz|bingo|game show|spelling bee|jeopardy|name that tune/ },
  { id: "Escape Rooms & Puzzles", fam: "play", icon: KeyRound, re: /escape (room|game|the room)|puzzle hunt|scavenger hunt|murder mystery|treasure hunt|puzzle night/ },
  { id: "Arcades & VR", fam: "play", icon: Joystick, re: /arcade|pinball|virtual reality|\bvr\b|video game|gaming|retro games?|esports|simulator/ },
  { id: "Board & Card Games", fam: "play", icon: Dices, re: /board game|game night|tabletop|chess|backgammon|mahjong|poker|card game|dungeons|d&d|catan|scrabble/ },
  { id: "Bar Games & Bowling", fam: "play", icon: Target, re: /bowling|ping ?pong|table tennis|mini ?golf|shuffleboard|darts|billiards|\bpool\b(?! party)|axe throwing|bocce|skee-?ball|cornhole|curling/ },
  { id: "Clubs & DJs", fam: "party", icon: Disc3, re: /\bdj\b|djs|club night|rave|techno|house music|disco|dance party|nightclub|afterparty|after-party|boiler room/ },
  { id: "Dance & Opera", fam: "watch", icon: Sparkles, re: /opera|ballet|dance (performance|company|theater|show)|modern dance|choreograph|nutcracker/ },
  { id: "Theater", fam: "watch", icon: Drama, re: /theat|broadway|musical|\bplay\b|cabaret|drag|burlesque|magic show|puppet|circus|shakespeare|one-?(wo)?man show/ },
  { id: "Film", fam: "watch", icon: Clapperboard, re: /film|screening|cinema|movie|documentary|double feature/ },
  { id: "Live Sports", fam: "watch", icon: Trophy, re: /\bvs\.?\b|versus|knicks|nets\b|yankees|mets\b|rangers|islanders|liberty|nycfc|red bulls|us open|boxing|wrestling|roller derby|watch party/ },
  { id: "Tastings", fam: "eat", icon: Wine, re: /tasting|wine|natural wine|sake|whisk|mezcal|tequila|cheese|chocolate|beer fest|cider/ },
  { id: "Food Markets & Pop-ups", fam: "eat", icon: Soup, re: /food (market|festival|hall|pop-?up|crawl)|night market|smorgasburg|supper club|pop-?up dinner|dumpling|food truck|crawl|feast|potluck|friendsgiving/ },
  { id: "Bars & Happy Hours", fam: "eat", icon: Martini, re: /happy hour|cocktail|speakeasy|brewery|taproom|\bbar\b|pub\b|beer garden|biergarten|oktoberfest/ },
  { id: "Tours", fam: "learn", icon: Signpost, re: /walking tour|\btour\b|guided walk|history walk|open house|behind the scenes|architecture walk/ },
  { id: "Books & Readings", fam: "learn", icon: BookOpen, re: /book|reading|poetry|poet|author|literary|novel|launch|zine fair/ },
  { id: "Talks & Panels", fam: "learn", icon: Presentation, re: /talk|lecture|panel|conversation|discussion|q ?& ?a|symposium|seminar|salon|debate|class on/ },
  { id: "Museums & Galleries", fam: "explore", icon: Landmark, re: /museum|gallery|galleries|exhibit|art show|installation|opening reception|biennial|art fair|retrospective/ },
  { id: "Festivals & Parades", fam: "explore", icon: FerrisWheel, re: /festival|parade|street fair|carnival|block party|celebration|tree lighting|fireworks|feast of/ },
  { id: "Markets", fam: "explore", icon: ShoppingBasket, re: /flea|vintage|market|record fair|sample sale|bazaar|craft fair|swap/ },
  { id: "Running", fam: "move", icon: Timer, re: /run club|running club|group run|fun run|trail run|turkey trot|\b5k\b|\b10k\b|half marathon|\bmarathon\b(?! watch)|\brace\b(?! (for|to))|track meet/ },
  { id: "Cycling", fam: "move", icon: Bike, re: /bike ride|group ride|cycling|bike tour|five boro|critical mass|spin class/ },
  { id: "Pickup Sports", fam: "move", icon: Volleyball, re: /pickleball|padel|soccer|basketball|volleyball|tennis|frisbee|softball|kickball|flag football|rugby|cricket/ },
  { id: "Climbing & Skating", fam: "move", icon: Mountain, re: /climb|boulder|skat|rink|roller/ },
  { id: "Water Sports", fam: "move", icon: Waves, re: /kayak|paddle|canoe|swim|sail|rowing|surf|polar plunge/ },
  { id: "Hiking & Walks", fam: "move", icon: MountainSnow, re: /hike|hiking|nature walk|trail|ramble/ },
  { id: "Parks & Nature", fam: "explore", icon: Trees, re: /park|garden|nature|bird|botanic|foliage|waterfront|beach|forest|wildlife|cherry blossom/ },
  { id: "Concerts", fam: "listen", icon: Guitar, re: /concert|live music|band|singer|songwriter|hip-?hop|rap\b|rock|indie|folk|r&b|soul|funk|punk|gig|acoustic|showcase|jazz|blues|bebop|classical|orchestra|symphon|chamber|string quartet|philharmonic|recital|choir|choral|organ|baroque|vivaldi|bach|beethoven|mozart/ },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
// Strong title signals checked before everything else (an open mic is music unless it says comedy or poetry)
const EARLY = [["Comedy", /comedy|comedian|stand-?up|improv/], ["Books & Readings", /poetry|poet|spoken word|literary|book launch|author talk/], ["Concerts", /open mic|singer-?songwriter|jam session/]];
export const CAT_NAMES = CATEGORIES.map((c) => c.id);
// Categories and sub-types that were renamed or split: stored filters, boosts and learning move to the new names
export const RENAMED = {
  "Karaoke & Trivia": ["Karaoke", "Trivia & Quizzes"], "Run & Ride": ["Running", "Cycling"],
  "Play": ["Pickup Sports", "Climbing & Skating", "Water Sports", "Bar Games & Bowling"], "Jazz & Blues": ["Jazz", "Blues"],
};
export const migrateNames = (arr) => [...new Set((arr || []).flatMap((x) => RENAMED[x] || [x]))];
export const migrateMap = (m) => { const o = {}; Object.entries(m || {}).forEach(([k, v]) => (RENAMED[k] || [k]).forEach((n) => { o[n] = v; })); return o; };

// Fallback from the older categories when nothing in the text decides
// Third level: sub-types for the bigger categories (Claude picks one; these patterns are the fallback)
export const SUBTYPES = {
  "Concerts": [["Rock & Indie", /rock|indie|punk|garage|shoegaze|alt/], ["Hip-hop & R&B", /hip-?hop|rap\b|r&b|soul|neo-soul/], ["Electronic", /electronic|synth|ambient|techno|house/], ["Folk & Acoustic", /folk|acoustic|singer-?songwriter|americana|bluegrass|country/], ["Jazz", /jazz|bebop|big band|swing/], ["Blues", /blues/], ["Classical", /classical|orchestra|symphon|chamber|quartet|philharmonic|recital|choir|choral|organ|baroque|opera/], ["Pop", /\bpop\b/], ["World & Latin", /latin|salsa|cumbia|afro|world|reggae|k-?pop|bollywood|flamenco|klezmer|brazil/]],
  "Theater": [["Broadway", /broadway(?! in bryant)/], ["Off-Broadway", /off-?broadway|off off/], ["Cabaret & Drag", /cabaret|drag|burlesque/], ["Immersive", /immersive|site-specific/]],
  "Comedy": [["Stand-up", /stand-?up|comic|showcase/], ["Improv", /improv/], ["Storytelling", /storytell|moth|story/], ["Variety", /variety|sketch|vaudeville|magic/]],
  "Film": [["New releases", /premiere|new release|opening night/], ["Repertory & Classics", /restored|classic|repertory|retrospective|35mm|double feature/], ["Documentary", /documentar/], ["Outdoor", /outdoor|rooftop|park|under the stars/]],
  "Clubs & DJs": [["House & Techno", /house|techno|rave/], ["Disco & Funk", /disco|funk|boogie/], ["Hip-hop", /hip-?hop|rap|r&b/], ["Queer parties", /queer|lgbt|gay|lesbian|drag/]],
  "Dance Socials": [["Salsa & Bachata", /salsa|bachata|kizomba|merengue/], ["Swing", /swing|lindy|charleston/], ["Tango", /tango/], ["Other styles", /contra|square|line danc|ballroom|disco/]],
  "Tastings": [["Wine", /wine/], ["Beer & Cider", /beer|cider|brew/], ["Spirits", /whisk|mezcal|tequila|rum|gin|sake|spirit/], ["Food", /cheese|chocolate|oyster|olive|honey|food/]],
  "Museums & Galleries": [["Museums", /museum/], ["Galleries", /gallery|galleries/], ["Openings", /opening|reception|vernissage/], ["Art fairs", /art fair|biennial|armory/]],
  "Markets": [["Flea & Vintage", /flea|vintage|antique|thrift/], ["Makers & Crafts", /maker|craft|artisan|handmade/], ["Holiday", /holiday|christmas|winter village/], ["Records & Books", /record|vinyl|book/]],
  "Talks & Panels": [["Ideas & Science", /science|tech|ideas|future|climate/], ["Culture & Arts", /art|film|music|literat|design/], ["City & History", /history|city|new york|architecture|neighborhood/], ["Politics & Society", /politic|democracy|justice|society|economy|election/]],
  "Tours": [["History", /history|historic|heritage|tenement/], ["Architecture", /architect|building|skyscraper|open house/], ["Food", /food|tasting|eat/], ["Nature", /nature|bird|park|garden/]],
  "Arts & Crafts": [["Ceramics", /pottery|ceramic|clay|wheel/], ["Painting & Drawing", /paint|drawing|sketch|watercolor/], ["Textiles", /knit|crochet|sew|embroider|weav|textile/], ["Printmaking", /print|screen ?print|risograph|letterpress|zine/]],
  "Karaoke": [["Live-band karaoke", /live band|band karaoke/], ["Private rooms", /private room|room|booth/], ["Bar karaoke", /karaoke/]],
  "Trivia & Quizzes": [["Music trivia & bingo", /music|bingo|name that tune|song/], ["Film & TV trivia", /film|movie|\btv\b|sitcom|anime/], ["Themed trivia", /themed|harry potter|taylor swift|friends|the office|disney|pop culture|80s|90s/], ["General trivia", /trivia|quiz/]],
  "Board & Card Games": [["Role-playing", /d&d|dungeons|role-?play|rpg/], ["Chess & classics", /chess|backgammon|mahjong|scrabble/], ["Card games & poker", /poker|card game|bridge/], ["Board games", /board game|tabletop|catan|game night/]],
  "Arcades & VR": [["Arcade & pinball", /arcade|pinball|skee/], ["VR & simulators", /virtual reality|\bvr\b|simulator/], ["Video games & esports", /video game|gaming|esports|nintendo|tournament/]],
  "Escape Rooms & Puzzles": [["Escape rooms", /escape/], ["Hunts & mysteries", /scavenger|puzzle hunt|murder mystery|treasure/]],
  "Bar Games & Bowling": [["Bowling", /bowling/], ["Ping pong", /ping ?pong|table tennis/], ["Mini golf", /mini ?golf|putt/], ["Darts, pool & more", /darts|billiards|pool|shuffleboard|axe|bocce|skee|cornhole|curling/]],
  "Running": [["Run clubs", /run club|running club|group run|trail run/], ["Races", /5k|10k|marathon|race|fun run|turkey trot/]],
  "Cycling": [["Group rides", /group ride|bike ride|critical mass|five boro/], ["Bike tours", /bike tour/]],
  "Pickup Sports": [["Pickleball & tennis", /pickleball|padel|tennis/], ["Basketball", /basketball/], ["Soccer", /soccer|football/], ["Volleyball", /volleyball/], ["Other games", /frisbee|softball|kickball|rugby|cricket/]],
  "Climbing & Skating": [["Climbing", /climb|boulder/], ["Ice skating", /ice|rink/], ["Roller & skateboard", /roller|skateboard|skate park/]],
  "Water Sports": [["Kayak & paddle", /kayak|paddle|canoe|rowing/], ["Swimming", /swim|polar plunge/], ["Sailing", /sail|boat/]],
};
export function classifySub(ev, ncat, claudeSub) {
  const list = SUBTYPES[ncat];
  if (!list) return null;
  if (claudeSub && list.some(([n]) => n === claudeSub)) return claudeSub;
  const title = (ev.title || "").toLowerCase(), full = [ev.title, ev.sub, ev.desc, ...(ev.kw || [])].join(" ").toLowerCase();
  const hit = list.find(([, re]) => re.test(title)) || list.find(([, re]) => re.test(full));
  return hit ? hit[0] : null;
}
export const SUB_NAMES = Object.fromEntries(Object.entries(SUBTYPES).map(([c, l]) => [c, l.map(([n]) => n)]));

const FROM_OLD = { Music: "Concerts", Comedy: "Comedy", "Art & Culture": "Museums & Galleries", Film: "Film", "Food & Drink": "Food Markets & Pop-ups", Outdoors: "Parks & Nature", Sports: "Pickup Sports", Family: "Festivals & Parades", "Talk & Learn": "Talks & Panels", "Get Creative": "Arts & Crafts", Nightlife: "Clubs & DJs", Shopping: "Markets", Other: "Festivals & Parades" };

export function classify(ev, claudeCat) {
  const title = (ev.title || "").toLowerCase();
  // Order: strong title signals, Claude's pick, then the rules on the title, sub and full text
  const early = EARLY.find(([, re]) => re.test(title));
  if (early) return early[0];
  if (claudeCat && CAT[claudeCat]) return claudeCat;
  const full = [ev.title, ev.sub, ev.desc, ...(ev.kw || [])].join(" ").toLowerCase();
  for (const c of CATEGORIES) if (c.re.test(title)) return c.id;
  const bySub = ev.sub && CATEGORIES.find((c) => c.re.test(String(ev.sub).toLowerCase()));
  if (bySub) return bySub.id;
  for (const c of CATEGORIES) if (c.re.test(full)) return c.id;
  return FROM_OLD[ev.cat] || "Festivals & Parades";
}

export const famColor = (fam, dark) => (FAM[fam] ? (dark ? FAM[fam].dark : FAM[fam].light) : "#8A8F98");
export const evColor = (ev, dark) => famColor(CAT[ev.ncat]?.fam || ev.fam, dark);
export const evNode = (ev) => (CAT[ev.ncat] || CAT.Concerts).icon;

// Render a Lucide icon node (array of [tag, attrs]) as React, or as an SVG string for map pins
export function LIcon({ node, size = 20, color = "currentColor", stroke = 2.2, fill = "none" }) {
  return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { display: "block" } },
    node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs })));
}
export function lIconString(node, size, color = "#fff", stroke = 2.4) {
  const inner = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// A chip for a category or sub-type: ☆ boosts it in your taste (★ = boosted), the label filters to it, × hides it (↺ brings it back)
export function CatChip({ c, label, n, on, off, starred, dark, onPick, onHide, onStar }) {
  const col = dark ? FAM[c.fam].dark : FAM[c.fam].light;
  const seg = { display: "inline-flex", alignItems: "center", justifyContent: "center", height: "100%", border: "none", background: "none", color: "inherit", font: "inherit" };
  const name = label || c.id;
  return React.createElement("span", { className: "chip", style: { height: 32, flexShrink: 0, gap: 0, padding: 0, overflow: "hidden", background: on ? col : undefined, color: on ? "#fff" : undefined, borderColor: on ? col : starred ? col : undefined, opacity: off ? 0.5 : 1 } },
    onStar && React.createElement("button", { onClick: onStar, "aria-pressed": !!starred, "aria-label": (starred ? "Remove from favorites: " : "Add to favorites: ") + name, style: { ...seg, width: 30, paddingLeft: 4 } },
      React.createElement(LIcon, { node: Heart, size: 15, color: on ? "#fff" : starred ? col : "var(--ink3)", stroke: 2.2, fill: starred ? (on ? "#fff" : col) : "none" })),
    React.createElement("button", { onClick: onPick, "aria-pressed": on, disabled: off, style: { ...seg, gap: 6, padding: onStar ? "0 6px 0 2px" : "0 6px 0 12px", textDecoration: off ? "line-through" : "none", fontWeight: starred ? 800 : undefined } },
      !label && React.createElement(LIcon, { node: c.icon, size: 14, color: on ? "#fff" : col }), name, React.createElement("span", { style: { opacity: 0.7, fontWeight: 700 } }, n)),
    React.createElement("button", { onClick: onHide, "aria-label": (off ? "Show " : "Hide ") + name, style: { ...seg, width: 30, borderLeft: "1px solid " + (on ? "rgba(255,255,255,.35)" : "var(--line)"), fontSize: 15, fontWeight: 700 } }, off ? "↺" : "×"));
}
