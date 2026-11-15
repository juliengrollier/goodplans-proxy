/**
 * Good Plans — /api/enrich  (Claude API; needs ANTHROPIC_API_KEY in Vercel env)
 *
 * POST { mode: "tags", events: [{ id, title, desc, cat, sub, venue, price, time }] }   (max 40)
 *   → { tags: { [id]: { k: ["3–5 short keywords"], cat: "<category>" } } }
 * POST { mode: "highlights", taste, weather, picks: [{ title, when, venue, cat, price, why }] }  (max 15)
 *   → { text }
 */

const ALLOWED = /(^https?:\/\/localhost(:\d+)?$)|(\.vercel\.app$)/;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const CATS2 = ["Theater", "Comedy", "Film", "Dance & Opera", "Live Sports", "Concerts", "Jazz & Blues", "Classical", "Tastings", "Food Markets & Pop-ups", "Bars & Happy Hours", "Clubs & DJs", "Dance Socials", "Karaoke & Trivia", "Arts & Crafts", "Cooking & Cocktails", "Run & Ride", "Yoga & Wellness", "Play", "Museums & Galleries", "Markets", "Festivals & Parades", "Parks & Nature", "Talks & Panels", "Books & Readings", "Tours"];
const CATS = ["Music", "Comedy", "Art & Culture", "Film", "Food & Drink", "Outdoors", "Sports", "Family", "Talk & Learn", "Get Creative", "Nightlife", "Shopping", "Other"];

function cors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.test(origin) ? origin : "https://goodplans-proxy.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function claude(system, user, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "Claude API " + r.status);
  return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

async function tags(events) {
  const list = events.slice(0, 40).map((e) => ({ id: clip(e.id, 80), title: clip(e.title, 140), desc: clip(e.desc, 500), cat: clip(e.cat, 30), sub: clip(e.sub, 40), venue: clip(e.venue, 80), price: clip(e.price, 30), time: clip(e.time, 20) }));
  const system = `You label New York City events for a personal events app. For each event, give 3 to 5 keywords that tell someone at a glance what to expect: format (e.g. live band, DJ set, stand-up, screening, workshop, walking tour, market, talk, exhibition), style or genre (e.g. jazz, indie rock, experimental, comedy improv), topic, and vibe (e.g. outdoor, late night, family-friendly, hands-on, dance floor). Each keyword is 1 to 3 words, lowercase, no hashtags, no price, no date, no venue name. Use only what the title and description support; do not invent. Also return the best category from this list: ${CATS.join(", ")}.
And "cat2": the single best fit from this second list, judged by what the person will actually be doing there: ${CATS2.join(", ")}.
Reply with JSON only, no prose: {"<id>": {"k": ["..."], "cat": "...", "cat2": "..."}}`;
  const text = await claude(system, JSON.stringify(list), 3000);
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const out = {};
  for (const [id, v] of Object.entries(json)) {
    const k = (Array.isArray(v?.k) ? v.k : []).map((x) => clip(x, 28).toLowerCase()).filter(Boolean).slice(0, 5);
    out[id] = { k, cat: CATS.includes(v?.cat) ? v.cat : null, cat2: CATS2.includes(v?.cat2) ? v.cat2 : null };
  }
  return out;
}

async function highlights({ taste, weather, picks }) {
  const list = (picks || []).slice(0, 15).map((p, i) => ({ n: i + 1, title: clip(p.title, 120), when: clip(p.when, 40), venue: clip(p.venue, 60), cat: clip(p.cat, 30), price: clip(p.price, 30), why: (p.why || []).slice(0, 3).map((w) => clip(w, 40)) }));
  const system = `You write the weekly "don't miss" note at the top of Good Plans, a personal NYC events app for a couple living on the Lower East Side. Write ONE compact paragraph, at most 85 words, direct and telegraphic, no filler. Structure: segments by day or moment, separated by " ▫️ ", each segment starting with a short label and a colon (Today, Tomorrow, Midweek, Next weekend...). After the label, list 2 events separated by " / " (3 if the segment is light). Each event is a keyword link followed by a hook of 3 to 6 words that says what the experience is or why it fits their taste, optionally ending with one fitting emoji. Cover 6 to 9 events overall. Example shape: "Today: [[1|Rockefeller tree]] arriving, free one-night outdoor moment 🎄 ▫️ Tomorrow: [[2|Fort Washington battle]] history in the open air / [[3|Central Park hike]] long walk under the trees 🚶 ▫️ Tuesday: [[4|Harlem lights]] parade feel uptown". Link each event with a keyword of 1 to 3 words, not its full title: wrap it as [[n|keyword]], where n is the event's number in the list. No times, no prices, no addresses, no full sentences, no verbs like "offers" or "brings". Skip filler events. Mention weather only if it changes the plan, in a few words. Use only the facts given; do not invent details. No greeting, no sign-off, no markdown, no lists.`;
  const user = `What they like: ${clip(taste, 400)}\nWeather this week: ${clip(weather, 300)}\nTop picks, best first:\n${JSON.stringify(list)}`;
  let text = clip(await claude(system, user, 4000), 1000);
  text = text.replace(/\[\[[^\]]*$/, "").trim(); // drop a marker cut off mid-way
  if (!text) throw new Error("Claude returned no text");
  return text;
}

async function moodTitle({ scope, moment, mood, events }) {
  const list = (events || []).slice(0, 4).map((e) => ({ title: clip(e.title, 100), venue: clip(e.venue, 50), when: clip(e.when, 30), cat: clip(e.cat, 30) }));
  const you = scope === "you";
  const system = you
    ? `You write one section header in Good Plans, a personal NYC events app for a couple on the Lower East Side. This section is about THEM: a guess at how they probably feel right now, as if you read their mind. Write a title and a subtitle.
Title: at most 36 characters, about their state of mind and what they're craving right now, not about any event, venue or holiday. Second person or no subject. Warm, witty, a knowing wink, like a friend who gets them. No exclamation marks, no emojis, no event names.
Subtitle: at most 80 characters. Say the read in plain words (why you think so: the time, the weather, their day) and what that calls for. Use only the facts given.
Reply with JSON only: {"title": "...", "sub": "..."}`
    : `You write one section header in Good Plans, a personal NYC events app for a couple on the Lower East Side. This section names the ONE thing happening in the city right now that sets the mood. The theme is already chosen.
Title: at most 34 characters. Plain, simple and direct: say the theme in everyday words so it's understood at a glance. Confident, warm, no riddles, no puns that need decoding, no metaphors. Good examples: "It's Marathon Sunday", "Pride weekend is here", "Fleet Week is in port", "San Gennaro is on in Little Italy", "Thanksgiving is 12 days away", "The cold is here", "Warmer days ahead". No other occasions, no event names, no exclamation marks, no full stop, no emojis.
Subtitle: at most 80 characters, one plain line with the key fact (a date, a temperature, a time) and what it means for going out. Only facts given; no other occasions.
Reply with JSON only: {"title": "...", "sub": "..."}`;
  const user = you
    ? `Moment: ${clip(moment, 200)}\nThe read: ${clip(mood?.read, 200)}\nLikely mood: ${clip(mood?.label, 60)} (${clip(mood?.offer, 100)})\nTone examples (do not copy): ${(mood?.titles || []).map((t) => clip(t, 60)).join(" | ")}\nWhat it will show (do not name these): ${JSON.stringify(list.map((e) => e.cat))}`
    : `Moment: ${clip(moment, 200)}\nTheme (the only subject): ${clip(mood?.theme, 120)}\nContext: ${clip(mood?.facts, 200)}\nTone examples (do not copy): ${(mood?.titles || []).map((t) => clip(t, 60)).join(" | ")}\nEvents: ${JSON.stringify(list)}`;
  const t = await claude(system, user, 1500);
  const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  if (!j.title) throw new Error("Claude returned no title");
  return { title: clip(j.title, 60), sub: clip(j.sub, 120) };
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not set in Vercel" });
  if (!ALLOWED.test(req.headers.origin || "")) return res.status(403).json({ error: "Origin not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (body.mode === "tags") return res.status(200).json({ tags: await tags(body.events || []) });
    if (body.mode === "highlights") return res.status(200).json({ text: await highlights(body) });
    if (body.mode === "mood") return res.status(200).json(await moodTitle(body));
    return res.status(400).json({ error: "mode must be tags, highlights or mood" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
}
