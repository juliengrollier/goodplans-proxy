/**
 * Good Plans — /api/ingest  (daily cron; extra sources on top of the Apps Script feed)
 *
 *   cron / ?key=FLAGS_KEY              run the sources that are due (a few per run)
 *   ?key=..&source=<id>[&force=1]      run one source now
 *   ?key=..&probe=<url>                show what a page offers (JSON-LD events, size) without saving
 *   ?feed=1                            public: the merged events the app adds to its list
 *   ?key=..&status=1                   per-source stats
 *
 * Each source is read on its own cadence (daily / weekly / monthly) and skipped when the page is unchanged.
 * Events come from the page's JSON-LD when it has them, otherwise from Claude reading the page text.
 * Nothing is invented: a price or time that the page does not state stays empty.
 */
import { SOURCES as ALL } from "./_sources.js";
const SOURCES = ALL.filter((s) => !s.off);
import { getJSON, putJSON } from "./_blob.js";
import { createHash } from "node:crypto";
import { okToken } from "./_admin.js";

export const config = { maxDuration: 60 };
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const STORE = "ingest/events.json";
const DAY = 864e5;
const EVERY = { daily: 20 * 3600e3, weekly: 6 * DAY, monthly: 27 * DAY };
const MAX_PER_RUN = 4;
const BOROUGH = /manhattan|brooklyn|queens|bronx|staten island/i;
const CATS = ["Music", "Comedy", "Art & Culture", "Film", "Food & Drink", "Outdoors", "Sports", "Family", "Talk & Learn", "Nightlife", "Other"];
const iso = (d) => d.toISOString().slice(0, 10);
const clip = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchPage(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return { html: await r.text(), url: r.url || url };
  } finally { clearTimeout(t); }
}

function jsonLdEvents(html) {
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    const ty = [].concat(o["@type"] || []).join(",");
    if (/Event/.test(ty) && o.name && o.startDate) out.push(o);
    if (o["@graph"]) walk(o["@graph"]);
    if (o.itemListElement) walk(o.itemListElement);
    if (o.item) walk(o.item);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { walk(JSON.parse(m[1])); } catch { /* skip */ } }
  return out;
}


// RSS/Atom feeds: turn each item into labelled plain text (field names kept so the extractor can see which is the date).
function rssText(xml) {
  const dec = (v) => String(v || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&ndash;|&mdash;/g, "-").replace(/&amp;/g, "&");
  const items = xml.split(/<item[ >]|<entry[ >]/i).slice(1);
  return items.map((it) => {
    const parts = [];
    for (const m of it.matchAll(/<([\w:]+)[^>]*>([\s\S]*?)<\/\1>/g)) {
      const name = m[1].toLowerCase(); let v = dec(m[2]);
      if (/description|summary|content/.test(name)) v = clip(dec(v).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/CLICK HERE TO (BUY|BOOK) TICKETS NOW!?/gi, ""), 220);
      else v = clip(v.replace(/<[^>]+>/g, " "), 200);
      if (v) parts.push(name + ": " + v);
    }
    return parts.join(" | ");
  }).join("\n");
}

// The Skint: its RSS carries one long digest per day or weekend (full text in content:encoded). Keep the latest few,
// with link targets inline so the extractor can attach each event's own page; the digests are read by Claude.
function skintText(xml) {
  const dec = (v) => String(v || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const items = xml.split(/<item[ >]/i).slice(1, 5);
  return items.map((it) => {
    const title = dec((it.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]).replace(/<[^>]+>/g, " ").trim();
    let body = dec((it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i) || [])[1] || (it.match(/<description>([\s\S]*?)<\/description>/i) || [])[1]);
    body = body.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 [$1]")
      .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
    const pub = new Date(dec((it.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]).trim()), md = title.match(/(\d{1,2})\/(\d{1,2})/);
    let d0 = isNaN(pub) ? new Date() : pub; if (md) d0 = new Date(Date.UTC(d0.getUTCFullYear(), +md[1] - 1, +md[2], 12));
    const key = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => { const x = new Date(d0.getTime() + k * DAY); return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][x.getUTCDay()] + "=" + iso(x); }).join(", ");
    return "POST: " + title + " (published " + dec((it.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]).trim() + ")\nWEEKDAY LABELS MEAN THESE DATES (the first match on or after the start): " + key + "\n" + body.trim();
  });
}
const TICKETING = /ticketmaster|seatgeek|stubhub|vividseats|livenation|axs\.com|tickpick|gametime\.co/i;

function pageText(html, base) {
  const abs = (h) => { try { return new URL(h, base).href; } catch { return ""; } };
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<a [^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => " " + t + " [" + abs(h) + "] ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
}

function fromLd(o, src, base) {
  const loc = [].concat(o.location || [])[0] || {};
  const addr = loc.address || {};
  const offer = [].concat(o.offers || [])[0] || {};
  const s = new Date(o.startDate), e = o.endDate ? new Date(o.endDate) : null;
  if (isNaN(s)) return null;
  const time = /T\d\d:\d\d/.test(o.startDate) ? s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
  const p = offer.price != null && offer.price !== "" ? Number(offer.price) : null;
  let url = o.url || offer.url || ""; try { url = new URL(url, base).href; } catch { url = ""; }
  return { title: clip(o.name, 140), start: /T/.test(o.startDate) ? iso(new Date(s.toLocaleString("en-US", { timeZone: "America/New_York" }))) : o.startDate.slice(0, 10),
    end: e ? o.endDate.slice(0, 10) : "", time, price: p === 0 ? "Free" : p != null && !isNaN(p) ? "$" + p : "", venue: clip(loc.name || "", 100),
    borough: clip(addr.addressLocality || "", 40), desc: clip(String(o.description || "").replace(/<[^>]+>/g, " "), 280), url };
}

async function readWithClaude(src, text, today) {
  const system = `You extract upcoming events from the text of a web page for a New York City events app. Answer with a JSON array only.
Each item: {"title":"","start":"YYYY-MM-DD","end":"YYYY-MM-DD" or "","time":"7:30 PM" or "","price":"Free" | "$25" | "$20–45" or "","venue":"","borough":"Manhattan|Brooklyn|Queens|Bronx|Staten Island|","cat":one of ${CATS.join(" | ")},"sub":"short subtype","desc":"one plain sentence, no hype","url":"absolute link to this event if the text shows one"}
Rules: only events the text states, dated ${today} or later (the page may list past ones: skip them). Skip member-only, private, sold-out-for-members or staff events. Never invent a date, time, price, venue or link: leave it empty when the text does not say. Price only if stated ("Free" counts). Max 60 events, soonest first. Recurring weekly programs: list each of the next 4 dates. Output [] if there are none.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: `Source: ${src.name} (${src.hint})\nToday: ${today}\nPage text:\n${text.slice(0, 26000)}` }] }) });
  const d = await r.json();
  if (!r.ok) throw new Error("claude " + r.status + " " + (d?.error?.message || ""));
  const t = (d.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
  const a = t.indexOf("["); let b = t.lastIndexOf("]");
  if (a < 0) throw new Error("no JSON array: " + clip(t, 80));
  if (b < a) { const c = t.lastIndexOf("}"); if (c < a) throw new Error("no JSON array: " + clip(t, 80)); return JSON.parse(t.slice(a, c + 1) + "]"); } // reply cut off: keep the complete items
  return JSON.parse(t.slice(a, b + 1));
}

// Normalise to the app's event schema and apply the quality gate
function toEvent(src, x, today, limit) {
  const title = clip(x.title, 140), start = String(x.start || "").slice(0, 10), end = String(x.end || "").slice(0, 10);
  if (!title || !/^\d{4}-\d\d-\d\d$/.test(start)) return null;
  const last = /^\d{4}-\d\d-\d\d$/.test(end) ? end : start;
  if (last < today || start > limit) return null;
  const b = clip(x.borough, 40), venue = clip(x.venue, 100);
  const boro = (b.match(BOROUGH) || [])[0];
  if (b && !boro && !/new york|nyc|harlem|astoria|williamsburg|bushwick|dumbo|long island city|brooklyn/i.test(b)) return null; // clearly outside the city
  const hood = boro ? boro.replace(/^./, (c) => c.toUpperCase()) : "Manhattan";
  const id = src.id + "-" + createHash("sha1").update(title.toLowerCase() + "|" + start + "|" + venue.toLowerCase()).digest("hex").slice(0, 8);
  const price = clip(x.price, 40);
  const e = { id, title, E: start, time: clip(x.time, 30) || undefined, price: price || undefined, venue: venue || src.name, hood,
    cat: CATS.includes(x.cat) ? x.cat : "Other", sub: clip(x.sub, 30) || undefined, tier: 2, ticket: !!price && !/^free/i.test(price),
    src: src.name, url: /^https?:\/\//.test(x.url || "") ? x.url : undefined, desc: clip(x.desc, 280) || undefined, tags: [] };
  if (end && end !== start && /^\d{4}-\d\d-\d\d$/.test(end)) e.X = end;
  if (/^free/i.test(price)) e.tags.push("free");
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}


// NYC Parks' official 14-day feed: structured, so no Claude needed. Recreation-center class sessions are filler (tier 3)
// so they surface for people who like fitness without crowding everyone's lists; everything else is tier 2.
const BORO = { B: "Brooklyn", M: "Manhattan", Q: "Queens", X: "Bronx", R: "Staten Island" };
const t12 = (t) => String(t || "").replace(/\b(am|pm)\b/i, (m) => m.toUpperCase()).trim();
const unent = (v) => String(v || "").replace(/&#(\d+);/g, (m, n) => ({ 174: "®", 241: "ñ", 233: "é", 225: "á", 237: "í", 243: "ó", 39: "'", 8217: "'" })[n] || "").replace(/&amp;/g, "&").replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const ANCH = [["Manhattan", 40.72, -74.0], ["Manhattan", 40.78, -73.97], ["Manhattan", 40.84, -73.94], ["Manhattan", 40.87, -73.92], ["Manhattan", 40.805, -73.945], ["Manhattan", 40.82, -73.94], ["Manhattan", 40.86, -73.935], ["Brooklyn", 40.68, -73.97], ["Brooklyn", 40.63, -73.95], ["Brooklyn", 40.65, -73.90], ["Brooklyn", 40.70, -73.93], ["Brooklyn", 40.60, -74.0],
  ["Queens", 40.75, -73.90], ["Queens", 40.77, -73.925], ["Queens", 40.76, -73.85], ["Queens", 40.72, -73.82], ["Queens", 40.68, -73.78], ["Queens", 40.77, -73.78], ["Queens", 40.60, -73.80], ["Bronx", 40.85, -73.88], ["Bronx", 40.90, -73.91], ["Bronx", 40.87, -73.895], ["Bronx", 40.88, -73.86], ["Bronx", 40.82, -73.91], ["Staten Island", 40.58, -74.15], ["Staten Island", 40.63, -74.10], ["Staten Island", 40.52, -74.2]];
function boroOf(ll, fallback) {
  if (!ll || ll.length !== 2 || !ll.every((n) => isFinite(n) && n)) return fallback;
  let best = fallback, d = 1e9;
  for (const [b, la, lo] of ANCH) { const k = (ll[0] - la) ** 2 + ((ll[1] - lo) * 0.76) ** 2; if (k < d) { d = k; best = b; } }
  return best;
}
function parkEvent(src, x, today, limit) {
  const title = clip(unent(x.title), 140), start = String(x.startdate || "").slice(0, 10);
  if (!title || !/^\d{4}-\d\d-\d\d$/.test(start) || start < today || start > limit) return null;
  const cats = String(x.categories || "").split("|").map((c) => c.trim()).filter(Boolean), has = (re) => cats.some((c) => re.test(c)), T = (re) => re.test(title);
  if (/^cancel/i.test(title) || /cancelled/i.test(String(x.description || "").slice(0, 80)) || /\bcamp\b|extended day|regular day|swim team|returning (swim|member)/i.test(title + " " + String(x.description || "").slice(0, 120))) return null;
  const rec = has(/recreation center/i);
  let cat = "Other", sub = cats[0] || "Park program";
  if (T(/\bnyrr\b|open run|running group|\b[0-9]+k\b|turkey trot/i) || has(/running|jogging/i)) { cat = "Sports"; sub = "Running"; }
  else if (has(/yoga|pilates/i) || T(/\byoga\b|pilates/i)) { cat = "Sports"; sub = "Yoga & Pilates"; }
  else if (T(/\btour\b|exhibit|museum|open hours|gallery/i) || (has(/history/i) && has(/tours/i))) { cat = "Art & Culture"; sub = has(/history/i) ? "History" : "Exhibit"; }
  else if (T(/volunteer|clean ?up|stewardship|restoration|planting|tree care|it's my park|garden/i) || has(/volunteer/i)) { cat = "Outdoors"; sub = "Volunteering"; }
  else if (has(/arts? & crafts|workshops/i) && !has(/fitness|exercise/i)) { cat = "Art & Culture"; sub = "Workshop"; }
  else if (has(/swimming|aquatics/i)) { cat = "Sports"; sub = "Swimming"; }
  else if (has(/dance classes|fitness|exercise/i) && has(/dance/i)) { cat = "Sports"; sub = "Dance class"; }
  else if (has(/fitness|exercise/i)) { cat = "Sports"; sub = "Fitness"; }
  else if (has(/dance/i)) { cat = "Art & Culture"; sub = "Dance performance"; }
  else if (has(/kids|children|best for kids/i)) { cat = "Family"; sub = "Kids"; }
  else if (has(/sports|football|basketball|soccer|tennis|baseball/i)) { cat = "Sports"; sub = "Sports"; }
  else if (has(/nature|hik|walk|bird|wildlife|astronomy|fishing|urban park rangers|conservation/i)) { cat = "Outdoors"; sub = has(/hik/i) ? "Hike" : has(/bird/i) ? "Birding" : has(/fishing/i) ? "Fishing" : "Nature"; }
  else if (has(/concert|music/i)) { cat = "Music"; sub = "Concert"; }
  else if (has(/movie|film/i)) { cat = "Film"; sub = "Outdoor film"; }
  else if (has(/art/i)) { cat = "Art & Culture"; sub = "Art"; }
  else if (has(/history|educat|learn|talk|lecture/i)) { cat = "Talk & Learn"; sub = cats[0]; }
  const park = clip(unent(x.parknames), 70), loc = clip(unent(x.location).replace(/\s*\(in [^)]*\)\s*$/, ""), 70);
  const venue = loc && park && !loc.toLowerCase().includes(park.toLowerCase()) ? loc + ", " + park : (park || loc || "NYC Parks");
  const ll = String(x.coordinates || "").split(",").map((n) => parseFloat(n));
  const desc = clip(unent(String(x.description || "").replace(/&nbsp;|<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, "")), 280);
  const time = x.starttime && !/^0:00/.test(x.starttime) ? t12(x.starttime) + (x.endtime ? " - " + t12(x.endtime) : "") : "";
  const free = /\bfree\b/i.test(desc) ? "Free" : "";
  const id = src.id + "-" + createHash("sha1").update(String(x.guid || title + start + venue)).digest("hex").slice(0, 8);
  const e = { id, title, E: start, time: time || undefined, price: free || undefined, venue, hood: boroOf(ll, BORO[String(x.parkids || "")[0]] || "Manhattan"),
    cat, sub, tier: rec && cat !== "Family" ? 3 : 2, ticket: false, src: "NYC Parks", url: /^https?:\/\//.test(x.link || "") ? String(x.link).replace(/^http:/, "https:") : undefined,
    desc: desc || undefined, tags: [].concat(free ? ["free"] : [], rec ? ["recurring"] : [], cats.slice(0, 3).map((c) => c.toLowerCase())) };
  if (ll.length === 2 && ll.every((n) => isFinite(n) && n)) e.coord = ll;
  if (x.enddate && x.enddate !== x.startdate && /^\d{4}-\d\d-\d\d$/.test(x.enddate)) e.X = x.enddate;
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

// Anthology Film Archives RSS: title, link, escaped-HTML description and a "Friday, November 20" day line per screening. No showtimes in the feed.
const MON = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function anthologyEvents(xml, src) {
  const dec = (v) => String(v || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const out = [];
  for (const it of xml.split(/<item[ >]/i).slice(1)) {
    const tag = (n) => { const m = it.match(new RegExp("<" + n + "[^>]*>([\\s\\S]*?)</" + n + ">", "i")); return m ? dec(m[1]) : ""; };
    const link = unent(tag("link")), title = unent(tag("title"));
    const day = (it.match(/>\s*(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s+([A-Z][a-z]+)\s+(\d{1,2})\s*</) || []);
    const yr = (link.match(/year=(\d{4})/) || [])[1], mo = (link.match(/month=(\d{1,2})/) || [])[1];
    const m = MON[String(day[1] || "").toLowerCase()];
    if (!title || !m || !yr) continue;
    let year = +yr; if (mo && +mo === 12 && m === 1) year++; // January items listed under the December view
    const start = year + "-" + String(m).padStart(2, "0") + "-" + String(day[2]).padStart(2, "0");
    let d = unent(tag("description").replace(/&lt;br\s*\/?&gt;/gi, " ").replace(/&lt;[^]*?&gt;/g, " ").replace(/&amp;(?=[a-z#])/g, "&")).replace(/&[a-z]+;/gi, " ").replace(/CLICK HERE TO (BUY|BOOK) TICKETS NOW!?/gi, "").replace(/\s+/g, " ").trim();
    out.push({ title, start, venue: "Anthology Film Archives", borough: "Manhattan", cat: "Film", sub: "Repertory cinema", desc: d, url: link.replace(/&amp;/g, "&") });
  }
  return out;
}

// Squarespace event collections (?format=json): upcoming[] with ms timestamps, location and categories. Used for The Jazz Gallery.
function sqsEvents(json, src, base) {
  const fmtD = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtT = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  const out = [];
  for (const x of json.upcoming || []) {
    const loc = x.location || {}, la = loc.markerLat, lo = loc.markerLng;
    if (typeof la !== "number" || la < 40.49 || la > 40.92 || lo < -74.27 || lo > -73.69) continue; // outside the five boroughs
    const t = new Date(x.startDate), e = x.endDate ? new Date(x.endDate) : null;
    const start = fmtD.format(t), end = e ? fmtD.format(e) : "";
    const excerpt = unent(String(x.excerpt || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/gi, " "));
    out.push({ title: unent(x.title), start, end: end > start ? end : "", time: fmtT.format(t).replace(/:00 /, " "), venue: unent(loc.addressTitle) || src.name,
      borough: boroOf([la, lo], "Manhattan"), cat: "Music", sub: "Jazz", desc: excerpt, url: new URL(x.fullUrl || "", base).href });
  }
  return out;
}

// WordPress "The Events Calendar" REST feed (/wp-json/tribe/events/v1/events): structured dates, cost and categories. Used for parks and gardens.
function tribeEvents(list, src) {
  const out = [];
  for (const x of list) {
    const title = unent(String(x.title || "").replace(/<[^>]+>/g, " ").replace(/&#8217;|&#8216;/g, "'").replace(/&#8211;|&#8212;/g, "-").replace(/&#038;/g, "&"));
    const start = String(x.start_date || "").slice(0, 10), end = String(x.end_date || "").slice(0, 10);
    if (!title || /^cancel/i.test(title) || x.is_virtual) continue;
    const names = (x.categories || []).map((c) => c.name).join(" | "), tx = title + " " + names, T = (re) => re.test(tx);
    let cat = "Other", sub = (x.categories && x.categories[0] && x.categories[0].name) || "Program";
    if (T(/\brun\b|running|\b[0-9]+k\b/i)) { cat = "Sports"; sub = "Running"; }
    else if (T(/yoga|pilates|tai chi|qigong|fitness|wellness|meditat/i)) { cat = "Sports"; sub = /meditat/i.test(tx) ? "Meditation" : "Yoga & fitness"; }
    else if (T(/volunteer|stewardship|clean ?up|planting|restoration/i)) { cat = "Outdoors"; sub = "Volunteering"; }
    else if (T(/story ?time|kids|family|children|toddler|youth/i)) { cat = "Family"; sub = "Kids"; }
    else if (T(/tour|walk|hike|birding|bird|nature|garden|forag|astronomy|stargaz/i)) { cat = "Outdoors"; sub = /tour/i.test(tx) ? "Walking tour" : "Nature walk"; }
    else if (T(/concert|music|jazz|choir|sing/i)) { cat = "Music"; sub = "Concert"; }
    else if (T(/film|movie|screening/i)) { cat = "Film"; sub = "Screening"; }
    else if (T(/workshop|class|craft|pottery|paint|draw|writing/i)) { cat = "Art & Culture"; sub = "Workshop"; }
    else if (T(/talk|lecture|panel|discussion|conversation|reading|book/i)) { cat = "Talk & Learn"; sub = "Talk"; }
    else if (T(/exhibit|art|gallery|museum|history/i)) { cat = "Art & Culture"; sub = "Exhibit"; }
    else if (T(/market|food|tasting|cider|wine|beer/i)) { cat = "Food & Drink"; sub = "Market"; }
    const hm = (String(x.start_date || "").match(/(\d\d):(\d\d):\d\d$/) || []);
    let time = ""; if (hm[1] && !x.all_day) { let h = +hm[1]; time = ((h + 11) % 12 + 1) + (hm[2] === "00" ? "" : ":" + hm[2]) + (h < 12 ? " AM" : " PM"); }
    const cost = String(x.cost || "").replace(/<[^>]+>/g, "").trim(), free = /^free$/i.test(cost) || (x.categories || []).some((c) => /^free$/i.test(c.name));
    const v = Array.isArray(x.venue) ? {} : (x.venue || {});
    const desc = unent(String(x.excerpt || x.description || "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&#8217;/g, "'").replace(/&[#a-z0-9]+;/gi, " "));
    out.push({ title, start, end: end > start ? end : "", time, price: free ? "Free" : cost.length <= 30 ? cost : "", venue: unent(v.venue) || src.venue || src.name, borough: v.city && /new york|brooklyn|queens|bronx|staten/i.test(v.city) ? v.city : (src.hood || "Manhattan"), cat, sub, desc, url: x.url });
  }
  return out;
}

async function runSource(src, store, force) {
  const st = store.by[src.id] || (store.by[src.id] = {});
  const t0 = Date.now(), today = iso(new Date(t0 - 5 * 3600e3)), limit = iso(new Date(t0 + src.horizon * DAY));
  try {
    const { html, url } = await fetchPage(src.url);
    if (src.kind === "nycparks") {
      const hash = createHash("sha1").update(html).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = JSON.parse(html), seen = new Set();
      st.events = raw.map((x) => parkEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "feed", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    const hash = createHash("sha1").update(html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ")).digest("hex");
    if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
    if (src.kind === "tribe") {
      const all = []; let page = JSON.parse(html), guard = 0;
      for (;;) { all.push(...(page.events || [])); if (!page.next_rest_url || ++guard >= 4) break; page = JSON.parse((await fetchPage(page.next_rest_url)).html); }
      const hash = createHash("sha1").update(JSON.stringify(all.map((e) => [e.id, e.modified]))).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = tribeEvents(all, src), seen = new Set();
      st.events = raw.map((x) => toEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "feed", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    if (src.kind === "squarespace") {
      const hash = createHash("sha1").update(html).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = sqsEvents(JSON.parse(html), src, url), seen = new Set();
      st.events = raw.map((x) => toEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "feed", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    if (src.kind === "skint") {
      const posts = skintText(html), hash = createHash("sha1").update(posts.join("\n")).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = (await Promise.all(posts.map((p) => readWithClaude(src, p, today).catch(() => [])))).flat().map((x) => (TICKETING.test(x.url || "") ? { ...x, url: "" } : x)), seen = new Set();
      st.events = raw.map((x) => toEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "claude", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    if (src.kind === "anthology") {
      const hash = createHash("sha1").update(html).digest("hex");
      if (!force && st.hash === hash && st.ok) { st.at = t0; st.note = "unchanged"; return st; }
      const raw = anthologyEvents(html, src), seen = new Set();
      st.events = raw.map((x) => toEvent(src, x, today, limit)).filter((e) => e && !seen.has(e.id) && seen.add(e.id));
      return Object.assign(st, { at: t0, hash, ok: true, how: "feed", count: st.events.length, raw: raw.length, err: undefined, note: undefined });
    }
    const isRss = /^\s*(<\?xml|<rss|<feed)/i.test(html);
    let raw = isRss ? [] : jsonLdEvents(html).map((o) => fromLd(o, src, url)).filter(Boolean), how = isRss ? "rss" : "json-ld";
    if (raw.length < 3) { if (!isRss) how = "claude"; raw = await readWithClaude(src, isRss ? rssText(html) : pageText(html, url), today); }
    const evs = raw.map((x) => toEvent(src, x, today, limit)).filter(Boolean);
    const seen = new Set(); st.events = evs.filter((e) => !seen.has(e.id) && seen.add(e.id));
    Object.assign(st, { at: t0, hash, ok: true, how, count: st.events.length, raw: raw.length, err: undefined, note: undefined });
  } catch (e) { Object.assign(st, { at: t0, ok: false, err: clip(e && e.message || e, 160), count: (st.events || []).length }); }
  return st;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const store = (await getJSON(STORE).catch(() => null)) || { by: {} };
  if (!store.by) store.by = {};
  if (req.query.feed) {
    res.setHeader("Cache-Control", "public, max-age=600");
    const today = iso(new Date(Date.now() - 5 * 3600e3));
    const events = Object.values(store.by).flatMap((s) => s.events || []).filter((e) => (e.X || e.E) >= today);
    return res.status(200).json({ events });
  }
  const cron = req.headers.authorization && process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET;
  const vercelCron = !!req.headers["x-vercel-cron"] || /vercel-cron/i.test(req.headers["user-agent"] || "");
  const manual = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  if (req.query.status && okToken(req.query.t)) return res.status(200).json(ALL.map((s) => { const x = store.by[s.id] || {}; return { id: s.id, name: s.name, off: s.off, cadence: s.cadence, at: x.at ? new Date(x.at).toISOString() : null, ok: x.ok, how: x.how, count: x.count, err: x.err }; }));
  if (!cron && !vercelCron && !manual) return res.status(401).json({ error: "Unauthorized" });
  if (req.query.status) return res.status(200).json(ALL.map((s) => { const x = store.by[s.id] || {}; return { id: s.id, off: s.off, cadence: s.cadence, at: x.at ? new Date(x.at).toISOString() : null, ok: x.ok, how: x.how, count: x.count, raw: x.raw, err: x.err, note: x.note }; }));
  if (req.query.dry) { // dry run of one source through Claude: shows the text sent and what comes back, stores nothing
    const src = ALL.find((s) => s.id === req.query.dry); if (!src) return res.status(404).json({ error: "unknown source" });
    try { const { html } = await fetchPage(src.url); const text = src.kind === "skint" ? skintText(html).slice(Number(req.query.post) || 0).join("\n\n") : rssText(html); const today = iso(new Date(Date.now() - 5 * 3600e3));
      let raw, err; try { raw = await readWithClaude(src, text, today); } catch (e) { err = String(e && e.message || e); }
      return res.status(200).json({ chars: text.length, head: text.slice(0, 1200), err, n: raw && raw.length, raw: raw && raw.slice(0, Number(req.query.n) || 6) });
    } catch (e) { return res.status(200).json({ error: String(e && e.message || e) }); }
  }
  if (req.query.probe) {
    try {
      const { html, url } = await fetchPage(String(req.query.probe));
      if (/^\s*[\[{]/.test(html)) { try { const j = JSON.parse(html); const a = Array.isArray(j) ? j : j.events || j.upcoming || j.items || [j]; if (req.query.brief) return res.status(200).json({ url, items: a.length, titles: a.slice(0, 3).map((x) => String(x.title || x.name || x.summary || "").slice(0, 70)), dates: a.slice(0, 3).map((x) => x.start_date || x.startDate || x.start || x.date || null) }); return res.status(200).json({ url, bytes: html.length, items: a.length, sample: a.slice(0, Number(req.query.n) || 2), kinds: a.length ? Object.keys(a[0]) : [] }); } catch { /* not JSON */ } }
      const ld = jsonLdEvents(html);
      return res.status(200).json({ url, bytes: html.length, jsonLdEvents: ld.length, sample: ld.slice(0, 2).map((o) => fromLd(o, { id: "p" }, url)), text: pageText(html, url).slice(0, 600) });
    } catch (e) { return res.status(200).json({ error: String(e && e.message || e) }); }
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "ANTHROPIC_API_KEY / BLOB_READ_WRITE_TOKEN not set" });
  const one = req.query.source ? SOURCES.filter((s) => s.id === req.query.source) : null;
  const now = Date.now();
  const due = one || SOURCES.filter((s) => { const x = store.by[s.id]; return !x || !x.at || now - x.at >= EVERY[s.cadence]; })
    .sort((a, b) => ((store.by[a.id] || {}).at || 0) - ((store.by[b.id] || {}).at || 0)).slice(0, MAX_PER_RUN);
  const ran = await Promise.all(due.map(async (s) => { const x = await runSource(s, store, !!req.query.force); return { id: s.id, ok: x.ok, how: x.how, count: x.count, err: x.err, note: x.note }; }));
  SOURCES.length && Object.keys(store.by).forEach((k) => { if (!SOURCES.some((s) => s.id === k)) delete store.by[k]; });
  store.updated = new Date().toISOString();
  await putJSON(STORE, store);
  return res.status(200).json({ ran, remaining: SOURCES.filter((s) => { const x = store.by[s.id]; return !x || !x.at; }).length });
}
