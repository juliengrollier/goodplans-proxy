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

// Asked right after a thumb on a card. The options are the reasons Julien actually gives (questionnaire, Nov 2026),
// each naming this event's own detail; the ones used most often come first. Several can be picked; skipping keeps the thumb.
const money = (ev) => (ev.price || "").split("/")[0].trim();
function whyOptions(ev, dir, today, counts = {}) {
  const free = /free|pwyw|pay what/i.test(ev.price || "");
  const kinds = [ev.ncat, ev.nsub].filter(Boolean);
  const vibe = (ev.kw || []).slice(0, 2).join(", ");
  const o = dir === "up"
    ? [
      ["act", "This act or show", ev.title.length > 34 ? ev.title.slice(0, 32) + "…" : ev.title],
      ["genre", "The topic or genre", kinds.join(" · ") || ev.cat],
      ["unique", "Unusual or one-off", "More rare, only-in-NYC things"],
      ["vibe", "The atmosphere", vibe || "The setting and crowd"],
      ["value", free ? "It's free" : "Good value", free ? "Free things get a boost" : money(ev) || "Price"],
    ]
    : [
      ["scene", "Not our scene", kinds.join(" · ") || ev.cat],
      ["pricey", "Too expensive", free ? "Free, but not worth it" : money(ev) || "Price"],
    ];
  return o.sort((a, b) => (counts[dir + ":" + b[0]] || 0) - (counts[dir + ":" + a[0]] || 0));
}
export function WhyDialog({ ev, dir, today, counts, onPick, onClose }) {
  const [sel, setSel] = React.useState([]);
  const [other, setOther] = React.useState(null); // null = closed, string = open text field
  const opts = whyOptions(ev, dir, today, counts);
  const note = (other || "").trim();
  const done = () => onPick([...sel, ...(note ? ["other:" + note] : [])]);
  const tog = (k) => setSel(sel.includes(k) ? sel.filter((y) => y !== k) : [...sel, k]);
  return (
    <Dialog title={dir === "up" ? "What do you like about it?" : "What's not right?"} onClose={onClose}>
      <div className="muted ell" style={{ fontSize: 14, marginTop: -6, marginBottom: 12 }}>{ev.title} · pick any</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map(([k, l, d]) => (
          <button key={k} className="card-sm" aria-pressed={sel.includes(k)} onClick={() => tog(k)}
            style={{ border: sel.includes(k) ? "2px solid var(--ink)" : "2px solid transparent", textAlign: "left", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: sel.includes(k) ? "var(--chip)" : undefined }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, border: "2px solid var(--ink)", background: sel.includes(k) ? "var(--ink)" : "transparent", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{sel.includes(k) ? "✓" : ""}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 15.5, fontWeight: 800 }}>{l}</span>
              {d && <span className="muted ell" style={{ fontSize: 13 }}>{d}</span>}
            </span>
          </button>
        ))}
        <button className="card-sm" aria-pressed={other !== null} onClick={() => setOther(other === null ? "" : null)}
          style={{ border: other !== null ? "2px solid var(--ink)" : "2px solid transparent", textAlign: "left", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: other !== null ? "var(--chip)" : undefined }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, border: "2px solid var(--ink)", background: other !== null ? "var(--ink)" : "transparent", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{other !== null ? "✓" : ""}</span>
          <span style={{ fontSize: 15.5, fontWeight: 800 }}>Other</span>
        </button>
        {other !== null && (
          <textarea autoFocus rows={2} maxLength={200} value={other} onChange={(e) => setOther(e.target.value)}
            placeholder={dir === "up" ? "What made it a yes?" : "What put you off?"}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 12px", font: "inherit", fontSize: 15.5, border: "2px solid var(--line, rgba(255,255,255,.2))", background: "transparent", color: "inherit", resize: "none" }} />
        )}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button className="pill pill-line" style={{ flex: 1 }} onClick={onClose}>Skip</button>
        <button className="pill pill-dark" style={{ flex: 1 }} disabled={!sel.length && !note} onClick={done}>Done</button>
      </div>
    </Dialog>
  );
}
