import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CSS, FONTS_HREF } from "./theme.js";
import { TabBar, ActionsCtx } from "./components.jsx";
import { EMPTY_FILTERS } from "./Filters.jsx";
import { markSeen } from "./moods2.js";
import { INTENT } from "./intents.js";
import { setKeywordDf } from "./components.jsx";
import { logMood, moodStats, markFavAt } from "./moodlog.js";
import { actOf, addActivities, ACT_IDS } from "./activities.js";
import { ingest, getSpace, tasteOf, neighbours, labelOf } from "./embed.js";
import { hoodCards, genericCards, buildTiles } from "./tiles.js";
import { API_BASE } from "./images.js";
import Today, { clearForyouSeen } from "./Today.jsx";
import DevFlag, { DEV_KEY } from "./DevFlag.jsx";
import { loadDetails, withDetails, outsideNYC, fetchDetails, syncDetailsIndex } from "./details.js";
import { rank, rankContext, readFavMoods } from "./rank.js";
import * as T from "./telemetry.js";
import Explore from "./Explore.jsx";
import MapView from "./MapView.jsx";
import Plans from "./Plans.jsx";
import Me from "./Me.jsx";
import EventSheet from "./EventSheet.jsx";
import { FreeUntilDialog, Surprise, WhyDialog } from "./Extras.jsx";
import { PULSE_ICON } from "./pulseIcons.js";
import { MOOD_KEY, buildContext, scoreMoods, momentSummary } from "./mood.js";
import { YOU_KEY, rankYou, learnYou } from "./you.js";
import { annualItems } from "./nyc.js";
import { mergeDuplicates, collapseSeries } from "./dedupe.js";
import * as L from "./learn.js";
import * as M from "./maps.js";
import * as Q from "./quiz.js";
import Tour, { TOUR_KEY } from "./Tour.jsx";
import Quiz, { loadAccount, ACCOUNT_KEY } from "./Quiz.jsx";
import { buildPicks, poolPicks } from "./picks.js";
import { classify, classifySub, theatreSource, CAT, FAMILIES, migrateNames, migrateMap } from "./taxonomy.js";
const FAM_IDS = FAMILIES.map((f) => f.id);
import { REC_KEY, updateRecurring, withRegulars, nextDate, patternLabel } from "./recurring.js";
import {
  LES, TASTE_KEY, emptyTaste, applyReaction, calPayload, toggleFollow, effectiveProf, scoreEvent, buildToday,
  fetchWeather, fitsFree, isOver, missed, hasEnded, fmtT, UNIT_KEY, getUnit, nowMinutes, isoDay, safeCoord, floorDay, evActive, seriesKey, tasteSummary, whenLabel,
} from "./engine.js";
import {
  DP, SK_P, SK_F, SK_B, DEFAULT_SUBS, sg, ss, daysUntil, CATS, DAYS,
  evStart, nextOn,
} from "../lib/core.js";
import * as N from "./notify.js";
import { startMinutes } from "./engine.js";
import { NotifyCtx, Dialog } from "./components.jsx";

// Backend defaults: set VITE_GP_URL / VITE_GP_KEY in Vercel. Values saved in Me override them.
// Fallback = the values already in the classic app. Rotate the key, set the env vars, then delete these.
const LEGACY_URL = "https://script.google.com/macros/s/AKfycbzyUXSvObga5nVWHavisMQu3jxwNCWWsiZwsVaq_IzRp5qgSfz_8J1kL_5zP2iKly2-/exec";
const LEGACY_KEY = "f{ZU6kRspFUn0MW744OEMY8s";
const ENV_URL = import.meta.env.VITE_GP_URL || LEGACY_URL;
const ENV_KEY = import.meta.env.VITE_GP_KEY || LEGACY_KEY;
const THEME_KEY = "gp_theme_v7";
const STALE_MS = 6 * 3600 * 1000;
const FILTERS_KEY = "gp_filters_v1";
const TAGS_KEY = "gp_tags_v14"; // v14: 500 activities (18 Nov 2026); v13 tags show until each event is re-tagged
const TAGS_OLD = "gp_tags_v13";
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
  const tabRef = useRef("today"); tabRef.current = tab;
  const [devMode, setDevMode] = useState(() => { try { return localStorage.getItem(DEV_KEY) === "1"; } catch { return false; } });
  const toggleDev = () => setDevMode((d) => { try { localStorage.setItem(DEV_KEY, d ? "0" : "1"); } catch { /* private */ } return !d; });
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
  // Notifications: settings and bells on this phone (the server sends; see notify.js)
  const [notif, setNotifRaw] = useState(N.loadNotif);
  const notifRef = useRef(notif); notifRef.current = notif;
  const putNotif = useCallback((n) => { notifRef.current = n; setNotifRaw(n); N.saveNotif(n); }, []);
  const [perm, setPerm] = useState(() => N.permission());
  const [askNotif, setAskNotif] = useState(false);
  const [freeUntil, setFreeUntil] = useState(null);
  const [showFree, setShowFree] = useState(false);
  const [openEv, setOpenEvRaw] = useState(null);
  // The trail: events opened one after another from the event page (back goes one step at a time)
  const [trail, setTrail] = useState([]);
  const openEvRef = useRef(null), trailRef = useRef([]);
  trailRef.current = trail;
  const setOpenEv = useCallback((id) => {
    if (id == null) { const t = trailRef.current; if (t.length > 1) T.track("trail", { id: t[t.length - 1] }, { n: t.length }); setTrail([]); }
    openEvRef.current = id; setOpenEvRaw(id);
  }, []);
  const [surprise, setSurprise] = useState(null); // {ev, seen:Set} | null
  const [toastMsg, setToastMsg] = useState("");
  const [tick, setTick] = useState(0); // re-evaluate "now" every few minutes
  // Filters persist across visits (When resets to Today each new day); changes also teach taste, see setFilters below
  const [filters, setFiltersState] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
      if (!v) return EMPTY_FILTERS;
      const f = { ...EMPTY_FILTERS, ...v.f, q: "" };
      ["cats", "xcats", "subs", "xsubs"].forEach((k) => { f[k] = migrateNames(f[k]); });
      if (f.fam && !FAM_IDS.includes(f.fam)) f.fam = null;
      if (v.day !== isoDay(new Date())) f.when = EMPTY_FILTERS.when;
      return f;
    } catch { return EMPTY_FILTERS; }
  });
  const [sort, setSort] = useState("best");
  const [rec, setRec] = useState({});
  const [whyAsk, setWhyAsk] = useState(null); // {ev, dir}
  const [moodStore, setMoodStore] = useState(() => { try { return JSON.parse(localStorage.getItem(MOOD_KEY) || "{}"); } catch { return {}; } });
  const [moodTxt, setMoodTxt] = useState(() => { try { return JSON.parse(localStorage.getItem("gp_moodtxt_v1") || "{}"); } catch { return {}; } });
  const [unit, setUnitState] = useState(getUnit());
  const setUnit = (u) => { try { localStorage.setItem(UNIT_KEY, u); } catch { /* private mode */ } setUnitState(u); };
  const [cityPick, setCityPick] = useState(null); // ids chosen via the "Or:" chips
  const [youPick, setYouPick] = useState(null);
  const [youStore, setYouStore] = useState(() => { try { return JSON.parse(localStorage.getItem(YOU_KEY) || "{}"); } catch { return {}; } });
  const [lastSaveAt, setLastSaveAt] = useState(() => { const v = +localStorage.getItem("gp_lastsave"); return v || null; });
  // Taste engine v2 (learn.js). The model lives in a ref; modelVer re-scores only after strong signals,
  // so lists don't reshuffle while you scroll
  const modelRef = useRef((() => { try { return { ...L.emptyModel(), ...JSON.parse(localStorage.getItem(L.MODEL_KEY) || "{}") }; } catch { return L.emptyModel(); } })());
  const [modelVer, setModelVer] = useState(0);
  const saveModelT = useRef(null);
  const putModel = (m, rescore) => {
    modelRef.current = m;
    clearTimeout(saveModelT.current);
    saveModelT.current = setTimeout(() => { try { localStorage.setItem(L.MODEL_KEY, JSON.stringify(modelRef.current)); } catch { /* full */ } }, 400);
    if (rescore) setModelVer((v) => v + 1);
  };
  const moodSession = useRef(null); // the mood you opened last, so saves from its list can be credited to it
  const signal = useCallback((ev, kind) => {
    if (!ev) return;
    T.track(kind, ev, { s: tabRef.current });
    putModel(L.learn(modelRef.current, ev, kind, floorDay(new Date())), L.SIGNALS[kind]?.s >= 0.7);
    const ms = moodSession.current;
    if ((kind === "save" || kind === "went") && ms && Date.now() - ms.at < 45 * 60000 && ms.ids.has(ev.id)) logMood("saved", ms.key, ms.adj, ms.title);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [pastSaves, setPastSaves] = useState(() => { try { return JSON.parse(localStorage.getItem("gp_past_saves") || "[]"); } catch { return []; } });
  const [mapsData, setMapsData] = useState(() => M.loadMaps());
  const [quiz, setQuiz] = useState(() => Q.loadQuiz());
  const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d); } catch { return JSON.parse(d); } };
  const [moodFav, setMoodFav] = useState(() => ls("gp_moodfav_v1", "[]"));
  const [moodClicks, setMoodClicks] = useState(() => ls("gp_moodclicks_v1", "{}"));
  const [moodHide, setMoodHide] = useState(() => ls("gp_moodhide_v1", "[]"));
  const [moodFb, setMoodFb] = useState(() => ls("gp_moodfb_v1", "{}"));
  const [meet, setMeetState] = useState(() => { try { return localStorage.getItem("gp_meet_v1") === "1"; } catch { return false; } });
  const [showQuiz, setShowQuiz] = useState(false); // false | "auth" | "moods"
  const [account, setAccount] = useState(loadAccount);
  const signOut = () => { try { localStorage.removeItem(ACCOUNT_KEY); window.google?.accounts?.id?.disableAutoSelect?.(); } catch { /* private */ } setAccount(null); setShowQuiz("auth"); };
  const [showTour, setShowTour] = useState(false);
  const mapsIdx = useMemo(() => M.buildIndex(mapsData), [mapsData]);
  const [tags, setTags] = useState(() => {
    try {
      const cur = JSON.parse(localStorage.getItem(TAGS_KEY) || "null");
      if (cur) return cur;
      const old = JSON.parse(localStorage.getItem(TAGS_OLD) || "{}");
      return Object.fromEntries(Object.entries(old).map(([k, v]) => [k, { ...v, old: 1 }]));
    } catch { return {}; }
  });
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

  // Turn notifications on (from a tap): permission, subscription, then a test notification to this phone
  const turnOnNotif = useCallback(async () => {
    const r = await N.enable().catch(() => "denied");
    setPerm(N.permission());
    if (r !== "on") {
      putNotif({ ...notifRef.current, asked: true });
      toast(r === "unsupported" ? "This phone can't get notifications here. On iPhone, add Good Plans to the Home Screen first." : "Notifications are blocked. Allow them for Good Plans in your phone settings.");
      return false;
    }
    const n = { ...notifRef.current, on: true, asked: true }; putNotif(n);
    toast("Notifications on");
    return n;
  }, [putNotif, toast]);


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
      const [pr, fv, bh, evStore, gm, tst, th, loc, slots, calPref, rs] = await Promise.all(
        [SK_P, SK_F, SK_B, "gp_events_v1", "gp_gmail_v1", TASTE_KEY, THEME_KEY, "gp_loc_v1", "gp_cal_slots_v1", "gp_cal_v1", REC_KEY].map(sg));
      if (rs) setRec(rs);
      setProf(mergeProf(pr));
      if (fv) {
        const t0 = floorDay(new Date()); const clean = Object.fromEntries(Object.entries(fv).filter(([, e]) => evActive(e, t0))); setFavs(clean);
        if (Object.keys(clean).length !== Object.keys(fv).length) {
          ss(SK_F, clean);
          // Keep the ones that just ended, so the app can ask "Did you go?"
          const gone = Object.values(fv).filter((e) => !clean[e.id]);
          setPastSaves((p) => { const n = [...gone, ...p.filter((x) => !gone.some((g) => g.id === x.id))].slice(0, 30); try { localStorage.setItem("gp_past_saves", JSON.stringify(n)); } catch { /* full */ } return n; });
        }
      }
      if (bh) setBeh(bh);
      if (tst) setTaste({ ...emptyTaste(), ...tst, ncatAdj: migrateMap(tst.ncatAdj), nsubAdj: migrateMap(tst.nsubAdj),
        stars: tst.stars ? { cats: migrateMap(tst.stars.cats), subs: migrateMap(tst.stars.subs) } : tst.stars });
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
    if (backend.url) { checkCal(true); }
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
  // Every filter change is remembered; category hides/picks and price/distance choices also feed the taste model
  const searchT = useRef(null);
  const setFilters = (next) => {
    const prev = filters;
    if ((next.q || "") !== (prev.q || "")) {
      clearTimeout(searchT.current);
      const q = next.q || "";
      if (q.trim().length >= 3) searchT.current = setTimeout(() => putModel(L.searched(modelRef.current, q)), 1500);
    }
    setFiltersState(next);
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify({ f: { ...next, q: "", ids: [], list: null }, day: isoDay(new Date()) })); } catch { /* full */ }
    const t = { ...tasteRef.current, ncatAdj: { ...(tasteRef.current.ncatAdj || {}) } };
    const bump = (c, d, lo, hi) => { t.ncatAdj[c] = Math.max(lo, Math.min(hi, (t.ncatAdj[c] || 0) + d)); };
    let changed = false;
    const px = prev.xcats || [], nx = next.xcats || [];
    nx.filter((c) => !px.includes(c)).forEach((c) => { bump(c, -8, -24, 12); changed = true; });
    px.filter((c) => !nx.includes(c)).forEach((c) => { bump(c, 8, -24, 12); changed = true; });
    (next.cats || []).filter((c) => !(prev.cats || []).includes(c)).forEach((c) => { bump(c, 2, -24, 12); changed = true; });
    t.nsubAdj = { ...(t.nsubAdj || {}) };
    const sb = (c, d) => { t.nsubAdj[c] = Math.max(-24, Math.min(12, (t.nsubAdj[c] || 0) + d)); changed = true; };
    const pxs = prev.xsubs || [], nxs = next.xsubs || [];
    nxs.filter((c) => !pxs.includes(c)).forEach((c) => sb(c, -8));
    pxs.filter((c) => !nxs.includes(c)).forEach((c) => sb(c, 8));
    (next.subs || []).filter((c) => !(prev.subs || []).includes(c)).forEach((c) => sb(c, 2));
    if (next.price !== prev.price && (next.price === "free" || next.price === "u20")) { t.priceSens = Math.max(t.priceSens || 0, 1); changed = true; }
    if (next.dist !== prev.dist && (next.dist === "10" || next.dist === "20")) { t.farSens = Math.max(t.farSens || 0, 1); changed = true; }
    if (changed) { tasteRef.current = t; saveTaste(t); }
  };
  const saveProf = (p) => { setProf(p); ss(SK_P, p); };
  const setCatValue = (c, v) => saveProf({ ...prof, categories: { ...prof.categories, [c]: v } });
  const setCatLevel = (c, v) => {
    // Picking a level resets what was learned for that category, so the choice sticks
    setCatValue(c, v);
    const catAdj = { ...taste.catAdj }; delete catAdj[c];
    saveTaste({ ...taste, catAdj });
  };
  const track = (ev, kind, d = 1) => {
    const b = { ...beh, [kind]: { ...(beh[kind] || {}) } };
    b[kind][ev.cat] = Math.max(0, (b[kind][ev.cat] || 0) + d);
    setBeh(b); ss(SK_B, b);
  };

  // ── Weekly regulars: learn from each feed, keep across refreshes
  useEffect(() => {
    if (!ready || !events.length) return;
    const n = updateRecurring(events, rec, today);
    if (JSON.stringify(n) !== JSON.stringify(rec)) { setRec(n); ss(REC_KEY, n); }
  }, [ready, events, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const merged = useMemo(() => mergeDuplicates(events), [events]);
  // Regulars added from memory can repeat a listing from the feed: merge again after adding them
  // Looked-up details (exact place, start time, price, ticket link); events outside the city are dropped
  const [detailsVer, setDetailsVer] = useState(0);
  const allEvents = useMemo(() => { const det = loadDetails(); return mergeDuplicates(withRegulars(merged, rec, today)).map((e) => withDetails(e, det)).filter((e) => !e.outside && !outsideNYC(e)); }, [merged, rec, today, detailsVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const getDetails = useCallback((list) => { fetchDetails(list, () => setDetailsVer((v) => v + 1)); }, []);
  useEffect(() => { syncDetailsIndex().then((ch) => { if (ch) setDetailsVer((v) => v + 1); }); }, []); // daily server lookups
  // Activities the weekly discovery job added: load them, then re-tag (the version below changes)
  useEffect(() => { fetch(API_BASE + "/api/activity-discover?list=1").then((r) => (r.ok ? r.json() : null)).then((x) => { if (x?.list && addActivities(x.list)) setDetailsVer((v) => v + 1); }).catch(() => {}); }, []);

  // ── Scoring
  const eprof = useMemo(() => effectiveProf(prof, taste), [prof, taste]);
  // Ranking inputs: the taste space, your point in it, and the moods you favourited (kept live across screens)
  const [embVer, setEmbVer] = useState(0);
  const space = useMemo(() => getSpace(), [embVer]);
  const tasteMe = useMemo(() => tasteOf(space, modelRef.current), [space, modelVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const [favMoods, setFavMoods] = useState(readFavMoods);
  useEffect(() => { const on = () => setFavMoods(readFavMoods()); window.addEventListener("gp-moodfav", on); window.addEventListener("storage", on); return () => { window.removeEventListener("gp-moodfav", on); window.removeEventListener("storage", on); }; }, []);
  // Per person = per signed-in account (a short hash of the Google id); without an account, per phone
  const userKey = account?.sub ? "g" + account.sub.slice(-10) : "";
  useEffect(() => { T.setUser(userKey); }, [userKey]);
  const [rankW, setRankW] = useState({});
  useEffect(() => { T.loadWeights().then((w) => setRankW(w && typeof w === "object" ? w : {})); }, [userKey]);
  const rankCtx = useMemo(() => rankContext({ model: modelRef.current, space, tasteVec: tasteMe, moodFav, favMoods, stars: taste.stars || {}, today, weights: rankW }), [space, tasteMe, moodFav, favMoods, taste, today, modelVer, rankW]); // eslint-disable-line react-hooks/exhaustive-deps
  const scored = useMemo(() => {
    const ctx = { eprof, beh, today, home, taste, weather, busySlots };
    return allEvents.map((e0) => {
      const t = tags[e0.id];
      const e = t ? { ...e0, kw: t.k, cat: t.cat && CATS[t.cat] !== undefined ? t.cat : e0.cat, srcCat: e0.cat } : { ...e0 };
      e.ncat = classify(e, t?.cat2); e.fam = CAT[e.ncat].fam; e.nsub = classifySub(e, e.ncat, t?.sub2);
      if (t?.d) e.dims = t.d;
      e.act = e.ncat === "Theater" && theatreSource(e) ? actOf({ ...e, act: t?.a }, "Theater") : actOf({ ...e, act: t?.a });
      if (t?.h) e.hook = t.h;
      const s = scoreEvent({ ...e, coord: safeCoord(e) }, ctx);
      // At a place saved in Google Maps: a "want to go" list counts most
      const place = M.matchSaved(mapsIdx, s);
      let boost = 0;
      if (place) {
        const want = place.lists.find(M.isWantList);
        boost = want ? 6 : 3; s.savedPlace = place;
        s.why = [want ? "On your “" + want + "” list" : "A place you saved · " + place.lists[0], ...s.why];
      }
      s.calChecked = calStatus === "ok";
      // One score for "how much would I want this, now" (rank.js); every screen orders by it
      return rank(s, rankCtx, { boost });
    }).sort((a, b) => b.rk - a.rk);
  }, [allEvents, tags, eprof, beh, today, home, taste, weather, busySlots, calStatus, modelVer, mapsIdx, rankCtx]); // eslint-disable-line react-hooks/exhaustive-deps
  const scoredRef = useRef([]); scoredRef.current = scored;
  const scoreOne = useCallback((e0) => {
    const e = { ...e0, ncat: e0.ncat && CAT[e0.ncat] ? e0.ncat : classify(e0) }; e.fam = CAT[e.ncat].fam; e.nsub = e0.nsub || classifySub(e, e.ncat);
    const s = scoreEvent({ ...e, coord: safeCoord(e) }, { eprof, beh, today, home, taste, weather, busySlots });
    s.calChecked = calStatus === "ok"; return rank(s, rankCtx);
  }, [eprof, beh, today, home, taste, weather, busySlots, calStatus, rankCtx]);

  // Gone: thumbed down, over, or today and you couldn't get there in time any more. A saved plan stays until it has ended.
  // clashes with the calendar are hidden (saved ones stay: they are in the calendar themselves)
  const gone = (e) => e.hidden || (e.busy && !favs[e.id]) || !evActive(e, today) || (favs[e.id] ? hasEnded(e, today) : missed(e, today));
  // Regulars view: one card per remembered series, its next date when known
  const regulars = useMemo(() => Object.values(rec).map((r) => {
    const live = scored.filter((e) => e.recKey === r.key && !gone(e)).sort((x, y) => (x.E < y.E ? -1 : 1))[0];
    if (live) return { ev: live, r };
    const E = nextDate(r, today);
    const ev = scoreOne({ ...r.ev, id: "rec-" + r.key.replace(/[^a-z0-9]+/gi, "-") + "-" + (E || "x"), E: E || r.dates?.[r.dates.length - 1] || isoDay(today), recurring: "synthetic", recKey: r.key, recLabel: patternLabel(r) });
    return { ev, r, when: E ? null : "Dates vary · last " + (r.dates?.length ? new Date(r.dates[r.dates.length - 1] + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "?") };
  }).filter((x) => !x.ev.hidden), [rec, scored, today, scoreOne]);

  // Auto free-until from the next calendar busy slot today
  const autoFree = useMemo(() => {
    if (calStatus !== "ok") return null;
    const d = isoDay(today), now = nowMinutes();
    const next = busySlots.filter((s) => s.date === d && s.startH * 60 > now + 45).sort((a, b) => a.startH - b.startH)[0];
    return next ? Math.round(next.startH * 60) : null;
  }, [busySlots, calStatus, today, tick]);
  const effFree = freeUntil != null && freeUntil > nowMinutes() ? freeUntil : null;

  const visible = useMemo(() => scored.filter((e) => !gone(e)), [scored, today, tick, favs]); // eslint-disable-line react-hooks/exhaustive-deps
  // Look up missing details for the top picks and saved plans in the background (a few per day)
  useEffect(() => { if (!visible.length) return undefined; const t = setTimeout(() => getDetails([...visible.filter((e) => favs[e.id]), ...visible.slice(0, 10)]), 4000); return () => clearTimeout(t); }, [visible.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // Yearly NYC events as standing regulars (nyc.js), scored like any event
  const annual = useMemo(() => annualItems(today, visible).map((e) => scoreOne(e)).filter((e) => !e.hidden), [today, visible, scoreOne]);
  // The week's top picks: shown on Today and used as the only source for the "don't miss" paragraph, so the text never mentions something that is not on screen
  const weekPool = useMemo(() => {
    const seen = new Set();
    return visible.filter((e) => daysUntil(e, today) <= 6).filter((e) => { const k = seriesKey(e); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
  }, [visible, today]);
  const sections = useMemo(() => buildToday(visible, { today, freeUntil: effFree, eprof }), [visible, today, effFree, eprof]);
  const weekPicks = useMemo(() => {
    const shown = new Set([...sections.nowSoon, ...sections.tonight, ...sections.weekend].map((e) => e.id));
    return weekPool.filter((e) => !shown.has(e.id)).slice(0, 5);
  }, [weekPool, sections]);

  // ── Two moods: yours (you.js: how you probably feel right now) and the city's (mood.js: holidays, rituals, seasons)
  const saveMood = (st) => { setMoodStore(st); try { localStorage.setItem(MOOD_KEY, JSON.stringify(st)); } catch { /* full */ } };
  const saveYou = (st) => { setYouStore(st); try { localStorage.setItem(YOU_KEY, JSON.stringify(st)); } catch { /* full */ } };
  const moodCtx = useMemo(() => buildContext({ events: visible, weather, now: new Date(), busySlots, calOk: calStatus === "ok", home, homeBase: LES, lastSaveAt, tasteLog: taste.log || [] }),
    [visible, weather, busySlots, calStatus, home[0], home[1], lastSaveAt, taste.log, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const cityR = useMemo(() => scoreMoods(moodCtx, visible, moodStore), [moodCtx, visible, unit]); // eslint-disable-line react-hooks/exhaustive-deps
  const youR = useMemo(() => rankYou(moodCtx, visible, youStore, new Date()), [moodCtx, visible, unit]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickOf = (r, id) => (id && r.all.find((x) => x.id === id)) || r.first;
  const cityA = pickOf(cityR, cityPick), cityB = cityA && cityR.first && cityA.id !== cityR.first.id ? cityR.first : cityR.second;
  const cityC = cityR.all.find((x) => x.id !== cityA?.id && x.id !== cityB?.id && x.list.length >= 2) || null;
  const youA = pickOf(youR, youPick), youB = youA && youR.first && youA.id !== youR.first.id ? youR.first : youR.second;
  const mKey = (scope, m) => m && scope + ":" + unit + ":" + m.id + "|" + moodCtx.iso + "|" + moodCtx.part + "|v3|" + m.list.slice(0, 4).map((e) => e.id).join(",");
  useEffect(() => {
    if (!cityR.first) return;
    const t = (moodStore.shown || {})[cityR.first.id];
    if (!t || Date.now() - t > 3 * 3600000) saveMood({ ...moodStore, shown: { ...(moodStore.shown || {}), [cityR.first.id]: Date.now() } });
  }, [cityR.first?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const HOL = /^nyc-|season-opens|holiday-lights|thanksgiving|long-weekend|foliage|last-leaves/, WX = /cold-snap|first-warm|warm-surprise|warming|snow|dark-evenings|light-evenings/;
  const cityHol = cityR.all.filter((x) => HOL.test(x.id) && x.list.length >= 2).slice(0, 3);
  const cityWx = cityR.all.filter((x) => WX.test(x.id) && x.list.length >= 2).slice(0, 3);
  // Claude writes each title + subtitle (cached per mood, day part and events); title banks fill in meanwhile
  useEffect(() => {
    if (!ready || aiOff.current) return;
    const jobs = [["you", youA], ["you", youB], ...cityHol.map((m) => ["city", m]), ...cityWx.map((m) => ["city", m])].filter(([, m]) => m);
    jobs.forEach(([scope, m]) => {
      const k = mKey(scope, m);
      if (moodTxt[k]) return;
      postJSON("/api/enrich", {
        mode: "mood", scope, moment: momentSummary(moodCtx),
        mood: scope === "you" ? { id: m.id, label: m.label, offer: m.offer, read: youR.readLine, titles: m.titles } : { id: m.id, theme: m.theme, facts: m.facts, titles: m.titles },
        events: m.list.slice(0, 4).map((e) => ({ title: e.title, venue: (e.venue || "").split(",")[0], when: whenLabel(e, today), cat: e.cat })),
      }).then((d) => {
        setMoodTxt((prev) => {
          const keep = Object.fromEntries(Object.entries(prev).filter(([, v]) => Date.now() - v.at < 2 * 86400000));
          const n = { ...keep, [k]: { title: d.title, sub: d.sub, at: Date.now() } };
          try { localStorage.setItem("gp_moodtxt_v1", JSON.stringify(n)); } catch { /* full */ }
          return n;
        });
      }).catch((e) => { if (e.status === 503 || e.status === 403 || e.status === 404) aiOff.current = true; });
    });
  }, [ready, mKey("you", youA), mKey("you", youB), cityHol.map((m) => mKey("city", m)).join(), cityWx.map((m) => mKey("city", m)).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = (scope, m, fallbackSub) => m && { id: m.id, icon: PULSE_ICON[m.id] || null, title: moodTxt[mKey(scope, m)]?.title || m.fallback, sub: moodTxt[mKey(scope, m)]?.sub || fallbackSub, list: m.list, facts: m.facts, writing: !moodTxt[mKey(scope, m)] };
  const moodProps = {
    you: view("you", youA, youR.readLine ? "Reading the room: " + youR.readLine : youA?.offer), youOther: view("you", youB, youB?.offer),
    city: view("city", cityA, cityA?.facts), cityOther: view("city", cityB, cityB?.facts),
    cities: [view("city", cityA, cityA?.facts), view("city", cityB, cityB?.facts), view("city", cityC, cityC?.facts)].filter((c) => c && c.list?.length),
    onYouSwitch: () => { if (!youB) return; let st = learnYou(youStore, youR.slot, youB.id, 1); if (youA) st = learnYou(st, youR.slot, youA.id, -0.5); saveYou(st); setYouPick(youB.id); },
    onYouFeedback: (good) => {
      if (!youA) return;
      saveYou(learnYou(youStore, youR.slot, youA.id, good ? 1 : -1));
      if (good) toast("Noted. More of this at this time.");
      else if (youB) { setYouPick(youB.id); toast("Got it. How about this?"); } else toast("Got it");
    },
    onCitySwitch: () => {
      if (!cityB) return;
      const aff = { ...(moodStore.aff || {}) };
      aff[cityB.id] = (aff[cityB.id] || 0) + 1;
      if (cityA) aff[cityA.id] = (aff[cityA.id] || 0) - 0.5;
      saveMood({ ...moodStore, aff });
      setCityPick(cityB.id);
    },
    onYouOpen: (ev) => { if (youA) saveYou(learnYou(youStore, youR.slot, youA.id, 0.3)); openEvent(ev); },
    onCityOpen: (ev) => { if (cityA) saveMood({ ...moodStore, aff: { ...(moodStore.aff || {}), [cityA.id]: ((moodStore.aff || {})[cityA.id] || 0) + 0.5 } }); openEvent(ev); },
  };
  // New York right now: three rows of one-card carousels (season and festivities, neighbourhoods, weather)
  const hoodItems = useMemo(() => hoodCards(visible, today, { xcats: filters.xcats || [], xsubs: filters.xsubs || [] }, (e) => { const f = L.features(e, today).find((x) => x.startsWith("hood:")); return f ? L.weightOf(modelRef.current, f) : 0; }, Math.floor(today.getTime() / 86400000), home), [visible, today, filters.xcats, filters.xsubs, modelVer, home]); // eslint-disable-line react-hooks/exhaustive-deps
  const view2 = (arr) => arr.map((m) => view("city", m, m.facts));
  // Each row holds three cards: its own kind first, then leftovers (other city themes, more neighbourhoods, generic ones)
  const genCards = useMemo(() => genericCards(visible, today), [visible, today]);
  const nyRows = (() => {
    const used = new Set();
    const take = (arr, n) => arr.filter((c) => c && c.list?.length && !used.has(c.id)).slice(0, n).map((c) => (used.add(c.id), c));
    const rest = () => [...cityR.all.filter((x) => x.list.length >= 2).map((m) => view("city", m, m.facts)), ...genCards];
    const hol = view2(cityHol), hood = hoodItems;
    // Two rows: season and neighbourhoods (the weather row was dropped)
    const rows = [hol, hood].map((own, slot) => { const got = take(own, slot ? 6 : 3); return { key: "ny" + slot, slot, items: got }; });
    rows.forEach((r, i) => { const want = i ? 2 : 2; if (r.items.length < want) r.items.push(...take(i === 1 ? [...hoodItems, ...rest()] : rest(), want - r.items.length)); });
    return rows.filter((r) => r.items.length);
  })();

  // ── Claude keywords: tag the best-scored events that have none yet, 40 per call
  const tagBusy = useRef(false);
  useEffect(() => {
    if (!ready || aiOff.current || tagBusy.current) return;
    // Events tagged before activities existed (no "a" field) are tagged again once
    // Re-tag: never tagged, tagged with the old list (v13), or no activity fitted and the list has grown since
    const stale = (t) => !t || !("a" in t) || t.old || (t.a == null && (t.n || 0) < ACT_IDS.length);
    const todo = visible.filter((e) => stale(tags[e.id])).slice(0, 160);
    if (!todo.length) return;
    tagBusy.current = true;
    (async () => {
      let acc = { ...tags };
      for (let i = 0; i < todo.length; i += 40) {
        try {
          const d = await postJSON("/api/enrich", { mode: "tags", events: todo.slice(i, i + 40).map(({ id, title, desc, cat, sub, venue, price, time, src }) => ({ id, title, desc, cat: cat, sub, venue, price, time, src })) });
          acc = { ...acc, ...Object.fromEntries(Object.entries(d.tags || {}).map(([k, v]) => [k, { ...v, n: ACT_IDS.length }])) };
          // Events Claude skipped still get an entry, so they aren't sent again and again
          todo.slice(i, i + 40).forEach((e) => { const t = acc[e.id]; if (!t) acc[e.id] = { k: [], cat: null, a: null, n: ACT_IDS.length }; else if (!("a" in t) || t.old) acc[e.id] = { ...t, a: t.old ? t.a ?? null : null, old: undefined, n: ACT_IDS.length }; });
          setTags(acc);
          try { localStorage.setItem(TAGS_KEY, JSON.stringify(Object.fromEntries(Object.entries(acc).slice(-1500)))); localStorage.removeItem(TAGS_OLD); } catch { /* full */ }
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
    const wx = weather?.byDate ? Object.entries(weather.byDate).filter(([d]) => d >= isoDay(today)).slice(0, 7).map(([d, v]) => `${DAYS[new Date(d + "T12:00:00").getDay()]} ${fmtT(v.hi)}, ${v.pmax}% rain`).join("; ") : "unknown";
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

  // ── Notifications: what the server needs about saved plans (next dates, start time, travel minutes)
  const savedForPush = useMemo(() => {
    const t0 = isoDay(today);
    return Object.values(favs).map((f) => {
      const e = scored.find((x) => x.id === f.id) || f;
      const days = []; let d = floorDay(today);
      for (let k = 0; k < 8; k++) { const n = nextOn(e, d); if (!n) break; days.push(isoDay(n)); d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); }
      return { id: e.id, title: e.title, venue: e.venue, E: e.E, X: e.X || null, time: e.time || "", sm: startMinutes(e), days, tt: e.tt?.mins ?? null, dows: !!(e.dows || e.dates) };
    }).filter((x) => (x.X || x.E) >= t0);
  }, [favs, scored, today]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && notif.on) N.sync(notif, savedForPush); }, [ready, notif, savedForPush]);
  // A bell: on an interest tile, a venue or a series. Ringing one turns notifications on first if needed.
  const toggleBell = useCallback(async (bell, tile) => {
    let n = notifRef.current;
    if (n.bells[bell.key]) { const b = { ...n.bells }; delete b[bell.key]; putNotif({ ...n, bells: b }); toast("Bell off: " + bell.label); return; }
    if (!n.on || N.permission() !== "granted") { const r = await turnOnNotif(); if (!r) return; n = r; }
    putNotif({ ...n, bells: { ...n.bells, [bell.key]: bell } });
    if (tile && !moodFav.includes(tile.key)) favMood(tile);
    toast("We'll tell you about new " + bell.label + (bell.venue ? " events" : bell.series ? " dates" : ""));
  }, [putNotif, turnOnNotif, toast, moodFav]); // eslint-disable-line react-hooks/exhaustive-deps
  const notifyCtx = useMemo(() => ({ bells: notif.bells || {}, toggle: (t) => toggleBell(N.bellOf(t), t) }), [notif.bells, toggleBell]);
  // A list sent by a notification ("New for you"): open it in Explore
  const openIds = (ids, title) => { pushView(); setFilters({ ...filters, fam: null, mi: null, with: null, cats: [], subs: [], ids, list: title, price: "any", when: "now", noClash: false, q: "" }); setTab("explore"); window.scrollTo(0, 0); };
  const openIdsRef = useRef(openIds); openIdsRef.current = openIds;
  const navFromUrl = (href) => {
    const u = new URL(href, location.origin);
    const id = u.searchParams.get("event"), ids = u.searchParams.get("ids");
    if (id) { setTab("today"); setOpenEv(id); return true; }
    if (ids) { setOpenEv(null); openIdsRef.current(ids.split(",").filter(Boolean), u.searchParams.get("list") || "From a notification"); return true; }
    return false;
  };

  // ── Event sheet and deep links
  const openEvent = useCallback((ev, rail) => {
    if (ev?.id) clearForyouSeen(ev.id);
    if (ev?.id) getDetails([ev]);
    T.track("open", ev, rail ? { s: "sheet", r: rail } : { s: tabRef.current });
    const prev = openEvRef.current;
    setTrail((t) => (rail && prev ? [...(t.length ? t : [prev]).filter((x) => x !== ev.id), ev.id] : [ev.id]));
    setOpenEv(ev.id); track(ev, "viewedCats");
    putModel(L.learn(L.markOpened(modelRef.current, ev.id), ev, "open", floorDay(new Date())));
  }, [beh]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reading time on the event page: a quick bounce or a real read
  const openAt = useRef(null);
  useEffect(() => {
    if (!openEv) return;
    const id = openEv, t0 = Date.now();
    openAt.current = t0;
    return () => {
      const secs = (Date.now() - t0) / 1000;
      const ev = scoredRef.current.find((e) => e.id === id);
      if (!ev || document.hidden) return;
      // A real read is relative to how much there is to read (about 4 words a second), with a 5 s floor
      const words = ((ev.desc || "") + " " + (ev.title || "")).split(/\s+/).filter(Boolean).length;
      const enough = Math.max(5, Math.min(12, words / 4 * 0.6));
      if (secs >= enough) signal(ev, "dwell"); else if (secs < 2) signal(ev, "bounce");
    };
  }, [openEv]); // eslint-disable-line react-hooks/exhaustive-deps
  // One step back along the trail
  const trailBack = () => setTrail((t) => { if (t.length < 2) return t; const n = t.slice(0, -1); openEvRef.current = n[n.length - 1]; setOpenEvRaw(n[n.length - 1]); return n; });
  const sheetEv = openEv ? (scored.find((e) => e.id === openEv) || regulars.find((x) => x.ev.id === openEv)?.ev || annual.find((e) => e.id === openEv) || (favs[openEv] && scoreOne(favs[openEv]))) : null;

  useEffect(() => {
    if (!ready) return;
    const u = new URL(window.location.href);
    const id = u.searchParams.get("event"), ids = u.searchParams.get("ids");
    if (id && (events.some((e) => e.id === id) || favs[id])) { setOpenEv(id); u.searchParams.delete("event"); window.history.replaceState({}, "", u.pathname + u.search); }
    else if (ids && events.length) { navFromUrl(u.href); ["ids", "list"].forEach((k) => u.searchParams.delete(k)); window.history.replaceState({}, "", u.pathname + u.search); }
  }, [ready, events, favs]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const h = (e) => {
      if (e.data?.type !== "PUSH_NAV" || !e.data.url) return;
      try { navFromUrl(e.data.url); } catch { /* ignore */ }
    };
    navigator.serviceWorker.addEventListener("message", h);
    return () => navigator.serviceWorker.removeEventListener("message", h);
  }, []);

  // ── Actions
  // Saves mirror into Google Calendar through the Apps Script (actions calAdd / calRemove)
  const CALMAP_KEY = "gp_calmap_v1";
  const calMap = () => { try { return JSON.parse(localStorage.getItem(CALMAP_KEY) || "{}"); } catch { return {}; } };
  const setCalMap = (m) => { try { localStorage.setItem(CALMAP_KEY, JSON.stringify(m)); } catch { /* full */ } };
  const calOff = () => { try { return Date.now() - Number(localStorage.getItem("gp_caladd_off") || 0) < 6 * 3600e3; } catch { return false; } };
  const calAdd = (ev) => {
    if (!backend.url || calOff()) return;
    const q = Object.entries(calPayload(ev, today)).map(([k, v]) => "&" + k + "=" + encodeURIComponent(v ?? "")).join("");
    api("calAdd", q, 20000).then((d) => {
      if (d?.gid) { setCalMap({ ...calMap(), [ev.id]: d.gid }); toast("Added to plans and your calendar"); return; }
      // The Apps Script doesn't know calAdd yet: pause tries for a few hours
      try { localStorage.setItem("gp_caladd_off", String(Date.now())); } catch { /* full */ }
      toast("Saved. Calendar sync needs the Apps Script update");
    }).catch(() => toast("Saved, but the calendar didn't answer"));
  };
  const calRemove = (id) => {
    const m = calMap(), gid = m[id]; if (!gid || !backend.url) return;
    delete m[id]; setCalMap(m);
    api("calRemove", "&gid=" + encodeURIComponent(gid), 20000).catch(() => { /* already gone */ });
  };
  const toggleSave = (ev) => {
    const n = { ...favs };
    if (n[ev.id]) { delete n[ev.id]; track(favs[ev.id] || ev, "savedCats", -1); calRemove(ev.id); putModel(L.unlearn(modelRef.current, ev.id, "save"), true); toast("Removed from plans"); }
    else {
      const { bd, why, sc, hidden, tt, rain, dark: _d, busy, outdoor, followed, calChecked, ...raw } = ev; // eslint-disable-line no-unused-vars
      n[ev.id] = raw; track(ev, "savedCats"); toast("Added to plans"); calAdd(ev); signal(ev, "save");
      if (!notifRef.current.on && !notifRef.current.asked && N.supported() && N.permission() !== "denied") setTimeout(() => setAskNotif(true), 900);
      const ts = Date.now(); setLastSaveAt(ts); try { localStorage.setItem("gp_lastsave", String(ts)); } catch { /* full */ }
    }
    setFavs(n); ss(SK_F, n);
  };
  // tasteRef keeps a thumb and the reason picked right after it from overwriting each other
  const tasteRef = useRef(taste); tasteRef.current = taste;
  const react = (ev, kind, reason, quiet) => {
    if (kind === "up" || kind === "down" || kind === "nfm") T.track(kind, ev, { s: tabRef.current });
    const t = applyReaction(tasteRef.current, prof, ev, kind, reason);
    tasteRef.current = t; saveTaste(t);
    // Same thumb in the v2 model: a flip or an undo takes back exactly what the earlier thumb added
    if (kind === "up" || kind === "down" || kind === "nfm" || kind === "undo") {
      let m = L.unlearn(L.unlearn(L.unlearn(modelRef.current, ev.id, "up"), ev.id, "down"), ev.id, "why");
      if (kind === "up") m = L.learn(m, ev, "up", today);
      if (kind === "down" || kind === "nfm") m = L.learn(m, ev, "down", today);
      putModel(m, true);
    }
    if (quiet) return;
    if (kind === "up") toast("Got it, more like this");
    if (kind === "down") toast("Got it, less like this");
    if (kind === "why") toast("Thanks, noted");
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

  // Learned preference per category and sub-type: boosts, thumbs, reasons, saves and filter choices
  const prefs = useMemo(() => {
    const cats = {}, subs = {}, add = (m, k, v) => { if (k) m[k] = (m[k] || 0) + v; };
    Object.entries(taste.ncatAdj || {}).forEach(([k, v]) => add(cats, k, v));
    Object.entries(taste.nsubAdj || {}).forEach(([k, v]) => add(subs, k, v));
    Object.keys(taste.stars?.cats || {}).forEach((k) => add(cats, k, 10));
    Object.keys(taste.stars?.subs || {}).forEach((k) => add(subs, k, 8));
    const byId = Object.fromEntries(scored.map((e) => [e.id, e]));
    Object.entries(taste.thumbs || {}).forEach(([id, d]) => { const e = byId[id]; if (e) { add(cats, e.ncat, 4 * d); add(subs, e.nsub, 4 * d); } });
    Object.values(favs).forEach((e) => { const x = byId[e.id] || e; add(cats, x.ncat, 5); add(subs, x.nsub, 5); });
    return { cats, subs };
  }, [taste, favs, scored]);
  // ── Whose phone this is (the learned taste is backed up to the Apps Script under that name)
  const postBackend = useCallback(async (action, extra, body) => {
    if (!backend.url) throw new Error("No backend");
    // text/plain body: no CORS preflight, which Apps Script can't answer
    const u = backend.url + (backend.url.includes("?") ? "&" : "?") + "action=" + action + "&key=" + encodeURIComponent(backend.key) + (extra || "");
    const r = await fetch(u, { method: "POST", body: JSON.stringify(body) });
    return r.json();
  }, [backend]);
  useEffect(() => {
    if (!ready || !userKey || !backend.url) return;
    const t = setTimeout(() => { postBackend("tastePut", "&who=" + encodeURIComponent(userKey), L.compact(modelRef.current)).catch(() => { /* backend not updated yet */ }); }, 30000);
    return () => clearTimeout(t);
  }, [ready, userKey, modelVer, backend.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Taste card: Claude puts the strongest learned patterns into a few plain lines
  const [cardBusy, setCardBusy] = useState(false);
  const buildCard = useCallback(async (force) => {
    const m = modelRef.current;
    if (cardBusy || aiOff.current || (m.strong || 0) < 5) return;
    const stale = !m.card || (m.strong || 0) - (m.card.strong || 0) >= 5 || Date.now() - (m.card.at || 0) > 7 * 86400000;
    if (!force && !stale) return;
    setCardBusy(true);
    try {
      const d = await postJSON("/api/enrich", { mode: "taste", ...L.topFeatures(m), counts: { signals: m.count || 0, strong: m.strong || 0 } });
      if (d?.lines?.length) putModel({ ...modelRef.current, card: { lines: d.lines, at: Date.now(), strong: m.strong || 0 } }, true);
    } catch { if (force) toast("Couldn't write the taste card right now"); }
    setCardBusy(false);
  }, [cardBusy, toast]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) buildCard(false); }, [ready, modelVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const muteLine = (line) => { putModel(L.mute(modelRef.current, line.f), true); toast("Got it, that's not you"); };
  const resetLearning = () => { putModel(L.emptyModel(), true); toast("Learning reset"); };

  // ── "Did you go?" for a saved event that just ended
  const goAsk = useMemo(() => L.pendingGoAsk(modelRef.current, pastSaves, today), [pastSaves, today, modelVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const answerGo = (ev, ans) => {
    let m = L.markAsked(modelRef.current, ev.id, ans);
    if (ans === "yes") m = L.learn(m, ev, "went", today);
    if (ans === "no") m = L.learn(m, ev, "missed", today);
    putModel(m, true);
    if (ans === "yes") toast("Nice. More like that");
  };

  // ── Google Maps lists (Takeout import): boosts events at saved places; list themes teach the taste model
  const [mapsBusy, setMapsBusy] = useState(false);
  const forgetMapsLearning = (m) => { Object.keys(m.c || {}).filter((k) => k.startsWith("maps:")).forEach((k) => { m = L.unlearn(m, k.slice(0, -4), "why"); }); return m; };
  const importMaps = async (files) => {
    if (!files?.length) return;
    setMapsBusy(true);
    try {
      const d = await M.parseTakeout([...files]);
      if (!d.lists.length) { toast("No saved lists found in that file"); setMapsBusy(false); return; }
      const data = { lists: d.lists, at: Date.now(), themes: null };
      setMapsData(data); M.saveMaps(data);
      toast(d.lists.length + " lists · " + d.lists.reduce((a, l) => a + l.places.length, 0) + " places imported");
      try {
        const r = await postJSON("/api/enrich", { mode: "lists", lists: d.lists.map((l) => ({ name: l.name, places: l.places.slice(0, 12) })) });
        const themes = r?.themes || {};
        let m = forgetMapsLearning(modelRef.current);
        Object.entries(themes).forEach(([name, t]) => {
          if (t.kind === "other" || (!t.cats.length && !Object.keys(t.d).length)) return;
          const feats = [...t.cats.map(L.catFeature), ...Object.entries(t.d).map(([k, v]) => L.dimFeature(k, v))];
          const n = Math.min(3, 1 + Math.floor((d.lists.find((l) => l.name === name)?.places.length || 0) / 15)) + (t.kind === "fav" ? 1 : 0);
          for (let i = 0; i < n; i++) m = L.learnTargeted(m, { id: "maps:" + name }, feats, 1, today);
        });
        putModel(m, true);
        const withThemes = { ...data, themes }; setMapsData(withThemes); M.saveMaps(withThemes);
      } catch { /* list themes are a bonus; place matching works without them */ }
    } catch (e) { toast("Couldn't read that file: " + (e.message || e)); }
    setMapsBusy(false);
  };
  const removeMaps = () => { putModel(forgetMapsLearning(modelRef.current), true); setMapsData(null); M.saveMaps(null); toast("Google Maps lists removed"); };
  const mapsMatches = mapsData ? visible.filter((e) => e.savedPlace).length : 0;

  // ── Onboarding quiz: first open on a phone that has learned little, and any time from Me
  useEffect(() => {
    if (!ready) return;
    if (!account) { setShowQuiz("auth"); return; } // everyone signs in (or chooses not to) once
    if (quiz) return;
    if ((modelRef.current.strong || 0) < 5 && !sessionStorage.getItem("gp_quiz_later")) setShowQuiz("moods");
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Meeting new people as a goal: boosts events built for it (mingle, group, solo-friendly) and pins the "Meet new people" pick
  const setMeetOn = (on) => {
    if (on === meet) return;
    const k = on ? 1 : -1;
    let m = L.nudge(modelRef.current, L.dimFeature("mode", "mingle"), 0.8 * k);
    m = L.nudge(m, L.dimFeature("social", "solo-friendly"), 0.3 * k);
    putModel(m, true);
    setMeetState(on); try { localStorage.setItem("gp_meet_v1", on ? "1" : "0"); } catch { /* private */ }
    toast(on ? "Got it. More ways to meet people." : "Okay, back to normal.");
  };
  const finishQuiz = (ans, prof, wantMeet) => {
    const W = Q.weightsFrom(ans); const weights = W.weights, price = W.price, far = W.far;
    putModel(L.seed(modelRef.current, weights), true);
    const t = { ...tasteRef.current, priceSens: Math.max(tasteRef.current.priceSens || 0, price), farSens: Math.max(tasteRef.current.farSens || 0, far) };
    tasteRef.current = t; saveTaste(t);
    const qz = { answers: ans, profile: prof, v: Q.QUIZ_VERSION, at: Date.now() }; setQuiz(qz); Q.saveQuiz(qz);
    setShowQuiz(false); setTab("today"); window.scrollTo(0, 0); { let nm = "", seen = false; try { nm = localStorage.getItem("gp_name_v1") || ""; seen = !!localStorage.getItem(TOUR_KEY); } catch { /* private */ } if (seen) toast("Nice to meet you" + (nm ? ", " + nm : "") + ". Here are your good plans."); }
    if (wantMeet != null) setTimeout(() => setMeetOn(wantMeet), 0);
    if (ans.moods?.length) setTimeout(() => learnIntentOrder(ans.moods), 0); // favourite moods teach taste like the custom order
    { let seen = false; try { seen = !!localStorage.getItem(TOUR_KEY); } catch { /* private */ } if (!seen) setTimeout(() => setShowTour(true), 800); }
  };

  // ── Picks: personal lists from your strongest taste combinations (next 7 days)
  const picks = useMemo(() => {
    const wk = new Date(today); wk.setDate(today.getDate() + 7);
    return buildPicks(modelRef.current, visible.filter((e) => evStart(e) <= wk), 5, meet);
  }, [visible, modelVer, today, meet]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickPool = useMemo(() => { const wk = new Date(today); wk.setDate(today.getDate() + 7); return poolPicks(visible.filter((e) => evStart(e) <= wk)); }, [visible, today]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Home tiles (quick time tiles + moods/picks); reused as "More ideas" in Explore
  useMemo(() => setKeywordDf(visible), [visible]); // keyword rarity, so cards show the most telling word
  // Taste space: grows with every enriched event; your taste (and Theo's, when blended) is a point in it
  useEffect(() => { const ready2 = visible.filter((e) => tags[e.id] || aiOff.current); if (ready2.length && ingest(ready2, today)) setEmbVer((v) => v + 1); }, [visible, tags]); // eslint-disable-line react-hooks/exhaustive-deps
  // Me → How your moods learn: stats, and for each of your top interests its nearest neighbours you haven't tried
  const moodLab = useMemo(() => {
    if (tab !== "me") return null;
    const map = (tasteMe?.anchors || []).filter((a) => /^(act|sub):/.test(a.f)).slice(0, 5).map((a) => [a.label, neighbours(space, a.f, 8, a.f.split(":")[0] + ":").filter(([f]) => !(L.weightOf(modelRef.current, f) > 0.05)).slice(0, 3).map(([f]) => labelOf(f))]).filter(([, ns]) => ns.length);
    return { stats: moodStats(14), events: space.n, map };
  }, [tab, space, tasteMe]); // eslint-disable-line react-hooks/exhaustive-deps
  const tileSet = useMemo(() => buildTiles({ space, taste: tasteMe, tasteB: null, wOf: (f) => L.weightOf(modelRef.current, f), clicks: moodClicks, favs: moodFav, visible, today, filters, youR, youA, youTitle: moodProps.you?.title, picks, pool: pickPool, meet, fb: moodFb, book: sections.book || [], dark }),
    [visible, today, filters.xcats, filters.xsubs, youR, youA?.id, moodProps.you?.title, picks, pickPool, sections, dark, moodFb, space, tasteMe]); // eslint-disable-line react-hooks/exhaustive-deps
  // Thumbs and hearts on mood tiles teach the taste model (picks: their features; archetype moods: the You store)
  const learnTile = (t, d) => {
    if (t.f) { let m = modelRef.current; for (const f of t.f) m = L.nudge(m, f, 0.3 * d); putModel(m, true); }
    else if (t.facet) { const ff = L.features(t.list[0], today).filter((x) => x.startsWith(t.facet)); let m = modelRef.current; for (const f of ff) m = L.nudge(m, f, 0.3 * d); putModel(m, true); }
    else if (t.moodId) saveYou(learnYou(youStore, youR.slot, t.moodId, d));
  };
  const reactMood = (t, dir) => {
    const cur = moodFb[t.key] || 0, next = cur === dir ? 0 : dir;
    if (cur) learnTile(t, -cur); if (next) learnTile(t, next);
    const fb = { ...moodFb }; if (next) fb[t.key] = next; else delete fb[t.key];
    setMoodFb(fb); try { localStorage.setItem("gp_moodfb_v1", JSON.stringify(fb)); } catch { /* full */ }
  };
  // My moods: remove one (an unpinned one is hidden from the auto list until you open it again)
  const dropMood = (t) => {
    if (moodFav.includes(t.key)) { const f = moodFav.filter((k) => k !== t.key); setMoodFav(f); try { localStorage.setItem("gp_moodfav_v1", JSON.stringify(f)); } catch { /* full */ } }
    const h = [...new Set([...moodHide, t.key])]; setMoodHide(h); try { localStorage.setItem("gp_moodhide_v1", JSON.stringify(h)); } catch { /* full */ }
  };
  const favMood = (t) => {
    if (moodHide.includes(t.key)) { const h = moodHide.filter((k) => k !== t.key); setMoodHide(h); try { localStorage.setItem("gp_moodhide_v1", JSON.stringify(h)); } catch { /* full */ } }
    const on = moodFav.includes(t.key); learnTile(t, on ? -0.5 : 0.5);
    const f = on ? moodFav.filter((k) => k !== t.key) : [...moodFav, t.key].slice(-30); // first in, first out: the oldest favourite makes room
    markFavAt(t.key, !on);
    setMoodFav(f); try { localStorage.setItem("gp_moodfav_v1", JSON.stringify(f)); } catch { /* full */ }
    toast(on ? "Removed from My Interests" : "Added to My Interests");
  };
  const [listMeta, setListMeta] = useState(null);
  // ── View history: every move between tabs and lists remembers where you were, so "back" retraces your steps
  const [viewStack, setViewStack] = useState([]);
  const pushView = () => setViewStack((st) => [...st.slice(-29), { tab, filters, listMeta, y: window.scrollY }]);
  const popView = () => {
    const v = viewStack[viewStack.length - 1]; if (!v) return;
    setViewStack((st) => st.slice(0, -1));
    setTab(v.tab); setFilters(v.filters); setListMeta(v.listMeta);
    setTimeout(() => window.scrollTo(0, v.y || 0), 40);
  };
  // Reordering moods teaches a little: the first three lean the taste towards their categories and families
  const learnIntentOrder = (order) => {
    let m = modelRef.current;
    order.slice(0, 3).forEach((id, i) => { const it = INTENT[id]; if (!it) return; const w = 0.08 - i * 0.02; (it.cats || []).forEach((c) => { m = L.nudge(m, L.catFeature(c), w); }); (it.fams || []).forEach((f) => { m = L.nudge(m, "fam:" + f, w); }); });
    putModel(m, true);
  };
  const navTab = (t) => { if (t !== tab) pushView(); setTab(t); window.scrollTo(0, 0); };
  const openTile = (t) => {
    pushView();
    // Default grouping from where you came: one activity → by day; a mood, a moment or an area → by category
    const group = t.group || (/^(gen-(act|sub|term|cut)|intent-act)-/.test(t.key || "") || t.key === "weekend" || t.key === "week" ? "day" : "cat");
    // A plain description of the page, never a list of event titles
    const k = t.key || "", low = String(t.title || "").toLowerCase();
    const desc = k === "top-picks" ? "Everything coming up, ranked by your taste."
      : /^intent-act-/.test(k) ? "All the " + low + " coming up for this mood, soonest first."
      : /^intent-/.test(k) ? "Plans for when you're in the mood to " + low + ", ranked by your taste."
      : /^gen-(act|sub|term|cut)-/.test(k) ? "All the " + low + " coming up around the city, soonest first."
      : /^hood-act-/.test(k) ? "Soonest first."
      : ["today", "tonight", "tomorrow", "weekend", "week"].includes(k) ? "Everything on " + low + ", grouped by what you'd be doing."
      : t.teaser && !/·/.test(t.teaser) ? t.teaser : "Events that fit, ranked by your taste.";
    setListMeta({ title: t.title, color: t.color, icon: t.icon, node: t.node, teaser: desc, verb: t.verb, group, intro: t.intro, kind: t.kind });
    if (/^(mood|pick|gen)-/.test(t.key || "") && t.list) { moodSession.current = { key: t.key, ids: new Set(t.list.map((e) => e.id)), at: Date.now(), adj: !!t.adj, title: t.title }; logMood("opened", t.key, !!t.adj, t.title); }
    if (t.f && /^gen-/.test(t.key || "")) { let m = modelRef.current; for (const f of t.f) m = L.nudge(m, f, 0.08); putModel(m); } // opening is a light vote
    if (/^(mood|pick|gen)-/.test(t.key || "")) { const c = { ...moodClicks, [t.key]: { n: (moodClicks[t.key]?.n || 0) + 1, at: Date.now() } }; setMoodClicks(c); try { localStorage.setItem("gp_moodclicks_v1", JSON.stringify(c)); } catch { /* full */ } if (moodHide.includes(t.key)) { const h = moodHide.filter((k) => k !== t.key); setMoodHide(h); try { localStorage.setItem("gp_moodhide_v1", JSON.stringify(h)); } catch { /* full */ } } }
    const base = { ...filters, fam: null, mi: null, with: null, cats: [], subs: [], ids: [], list: t.title, price: "any", when: EMPTY_FILTERS.when, noClash: false, q: "" };
    setFilters(t.list ? { ...base, ids: t.list.map((e) => e.id), when: "any" } : { ...base, ...t.patch });
    setTab("explore"); window.scrollTo(0, 0);
  };
  // Map-only "Around you right now": open the full Map tab on the same pins
  // Closing a mood page: filters back to default, then Home at the "For you" section
  const closeList = () => { setViewStack([]); setFilters({ ...EMPTY_FILTERS, xcats: filters.xcats || [], xsubs: filters.xsubs || [] }); setTab("today"); setTimeout(() => { const el = document.getElementById("for-you"); if (el) el.scrollIntoView(); else window.scrollTo(0, 0); }, 60); };
  const openFullMap = (ids, title) => { pushView(); setFilters({ ...filters, fam: null, mi: null, with: null, cats: [], subs: [], ids, list: title, price: "any", when: "now", noClash: false, q: "" }); setTab("map"); window.scrollTo(0, 0); };
  // ── Taste chart in Me: each dimension as an axis; a nudge moves it a notch
  const axes = useMemo(() => ({
    axes: L.AXES.map(([dim, loL, lo, hiL, hi]) => ({ dim, loL, lo, hiL, hi, v: L.axisScore(modelRef.current, dim, lo, hi) })),
    choices: L.CHOICE_DIMS.map(([dim, label, vals]) => {
      const best = Object.entries(vals).map(([k, word]) => [word, L.weightOf(modelRef.current, L.dimFeature(dim, k))]).sort((a, b) => b[1] - a[1])[0];
      return { dim, label, word: best && best[1] > 0.05 ? best[0] : null };
    }),
  }), [modelVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const nudgeAxis = (dim, lo, hi, dir) => {
    let m = L.nudge(modelRef.current, L.dimFeature(dim, dir > 0 ? hi : lo), 0.35);
    m = L.nudge(m, L.dimFeature(dim, dir > 0 ? lo : hi), -0.2);
    putModel(m, true);
  };

    // ── Phone "back" gesture: each open layer (a tab other than Today, the event page, a dialog, the quiz) is one history entry,
  // so back closes the top layer first and only leaves the app from Today with nothing open.
  const layers = [];
  viewStack.forEach(() => layers.push(popView));
  if (!viewStack.length && tab !== "today") layers.push(() => { setTab("today"); window.scrollTo(0, 0); });
  if (showFree) layers.push(() => setShowFree(false));
  if (surprise) layers.push(() => setSurprise(null));
  if (openEv) { layers.push(() => setOpenEv(null)); trail.slice(1).forEach(() => layers.push(trailBack)); }
  if (whyAsk) layers.push(() => setWhyAsk(null));
  if (showTour) layers.push(() => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* private */ } setShowTour(false); });
  if (showQuiz && account) layers.push(() => { try { sessionStorage.setItem("gp_quiz_later", "1"); } catch { /* private */ } setShowQuiz(false); });
  const layersRef = useRef(layers); layersRef.current = layers;
  const histDepth = useRef(0), skipPop = useRef(0);
  useEffect(() => {
    const depth = layers.length;
    if (depth > histDepth.current) {
      while (histDepth.current < depth) { window.history.pushState({ gp: histDepth.current + 1 }, ""); histDepth.current++; }
    } else if (depth < histDepth.current) {
      const n = histDepth.current - depth; histDepth.current = depth; skipPop.current++; window.history.go(-n); // closed from the screen: drop the extra entries
    }
  }, [layers.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onPop = () => {
      if (skipPop.current > 0) { skipPop.current--; return; }
      if (histDepth.current > 0) { histDepth.current--; const l = layersRef.current; l[l.length - 1]?.(); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!ready) return <div className="gp-app" style={{ minHeight: "100vh" }} />;

  const actions = {
    onSeen: (ev) => { putModel(L.seen(modelRef.current, ev, today)); T.track("imp", ev, { s: openEvRef.current ? "sheet" : tabRef.current }); },
    prefOf: (kind, id) => prefs[kind]?.[id] || 0,
    onReact: (ev, kind, reason, quiet) => react(ev, kind, reason, quiet),
    askWhy: (ev, dir) => setWhyAsk({ ev, dir }),
    onSave: (ev) => toggleSave(ev),
    isSaved: (id) => !!favs[id],
    // ★ boosts a category or sub-type in the taste model (kind: "cats" | "subs")
    isStar: (kind, id) => !!taste.stars?.[kind]?.[id],
    toggleStar: (kind, id) => {
      const st = { cats: { ...(taste.stars?.cats || {}) }, subs: { ...(taste.stars?.subs || {}) } };
      if (st[kind][id]) delete st[kind][id]; else st[kind][id] = true;
      const t = { ...tasteRef.current, stars: st };
      tasteRef.current = t; saveTaste(t);
      // the heart also puts the category or sub-type in My Interests (when it has a list of its own)
      const pool = [...(tileSet?.all || []), ...(tileSet?.every || [])];
      const tile = pool.find((x) => x.key === "gen-cat-" + id) || pool.find((x) => kind === "subs" && /^gen-sub-/.test(x.key) && x.key.endsWith("|" + id));
      const on = !!st[kind][id];
      if (tile && on !== moodFav.includes(tile.key)) {
        const f = on ? [...moodFav, tile.key].slice(-30) : moodFav.filter((k) => k !== tile.key);
        markFavAt(tile.key, on);
        setMoodFav(f); try { localStorage.setItem("gp_moodfav_v1", JSON.stringify(f)); } catch { /* full */ }
      }
      toast(on ? "Added to My Interests" : "Removed from My Interests");
    },
    thumbOf: (id) => taste.thumbs[id] || 0,
  };

  return (
    <ActionsCtx.Provider value={actions}>
    <NotifyCtx.Provider value={notifyCtx}>
    <div className="gp-app" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {tab === "today" && <Today onIntentOrder={learnIntentOrder} userName={(() => { try { return localStorage.getItem("gp_name_v1") || account?.name || ""; } catch { return account?.name || ""; } })()} tiles={tileSet} moodFav={moodFav} moodClicks={moodClicks} moodHide={moodHide} onMoodDrop={dropMood} nyRows={nyRows} moodFb={moodFb} onMoodFb={reactMood} onMoodFav={favMood} onTile={openTile} onFullMap={openFullMap} picks={picks} goAsk={goAsk} onGoAnswer={answerGo} data={visible} sections={sections} dark={dark} today={today} home={home} locLabel={locLabel} onOpen={openEvent} setTab={navTab}
          freeUntil={effFree} autoFree={autoFree} openFree={() => setShowFree(true)} weather={weather}
          weekPicks={weekPicks} eprof={eprof} hiddenCats={filters.xcats || []} hiddenSubs={filters.xsubs || []} onHideCat={(c, kind = "xcats") => { const x = filters[kind] || []; setFilters({ ...filters, [kind]: x.includes(c) ? x.filter((y) => y !== c) : [...x, c] }); }} {...moodProps} onMore={(patch) => { setFilters({ ...filters, fam: null, cats: [], subs: [], ids: [], list: null, price: "any", when: EMPTY_FILTERS.when, ...patch }); setTab("explore"); window.scrollTo(0, 0); }} onSurprise={() => setSurprise(pickSurprise())} onRefresh={() => refresh(false)} refreshing={refreshing}
          highlights={hl?.day === isoDay(today) ? { text: hl.text, ids: hl.ids || [], status: hlStatus } : { text: null, status: hlStatus }} />}
        {tab === "explore" && <Explore rankCtx={rankCtx} listMeta={listMeta} tiles={tileSet} moodFav={moodFav} onMoodFav={favMood} onClose={closeList} onTile={openTile} scored={visible} dark={dark} today={today} onOpen={openEvent} filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} regulars={regulars} annual={annual} home={home} onFullMap={openFullMap} moodFb={moodFb} onMoodFb={reactMood} />}
        {tab === "map" && <MapView scored={visible} home={home} dark={dark} today={today} onOpen={openEvent} filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} />}
        {tab === "plans" && <Plans favs={favs} scoreOne={scoreOne} dark={dark} today={today} onOpen={openEvent} onRemove={toggleSave} busySlots={busySlots} calStatus={calStatus} />}
        {tab === "me" && <Me devMode={devMode} onDevMode={toggleDev} moodLab={moodLab} meet={meet} onMeet={setMeetOn} axes={axes} onNudge={nudgeAxis} quiz={quiz} onRetakeQuiz={() => setShowQuiz("retake")} account={account} onSignOut={signOut} onSignIn={() => setShowQuiz("auth")} onTour={() => { navTab("today"); setTimeout(() => setShowTour(true), 500); }} maps={mapsData} mapsBusy={mapsBusy} mapsMatches={mapsMatches} onImportMaps={importMaps} onRemoveMaps={removeMaps} learned={{ card: modelRef.current.card, strong: modelRef.current.strong || 0, count: modelRef.current.count || 0, muted: Object.keys(modelRef.current.muted || {}).length }} cardBusy={cardBusy} onCardRefresh={() => buildCard(true)} onMuteLine={muteLine} onResetLearning={resetLearning}
          prof={prof} eprof={eprof} taste={taste} setCatLevel={setCatLevel} setCatValue={setCatValue} dark={dark} theme={theme} setTheme={setTheme} unit={unit} setUnit={setUnit} hiddenCats={[...(filters.xcats || []), ...(filters.xsubs || [])]} onShowCat={(c) => setFilters({ ...filters, xcats: (filters.xcats || []).filter((y) => y !== c), xsubs: (filters.xsubs || []).filter((y) => y !== c) })} stars={taste.stars || {}} onUnstar={(kind, id) => actions.toggleStar(kind, id)}
          onUnfollow={unfollow} onUndo={undo} resetTaste={resetTaste}
          calStatus={calStatus} busyCount={busySlots.length} onCheckCal={() => checkCal(false)} calName={calName}
          notif={notif} perm={perm} onNotifOn={async () => { const n = await turnOnNotif(); if (n) N.sync(n, savedForPush, "test"); }}
          onNotifSet={(patch) => putNotif({ ...notifRef.current, ...patch })} onNotifTest={() => N.sync(notifRef.current, savedForPush, "test").then((r) => toast(r?.test?.ok ? "Test sent" : "Couldn't reach this phone. Try turning notifications on again."))}
          onNotifOff={() => { N.sync(notifRef.current, [], "off"); putNotif({ ...notifRef.current, on: false }); }}
          onUnbell={(k) => { const b = { ...notifRef.current.bells }; delete b[k]; putNotif({ ...notifRef.current, bells: b }); }}
          backend={backend} setBackend={setBackend} lastRefreshed={lastRefreshed} eventCount={events.length} onRefresh={() => refresh(false)} refreshing={refreshing} refreshLog={refreshLog}
          locSt={locSt} onRetryGPS={() => locate(true)} />}
      </div>

      <TabBar tab={tab} setTab={(t) => { if (t === "explore" || t === "map") setFilters((f) => ({ ...EMPTY_FILTERS, xcats: f.xcats || [], xsubs: f.xsubs || [] })); navTab(t); }} plansCount={plansCount} />

      {showTour && <Tour onDone={() => setShowTour(false)} />}
      {devMode && <DevFlag events={scored} screen={tab} openEv={openEv} />}
      {showQuiz && <Quiz dark={dark} startAt={showQuiz === "auth" || showQuiz === "retake" || !account ? "auth" : "moods"} needQuiz={!quiz || showQuiz === "retake"} onAuth={setAccount} onDone={(ans, prof, meet) => { if (!ans) { setShowQuiz(false); return; } finishQuiz(ans, prof, meet); }} />}
      {sheetEv && <EventSheet favs={moodFav} onFav={favMood} tiles={tileSet} onTile={(t) => { setOpenEv(null); openTile(t); }} ev={sheetEv} dark={dark} today={today} onSignal={signal} onAskWhy={(ev, dir) => setWhyAsk({ ev, dir })}
        similar={L.similarEvents(sheetEv, visible, today, 10)} list={visible} savedIds={favs}
        trail={trail.map((id) => (id === sheetEv.id ? sheetEv : scored.find((e) => e.id === id))).filter(Boolean)}
        onBack={() => window.history.back()} bells={notif.bells || {}} onBell={(b) => toggleBell(b)}
        onOpen={(e, rail) => { document.querySelector(".sheet")?.scrollTo({ top: 0 }); openEvent(e, rail); }} onClose={() => setOpenEv(null)} saved={!!favs[sheetEv.id]} onSave={toggleSave}
        taste={taste} onReact={react} onFollow={follow} toast={toast} />}
      {showFree && <FreeUntilDialog freeUntil={effFree} autoFree={autoFree} onClose={() => setShowFree(false)}
        onPick={(m) => { setFreeUntil(m); setShowFree(false); }} />}
      {surprise && !sheetEv && <Surprise ev={surprise.ev} empty={!surprise.ev} dark={dark} today={today} weather={weather}
        onOpen={(ev) => openEvent(ev)} onAnother={() => setSurprise(pickSurprise(surprise.seen))} onClose={() => setSurprise(null)} />}
      {whyAsk && <WhyDialog ev={whyAsk.ev} dir={whyAsk.dir} today={today} counts={taste.reasons || {}} smart={L.smartReasons(modelRef.current, whyAsk.ev, whyAsk.dir, today)}
        onPick={(rs) => {
          let m = modelRef.current;
          rs.forEach((r) => {
            react(whyAsk.ev, "why", whyAsk.dir + ":" + r, true);
            // Same reason in the v2 engine, aimed at the exact features it names
            const [k, ...rest] = r.split(":");
            m = L.learnTargeted(m, whyAsk.ev, L.reasonFeatures(whyAsk.ev, k, rest.join(":"), today), whyAsk.dir === "up" ? 1 : 0, today);
          });
          putModel(m, true);
          toast("Thanks, noted"); setWhyAsk(null);
        }} onClose={() => setWhyAsk(null)} />}
      {askNotif && (
        <Dialog title="Get a reminder?" onClose={() => { setAskNotif(false); putNotif({ ...notifRef.current, asked: true }); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="disp" style={{ fontSize: 22 }}>Want a nudge before it starts?</div>
            <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Good Plans can remind you a couple of hours before your saved plans, with when to leave, and tell you if the time or venue changes. You can also ring the bell on things you like to hear about new events.</div>
            <button className="pill pill-dark" onClick={async () => { setAskNotif(false); const n = await turnOnNotif(); if (n) N.sync(n, savedForPush, "test"); }}>Turn on notifications</button>
            <button className="pill pill-line" onClick={() => { setAskNotif(false); putNotif({ ...notifRef.current, asked: true }); }}>Not now</button>
          </div>
        </Dialog>
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
    </NotifyCtx.Provider>
    </ActionsCtx.Provider>
  );
}
