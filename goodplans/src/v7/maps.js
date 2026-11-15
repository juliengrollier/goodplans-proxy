// Google Maps saved lists, imported once from a Google Takeout export (no API exists for them).
// Takeout "Saved" gives one CSV per list (Title, Note, URL, Tags, Comment); "Maps (your places)" gives
// starred places as GeoJSON. Everything is parsed on the phone and kept on the phone.
import { unzipSync, strFromU8 } from "fflate";

export const MAPS_KEY = "gp_maps_v1";

// RFC 4180-ish CSV parser (quotes, commas and newlines inside quotes)
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function listFromCSV(name, text) {
  const rows = parseCSV(text.replace(/^﻿/, ""));
  if (!rows.length) return null;
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const ix = (k) => head.indexOf(k);
  if (ix("title") < 0) return null;
  const places = rows.slice(1).map((r) => ({ title: (r[ix("title")] || "").trim(), note: ix("note") >= 0 ? (r[ix("note")] || "").trim() : "", url: ix("url") >= 0 ? (r[ix("url")] || "").trim() : "", tags: ix("tags") >= 0 ? (r[ix("tags")] || "").trim() : "" }))
    .filter((p) => p.title);
  return places.length ? { name, places } : null;
}

function starredFromJSON(text) {
  try {
    const j = JSON.parse(text);
    return (j.features || []).map((f) => {
      const p = f.properties || {}, loc = p.location || {}, c = f.geometry?.coordinates;
      const title = loc.name || p.Title || p.title || "";
      return title ? { title, address: loc.address || "", coord: Array.isArray(c) && (c[0] || c[1]) ? [c[1], c[0]] : null, url: p.google_maps_url || "" } : null;
    }).filter(Boolean);
  } catch { return []; }
}

// Accepts the Takeout .zip, or the CSV / JSON files from inside it
export async function parseTakeout(files) {
  const out = { lists: [], starred: [] };
  const take = (path, text) => {
    const base = path.split("/").pop();
    if (/\.csv$/i.test(base)) { const l = listFromCSV(base.replace(/\.csv$/i, ""), text); if (l) out.lists.push(l); }
    else if (/\.(geo)?json$/i.test(base) && /saved|starred|place/i.test(path)) out.starred.push(...starredFromJSON(text));
  };
  for (const f of files) {
    const buf = new Uint8Array(await f.arrayBuffer());
    if (/\.zip$/i.test(f.name)) {
      const z = unzipSync(buf, { filter: (e) => /\.(csv|json|geojson)$/i.test(e.name) && /saved|maps/i.test(e.name) });
      Object.entries(z).forEach(([p, d]) => take(p, strFromU8(d)));
    } else take(f.name, strFromU8(buf));
  }
  if (out.starred.length && !out.lists.some((l) => /starred/i.test(l.name))) out.lists.push({ name: "Starred places", places: out.starred.map(({ title, url }) => ({ title, note: "", url, tags: "" })) });
  return out;
}

// Matching events to saved places: venue name against place name, ignoring filler words
const STOP = new Set(["the", "and", "at", "of", "nyc", "new", "york", "brooklyn", "manhattan", "queens", "bar", "cafe", "restaurant", "club", "inc", "llc"]);
const toks = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
const keyOf = (s) => toks(s).join(" ");

export function buildIndex(data) {
  const idx = new Map();
  (data?.lists || []).forEach((l) => l.places.forEach((p) => {
    const k = keyOf(p.title); if (!k) return;
    const e = idx.get(k) || { title: p.title, lists: [], note: "" };
    if (!e.lists.includes(l.name)) e.lists.push(l.name);
    if (p.note && !e.note) e.note = p.note;
    idx.set(k, e);
  }));
  return idx;
}

export const isWantList = (name) => /want to go|to ?try|to ?visit|wishlist|bucket|someday|must/i.test(name);

// Returns the saved place an event happens at, if any
export function matchSaved(idx, ev) {
  if (!idx?.size || !ev.venue) return null;
  const v = keyOf(String(ev.venue).split(",")[0]);
  if (!v) return null;
  if (idx.has(v)) return idx.get(v);
  const vt = v.split(" ");
  // Fuzzy: all words of the shorter name appear in the longer one, with at least one word of 4+ letters
  for (const [k, e] of idx) {
    const kt = k.split(" "), [a, b] = kt.length <= vt.length ? [kt, vt] : [vt, kt];
    if (a.every((w) => b.includes(w)) && a.some((w) => w.length >= 4)) return e;
  }
  return null;
}

export const loadMaps = () => { try { return JSON.parse(localStorage.getItem(MAPS_KEY) || "null"); } catch { return null; } };
export const saveMaps = (d) => { try { if (d) localStorage.setItem(MAPS_KEY, JSON.stringify(d)); else localStorage.removeItem(MAPS_KEY); } catch { /* full */ } };
