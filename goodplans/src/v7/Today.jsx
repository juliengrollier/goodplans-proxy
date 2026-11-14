import React from "react";
import { Logo, Icon } from "./icons.jsx";
import { HeroCard, CompactCard, PosterCard, SectionHead, LeafletMap, CatBullet } from "./components.jsx";
import { catColor } from "./theme.js";
import { startMinutes, nowMinutes, fmtClock, isFree, isoDay } from "./engine.js";
import { DAYS, MONTHS, evCovers } from "../lib/core.js";
import { Travel } from "./components.jsx";

function greeting(d) {
  const h = d.getHours(), day = DAYS[d.getDay()];
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  return { line: (day === "Sat" ? "Saturday" : day === "Sun" ? "Sunday" : day === "Fri" ? "Friday" : ["Monday", "Tuesday", "Wednesday", "Thursday"][d.getDay() - 1]) + " " + part, title: h >= 21 ? "Still time to go out." : "Good plans ahead." };
}

function soonLabel(ev) {
  const sm = startMinutes(ev), now = nowMinutes();
  if (sm == null) return "Today";
  if (sm <= now) return "On now";
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

export default function Today({ data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing, highlights, weekPicks = [] }) {
  const g = greeting(new Date());
  const w = weather?.byDate?.[isoDay(today)];
  const { nowSoon, tonight, weekend, book, wildcard, total } = sections;
  const empty = !data.length;
  const freeText = freeUntil != null ? "Free until " + fmtClock(freeUntil) : autoFree != null ? "Free until " + fmtClock(autoFree) + " · calendar" : "I'm free until…";

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
        <div className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{g.line}{w ? " · " + w.hi + "°F" + (w.rainy ? " · rain later" : "") : ""}</div>
        <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 38, lineHeight: 1, letterSpacing: -0.6 }}>{g.title}</h1>
        {highlights?.text ? (
          <p style={{ margin: "10px 0 0", fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>This week's don't-miss. </b>{renderHighlights(highlights.text, highlights.ids, data, onOpen)}</p>
        ) : highlights?.status === "loading" ? (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 14 }}>Writing your week's highlights…</p>
        ) : String(highlights?.status || "").startsWith("error") ? (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>Weekly highlights unavailable: {String(highlights.status).slice(7)}</p>
        ) : null}
      </div>
      <div className="hscroll" style={{ padding: "8px 16px 16px" }}>
        <button className={"chip" + (freeUntil != null ? " on" : "")} onClick={openFree}><Icon name="clock" size={15} /> {freeText}</button>
        <button className="chip" onClick={onSurprise}><Icon name="spark" size={15} /> Surprise me</button>
        {w?.rainy && <span className="chip" style={{ cursor: "default" }}><Icon name="rain" size={15} /> Indoor first tonight</span>}
      </div>

      {empty && (
        <div className="card" style={{ margin: "8px 16px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="disp" style={{ fontSize: 22 }}>No events loaded yet</div>
          <div className="muted" style={{ fontSize: 15 }}>Pull the latest feed from your Apps Script backend.</div>
          <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh events"}</button>
        </div>
      )}

      {!empty && (
        <div className="card" style={{ margin: "0 16px", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="row" style={{ padding: "0 4px", justifyContent: "space-between" }}>
            <span className="disp" style={{ fontSize: 20 }}>Now &amp; soon nearby</span>
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{nowSoon.length ? nowSoon.length + " within 25 min" : "Quiet right now"}</span>
          </div>
          <button onClick={() => setTab("map")} aria-label="Open the map" style={{ border: "none", padding: 0, background: "none", display: "block" }}>
            <LeafletMap events={nowSoon} home={home} dark={dark} height={170} interactive={false} zoom={14} />
          </button>
          {nowSoon.slice(0, 3).map((ev) => (
            <button key={ev.id} onClick={() => onOpen(ev)} className="row" style={{ gap: 10, padding: "0 4px", border: "none", background: "none", textAlign: "left" }}>
              <CatBullet cat={ev.cat} size={30} dark={dark} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span className="ell" style={{ fontSize: 15, fontWeight: 800 }}>{ev.title}</span>
                <span className="row" style={{ gap: 8, fontSize: 12.5, fontWeight: 700 }}>
                  <span style={{ color: soonLabel(ev) === "On now" ? "var(--free-ink)" : "var(--soon-ink)" }}>{soonLabel(ev)}</span>
                  <Travel tt={ev.tt} size={12} muted />
                </span>
              </span>
              <Icon name="chev" size={16} />
            </button>
          ))}
          {!nowSoon.length && <div className="muted" style={{ fontSize: 14, padding: "0 4px" }}>Nothing starting nearby in the next couple of hours. Tonight's picks are below.</div>}
        </div>
      )}

      {weekPicks.length > 0 && (
        <>
          <SectionHead title="Don't miss this week" n={weekPicks.length + " pick" + (weekPicks.length > 1 ? "s" : "")} color={catColor("Art & Culture", dark)} />
          <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
            <HeroCard ev={weekPicks[0]} dark={dark} today={today} onOpen={onOpen} label={null} />
            {weekPicks.slice(1).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          </div>
        </>
      )}

      {tonight.length > 0 && (
        <>
          <SectionHead title={freeUntil != null ? "While you're free" : "Tonight"} n={tonight.length + " pick" + (tonight.length > 1 ? "s" : "")} color={catColor("Music", dark)} />
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <HeroCard ev={tonight[0]} dark={dark} today={today} onOpen={onOpen} label={tonight[0].why?.includes("One night only") ? "One night only" : null} />
            {tonight.slice(1).map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          </div>
        </>
      )}

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

      {wildcard && (
        <>
          <SectionHead title="Something different" color={catColor(wildcard.cat, dark)} />
          <div style={{ padding: "0 16px" }}><CompactCard ev={wildcard} dark={dark} today={today} onOpen={onOpen} label="Wildcard" /></div>
        </>
      )}

      {weekend.length > 0 && (
        <>
          <SectionHead title="This weekend" n={weekend.length + " picks"} color={catColor("Outdoors", dark)} />
          <div className="hscroll">{weekend.map((ev) => <PosterCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</div>
        </>
      )}

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
