// Details the newsletter left out (exact venue address, start time, price, ticket link, whether it's in NYC at all),
// looked up once per event by /api/details and kept on the phone.
import { API_BASE } from "./images.js";

export const DETAILS_KEY = "gp_details_v1";
const RETRY_DAYS = 4, DAILY_CAP = 25;
export function loadDetails() { try { return JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}"); } catch { return {}; } }
function saveDetails(d) {
  try {
    const keep = Object.entries(d).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 600);
    localStorage.setItem(DETAILS_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* storage full or off */ }
}

const UNKNOWN_T = /^(|see website|various|tba|tbd|varies|check website|all day)$/i;
const UNKNOWN_P = /^(|see website|tba|tbd|varies|check website)$/i;
const GENERIC_V = /^(see website|tba|tbd|various|various venues|multiple venues|citywide)\b/i;
const BOROUGH = /^(manhattan|brooklyn|queens|the bronx|bronx|staten island|new york|nyc|new york city)$/i;
export const needsDetails = (e) => !!e && (UNKNOWN_T.test(String(e.time || "").trim()) || UNKNOWN_P.test(String(e.price || "").trim()) || (e.ticket && !e.ticketUrl) || BOROUGH.test(String(e.hood || "").trim()) || GENERIC_V.test(String(e.venue || "").trim()));

// Places outside the city named in the listing's venue ("See website, London")
const ELSEWHERE = /\b(london|uk|england|scotland|paris|berlin|los angeles|hollywood|chicago|boston|philadelphia|washington,? d\.?c\.?|miami|toronto|las vegas|nashville|san francisco|new orleans|atlanta|seattle)\b/i;
export const outsideNYC = (e) => {
  const v = String(e.venue || ""), last = v.split(",").slice(1).join(",");
  if (ELSEWHERE.test(last) || ELSEWHERE.test(String(e.hood || ""))) return true;
  return false;
};

// Newsletter sources whose site the listing sometimes gets wrong (a guessed ".org"/".com" for the real domain).
// When the link's host is that source's name on another domain ending, point it to the real one (path kept).
const SOURCE_SITES = { "nyc for free": "nycforfree.co", "the skint": "theskint.com", "nonsense nyc": "nonsensenyc.com" };
const stem = (h) => h.replace(/^www\./, "").replace(/\.[a-z.]+$/, "");
export function fixUrl(e) {
  if (!e || !e.url) return e;
  let u; try { u = new URL(e.url); } catch { return { ...e, url: undefined }; }
  if (!/^https?:$/.test(u.protocol)) return { ...e, url: undefined };
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const site = Object.values(SOURCE_SITES).find((d) => stem(d) === stem(host)) || SOURCE_SITES[String(e.src || "").toLowerCase().trim()];
  if (!site || host === site || stem(site) !== stem(host)) return e;
  u.hostname = site; u.protocol = "https:";
  return { ...e, url: u.href };
}

// Apply stored details to an event (only fills what the listing didn't have, except a precise place for a vague one)
export function withDetails(e, all) {
  const d = all[e.id];
  if (!d) return e;
  const o = { ...e };
  const pg = d.page, pl = d.place;
  if (pg?.nyc === false) o.outside = true;
  if (pg) {
    if (UNKNOWN_T.test(String(e.time || "").trim()) && pg.start) o.time = pg.start + (pg.end ? " – " + pg.end : "");
    if (UNKNOWN_P.test(String(e.price || "").trim()) && pg.price) o.price = pg.price;
    if (pg.ticketUrl) o.ticketUrl = pg.ticketUrl;
  }
  if (pl && pl.nyc !== false && pl.coord) {
    const vague = BOROUGH.test(String(e.hood || "").trim()) || !Array.isArray(e.coord) || GENERIC_V.test(String(e.venue || ""));
    if (vague) {
      o.coord = pl.coord; o.address = pl.address;
      o.venue = pl.name + (pl.borough ? ", " + pl.borough : "");
      o.hood = pl.borough || e.hood;
    }
  } else if (pg?.address && !e.address) o.address = pg.address;
  return o;
}

let inflight = new Set();
export async function fetchDetails(evs, onDone) {
  const all = loadDetails();
  const today = new Date().toISOString().slice(0, 10);
  let n = Object.values(all).filter((x) => x.day === today).length;
  const todo = evs.filter((e) => e && e.id && needsDetails(e) && !inflight.has(e.id) && !(all[e.id] && Date.now() - (all[e.id].at || 0) < RETRY_DAYS * 864e5));
  for (const e of todo) {
    if (n >= DAILY_CAP) break;
    n++; inflight.add(e.id);
    try {
      const r = await fetch(API_BASE + "/api/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: e.title, venue: e.venue, hood: e.hood, url: e.url, date: e.E, time: e.time, price: e.price, desc: String(e.desc || "").slice(0, 400) }) });
      const j = r.ok ? await r.json() : {};
      const cur = loadDetails();
      cur[e.id] = { at: Date.now(), day: today, place: j.place || null, page: j.page || null };
      saveDetails(cur);
      onDone?.();
    } catch { /* offline: try again later */ }
    inflight.delete(e.id);
  }
}

// Everything the daily server job looked up (/api/feed-enrich), merged into what this phone already has
export async function syncDetailsIndex() {
  try {
    const r = await fetch(API_BASE + "/api/details?index=1");
    if (!r.ok) return false;
    const idx = await r.json();
    const cur = loadDetails();
    let n = 0;
    for (const [id, v] of Object.entries(idx || {})) { if (!cur[id] || (v.at || 0) > (cur[id].at || 0)) { cur[id] = { ...v, day: "server" }; n++; } }
    if (n) saveDetails(cur);
    return n > 0;
  } catch { return false; }
}
