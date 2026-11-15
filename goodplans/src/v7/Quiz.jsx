// Onboarding quiz: one situation per screen, big tappable cards, a profile reveal at the end
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { QUESTIONS, profileFrom } from "./quiz.js";
import { LIcon } from "./taxonomy.js";
import { Icon } from "./icons.jsx";

const COLORS = ["#E53935", "#7B4BD6", "#F2611D", "#4338CA", "#C98A00", "#C026D3", "#1E9E5A", "#0D9488", "#2563EB"];

export default function Quiz({ initial = {}, onDone, onClose, onImportMaps }) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(initial);
  const total = QUESTIONS.length, q = QUESTIONS[i], done = i >= total;
  const choose = (k) => { const a = { ...ans }; if (k == null) delete a[q.id]; else a[q.id] = k; setAns(a); setTimeout(() => setI(i + 1), k == null ? 0 : 180); };
  const prof = done ? profileFrom(ans) : null;
  const wrap = { position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 18px calc(20px + env(safe-area-inset-bottom))", overflowY: "auto" };
  return createPortal(
    <div style={wrap} role="dialog" aria-label="Get to know you">
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        {i > 0 && !done && <button className="roundbtn" aria-label="Back" onClick={() => setI(i - 1)} style={{ width: 40, height: 40 }}><Icon name="back" size={20} /></button>}
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--chip)", overflow: "hidden" }}>
          <div style={{ width: Math.min(100, (i / total) * 100) + "%", height: "100%", background: "var(--navy)", transition: "width .3s" }} />
        </div>
        <button className="chip" onClick={onClose} style={{ height: 34 }}>{done ? "Close" : "Later"}</button>
      </div>

      {!done ? (
        <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 26, flex: 1 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{i + 1} of {total}</div>
          <h1 className="disp" style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>{q.q}</h1>
          <div style={{ display: "grid", gridTemplateColumns: q.opts.length === 2 || q.opts.length === 3 ? "1fr" : "1fr 1fr", gap: 10 }}>
            {q.opts.map((o, k) => {
              const on = ans[q.id] === k, col = COLORS[(i * 3 + k) % COLORS.length];
              return (
                <button key={o.l} onClick={() => choose(k)} aria-pressed={on}
                  style={{ border: "none", borderRadius: 22, padding: "16px 16px", minHeight: q.opts.length === 4 || q.opts.length === 5 ? 118 : 74, background: on ? col : "var(--card)", color: on ? "#fff" : "var(--ink)", textAlign: "left", display: "flex", flexDirection: q.opts.length >= 4 ? "column" : "row", alignItems: q.opts.length >= 4 ? "flex-start" : "center", justifyContent: "space-between", gap: 12, boxShadow: on ? "none" : "0 1px 0 var(--line)", transition: "background .15s" }}>
                  <span style={{ width: 42, height: 42, borderRadius: 21, background: on ? "rgba(255,255,255,.22)" : col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, order: q.opts.length >= 4 ? 0 : 1 }}>
                    <LIcon node={o.i} size={21} color="#fff" />
                  </span>
                  <span className="disp" style={{ fontSize: 18, lineHeight: 1.15, flex: q.opts.length >= 4 ? undefined : 1 }}>{o.l}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => choose(null)} style={{ border: "none", background: "none", color: "var(--ink3)", fontWeight: 800, fontSize: 14, alignSelf: "center", padding: 8 }}>It depends · skip</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34, flex: 1 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>You are</div>
          <h1 className="disp" style={{ margin: 0, fontSize: 38, lineHeight: 1.02 }}>{prof.name}</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prof.lines.map((l) => <div key={l} className="card-sm" style={{ padding: "12px 14px", fontSize: 16, fontWeight: 700 }}>{l}</div>)}
          </div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>This is a first guess. Good Plans keeps learning from what you open, save and skip, and you can retake this any time in Me.</div>
          <div className="card-sm" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="disp" style={{ fontSize: 17 }}>Make it even sharper</div>
            <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>Import your Google Maps lists: events at places you saved get a boost.</div>
            <button className="pill pill-line" onClick={() => { onDone(ans, prof); onImportMaps(); }}>Import Google Maps lists</button>
          </div>
          <button className="pill pill-dark" style={{ height: 52, marginTop: "auto" }} onClick={() => onDone(ans, prof)}>Show me good plans</button>
        </div>
      )}
    </div>,
    document.body
  );
}
