import React from "react";
import { Logo, Icon } from "./icons.jsx";
import { HeroCard, CompactCard, PosterCard, SectionHead, LeafletMap, CatBullet } from "./components.jsx";
import { catColor } from "./theme.js";
import { startMinutes, nowMinutes, fmtClock, isFree, isoDay } from "./engine.js";
import { DAYS, MONTHS } from "../lib/core.js";

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

export default function Today({ data, sections, dark, today, home, locLabel, onOpen, setTab, freeUntil, autoFree, openFree, weather, onSurprise, onRefresh, refreshing }) {
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
      </div>
      <div className="hscroll" style={{ paddingBottom: 16 }}>
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
              <span className={"tag " + (soonLabel(ev) === "On now" ? "pill-dark" : "tag-soon")} style={soonLabel(ev) === "On now" ? { background: "var(--navy)", color: "var(--onnavy)" } : {}}>{soonLabel(ev)}</span>
              <span className="ell" style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{ev.title}</span>
              <span className="muted" style={{ fontSize: 13 }}>{ev.tt?.mins} min</span>
            </button>
          ))}
          {!nowSoon.length && <div className="muted" style={{ fontSize: 14, padding: "0 4px" }}>Nothing starting nearby in the next couple of hours. Tonight's picks are below.</div>}
        </div>
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
