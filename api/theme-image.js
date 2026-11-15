/**
 * Good Plans — /api/theme-image
 * A real, good-quality photo for a "New York right now" card, from Wikipedia / Wikimedia Commons.
 * GET ?id=<theme id>&q=<theme name>
 * 1. a curated Wikipedia article for known ids (the article's lead photo)
 * 2. otherwise a Wikipedia search on "<q> New York" and the first result with a lead image
 * Returns { src, credit, page } or { src: null }. Cached at the edge for a week.
 */
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const UA = "GoodPlans/1.0 (personal NYC events app; https://goodplans.vercel.app)";

// id pattern → Wikipedia article title (lead photo)
const CURATED = [
  [/thanksgiving|turkey/, "Macy's Thanksgiving Day Parade"],
  [/season-opens|holiday-lights|christmas|xmas/, "Rockefeller Center Christmas Tree"],
  [/nye|new-year/, "New Year's Eve in Times Square"],
  [/polar-bear/, "Coney Island"],
  [/lunar/, "Chinese New Year parade"],
  [/stpat/, "New York City St. Patrick's Day Parade"],
  [/easter/, "Easter Parade (New York City)"],
  [/cherry/, "Brooklyn Botanic Garden"],
  [/five-boro/, "Five Boro Bike Tour"],
  [/fleet-week/, "Fleet Week"],
  [/manhattanhenge/, "Manhattanhenge"],
  [/pride/, "New York City Pride March"],
  [/puerto-rican/, "National Puerto Rican Day Parade"],
  [/mermaid/, "Coney Island Mermaid Parade"],
  [/summerstage/, "SummerStage"],
  [/shakespeare/, "Delacorte Theater"],
  [/july4|fourth/, "Macy's Fourth of July Fireworks"],
  [/us-open/, "US Open (tennis)"],
  [/marathon/, "New York City Marathon"],
  [/halloween/, "Village Halloween Parade"],
  [/tribute/, "Tribute in Light"],
  [/dyker/, "Dyker Heights, Brooklyn"],
  [/foliage|last-leaves|leaves|autumn/, "Central Park"],
  [/cold-snap|snow|winter/, "Central Park"],
  [/warming|first-warm|warm-surprise|light-evenings|summer|sun/, "Brooklyn Bridge Park"],
  [/dark-evenings|night/, "Manhattan"],
  [/museum-mile/, "Museum Mile"],
  [/fashion/, "New York Fashion Week"],
  [/tribeca/, "Tribeca Festival"],
  [/gov-ball/, "Governors Ball Music Festival"],
  [/greek/, "Greek Independence Day Parade"],
  [/flower-show/, "Macy's Flower Show"],
  [/westminster/, "Westminster Kennel Club Dog Show"],
  [/restaurant-week/, "New York City Restaurant Week"],
  [/summer-streets/, "Summer Streets"],
  [/broadway/, "Bryant Park"],
  [/summer-for-city/, "Lincoln Center"],
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

async function getJson(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, signal: ctl.signal }); return r.ok ? await r.json() : null; }
  catch { return null; } finally { clearTimeout(t); }
}

const good = (p) => p && p.thumbnail && p.thumbnail.source && (p.thumbnail.width || 0) >= 600;

async function byTitle(title) {
  const u = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=1000&titles=" + encodeURIComponent(title);
  const j = await getJson(u);
  const p = j && j.query && Object.values(j.query.pages || {})[0];
  return good(p) ? { src: p.thumbnail.source, page: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.title.replace(/ /g, "_")) } : null;
}

async function bySearch(q) {
  const u = "https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=6&prop=pageimages&piprop=thumbnail&pithumbsize=1000&gsrsearch=" + encodeURIComponent(q + " New York");
  const j = await getJson(u);
  const pages = j && j.query && Object.values(j.query.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const p = (pages || []).find(good);
  return p ? { src: p.thumbnail.source, page: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.title.replace(/ /g, "_")) } : null;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const id = String(req.query.id || "").toLowerCase().replace(/^nyc-/, "").slice(0, 60);
  const q = String(req.query.q || "").slice(0, 80);
  let out = null;
  const hit = CURATED.find(([re]) => re.test(id));
  if (hit) out = await byTitle(hit[1]);
  if (!out && q) out = await bySearch(q);
  if (!out) out = await byTitle("New York City");
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=2592000");
  return res.status(200).json(out ? { src: out.src, page: out.page, credit: "Wikipedia / Wikimedia Commons" } : { src: null });
}
