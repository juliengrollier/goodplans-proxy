/**
 * Good Plans — /api/details  (fills what the newsletter left out; needs ANTHROPIC_API_KEY, GOOGLE_MAPS_KEY)
 *
 * GET  ?index=1 → { [eventId]: { at, place, page } } from the daily job (/api/feed-enrich)
 * POST { title, venue, hood, url, date, time, price, desc }
 *   → { place: { name, address, coord:[lat,lon], borough } | null,
 *       page:  { start, end, price, ticketUrl, address, city, nyc } | null }
 *
 * 1. Google Places text search on the venue → exact address and coordinates (the extraction often only knows the borough).
 * 2. The event page (following redirects), read by Claude → start time, price, ticket link, and whether it's in NYC at all.
 */
import { ALLOWED, cors, place, page } from "./_details-core.js";
import { readIndex } from "./_blob.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  // GET ?index=1: everything the daily job has looked up so far (the app merges it in)
  if (req.method === "GET" && req.query.index) {
    res.setHeader("Cache-Control", "public, max-age=300");
    try { return res.status(200).json(await readIndex()); } catch (e) { return res.status(200).json({}); }
  }
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
