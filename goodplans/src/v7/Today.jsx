import React from "react";
import { Logo, Icon, Glyph } from "./icons.jsx";
import { HeroCard, CompactCard, PosterCard, SectionHead, LeafletMap, CatBullet } from "./components.jsx";
import { catColor, catIcon } from "./theme.js";
import { fmtT, startMinutes, endMinutes, nowMinutes, fmtClock, isFree, isoDay } from "./engine.js";
import { DAYS, MONTHS, evCovers, CATS } from "../lib/core.js";
import { Travel } from "./components.jsx";
import { FAMILIES, FAM, famColor, LIcon } from "./taxonomy.js";

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
function TopPicks({ data, dark, today, onOpen, eprof, onMore }) {
  const counts = data.reduce((m, e) => ((m[e.fam] = (m[e.fam] || 0) + 1), m), {});
  const order = React.useRef(null);
  const avail = FAMILIES.map((f) => f.id).filter((id) => counts[id] >= 2);
  // Rank families by how much their events score for you on average
  if (!order.current && avail.length) {
    const avg = (id) => { const l = data.filter((e) => e.fam === id).slice(0, 8); return l.reduce((a, e) => a + e.sc, 0) / Math.max(1, l.length); };
    order.current = [...avail].sort((a, b) => avg(b) - avg(a));
  }
  const fams = [...(order.current || []).filter((c) => avail.includes(c)), ...avail.filter((c) => !(order.current || []).includes(c))];
  const [fam, setFam] = React.useState(() => { try { return sessionStorage.getItem("gp_topfam") || null; } catch { return null; } });
  const pick = (c) => { setFam(c); try { sessionStorage.setItem("gp_topfam", c); } catch { /* private mode */ } };
  const cur = fam && fams.includes(fam) ? fam : fams[0];
  if (!cur) return null;
  const list = data.filter((e) => e.fam === cur).sort((a, b) => b.sc - a.sc).slice(0, 5);
  return (
    <>
      <SectionHead title={"Top picks · " + FAM[cur].label} color={famColor(cur, dark)} onMore={() => onMore({ fam: cur, when: "week" })} />
      <div className="row" style={{ justifyContent: "space-between", padding: "0 12px 14px" }} role="tablist" aria-label="Topic">
        {FAMILIES.filter((f) => fams.includes(f.id)).map((f) => {
          const on = f.id === cur, col = famColor(f.id, dark);
          return (
            <button key={f.id} role="tab" aria-selected={on} aria-label={f.label} onClick={() => pick(f.id)}
              style={{ border: "none", background: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 44, opacity: on ? 1 : 0.45 }}>
              <span style={{ width: 38, height: 38, borderRadius: 19, background: col, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? `0 0 0 3px var(--bg), 0 0 0 5px ${col}` : "none" }}>
                <LIcon node={f.icon} size={19} color="#fff" />
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ink2)", whiteSpace: "nowrap" }}>{f.short || f.label}</span>
            </button>
          );
        })}
      </div>
      <div key={cur} style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18, minHeight: 300 }}>
        {list.map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
      </div>
    </>
  );
}

// A mood section: small label, Claude-written title and subtitle, 4 events, "Or:" chip, extra actions
function MoodSection({ eyebrow, m, other, onSwitch, onOpen, dark, today, children }) {
  return (
    <>
      <div className="sec-h" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{eyebrow}</span>
        <h2 style={{ lineHeight: 1.1, opacity: m.writing ? 0.55 : 1, transition: "opacity .3s" }}>{String(m.title || "").replace(/[.!]+$/, "")}</h2>
        {m.sub && <div className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>{m.sub}</div>}
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        {m.list.slice(0, 4).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
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
function CityPulse({ m, other, onSwitch, onOpen, dark, today }) {
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
        {m.list.length ? m.list.slice(0, 4).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)
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
      ? <button key={k++} onClick={() => onOpen(ev)} style={{ border: "none", background: "none", padding: 0, font: "inherit", fontWeight: 800, color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--ink3, #999)", textUnderlineOffset: 3, cursor: "pointer" }}>{m[2]}</button>
      : m[2]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Today({ data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing, highlights, weekPicks = [], eprof, you, youOther, city, cityOther, onMore = () => {}, onYouSwitch, onYouFeedback, onCitySwitch, onYouOpen, onCityOpen }) {
  const [showAllNow, setShowAllNow] = React.useState(false);
  const g = greeting(new Date());
  const w = weather?.byDate?.[isoDay(today)];
  const { nowSoon, tonight, weekend, book, wildcard, total } = sections;
  const empty = !data.length;

  return (
    <div>
      <div className="row" style={{ padding: "calc(18px + env(safe-area-inset-top)) 20px 0", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          <Logo size={28} dark={dark} />
          <span className="disp" style={{ fontSize: 23 }}>good plans</span>
        </div>
        <button className="chip" onClick={() => setTab("me")} aria-label="Location settings"><Icon name="pin" size={15} /> {locLabel}</button>
      </div>
      <div style={{ padding: "18px 20px 14px" }}>
        <div className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{g.line}{w ? " · " + fmtT(w.hi) + (w.rainy ? " · rain later" : "") : ""}</div>
        <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 38, lineHeight: 1, letterSpacing: -0.6 }}>{g.title}</h1>
        {highlights?.text ? (
          <p style={{ margin: "10px 0 0", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)", whiteSpace: "pre-line" }}>{renderHighlights(highlights.text, highlights.ids, data, onOpen)}</p>
        ) : highlights?.status === "loading" ? (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 14 }}>Writing your week's highlights…</p>
        ) : String(highlights?.status || "").startsWith("error") ? (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>Weekly highlights unavailable: {String(highlights.status).slice(7)}</p>
        ) : null}
      </div>

      {empty && (
        <div className="card" style={{ margin: "8px 16px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="disp" style={{ fontSize: 22 }}>No events loaded yet</div>
          <div className="muted" style={{ fontSize: 15 }}>Pull the latest feed from your Apps Script backend.</div>
          <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh events"}</button>
        </div>
      )}

      {!empty && <div className="sec-sep" aria-hidden="true" />}
      {!empty && (
        <div className="card" style={{ margin: "0 16px", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="row" style={{ padding: "0 4px", justifyContent: "space-between" }}>
            <span className="disp" style={{ fontSize: 20 }}>Now &amp; soon nearby</span>
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{nowSoon.length ? nowSoon.length + " within 25 min" : "Quiet right now"}</span>
          </div>
          <button onClick={() => setTab("map")} aria-label="Open the map" style={{ border: "none", padding: 0, background: "none", display: "block" }}>
            <LeafletMap events={nowSoon} home={home} dark={dark} height={170} interactive={false} zoom={14} />
          </button>
          {nowSoon.slice(0, showAllNow ? 12 : 4).map((ev) => (
            <button key={ev.id} onClick={() => onOpen(ev)} className="row" style={{ gap: 10, padding: "0 4px", border: "none", background: "none", textAlign: "left" }}>
              <CatBullet ev={ev} size={30} dark={dark} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span className="ell" style={{ fontSize: 15, fontWeight: 800 }}>{ev.title}</span>
                <span className="row" style={{ gap: 8, fontSize: 12.5, fontWeight: 700 }}>
                  <span style={{ color: soonLabel(ev).startsWith("On now") ? "var(--free-ink)" : "var(--soon-ink)" }}>{soonLabel(ev)}</span>
                  <Travel tt={ev.tt} size={12} muted />
                </span>
              </span>
              <Icon name="chev" size={16} />
            </button>
          ))}
          {nowSoon.length > 4 && <button className="chip" style={{ alignSelf: "center" }} onClick={() => setShowAllNow(!showAllNow)}>{showAllNow ? "Show fewer" : "Show all " + nowSoon.length}</button>}
          {!nowSoon.length && <div className="muted" style={{ fontSize: 14, padding: "0 4px" }}>Nothing starting nearby in the next couple of hours. Tonight's picks are below.</div>}
        </div>
      )}

      {!empty && (you ? (
        <MoodSection eyebrow="Mood meter" m={you} other={youOther} onSwitch={onYouSwitch} onOpen={onYouOpen} dark={dark} today={today}>
          <button className="chip" style={{ height: 36 }} onClick={() => onYouFeedback(true)}><Icon name="up" size={15} /> Nailed it</button>
          <button className="chip" style={{ height: 36 }} onClick={() => onYouFeedback(false)}><Icon name="down" size={15} /> Not quite</button>
          <button className="chip" style={{ height: 36 }} onClick={onSurprise}><Icon name="spark" size={15} /> Surprise me</button>
        </MoodSection>
      ) : (
        <>
          <SectionHead title="Something different" icon="spark" />
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {wildcard && <CompactCard ev={wildcard} dark={dark} today={today} onOpen={onOpen} label="Wildcard" />}
            <button className="pill pill-line" onClick={onSurprise}><Icon name="spark" size={18} /> Surprise me</button>
          </div>
        </>
      ))}

      {!empty && city && <CityPulse m={city} other={cityOther} onSwitch={onCitySwitch} onOpen={onCityOpen} dark={dark} today={today} />}

      {!empty && <WhenTabs tabs={[
        ["tonight", freeUntil != null ? "While you're free" : "Tonight", tonight, { when: "tonight" }],
        ["weekend", "This weekend", weekend, { when: "weekend" }],
        ["week", "This week", weekPicks, { when: "week" }],
      ]} dark={dark} today={today} onOpen={onOpen} onMore={onMore} />}



      {(() => {
        if (!weather?.byDate) return null;
        const shown = new Set([...tonight, ...weekend, ...book].map((e) => e.id));
        for (let k = 0; k < 3; k++) {
          const d = new Date(today); d.setDate(today.getDate() + k);
          const w2 = weather.byDate[isoDay(d)];
          if (!w2 || !(w2.rainy || w2.pmax >= 60)) continue;
          const swaps = data.filter((e) => !e.outdoor && evCovers(e, d) && !shown.has(e.id)).sort((a, b) => b.sc - a.sc).slice(0, 3);
          if (!swaps.length) return null;
          const dayName = k === 0 ? "today" : k === 1 ? "tomorrow" : FULL[d.getDay()];
          return (
            <>
              <SectionHead title="Rainy-day swaps" icon="rain" n={"Rain " + dayName} />
              <div className="muted" style={{ padding: "0 20px 10px", fontSize: 14, marginTop: -4 }}>{w2.pmax}% chance of rain {dayName}. Good indoor picks instead:</div>
              <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {swaps.map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
              </div>
            </>
          );
        }
        return null;
      })()}



      {!empty && <TopPicks data={data} dark={dark} today={today} onOpen={onOpen} eprof={eprof} onMore={onMore} />}

      {book.length > 0 && (
        <>
          <SectionHead title="Book before it's gone" />
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {book.map((ev) => {
              const d = new Date(ev.E + "T00:00:00");
              return (
                <button key={ev.id} onClick={() => onOpen(ev)} className="card-sm row" style={{ border: "none", textAlign: "left", padding: "10px 14px 10px 10px", gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--soon-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--soon-ink)", letterSpacing: 0.8 }}>{MONTHS[d.getMonth()].toUpperCase()}</span>
                    <span className="disp" style={{ fontSize: 22, lineHeight: 1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.15 }}>{ev.title}</div>
                    <div className="muted ell" style={{ fontSize: 13 }}>{(ev.venue || "").split(",")[0]} · {isFree(ev) ? "Free" : (ev.price || "").split("/")[0]}</div>
                  </div>
                  <Icon name="chev" size={18} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {!empty && (
        <div style={{ padding: "34px 20px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <Logo size={44} dark={dark} />
          <div className="disp" style={{ fontSize: 23 }}>That's it. You're all caught up.</div>
          <div className="muted" style={{ fontSize: 14 }}>{total} picks from {data.length} events. New ones arrive with each refresh.</div>
          <button className="pill pill-line" onClick={() => setTab("explore")}>Explore everything</button>
        </div>
      )}
    </div>
  );
}
