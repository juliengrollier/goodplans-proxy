import React, { useState } from "react";
import { Icon } from "./icons.jsx";
import { CatBullet } from "./components.jsx";
import { tasteSummary } from "./engine.js";
import { CATS } from "../lib/core.js";

const LEVELS = [["Love", 80], ["Like", 55], ["Meh", 25], ["Hide", 0]];
const levelOf = (v) => (v === 0 ? 3 : v >= 70 ? 0 : v >= 45 ? 1 : 2);

function Card({ title, children, right }) {
  return (
    <div className="card" style={{ margin: "0 16px 14px", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 10 }}><span className="disp" style={{ fontSize: 20 }}>{title}</span>{right}</div>
      {children}
    </div>
  );
}

export default function Me(p) {
  const { prof, eprof, taste, setCatLevel, setCatValue, dark, theme, setTheme, unit, setUnit, hiddenCats = [], onShowCat, stars = {}, onUnstar, onUnfollow, onUndo,
    calStatus, busyCount, onCheckCal, calName, pushState, onEnablePush, pushInfo,
    backend, setBackend, lastRefreshed, eventCount, onRefresh, refreshing, refreshLog,
    locSt, onRetryGPS, resetTaste, maps, mapsBusy, mapsMatches = 0, onImportMaps, onRemoveMaps, learned = {}, cardBusy, onCardRefresh, onMuteLine, onResetLearning, who, setWho, people = [] } = p;
  const [fine, setFine] = useState(false);
  const [showBackend, setShowBackend] = useState(false);
  const cats = Object.keys(CATS).filter((c) => c !== "Other");
  const hidden = (taste.log || []).filter((l) => l.kind === "nfm" || l.kind === "down").filter((l) => taste.notForMe[l.id] || taste.thumbs[l.id] === -1);
  const follows = Object.entries(taste.follows || {});

  return (
    <div>
      <div style={{ padding: "calc(18px + env(safe-area-inset-top)) 20px 14px" }}><h1 className="disp" style={{ margin: 0, fontSize: 34 }}>Me</h1></div>

      <Card title="What Good Plans has learned" right={learned.strong >= 5 && <button className="chip" onClick={onCardRefresh} disabled={cardBusy}>{cardBusy ? "Writing…" : "Refresh"}</button>}>
        {learned.card?.lines?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {learned.card.lines.map((l, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ flex: 1, fontSize: 15.5, lineHeight: 1.4 }}>{l.text}</span>
                <button aria-label={"Not me: " + l.text} title="That's not me" onClick={() => onMuteLine(l)} style={{ border: "none", background: "none", padding: 2, color: "var(--ink3)", flexShrink: 0 }}><Icon name="close" size={15} /></button>
              </div>
            ))}
            <div className="muted" style={{ fontSize: 12.5 }}>Tap × on a line that isn't you and the app stops using it.</div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {learned.strong >= 5 ? (cardBusy ? "Writing your taste card…" : "Your taste card will appear here shortly.") : "The app learns from what you open, read, save, share and attend, not only thumbs. Your taste card appears after a few saves or thumbs (" + (learned.strong || 0) + " of 5)."}
          </p>
        )}
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>This phone is</span>
          {people.map((n) => <button key={n} className="chip" aria-pressed={who === n} onClick={() => setWho(n)} style={who === n ? { background: "var(--navy)", color: "var(--onnavy)", border: "none" } : undefined}>{n}'s</button>)}
        </div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>Each phone learns its owner. "Together" on Today blends both tastes once the other phone has shared its own.</div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12.5 }}>{learned.count || 0} signals learned{learned.muted ? " · " + learned.muted + " switched off" : ""}</span>
          <button className="chip" onClick={() => { if (confirm("Forget everything learned from your activity? Thumbs, saves and boosts stay.")) onResetLearning(); }}>Reset learning</button>
        </div>
      </Card>

      <Card title="Google Maps lists">
        {maps?.lists?.length ? (
          <>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{maps.lists.length} lists · {maps.lists.reduce((a, l) => a + l.places.length, 0)} places. <b>{mapsMatches}</b> upcoming events are at places you saved.</div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{maps.lists.slice(0, 12).map((l) => <span key={l.name} className="chip" style={{ height: 30, fontSize: 13 }}>{l.name} · {l.places.length}</span>)}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Imported {new Date(maps.at).toLocaleDateString()}{maps.themes ? " · themes learned" : ""}. Re-import a fresh export now and then to keep it current.</div>
          </>
        ) : (
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>Events at places you saved in Google Maps get a boost, and your lists teach the app your taste. Export them at <b>takeout.google.com</b>: deselect all, tick <b>Saved</b> and <b>Maps (your places)</b>, then pick the .zip here.</div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <label className="pill pill-dark" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", opacity: mapsBusy ? 0.6 : 1 }}>
            {mapsBusy ? "Reading…" : maps ? "Re-import" : "Import Takeout file"}
            <input type="file" accept=".zip,.csv,.json,.geojson" multiple style={{ display: "none" }} disabled={mapsBusy} onChange={(e) => { onImportMaps(e.target.files); e.target.value = ""; }} />
          </label>
          {maps && <button className="chip" onClick={onRemoveMaps}>Remove</button>}
        </div>
      </Card>

      <Card title="Your taste">
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{tasteSummary(eprof, taste, Object.keys(CATS))}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cats.map((c) => {
            const v = prof.categories?.[c] ?? 30, lv = levelOf(v);
            return (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="row" style={{ gap: 10 }}>
                  <CatBullet cat={c} size={28} dark={dark} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{c}</span>
                  <div className="seg" style={{ gridTemplateColumns: "repeat(4,auto)", padding: 3, gap: 2 }}>
                    {LEVELS.map(([l, val], i) => <button key={l} className={lv === i ? "on" : ""} style={{ height: 30, padding: "0 9px", fontSize: 12 }} onClick={() => setCatLevel(c, val)}>{l}</button>)}
                  </div>
                </div>
                {fine && <input type="range" min="0" max="100" value={v} aria-label={c + " weight"} onChange={(e) => setCatValue(c, +e.target.value)} />}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="chip" onClick={() => setFine(!fine)}>{fine ? "Hide fine-tune" : "Fine-tune"}</button>
          <button className="chip" onClick={resetTaste}>Reset what it learned</button>
        </div>
      </Card>

      <Card title="Following" right={<span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{follows.length}</span>}>
        {follows.length ? follows.map(([k, label]) => (
          <div key={k} className="row" style={{ gap: 10 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{label}</span>
            <button className="chip" onClick={() => onUnfollow(k)}>Unfollow</button>
          </div>
        )) : <span className="muted" style={{ fontSize: 14 }}>Follow a venue from any event page; its events get a boost.</span>}
      </Card>

      {hidden.length > 0 && (
        <Card title="Things you hid">
          {hidden.slice(0, 12).map((l) => (
            <div key={l.id + l.at} className="row" style={{ gap: 10 }}>
              <span className="ell" style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{l.title}</span>
              <span className="muted" style={{ fontSize: 12 }}>{l.reason === "far" ? "too far" : l.reason === "price" ? "too pricey" : l.reason === "seen" ? "seen it" : l.reason === "notus" ? "not our thing" : "less like this"}</span>
              <button className="chip" onClick={() => onUndo(l)}>Undo</button>
            </div>
          ))}
        </Card>
      )}

      <Card title="Calendar">
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>
          {calStatus === "ok" ? `Connected${calName ? " (" + calName + ")" : ""} · ${busyCount} busy slot${busyCount === 1 ? "" : "s"} in the next 3 weeks. Used for clash dimming and “free until”.` :
            calStatus === "checking" ? "Checking…" : calStatus === "unauth" ? "Your Apps Script needs Calendar permission (run it once from script.google.com)." :
            "Reads busy times through your Apps Script backend. No event details leave Google."}
        </span>
        <button className="pill pill-line" onClick={onCheckCal}><Icon name="refresh" size={18} /> {calStatus === "ok" ? "Check again" : "Connect calendar"}</button>
      </Card>

      <Card title="Notifications">
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{pushState}</span>
        {pushInfo && <span className="muted" style={{ fontSize: 13 }}>{pushInfo}</span>}
        <button className="pill pill-dark" onClick={onEnablePush}><Icon name="bell" size={18} /> Turn on / repair notifications</button>
      </Card>

      {(Object.keys(stars.cats || {}).length + Object.keys(stars.subs || {}).length) > 0 && (
        <Card title="Boosted">
          <div className="muted" style={{ fontSize: 13, marginTop: -4 }}>Starred in filters. They rank higher everywhere. Tap to remove a boost.</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {Object.keys(stars.cats || {}).map((c) => <button key={"c" + c} className="chip" style={{ height: 32 }} onClick={() => onUnstar("cats", c)}>★ {c}</button>)}
            {Object.keys(stars.subs || {}).map((c) => <button key={"s" + c} className="chip" style={{ height: 32 }} onClick={() => onUnstar("subs", c)}>★ {c}</button>)}
          </div>
        </Card>
      )}

      {hiddenCats.length > 0 && (
        <Card title="Hidden categories">
          <div className="muted" style={{ fontSize: 13, marginTop: -4 }}>Hidden with × in filters. They stay out of Explore, Map and Top picks, and rank lower everywhere else.</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {hiddenCats.map((c) => <button key={c} className="chip" style={{ height: 32 }} onClick={() => onShowCat(c)}>{c} <span style={{ fontWeight: 800 }}>↺</span></button>)}
          </div>
        </Card>
      )}

      <Card title="Appearance">
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {[["system", "System"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => <button key={k} className={theme === k ? "on" : ""} onClick={() => setTheme(k)}>{l}</button>)}
        </div>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          {[["C", "Celsius"], ["F", "Fahrenheit"]].map(([k, l]) => <button key={k} className={unit === k ? "on" : ""} onClick={() => setUnit(k)}>{l}</button>)}
        </div>
      </Card>

      <Card title="Location">
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{locSt === "ok" ? "Using your live location." : locSt === "cached" ? "Using your last known location." : locSt === "locating" ? "Locating…" : "Using the Lower East Side as home. Allow location for “nearby” picks."}</span>
        <button className="pill pill-line" onClick={onRetryGPS}><Icon name="pin" size={18} /> Update my location</button>
      </Card>

      <Card title="Events feed" right={<span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{eventCount} events</span>}>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>Last refreshed {lastRefreshed ? new Date(lastRefreshed).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "never"}. Refreshes on its own every 6 hours.</span>
        <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}><Icon name="refresh" size={18} /> {refreshing ? "Refreshing…" : "Refresh now"}</button>
        {refreshLog && <span className="muted" style={{ fontSize: 13 }}>{refreshLog}</span>}
        <button className="chip" style={{ alignSelf: "flex-start" }} onClick={() => setShowBackend(!showBackend)}>{showBackend ? "Hide backend settings" : "Backend settings"}</button>
        {showBackend && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 800 }} className="muted">Apps Script URL</label>
            <input className="input" value={backend.url} onChange={(e) => setBackend({ ...backend, url: e.target.value.trim() })} />
            <label style={{ fontSize: 12, fontWeight: 800 }} className="muted">Secret key</label>
            <input className="input" type="password" value={backend.key} onChange={(e) => setBackend({ ...backend, key: e.target.value.trim() })} />
          </div>
        )}
      </Card>

      <div style={{ padding: "4px 20px 20px", textAlign: "center" }}>
        <a href="/?classic=1" className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Open the classic app (sync tools, enrichment, debug)</a>
      </div>
      <div className="muted" style={{ textAlign: "center", fontSize: 12, padding: "8px 0 24px" }}>Version {typeof __BUILD__ !== "undefined" ? new Date(__BUILD__).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "dev"}</div>
    </div>
  );
}
