// Web Push without npm dependencies: payload encryption (RFC 8291, aes128gcm) and VAPID signing (RFC 8292).
import crypto from "node:crypto";

export const VAPID_PUBLIC = "BCK6TT-wrC6Gc40EcM_ZNjAO-QP6aABoJ3GgVqD0rAgCNO2MDyrC7Sthty1gwd3DoVLZb5KQVj34w_oJFVynYHg";
const b64u = (b) => Buffer.from(b).toString("base64url");
const unb64u = (s) => Buffer.from(String(s), "base64url");

function vapidJWT(aud, priv, pub, contact) {
  const P = unb64u(pub);
  const key = crypto.createPrivateKey({ key: { kty: "EC", crv: "P-256", d: priv, x: b64u(P.subarray(1, 33)), y: b64u(P.subarray(33, 65)) }, format: "jwk" });
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contact }));
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key, dsaEncoding: "ieee-p1363" });
  return head + "." + body + "." + b64u(sig);
}

export function encrypt(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const ecdh = crypto.createECDH("prime256v1");
  const as = ecdh.generateKeys();
  const shared = ecdh.computeSecret(ua);
  const salt = crypto.randomBytes(16);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, auth, Buffer.concat([Buffer.from("WebPush: info\0"), ua, as]), 32));
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([as.length]), as, ct]);
}

// Send one notification. Returns { ok, status, gone } — gone means the subscription no longer exists (remove it).
export async function sendPush(sub, data, { ttl = 4 * 3600, urgency = "normal" } = {}) {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) throw new Error("VAPID_PRIVATE_KEY not set");
  const aud = new URL(sub.endpoint).origin;
  const jwt = vapidJWT(aud, priv, VAPID_PUBLIC, process.env.VAPID_CONTACT || "mailto:goodplans@users.noreply.github.com");
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: { TTL: String(ttl), Urgency: urgency, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", Authorization: "vapid t=" + jwt + ", k=" + VAPID_PUBLIC },
    body: encrypt(sub, JSON.stringify(data)),
  });
  return { ok: r.ok, status: r.status, gone: r.status === 404 || r.status === 410 };
}
