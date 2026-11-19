import React, { useState, useContext } from "react";
import { favAt, markFavAt } from "./moodlog.js";
import { INTENTS, INTENT, intentEvents, intentCount, blend, bestIntent, joinMoods, primaryIntent, SOCIAL, SOCIAL_BY, applySocial } from "./intents.js";
import { markSeen } from "./moods2.js";
import * as T from "./telemetry.js";
import { ACT } from "./activities.js";
import { Logo, Icon, Glyph } from "./icons.jsx";
import { NotifyCtx, HeroCard, CompactCard, PosterCard, MiniCard, TravelMini, preciseLabel, shortWhen, actLabel, minsLabel, SectionHead, LeafletMap, CatBullet, ActionsCtx, Media, QuickTile, MoodTile, DotScroll, When, CardActions, PicOverlay } from "./components.jsx";
import { ThemePhoto } from "./themeArt.jsx";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { useEventImage } from "./images.js";
import { catColor, catIcon } from "./theme.js";
import { fmtT, startMinutes, endMinutes, nowMinutes, fmtClock, isFree, isoDay, whenLabel, eventWindow, canMake } from "./engine.js";
import { DAYS, MONTHS, evCovers, evStart, evEnd, runLen, nextOn, bookSoon, CATS, daysUntil, isImprecise } from "../lib/core.js";
import { collapseSeries } from "./dedupe.js";
import { Travel, catLabel } from "./components.jsx";
import { FAMILIES, FAM, CATEGORIES, CAT, SUBTYPES, famColor, evColor, LIcon, CatChip } from "./taxonomy.js";
import { User, Users, Maximize2 } from "lucide";

function greeting(d) {
  const h = d.getHours(), day = DAYS[d.getDay()];
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  const blurb = "Let's find what's around for you!";
  return { line: (day === "Sat" ? "Saturday" : day === "Sun" ? "Sunday" : day === "Fri" ? "Friday" : ["Monday", "Tuesday", "Wednesday", "Thursday"][d.getDay() - 1]) + " " + part, blurb };
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
  const list = inFam.filter((e) => (!curCat || e.ncat === curCat) && !xcats.includes(e.ncat) && (!curSub || e.nsub === curSub) && !(e.nsub && xsubs.includes(e.nsub))).sort((a, b) => (b.rk ?? b.sc) - (a.rk ?? a.sc));
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
      <DotScroll key={active[0]}>{list.map((ev) => <PosterCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</DotScroll>
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
function Glance({ highlights, data, onOpen, quick = [], onTile }) {
  // Each AI blurb goes next to the time tile it talks about (Tonight/Today, Tomorrow, Weekend, This/Next week)
  const segs = (highlights.text || "").split(/\s*▫️?\s*/).map((x) => x.trim()).filter(Boolean);
  const slot = (label) => { const l = label.toLowerCase(); return /tonight|today/.test(l) ? "today" : /tomorrow/.test(l) ? "tomorrow" : /weekend|saturday|sunday/.test(l) ? "weekend" : /week/.test(l) ? "week" : null; };
  const blurbs = {};
  segs.forEach((seg) => { const m = /^([^:\[]{2,22}):\s*([\s\S]*)$/.exec(seg); const k = m ? slot(m[1]) : null; if (k && !blurbs[k]) blurbs[k] = m[2]; });
  const keyOf = (t) => (t.key === "tonight" ? "today" : t.key);
  if (!quick.length) return null;
  return (
    <div>
      <Head title="This week's picks" />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {quick.filter((t) => t.key !== "week").map((t) => { const bl = blurbs[keyOf(t)]; return (
          <div key={t.key} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <button onClick={() => onTile(t)} style={{ flexShrink: 0, width: 76, height: 76, border: "none", borderRadius: 16, padding: "8px 8px 7px", background: t.color, color: "#fff", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{t.key === "weekend" ? "Weekend" : t.key === "week" ? "This week" : t.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{t.n} {t.n > 1 ? "events" : "event"}</span>
            </button>
            <span style={{ flex: 1, minWidth: 0, paddingTop: 2, display: "flex", flexDirection: "column", gap: 3 }}>
              {bl ? bl.split(/\s*(?:\/|;|·|,? and )\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 3).map((x, n) => (
                <span key={n} className="ell" style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink2)", whiteSpace: "nowrap" }}>• {renderHighlights(x, highlights.ids, data, onOpen)}</span>
              )) : <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{highlights.status === "loading" ? "Picking highlights…" : "Tap to see what's on."}</span>}
            </span>
          </div>
        ); })}
      </div>
    </div>
  );
}

// Around you right now: a live map of what is on or starting nearby; tap a pin for a preview, or go full size
// One-line event rows: a lead mark (number or bookmark), icon, time, activity, travel; tap to open
function EventRows({ evs, today, dark, onOpen, lead, max = 3, moreLabel, onMore, toggle }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? evs : evs.slice(0, max);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {shown.map((e, k) => (
        <button key={e.id} onClick={() => onOpen(e)} className="row" style={{ gap: 10, padding: "8px 4px", border: "none", background: "none", color: "var(--ink)", textAlign: "left", borderTop: k ? "1px solid var(--line, rgba(128,128,128,.18))" : "none" }}>
          {lead(e, k)}
          <CatBullet ev={e} size={20} dark={dark} />
          <span className="ell" style={{ flex: 1, minWidth: 0, fontSize: 13.5, whiteSpace: "nowrap" }}><span style={{ fontWeight: 700 }}>{shortWhen(e, today)}</span><span style={{ color: "var(--ink2)" }}>{" · " + e.title}</span></span>
          <span style={{ fontSize: 12.5 }}><TravelMini ev={e} size={13} /></span>
        </button>
      ))}
      {(evs.length > max || (toggle && evs.length > 3)) && <button onClick={() => (onMore ? onMore() : setAll(!all))} style={{ alignSelf: "flex-start", border: "none", background: "none", padding: "6px 4px 0", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>{onMore ? moreLabel || "See all" : all ? "Show less" : "Show " + (evs.length - max) + " more"}</button>}
    </div>
  );
}

// The shortest name we have for what the event is (activity, sub-type or category)
const shortName = (e) => { const c = [e.act && ACT[e.act]?.label, e.nsub, e.ncat || e.cat].filter(Boolean).map((x) => String(x)); const t = c.sort((a, b) => a.length - b.length)[0] || ""; return t ? t[0].toUpperCase() + t.slice(1) : ""; };

export function AroundMap({ evs, home, dark, today, onOpen, onFull, height = 320, legend }) {
  const [sel, setSel] = React.useState(null);
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [evs.map((e) => e.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.ceil(evs.length / 3), shown = legend ? evs.slice(page * 3, page * 3 + 3) : evs;
  const ev = evs.find((e) => e.id === sel) || null;
  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ position: "relative" }}>
        <LeafletMap events={shown} numberOffset={legend ? page * 3 : 0} home={home} dark={dark} height={height} interactive twoFinger rounded fit onPick={(e) => setSel(e.id)} selectedId={ev?.id} zoom={14} numbered={legend} pinColor={legend ? (e) => primaryIntent(e)?.color || evColor(e, dark) : undefined} />
        <button onClick={onFull} aria-label="Open the full map" style={{ position: "absolute", right: 10, top: 10, zIndex: 4, width: 38, height: 38, borderRadius: 19, border: "none", background: "#fff", color: "#1B1F3B", boxShadow: "0 2px 8px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}><LIcon node={Maximize2} size={18} color="#1B1F3B" /></button>
        {ev && (
          <div role="button" tabIndex={0} onClick={() => onOpen(ev)} style={{ position: "absolute", left: 10, right: 10, bottom: 10, zIndex: 4, background: "var(--card)", borderRadius: 20, padding: 8, display: "flex", gap: 10, boxShadow: "0 8px 24px rgba(20,24,51,.35)", cursor: "pointer" }}>
            <div style={{ width: 92, flexShrink: 0, position: "relative" }}><Media ev={ev} dark={dark} height={96} radius={14} hideTitle /><PicOverlay ev={ev} size={26} /></div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, paddingRight: 28 }}>
              <span className="ell muted" style={{ fontSize: 12, fontWeight: 700 }}>{ev.ncat || ev.cat}{ev.venue ? " · " + ev.venue.split(",")[0] : ""}</span>
              <span className="disp clamp2" style={{ fontSize: 16, lineHeight: 1.1 }}>{ev.title}</span>
              <span className="row" style={{ gap: 8, fontSize: 12.5, minWidth: 0 }}><When text={whenLabel(ev, today)} /><span style={{ color: "var(--ink3)" }}><Travel tt={ev.tt} /></span></span>
              <div className="row" style={{ marginTop: "auto", justifyContent: "flex-end" }}><CardActions ev={ev} size={26} noSave /></div>
            </div>
            <button aria-label="Close preview" onClick={(e) => { e.stopPropagation(); setSel(null); }} style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 14, border: "none", background: "var(--chip)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} /></button>
          </div>
        )}
      </div>
      {legend && (
        <div style={{ marginTop: 10 }}>
          {shown.map((e, k) => { const lab = preciseLabel(e); return (
            <button key={e.id} onClick={() => onOpen(e)} className="row" style={{ width: "100%", gap: 10, padding: "8px 4px", border: "none", background: "none", color: "var(--ink)", textAlign: "left", borderTop: k ? "1px solid var(--line, rgba(128,128,128,.18))" : "none" }}>
              <span style={{ width: 14, flexShrink: 0, fontSize: 13, fontWeight: 700, color: "var(--ink3)", textAlign: "right" }}>{page * 3 + k + 1}</span>
              <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 400, color: evColor(e, dark), maxWidth: 104, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lab}</span>
              <span className="ell" style={{ flex: 1, minWidth: 0, fontSize: 13.5, whiteSpace: "nowrap", color: "var(--ink2)" }}><span style={{ fontWeight: 600, color: "var(--ink)" }}>{shortWhen(e, today)}</span>{" · " + e.title}</span>
              <span style={{ fontSize: 12.5 }}><TravelMini ev={e} size={13} /></span>
            </button>
          ); })}
          {pages > 1 && (
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 4px 0" }}>
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="row" style={{ gap: 4, border: "none", background: "none", padding: 0, fontSize: 13, fontWeight: 800, color: "var(--ink2)", opacity: page === 0 ? 0.3 : 1 }}><Icon name="back" size={14} />Previous</button>
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>{page * 3 + 1}–{Math.min(evs.length, page * 3 + 3)} of {evs.length}</span>
              <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="row" style={{ gap: 4, border: "none", background: "none", padding: 0, fontSize: 13, fontWeight: 800, color: "var(--ink2)", opacity: page >= pages - 1 ? 0.3 : 1 }}>Next 3<Icon name="chev" size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const NY_TINT = [["#7C2D12", "Season"], ["#1E3A8A", "Neighbourhood"], ["#0F766E", "Weather"]];
function NYCard({ c, tint, label, onTile, height = 150, half, full }) {
  const [r, g, bl] = [parseInt(tint.slice(1, 3), 16), parseInt(tint.slice(3, 5), 16), parseInt(tint.slice(5, 7), 16)];
  return (
    <button onClick={() => onTile({ title: String(c.title || "New York right now").replace(/[.!]+$/, ""), list: c.list, color: tint, icon: c.icon, teaser: c.facts || c.sub, verb: label, intro: c.intro, kind: c.kind })}
      style={{ flex: half ? "0 0 calc((100vw - 44px) / 2)" : full ? "0 0 calc(100vw - 32px)" : "0 0 100%", width: half ? "calc((100vw - 44px) / 2)" : full ? "calc(100vw - 32px)" : "100%", flexShrink: 0, scrollSnapAlign: "start", padding: 0, border: "none", background: "none", textAlign: "left", position: "relative", borderRadius: 20, overflow: "hidden", display: "block" }}>
      <div style={{ filter: "saturate(.85)" }}><ThemePhoto id={c.id} name={c.name || c.theme || ""} height={height} /></div>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(${r},${g},${bl},.10) 0%, rgba(${r},${g},${bl},.35) 35%, rgba(8,10,26,.9) 100%)` }} />
      <span style={{ position: "absolute", top: 10, right: 10, padding: "3px 10px", borderRadius: 12, background: "rgba(255,255,255,.2)", color: "#fff", fontSize: 12, fontWeight: 800, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>{c.list.length} {c.list.length > 1 ? "events" : "event"}</span>
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 11, color: "#fff", display: "flex", flexDirection: "column", gap: 2, textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>
        <span className="row" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
          {c.icon && React.createElement(c.icon, { size: 20, strokeWidth: 2.2, style: { flexShrink: 0 } })}
          <span className="disp" style={{ fontSize: half ? 16.5 : 21, lineHeight: 1.1, whiteSpace: half ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: c.writing ? 0.85 : 1 }}>{String(c.title || "").replace(/[.!]+$/, "")}</span>
        </span>
        {c.sub && !half && <span style={{ fontSize: 13, lineHeight: 1.25, opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sub}</span>}
      </div>
    </button>
  );
}

// One row: a small label and page dots, then a one-card-at-a-time carousel (no edge of the next card)
function NYRow({ row, ri, onTile }) {
  const [tint, label] = NY_TINT[Math.min(ri, 2)];
  if (ri === 0) return <DotScroll>{row.items.map((c) => <NYCard key={c.id} c={c} tint={tint} label={label} onTile={onTile} height={230} full />)}</DotScroll>;
  return <DotScroll>{row.items.map((c) => <NYCard key={c.id} c={c} tint={tint} label={label} onTile={onTile} height={150} half />)}</DotScroll>;
}


// In the mood for…: one or several intentions; the pick reshapes "Best for you right now" and opens a full mood page
// I'm in the mood to…: your own order (long-press a tile, then drag it); the ones you put first also teach your taste
function IntentChips({ data, today, sel, put, onOrder, favs, toggleFav: toggleFav0 }) {
  const rowRef = React.useRef(null), btns = React.useRef({}), timer = React.useRef(null), dragRef = React.useRef(null), moved = React.useRef(false), start = React.useRef(null);
  const counts = React.useMemo(() => Object.fromEntries(INTENTS.map((i) => [i.id, intentCount(data, i.id, today)])), [data, today]);
  const [order, setOrder] = useState(() => { try { const o = JSON.parse(localStorage.getItem("gp_intent_order") || "null"); if (Array.isArray(o)) return [...o.filter((id) => INTENT[id]), ...INTENTS.map((i) => i.id).filter((id) => !o.includes(id))]; } catch { /* none */ } return INTENTS.map((i) => i.id); });
  const [drag, setDrag] = useState(null);
  const orderRef = React.useRef(order); orderRef.current = order;
  const reorderAt = (x) => {
    const o0 = orderRef.current, cur = o0.indexOf(dragRef.current);
    const target = o0.findIndex((id) => { const r = btns.current[id]?.getBoundingClientRect(); return r && r.width && x >= r.left && x <= r.right; });
    if (target >= 0 && target !== cur) { const o = o0.slice(); o.splice(cur, 1); o.splice(target, 0, dragRef.current); orderRef.current = o; setOrder(o); }
  };
  const begin = (id, x, y) => { moved.current = false; start.current = { x, y }; clearTimeout(timer.current); timer.current = setTimeout(() => { dragRef.current = id; setDrag(id); navigator.vibrate?.(15); }, 380); };
  const finish = () => { clearTimeout(timer.current); start.current = null; if (dragRef.current) { try { localStorage.setItem("gp_intent_order", JSON.stringify(orderRef.current)); } catch { /* full */ } onOrder?.(orderRef.current); setTimeout(() => { dragRef.current = null; }, 0); setDrag(null); } };
  // Touch: native listeners so the row's scroll can be stopped once the long press has picked a tile up
  React.useEffect(() => {
    const el = rowRef.current; if (!el) return;
    const tm = (e) => {
      const t = e.touches[0]; if (!t) return;
      if (!dragRef.current) { const s0 = start.current; if (s0 && Math.hypot(t.clientX - s0.x, t.clientY - s0.y) > 8) { clearTimeout(timer.current); start.current = null; } return; }
      if (e.cancelable) e.preventDefault();
      moved.current = true; reorderAt(t.clientX);
      const r = el.getBoundingClientRect(); if (t.clientX < r.left + 30) el.scrollLeft -= 8; else if (t.clientX > r.right - 30) el.scrollLeft += 8;
    };
    const te = () => finish();
    el.addEventListener("touchmove", tm, { passive: false }); el.addEventListener("touchend", te); el.addEventListener("touchcancel", te);
    return () => { el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", te); el.removeEventListener("touchcancel", te); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Mouse (desktop): the same with pointer events
  const pd = (id) => (e) => { if (e.pointerType === "mouse") begin(id, e.clientX, e.clientY); };
  const pm = (e) => { if (e.pointerType !== "mouse") return; if (!dragRef.current) { clearTimeout(timer.current); return; } moved.current = true; reorderAt(e.clientX); };
  const pu = (e) => { if (e.pointerType === "mouse") finish(); };
  // Favourite moods (heart) stay on the left, right after the active one
  const toggleFav = (id) => { const f = toggleFav0(id); onOrder?.([...orderRef.current.filter((x) => f.includes(x)), ...orderRef.current.filter((x) => !f.includes(x))]); };
  let shown = order.map((id) => INTENT[id]).filter((it) => counts[it.id] || sel.includes(it.id) || favs.includes(it.id));
  if (!drag) {
    const first = (it) => (it.id === sel[0] ? 0 : favs.includes(it.id) ? 1 : 2);
    shown = shown.map((it, i) => [it, i]).sort((a, b) => first(a[0]) - first(b[0]) || a[1] - b[1]).map(([it]) => it);
  }
  return (
    <div id="tour-moods" style={{ margin: "2px 0 0" }}>
      <div className="row" style={{ padding: "0 20px 8px", justifyContent: "space-between", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}><span>{drag ? "Drag to reorder" : "I'm in the mood for…"}</span>{sel.length > 0 && !drag && <button onClick={() => put([])} style={{ border: "none", background: "none", color: "var(--ink2)", fontSize: 12, fontWeight: 800, padding: 0, letterSpacing: 0.4, textTransform: "none" }}>Clear</button>}</div>
      <div ref={rowRef} className="hscroll" style={{ gap: 6, padding: "0 16px 2px" }} onPointerMove={pm} onPointerUp={pu}>
        {shown.map((it) => { const on = sel.includes(it.id), dragging = drag === it.id; return (
          <div role="button" tabIndex={0} key={it.id} ref={(el) => { btns.current[it.id] = el; }} aria-pressed={on} onKeyDown={(e) => { if (e.key === "Enter") put(on ? [] : [it.id]); }} onPointerDown={pd(it.id)} onTouchStart={(e) => begin(it.id, e.touches[0].clientX, e.touches[0].clientY)} onContextMenu={(e) => e.preventDefault()}
            onClick={() => { if (moved.current || dragRef.current) { moved.current = false; return; } put(on ? [] : [it.id]); }}
            style={{ position: "relative", cursor: "pointer", width: 82, height: 70, flexShrink: 0, borderRadius: 16, border: "1.5px solid " + (on ? it.color : "var(--line, rgba(128,128,128,.25))"), background: on ? it.color : "var(--card)", color: on ? "#fff" : "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 4px", fontSize: 12.5, fontWeight: 700, lineHeight: 1.1, textAlign: "center", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: drag ? "none" : "pan-x", transform: dragging ? "scale(1.08)" : drag ? "scale(.96)" : "none", boxShadow: dragging ? "0 8px 20px rgba(20,24,51,.25)" : "none", transition: "transform .12s, box-shadow .12s", zIndex: dragging ? 2 : 0 }}>
            <button aria-label={(favs.includes(it.id) ? "Remove " : "Add ") + it.label + (favs.includes(it.id) ? " from favourites" : " to favourites")} aria-pressed={favs.includes(it.id)}
              onClick={(e) => { e.stopPropagation(); toggleFav(it.id); }} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
              style={{ position: "absolute", top: 1, right: 1, width: 26, height: 26, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: on ? "#fff" : "var(--ink)", opacity: favs.includes(it.id) ? 0.5 : 0.3 }}>
              <Icon name="heart" size={12} fill={favs.includes(it.id) ? "currentColor" : "none"} />
            </button>
            {React.createElement(it.icon, { size: 20, strokeWidth: 2.2, color: on ? "#fff" : it.color })}{it.label}
          </div>
        ); })}
      </div>
    </div>
  );
}

// For you impressions: { day: "YYYY-MM-DD", n: { id: days shown } }, kept 3 weeks; opening or saving an event resets it
const FY_KEY = "gp_foryou_seen_v1";
// counts only earlier days, so today's ranking doesn't shift as it's being shown
function foryouSeen() { try { const st = JSON.parse(localStorage.getItem(FY_KEY)) || {}; const n = { ...(st.n || {}) }; (st.ids || []).forEach((id) => { if (n[id]) n[id]--; }); return n; } catch { return {}; } }
function markForyouSeen(ids, today) {
  try {
    const day = isoDay(today), st = JSON.parse(localStorage.getItem(FY_KEY) || "{}");
    if (!ids.length || st.day === day) return;
    const n = st.n || {}, seenAt = st.at || {};
    ids.forEach((id) => { n[id] = (n[id] || 0) + 1; seenAt[id] = day; });
    const cut = isoDay(new Date(today.getTime() - 21 * 86400000));
    Object.keys(seenAt).forEach((id) => { if (seenAt[id] < cut) { delete seenAt[id]; delete n[id]; } });
    localStorage.setItem(FY_KEY, JSON.stringify({ day, ids, n, at: seenAt }));
  } catch { /* storage off */ }
}
export function clearForyouSeen(id) { try { const st = JSON.parse(localStorage.getItem(FY_KEY) || "{}"); if (st.n && st.n[id]) { delete st.n[id]; localStorage.setItem(FY_KEY, JSON.stringify(st)); } } catch { /* storage off */ } }

const BellMini = ({ t, nc, light }) => {
  if (!nc) return null;
  const on = !!nc.bells[t.key];
  return <button aria-label={on ? "Stop notifications for " + t.title : "Notify me about new " + t.title} aria-pressed={on} onClick={(e) => { e.stopPropagation(); nc.toggle(t); }} style={{ position: "absolute", top: 1, left: 1, width: 26, height: 26, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: light ? "#fff" : "var(--ink)", opacity: on ? 1 : 0.45 }}><Icon name="bell" size={12} fill={on ? "currentColor" : "none"} /></button>;
};
export default function Today({ onIntentOrder, userName = "", tiles, moodFav = [], moodClicks = {}, moodHide = [], onMoodDrop, nyRows = [], moodFb = {}, onMoodFb, onMoodFav,  onTile = () => {}, onFullMap = () => {}, cities = [], picks = [], goAsk, onGoAnswer = () => {}, data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing, highlights, weekPicks = [], eprof, hiddenCats = [], hiddenSubs = [], onHideCat, you, youOther, city, cityOther, onMore = () => {}, onYouSwitch, onYouFeedback, onCitySwitch, onYouOpen, onCityOpen }) {
  const nc = useContext(NotifyCtx);
  const [intentSel, setIntentSel] = useState(() => { try { return JSON.parse(sessionStorage.getItem("gp_intent_sel") || "[]").slice(0, 1); } catch { return []; } });
  const putIntent = (x) => { setIntentSel(x); try { sessionStorage.setItem("gp_intent_sel", JSON.stringify(x)); } catch { /* private */ } };
  // Who with: Anyone (null) · Date · Meet people. Reranks For you, the mood lists and Top picks; not a mood.
  const [social, setSocial] = useState(() => { try { return sessionStorage.getItem("gp_social") || null; } catch { return null; } });
  const putSocial = (x) => { setSocial(x); try { if (x) sessionStorage.setItem("gp_social", x); else sessionStorage.removeItem("gp_social"); } catch { /* private */ } };
  const socialTag = social ? " · " + SOCIAL_BY[social].label : "";
  const intentAll = React.useMemo(() => applySocial(intentEvents(data || [], intentSel, today), social), [data, intentSel, today, social]);
  const intentTitle = joinMoods(intentSel);
  const topAll = React.useMemo(() => applySocial((data || []).filter((e) => daysUntil(e, today) >= 0).slice().sort((a, b) => (b.rk ?? b.sc ?? 0) - (a.rk ?? a.sc ?? 0)), social), [data, today, social]);
  const [discN, setDiscN] = useState(6);
  const [favRows, setFavRows] = useState(3);
  // Favourite moods (hearts on the mood tiles)
  const [moodFavs, setMoodFavs] = useState(() => { try { const f = JSON.parse(localStorage.getItem("gp_intent_fav") || "[]"); return Array.isArray(f) ? f.filter((id) => INTENT[id]) : []; } catch { return []; } });
  React.useEffect(() => { const on = () => { try { const f = JSON.parse(localStorage.getItem("gp_intent_fav") || "[]"); if (Array.isArray(f)) setMoodFavs(f.filter((id) => INTENT[id])); } catch { /* none */ } }; window.addEventListener("gp-moodfav", on); return () => window.removeEventListener("gp-moodfav", on); }, []);
  const toggleMoodFav = (id) => { if (!moodFavs.includes(id) && INTENT[id]) nc?.offer?.({ key: "mood-" + id, title: INTENT[id].label, cats: INTENT[id].cats || [], acts: INTENT[id].acts || [], list: [] }); markFavAt("mood:" + id, !moodFavs.includes(id)); const f = moodFavs.includes(id) ? moodFavs.filter((x) => x !== id) : [...moodFavs, id]; setMoodFavs(f); try { localStorage.setItem("gp_intent_fav", JSON.stringify(f)); window.dispatchEvent(new Event("gp-moodfav")); } catch { /* full */ } return f; };
  const favList = React.useMemo(() => { const all = [...(tiles?.all || []), ...(tiles?.every || [])]; return moodFav.slice().reverse().map((k) => all.find((t) => t.key === k)).filter(Boolean).map((t) => { const b = t.list?.length ? primaryIntent(t.list[0]) : null; return b ? { ...t, color: b.color, mid: b.id } : t; }); }, [tiles, moodFav]);
  // My Interests: hearted moods and activities in one row set, last hearted first (no grouping by mood).
  // Entries hearted before heart times were kept fall back to their order in the saved lists (newest last there).
  const favFlat = React.useMemo(() => {
    const at = favAt();
    const items = [
      ...moodFavs.map((id, i) => ({ kind: "mood", key: "mood:" + id, id, mood: INTENT[id], ord: i })),
      ...favList.map((t, i) => ({ kind: "tile", key: t.key, t, mood: t.mid ? INTENT[t.mid] : null, ord: favList.length - 1 - i })),
    ].filter((x) => x.kind === "tile" || x.mood);
    return items.sort((a, b) => (at[b.key] || 0) - (at[a.key] || 0) || b.ord - a.ord);
  }, [favList, moodFavs]);
  // Discover: the activities you're most likely to want now. Picked moods lift what fits them; they don't filter.
  const discover = React.useMemo(() => {
    const gens = (tiles?.all || []).filter((t) => /^gen-(act|sub|term|cut)-/.test(t.key) && t.list?.length);
    const rest = (tiles?.all || []).filter((t) => t.list?.length && !/^gen-(act|sub|term|cut)-/.test(t.key));
    const ranked = gens.map((t, i) => {
      const fit = intentSel.length ? t.list.reduce((a, e) => a + Math.min(1, blend(e, intentSel)), 0) / t.list.length : 0;
      return [t, i - 8 * fit];
    }).sort((a, b) => a[1] - b[1]).map(([t]) => t);
    return [...ranked, ...rest].map((t) => { const b = primaryIntent(t.list[0]) || bestIntent(t.list); return b ? { ...t, title: t.short || t.title, verb: b.label, color: b.color } : { ...t, title: t.short || t.title }; });
  }, [tiles, intentSel]);
  // Keep the row steady while you use it: a heart (which lifts that tile in the ranking) must not move or drop it
  const discOrder = React.useRef({ sel: "", keys: [], frozen: false });
  const discoverShown = React.useMemo(() => {
    const sel = intentSel.join();
    if (discOrder.current.sel !== sel) discOrder.current = { sel, keys: [], frozen: false };
    if (!discOrder.current.frozen) { discOrder.current.keys = discover.map((t) => t.key); return discover; }
    const by = new Map(discover.map((t) => [t.key, t]));
    const kept = discOrder.current.keys.filter((k) => by.has(k)).map((k) => by.get(k));
    const keptSet = new Set(kept.map((t) => t.key));
    const out = [...kept, ...discover.filter((t) => !keptSet.has(t.key))];
    discOrder.current.keys = out.map((t) => t.key);
    return out;
  }, [discover]); // eslint-disable-line react-hooks/exhaustive-deps
  // Impressions for the mood stats: what Discover actually shows
  React.useEffect(() => { const ks = discover.slice(0, discN).filter((t) => /^gen-/.test(t.key)); if (ks.length) markSeen(ks, today); }, [discover, discN]); // eslint-disable-line react-hooks/exhaustive-deps
  const intentWithin = React.useMemo(() => { const m = {}; intentAll.forEach((e) => { if (e.act && ACT[e.act]) (m[e.act] = m[e.act] || []).push(e); }); return Object.entries(m).filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 10); }, [intentAll]);
  // Best for you right now: what is still to come today (or on now), else tomorrow, by your score, sooner first on ties
  // Best for you: everything still to come, ranked by your score with a gentle preference for sooner; the carousel loads more as you scroll
  // For you: if the app could show only four things right now, which four? Taste score × how soon × how rare the chance is.
  // Things on every day for weeks are always "today", so they only rise when they're about to close ("Last chance");
  // otherwise they're fallback. Picks shown on earlier days and ignored fade, and the top four avoid repeating a category.
  // "Show me four others": the four on screen step aside until the app is reopened
  const [shuf, setShuf] = useState([]);
  const bestAll = React.useMemo(() => {
    const now = nowMinutes(), t0 = today.getTime();
    const seen = foryouSeen();
    const scored = [];
    (data || []).forEach((e) => {
      // next day it's on (today counts only if it's still worth heading out)
      let nx = nextOn(e, today);
      if (nx && +nx === t0) { const st = startMinutes(e), en = endMinutes(e); if (!(st == null || st >= now - 20 || (en != null && en > now + 30))) nx = nextOn(e, new Date(t0 + 86400000)); }
      if (!nx) return;
      if (intentSel.length && blend(e, intentSel) < 0.45) return;
      if (shuf.includes(e.id)) return;
      const d = Math.round((+nx - t0) / 86400000);
      const left = Math.round((+evEnd(e) - t0) / 86400000), len = runLen(e);
      const soon = d === 0 ? 1 : d === 1 ? 0.9 : Math.max(0.45, 0.93 ** d * 0.9);
      // how rare the chance is
      let rare = 1;
      if (len <= 1) rare = 1.08;                       // one date only
      else if (len <= 4) rare = 1.02;                  // a few days
      else if (e.recurring) rare = 0.8;                // comes back every week
      else if (left <= 3) rare = 1.12;                 // long run about to close: last chance
      else if (left <= 7) rare = 0.95;
      else if (left <= 14) rare = 0.72;
      else rare = 0.5;                                 // on for weeks more: fallback
      const fatigue = Math.max(0.55, 0.85 ** (seen[e.id] || 0));
      const fit = intentSel.length ? 0.55 + 0.45 * Math.min(1, blend(e, intentSel)) : 1;
      const base = (e.rk ?? e.sc ?? 0) * rare * fatigue * fit; // rk: the shared ranking (rank.js) — taste, moods, moment, quality
      scored.push([e, base * soon, len > 4 && !e.recurring && left > 3, base, d, left]);
    });
    scored.sort((a, b) => b[1] - a[1]);
    const titles = new Set();
    const uniq = applySocial(scored.map(([e]) => e), social).filter((e) => { const k = String(e.title || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24); if (titles.has(k)) return false; titles.add(k); return true; });
    const info = new Map(scored.map(([e, v, long, base, d, left]) => [e.id, { v, long, base, d, left }]));
    // Four slots, each filled with its own best pick and labelled on the card:
    // 1 today · 2 tomorrow · 3 the coming weekend (on Sat/Sun: the rest of the week) · 4 on your radar
    // (3+ days out, ticket or RSVP, one you'd love). A slot with nothing good enough (under 60% of the best
    // pick overall) gives its place to the best remaining pick. Same category or activity twice loses 20%;
    // at most one long run unless it's closing.
    const dow = today.getDay();
    const later = (n) => new Date(t0 + n * 86400000);
    // each event competes for the slot of its next date, so something on every day can't show up twice as "on now"
    const slotOffs = dow === 6 || dow === 0
      ? [2, 3, 4, 5, 6]                                              // weekend now: the week ahead
      : [2, 3, 4, 5, 6].filter((n) => [6, 0].includes(later(n).getDay())); // Fri: Sunday
    const scs = uniq.map((e) => e.sc || 0).sort((x, y) => y - x);
    const loveBar = Math.max(60, scs[Math.floor(scs.length * 0.15)] || 0);
    const slots = [
      (e) => info.get(e.id).d === 0,
      (e) => info.get(e.id).d === 1,
      (e) => slotOffs.includes(info.get(e.id).d),
      (e) => { const i = info.get(e.id); return i.d >= 3 && i.d <= 60 && !i.long && (e.ticket === true || bookSoon(e, today)) && (e.sc || 0) >= loveBar; },
    ];
    const best = Math.max(0, ...uniq.slice(0, 40).map((e) => info.get(e.id).base));
    const top = [], used = new Set(), cats = {}, acts = {};
    let longs = 0;
    const adj = (e, v) => v * 0.8 ** ((cats[e.ncat || e.cat] || 0) + (e.act && acts[e.act] || 0)) * (info.get(e.id).long && longs >= 1 ? 0.4 : 1);
    const labels = new Map();
    const weekendWord = dow === 6 || dow === 0 ? "This week" : "This weekend";
    // "Book ahead": the radar slot — further out, needs a ticket or RSVP, and one you'd love
    const LABEL = ["Best today", "Best tomorrow", weekendWord, "Book ahead"];
    const labelOf = (e) => { const d = info.get(e.id).d; return d === 0 ? LABEL[0] : d === 1 ? LABEL[1] : slotOffs.includes(d) ? LABEL[2] : "Coming up"; };
    const take = (e, k) => { labels.set(e.id, k != null ? LABEL[k] : labelOf(e)); top.push(e); used.add(e.id); cats[e.ncat || e.cat] = (cats[e.ncat || e.cat] || 0) + 1; if (e.act) acts[e.act] = (acts[e.act] || 0) + 1; if (info.get(e.id).long) longs++; };
    const pick = (ok, key) => { let bi = null, bv = -1; for (const e of uniq) { if (used.has(e.id) || !ok(e)) continue; const v = adj(e, info.get(e.id)[key]); if (v > bv) { bv = v; bi = e; } } return [bi, bv]; };
    const open = [];
    slots.forEach((ok, k) => { const [e, v] = pick(ok, "base"); if (e && v >= best * 0.6) take(e, k); else open.push(k); });
    // fill-ins: best remaining pick, preferring a day the other cards don't cover yet
    open.forEach(() => {
      const days = new Set(top.map((x) => info.get(x.id).d));
      let bi = null, bv = -1;
      for (const e of uniq) { if (used.has(e.id)) continue; const i = info.get(e.id); const v = adj(e, i.base) * (days.has(i.d) ? 0.6 : 1) * (i.d > 14 ? 0.8 : 1); if (v > bv) { bv = v; bi = e; } }
      if (bi) take(bi);
    });
    // keep the slot order for display: today, tomorrow, weekend, radar (fill-ins slot in where they're dated)
    top.sort((x, y) => info.get(x.id).d - info.get(y.id).d);
    const rest = uniq.filter((e) => !used.has(e.id));
    const out = [...top, ...rest]; out.labels = labels;
    return out;
  }, [data, today, intentSel, social, moodFavs, shuf]);
  // Remember what headed For you today (once per day per event), so ignored picks fade on later days
  // (waits until the list has settled, so a half-loaded feed isn't what gets recorded)
  React.useEffect(() => { if (intentSel.length || social) return undefined; const ids = bestAll.slice(0, 4).map((e) => e.id); const top4 = bestAll.slice(0, 4); const t = setTimeout(() => { markForyouSeen(ids, today); top4.forEach((e, i) => T.track("fy", e, { s: "foryou", p: i })); }, 8000); return () => clearTimeout(t); }, [bestAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const [bestN, setBestN] = useState(10);
  React.useEffect(() => setBestN(10), [intentSel.join(), social]); // eslint-disable-line react-hooks/exhaustive-deps
  const bestNow = bestAll.slice(0, bestN);
  const [moreN, setMoreN] = useState(0);
  // My moods: pinned ones (newest first), then the lists you open most (recent opens count more); four at most
  const pool = tiles ? (tiles.every || tiles.all) : [];
  const byKey = (k) => pool.find((t) => t.key === k);
  const scoreOf = ([, v]) => v.n * Math.pow(0.9, (Date.now() - v.at) / 86400000);
  const myMoods = (() => {
    const pinned = [...moodFav].reverse().map(byKey).filter(Boolean);
    const used = new Set(pinned.map((t) => t.key));
    const often = Object.entries(moodClicks).filter(([k]) => !used.has(k) && !moodHide.includes(k)).sort((a, b) => scoreOf(b) - scoreOf(a)).map(([k]) => byKey(k)).filter(Boolean);
    return [...pinned, ...often].slice(0, 4);
  })();
  const myKeys = new Set(myMoods.map((t) => t.key));
  const allT = tiles ? tiles.all.filter((t) => !myKeys.has(t.key)) : [];
  const nShow = tiles ? tiles.base + 4 * moreN : 0;
  // Endless: once every list has been shown, the sequence starts over from a shifted position
  const shownMoods = allT.length ? Array.from({ length: Math.min(nShow, allT.length) }, (_, i) => allT[(i + (nShow > allT.length ? nShow - allT.length : 0)) % allT.length]) : [];
  const favTiles = myMoods;
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
  // Around you: within a 25-min walk (no subway), on now or starting within 4 h, and still reachable in time.
  // Ongoing things without listed hours (exhibitions, markets) count with their usual opening hours. Exact addresses only.
  const mapEvs = React.useMemo(() => {
    const now = nowMinutes();
    const walkOf = (e) => e.tt?.walk ?? (e.tt?.mode === "walk" ? e.tt.mins : 99);
    const L = (data || []).filter((e) => {
      if (!evCovers(e, today) || !Array.isArray(e.coord) || isImprecise(e) || walkOf(e) > 25) return false;
      const w = eventWindow(e);
      if (w.s > now + 240) return false;
      return canMake({ ...e, tt: { mins: walkOf(e) } }, today, now);
    }).map((e) => ({ ...e, tt: { mins: walkOf(e), mode: "walk", line: null, walk: walkOf(e) } }));
    const seen = new Set();
    const slot = (e) => { const w = eventWindow(e); return w.s <= now ? -1 : Math.floor(w.s / 30); };
    return L.sort((a, b) => (slot(a) - slot(b)) || (a.tt.mins - b.tt.mins) || (b.rk ?? b.sc ?? 0) - (a.rk ?? a.sc ?? 0)).filter((e) => { const k = String(e.title).toLowerCase().slice(0, 24); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
  }, [data, today]);
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
        <div id="tour-head" className="row" style={{ gap: 6 }}>
          {(() => {
            const hb = { position: "relative", width: 38, height: 38, borderRadius: 19, border: "none", background: "var(--chip)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 };
            const badge = (n) => n > 0 && <span style={{ position: "absolute", top: -3, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--navy)", color: "var(--onnavy, #fff)", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{n > 99 ? "99+" : n}</span>;
            const savedUp = savedNow.slice().sort((x, y) => evStart(x) - evStart(y) || byStart(x, y));
            return (<>
              <button style={hb} aria-label={"Saved plans, " + savedUp.length} onClick={() => savedUp.length && onTile({ key: "saved", title: "Your plans", list: savedUp, color: "#1F2A5C", teaser: "Everything you've bookmarked that's still coming up.", verb: "Saved", group: "day" })}><Icon name="save" size={17} />{badge(savedUp.length)}</button>
              <button style={hb} aria-label={"My Interests, " + (favList.length + moodFavs.length)} onClick={() => document.getElementById("my-favs")?.scrollIntoView({ behavior: "smooth" })}><Icon name="heart" size={17} />{badge(favList.length + moodFavs.length)}</button>
              <button style={hb} aria-label={"Profile and location · " + locLabel} onClick={() => setTab("me")}><Icon name="me" size={18} /></button>
            </>);
          })()}
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
        <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 38, lineHeight: 1, letterSpacing: -0.6 }}>{userName ? "Hi, " + userName : "Hi there"}</h1>
        <div style={{ fontSize: 16, lineHeight: 1.4, color: "var(--ink2)", marginTop: 8 }}>{g.blurb}</div>
      </div>

      {empty && (
        <div className="card" style={{ margin: "8px 16px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="disp" style={{ fontSize: 22 }}>No events loaded yet</div>
          <div className="muted" style={{ fontSize: 15 }}>Pull the latest feed from your Apps Script backend.</div>
          <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh events"}</button>
        </div>
      )}

      {/* 1. Your plans: one-line rows like the map legend, a bookmark instead of a number; three, then See all */}
      {!empty && mine.length > 0 && (
        <div style={{ padding: "18px 16px 0" }}>
          <div style={{ padding: "0 4px 6px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{planToday.length && mine.slice(0, 3).every((e) => planToday.includes(e)) ? "Your plans today" : "Your next plans"}</div>
          {mine.slice(0, 3).map((e, k) => (
            <button key={e.id} onClick={() => onOpen(e)} className="row" style={{ width: "100%", gap: 10, padding: "8px 4px", border: "none", background: "none", color: "var(--ink)", textAlign: "left", borderTop: k ? "1px solid var(--line, rgba(128,128,128,.18))" : "none" }}>
              <span style={{ width: 14, flexShrink: 0, display: "flex", justifyContent: "flex-end", color: "var(--ink3)" }}><Icon name="save" size={14} fill="currentColor" /></span>
              <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 400, color: evColor(e, dark), maxWidth: 104, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preciseLabel(e)}</span>
              <span className="ell" style={{ flex: 1, minWidth: 0, fontSize: 13.5, whiteSpace: "nowrap", color: "var(--ink2)" }}><span style={{ fontWeight: 600, color: "var(--ink)" }}>{shortWhen(e, today)}</span>{" · " + e.title}</span>
              <span style={{ fontSize: 12.5 }}><TravelMini ev={e} size={13} /></span>
            </button>
          ))}
          {mine.length > 3 && <button onClick={() => setTab("plans")} style={{ border: "none", background: "none", padding: "6px 4px 0", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>See all {mine.length}</button>}
        </div>
      )}

      {/* 3. Around you right now: a map of what is on or starting nearby */}
      {!empty && mapEvs.length > 0 && (
        <div id="tour-around">
          <Head title="Around you right now" sub="Tap a pin for a preview. Drag to look around." />
          {mapEvs.length > 0 && <AroundMap legend height={220} evs={mapEvs} home={home} dark={dark} today={today} onOpen={onOpen} onFull={() => onFullMap(mapEvs.map((e) => e.id), "Around you right now")} />}
        </div>
      )}

      {/* 4. For you: time tiles on top, then moods and picks; each says what drives it */}
      {!empty && tiles && (
        <>
          <div id="for-you" style={{ scrollMarginTop: 8 }} /><Head title="For you" sub="Best picks for your next outing." />
          <IntentChips data={data || []} today={today} sel={intentSel} put={putIntent} onOrder={onIntentOrder} favs={moodFavs} toggleFav={toggleMoodFav} />
          <div id="tour-with" className="hscroll" style={{ padding: "12px 20px 0", gap: 11, alignItems: "center", flexWrap: "nowrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>With</span>
            {[{ id: null, label: "Any" }, ...SOCIAL].map((m) => { const on = social === m.id; return (
              <button key={m.label} aria-pressed={on} onClick={() => putSocial(m.id)} className="row" style={{ gap: 5, border: "none", background: "none", padding: "4px 0", fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap", color: on ? "var(--ink)" : "var(--ink3)", opacity: on ? 1 : 0.6 }}>{m.icon && React.createElement(m.icon, { size: 14, strokeWidth: 2.2 })}{m.label}</button>
            ); })}
          </div>
          {bestNow.length > 0 ? (
            <div style={{ margin: "22px 0 18px" }}>
              <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr", rowGap: 26 }}>{bestNow.slice(0, 4).map((ev, k) => <div key={ev.id} id={k === 0 ? "tour-card" : undefined} style={{ display: "flex" }}><PosterCard ev={ev} dark={dark} today={today} onOpen={onOpen} fluid label={bestAll.labels?.get(ev.id)} /></div>)}</div>
              {intentSel.length === 0 && (
                <div className="row" style={{ padding: "18px 16px 0", gap: 8 }}>
                  <button onClick={() => onTile({ key: "top-picks" + (social ? "-" + social : ""), title: "Top picks" + socialTag, list: topAll, color: "#1F2A5C", teaser: "Everything coming up, ranked by your taste.", verb: "For you", group: "day" })}
                    className="row" style={{ flex: 1, justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 14, border: "none", background: "var(--navy)", color: "var(--onnavy, #fff)", fontWeight: 800, fontSize: 14.5 }}><Icon name="explore" size={17} />Explore top picks</button>
                  <button aria-label="Show me four others" onClick={() => { bestNow.slice(0, 4).forEach((e, i) => T.track("shuffle", e, { s: "foryou", p: i })); setShuf((x) => [...x, ...bestNow.slice(0, 4).map((e) => e.id)]); }}
                    style={{ width: 48, flexShrink: 0, alignSelf: "stretch", borderRadius: 14, border: "1.5px solid var(--line, rgba(128,128,128,.3))", background: "var(--card)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="refresh" size={19} /></button>
                </div>
              )}
              {intentSel.length > 0 && (
                <div style={{ padding: "18px 16px 0" }}>
                  <button onClick={() => onTile({ key: "intent-" + intentSel.join("+") + (social ? "-" + social : ""), title: intentTitle + socialTag, list: intentAll, color: INTENT[intentSel[0]].color, icon: INTENT[intentSel[0]].icon, teaser: "Everything that fits over the next two weeks, ranked by your taste.", verb: "In the mood for" })}
                    className="row" style={{ width: "100%", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 14, border: "none", background: INTENT[intentSel[0]].color, color: "#fff", fontWeight: 800, fontSize: 14.5 }}>
                    {React.createElement(INTENT[intentSel[0]].icon, { size: 17, strokeWidth: 2.2 })} Explore {intentTitle.toLowerCase()} · {new Set(intentAll.map((e) => String(e.title || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24))).size}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ margin: "0 0 18px" }}>
              {intentSel.length > 0 && <div className="muted" style={{ padding: "14px 20px 0", fontSize: 14 }}>Nothing fits {intentTitle.toLowerCase()} in the next two weeks.</div>}
            </div>
          )}

          {favFlat.length > 0 && (
            <div id="my-favs" style={{ scrollMarginTop: 12 }}>
              <Head title="My Interests" sub="Your moods and activities, one tap away." />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 2px" }}>
                {favFlat.slice(0, favRows * 4).map((x) => x.kind === "mood" ? (
                  <div key={x.key} role="button" tabIndex={0} onClick={() => { putIntent([x.id]); document.getElementById("for-you")?.scrollIntoView({ behavior: "smooth" }); }} onKeyDown={(e) => { if (e.key === "Enter") putIntent([x.id]); }}
                    style={{ position: "relative", width: 82, height: 70, flexShrink: 0, borderRadius: 16, border: "1.5px solid " + x.mood.color, background: x.mood.color, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 4px", fontSize: 12, fontWeight: 800, lineHeight: 1.1, textAlign: "center", cursor: "pointer" }}>
                    <button aria-label={"Remove " + x.mood.label + " from My Interests"} onClick={(e) => { e.stopPropagation(); toggleMoodFav(x.id); }} style={{ position: "absolute", top: 1, right: 1, width: 26, height: 26, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", opacity: 0.5 }}><Icon name="heart" size={12} fill="currentColor" /></button>
                    <BellMini nc={nc} light t={{ key: "mood-" + x.id, title: x.mood.label, cats: x.mood.cats || [], acts: x.mood.acts || [], list: [] }} />
                    {React.createElement(x.mood.icon, { size: 20, strokeWidth: 2.2, color: "#fff" })}{x.mood.label}
                  </div>
                ) : (
                  <div key={x.key} role="button" tabIndex={0} onClick={() => onTile(x.t)} onKeyDown={(e) => { if (e.key === "Enter") onTile(x.t); }} style={{ position: "relative", width: 82, height: 70, flexShrink: 0, borderRadius: 16, border: "1.5px solid " + ((x.mood?.color || x.t.color || "#888888") + "55"), background: (x.mood?.color || x.t.color || "#888888") + "22", color: "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 4px", fontSize: 12, fontWeight: 700, lineHeight: 1.1, textAlign: "center", cursor: "pointer" }}>
                    <button aria-label="Remove from My Interests" onClick={(e) => { e.stopPropagation(); onMoodFav(x.t); }} style={{ position: "absolute", top: 1, right: 1, width: 26, height: 26, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", opacity: 0.5 }}><Icon name="heart" size={12} fill="currentColor" /></button>
                    <BellMini nc={nc} t={x.t} />
                    {x.t.node ? <LIcon node={x.t.node} size={20} color={x.t.color} stroke={2.2} /> : x.t.icon ? React.createElement(x.t.icon, { size: 20, strokeWidth: 2.2, color: x.t.color }) : null}
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%" }}>{x.t.short || x.t.title}</span>
                  </div>
                ))}
              </div>
              {favFlat.length > 12 && (
                <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "center" }}>
                  <button onClick={() => setFavRows(favRows * 4 < favFlat.length ? favRows + 3 : 3)} style={{ border: "none", background: "none", color: "var(--ink2)", fontSize: 13.5, fontWeight: 800, padding: 4 }}>{favRows * 4 < favFlat.length ? "Show more" : "Show less"}</button>
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* You may like: activity tiles leaning to the picked mood, one row; the last card loads more */}
      {!empty && discover.length > 0 && (
        <>
          <Head title="You may also like" sub="Activities we think you'd like." />
          <DotScroll key={"yml-" + intentSel.join()} onMore={() => discN < discoverShown.length && setDiscN(discN + 6)}>
            {discoverShown.slice(0, discN).map((t) => <MoodTile key={t.key} compact t={{ ...t, open: () => onTile(t) }} fb={moodFb[t.key] || 0} fav={moodFav.includes(t.key)} onFav={(x) => { discOrder.current.frozen = true; onMoodFav(x); }} />)}
          </DotScroll>
        </>
      )}

      {/* 5. New York right now: three rows (season, neighbourhoods, weather), each a one-card carousel of up to three */}
      {!empty && nyRows.length > 0 && (
        <div id="tour-city">
          <Head title="New York right now" sub="What the city is up to." />
          <div id="tour-city-first" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {nyRows.map((row, ri) => <NYRow key={row.key} row={row} ri={row.slot} onTile={onTile} />)}
          </div>
        </div>
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
