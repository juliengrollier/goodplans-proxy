/**
 * Good Plans — /api/activity-discover  (weekly Vercel cron; also runnable with ?key=FLAGS_KEY)
 *
 * Finds things people go to that the activity list doesn't cover yet, and adds them:
 * 1. Reads the feed (GP_FEED_URL/GP_FEED_KEY), events in the next 21 days.
 * 2. Keeps the ones no activity pattern recognises.
 * 3. Claude proposes new, specific activities shared by several of them (label, category, pattern, related).
 * 4. A proposal is added when its pattern is valid, it doesn't duplicate an activity, and it matches at least
 *    MIN_EVENTS of the unrecognised events. Added activities live in activities/extra.json (private Blob store);
 *    the tagging prompt and the app load them.
 * GET ?list=1 → the added activities (read by the app).
 */
import { ACTIVITIES, ACT_CAT, ACT_RE } from "./activity-ids.js";
const ACTS = Object.keys(ACTIVITIES).map((id) => [id, ACTIVITIES[id], ACT_CAT[id], new RegExp(ACT_RE[id], "i")]);
import { getJSON, putJSON } from "./_blob.js";

export const config = { maxDuration: 60 };
const MIN_EVENTS = 5, HORIZON = 21, MAX_ADD = 12;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const CATS = [...new Set(ACTS.map((a) => a[2]))];
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const textOf = (e) => [e.title, e.sub, e.desc].filter(Boolean).join(" ").toLowerCase();

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  if (req.query.list) {
    res.setHeader("Cache-Control", "public, max-age=900");
    return res.status(200).json((await getJSON("activities/extra.json").catch(() => null)) || { list: [] });
  }
  const cron = !!req.headers["x-vercel-cron"] || /vercel-cron/i.test(req.headers["user-agent"] || "") || (process.env.CRON_SECRET && req.headers.authorization === "Bearer " + process.env.CRON_SECRET);
  const manual = !!process.env.FLAGS_KEY && req.query.key === process.env.FLAGS_KEY;
  if (!cron && !manual) return res.status(401).json({ error: "Unauthorized" });
  try {
    const store = (await getJSON("activities/extra.json").catch(() => null)) || { list: [] };
    const known = [...ACTS.map(([id, label, cat, re]) => ({ id, label, cat, re })), ...store.list.map((a) => ({ ...a, re: new RegExp(a.pattern, "i") }))];
    const u = process.env.GP_FEED_URL + (process.env.GP_FEED_URL.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(process.env.GP_FEED_KEY);
    const feed = await (await fetch(u, { redirect: "follow" })).json();
    const today = new Date().toISOString().slice(0, 10), until = new Date(Date.now() + HORIZON * 864e5).toISOString().slice(0, 10);
    const events = (feed.events || []).filter((e) => e.id && e.E && (e.X || e.E) >= today && e.E <= until);
    const unmatched = events.filter((e) => { const t = textOf(e); return !known.some((a) => a.re.test(t)); });
    if (unmatched.length < MIN_EVENTS) return res.status(200).json({ checked: events.length, unmatched: unmatched.length, added: [] });

    const sample = unmatched.slice(0, 220).map((e) => ({ id: e.id, t: clip(e.title, 110), d: clip(e.desc, 140) }));
    const system = `You curate the activity list of a New York City events app. An activity is a specific thing people go out to do (e.g. "salsa dancing", "pottery", "roast battles", "sample sales"), finer than a category.
Below are upcoming events that no current activity recognises. Propose NEW activities, each shared by at least ${MIN_EVENTS} of these events, specific and useful as a filter, and not a duplicate or near-synonym of an existing activity.
Existing activities: ${known.map((a) => a.label).join(", ")}.
Allowed categories (pick one): ${CATS.join(", ")}.
For each proposal give: "id" (kebab-case, new), "label" (short, lower case unless a proper noun), "cat" (one allowed category), "pattern" (a JavaScript regular expression source, lower case, matching how such events are written in titles and descriptions; specific enough not to catch other events), "rel" (up to 3 related existing activity labels), "examples" (ids of the events it covers).
Reply with JSON only: {"proposals": [...]}. Propose at most ${MAX_ADD}; if nothing qualifies, return {"proposals": []}.`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 6000, system, messages: [{ role: "user", content: JSON.stringify(sample) }] }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: "claude " + r.status });
    const t = (d.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
    let props = [];
    try { props = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)).proposals || []; } catch { props = []; }

    const byLabel = Object.fromEntries(known.map((a) => [a.label.toLowerCase(), a.id]));
    const ids = new Set(known.map((a) => a.id));
    const added = [], rejected = [];
    for (const p of props) {
      const id = String(p.id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      const why = !id ? "no id" : ids.has(id) ? "id exists" : !CATS.includes(p.cat) ? "unknown category" : byLabel[String(p.label || "").toLowerCase()] ? "duplicate label" : null;
      if (why) { rejected.push({ label: p.label, why }); continue; }
      let re; try { re = new RegExp(p.pattern, "i"); } catch { rejected.push({ label: p.label, why: "bad pattern" }); continue; }
      const hits = unmatched.filter((e) => re.test(textOf(e)));
      const wide = events.filter((e) => re.test(textOf(e))).length;
      if (hits.length < MIN_EVENTS) { rejected.push({ label: p.label, why: `only ${hits.length} events` }); continue; }
      if (wide > Math.max(40, events.length * 0.08)) { rejected.push({ label: p.label, why: `too broad (${wide} events)` }); continue; }
      const rel = (p.rel || []).map((l) => byLabel[String(l).toLowerCase()]).filter(Boolean).slice(0, 3);
      const a = { id, label: clip(p.label, 40), cat: p.cat, pattern: re.source, rel, added: today, count: hits.length, examples: hits.slice(0, 3).map((e) => clip(e.title, 80)) };
      added.push(a); ids.add(id); byLabel[a.label.toLowerCase()] = id;
      if (added.length >= MAX_ADD) break;
    }
    if (added.length) await putJSON("activities/extra.json", { list: [...store.list, ...added], updated: today });
    return res.status(200).json({ checked: events.length, unmatched: unmatched.length, proposed: props.length, added, rejected, total: store.list.length + added.length });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
