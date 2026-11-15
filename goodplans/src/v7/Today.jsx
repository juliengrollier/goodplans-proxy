import React from "react";
import { Logo, Icon, Glyph } from "./icons.jsx";
import { HeroCard, CompactCard, PosterCard, SectionHead, LeafletMap, CatBullet, ActionsCtx, Media, QuickTile, MoodTile } from "./components.jsx";
import { Peek } from "./MapView.jsx";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { useEventImage } from "./images.js";
import { catColor, catIcon } from "./theme.js";
import { fmtT, startMinutes, endMinutes, nowMinutes, fmtClock, isFree, isoDay } from "./engine.js";
import { DAYS, MONTHS, evCovers, evStart, CATS, daysUntil, isImprecise } from "../lib/core.js";
import { collapseSeries } from "./dedupe.js";
import { Travel, catLabel } from "./components.jsx";
import { FAMILIES, FAM, CATEGORIES, CAT, SUBTYPES, famColor, LIcon, CatChip } from "./taxonomy.js";
import { User, Users } from "lucide";

function greeting(d) {
  const h = d.getHours(), day = DAYS[d.getDay()];
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  return { line: (day === "Sat" ? "Saturday" : day === "Sun" ? "Sunday" : day === "Fri" ? "Friday" : ["Monday", "Tuesday", "Wednesday", "Thursday"][d.getDay() - 1]) + " " + part, title: h >= 21 ? "Still time to go out." : "Good plans ahead." };
}

function soonLabel(ev) {
  const sm = startMinutes(ev), em = endMinutes(ev), now = nowMinutes();
  if (sm == null) return "Today";
  if (sm <= now) return em != null ? "On now · until " + fmtClock(em % 1440) : "On now";
  const d = sm - now;
  return d < 60 ? "In " + d + " min" : "At " + fmtClock(sm);
}

const FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const wxIcon = (pp) => (pp >= 50 ? "rain" : pp >= 25 ? "cloud" : "sun");

// Next ~12 hours in 3-hour steps, then the next days
function Forecast({ weather, today }) {
  if (!weather?.hours?.length) return null;
  const nowIso = isoDay(new Date()) + "T" + String(new Date().getHours()).padStart(2, "0");
  const start = weather.hours.findIndex((h) => h.t.slice(0, 13) >= nowIso);
  const hrs = start < 0 ? [] : [0, 3, 6, 9, 12].map((k) => weather.hours[start + k]).filter(Boolean);
  const days = Object.entries(weather.byDate).filter(([d]) => d > isoDay(today)).slice(0, 5);
  const t = isoDay(today), w = weather.byDate[t];
  const restRain = weather.hours.slice(Math.max(start, 0), Math.max(start, 0) + 10).find((h) => h.pp >= 50);
  const note = weather.now?.rainingNow ? "Raining now: indoor picks go first."
    : restRain ? "Rain likely from " + fmtClock(parseInt(restRain.t.slice(11, 13)) * 60) + ": outdoor plans are flagged."
    : w && w.hi < 45 ? "Dry but cold: outdoor plans need a warm layer."
    : "Dry for the next few hours: good time for outdoor plans.";
  const cell = (key, top, icon, temp, pp, strong) => (
    <div key={key} style={{ flexShrink: 0, width: 58, padding: "8px 0", borderRadius: 16, background: strong ? "var(--navy)" : "var(--card)", color: strong ? "var(--onnavy)" : "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "1px solid var(--line)" }}>
      <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.8 }}>{top}</span>
      <Icon name={icon} size={20} />
      <span style={{ fontSize: 14, fontWeight: 800 }}>{temp}°</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, opacity: pp >= 25 ? 1 : 0.55 }}>{pp}%</span>
    </div>
  );
  return (
    <div style={{ padding: "0 0 6px" }}>
      <div className="hscroll" style={{ gap: 6 }}>
        {hrs.map((h, i) => cell(h.t, i === 0 ? "Now" : fmtClock(parseInt(h.t.slice(11, 13)) * 60).replace(":00", ""), wxIcon(h.pp), i === 0 && weather.now ? weather.now.temp : h.temp, h.pp, i === 0))}
        <div style={{ width: 1, flexShrink: 0, background: "var(--line)", margin: "6px 2px" }} />
        {days.map(([d, v]) => cell(d, DAYS[new Date(d + "T12:00:00").getDay()], wxIcon(v.pmax), v.hi, v.pmax))}
      </div>
      <div className="row muted" style={{ gap: 6, padding: "8px 20px 0", fontSize: 13, fontWeight: 700 }}><Icon name={wxIcon(restRain ? 60 : 0)} size={15} />{note}</div>
    </div>
  );
}

// Top picks for one family (Watch, Listen, …): tap an icon to switch. Order fixed per session, favourite families first.
function TopPicks({ data, dark, today, onOpen, eprof, onMore, xcats = [], xsubs = [], onHideCat = () => {} }) {
  const A = React.useContext(ActionsCtx);
  const counts = data.filter((e) => daysUntil(e, today) <= 30).reduce((m, e) => ((m[e.fam] = (m[e.fam] || 0) + 1), m), {});
  const avail = FAMILIES.map((f) => f.id).filter((id) => counts[id] >= 2);
  // Order follows what the app has learned you like (boosts, thumbs, saves), then how well its events score for you
  const famPref = (id) => CATEGORIES.filter((c) => c.fam === id).reduce((a, c) => a + A.prefOf("cats", c.id), 0);
  const avg = (id) => { const l = data.filter((e) => e.fam === id).slice(0, 8); return l.reduce((a, e) => a + e.sc, 0) / Math.max(1, l.length); };
  const fams = [...avail].sort((a, b) => famPref(b) - famPref(a) || avg(b) - avg(a));
  const [fam, setFam] = React.useState(() => { try { return sessionStorage.getItem("gp_topfam") || null; } catch { return null; } });
  const pick = (c) => { setFam(c); setCat(null); setSub(null); try { sessionStorage.setItem("gp_topfam", c); } catch { /* private mode */ } };
  const cur = fam && fams.includes(fam) ? fam : fams[0];
  const [cat, setCat] = React.useState(null); // optional category inside the family
  const [sub, setSub] = React.useState(null);
  if (!cur) return null;
  const inFam = data.filter((e) => e.fam === cur && daysUntil(e, today) <= 30); // within the next month
  const catN = inFam.reduce((m, e) => ((m[e.ncat] = (m[e.ncat] || 0) + 1), m), {});
  const cats = CATEGORIES.filter((c) => c.fam === cur && (catN[c.id] || xcats.includes(c.id))).sort((a, b) => A.prefOf("cats", b.id) - A.prefOf("cats", a.id) || catN[b.id] - catN[a.id]);
  const hide = (id) => { onHideCat(id); if (cat === id) setCat(null); };
  const curCat = cat && catN[cat] ? cat : null;
  // Third level: sub-types of the chosen category (or of the family's only category)
  const focus = curCat || (cats.length === 1 ? cats[0].id : null);
  const subN = inFam.filter((e) => e.ncat === focus && e.nsub).reduce((m, e) => ((m[e.nsub] = (m[e.nsub] || 0) + 1), m), {});
  const subs = focus && SUBTYPES[focus] ? SUBTYPES[focus].map(([n]) => n).filter((n) => subN[n] || xsubs.includes(n)).sort((a, b) => A.prefOf("subs", b) - A.prefOf("subs", a) || (subN[b] || 0) - (subN[a] || 0)) : [];
  const showSubs = subs.length >= 2;
  const curSub = sub && subN[sub] && focus ? sub : null;
  const list = inFam.filter((e) => (!curCat || e.ncat === curCat) && !xcats.includes(e.ncat) && (!curSub || e.nsub === curSub) && !(e.nsub && xsubs.includes(e.nsub))).sort((a, b) => b.sc - a.sc);
  const shown = collapseSeries(list).slice(0, 5);
  return (
    <>
      <SectionHead title={"Top picks · " + (curSub || curCat || FAM[cur].label)} color={famColor(cur, dark)} onMore={() => onMore({ fam: cur, cats: curCat ? [curCat] : [], subs: curSub ? [curSub] : [], when: "week" })} />
      <div className="hscroll" style={{ gap: 4, padding: "0 12px 14px", scrollPaddingInline: 12 }} role="tablist" aria-label="Topic">
        {fams.map((id) => FAM[id]).map((f) => {
          const on = f.id === cur, col = famColor(f.id, dark);
          return (
            <button key={f.id} role="tab" aria-selected={on} aria-label={f.label} onClick={() => pick(f.id)}
              style={{ border: "none", background: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 46, flexShrink: 0, opacity: on ? 1 : 0.45 }}>
              <span style={{ width: 38, height: 38, borderRadius: 19, background: col, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? `0 0 0 3px var(--bg), 0 0 0 5px ${col}` : "none" }}>
                <LIcon node={f.icon} size={19} color="#fff" />
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ink2)", whiteSpace: "nowrap" }}>{f.short || f.label}</span>
            </button>
          );
        })}
      </div>
      {cats.length > 1 && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px 14px", scrollPaddingInline: 12 }} role="group" aria-label={FAM[cur].label + " categories"}>
          {cats.map((c) => <CatChip key={c.id} c={c} n={catN[c.id] || 0} on={curCat === c.id} off={xcats.includes(c.id)} starred={A.isStar("cats", c.id)} dark={dark} onPick={() => { setCat(curCat === c.id ? null : c.id); setSub(null); }} onHide={() => hide(c.id)} onStar={() => A.toggleStar("cats", c.id)} />)}
        </div>
      )}
      {showSubs && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px 14px", scrollPaddingInline: 12 }} role="group" aria-label={focus + " types"}>
          <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>{focus}</span>
          {subs.map((n) => <CatChip key={n} c={CAT[focus]} label={n} n={subN[n] || 0} on={curSub === n} off={xsubs.includes(n)} starred={A.isStar("subs", n)} dark={dark}
            onPick={() => setSub(curSub === n ? null : n)} onHide={() => { onHideCat(n, "xsubs"); if (curSub === n) setSub(null); }} onStar={() => A.toggleStar("subs", n)} />)}
        </div>
      )}
      <div key={cur + (curCat || "") + (curSub || "")} style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18, minHeight: 300 }}>
        {shown.map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
      </div>
    </>
  );
}

// Top pick for now: the single event in a mood's list we're most sure you'd want today but haven't planned.
// Confidence = your overall score + learned taste + how central it is to the mood + timing; anything uncertain is left out
// (exploration picks, saved or clashing events, rain on outdoor plans, far trips, ended or unknown-time events late in the day).
export function topPickNow(list, today, exclude = []) {
  const now = nowMinutes(), n = list.length;
  const A = topPickNow.ctx || {};
  let best = null;
  list.forEach((e, i) => {
    if (exclude.includes(e.id) || e.explore || e.busy || e.rain || e.hidden) return;
    if (A.isSaved?.(e.id) || A.thumbOf?.(e.id) === -1) return;
    if (daysUntil(e, today) !== 0 || !evCovers(e, today)) return;
    const sm = startMinutes(e), em = endMinutes(e);
    if (sm != null && em == null && sm < now - 60) return;    // started over an hour ago
    if (em != null && em < now + 45) return;                 // ends too soon to go
    if (e.tt?.mins > 40) return;
    let c = (e.sc || 0) + Math.max(0, e.lp || 0) * 0.6 + 12 * (1 - i / Math.max(1, n));
    if (sm != null && sm >= now && sm - now <= 240) c += 6;  // starts in the next few hours
    if (e.tt?.mins != null && e.tt.mins <= 20) c += 4;
    if (sm == null) c -= 6;                                 // vague timing: less sure
    if (!best || c > best.c) best = { e, c };
  });
  return best && best.c >= 55 ? best.e : null;
}

// A mood section: small label, Claude-written title and subtitle, 4 events, "Or:" chip, extra actions
function MoodSection({ eyebrow, m, other, onSwitch, onOpen, dark, today, children, hero }) {
  const rest = hero ? m.list.filter((e) => e.id !== hero.id) : m.list;
  return (
    <>
      <div className="sec-h" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{eyebrow}</span>
        <h2 style={{ lineHeight: 1.1, opacity: m.writing ? 0.55 : 1, transition: "opacity .3s" }}>{String(m.title || "").replace(/[.!]+$/, "")}</h2>
        {m.sub && <div className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>{m.sub}</div>}
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        {hero && <HeroCard ev={hero} dark={dark} today={today} onOpen={onOpen} label="Top pick for now" />}
        {rest.slice(0, hero ? 3 : 4).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
        {!m.list.length && <div className="muted" style={{ fontSize: 14, padding: "0 4px" }}>Nothing in your feed is truly about this yet.</div>}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {other && <button className="chip" style={{ height: 36, maxWidth: "100%" }} onClick={onSwitch}><span className="muted" style={{ fontWeight: 700 }}>Or:</span> <span className="ell">{other.title}</span></button>}
          {children}
        </div>
      </div>
    </>
  );
}

// City pulse: what New York is up to. Navy banner card, then the related events as a list.
function CityPulse({ m, other, onSwitch, onOpen, dark, today, hero }) {
  const rest = hero ? m.list.filter((e) => e.id !== hero.id) : m.list;
  // Header with a navy icon badge; events listed below like the other sections
  return (
    <>
      <div className="sec-h" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <span className="row" style={{ gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}><Icon name="pin" size={14} /> City pulse</span>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          {m.icon && <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 23, flexShrink: 0, background: dark ? "#2A2F5C" : "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FBF7EF" }}>{React.createElement(m.icon, { size: 23, strokeWidth: 2.2 })}</span>}
          <h2 style={{ lineHeight: 1.1, opacity: m.writing ? 0.55 : 1, transition: "opacity .3s" }}>{String(m.title || "").replace(/[.!]+$/, "")}</h2>
        </div>
        {m.sub && <div className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>{m.sub}</div>}
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        {hero && <HeroCard ev={hero} dark={dark} today={today} onOpen={onOpen} label="Top pick for today" />}
        {m.list.length ? rest.slice(0, hero ? 3 : 4).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)
          : <div className="muted" style={{ fontSize: 14, padding: "0 4px" }}>Nothing in your feed is truly about this yet.</div>}
        {other && <button className="chip" style={{ height: 36, maxWidth: "100%", alignSelf: "flex-start" }} onClick={onSwitch}><span className="muted" style={{ fontWeight: 700 }}>Or:</span> <span className="ell">{String(other.title || "").replace(/[.!]+$/, "")}</span></button>}
      </div>
    </>
  );
}

// Tonight / This weekend / This week as tabs over one carousel; More opens Explore on the active tab
function WhenTabs({ tabs, dark, today, onOpen, onMore }) {
  const avail = tabs.filter(([, , list]) => list.length);
  const [cur, setCur] = React.useState(null);
  if (!avail.length) return null;
  const active = avail.find(([k]) => k === cur) || avail[0];
  const [, label, list, patch] = active;
  return (
    <>
      <div className="sec-h" style={{ gap: 6 }}>
        <div className="row" role="tablist" aria-label="When" style={{ gap: 6, overflowX: "auto", flex: 1, minWidth: 0 }}>
          {avail.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={k === active[0]} onClick={() => setCur(k)}
              style={{ border: "none", background: "none", padding: "4px 6px", fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 20, color: k === active[0] ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", borderBottom: k === active[0] ? "3px solid var(--ink)" : "3px solid transparent" }}>{l}</button>
          ))}
        </div>
        <button className="chip" onClick={() => onMore(patch)} style={{ height: 32, flexShrink: 0 }} aria-label={"See all: " + label}>More <Icon name="chev" size={14} /></button>
      </div>
      <div className="hscroll" key={active[0]}>{list.map((ev) => <PosterCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</div>
    </>
  );
}

function renderHighlights(text, ids, data, onOpen) {
  text = text.replace(/\[\[[^\]]*$/, "").trim();
  const out = []; let last = 0, k = 0; const re = /\[\[(\d+)\|([^\]]+)\]\]/g; let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const ev = data.find((e) => e.id === ids[+m[1] - 1]);
    out.push(ev
      ? <button key={k++} onClick={() => onOpen(ev)} style={{ border: "none", background: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--line, #ccc)", textUnderlineOffset: 3, cursor: "pointer" }}>{m[2]}</button>
      : m[2]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Banner background for New York right now: the lead event's real photo, else a plain navy-to-coral wash
function CityBg({ ev }) {
  const img = useEventImage(ev || { id: "none" });
  const [broken, setBroken] = React.useState(false);
  if (ev && img?.src && !broken) return <img src={img.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} />;
  return <div style={{ height: 170, background: "linear-gradient(135deg, #1B1F3B 0%, #3A2F6B 55%, #E5533D 130%)" }} />;
}

// Section header: a title and one line saying what the section is for
function Head({ title, sub, right }) {
  return (
    <div className="sec-h" style={{ alignItems: "flex-end", gap: 10 }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <h2 style={{ lineHeight: 1.1 }}>{title}</h2>
        {sub && <span className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>{sub}</span>}
      </span>
      {right}
    </div>
  );
}

// Spotify-style tile for a curated list: colour, icon, title and count; tapping opens Explore filtered to it
function Tile({ t }) {
  return (
    <button onClick={t.open} style={{ gridColumn: t.big ? "1 / -1" : undefined, border: "none", borderRadius: 20, padding: "14px 14px 12px", background: t.color, color: "#fff", textAlign: "left", minHeight: t.big ? 112 : 104, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", right: -6, top: -6, opacity: 0.25 }} aria-hidden="true">
        {t.node ? <LIcon node={t.node} size={64} color="#fff" stroke={1.8} /> : t.icon ? React.createElement(t.icon, { size: 64, strokeWidth: 1.8 }) : null}
      </span>
      <span className="disp" style={{ fontSize: t.big ? 22 : 18, lineHeight: 1.08, maxWidth: "88%" }}>{t.title}</span>
      <span style={{ fontSize: 12.5, fontWeight: 800, opacity: 0.85 }}>{t.sub ? t.sub + " · " : ""}{t.n} {t.n > 1 ? "events" : "event"}</span>
    </button>
  );
}

// This week at a glance: one short row per day or moment, easy to skim
function Glance({ highlights, data, onOpen }) {
  const [all, setAll] = React.useState(false);
  const segs = (highlights.text || "").split(/\s*▫️?\s*/).map((x) => x.trim()).filter(Boolean);
  const rows = segs.length > 1 ? segs : [highlights.text];
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <div style={{ padding: "20px 20px 6px" }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)", marginBottom: 8 }}>This week at a glance</div>
      {highlights.text ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {shown.map((seg, i) => {
            const m = /^([^:\[]{2,22}):\s*([\s\S]*)$/.exec(seg);
            return (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                {m && <span style={{ flexShrink: 0, width: 62, fontSize: 12, fontWeight: 800, color: "var(--ink3)" }}>{m[1]}</span>}
                <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{renderHighlights(m ? m[2] : seg, highlights.ids, data, onOpen)}</span>
              </div>
            );
          })}
          {rows.length > 3 && <button onClick={() => setAll(!all)} style={{ alignSelf: "flex-start", border: "none", background: "none", padding: 0, fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{all ? "Show less" : "Show " + (rows.length - 3) + " more"}</button>}
        </div>
      ) : <p className="muted" style={{ margin: 0, fontSize: 14 }}>Writing your week's highlights…</p>}
    </div>
  );
}

// Around you right now: a live map of what is on or starting nearby; tap a pin for a preview, or go full size
function AroundMap({ evs, home, dark, today, onOpen, onFull }) {
  const [sel, setSel] = React.useState(null);
  const selEv = evs.find((e) => e.id === sel) || null;
  return (
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <LeafletMap events={evs} home={home} dark={dark} height={300} interactive rounded fit onPick={(e) => setSel(e.id)} selectedId={selEv?.id} zoom={14} />
        <button className="chip" onClick={onFull} style={{ position: "absolute", right: 10, top: 10, zIndex: 2, height: 34, background: "#fff", color: "#1B1F3B", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}><Icon name="map" size={15} /> Full map</button>
      </div>
      {selEv && <Peek key={selEv.id} inline ev={selEv} dark={dark} today={today} onOpen={onOpen} onClose={() => setSel(null)} />}
    </div>
  );
}

export default function Today({ tiles, onTile = () => {}, onFullMap = () => {}, cities = [], picks = [], goAsk, onGoAnswer = () => {}, together, setTogether, partnerName, data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing, highlights, weekPicks = [], eprof, hiddenCats = [], hiddenSubs = [], onHideCat, you, youOther, city, cityOther, onMore = () => {}, onYouSwitch, onYouFeedback, onCitySwitch, onYouOpen, onCityOpen }) {
  const [showAllNow, setShowAllNow] = React.useState(false);
  const g = greeting(new Date());
  const w = weather?.byDate?.[isoDay(today)];
  const { nowSoon, tonight, weekend, book, wildcard, total } = sections;
  const empty = !data.length;
  const A = React.useContext(ActionsCtx);
  topPickNow.ctx = A;
  const youHero = you?.list ? topPickNow(you.list, today) : null;
  const cityHero = city?.list ? topPickNow(city.list, today, youHero ? [youHero.id] : []) : null;

  // ── Home v8 (after Theo's feedback): five distinct sections, one card style, curated lists as tiles
  const now = nowMinutes();
  const notOver = (e) => { const em = endMinutes(e); return em == null || em > now; };
  const mapEvs = nowSoon.filter((e) => e.coord && !isImprecise(e));
  const byStart = (x, y) => (startMinutes(x) ?? 0) - (startMinutes(y) ?? 0);
  const savedNow = data.filter((e) => A.isSaved(e.id));
  const planToday = savedNow.filter((e) => evCovers(e, today) && notOver(e)).sort(byStart).slice(0, 10);
  const planNext = savedNow.filter((e) => !evCovers(e, today) && evStart(e) > today).sort((x, y) => evStart(x) - evStart(y) || byStart(x, y)).slice(0, 8);
  const mine = [...planToday, ...planNext];

  return (
    <div>
      <div className="row" style={{ padding: "calc(18px + env(safe-area-inset-top)) 20px 0", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          <Logo size={28} dark={dark} />
          <span className="disp" style={{ fontSize: 23, whiteSpace: "nowrap" }}>good plans</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {setTogether && (
            <button className="chip" aria-pressed={!!together} onClick={() => setTogether(!together)} aria-label={together ? "Together: picks for you and " + partnerName + ". Tap for just you" : "Just you. Tap for picks that suit you and " + partnerName}
              style={{ padding: "0 10px", ...(together ? { background: "var(--navy)", color: "var(--onnavy)", border: "none" } : {}) }}><LIcon node={together ? Users : User} size={16} color="currentColor" /></button>
          )}
          <button className="chip" onClick={() => setTab("me")} aria-label="Location settings"><Icon name="pin" size={15} /> {locLabel}</button>
        </div>
      </div>
      {goAsk && (
        <div className="card-sm" style={{ margin: "14px 16px 0", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>Did you go?</div>
            <div className="disp ell" style={{ fontSize: 16 }}>{goAsk.title}</div>
          </div>
          <button className="pill pill-dark" style={{ padding: "0 14px", height: 36 }} onClick={() => onGoAnswer(goAsk, "yes")}>Yes</button>
          <button className="pill pill-line" style={{ padding: "0 14px", height: 36 }} onClick={() => onGoAnswer(goAsk, "no")}>No</button>
          <button aria-label="Don't ask" onClick={() => onGoAnswer(goAsk, "skip")} style={{ border: "none", background: "none", padding: 4, color: "var(--ink3)" }}><Icon name="close" size={16} /></button>
        </div>
      )}
      <div style={{ padding: "18px 20px 6px" }}>
        <div className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{g.line}{w ? " · " + fmtT(w.hi) + (w.rainy ? " · rain later" : "") : ""}</div>
        <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 38, lineHeight: 1, letterSpacing: -0.6 }}>{g.title}</h1>
      </div>

      {empty && (
        <div className="card" style={{ margin: "8px 16px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="disp" style={{ fontSize: 22 }}>No events loaded yet</div>
          <div className="muted" style={{ fontSize: 15 }}>Pull the latest feed from your Apps Script backend.</div>
          <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh events"}</button>
        </div>
      )}

      {/* 1. This week at a glance: one short row per day */}
      {!empty && (highlights?.text || highlights?.status === "loading") && <Glance highlights={highlights} data={data} onOpen={onOpen} />}

      {/* 2. Your plans: saved only. Today first, then what is next, in the same row */}
      {!empty && mine.length > 0 && (
        <>
          <Head title={planToday.length ? "Your plans" : "Your next plans"} sub={planToday.length ? "What you saved for today, then what comes next." : "Nothing saved for today. Here is what is next."} />
          <div className="hscroll">{mine.map((ev) => <PosterCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</div>
        </>
      )}

      {/* 3. Around you right now: a map of what is on or starting nearby */}
      {!empty && (
        <>
          <Head title="Around you right now" sub={mapEvs.length ? "Tap a pin for a preview. Drag to look around." : "Nothing starting nearby in the next couple of hours."} />
          {mapEvs.length > 0 && <AroundMap evs={mapEvs} home={home} dark={dark} today={today} onOpen={onOpen} onFull={() => onFullMap(mapEvs.map((e) => e.id), "Around you right now")} />}
        </>
      )}

      {/* 4. For you: time tiles on top, then moods and picks; each says what drives it */}
      {!empty && tiles && (tiles.quick.length > 0 || tiles.lists.length > 0) && (
        <>
          <Head title="For you" sub="Pick a moment, or a mood. Each list tells you what it is built on." />
          {tiles.quick.length > 0 && (
            <div style={{ padding: "0 16px 10px", display: "grid", gridTemplateColumns: "repeat(" + tiles.quick.length + ", 1fr)", gap: 8 }}>
              {tiles.quick.map((t) => <QuickTile key={t.key} t={{ ...t, open: () => onTile(t) }} />)}
            </div>
          )}
          <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {tiles.lists.map((t, i) => <MoodTile key={t.key} big={t.big} wide={i === tiles.lists.length - 1 && !t.big && (tiles.lists.length - (tiles.lists[0]?.big ? 1 : 0)) % 2 === 1} t={{ ...t, open: () => onTile(t) }} />)}
          </div>
        </>
      )}

      {/* 5. New York right now: two or three things the city is doing this season */}
      {!empty && cities.length > 0 && (
        <>
          <Head title="New York right now" sub="What the city is up to this season." />
          <div className="hscroll">
            {cities.slice(0, 3).map((c) => (
              <button key={c.id} onClick={() => onTile({ title: String(c.title || "New York right now").replace(/[.!]+$/, ""), list: c.list })}
                style={{ width: cities.length === 1 ? "calc(100vw - 40px)" : 262, maxWidth: cities.length === 1 ? 520 : 262, flexShrink: 0, padding: 0, border: "none", background: "none", textAlign: "left", position: "relative", borderRadius: 22, overflow: "hidden" }}>
                <CityBg ev={c.list?.[0]} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,24,51,0) 25%, rgba(20,24,51,.88) 100%)" }} />
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#fff", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="row" style={{ gap: 8, alignItems: "center" }}>
                    {c.icon && React.createElement(c.icon, { size: 18, strokeWidth: 2.2 })}
                    <span className="disp" style={{ fontSize: 20, lineHeight: 1.05, opacity: c.writing ? 0.7 : 1 }}>{String(c.title || "").replace(/[.!]+$/, "")}</span>
                  </span>
                  {c.sub && <span style={{ fontSize: 12.5, lineHeight: 1.3, opacity: 0.9, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.sub}</span>}
                  <span style={{ fontSize: 12.5, fontWeight: 800 }}>{c.list.length} {c.list.length > 1 ? "events" : "event"} ›</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {!empty && (
        <div style={{ padding: "34px 20px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 14 }}>{data.length} events in your feed.</div>
          <button className="pill pill-line" onClick={() => setTab("explore")}>Explore everything</button>
        </div>
      )}
    </div>
  );
}
