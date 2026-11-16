// Preview mode (claude.ai artifact): no network is allowed there, so every backend call is answered with sample data.
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const day = (k) => { const d = new Date(); d.setDate(d.getDate() + k); return iso(d); };
// Today's sample times are relative to now, so the preview always has something on tonight
const at = (h) => { const n = new Date(); let m = Math.min(n.getHours() * 60 + n.getMinutes() + Math.round(h * 60), 23 * 60 + 50); m = Math.max(m, 0); m -= m % 10; let H = Math.floor(m / 60); const M = m % 60, ap = H >= 12 ? "PM" : "AM"; H = H % 12 || 12; return H + ":" + String(M).padStart(2, "0") + " " + ap; };
const span = (a, b) => at(a) + " - " + (b >= 3 ? "3:00 AM" : at(b));
const ev = (id, title, k, time, price, venue, hood, cat, sub, coord, desc, extra = {}) =>
  ({ id, title, E: day(k), time, price, venue, hood, cat, sub, tier: 1, ticket: price !== "Free", tags: [], coord, src: "Sample", url: "", desc, ...extra });

const EVENTS = [
  ev("p1", "Late-night jazz trio", 0, at(0.5), "$20", "Smalls Jazz Club, West Village", "West Village", "Music", "Jazz", [40.7344, -74.0027], "A piano trio plays standards and originals in a tiny basement club."),
  ev("p2", "Stand-up showcase", 0, at(0.3), "$15", "Caveat, LES", "Lower East Side", "Comedy", "Stand-up", [40.7208, -73.9846], "Six comics try their sharpest new material."),
  ev("p3", "Natural wine tasting", 0, span(-1, 2), "$25", "Ten Bells, LES", "Lower East Side", "Food & Drink", "Tasting", [40.7194, -73.9886], "Pour-your-own flights of low-intervention wines."),
  ev("p4", "Indie double feature", 0, at(0.4), "$17", "Metrograph, LES", "Lower East Side", "Film", "Screening", [40.7146, -73.9917], "Two restored 90s indies back to back."),
  ev("p5", "Vinyl DJ night", 0, span(0, 4), "$10", "Nowadays, Ridgewood", "Ridgewood", "Nightlife", "DJ", [40.7056, -73.9150], "Disco and house on a big sound system."),
  ev("p6", "Poetry open mic", 0, at(0.2), "Free", "Bluestockings, LES", "Lower East Side", "Talk & Learn", "Reading", [40.7202, -73.9873], "Sign up at the door; five minutes each."),
  ev("p7", "Friendsgiving potluck", 3, "6 PM", "Free", "Pioneer Works, Red Hook", "Red Hook", "Food & Drink", "Potluck", [40.6788, -74.0118], "Bring a dish, take home leftovers."),
  ev("p8", "Thanksgiving pie-making class", 5, "2 PM", "$40", "Ovenly, Greenpoint", "Greenpoint", "Get Creative", "Class", [40.7297, -73.9545], "Make two pies to take home."),
  ev("p9", "Holiday market opening", 1, "11 AM–8 PM", "Free", "Union Square", "Union Square", "Shopping", "Market", [40.7359, -73.9911], "Local makers, gifts and cocoa."),
  ev("p10", "Saturday flea market", 1, "10 AM–5 PM", "Free", "Brooklyn Flea, DUMBO", "DUMBO", "Shopping", "Flea", [40.7033, -73.9881], "Vintage clothes, records and furniture."),
  ev("p11", "Guided walk: Lower East Side history", 1, "11 AM", "$25", "Tenement Museum, LES", "Lower East Side", "Talk & Learn", "Walking tour", [40.7188, -73.9900], "Stories of the immigrants who lived on Orchard Street."),
  ev("p12", "Sunday jazz brunch", 2, "12 PM", "$35", "Minton's, Harlem", "Harlem", "Music", "Jazz", [40.8053, -73.9524], "Southern brunch with a live combo."),
  ev("p13", "Indoor climbing intro", 2, "4 PM", "$30", "Brooklyn Boulders", "Gowanus", "Sports", "Climbing", [40.6766, -73.9845], "Gear included, no experience needed."),
  ev("p14", "Improv jam", 4, "8 PM", "Free", "The PIT Loft", "Midtown", "Comedy", "Improv", [40.7433, -73.9893], "Watch or jump in."),
  ev("p15", "Chamber music by candlelight", 6, "7 PM", "$45", "St. Mark's Church", "East Village", "Music", "Classical", [40.7299, -73.9870], "Vivaldi's Four Seasons by candlelight."),
  ev("p16", "Gallery night", 4, "6 PM–9 PM", "Free", "Chelsea galleries", "Chelsea", "Art & Culture", "Exhibition", [40.7465, -74.0048], "Openings along West 24th Street."),
  ev("p17", "Trivia night", 3, "8 PM", "Free", "Parklife, Bushwick", "Bushwick", "Nightlife", "Trivia", [40.6985, -73.9270], "Teams of up to six.", { }),
  ev("p18", "Trivia night", 10, "8 PM", "Free", "Parklife, Bushwick", "Bushwick", "Nightlife", "Trivia", [40.6985, -73.9270], "Teams of up to six."),
  ev("p19", "Cocoa & skating", 0, span(-3, 3), "Free", "Bryant Park Winter Village", "Midtown", "Outdoors", "Skating", [40.7536, -73.9832], "Free admission rink; skate rental extra."),
  ev("p21", "Indie rock triple bill", 1, "8 PM", "$18", "Mercury Lounge, LES", "Lower East Side", "Music", "Rock", [40.7222, -73.9866], "Three up-and-coming guitar bands."),
  ev("p22", "Hip-hop showcase", 2, "9 PM", "$15", "Baby's All Right, Williamsburg", "Williamsburg", "Music", "Hip-Hop", [40.7099, -73.9631], "Local MCs and a live DJ."),
  ev("p23", "Folk singer-songwriter night", 3, "7 PM", "$12", "Rockwood Music Hall, LES", "Lower East Side", "Music", "Folk", [40.7224, -73.9887], "Acoustic sets in a cozy room."),
  ev("p24", "Afrobeat & Latin dance band", 4, "9 PM", "$20", "Nublu, East Village", "East Village", "Music", "World Music", [40.7238, -73.9817], "Horns, percussion and a packed floor."),
  ev("p25", "Jazz jam session", 5, "10 PM", "Free", "Fat Cat, West Village", "West Village", "Music", "Jazz", [40.7337, -74.0021], "Open jam, bring your instrument."),
  ev("p20", "Dumpling-making workshop", 2, "3 PM", "$55", "Chinatown community kitchen", "Chinatown", "Food & Drink", "Class", [40.7158, -73.997], "Fold and pan-fry three styles."),
];

const enrichReply = (body) => {
  if (body.mode === "tags") {
    const pick = (l, s) => l[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % l.length];
    return { tags: Object.fromEntries((body.events || []).map((e) => [e.id, { k: [(e.sub || e.cat || "").toLowerCase(), "nyc"].filter(Boolean), cat: e.cat, h: (e.desc || "").split(/[.!]/)[0].split(" ").slice(0, 7).join(" "),
      d: { energy: pick(["calm", "lively", "wild"], e.id), crowd: pick(["intimate", "medium", "big"], e.title), novelty: pick(["classic", "fresh", "weird"], e.id + "n"), social: pick(["date", "group", "any"], e.title + "s") } }])) };
  }
  if (body.mode === "lists") return { themes: Object.fromEntries((body.lists || []).map((l) => [l.name, /jazz/i.test(l.name) ? { cats: ["Concerts"], d: { crowd: "intimate", energy: "calm" }, kind: "fav" } : { cats: [], d: {}, kind: "want" }])) };
  // Taste card: built from the strongest learned features (the live app has Claude write it)
  if (body.mode === "taste") {
    const nice = (f) => f.replace(/^(\w+):/, "").replace(/[=/&]/g, " ").replace(/\b\w/, (c) => c.toUpperCase());
    return { lines: [...(body.likes || []).slice(0, 4).map((x) => ({ text: "Drawn to " + nice(x.f).toLowerCase(), f: [x.f] })), ...(body.dislikes || []).slice(0, 2).map((x) => ({ text: "Tends to skip " + nice(x.f).toLowerCase(), f: [x.f] }))] };
  }
  if (body.mode === "highlights") return { text: "Tonight: [[1|jazz trio]] in a West Village basement / [[2|stand-up]] around the corner ▫️ Weekend: [[3|holiday market]] and a [[4|history walk]] ▫️ Next week: [[5|Friendsgiving]] in Red Hook" };
  // Mood titles: the engine's own title bank and facts (the live app has Claude write them)
  if (body.mode === "mood") return { title: (body.mood?.titles || ["Your mood"])[0], sub: body.scope === "you" ? "Reading the room: " + (body.mood?.read || "") : body.mood?.facts || "" };
  return {};
};

const weather = () => {
  const byDay = (k) => day(k);
  const daily = { time: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(byDay), sunset: [], temperature_2m_max: [52, 50, 48, 46, 47, 52, 58, 55, 50, 49], temperature_2m_min: [40, 38, 36, 34, 35, 40, 45, 42, 38, 37], precipitation_probability_max: [10, 20, 10, 10, 70, 10, 5, 10, 20, 10], snowfall_sum: Array(10).fill(0) };
  daily.sunset = daily.time.map((t) => t + "T16:40");
  const hours = { time: [], precipitation_probability: [], precipitation: [], temperature_2m: [], apparent_temperature: [], weather_code: [], wind_speed_10m: [], snowfall: [] };
  daily.time.forEach((t, i) => { for (let h = 0; h < 24; h++) { hours.time.push(t + "T" + pad(h) + ":00"); hours.precipitation_probability.push(daily.precipitation_probability_max[i] > 50 && h > 15 ? 70 : 5); hours.precipitation.push(0); hours.temperature_2m.push(daily.temperature_2m_max[i] - 6); hours.apparent_temperature.push(daily.temperature_2m_max[i] - 10); hours.weather_code.push(2); hours.wind_speed_10m.push(8); hours.snowfall.push(0); } });
  return { daily, hourly: hours, current: { temperature_2m: 44, apparent_temperature: 39, precipitation: 0, snowfall: 0, weather_code: 2, wind_speed_10m: 8 } };
};

const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes("script.google.com")) {
    if (url.includes("busyDays")) return json({ busySlots: [], calendarName: "Sample" });
    if (url.includes("pushStatus")) return json({ subscriptions: 0 });
    if (url.includes("action=tasteGet")) return json({ v: 1, at: Date.now(), strong: 8, w: { "dim:energy=calm": 0.6, "dim:crowd=intimate": 0.5, "cat:museums & galleries": 0.7, "dim:energy=wild": -0.6, "price:high": -0.5 } });
    if (url.includes("action=tastePut")) return json({ ok: true });
    if (url.includes("action=calAdd")) return json({ ok: true, gid: "sample-" + Date.now() });
    if (url.includes("action=calRemove")) return json({ ok: true });
    return json({ events: EVENTS, refreshed: new Date().toISOString() });
  }
  if (url.includes("open-meteo")) return json(weather());
  // Preview only: one of five bundled sample photos per event (the artifact viewer blocks outside images)
  if (url.includes("/api/image")) { let h = 0; for (const ch of url) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return json({ src: new URL("img/p" + ((h % 5) + 1) + ".jpg", location.href).href, kind: "event" }); }
  if (url.includes("/api/enrich")) return json(enrichReply(JSON.parse(init.body || "{}")));
  return new Response("", { status: 404 });
};

// Start fresh once per preview build (so remembered filters and likes survive reopening the same version)
try {
  const ver = String(__PREVIEW_BUILD__);
  if (localStorage.getItem("gp_preview_ver") !== ver) {
    Object.keys(localStorage).filter((k) => k.startsWith("gp_")).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("gp_preview_ver", ver);
  }
  localStorage.removeItem("gp_events_v1"); // sample events always reload with fresh times
} catch { /* storage blocked */ }
window.addEventListener("DOMContentLoaded", () => {
  const b = document.createElement("div");
  b.textContent = "Preview · sample events";
  b.style.cssText = "position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:9999;background:#F2611D;color:#fff;font:700 12px/1 system-ui;padding:6px 10px;border-radius:12px;pointer-events:none;opacity:.92";
  document.body.appendChild(b);
});
