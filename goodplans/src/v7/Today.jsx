import React, { useState } from "react";
import { INTENTS, INTENT, intentEvents, intentCount, blend, bestIntent, joinMoods, primaryIntent, SOCIAL, SOCIAL_BY, applySocial } from "./intents.js";
import { markSeen } from "./moods2.js";
import { ACT } from "./activities.js";
import { Logo, Icon, Glyph } from "./icons.jsx";
import { HeroCard, CompactCard, PosterCard, MiniCard, TravelMini, preciseLabel, shortWhen, actLabel, minsLabel, SectionHead, LeafletMap, CatBullet, ActionsCtx, Media, QuickTile, MoodTile, DotScroll, When, CardActions, PicOverlay } from "./components.jsx";
import { ThemePhoto } from "./themeArt.jsx";
import { applyFilters, EMPTY_FILTERS } from "./Filters.jsx";
import { useEventImage } from "./images.js";
import { catColor, catIcon } from "./theme.js";
import { fmtT, startMinutes, endMinutes, nowMinutes, fmtClock, isFree, isoDay, whenLabel, eventWindow, canMake } from "./engine.js";
import { DAYS, MONTHS, evCovers, evStart, CATS, daysUntil, isImprecise } from "../lib/core.js";
import { collapseSeries } from "./dedupe.js";
import { Travel, catLabel } from "./components.jsx";
import { FAMILIES, FAM, CATEGORIES, CAT, SUBTYPES, famColor, evColor, LIcon, CatChip } from "./taxonomy.js";
import { User, Users, Maximize2 } from "lucide";

function greeting(d) {
  const h = d.getHours(), day = DAYS[d.getDay()];
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  const blurb = h >= 17 ? "Let's find what's around for you tonight." : "Let's find what's around for you today.";
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
    <div style={{ margin: "2px 0 0" }}>
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

export default function Today({ onIntentOrder, userName = "", tiles, moodFav = [], moodClicks = {}, moodHide = [], onMoodDrop, nyRows = [], moodFb = {}, onMoodFb, onMoodFav,  onTile = () => {}, onFullMap = () => {}, cities = [], picks = [], goAsk, onGoAnswer = () => {}, data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing, highlights, weekPicks = [], eprof, hiddenCats = [], hiddenSubs = [], onHideCat, you, youOther, city, cityOther, onMore = () => {}, onYouSwitch, onYouFeedback, onCitySwitch, onYouOpen, onCityOpen }) {
  const [intentSel, setIntentSel] = useState(() => { try { return JSON.parse(sessionStorage.getItem("gp_intent_sel") || "[]").slice(0, 1); } catch { return []; } });
  const putIntent = (x) => { setIntentSel(x); try { sessionStorage.setItem("gp_intent_sel", JSON.stringify(x)); } catch { /* private */ } };
  // Who with: Anyone (null) · Date · Meet people. Reranks For you, the mood lists and Top picks; not a mood.
  const [social, setSocial] = useState(() => { try { return sessionStorage.getItem("gp_social") || null; } catch { return null; } });
  const putSocial = (x) => { setSocial(x); try { if (x) sessionStorage.setItem("gp_social", x); else sessionStorage.removeItem("gp_social"); } catch { /* private */ } };
  const socialTag = social ? " · " + SOCIAL_BY[social].label : "";
  const intentAll = React.useMemo(() => applySocial(intentEvents(data || [], intentSel, today), social), [data, intentSel, today, social]);
  const intentTitle = joinMoods(intentSel);
  const topAll = React.useMemo(() => applySocial((data || []).filter((e) => daysUntil(e, today) >= 0).slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)), social), [data, today, social]);
  const [discN, setDiscN] = useState(6);
  const [favRows, setFavRows] = useState(3);
  // Favourite moods (hearts on the mood tiles)
  const [moodFavs, setMoodFavs] = useState(() => { try { const f = JSON.parse(localStorage.getItem("gp_intent_fav") || "[]"); return Array.isArray(f) ? f.filter((id) => INTENT[id]) : []; } catch { return []; } });
  React.useEffect(() => { const on = () => { try { const f = JSON.parse(localStorage.getItem("gp_intent_fav") || "[]"); if (Array.isArray(f)) setMoodFavs(f.filter((id) => INTENT[id])); } catch { /* none */ } }; window.addEventListener("gp-moodfav", on); return () => window.removeEventListener("gp-moodfav", on); }, []);
  const toggleMoodFav = (id) => { const f = moodFavs.includes(id) ? moodFavs.filter((x) => x !== id) : [...moodFavs, id]; setMoodFavs(f); try { localStorage.setItem("gp_intent_fav", JSON.stringify(f)); } catch { /* full */ } return f; };
  const favList = React.useMemo(() => { const all = [...(tiles?.all || []), ...(tiles?.every || [])]; return moodFav.slice().reverse().map((k) => all.find((t) => t.key === k)).filter(Boolean).map((t) => { const b = t.list?.length ? primaryIntent(t.list[0]) : null; return b ? { ...t, color: b.color, mid: b.id } : t; }); }, [tiles, moodFav]);
  // My favorites: one row per mood — the mood first (when hearted), then the favourite activities that belong to it
  const favGroups = React.useMemo(() => {
    const by = {}; favList.forEach((t) => { (by[t.mid || "other"] = by[t.mid || "other"] || []).push(t); });
    const ids = [...moodFavs, ...Object.keys(by).filter((k) => !moodFavs.includes(k)).sort((a, b) => by[b].length - by[a].length)];
    return ids.map((id) => ({ id, mood: INTENT[id] || null, hearted: moodFavs.includes(id), items: by[id] || [] }));
  }, [favList, moodFavs]);
  // Discover: the activities you're most likely to want now. Picked moods lift what fits them; they don't filter.
  const discover = React.useMemo(() => {
    const gens = (tiles?.all || []).filter((t) => /^gen-(act|sub|term|cut)-/.test(t.key) && t.list?.length);
    const rest = (tiles?.all || []).filter((t) => t.list?.length && !/^gen-(act|sub|term|cut)-/.test(t.key));
    const ranked = gens.map((t, i) => {
      const fit = intentSel.length ? t.list.reduce((a, e) => a + Math.min(1, blend(e, intentSel)), 0) / t.list.length : 0;
      return [t, i - 8 * fit];
    }).sort((a, b) => a[1] - b[1]).map(([t]) => t);
    return [...ranked, ...rest].filter((t) => !moodFav.includes(t.key)).map((t) => { const b = primaryIntent(t.list[0]) || bestIntent(t.list); return b ? { ...t, title: t.short || t.title, verb: b.label, color: b.color } : { ...t, title: t.short || t.title }; });
  }, [tiles, intentSel, moodFav]);
  // Impressions for the mood stats: what Discover actually shows
  React.useEffect(() => { const ks = discover.slice(0, discN).filter((t) => /^gen-/.test(t.key)); if (ks.length) markSeen(ks, today); }, [discover, discN]); // eslint-disable-line react-hooks/exhaustive-deps
  const intentWithin = React.useMemo(() => { const m = {}; intentAll.forEach((e) => { if (e.act && ACT[e.act]) (m[e.act] = m[e.act] || []).push(e); }); return Object.entries(m).filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 10); }, [intentAll]);
  // Best for you right now: what is still to come today (or on now), else tomorrow, by your score, sooner first on ties
  // Best for you: everything still to come, ranked by your score with a gentle preference for sooner; the carousel loads more as you scroll
  const bestAll = React.useMemo(() => {
    const now = nowMinutes();
    const ok = (data || []).filter((e) => { const d = daysUntil(e, today); if (d < 0) return false; if (d > 0) return true; const st = startMinutes(e), en = endMinutes(e); return st == null ? true : st >= now - 20 || (en != null && en > now + 30); });
    const pool = intentSel.length ? ok.filter((e) => blend(e, intentSel) >= 0.45) : ok;
    const ranked = pool.map((e) => { const d = daysUntil(e, today); return [e, (e.sc || 0) * (d === 0 ? 1 : d === 1 ? 0.88 : Math.max(0.5, 0.97 ** d * 0.85)) * (intentSel.length ? 0.55 + 0.45 * Math.min(1, blend(e, intentSel)) : 1)]; }).sort((a, b) => b[1] - a[1]).map(([e]) => e);
    const seen = new Set(); return applySocial(ranked, social).filter((e) => { const k = String(e.title || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [data, today, intentSel, social]);
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
    return L.sort((a, b) => (slot(a) - slot(b)) || (a.tt.mins - b.tt.mins) || (b.sc || 0) - (a.sc || 0)).filter((e) => { const k = String(e.title).toLowerCase().slice(0, 24); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
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
        <div className="row" style={{ gap: 6 }}>
          {(() => {
            const hb = { position: "relative", width: 38, height: 38, borderRadius: 19, border: "none", background: "var(--chip)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 };
            const badge = (n) => n > 0 && <span style={{ position: "absolute", top: -3, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--navy)", color: "var(--onnavy, #fff)", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{n > 99 ? "99+" : n}</span>;
            const savedUp = savedNow.slice().sort((x, y) => evStart(x) - evStart(y) || byStart(x, y));
            return (<>
              <button style={hb} aria-label={"Saved plans, " + savedUp.length} onClick={() => savedUp.length && onTile({ key: "saved", title: "Your plans", list: savedUp, color: "#1F2A5C", teaser: "Everything you've bookmarked that's still coming up.", verb: "Saved", group: "day" })}><Icon name="save" size={17} />{badge(savedUp.length)}</button>
              <button style={hb} aria-label={"Favorites, " + (favList.length + moodFavs.length)} onClick={() => document.getElementById("my-favs")?.scrollIntoView({ behavior: "smooth" })}><Icon name="heart" size={17} />{badge(favList.length + moodFavs.length)}</button>
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
          <div style={{ padding: "0 4px 6px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{planToday.length ? "Your plans today" : "Your next plans"}</div>
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
        <>
          <Head title="Around you right now" sub="Tap a pin for a preview. Drag to look around." />
          {mapEvs.length > 0 && <AroundMap legend height={220} evs={mapEvs} home={home} dark={dark} today={today} onOpen={onOpen} onFull={() => onFullMap(mapEvs.map((e) => e.id), "Around you right now")} />}
        </>
      )}

      {/* 4. For you: time tiles on top, then moods and picks; each says what drives it */}
      {!empty && tiles && (
        <>
          <div id="for-you" style={{ scrollMarginTop: 8 }} /><Head title="For you" sub="Best picks for your next outing." />
          <IntentChips data={data || []} today={today} sel={intentSel} put={putIntent} onOrder={onIntentOrder} favs={moodFavs} toggleFav={toggleMoodFav} />
          <div className="hscroll" style={{ padding: "12px 20px 0", gap: 11, alignItems: "center", flexWrap: "nowrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>With</span>
            {[{ id: null, label: "Any" }, ...SOCIAL].map((m) => { const on = social === m.id; return (
              <button key={m.label} aria-pressed={on} onClick={() => putSocial(m.id)} className="row" style={{ gap: 5, border: "none", background: "none", padding: "4px 0", fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap", color: on ? "var(--ink)" : "var(--ink3)", opacity: on ? 1 : 0.6 }}>{m.icon && React.createElement(m.icon, { size: 14, strokeWidth: 2.2 })}{m.label}</button>
            ); })}
          </div>
          {bestNow.length > 0 ? (
            <div style={{ margin: "22px 0 18px" }}>
              <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr", rowGap: 26 }}>{bestNow.slice(0, 4).map((ev) => <div key={ev.id} style={{ display: "flex" }}><PosterCard ev={ev} dark={dark} today={today} onOpen={onOpen} fluid /></div>)}</div>
              {intentSel.length === 0 && (
                <div style={{ padding: "18px 16px 0" }}>
                  <button onClick={() => onTile({ key: "top-picks" + (social ? "-" + social : ""), title: "Top picks" + socialTag, list: topAll, color: "#1F2A5C", teaser: "Everything coming up, ranked by your taste.", verb: "For you", group: "day" })}
                    className="row" style={{ width: "100%", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 14, border: "none", background: "var(--navy)", color: "var(--onnavy, #fff)", fontWeight: 800, fontSize: 14.5 }}>Explore top picks</button>
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

          {favGroups.length > 0 && (
            <div id="my-favs" style={{ scrollMarginTop: 12 }}>
              <Head title="My favorites" sub="Your moods and activities, one tap away." />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {favGroups.slice(0, favRows).map((g) => (
                  <div key={g.id} className="hscroll" style={{ gap: 6, padding: "0 16px 2px" }}>
                    {g.mood && (
                      <div role="button" tabIndex={0} onClick={() => { putIntent([g.id]); document.getElementById("for-you")?.scrollIntoView({ behavior: "smooth" }); }} onKeyDown={(e) => { if (e.key === "Enter") putIntent([g.id]); }}
                        style={{ position: "relative", width: 82, height: 70, flexShrink: 0, borderRadius: 16, border: "1.5px solid " + g.mood.color, background: g.hearted ? g.mood.color : "var(--card)", color: g.hearted ? "#fff" : "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 4px", fontSize: 12, fontWeight: 800, lineHeight: 1.1, textAlign: "center", cursor: "pointer" }}>
                        {g.hearted && <button aria-label={"Remove " + g.mood.label + " from favourites"} onClick={(e) => { e.stopPropagation(); toggleMoodFav(g.id); }} style={{ position: "absolute", top: 1, right: 1, width: 26, height: 26, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", opacity: 0.5 }}><Icon name="heart" size={12} fill="currentColor" /></button>}
                        {React.createElement(g.mood.icon, { size: 20, strokeWidth: 2.2, color: g.hearted ? "#fff" : g.mood.color })}{g.mood.label}
                      </div>
                    )}
                    {g.items.map((t) => (
                      <div key={t.key} role="button" tabIndex={0} onClick={() => onTile(t)} onKeyDown={(e) => { if (e.key === "Enter") onTile(t); }} style={{ position: "relative", width: 82, height: 70, flexShrink: 0, borderRadius: 16, border: "1.5px solid var(--line, rgba(128,128,128,.25))", background: "var(--card)", color: "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 4px", fontSize: 12, fontWeight: 700, lineHeight: 1.1, textAlign: "center", cursor: "pointer" }}>
                        <button aria-label="Remove from favorites" onClick={(e) => { e.stopPropagation(); onMoodFav(t); }} style={{ position: "absolute", top: 1, right: 1, width: 26, height: 26, border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", opacity: 0.5 }}><Icon name="heart" size={12} fill="currentColor" /></button>
                        {t.node ? <LIcon node={t.node} size={20} color={t.color} stroke={2.2} /> : t.icon ? React.createElement(t.icon, { size: 20, strokeWidth: 2.2, color: t.color }) : null}
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%" }}>{t.short || t.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {favGroups.length > 3 && (
                <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "center" }}>
                  <button onClick={() => setFavRows(favRows < favGroups.length ? favRows + 3 : 3)} style={{ border: "none", background: "none", color: "var(--ink2)", fontSize: 13.5, fontWeight: 800, padding: 4 }}>{favRows < favGroups.length ? "Show more" : "Show less"}</button>
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
          <DotScroll key={"yml-" + intentSel.join()} onMore={() => discN < discover.length && setDiscN(discN + 6)}>
            {discover.slice(0, discN).map((t) => <MoodTile key={t.key} compact t={{ ...t, open: () => onTile(t) }} fb={moodFb[t.key] || 0} onFb={onMoodFb} fav={false} onFav={onMoodFav} />)}
          </DotScroll>
        </>
      )}

      {/* 5. New York right now: three rows (season, neighbourhoods, weather), each a one-card carousel of up to three */}
      {!empty && nyRows.length > 0 && (
        <>
          <Head title="New York right now" sub="What the city is up to." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {nyRows.map((row, ri) => <NYRow key={row.key} row={row} ri={row.slot} onTile={onTile} />)}
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
