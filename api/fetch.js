/**
 * Good Plans proxy — Vercel API route (/api/fetch.js)
 *
 * Updated to forward realistic browser headers, which bypasses basic
 * User-Agent checks. Does NOT bypass Cloudflare Bot Management (IP-based
 * blocks) — for those you need the Cloudflare Worker (worker.js).
 *
 * This file replaces /api/fetch.js in the goodplans-proxy repo.
 */

export default async function handler(req, res) {
  // Allow CORS for the PWA
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url parameter required" });

  let target;
  try {
    target = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return res.status(400).json({ error: "only http/https allowed" });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Ch-Ua":
          '"Google Chrome";v="125","Chromium";v="125","Not/A)Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    const contentType =
      upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const body = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Proxied-Status", String(upstream.status));
    res.status(upstream.status).send(Buffer.from(body));
  } catch (err) {
    res.status(502).json({ error: "upstream fetch failed", detail: err.message });
  }
}
