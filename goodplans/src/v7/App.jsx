import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CSS, FONTS_HREF } from "./theme.js";
import { TabBar, ActionsCtx } from "./components.jsx";
import { EMPTY_FILTERS } from "./Filters.jsx";
import { API_BASE } from "./images.js";
import Today from "./Today.jsx";
import Explore from "./Explore.jsx";
import MapView from "./MapView.jsx";
import Plans from "./Plans.jsx";
import Me from "./Me.jsx";
import EventSheet from "./EventSheet.jsx";
import { FreeUntilDialog, Surprise } from "./Extras.jsx";
import {
  LES, TASTE_KEY, emptyTaste, applyReaction, toggleFollow, effectiveProf, scoreEvent, buildToday,
  fetchWeather, fitsFree, isOver, nowMinutes, isoDay, safeCoord, floorDay, evActive, seriesKey, tasteSummary, whenLabel,
} from "./engine.js";
import {
  DP, SK_P, SK_F, SK_B, DEFAULT_SUBS, sg, ss, daysUntil, CATS, DAYS,
  getSWRegistration, subscribePush, registerSubWithAppsScript,
} from "../lib/core.js";

// Backend defaults: set VITE_GP_URL / VITE_GP_KEY in Vercel. Values saved in Me override them.
// Fallback = the values already in the classic app. Rotate the key, set the env vars, then delete these.
const LEGACY_URL = "https://script.google.com/macros/s/AKfycbzyUXSvObga5nVWHavisMQu3jxwNCWWsiZwsVaq_IzRp5qgSfz_8J1kL_5zP2iKly2-/exec";
const LEGACY_KEY = "f{ZU6kRspFUn0MW744OEMY8s";
const ENV_URL = import.meta.env.VITE_GP_URL || LEGACY_URL;
const ENV_KEY = import.meta.env.VITE_GP_KEY || LEGACY_KEY;
const THEME_KEY = "gp_theme_v7";
const STALE_MS = 6 * 3600 * 1000;
const TAGS_KEY = "gp_tags_v8";
const HL_KEY = "gp_hl_v13";
const postJSON = (path, body) => fetchJSONPost(API_BASE + path, body);
async function fetchJSONPost(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || "HTTP " + r.status); e.status = r.status; throw e; }
  return d;
}

const mergeProf = (pr) => ({
  ...DP, ...(pr || {}),
  categories: { ...DP.categories, ...(pr?.categories || {}) },
  vibes: { ...DP.vibes, ...(pr?.vibes || {}) },
  subcategories: { ...DEFAULT_SUBS, ...DP.subcategories, ...(pr?.subcategories || {}) },
});

const fetchJSON = async (url, ms = 30000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("today");
  const [events, setEvents] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshLog, setRefreshLog] = useState("");
  const [backend, setBackendState] = useState({ url: ENV_URL, key: ENV_KEY });
  const [prof, setProf] = useState(mergeProf(null));
  const [favs, setFavs] = useState({});
  const [beh, setBeh] = useState({});
  const [taste, setTaste] = useState(emptyTaste());
  const [theme, setThemeState] = useState("system");
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);
  const [home, setHome] = useState(LES);
  const [locSt, setLocSt] = useState("default");
  const [weather, setWeather] = useState(null);
  const [busySlots, setBusySlots] = useState([]);
  const [calStatus, setCalStatus] = useState("none");
  const [calName, setCalName] = useState("");
  const [pushState, setPushState] = useState("Checking…");
  const [pushInfo, setPushInfo] = useState("");
  const [freeUntil, setFreeUntil] = useState(null);
  const [showFree, setShowFree] = useState(false);
  const [openEv, setOpenEv] = useState(null);
  const [surprise, setSurprise] = useState(null); // {ev, seen:Set} | null
  const [toastMsg, setToastMsg] = useState("");
  const [tick, setTick] = useState(0); // re-evaluate "now" every few minutes
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tags, setTags] = useState(() => { try { return JSON.parse(localStorage.getItem(TAGS_KEY) || "{}"); } catch { return {}; } });
  const [hl, setHl] = useState(() => { try { return JSON.parse(localStorage.getItem(HL_KEY) || "null"); } catch { return null; } });
  const [hlStatus, setHlStatus] = useState("idle");
  const aiOff = useRef(false); // set when the enrich function is unavailable (no key), to stop retrying this session
  const toastT = useRef(null);

  const dark = theme === "dark" || (theme === "system" && sysDark);
  const today = useMemo(() => floorDay(new Date()), [tick]);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  // ── Styles, fonts, theme
  useEffect(() => {
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    const ln = document.createElement("link"); ln.rel = "stylesheet"; ln.href = FONTS_HREF; document.head.appendChild(ln);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = (e) => setSysDark(e.matches);
    mq?.addEventListener?.("change", on);
    const iv = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    return () => { st.remove(); ln.remove(); mq?.removeEventListener?.("change", on); clearInterval(iv); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.body.style.background = dark ? "#141833" : "#FBF7EF";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#141833" : "#FBF7EF");
  }, [dark]);

  // ── Backend calls
  const api = useCallback((action, extra = "", ms) => {
    if (!backend.url) return Promise.reject(new Error("No backend URL. Add it in Me → Events feed."));
    const q = (action ? "action=" + action + "&" : "") + "key=" + encodeURIComponent(backend.key) + extra;
    return fetchJSON(backend.url + (backend.url.includes("?") ? "&" : "?") + q, ms);
  }, [backend]);

  const refresh = useCallback(async (silent) => {
    setRefreshing(true);
    if (!silent) setRefreshLog("Asking your Apps Script…");
    try {
      const data = await api("", "", 30000);
      if (data.error) {
        if (/Unauthorized/i.test(data.error)) throw new Error("Wrong secret key (Me → Events feed → Backend settings).");
        if (/No cache/i.test(data.error)) throw new Error("Apps Script has no cache yet. Run runDailySync() once in script.google.com.");
        throw new Error(data.error);
      }
      const t0 = floorDay(new Date());
      const list = (data.events || []).filter((e) => e.id && e.E && evActive(e, t0));
      const ts = new Date().toISOString();
      setEvents(list); setLastRefreshed(ts);
      ss("gp_events_v1", { events: list, refreshed: ts, backendRefreshed: data.refreshed || null, count: list.length, sources: ["Apps Script"] });
      setRefreshLog(`${list.length} upcoming events${data.refreshed ? " (backend synced " + new Date(data.refreshed).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) + ")" : ""}.`);
      if (!silent) toast(list.length + " events loaded");
    } catch (e) {
      const msg = e.name === "AbortError" ? "Apps Script took more than 30 s. Try again." : e.message;
      setRefreshLog("Refresh failed: " + msg);
      if (!silent) toast("Refresh failed");
    } finally { setRefreshing(false); }
  }, [api, toast]);

  const checkCal = useCallback(async (silent) => {
    setCalStatus("checking");
    try {
      const d = await api("busyDays", "", 25000);
      if (d.busySlots) {
        setBusySlots(d.busySlots); setCalStatus("ok"); setCalName(d.calendarName || "");
        ss("gp_cal_slots_v1", d.busySlots);
        if (!silent) toast(d.busySlots.length + " busy slots from " + (d.calendarName || "your calendar"));
      } else if (d.error && /authori|Calendar/i.test(d.error)) setCalStatus("unauth");
      else throw new Error(d.error || "No data");
    } catch (e) { setCalStatus(busySlots.length ? "ok" : "error"); if (!silent) toast("Calendar: " + e.message); }
  }, [api, toast, busySlots.length]);

  const checkPush = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { setPushState("This browser can't receive notifications. On iPhone, add Good Plans to the Home Screen first."); return; }
    const perm = Notification.permission;
    const reg = await getSWRegistration();
    const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
    setPushState(perm === "granted" && sub ? "On. Good Plans can ping you." : perm === "denied" ? "Blocked in browser settings. Allow notifications for this site, then tap below." : "Off.");
    try { const s = await api("pushStatus", "", 15000); if (s && !s.error) setPushInfo(`Backend has ${s.subscriptions ?? 0} device${s.subscriptions === 1 ? "" : "s"} registered.`); } catch { /* optional */ }
  }, [api]);

  const enablePush = useCallback(async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("Not allowed. Allow notifications in your browser settings."); return; }
      const reg = await getSWRegistration();
      if (!reg) { setPushState("No service worker. Open the installed app and try again."); return; }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await subscribePush(reg);
      if (!sub) { setPushState("Subscription failed."); return; }
      await registerSubWithAppsScript(backend.url, backend.key, sub);
      const nt = (await sg("gp_notif_v1")) || {};
      ss("gp_notif_v1", { ...nt, enabled: true });
      toast("Notifications on");
      checkPush();
    } catch (e) { setPushState("Error: " + e.message); }
  }, [backend, toast, checkPush]);

  // ── Location
  const locate = useCallback((interactive) => {
    if (!navigator.geolocation) return;
    setLocSt((s) => (interactive || s === "default" ? "locating" : s));
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = [p.coords.latitude, p.coords.longitude]; setHome(c); setLocSt("ok"); ss("gp_loc_v1", { coord: c, ts: Date.now() }); if (interactive) toast("Location updated"); },
      () => { setLocSt((s) => (s === "locating" ? "default" : s)); if (interactive) toast("Location not available"); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, [toast]);

  // ── Initial load
  useEffect(() => {
    (async () => {
      const [pr, fv, bh, evStore, gm, tst, th, loc, slots, calPref] = await Promise.all(
        [SK_P, SK_F, SK_B, "gp_events_v1", "gp_gmail_v1", TASTE_KEY, THEME_KEY, "gp_loc_v1", "gp_cal_slots_v1", "gp_cal_v1"].map(sg));
      setProf(mergeProf(pr));
      if (fv) { const t0 = floorDay(new Date()); const clean = Object.fromEntries(Object.entries(fv).filter(([, e]) => evActive(e, t0))); setFavs(clean); if (Object.keys(clean).length !== Object.keys(fv).length) ss(SK_F, clean); }
      if (bh) setBeh(bh);
      if (tst) setTaste({ ...emptyTaste(), ...tst });
      if (th) setThemeState(th);
      if (gm && (gm.url || gm.key)) setBackendState({ url: gm.url || ENV_URL, key: gm.key || ENV_KEY });
      if (loc?.coord) { setHome(loc.coord); setLocSt("cached"); }
      if (slots?.length) { setBusySlots(slots); setCalStatus("ok"); }
      if (calPref?.name) setCalName(calPref.name);
      if (evStore?.events?.length) { setEvents(evStore.events.filter((e) => evActive(e, floorDay(new Date())))); setLastRefreshed(evStore.refreshed || null); }
      setReady(true);
      locate(false);
    })();
  }, [locate]);

  // After load: refresh if stale, weather, calendar, push status
  useEffect(() => {
    if (!ready) return;
    const stale = !lastRefreshed || Date.now() - new Date(lastRefreshed).getTime() > STALE_MS;
    if (stale && backend.url) refresh(events.length > 0);
    if (backend.url) { checkCal(true); checkPush(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, backend.url]);

  useEffect(() => {
    if (!ready) return;
    fetchWeather(home).then(setWeather).catch(() => {});
  }, [ready, Math.round(home[0] * 50), Math.round(home[1] * 50), tick > 0 && tick % 12 === 0]);

  // ── Persisting setters
  const setBackend = (b) => { setBackendState(b); ss("gp_gmail_v1", b); };
  const setTheme = (t) => { setThemeState(t); ss(THEME_KEY, t); };
  const saveTaste = (t) => { setTaste(t); ss(TASTE_KEY, t); };
  const saveProf = (p) => { setProf(p); ss(SK_P, p); };
  const setCatValue = (c, v) => saveProf({ ...prof, categories: { ...prof.categories, [c]: v } });
  const setCatLevel = (c, v) => {
    // Picking a level resets what was learned for that category, so the choice sticks
    setCatValue(c, v);
    const catAdj = { ...taste.catAdj }; delete catAdj[c];
    saveTaste({ ...taste, catAdj });
  };
  const track = (ev, kind) => {
    const b = { ...beh, [kind]: { ...(beh[kind] || {}) } };
    b[kind][ev.cat] = (b[kind][ev.cat] || 0) + 1;
    setBeh(b); ss(SK_B, b);
  };

  // ── Scoring
  const eprof = useMemo(() => effectiveProf(prof, taste), [prof, taste]);
  const scored = useMemo(() => {
    const ctx = { eprof, beh, today, home, taste, weather, busySlots };
    return events.map((e0) => {
      const t = tags[e0.id];
      const e = t ? { ...e0, kw: t.k, cat: t.cat && CATS[t.cat] !== undefined ? t.cat : e0.cat, srcCat: e0.cat } : e0;
      const s = scoreEvent({ ...e, coord: safeCoord(e) }, ctx);
      s.calChecked = calStatus === "ok";
      return s;
    }).sort((a, b) => b.sc - a.sc);
  }, [events, tags, eprof, beh, today, home, taste, weather, busySlots, calStatus]);
  const scoreOne = useCallback((e) => {
    const s = scoreEvent({ ...e, coord: safeCoord(e) }, { eprof, beh, today, home, taste, weather, busySlots });
    s.calChecked = calStatus === "ok"; return s;
  }, [eprof, beh, today, home, taste, weather, busySlots, calStatus]);

  // Auto free-until from the next calendar busy slot today
  const autoFree = useMemo(() => {
    if (calStatus !== "ok") return null;
    const d = isoDay(today), now = nowMinutes();
    const next = busySlots.filter((s) => s.date === d && s.startH * 60 > now + 45).sort((a, b) => a.startH - b.startH)[0];
    return next ? Math.round(next.startH * 60) : null;
  }, [busySlots, calStatus, today, tick]);
  const effFree = freeUntil != null && freeUntil > nowMinutes() ? freeUntil : null;

  const visible = useMemo(() => scored.filter((e) => !e.hidden && evActive(e, today) && !isOver(e, today)), [scored, today]);
  // The week's top picks: shown on Today and used as the only source for the "don't miss" paragraph, so the text never mentions something that is not on screen
  const weekPool = useMemo(() => {
    const seen = new Set();
    return visible.filter((e) => daysUntil(e, today) <= 6).filter((e) => { const k = seriesKey(e); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
  }, [visible, today]);
  const weekPicks = useMemo(() => weekPool.slice(0, 5), [weekPool]);
  const sections = useMemo(() => buildToday(scored.filter((e) => !isOver(e, today)), { today, freeUntil: effFree, eprof, pinned: weekPicks.map((e) => e.id) }), [scored, today, effFree, eprof, weekPicks]);

  // ── Claude keywords: tag the best-scored events that have none yet, 40 per call
  const tagBusy = useRef(false);
  useEffect(() => {
    if (!ready || aiOff.current || tagBusy.current) return;
    const todo = visible.filter((e) => !tags[e.id]).slice(0, 160);
    if (!todo.length) return;
    tagBusy.current = true;
    (async () => {
      let acc = { ...tags };
      for (let i = 0; i < todo.length; i += 40) {
        try {
          const d = await postJSON("/api/enrich", { mode: "tags", events: todo.slice(i, i + 40).map(({ id, title, desc, cat, sub, venue, price, time }) => ({ id, title, desc, cat: cat, sub, venue, price, time })) });
          acc = { ...acc, ...(d.tags || {}) };
          // Events Claude skipped still get an entry, so they aren't sent again and again
          todo.slice(i, i + 40).forEach((e) => { if (!acc[e.id]) acc[e.id] = { k: [], cat: null }; });
          setTags(acc);
          try { localStorage.setItem(TAGS_KEY, JSON.stringify(Object.fromEntries(Object.entries(acc).slice(-1500)))); } catch { /* full */ }
        } catch (e) { if (e.status === 503 || e.status === 403 || e.status === 404) aiOff.current = true; break; }
      }
      tagBusy.current = false;
    })();
  }, [ready, visible.length, tags]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Weekly "don't miss" paragraph, rewritten when the top picks change or the day changes
  useEffect(() => {
    if (!ready || aiOff.current || !visible.length) return;
    const picks = weekPool;
    if (picks.length < 3) return;
    const hash = picks.map((e) => e.id).sort().join("|");
    const day = isoDay(today);
    if (hl && hl.text && hl.day === day && hl.hash === hash) return;
    setHlStatus("loading");
    const wx = weather?.byDate ? Object.entries(weather.byDate).slice(0, 7).map(([d, v]) => `${DAYS[new Date(d + "T12:00:00").getDay()]} ${v.hi}°F, ${v.pmax}% rain`).join("; ") : "unknown";
    postJSON("/api/enrich", {
      mode: "highlights", taste: tasteSummary(eprof, taste, Object.keys(CATS)), weather: wx,
      picks: picks.map((e) => ({ title: e.title, when: whenLabel(e, today), venue: (e.venue || "").split(",")[0], cat: e.cat, price: e.price, why: e.why })),
    }).then((d) => {
      if (!d.text) throw new Error("empty response");
      const v = { text: d.text, ids: picks.map((e) => e.id), hash, day, at: Date.now() };
      setHl(v); setHlStatus("idle");
      try { localStorage.setItem(HL_KEY, JSON.stringify(v)); } catch { /* full */ }
    }).catch((e) => { setHlStatus("error: " + (e.message || "network") + (e.status ? " (" + e.status + ")" : "")); if (e.status === 503 || e.status === 403 || e.status === 404) aiOff.current = true; });
  }, [ready, visible.length > 0, isoDay(today), weather ? 1 : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event sheet and deep links
  const openEvent = useCallback((ev) => { setOpenEv(ev.id); track(ev, "viewedCats"); }, [beh]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheetEv = openEv ? (scored.find((e) => e.id === openEv) || (favs[openEv] && scoreOne(favs[openEv]))) : null;

  useEffect(() => {
    if (!ready) return;
    const u = new URL(window.location.href);
    const id = u.searchParams.get("event");
    if (id && (events.some((e) => e.id === id) || favs[id])) { setOpenEv(id); u.searchParams.delete("event"); window.history.replaceState({}, "", u.pathname + u.search); }
  }, [ready, events, favs]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const h = (e) => {
      if (e.data?.type !== "PUSH_NAV" || !e.data.url) return;
      try { const id = new URL(e.data.url, location.origin).searchParams.get("event"); if (id) { setTab("today"); setOpenEv(id); } } catch { /* ignore */ }
    };
    navigator.serviceWorker.addEventListener("message", h);
    return () => navigator.serviceWorker.removeEventListener("message", h);
  }, []);

  // ── Actions
  const toggleSave = (ev) => {
    const n = { ...favs };
    if (n[ev.id]) { delete n[ev.id]; toast("Removed from plans"); }
    else {
      const { bd, why, sc, hidden, tt, rain, dark: _d, busy, outdoor, followed, calChecked, ...raw } = ev; // eslint-disable-line no-unused-vars
      n[ev.id] = raw; track(ev, "savedCats"); toast("Added to plans");
    }
    setFavs(n); ss(SK_F, n);
  };
  const react = (ev, kind, reason) => {
    saveTaste(applyReaction(taste, prof, ev, kind, reason));
    if (kind === "up") toast("Got it, more like this");
    if (kind === "down") toast("Got it, less like this");
    if (kind === "nfm") { toast("Hidden. Undo in Me."); setOpenEv(null); }
  };
  const follow = (ev) => { const t = toggleFollow(taste, ev); saveTaste(t); toast(t.follows[(ev.venue || "").split(",")[0].trim().toLowerCase()] ? "Following " + ev.venue.split(",")[0] : "Unfollowed"); };
  const unfollow = (k) => { const follows = { ...taste.follows }; delete follows[k]; saveTaste({ ...taste, follows }); };
  const undo = (l) => { const ev = events.find((e) => e.id === l.id) || { id: l.id, title: l.title, cat: l.cat }; saveTaste(applyReaction(taste, prof, ev, "undo")); toast("Restored"); };
  const resetTaste = () => { saveTaste({ ...emptyTaste(), follows: taste.follows }); toast("Learning reset (follows kept)"); };

  // Surprise: weighted pick among the strongest options in the next 3 days
  const pickSurprise = (seen = new Set()) => {
    const pool = visible.filter((e) => daysUntil(e, today) <= 2 && !seen.has(e.id) && !e.rain && !e.busy && fitsFree(e, effFree, today) && e.sc >= 40).slice(0, 15);
    if (!pool.length) return { ev: null, seen };
    const w = pool.map((e) => Math.pow(e.sc, 2));
    let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
    while (r > w[i]) { r -= w[i]; i++; }
    const ev = pool[Math.min(i, pool.length - 1)];
    const s2 = new Set(seen); s2.add(ev.id);
    return { ev, seen: s2 };
  };

  const locLabel = locSt === "ok" ? "Near you" : locSt === "cached" ? "Near you" : locSt === "locating" ? "Locating…" : "Lower East Side";
  const plansCount = Object.values(favs).filter((e) => evActive(e, today) && daysUntil(e, today) <= 1).length;

  if (!ready) return <div className="gp-app" style={{ minHeight: "100vh" }} />;

  const actions = {
    onReact: (ev, kind, reason) => react(ev, kind, reason),
    onSave: (ev) => toggleSave(ev),
    isSaved: (id) => !!favs[id],
    thumbOf: (id) => taste.thumbs[id] || 0,
  };

  return (
    <ActionsCtx.Provider value={actions}>
    <div className="gp-app" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {tab === "today" && <Today data={visible} sections={sections} dark={dark} today={today} home={home} locLabel={locLabel} onOpen={openEvent} setTab={setTab}
          freeUntil={effFree} autoFree={autoFree} openFree={() => setShowFree(true)} weather={weather}
          weekPicks={weekPicks} onSurprise={() => setSurprise(pickSurprise())} onRefresh={() => refresh(false)} refreshing={refreshing}
          highlights={hl?.day === isoDay(today) ? { text: hl.text, ids: hl.ids || [], status: hlStatus } : { text: null, status: hlStatus }} />}
        {tab === "explore" && <Explore scored={visible} dark={dark} today={today} onOpen={openEvent} filters={filters} setFilters={setFilters} />}
        {tab === "map" && <MapView scored={visible} home={home} dark={dark} today={today} onOpen={openEvent} filters={filters} setFilters={setFilters} />}
        {tab === "plans" && <Plans favs={favs} scoreOne={scoreOne} dark={dark} today={today} onOpen={openEvent} onRemove={toggleSave} busySlots={busySlots} calStatus={calStatus} />}
        {tab === "me" && <Me prof={prof} eprof={eprof} taste={taste} setCatLevel={setCatLevel} setCatValue={setCatValue} dark={dark} theme={theme} setTheme={setTheme}
          onUnfollow={unfollow} onUndo={undo} resetTaste={resetTaste}
          calStatus={calStatus} busyCount={busySlots.length} onCheckCal={() => checkCal(false)} calName={calName}
          pushState={pushState} pushInfo={pushInfo} onEnablePush={enablePush}
          backend={backend} setBackend={setBackend} lastRefreshed={lastRefreshed} eventCount={events.length} onRefresh={() => refresh(false)} refreshing={refreshing} refreshLog={refreshLog}
          locSt={locSt} onRetryGPS={() => locate(true)} />}
      </div>

      <TabBar tab={tab} setTab={(t) => { setTab(t); window.scrollTo(0, 0); }} plansCount={plansCount} />

      {sheetEv && <EventSheet ev={sheetEv} dark={dark} today={today} onClose={() => setOpenEv(null)} saved={!!favs[sheetEv.id]} onSave={toggleSave}
        taste={taste} onReact={react} onFollow={follow} toast={toast} />}
      {showFree && <FreeUntilDialog freeUntil={effFree} autoFree={autoFree} onClose={() => setShowFree(false)}
        onPick={(m) => { setFreeUntil(m); setShowFree(false); }} />}
      {surprise && !sheetEv && <Surprise ev={surprise.ev} empty={!surprise.ev} dark={dark} today={today} weather={weather}
        onOpen={(ev) => openEvent(ev)} onAnother={() => setSurprise(pickSurprise(surprise.seen))} onClose={() => setSurprise(null)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
    </ActionsCtx.Provider>
  );
}
