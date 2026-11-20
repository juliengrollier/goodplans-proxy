/**
 * Good Plans — /api/audit?key=FLAGS_KEY   (read-only)
 * Returns a compact copy of the current Apps Script feed so source coverage can be audited
 * (counts by category / source / price). No writes, no personal data.
 */
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!process.env.FLAGS_KEY || req.query.key !== process.env.FLAGS_KEY) return res.status(401).json({ error: "Unauthorized" });
  if (!process.env.GP_FEED_URL || !process.env.GP_FEED_KEY) return res.status(503).json({ error: "GP_FEED_URL / GP_FEED_KEY not set" });
  try {
    const u = process.env.GP_FEED_URL + (process.env.GP_FEED_URL.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(process.env.GP_FEED_KEY);
    const feed = await (await fetch(u, { redirect: "follow" })).json();
    if (feed.error) return res.status(502).json({ error: "feed: " + feed.error });
    const pick = ["id", "title", "E", "X", "time", "price", "venue", "hood", "cat", "sub", "ncat", "nsub", "tier", "src", "tags", "ticket"];
    const events = (feed.events || []).map((e) => { const o = {}; pick.forEach((k) => { if (e[k] != null && e[k] !== "") o[k] = e[k]; }); return o; });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ refreshed: feed.refreshed || null, count: events.length, events });
  } catch (e) { return res.status(500).json({ error: String(e && e.message || e) }); }
}
