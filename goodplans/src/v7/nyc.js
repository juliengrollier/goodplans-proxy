// New York's yearly heartbeat: the city's own events, parades, festivals, seasons and community days.
// Each entry: id, name (the theme), prominence (how much the whole city feels it, 0–100),
// win(y) → [start, end] dates, lead (days before start when it starts to show), key (what makes an event truly about it),
// confirm (dates vary year to year: only active when the feed has a matching event inside the window).
// Rule-based dates are exact for fixed and nth-weekday events; "confirm" covers festivals that move.

const D = (y, m, d) => new Date(y, m, d);
const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const nth = (y, m, dow, n) => { const f = D(y, m, 1); return D(y, m, 1 + ((dow - f.getDay() + 7) % 7) + 7 * (n - 1)); };
const last = (y, m, dow) => { const l = D(y, m + 1, 0); return D(y, m, l.getDate() - ((l.getDay() - dow + 7) % 7)); };
const day = (d) => [d, d];
function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return D(y, mo - 1, da); }
const satOnOrAfter = (d) => add(d, (6 - d.getDay() + 7) % 7);
const thanksgiving = (y) => nth(y, 10, 4, 4);
// Moving religious and lunar dates (first full day). Approximate within a day; extend yearly.
const T = { lunar: { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26] }, diwali: { 2026: [10, 8], 2027: [9, 29], 2028: [9, 17] }, hanukkah: { 2026: [11, 5], 2027: [11, 25], 2028: [11, 13] }, eid: { 2026: [2, 20], 2027: [2, 10], 2028: [1, 27] }, holi: { 2026: [2, 4], 2027: [2, 22], 2028: [2, 11] }, rosh: { 2026: [8, 12], 2027: [9, 2], 2028: [8, 21] }, passover: { 2026: [3, 2], 2027: [3, 22], 2028: [3, 11] } };
const tb = (k, y) => (T[k][y] ? D(y, T[k][y][0], T[k][y][1]) : null);

export const NYC = [
  // ── Winter
  { id: "nye", name: "New Year's Eve", p: 97, win: (y) => [D(y, 11, 31), D(y, 11, 31)], lead: 4, key: "new year|nye|countdown|midnight|ball drop|times square|champagne|fireworks", titles: ["Ring it in, New York style", "New Year's Eve, sorted"] },
  { id: "polar-bear", name: "the Coney Island Polar Bear Plunge", p: 80, win: (y) => day(D(y, 0, 1)), lead: 1, key: "polar bear|plunge|coney island", titles: ["Brrr: the Polar Bear Plunge"] },
  { id: "restaurant-week-w", season: true, name: "NYC Restaurant Week (winter)", p: 78, win: (y) => [D(y, 0, 18), D(y, 1, 15)], lead: 3, confirm: true, key: "restaurant week|prix fixe", titles: ["Restaurant Week is on"] },
  { id: "lunar", name: "Lunar New Year", p: 92, win: (y) => { const d = tb("lunar", y); return d ? [d, add(d, 14)] : null; }, lead: 4, key: "lunar new year|chinese new year|year of the|lion dance|firecracker|chinatown|parade", titles: ["Lunar New Year in Chinatown"] },
  { id: "black-history", name: "Black History Month", p: 55, win: (y) => [D(y, 1, 1), D(y, 1, 28)], lead: 0, key: "black history|african american|harlem renaissance|juneteenth|civil rights|schomburg", titles: ["Black History Month"] },
  { id: "fashion-week-feb", name: "New York Fashion Week", p: 80, win: (y) => [D(y, 1, 5), D(y, 1, 20)], lead: 2, confirm: true, key: "fashion week|nyfw|runway|fashion show", titles: ["Fashion Week is in town"] },
  { id: "valentine", name: "Valentine's Day", p: 82, win: (y) => day(D(y, 1, 14)), lead: 6, key: "valentine|romance|romantic|date night|couples|love", titles: ["Valentine's Day is coming"] },
  { id: "westminster", season: true, name: "the Westminster Dog Show", p: 70, win: (y) => [D(y, 1, 1), D(y, 4, 31)], lead: 2, confirm: true, key: "westminster|dog show", titles: ["Westminster Dog Show week"] },
  // ── Spring
  { id: "womens-history", name: "Women's History Month", p: 50, win: (y) => [D(y, 2, 1), D(y, 2, 31)], lead: 0, key: "women's history|feminis|suffrag|women in", titles: ["Women's History Month"] },
  { id: "holi", name: "Holi", p: 80, win: (y) => { const d = tb("holi", y); return d ? [d, add(d, 3)] : null; }, lead: 3, key: "holi\\b|festival of colou?rs", titles: ["Holi: the festival of colors"] },
  { id: "eid", name: "Eid al-Fitr", p: 80, win: (y) => { const d = tb("eid", y); return d ? [d, add(d, 2)] : null; }, lead: 2, key: "\\beid\\b|ramadan|iftar", titles: ["Eid Mubarak, New York"] },
  { id: "stpat", name: "the St. Patrick's Day Parade", p: 94, win: (y) => day(D(y, 2, 17).getDay() === 0 ? D(y, 2, 16) : D(y, 2, 17)), lead: 4, key: "st\\.? patrick|irish|celtic|parade|guinness|fiddle", titles: ["St. Patrick's Day Parade"] },
  { id: "greek-parade", name: "the Greek Independence Day Parade", p: 72, win: (y) => [D(y, 2, 20), D(y, 3, 15)], lead: 2, confirm: true, key: "greek independence|greek parade", titles: ["Greek Independence Day Parade"] },
  { id: "flower-show", name: "the Macy's Flower Show", p: 72, win: (y) => [D(y, 2, 20), D(y, 3, 15)], lead: 2, confirm: true, key: "flower show", titles: ["The Macy's Flower Show is on"] },
  { id: "passover", name: "Passover", p: 70, win: (y) => { const d = tb("passover", y); return d ? [d, add(d, 7)] : null; }, lead: 2, key: "passover|seder|matzo", titles: ["Passover"] },
  { id: "easter", name: "the Easter Parade and Bonnet Festival", p: 85, win: (y) => day(easter(y)), lead: 3, key: "easter|bonnet|egg hunt|fifth avenue parade", titles: ["Easter bonnets on Fifth Avenue"] },
  { id: "cherry", name: "cherry blossom season", p: 80, win: (y) => [D(y, 3, 1), D(y, 3, 30)], lead: 0, key: "cherry blossom|sakura|hanami|botanic garden|blossom", titles: ["The cherry blossoms are out"] },
  { id: "tribeca", name: "the Tribeca Festival", p: 82, win: (y) => [D(y, 5, 1), D(y, 5, 20)], lead: 2, confirm: true, key: "tribeca festival|tribeca film", titles: ["Tribeca Festival is on"] },
  { id: "five-boro", name: "the TD Five Boro Bike Tour", p: 84, win: (y) => day(nth(y, 4, 0, 1)), lead: 3, key: "five boro|bike tour|cycling|bike", titles: ["40 miles, five boroughs, car-free"] },
  { id: "aapi", name: "Asian American and Pacific Islander Heritage Month", p: 55, win: (y) => [D(y, 4, 1), D(y, 4, 31)], lead: 0, key: "aapi|asian american|pacific islander", titles: ["AAPI Heritage Month"] },
  { id: "frieze", name: "Frieze New York", p: 72, win: (y) => [D(y, 4, 1), D(y, 4, 20)], lead: 2, confirm: true, key: "frieze", titles: ["Frieze week"] },
  { id: "fleet-week", name: "Fleet Week and Memorial Day", p: 88, win: (y) => [add(last(y, 4, 1), -5), last(y, 4, 1)], lead: 2, key: "fleet week|memorial day|navy|ship|sailor|parade|intrepid", titles: ["Fleet Week is in port"] },
  { id: "manhattanhenge-may", name: "Manhattanhenge", p: 92, win: (y) => [D(y, 4, 28), D(y, 4, 30)], lead: 3, key: "manhattanhenge|sunset", titles: ["Manhattanhenge: sun down the grid"] },
  // ── Summer
  { id: "pride-month", name: "Pride Month", p: 72, win: (y) => [D(y, 5, 1), add(last(y, 5, 0), -4)], lead: 0, key: "pride|queer|lgbt|drag|dyke|trans|ballroom", titles: ["It's Pride Month"] },
  { id: "pride-march", name: "the NYC Pride March", p: 96, win: (y) => [add(last(y, 5, 0), -3), last(y, 5, 0)], lead: 3, key: "pride|queer|lgbt|drag|dyke march|trans|ballroom|march", titles: ["Pride weekend"] },
  { id: "museum-mile", name: "the Museum Mile Festival", p: 88, win: (y) => [D(y, 5, 1), D(y, 5, 16)], lead: 3, confirm: true, key: "museum mile|museum|fifth avenue", titles: ["Museum Mile: free museums on Fifth"] },
  { id: "gov-ball", name: "Governors Ball", p: 85, win: (y) => [D(y, 5, 1), D(y, 5, 16)], lead: 3, confirm: true, key: "governors ball|gov ball", titles: ["Governors Ball weekend"] },
  { id: "puerto-rican", name: "the National Puerto Rican Day Parade", p: 86, win: (y) => day(nth(y, 5, 0, 2)), lead: 2, key: "puerto ric|boricua|salsa|parade|latin", titles: ["Puerto Rican Day Parade"] },
  { id: "philippine", name: "the Philippine Independence Day Parade", p: 70, win: (y) => day(nth(y, 5, 0, 1)), lead: 2, confirm: true, key: "philippine|filipino", titles: ["Philippine Independence Day Parade"] },
  { id: "israel-day", name: "the Israel Day on Fifth parade", p: 70, win: (y) => [D(y, 4, 25), D(y, 5, 10)], lead: 2, confirm: true, key: "israel day", titles: ["Israel Day on Fifth"] },
  { id: "juneteenth", name: "Juneteenth", p: 80, win: (y) => day(D(y, 5, 19)), lead: 3, key: "juneteenth|black|freedom|emancipation", titles: ["Juneteenth"] },
  { id: "mermaid", name: "the Coney Island Mermaid Parade", p: 92, win: (y) => day(satOnOrAfter(D(y, 5, 20))), lead: 4, key: "mermaid|coney island|boardwalk|parade", titles: ["Mermaid Parade at Coney Island"] },
  { id: "summerstage", season: true, name: "SummerStage season in Central Park", p: 70, win: (y) => [D(y, 5, 1), D(y, 8, 20)], lead: 0, confirm: true, key: "summerstage|summer stage", titles: ["SummerStage is playing"] },
  { id: "shakespeare", season: true, name: "Shakespeare in the Park", p: 72, win: (y) => [D(y, 4, 25), D(y, 7, 31)], lead: 0, confirm: true, key: "shakespeare in the park|delacorte|public theater", titles: ["Shakespeare in the Park is on"] },
  { id: "summer-for-city", season: true, name: "Summer for the City at Lincoln Center", p: 70, win: (y) => [D(y, 5, 1), D(y, 7, 15)], lead: 0, confirm: true, key: "summer for the city|lincoln center", titles: ["Summer for the City"] },
  { id: "broadway-bryant", season: true, name: "Broadway in Bryant Park", p: 74, win: (y) => [D(y, 6, 1), D(y, 7, 31)], lead: 1, confirm: true, key: "broadway in bryant park|bryant park|broadway", titles: ["Broadway in Bryant Park"] },
  { id: "july4", name: "the Fourth of July", p: 97, win: (y) => day(D(y, 6, 4)), lead: 4, key: "fourth of july|4th of july|independence|fireworks|hot dog|nathan|bbq|barbecue|rooftop", titles: ["Fireworks over the East River"] },
  { id: "manhattanhenge-jul", name: "Manhattanhenge", p: 92, win: (y) => [D(y, 6, 11), D(y, 6, 13)], lead: 3, key: "manhattanhenge|sunset", titles: ["Manhattanhenge: sun down the grid"] },
  { id: "restaurant-week-s", season: true, name: "NYC Restaurant Week (summer)", p: 78, win: (y) => [D(y, 6, 18), D(y, 7, 20)], lead: 3, confirm: true, key: "restaurant week|prix fixe", titles: ["Restaurant Week is on"] },
  { id: "summer-streets", name: "Summer Streets", p: 82, win: (y) => [nth(y, 7, 6, 1), nth(y, 7, 6, 3)], lead: 2, key: "summer streets|park avenue|car-free", only: (c) => c.dow === 6 || c.dow === 5, titles: ["Summer Streets: Park Ave car-free"] },
  { id: "harlem-week", season: true, name: "Harlem Week", p: 78, win: (y) => [D(y, 6, 25), D(y, 7, 25)], lead: 2, confirm: true, key: "harlem week", titles: ["Harlem Week"] },
  { id: "dominican", name: "the Dominican Day Parade", p: 80, win: (y) => day(nth(y, 7, 0, 2)), lead: 2, key: "dominican|merengue|bachata|parade", titles: ["Dominican Day Parade"] },
  { id: "india-day", name: "the India Day Parade", p: 78, win: (y) => [D(y, 7, 10), D(y, 7, 25)], lead: 2, confirm: true, key: "india day|indian independence", titles: ["India Day Parade"] },
  { id: "us-open", name: "the US Open", p: 86, win: (y) => [last(y, 7, 1), add(last(y, 7, 1), 13)], lead: 2, key: "us open|tennis|flushing|arthur ashe", titles: ["US Open fortnight"] },
  { id: "west-indian", name: "the West Indian American Day Carnival", p: 90, win: (y) => [add(nth(y, 8, 1, 1), -2), nth(y, 8, 1, 1)], lead: 3, key: "west indian|labor day parade|carnival|j'?ouvert|caribbean|soca|steelpan|eastern parkway", titles: ["Carnival on Eastern Parkway"] },
  // ── Autumn
  { id: "fashion-week-sep", name: "New York Fashion Week", p: 80, win: (y) => [D(y, 8, 5), D(y, 8, 20)], lead: 2, confirm: true, key: "fashion week|nyfw|runway|fashion show", titles: ["Fashion Week is in town"] },
  { id: "tribute-light", name: "September 11 remembrance and the Tribute in Light", p: 85, win: (y) => day(D(y, 8, 11)), lead: 1, key: "9/11|september 11|tribute in light|memorial", titles: ["Remembering September 11"] },
  { id: "san-gennaro", name: "the Feast of San Gennaro", p: 88, win: (y) => [D(y, 8, 10), D(y, 8, 25)], lead: 2, confirm: true, key: "san gennaro|little italy|cannoli|feast", titles: ["San Gennaro in Little Italy"] },
  { id: "hispanic-heritage", name: "Hispanic Heritage Month", p: 55, win: (y) => [D(y, 8, 15), D(y, 9, 15)], lead: 0, key: "hispanic heritage|latin|latinx|latino", titles: ["Hispanic Heritage Month"] },
  { id: "steuben", name: "the Steuben Parade", p: 70, win: (y) => day(nth(y, 8, 6, 3)), lead: 2, confirm: true, key: "steuben|german", titles: ["Steuben Parade"] },
  { id: "african-american-parade", name: "the African American Day Parade", p: 75, win: (y) => day(nth(y, 8, 0, 3)), lead: 2, confirm: true, key: "african american day parade|harlem parade", titles: ["African American Day Parade"] },
  { id: "rosh", name: "Rosh Hashanah", p: 70, win: (y) => { const d = tb("rosh", y); return d ? [d, add(d, 1)] : null; }, lead: 2, key: "rosh hashanah|jewish new year|shofar|tashlich", titles: ["Rosh Hashanah"] },
  { id: "oktoberfest", name: "Oktoberfest", p: 76, win: (y) => [D(y, 8, 18), D(y, 9, 6)], lead: 2, key: "oktoberfest|biergarten|beer garden|bavarian|pretzel|lederhosen|stein", titles: ["Prost: it's Oktoberfest"] },
  { id: "atlantic-antic", name: "Atlantic Antic", p: 76, win: (y) => [D(y, 8, 25), D(y, 9, 8)], lead: 2, confirm: true, key: "atlantic antic", titles: ["Atlantic Antic street fair"] },
  { id: "nyff", name: "the New York Film Festival", p: 76, win: (y) => [D(y, 8, 24), D(y, 9, 15)], lead: 2, confirm: true, key: "new york film festival|nyff", titles: ["New York Film Festival"] },
  { id: "pulaski", name: "the Pulaski Day Parade", p: 65, win: (y) => day(nth(y, 9, 0, 1)), lead: 2, confirm: true, key: "pulaski|polish", titles: ["Pulaski Day Parade"] },
  { id: "comic-con", name: "New York Comic Con", p: 84, win: (y) => [D(y, 9, 5), D(y, 9, 20)], lead: 2, confirm: true, key: "comic con|nycc|cosplay|comics", titles: ["Comic Con weekend"] },
  { id: "columbus", name: "the Columbus Day Parade and Indigenous Peoples' Day", p: 82, win: (y) => [add(nth(y, 9, 1, 2), -2), nth(y, 9, 1, 2)], lead: 2, key: "columbus|italian|indigenous|native american|parade", titles: ["Columbus Day Parade weekend"] },
  { id: "ohny", name: "Open House New York", p: 88, win: (y) => [nth(y, 9, 6, 3), add(nth(y, 9, 6, 3), 1)], lead: 3, key: "open house new york|ohny|architecture|behind the scenes|building tour", titles: ["Open House New York weekend"] },
  { id: "wine-food", name: "the NYC Wine & Food Festival", p: 72, win: (y) => [D(y, 9, 8), D(y, 9, 25)], lead: 2, confirm: true, key: "wine & food festival|wine and food festival|nycwff", titles: ["Wine & Food Festival"] },
  { id: "dog-halloween", name: "the Tompkins Square Halloween Dog Parade", p: 76, win: (y) => [D(y, 9, 18), D(y, 9, 27)], lead: 2, confirm: true, key: "dog parade|dog costume", titles: ["Dogs in costumes, Tompkins Square"] },
  { id: "halloween", name: "Halloween and the Village Halloween Parade", p: 95, win: (y) => day(D(y, 9, 31)), lead: 7, key: "halloween|costume|haunt|ghost|spook|horror|zombie|witch|village parade|scary|pumpkin", titles: ["Halloween in New York"] },
  { id: "muertos", name: "Día de Muertos", p: 75, win: (y) => [D(y, 10, 1), D(y, 10, 2)], lead: 2, key: "muertos|day of the dead|ofrenda", titles: ["Día de Muertos"] },
  { id: "marathon", name: "the New York City Marathon", p: 97, win: (y) => day(nth(y, 10, 0, 1)), lead: 4, key: "marathon|runner|race|cheer|expo", titles: ["Marathon Sunday"] },
  { id: "diwali", name: "Diwali", p: 80, win: (y) => { const d = tb("diwali", y); return d ? [add(d, -1), add(d, 2)] : null; }, lead: 3, key: "diwali|deepavali|rangoli|diya", titles: ["Diwali, the festival of lights"] },
  { id: "veterans", name: "the Veterans Day Parade", p: 76, win: (y) => day(D(y, 10, 11)), lead: 2, key: "veteran|parade", titles: ["Veterans Day Parade"] },
  { id: "thanksgiving", name: "Thanksgiving and the Macy's Parade", p: 98, win: (y) => [add(thanksgiving(y), -1), thanksgiving(y)], lead: 4, key: "thanksgiving|macy'?s parade|balloon|friendsgiving|turkey|pie|feast", titles: ["Thanksgiving in New York"] },
  { id: "tree-lighting", name: "the Rockefeller Center tree lighting", p: 94, win: (y) => day(add(thanksgiving(y), 6)), lead: 3, key: "tree lighting|rockefeller|christmas tree", titles: ["The tree lights up"] },
  // ── December
  { id: "hanukkah", name: "Hanukkah", p: 80, win: (y) => { const d = tb("hanukkah", y); return d ? [add(d, -1), add(d, 7)] : null; }, lead: 2, key: "hanukkah|chanukah|menorah|latke|sufganiy", titles: ["Happy Hanukkah"] },
  { id: "dyker", name: "the Dyker Heights Christmas lights", p: 78, win: (y) => [add(thanksgiving(y), 3), D(y, 11, 31)], lead: 0, key: "dyker heights|christmas lights|light tour", only: (c) => c.hour >= 15, titles: ["Dyker Heights lights are on"] },
  { id: "santacon", name: "SantaCon", p: 80, win: (y) => day(nth(y, 11, 6, 2)), lead: 2, key: "santacon|santa", titles: ["SantaCon (you've been warned)"] },
  { id: "christmas", name: "Christmas", p: 95, win: (y) => [D(y, 11, 20), D(y, 11, 25)], lead: 2, key: "christmas|xmas|carol|nutcracker|santa|holiday|rink|skat|gl[oö]gg|eggnog", titles: ["Christmas week in New York"] },
  { id: "kwanzaa", name: "Kwanzaa", p: 60, win: (y) => [D(y, 11, 26), D(y, 11, 31)], lead: 1, key: "kwanzaa", titles: ["Kwanzaa"] },
];

// Festivals that move: the real dates come from the feed's matching events (first start → last end)
export function confirmedWindow(entry, today, events) {
  const aw = activeWindow(entry, today, true);
  if (!aw) return null;
  const re = new RegExp(entry.key, "i");
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const hits = events.filter((e) => re.test(e.title || "") && (e.X || e.E) >= iso(aw.start) && e.E <= iso(aw.end));
  if (!hits.length) return null;
  if (entry.season) return aw;
  const s = new Date(hits.map((e) => e.E).sort()[0] + "T00:00:00"), e = new Date(hits.map((x) => x.X || x.E).sort().pop() + "T00:00:00");
  const lead = add(s, -(entry.lead ?? 2));
  if (today < lead || today > e) return null;
  return { start: s, end: e, phase: today < s ? "before" : "during" };
}

// Active window for "today": returns { start, end, phase: "before" | "during" } or null
export function activeWindow(entry, today, wide) {
  for (const y of [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() + 1]) {
    const w = entry.win(y);
    if (!w || !w[0]) continue;
    const [s, e] = w;
    const lead = add(s, -(wide ? 14 : entry.lead ?? 2));
    if (today >= lead && today <= e) return { start: s, end: e, phase: today < s ? "before" : "during" };
  }
  return null;
}

// ── Standing items for the Regulars view: where each yearly event happens and what it is.
// [category, venue (shown), lat, lon, one-line description, photo search]. Entries without a row (heritage months,
// religious days with no single NYC event) stay in the city's mood but are not listed as regulars.
const LES = [40.7186, -73.9865];
export const META = {
  "nye": ["Other", "Times Square", 40.758, -73.9855, "The ball drops over Times Square at midnight, with a citywide countdown and fireworks in the parks.", "Times Square New Year's Eve ball drop"],
  "polar-bear": ["Outdoors", "Coney Island Beach", 40.5749, -73.9859, "Hundreds of swimmers charge into the freezing Atlantic on New Year's Day.", "Coney Island Polar Bear Plunge"],
  "restaurant-week-w": ["Food & Drink", "Restaurants citywide", ...LES, "Prix-fixe lunch and dinner menus at hundreds of restaurants across the city.", "NYC Restaurant Week"],
  "lunar": ["Art & Culture", "Chinatown", 40.7158, -73.997, "Lion dances, firecrackers and a parade through the streets of Chinatown.", "Chinatown Lunar New Year parade New York"],
  "fashion-week-feb": ["Art & Culture", "Citywide", ...LES, "Runway shows, parties and pop-ups as designers present their new collections.", "New York Fashion Week"],
  "stpat": ["Other", "Fifth Avenue", 40.7587, -73.9768, "The world's oldest and largest St. Patrick's Day parade marches up Fifth Avenue.", "St Patrick's Day Parade Fifth Avenue"],
  "greek-parade": ["Other", "Fifth Avenue", 40.7700, -73.9700, "Marching bands and traditional dress on Fifth Avenue for Greek Independence Day.", "Greek Independence Day Parade New York"],
  "flower-show": ["Art & Culture", "Macy's Herald Square", 40.7508, -73.9887, "Macy's flagship store fills with flowers and large floral displays.", "Macy's Flower Show"],
  "easter": ["Other", "Fifth Avenue", 40.7585, -73.9760, "Elaborate bonnets and costumes parade on Fifth Avenue around St. Patrick's Cathedral.", "Easter Parade Bonnet Festival Fifth Avenue"],
  "cherry": ["Outdoors", "Brooklyn Botanic Garden", 40.6694, -73.9624, "Cherry trees bloom across the city, with the Brooklyn Botanic Garden's collection the best known.", "Brooklyn Botanic Garden cherry blossoms"],
  "tribeca": ["Film", "Tribeca", 40.7163, -74.0086, "Film premieres, talks and screenings across Lower Manhattan.", "Tribeca Festival"],
  "five-boro": ["Sports", "Five boroughs", ...LES, "Tens of thousands of cyclists ride car-free streets through all five boroughs.", "TD Five Boro Bike Tour"],
  "frieze": ["Art & Culture", "The Shed", 40.7536, -74.0023, "An international contemporary art fair in Hudson Yards.", "Frieze New York The Shed"],
  "fleet-week": ["Other", "Intrepid Museum", 40.7645, -73.9996, "Navy ships dock and sailors fill the city, with ship tours and Memorial Day events.", "Fleet Week New York ships"],
  "manhattanhenge-may": ["Outdoors", "42nd Street", 40.7527, -73.9772, "The setting sun lines up exactly with Manhattan's cross streets.", "Manhattanhenge 42nd Street"],
  "pride-march": ["Other", "Fifth Avenue to the West Village", 40.7336, -74.0027, "The Pride March heads down Fifth Avenue toward the Stonewall National Monument.", "NYC Pride March"],
  "museum-mile": ["Art & Culture", "Museum Mile, Fifth Avenue", 40.7794, -73.9632, "Fifth Avenue closes to traffic and its museums open free for an evening.", "Museum Mile Festival Fifth Avenue"],
  "gov-ball": ["Music", "Flushing Meadows Corona Park", 40.7400, -73.8407, "A three-day music festival with big headliners.", "Governors Ball music festival"],
  "puerto-rican": ["Other", "Fifth Avenue", 40.7700, -73.9700, "One of the city's biggest parades, celebrating Puerto Rican culture on Fifth Avenue.", "National Puerto Rican Day Parade"],
  "juneteenth": ["Art & Culture", "Citywide", ...LES, "Celebrations of emancipation and Black culture across the city.", "Juneteenth New York celebration"],
  "mermaid": ["Other", "Coney Island", 40.5755, -73.9707, "Mermaids, sea creatures and floats parade along Surf Avenue and the boardwalk.", "Coney Island Mermaid Parade"],
  "summerstage": ["Music", "Rumsey Playfield, Central Park", 40.7713, -73.9718, "Free and benefit concerts in parks across the five boroughs.", "SummerStage Central Park concert"],
  "shakespeare": ["Art & Culture", "Delacorte Theater, Central Park", 40.7799, -73.9690, "Free Public Theater productions under the stars.", "Shakespeare in the Park Delacorte Theater"],
  "summer-for-city": ["Art & Culture", "Lincoln Center", 40.7725, -73.9835, "Free outdoor music, dance and an open-air ballroom at Lincoln Center.", "Summer for the City Lincoln Center"],
  "broadway-bryant": ["Music", "Bryant Park", 40.7536, -73.9832, "Free lunchtime performances by casts of Broadway shows.", "Broadway in Bryant Park"],
  "july4": ["Other", "East River", 40.7065, -73.9969, "Macy's fireworks over the river, and Nathan's hot dog contest at Coney Island.", "Macy's Fourth of July fireworks New York"],
  "manhattanhenge-jul": ["Outdoors", "42nd Street", 40.7527, -73.9772, "The setting sun lines up exactly with Manhattan's cross streets.", "Manhattanhenge 42nd Street"],
  "restaurant-week-s": ["Food & Drink", "Restaurants citywide", ...LES, "Prix-fixe lunch and dinner menus at hundreds of restaurants across the city.", "NYC Restaurant Week"],
  "summer-streets": ["Outdoors", "Park Avenue", 40.7505, -73.9790, "Park Avenue closes to cars on summer Saturday mornings for walking, biking and play.", "Summer Streets Park Avenue"],
  "harlem-week": ["Art & Culture", "Harlem", 40.8116, -73.9465, "A month of concerts, food and culture celebrating Harlem.", "Harlem Week festival"],
  "dominican": ["Other", "Sixth Avenue", 40.7600, -73.9800, "Merengue, bachata and floats celebrating Dominican culture.", "Dominican Day Parade New York"],
  "india-day": ["Other", "Madison Avenue", 40.7500, -73.9800, "A parade marking Indian Independence Day.", "India Day Parade New York"],
  "us-open": ["Sports", "USTA Billie Jean King National Tennis Center", 40.7498, -73.8456, "Two weeks of Grand Slam tennis in Queens.", "US Open tennis Arthur Ashe Stadium"],
  "west-indian": ["Other", "Eastern Parkway, Brooklyn", 40.6720, -73.9580, "Carnival costumes, steelpan and soca along Eastern Parkway on Labor Day.", "West Indian American Day Carnival Eastern Parkway"],
  "fashion-week-sep": ["Art & Culture", "Citywide", ...LES, "Runway shows, parties and pop-ups as designers present their new collections.", "New York Fashion Week"],
  "tribute-light": ["Other", "9/11 Memorial", 40.7115, -74.0134, "Twin beams of light rise from Lower Manhattan in remembrance.", "Tribute in Light New York"],
  "san-gennaro": ["Food & Drink", "Mulberry Street, Little Italy", 40.7191, -73.9973, "Food stalls, processions and cannoli on Mulberry Street for about eleven days.", "Feast of San Gennaro Little Italy"],
  "steuben": ["Other", "Fifth Avenue", 40.7700, -73.9700, "German-American parade up Fifth Avenue, followed by Oktoberfest parties.", "Steuben Parade New York"],
  "african-american-parade": ["Other", "Harlem", 40.8116, -73.9465, "A parade through Harlem celebrating African American culture.", "African American Day Parade Harlem"],
  "oktoberfest": ["Food & Drink", "Beer gardens citywide", ...LES, "Steins, pretzels and oompah bands in beer gardens across the city.", "Oktoberfest beer garden New York"],
  "atlantic-antic": ["Other", "Atlantic Avenue, Brooklyn", 40.6866, -73.9894, "Brooklyn's biggest street fair, with food, music and stalls along Atlantic Avenue.", "Atlantic Antic street fair Brooklyn"],
  "nyff": ["Film", "Lincoln Center", 40.7725, -73.9835, "Premieres and new international films at Lincoln Center.", "New York Film Festival Lincoln Center"],
  "pulaski": ["Other", "Fifth Avenue", 40.7700, -73.9700, "Polish-American parade on Fifth Avenue.", "Pulaski Day Parade New York"],
  "comic-con": ["Other", "Javits Center", 40.7578, -74.0022, "Comics, cosplay and fan panels at the Javits Center.", "New York Comic Con Javits Center"],
  "columbus": ["Other", "Fifth Avenue", 40.7700, -73.9700, "Italian-American parade on Fifth Avenue, alongside Indigenous Peoples' Day events.", "Columbus Day Parade Fifth Avenue"],
  "ohny": ["Art & Culture", "Citywide", ...LES, "Buildings usually closed to the public open their doors for a weekend.", "Open House New York weekend"],
  "wine-food": ["Food & Drink", "Citywide", ...LES, "Tastings, dinners and chef events across the city.", "New York City Wine & Food Festival"],
  "dog-halloween": ["Other", "Tompkins Square Park", 40.7265, -73.9815, "Dogs in costume parade in the East Village.", "Tompkins Square Halloween Dog Parade"],
  "halloween": ["Other", "Sixth Avenue, Greenwich Village", 40.7336, -73.9990, "The Village Halloween Parade marches up Sixth Avenue; anyone in costume can join.", "Village Halloween Parade Sixth Avenue"],
  "marathon": ["Sports", "Five boroughs, finish in Central Park", 40.7716, -73.9748, "Tens of thousands of runners cross all five boroughs to finish in Central Park.", "New York City Marathon"],
  "veterans": ["Other", "Fifth Avenue", 40.7700, -73.9700, "The nation's largest Veterans Day parade, on Fifth Avenue.", "Veterans Day Parade New York"],
  "thanksgiving": ["Other", "Central Park West to Herald Square", 40.7685, -73.9786, "Giant balloons float from Central Park West to Herald Square on Thanksgiving morning.", "Macy's Thanksgiving Day Parade balloons"],
  "tree-lighting": ["Other", "Rockefeller Center", 40.7587, -73.9787, "The Rockefeller Center Christmas tree is lit for the season.", "Rockefeller Center Christmas tree lighting"],
  "hanukkah": ["Art & Culture", "Grand Army Plaza", 40.7644, -73.9730, "Giant menorahs are lit each night of Hanukkah, including at Grand Army Plaza.", "Grand Army Plaza menorah lighting"],
  "dyker": ["Outdoors", "Dyker Heights, Brooklyn", 40.6219, -74.0117, "Homes in Dyker Heights put on the city's most extravagant Christmas lights.", "Dyker Heights Christmas lights"],
  "santacon": ["Nightlife", "Bars citywide", ...LES, "Thousands in Santa suits crawl the city's bars.", "SantaCon New York"],
};

const cap = (s) => s.replace(/^the /, "").replace(/^./, (c) => c.toUpperCase());
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Next (or current) occurrence of each yearly event, as an event-like card. Moving festivals use the feed's dates
// when listed, otherwise their usual month.
export function annualItems(today, events) {
  const out = [];
  NYC.forEach((n) => {
    const meta = META[n.id];
    if (!meta) return;
    let s = null, e = null, exact = !n.confirm || n.season;
    for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
      const w = n.win(y);
      if (w && w[1] >= today) { [s, e] = w; break; }
    }
    if (!s) return;
    if (n.confirm) {
      const c = confirmedWindow(n, today, events);
      if (c) { s = c.start; e = c.end; exact = true; }
    }
    const [cat, venue, lat, lon, desc, imgQ] = meta;
    out.push({
      id: "annual-" + n.id + "-" + s.getFullYear(), title: cap(n.name), E: iso(s), X: iso(e) !== iso(s) ? iso(e) : undefined, time: "",
      venue, coord: [lat, lon], cat, desc, imgQ, price: "", src: "NYC calendar", tier: 1, recurring: "annual",
      recLabel: "Every year", annual: true, exact, usual: MONTH[s.getMonth()],
    });
  });
  return out.sort((a, b) => (a.E < b.E ? -1 : 1));
}
