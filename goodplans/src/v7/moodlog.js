// Measuring the mood engine: what Discover showed, what you opened, and what you saved or went to from a mood.
// Kept per day (60 days) and per mood, so the Me panel can show whether discoveries actually land.
const KEY = "gp_moodlog_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || { days: {}, moods: {} }; } catch { return { days: {}, moods: {} }; } };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
// type: shown | opened | saved; adj marks a "Because you like…" discovery
export function logMood(type, key, adj = false, title) {
  const s = load(), d = iso(new Date());
  const day = (s.days[d] = s.days[d] || { shown: 0, opened: 0, saved: 0, adjShown: 0, adjOpened: 0, adjSaved: 0 });
  day[type]++; if (adj) day["adj" + type[0].toUpperCase() + type.slice(1)]++;
  const m = (s.moods[key] = s.moods[key] || { shown: 0, opened: 0, saved: 0 }); m[type]++; if (title) m.title = title; m.at = Date.now();
  const ds = Object.keys(s.days).sort(); ds.slice(0, Math.max(0, ds.length - 60)).forEach((k) => delete s.days[k]);
  const ms = Object.entries(s.moods).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)); ms.slice(300).forEach(([k]) => delete s.moods[k]);
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* full */ }
}
export function moodStats(days = 14) {
  const s = load(), since = iso(new Date(Date.now() - days * 86400000));
  const t = { shown: 0, opened: 0, saved: 0, adjShown: 0, adjOpened: 0, adjSaved: 0 };
  for (const [d, v] of Object.entries(s.days)) if (d >= since) for (const k in t) t[k] += v[k] || 0;
  const top = Object.entries(s.moods).filter(([, m]) => m.opened || m.saved).sort((a, b) => (b[1].saved * 3 + b[1].opened) - (a[1].saved * 3 + a[1].opened)).slice(0, 5).map(([k, m]) => ({ key: k, ...m }));
  return { ...t, top };
}
// When each My Interests entry was hearted (tile keys, and "mood:<id>" for moods), so the row shows the latest first
const FAV_AT = "gp_favat_v1";
export function favAt() { try { return JSON.parse(localStorage.getItem(FAV_AT) || "{}") || {}; } catch { return {}; } }
export function markFavAt(key, on) {
  const m = favAt(); if (on) m[key] = Date.now(); else delete m[key];
  try { localStorage.setItem(FAV_AT, JSON.stringify(m)); } catch { /* full */ }
}
