// Onboarding v6: one page. Your name, then "I'd rather…" rows of three; one tap per row. Then straight to Home.
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ROWS, profileFrom, meetFrom } from "./quiz.js";
import { ACT } from "./activities.js";
import { CATEGORIES, FAM, LIcon } from "./taxonomy.js";
import { Icon } from "./icons.jsx";

const CATI = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function Quiz({ onDone, onClose, dark }) {
  const [rows, setRows] = useState({});
  const [name, setName] = useState(() => { try { return localStorage.getItem("gp_name_v1") || ""; } catch { return ""; } });
  const n = Object.keys(rows).length;
  const tap = (r, i) => { const x = { ...rows }; if (x[r] === i) delete x[r]; else x[r] = i; setRows(x); };
  const finish = () => {
    try { if (name.trim()) localStorage.setItem("gp_name_v1", name.trim()); } catch { /* private */ }
    const ans = { rows }; onDone(ans, profileFrom(ans), meetFrom(ans));
  };
  const wrap = { position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", overflowY: "auto", padding: "calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))" };
  return createPortal(
    <div style={wrap} role="dialog" aria-label="Get to know you">
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="chip" onClick={onClose} style={{ height: 34 }}>Later</button></div>
      <h1 className="disp" style={{ margin: "10px 4px 6px", fontSize: 30, lineHeight: 1.08 }}>Six quick picks</h1>
      <div className="muted" style={{ margin: "0 4px 18px", fontSize: 14.5 }}>For each row, tap the one you'd rather do. Skip any you can't choose.</div>

      <label style={{ display: "block", margin: "0 4px 22px" }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink3)", marginBottom: 6 }}>What should we call you?</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoComplete="given-name" style={{ width: "100%" }} />
      </label>

      <div style={{ margin: "0 4px 10px", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink3)" }}>I'd rather…</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ROWS.map((r, ri) => (
          <div key={r.id} style={{ padding: ri ? "14px 0 0" : 0, marginTop: ri ? 14 : 0, borderTop: ri ? "1px solid var(--line, rgba(128,128,128,.22))" : "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              {r.opts.map((o, i) => {
                const a = o.acts && ACT[o.acts[0]], c = a && CATI[a.ncat], fam = c && FAM[c.fam];
                const col = fam ? (dark ? fam.dark : fam.light) : "#475569";
                const on = rows[r.id] === i, dim = rows[r.id] != null && !on;
                return (
                  <button key={o.l} aria-pressed={on} onClick={() => tap(r.id, i)}
                    style={{ position: "relative", minHeight: 84, border: "none", borderRadius: 16, padding: "10px 8px", background: on ? col : "var(--card)", color: on ? "#fff" : "var(--ink)", opacity: dim ? 0.5 : 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", transition: "background .15s, opacity .15s, transform .1s", transform: on ? "scale(1.03)" : "none" }}>
                    {c && <span style={{ width: 28, height: 28, borderRadius: 14, background: on ? "rgba(255,255,255,.22)" : col, display: "flex", alignItems: "center", justifyContent: "center" }}><LIcon node={c.icon} size={15} color="#fff" /></span>}
                    <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.18 }}>{o.l}</span>
                    {on && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 6, display: "flex" }}><Icon name="check" size={14} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button className="pill pill-dark" onClick={finish} disabled={n < 3} style={{ width: "100%", height: 52, marginTop: 24, opacity: n >= 3 ? 1 : 0.45 }}>{n >= 3 ? "Show me good plans" : "Pick at least 3"}</button>
    </div>,
    document.body
  );
}
