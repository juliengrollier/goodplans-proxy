// Minimal Vercel Blob REST client (private store "goodplans-dev-flags"; no npm dependency in this folder)
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
export async function putJSON(pathname, obj) {
  return blobApi("/?" + new URLSearchParams({ pathname }).toString(), {
    method: "PUT", body: JSON.stringify(obj),
    headers: { "x-vercel-blob-access": "private", "x-add-random-suffix": "0", "x-allow-overwrite": "1", "x-content-type": "application/json", "x-cache-control-max-age": "60" },
  });
}
export async function getJSON(pathname) {
  const d = await blobApi("?" + new URLSearchParams({ prefix: pathname, limit: "1" }).toString(), { method: "GET" });
  const b = (d.blobs || []).find((x) => x.pathname === pathname);
  if (!b) return null;
  const r = await fetch(b.url + (b.url.includes("?") ? "&" : "?") + "cache=0", { headers: { authorization: "Bearer " + process.env.BLOB_READ_WRITE_TOKEN } });
  return r.ok ? r.json() : null;
}
export const INDEX = "details/index.json";
export const readIndex = async () => (await getJSON(INDEX).catch(() => null)) || {};
