/**
 * Good Plans — Vercel push relay
 * Place at: api/push.js  (same repo root as api/fetch.js)
 *
 * SETUP:
 *   1. Add web-push to your project: in the repo root package.json add
 *        "web-push": "^3.6.7"
 *      to dependencies, then commit — Vercel installs it on deploy.
 *
 *   2. Generate VAPID keys ONCE (run locally, keep them safe):
 *        npx web-push generate-vapid-keys
 *
 *   3. In Vercel Dashboard → your project → Settings → Environment Variables, add:
 *        VAPID_PUBLIC_KEY   = <your generated public key>
 *        VAPID_PRIVATE_KEY  = <your generated private key>
 *        VAPID_CONTACT      = mailto:yourname@gmail.com
 *        PUSH_SECRET        = <any random secret string, same as in Apps Script>
 *
 *   4. Also note VAPID_PUBLIC_KEY — you'll paste it into App.jsx and Apps Script.
 */

const webpush = require("web-push");

// Configure with env vars (never exposed to client)
webpush.setVapidDetails(
  process.env.VAPID_CONTACT  || "mailto:goodplans@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Push-Secret");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Authenticate the caller (Apps Script sends this header)
  const secret = req.headers["x-push-secret"] || "";
  if (!process.env.PUSH_SECRET || secret !== process.env.PUSH_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { subscriptions = [], title, body, url = "/" } = req.body || {};
  if (!subscriptions.length) return res.json({ sent: 0, failed: 0 });
  if (!title) return res.status(400).json({ error: "title required" });

  const payload = JSON.stringify({ title, body: body || "", url });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload, {
        TTL: 4 * 60 * 60, // 4 hours — discard if device unreachable
      })
    )
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");

  // Log expired/invalid subscriptions so Apps Script can clean them up
  const expired = [];
  for (let i = 0; i < failed.length; i++) {
    const err = failed[i].reason;
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      // Subscription is gone — caller should remove it
      expired.push(subscriptions[i].endpoint);
    }
  }

  res.json({ sent, failed: failed.length, expired });
};
