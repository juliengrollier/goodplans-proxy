/**
 * Good Plans — /api/image
 * Finds a picture for an event card, in this order:
 *   1. the event page's share image (og:image / twitter:image), usually the poster or flyer
 *   2. a Google Places photo of the venue (needs GOOGLE_MAPS_KEY in Vercel env)
 * GET ?u=<event url>&v=<venue>&lat=<lat>&lon=<lon>
 * Returns { src, kind: "event"|"venue"|"none", credit? }
 */

const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const BAD_IMG = /(logo|favicon|icon|sprite|placeholder|default[-_]?(image|og|share)|blank|spacer|avatar)/i;

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

async function withTimeout(promise, ms) {
  let t;
  try { return await Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]); }
  finally { clearTimeout(t); }
}

async function fromEventPage(u) {
  let target;
  try { target = new URL(u); } catch { return null; }
  if (!["http:", "https:"].includes(target.protocol)) return null;
  const r = await withTimeout(fetch(target, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" }), 6000);
  if (!r.ok || !(r.headers.get("content-type") || "").includes("html")) return null;
  const html = (await r.text()).slice(0, 400000);
  const metas = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
  ];
  // Take candidates in document order (the first og:image is usually the main one)
  const found = [];
  for (const re of metas) {
    const g = new RegExp(re.source, "gi");
    for (const m of html.matchAll(g)) if (m[1]) found.push([m.index, m[1]]);
  }
  found.sort((a, b) => a[0] - b[0]);
  for (const [, raw] of found) {
    let src;
    try { src = new URL(raw.replace(/&amp;/g, "&"), r.url || target).href; } catch { continue; }
    if (!BAD_IMG.test(src) && /^https:/.test(src)) return { src, kind: "event" };
  }
  return null;
}

async function fromGoogle(venue, lat, lon) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key || !venue) return null;
  const body = { textQuery: venue + ", New York", maxResultCount: 1 };
  if (lat && lon) body.locationBias = { circle: { center: { latitude: +lat, longitude: +lon }, radius: 1500 } };
  const s = await withTimeout(fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.photos" },
    body: JSON.stringify(body),
  }), 6000);
  if (!s.ok) return null;
  const photo = (await s.json()).places?.[0]?.photos?.[0];
  if (!photo?.name) return null;
  const m = await withTimeout(fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${key}`), 6000);
  if (!m.ok) return null;
  const { photoUri } = await m.json();
  if (!photoUri) return null;
  const a = photo.authorAttributions?.[0];
  return { src: photoUri, kind: "venue", credit: a?.displayName ? "Photo: " + a.displayName + " / Google" : "Photo: Google" };
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const { u = "", v = "", lat = "", lon = "" } = req.query;
  const venue = String(v).split(",")[0].trim().slice(0, 120);
  const steps = [() => (u ? fromEventPage(String(u)) : null), () => fromGoogle(venue, lat, lon)];
  for (const step of steps) {
    try { const hit = await step(); if (hit) { res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800"); return res.status(200).json(hit); } }
    catch { /* try the next source */ }
  }
  res.setHeader("Cache-Control", "s-maxage=21600");
  return res.status(200).json({ src: null, kind: "none" });
}
