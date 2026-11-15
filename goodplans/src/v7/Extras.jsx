import React from "react";
import { Dialog, Media, CatBullet, PriceTag } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { nowMinutes, fmtClock, whenLabel, travelLabel, venueLabel } from "./engine.js";

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
            <div className="row" style={{ gap: 10 }}><CatBullet cat={ev.cat} size={32} dark={dark} /><span className="muted" style={{ fontWeight: 800, fontSize: 14 }}>{ev.sub || ev.cat}</span><span style={{ marginLeft: "auto" }}><PriceTag ev={ev} /></span></div>
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

// Asked right after a thumb on a card: what made it a yes or a no. Optional; closing keeps the thumb.
const WHY = {
  up: [["type", "Love this kind of event"], ["venue", "Great venue", "Follows the venue"], ["price", "Good price", "Paid nights get pushed down a little"], ["near", "Close by", "Far trips get pushed down a little"], ["timing", "Good timing"], ["unique", "One of a kind"]],
  down: [["notus", "Not our thing", "Less of this kind of event"], ["far", "Too far"], ["price", "Too pricey"], ["seen", "Seen it / not again", "Hides this series"], ["venue", "Not this venue", "Pushes this venue down"], ["timing", "Bad timing"]],
};
export function WhyDialog({ ev, dir, onPick, onClose }) {
  return (
    <Dialog title={dir === "up" ? "What do you like about it?" : "What's wrong with it?"} onClose={onClose}>
      <div className="muted ell" style={{ fontSize: 14, marginTop: -6, marginBottom: 12 }}>{ev.title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {WHY[dir].map(([k, l, d]) => (
          <button key={k} className="card-sm" style={{ border: "none", textAlign: "left", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }} onClick={() => onPick(k)}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{l}</span>
            {d && <span className="muted" style={{ fontSize: 12 }}>{d}</span>}
          </button>
        ))}
      </div>
      <button className="pill pill-line" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>Skip</button>
    </Dialog>
  );
}
