// What you'll be doing (8 colour families) and what it is (25 categories, one icon each).
// Families give the colour; categories give the icon and are what you filter by.
// The scoring engine still uses the older 13 categories (ev.cat) internally; this layer is ev.ncat / ev.fam.
import React from "react";
import {
  Popcorn, Headphones, UtensilsCrossed, PartyPopper, Scissors, Activity, Compass, GraduationCap,
  Drama, Laugh, Clapperboard, Sparkles, Trophy, Guitar, Music2, Piano, Wine, Soup, Martini, Disc3, Footprints, MicVocal,
  Palette, ChefHat, Bike, Flower2, Volleyball, Landmark, ShoppingBasket, FerrisWheel, Trees, Presentation, BookOpen, Signpost,
} from "lucide";

export const FAMILIES = [
  { id: "watch", label: "Watch", light: "#E53935", dark: "#F26260", icon: Popcorn },
  { id: "listen", label: "Listen", light: "#7B4BD6", dark: "#9B70F0", icon: Headphones },
  { id: "eat", label: "Eat & Drink", short: "Eat", light: "#F2611D", dark: "#FF7A3D", icon: UtensilsCrossed },
  { id: "party", label: "Party", light: "#4338CA", dark: "#6A62F0", icon: PartyPopper },
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
  { id: "Karaoke & Trivia", fam: "party", icon: MicVocal, re: /karaoke|trivia|quiz|bingo|game night|board game|pub quiz/ },
  { id: "Clubs & DJs", fam: "party", icon: Disc3, re: /\bdj\b|djs|club night|rave|techno|house music|disco|dance party|nightclub|afterparty|after-party|boiler room/ },
  { id: "Dance & Opera", fam: "watch", icon: Sparkles, re: /opera|ballet|dance (performance|company|theater|show)|modern dance|choreograph|nutcracker/ },
  { id: "Theater", fam: "watch", icon: Drama, re: /theat|broadway|musical|\bplay\b|cabaret|drag|burlesque|magic show|puppet|circus|shakespeare|one-?(wo)?man show/ },
  { id: "Film", fam: "watch", icon: Clapperboard, re: /film|screening|cinema|movie|documentary|double feature/ },
  { id: "Live Sports", fam: "watch", icon: Trophy, re: /\bvs\.?\b|versus|knicks|nets\b|yankees|mets\b|rangers|islanders|liberty|nycfc|red bulls|us open|tennis|boxing|wrestling|roller derby|watch party/ },
  { id: "Jazz & Blues", fam: "listen", icon: Music2, re: /jazz|blues|bebop|big band|swing band/ },
  { id: "Classical", fam: "listen", icon: Piano, re: /classical|orchestra|symphon|chamber|string quartet|philharmonic|recital|choir|choral|organ|baroque|vivaldi|bach|beethoven|mozart/ },
  { id: "Tastings", fam: "eat", icon: Wine, re: /tasting|wine|natural wine|sake|whisk|mezcal|tequila|cheese|chocolate|beer fest|cider/ },
  { id: "Food Markets & Pop-ups", fam: "eat", icon: Soup, re: /food (market|festival|hall|pop-?up|crawl)|night market|smorgasburg|supper club|pop-?up dinner|dumpling|food truck|crawl|feast|potluck|friendsgiving/ },
  { id: "Bars & Happy Hours", fam: "eat", icon: Martini, re: /happy hour|cocktail|speakeasy|brewery|taproom|\bbar\b|pub\b|beer garden|biergarten|oktoberfest/ },
  { id: "Tours", fam: "learn", icon: Signpost, re: /walking tour|\btour\b|guided walk|history walk|open house|behind the scenes|architecture walk/ },
  { id: "Books & Readings", fam: "learn", icon: BookOpen, re: /book|reading|poetry|poet|author|literary|novel|launch|zine fair/ },
  { id: "Talks & Panels", fam: "learn", icon: Presentation, re: /talk|lecture|panel|conversation|discussion|q ?& ?a|symposium|seminar|salon|debate|class on/ },
  { id: "Museums & Galleries", fam: "explore", icon: Landmark, re: /museum|gallery|galleries|exhibit|art show|installation|opening reception|biennial|art fair|retrospective/ },
  { id: "Festivals & Parades", fam: "explore", icon: FerrisWheel, re: /festival|parade|street fair|carnival|block party|celebration|tree lighting|fireworks|feast of/ },
  { id: "Markets", fam: "explore", icon: ShoppingBasket, re: /flea|vintage|market|record fair|sample sale|bazaar|craft fair|swap/ },
  { id: "Run & Ride", fam: "move", icon: Bike, re: /\brun\b|running|5k|10k|half marathon|race|bike|cycling|\bride\b/ },
  { id: "Play", fam: "move", icon: Volleyball, re: /climb|boulder|skat|rink|kayak|paddle|canoe|pickleball|soccer|basketball|volleyball|bowling|mini ?golf|ping ?pong|swim|hike|frisbee/ },
  { id: "Parks & Nature", fam: "explore", icon: Trees, re: /park|garden|nature|bird|botanic|foliage|waterfront|beach|forest|wildlife|cherry blossom/ },
  { id: "Concerts", fam: "listen", icon: Guitar, re: /concert|live music|band|singer|songwriter|hip-?hop|rap\b|rock|indie|folk|r&b|soul|funk|punk|gig|acoustic|showcase/ },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const CAT_NAMES = CATEGORIES.map((c) => c.id);

// Fallback from the older categories when nothing in the text decides
const FROM_OLD = { Music: "Concerts", Comedy: "Comedy", "Art & Culture": "Museums & Galleries", Film: "Film", "Food & Drink": "Food Markets & Pop-ups", Outdoors: "Parks & Nature", Sports: "Play", Family: "Festivals & Parades", "Talk & Learn": "Talks & Panels", "Get Creative": "Arts & Crafts", Nightlife: "Clubs & DJs", Shopping: "Markets", Other: "Festivals & Parades" };

export function classify(ev, claudeCat) {
  if (claudeCat && CAT[claudeCat]) return claudeCat;
  const title = (ev.title || "").toLowerCase();
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
export function LIcon({ node, size = 20, color = "currentColor", stroke = 2.2 }) {
  return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { display: "block" } },
    node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs })));
}
export function lIconString(node, size, color = "#fff", stroke = 2.4) {
  const inner = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// A category chip: tap the label to show only it, tap × to hide it (tap again to bring it back)
export function CatChip({ c, n, on, off, dark, onPick, onHide }) {
  const col = dark ? FAM[c.fam].dark : FAM[c.fam].light;
  return React.createElement("span", { className: "chip", style: { height: 32, flexShrink: 0, gap: 0, padding: 0, overflow: "hidden", background: on ? col : undefined, color: on ? "#fff" : undefined, borderColor: on ? col : undefined, opacity: off ? 0.5 : 1 } },
    React.createElement("button", { onClick: onPick, "aria-pressed": on, disabled: off, style: { display: "inline-flex", alignItems: "center", gap: 6, height: "100%", padding: "0 6px 0 12px", border: "none", background: "none", color: "inherit", font: "inherit", textDecoration: off ? "line-through" : "none" } },
      React.createElement(LIcon, { node: c.icon, size: 14, color: on ? "#fff" : col }), c.id, React.createElement("span", { style: { opacity: 0.7, fontWeight: 700 } }, n)),
    React.createElement("button", { onClick: onHide, "aria-label": (off ? "Show " : "Hide ") + c.id, style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: "100%", border: "none", borderLeft: "1px solid " + (on ? "rgba(255,255,255,.35)" : "var(--line)"), background: "none", color: "inherit", font: "inherit", fontSize: 15, fontWeight: 700 } }, off ? "↺" : "×"));
}
