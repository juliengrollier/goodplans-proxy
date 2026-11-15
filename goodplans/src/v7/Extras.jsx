import React from "react";
import { Dialog, Media, CatBullet, PriceTag } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { nowMinutes, fmtClock, whenLabel, travelLabel, venueLabel, isoDay, todOf } from "./engine.js";

// "I'm free until…" picker. Values are minutes since midnight.
export function FreeUntilDialog({ freeUntil, autoFree, onPick, onClose }) {
  const now = nowMinutes();
  const round = (m) => Math.ceil(m / 15) * 15;
  const opts = [
    ["For 1 hour", round(now + 60)],
    ["For 2 hours", round(now + 120)],
    ["For 3 hours", round(now + 180)],
    ["Until midnight", 24 * 60 - 1],
  ].filter(([, m]) => m <= 24 * 60 - 1 || m === 24 * 60 - 1);
  return (
    <Dialog title="I'm free until…" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {autoFree != null && (
          <button className="card-sm" style={{ border: "none", textAlign: "left", padding: "14px 16px" }} onClick={() => onPick(autoFree)}>
            <div style={{ fontWeight: 800 }}>{fmtClock(autoFree)} · next thing in your calendar</div>
            <div className="muted" style={{ fontSize: 13 }}>From your calendar busy times</div>
          </button>
        )}
        {opts.map(([l, m]) => (
          <button key={l} className="card-sm" style={{ border: "none", textAlign: "left", padding: "14px 16px", fontWeight: 800 }} onClick={() => onPick(m)}>
            {l} <span className="muted" style={{ fontWeight: 600 }}>· until {fmtClock(m)}</span>
          </button>
        ))}
        <label className="muted" style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>Pick a time</label>
        <input className="input" type="time" defaultValue={freeUntil != null ? `${String(Math.floor(freeUntil / 60)).padStart(2, "0")}:${String(freeUntil % 60).padStart(2, "0")}` : ""}
          onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!isNaN(h)) onPick(h * 60 + (m || 0)); }} />
        {freeUntil != null && <button className="pill pill-line" onClick={() => onPick(null)}>Clear</button>}
      </div>
    </Dialog>
  );
}

// Surprise me: one strong pick, full screen
export function Surprise({ ev, dark, today, weather, onOpen, onAnother, onClose, empty }) {
  return (
    <div className="overlay" style={{ alignItems: "stretch" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg)", width: "100%", maxWidth: 520, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 18px calc(22px + env(safe-area-inset-bottom))", gap: 14, overflowY: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="disp" style={{ fontSize: 26 }}>Surprise!</span>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "var(--chip)", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}><Icon name="close" size={18} /></button>
        </div>
        {empty || !ev ? (
          <div className="card" style={{ padding: 22 }}><span style={{ fontSize: 15 }}>Nothing left to surprise you with in the next few days. Try a refresh, or loosen your taste settings in Me.</span></div>
        ) : (
          <>
            <Media ev={ev} dark={dark} height={300} radius={26} big hideTitle />
            <div className="row" style={{ gap: 10 }}><CatBullet ev={ev} size={32} dark={dark} /><span className="muted" style={{ fontWeight: 800, fontSize: 14 }}>{ev.sub || ev.cat}</span><span style={{ marginLeft: "auto" }}><PriceTag ev={ev} /></span></div>
            <h2 className="disp" style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>{ev.title}</h2>
            <div style={{ fontSize: 15, color: "var(--ink2)", fontWeight: 700 }}>{whenLabel(ev, today)} · {venueLabel(ev) || ev.hood}{ev.tt ? " · " + travelLabel(ev.tt) : ""}</div>
            {ev.why?.length > 0 && <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{ev.why.slice(0, 3).map((w) => <span key={w} className="tag tag-plain">{w}</span>)}</div>}
            {weather?.now?.rainingNow && <div className="tag tag-warn" style={{ alignSelf: "flex-start" }}>It's raining now; this one is indoors-friendly</div>}
            <div style={{ flex: 1 }} />
            <button className="pill pill-dark" onClick={() => onOpen(ev)}>Tell me more</button>
            <button className="pill pill-line" onClick={onAnother}><Icon name="refresh" size={18} /> Another one</button>
          </>
        )}
      </div>
    </div>
  );
}

// Asked right after a thumb on a card: what made it a yes or a no, built from this event's own traits.
// Several can be picked. Closing keeps the thumb.
const DOWP = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const TODL = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings", late: "Late nights" };
function whyOptions(ev, dir, today) {
  const up = dir === "up", o = [];
  const kws = (ev.kw || []).slice(0, 3);
  kws.forEach((k) => o.push(["kw:" + k.toLowerCase(), up ? "Into " + k : "Not into " + k]));
  const kind = (ev.sub || ev.cat || "").toLowerCase();
  if (kind && !kws.some((k) => k.toLowerCase() === kind)) o.push([up ? "type" : "notus", up ? "More " + kind : "No more " + kind]);
  if (ev.venue) o.push(["venue", up ? venueLabel(ev) + " is great" : "Not " + venueLabel(ev)]);
  const free = /free|pwyw|pay what/i.test(ev.price || "");
  if (up && free) o.push(["price", "It's free"]);
  else if (!up && !free && ev.price) o.push(["price", "Too pricey · " + ev.price.split("/")[0].trim()]);
  else if (up && ev.price) o.push(["price", "Good price · " + ev.price.split("/")[0].trim()]);
  if (ev.tt) { if (up && ev.tt.mins <= 15) o.push(["near", "Close by · " + ev.tt.mins + " min"]); if (!up && ev.tt.mins > 15) o.push(["far", "Too far · " + ev.tt.mins + " min"]); }
  const day = ev.E && new Date((ev.E <= isoDay(today) ? isoDay(today) : ev.E) + "T12:00:00").getDay();
  if (day != null && day !== false) o.push(["dow:" + day, up ? DOWP[day] + " work for us" : "Bad day · " + DOWP[day].slice(0, -1)]);
  const td = todOf(ev);
  if (td) o.push(["tod:" + td, up ? TODL[td] + " suit us" : TODL[td] + " don't suit us"]);
  if (ev.outdoor) o.push(["outdoor", up ? "Love it outdoors" : "Not outdoors"]);
  if (up && ev.why?.includes("One night only")) o.push(["unique", "One night only"]);
  if (!up) o.push(["seen", "Seen it / not again"]);
  return o;
}
export function WhyDialog({ ev, dir, today, onPick, onClose }) {
  const [sel, setSel] = React.useState([]);
  const opts = whyOptions(ev, dir, today);
  const tog = (k) => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);
  return (
    <Dialog title={dir === "up" ? "What do you like about it?" : "What's not right?"} onClose={onClose}>
      <div className="muted ell" style={{ fontSize: 14, marginTop: -6, marginBottom: 12 }}>{ev.title} · pick any</div>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {opts.map(([k, l]) => (
          <button key={k} className={"chip" + (sel.includes(k) ? " on" : "")} aria-pressed={sel.includes(k)} style={{ height: 38, fontSize: 14 }} onClick={() => tog(k)}>{l}</button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button className="pill pill-line" style={{ flex: 1 }} onClick={onClose}>Skip</button>
        <button className="pill pill-dark" style={{ flex: 1 }} disabled={!sel.length} onClick={() => onPick(sel)}>Done</button>
      </div>
    </Dialog>
  );
}
