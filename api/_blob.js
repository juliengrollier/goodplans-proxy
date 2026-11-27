// Good Plans storage: small JSON documents by path ("flags/<id>.json", "push/u/<user>.json", …).
// Upstash Redis (Vercel Marketplace; KV_REST_API_URL + KV_REST_API_TOKEN) when connected, otherwise the old private
// Vercel Blob store. Blob's free tier allows only 2,000 list/put operations a month and every read here started with
// a list, so the store was suspended in Nov 2026; Redis' free tier allows ~500k commands a month.
const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const useRedis = !!(RURL && RTOK);
export const hasStore = () => useRedis || !!process.env.BLOB_READ_WRITE_TOKEN;
const NS = "gp:";

// ── Redis (Upstash REST)
async function redis(cmds) {
  const r = await fetch(RURL.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { authorization: "Bearer " + RTOK, "content-type": "application/json" }, body: JSON.stringify(cmds) });
  const d = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(d)) throw new Error("redis " + r.status + " " + (d?.error || ""));
  return d.map((x) => { if (x.error) throw new Error("redis " + x.error); return x.result; });
}
const parse = (s) => { if (s == null) return null; try { return JSON.parse(s); } catch { return null; } };

// ── Blob (legacy)
const API = "https://vercel.com/api/blob";
function headers(extra = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  return { authorization: "Bearer " + token, "x-api-version": "13", "x-vercel-blob-store-id": token.split("_")[3] || "", ...extra };
}
export async function blobApi(path, init) {
  const r = await fetch(API + path, { ...init, headers: headers(init.headers) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("blob " + r.status + " " + (d.error?.message || ""));
  return d;
}
const blobFetch = async (url) => { const r = await fetch(url + (url.includes("?") ? "&" : "?") + "cache=0", { headers: { authorization: "Bearer " + process.env.BLOB_READ_WRITE_TOKEN } }); return r.ok ? r.json().catch(() => null) : null; };

// ── Public API
// putJSON(path, obj, { ttl: seconds }) — ttl only applies on Redis
export async function putJSON(pathname, obj, opt = {}) {
  if (useRedis) { await redis([opt.ttl ? ["SET", NS + pathname, JSON.stringify(obj), "EX", String(opt.ttl)] : ["SET", NS + pathname, JSON.stringify(obj)]]); return { pathname }; }
  return blobApi("/?" + new URLSearchParams({ pathname }).toString(), {
    method: "PUT", body: JSON.stringify(obj),
    headers: { "x-vercel-blob-access": "private", "x-add-random-suffix": "0", "x-allow-overwrite": "1", "x-content-type": "application/json", "x-cache-control-max-age": "60" },
  });
}
export async function getJSON(pathname) {
  if (useRedis) return parse((await redis([["GET", NS + pathname]]))[0]);
  const d = await blobApi("?" + new URLSearchParams({ prefix: pathname, limit: "1" }).toString(), { method: "GET" });
  const b = (d.blobs || []).find((x) => x.pathname === pathname);
  return b ? blobFetch(b.url) : null;
}
// Every document under a prefix → [{ pathname, url? }] sorted by pathname
export async function listAll(prefix) {
  const out = [];
  if (useRedis) {
    let cursor = "0";
    for (let i = 0; i < 200; i++) {
      const [[next, keys]] = await redis([["SCAN", cursor, "MATCH", NS + prefix + "*", "COUNT", "1000"]]);
      keys.forEach((k) => out.push({ pathname: k.slice(NS.length) }));
      cursor = String(next); if (cursor === "0") break;
    }
  } else {
    let cursor = "";
    for (let i = 0; i < 20; i++) {
      const q = new URLSearchParams({ prefix, limit: "1000" }); if (cursor) q.set("cursor", cursor);
      const d = await blobApi("?" + q.toString(), { method: "GET" });
      out.push(...(d.blobs || [])); if (!d.hasMore || !d.cursor) break; cursor = d.cursor;
    }
  }
  return [...new Map(out.map((x) => [x.pathname, x])).values()].sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
}
// Read many listed documents (entries from listAll) → same order, null when unreadable
export async function getMany(items) {
  if (!items.length) return [];
  if (useRedis) {
    const vals = [];
    for (let i = 0; i < items.length; i += 500) vals.push(...(await redis([["MGET", ...items.slice(i, i + 500).map((x) => NS + x.pathname)]]))[0]);
    return vals.map(parse);
  }
  return Promise.all(items.map((x) => blobFetch(x.url)));
}
export async function delMany(items) {
  if (!items.length) return 0;
  if (useRedis) { await redis([["DEL", ...items.map((x) => NS + x.pathname)]]); return items.length; }
  await blobApi("/delete", { method: "POST", body: JSON.stringify({ urls: items.map((x) => x.url) }), headers: { "content-type": "application/json" } });
  return items.length;
}

export const INDEX = "details/index.json";
export const readIndex = async () => (await getJSON(INDEX).catch(() => null)) || {};
