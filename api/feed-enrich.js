/**
 * Good Plans — /api/feed-enrich  (daily Vercel cron, also runnable by hand with ?key=FLAGS_KEY)
 *
 * Reads the Apps Script feed (GP_FEED_URL + GP_FEED_KEY), and for each upcoming event that the newsletter left
 * incomplete (no start time or price, ticket without link, borough-only venue) looks it up once:
 * Google Places for the venue, Claude for the event page (web search when the page blocks us).
 * Results go to the private Blob store as details/index.json, which every phone merges in.
 * Each run handles at most MAX events, so a big backlog clears over a few runs.
 */
import { place, page, needsPage, vagueVenue } from "./_details-core.js";
import { readIndex, putJSON, INDEX } from "./_blob.js";

export const config = { maxDuration: 60 };
const MAX = 36, PARALLEL = 6, HORIZON_DAYS = 45;
const iso = (d) => d.toISOString().slice(0, 10);

export default async function handler(req, res) {
  const cron = req.headers.authorization && process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
  const vercelCron = !!req.headers["x-vercel-cron"] || /vercel-cron/i.test(req.headers["user-agent"] || "");
  const manual = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  if (!cron && !vercelCron && !manual) return res.status(401).json({ error: "Unauthorized" });
  if (!process.env.GP_FEED_URL || !process.env.GP_FEED_KEY) return res.status(503).json({ error: "GP_FEED_URL / GP_FEED_KEY not set" });
  const t0 = Date.now();
  try {
    const u = process.env.GP_FEED_URL + (process.env.GP_FEED_URL.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(process.env.GP_FEED_KEY);
    const fr = await fetch(u, { redirect: "follow" });
    const feed = await fr.json();
    if (feed.error) return res.status(502).json({ error: "feed: " + feed.error });
    const events = feed.events || [];
    const idx = await readIndex();
    const today = iso(new Date()), until = iso(new Date(Date.now() + HORIZON_DAYS * 864e5)), soon = iso(new Date(Date.now() + 4 * 864e5));
    // drop entries for events that are over
    const live = new Set(events.filter((e) => (e.X || e.E) >= today).map((e) => e.id));
    for (const id of Object.keys(idx)) if (!live.has(id) && Date.now() - (idx[id].at || 0) > 3 * 864e5) delete idx[id];
    const todo = events
      .filter((e) => e.id && e.E && (e.X || e.E) >= today && e.E <= until && (needsPage(e) || vagueVenue(e)))
      // Never looked up, or (once) when it's close: times and ticket links are often posted only in the last days
      .filter((e) => !idx[e.id] || (!idx[e.id].retried && !idx[e.id].page?.start && e.E <= soon && Date.now() - (idx[e.id].at || 0) > 3 * 864e5))
      .sort((a, b) => (a.E < b.E ? -1 : 1))
      .slice(0, MAX);
    let done = 0;
    for (let i = 0; i < todo.length; i += PARALLEL) {
      if (Date.now() - t0 > 45000) break; // leave time to save
      await Promise.all(todo.slice(i, i + PARALLEL).map(async (e) => {
        const [pl, pg] = await Promise.all([
          vagueVenue(e) ? place(e.venue).catch(() => null) : null,
          needsPage(e) ? page({ title: e.title, venue: e.venue, hood: e.hood, url: e.url, date: e.E, time: e.time, price: e.price, desc: String(e.desc || "").slice(0, 400) }).catch(() => null) : null,
        ]);
        const prev = idx[e.id];
        idx[e.id] = { at: Date.now(), place: pl || prev?.place || null, page: pg || prev?.page || null, ...(prev ? { retried: true } : {}) };
        done++;
      }));
    }
    await putJSON(INDEX, idx);
    const left = events.filter((e) => e.id && e.E && (e.X || e.E) >= today && e.E <= until && (needsPage(e) || vagueVenue(e)) && !idx[e.id]).length;
    return res.status(200).json({ feed: events.length, lookedUp: done, stored: Object.keys(idx).length, left, ms: Date.now() - t0 });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
