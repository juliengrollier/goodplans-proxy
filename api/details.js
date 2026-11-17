/**
 * Good Plans — /api/details  (fills what the newsletter left out; needs ANTHROPIC_API_KEY, GOOGLE_MAPS_KEY)
 *
 * POST { title, venue, hood, url, date, time, price, desc }
 *   → { place: { name, address, coord:[lat,lon], borough } | null,
 *       page:  { start, end, price, ticketUrl, address, city, nyc } | null }
 *
 * 1. Google Places text search on the venue → exact address and coordinates (the extraction often only knows the borough).
 * 2. The event page (following redirects), read by Claude → start time, price, ticket link, and whether it's in NYC at all.
 */
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const GENERIC = /^(see website|tba|tbd|various|various venues|multiple venues|citywide|online|virtual)$/i;
async function place(venue) {
  const key = process.env.GOOGLE_MAPS_KEY;
  const parts = String(venue || "").split(",").map((x) => x.trim()).filter(Boolean);
  const name = clip(parts[0], 100);
  if (!key || !name || name.length < 3 || GENERIC.test(name)) return null;
  // a bare borough after the name is often the extraction's default, not the real one: search by name, unless there's a street address
  const q = /\d/.test(venue) ? clip(venue, 160) : name;
  const r = await withTimeout(fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.addressComponents" },
    body: JSON.stringify({ textQuery: q + ", New York City", maxResultCount: 1, locationBias: { circle: { center: { latitude: 40.73, longitude: -73.95 }, radius: 30000 } } }),
  }), 6000);
  if (!r.ok) return null;
  const p = (await r.json()).places?.[0];
  if (!p?.location) return null;
  const comp = (t) => (p.addressComponents || []).find((c) => (c.types || []).includes(t))?.longText || "";
  const borough = comp("sublocality_level_1") || comp("sublocality") || comp("locality");
  const state = comp("administrative_area_level_1");
  return { name: p.displayName?.text || name, address: p.formattedAddress || "", coord: [p.location.latitude, p.location.longitude], borough, nyc: /new york|^ny$/i.test(state) };
}

function pageText(html) {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(" ").slice(0, 3000);
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, " $2 [$1] ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  return (ld ? "JSON-LD: " + ld + "\n" : "") + body.slice(0, 9000);
}

async function page(b) {
  if (!process.env.ANTHROPIC_API_KEY || !/^https?:\/\//.test(b.url || "")) return null;
  let html = "", finalUrl = b.url;
  try {
    const r = await withTimeout(fetch(b.url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36", Accept: "text/html" } }), 8000);
    if (r.ok && /html/i.test(r.headers.get("content-type") || "")) { html = await r.text(); finalUrl = r.url || b.url; }
  } catch { /* unreachable page: answer from the listing alone */ }
  const system = `You read an event web page for a New York City events app and fill in missing practical details. Answer with JSON only:
{"start":"7:30 PM" or null,"end":"10 PM" or null,"price":"Free" | "$25" | "$20–45" or null,"ticketUrl":"https://..." or null,"address":"street address" or null,"city":"city name" or null,"nyc":true|false|null}
Rules: only what the page or listing states for THIS event on the given date (doors time counts as start if that is all there is). ticketUrl is the link to buy tickets or RSVP (an absolute URL found on the page), else null. nyc is false when the event takes place outside New York City (e.g. London, LA, a broadcast), true when clearly in NYC, null if unknown. Never guess.`;
  const user = `Event: ${clip(b.title, 160)}\nDate: ${clip(b.date, 20)}\nListing venue: ${clip(b.venue, 120)}\nListing time: ${clip(b.time, 40)}\nListing price: ${clip(b.price, 40)}\nListing description: ${clip(b.desc, 400)}\nPage URL: ${finalUrl}\n\nPage:\n${html ? pageText(html) : "(page not reachable)"}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, system, messages: [{ role: "user", content: user }] }),
  });
  const d = await r.json();
  if (!r.ok) { if (b._dbg) return { error: "claude " + r.status + " " + (d?.error?.message || "") }; return null; }
  const t = (d.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
  try {
    const o = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    if (o.ticketUrl) { try { o.ticketUrl = new URL(o.ticketUrl, finalUrl).href; } catch { o.ticketUrl = null; } }
    o.url = finalUrl;
    return o;
  } catch { return b._dbg ? { error: "parse", text: t.slice(0, 300), html: html.length } : null; }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  // GET with the dev key runs a lookup from query parameters (for checking the endpoint)
  const test = req.method === "GET" && !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  if (req.method !== "POST" && !test) return res.status(405).json({ error: "POST only" });
  if (!test && !ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
  try {
    const b = test ? { ...req.query, _dbg: 1 } : typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const [pl, pg] = await Promise.all([place(b.venue).catch(() => null), page(b).catch(() => null)]);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ place: pl, page: pg });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
