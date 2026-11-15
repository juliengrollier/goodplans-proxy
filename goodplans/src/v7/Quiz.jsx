// Onboarding v3: activities (tap = love, tap again = not for me), then neighbours of what you loved from the taste map,
// then your whole going-out profile on one page, then a profile reveal.
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { START, PROFILE, profileFrom, picked, meetFrom } from "./quiz.js";
import { ACT } from "./activities.js";
import { CATEGORIES, FAM, LIcon } from "./taxonomy.js";
import { getSpace, neighbours } from "./embed.js";
import { Icon } from "./icons.jsx";

const CATI = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

function ActGrid({ ids, val, onTap, dark }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {ids.map((id) => {
        const a = ACT[id], c = CATI[a.ncat], fam = FAM[c?.fam], col = fam ? (dark ? fam.dark : fam.light) : "#475569", v = val[id] || 0;
        return (
          <button key={id} onClick={() => onTap(id)} aria-pressed={v > 0} aria-label={a.label + (v > 0 ? ": love" : v < 0 ? ": not for me" : "")}
            style={{ position: "relative", border: v < 0 ? "2px dashed var(--line)" : "none", borderRadius: 18, padding: "12px 8px 10px", minHeight: 92, background: v > 0 ? col : "var(--card)", color: v > 0 ? "#fff" : "var(--ink)", opacity: v < 0 ? 0.5 : 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, textAlign: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 17, background: v > 0 ? "rgba(255,255,255,.22)" : col, display: "flex", alignItems: "center", justifyContent: "center" }}>{c && <LIcon node={c.icon} size={17} color="#fff" />}</span>
            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.15, textDecoration: v < 0 ? "line-through" : "none" }}>{a.label[0].toUpperCase() + a.label.slice(1)}</span>
            {v !== 0 && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, background: v > 0 ? "rgba(255,255,255,.95)" : "var(--chip)", color: v > 0 ? col : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={v > 0 ? "heart" : "close"} size={12} fill={v > 0 ? "currentColor" : "none"} /></span>}
          </button>
        );
      })}
    </div>
  );
}

export default function Quiz({ initial = {}, onDone, onClose, onImportMaps, dark }) {
  const [step, setStep] = useState(0); // 0 activities · 1 closer in · 2 profile · 3 reveal
  const [ans, setAns] = useState({ acts: {}, more: {}, ...initial });
  const [meet, setMeet] = useState(null);
  const cycle = (k) => (id) => { const cur = ans[k]?.[id] || 0, nx = cur === 0 ? 1 : cur === 1 ? -1 : 0; const o = { ...(ans[k] || {}) }; if (nx) o[id] = nx; else delete o[id]; setAns({ ...ans, [k]: o }); };
  const loved = Object.entries(ans.acts || {}).filter(([, v]) => v > 0).map(([k]) => k);
  const nope = new Set(Object.entries(ans.acts || {}).filter(([, v]) => v < 0).map(([k]) => k));
  // Closer in: activities nearest to what you loved in the taste map, scored by summed similarity
  const more = useMemo(() => {
    if (!loved.length) return [];
    const sp = getSpace(), s = {};
    loved.forEach((id) => neighbours(sp, "act:" + id, 8).forEach(([f, c]) => { const a = f.slice(4); if (START.includes(a) || nope.has(a) || !ACT[a]) return; s[a] = (s[a] || 0) + c; }));
    return Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([a]) => a);
  }, [step === 1]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (q, i) => { const cur = picked(ans[q.id]); const n = q.multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : cur[0] === i ? [] : [i]; setAns({ ...ans, [q.id]: n }); };
  const prof = step === 3 ? profileFrom(ans) : null;
  const wantsMeet = meet == null ? meetFrom(ans) : meet;
  const go = (n) => { setStep(n); window.scrollTo?.(0, 0); };
  const nLoved = loved.length + Object.values(ans.more || {}).filter((v) => v > 0).length;
  const wrap = { position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))", overflowY: "auto" };
  const H = ({ k, t, sub }) => (
    <>
      <div className="muted" style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
      <h1 className="disp" style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{t}</h1>
      {sub && <div className="muted" style={{ fontSize: 14, lineHeight: 1.4, marginTop: -6 }}>{sub}</div>}
    </>
  );
  return createPortal(
    <div style={wrap} role="dialog" aria-label="Get to know you">
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        {step > 0 && step < 3 && <button className="roundbtn" aria-label="Back" onClick={() => go(step === 2 && !more.length ? 0 : step - 1)} style={{ width: 40, height: 40 }}><Icon name="back" size={20} /></button>}
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--chip)", overflow: "hidden" }}><div style={{ width: (step / 3) * 100 + "%", height: "100%", background: "var(--navy)", transition: "width .3s" }} /></div>
        <button className="chip" onClick={onClose} style={{ height: 34 }}>{step === 3 ? "Close" : "Later"}</button>
      </div>

      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <H k="1 of 3" t="What would you happily go to?" sub="Tap once for love, twice for not for me. Skip what you're unsure about." />
          <ActGrid ids={START} val={ans.acts || {}} onTap={cycle("acts")} dark={dark} />
          <button className="pill pill-dark" disabled={!loved.length} onClick={() => go(more.length || loved.length ? 1 : 2)} style={{ height: 50, opacity: loved.length ? 1 : 0.4 }}>{loved.length ? "Next · " + loved.length + " loved" : "Love at least one"}</button>
        </div>
      )}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <H k="2 of 3" t="Closer to what you like" sub="Picked from what sits near your loves on the taste map. Same taps." />
          {more.length ? <ActGrid ids={more} val={ans.more || {}} onTap={cycle("more")} dark={dark} /> : <div className="muted">Nothing to add here.</div>}
          <button className="pill pill-dark" onClick={() => go(2)} style={{ height: 50 }}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}>
          <H k="3 of 3" t="How you go out" sub="Pick what's usually true. Skip any row." />
          {PROFILE.map((q) => (
            <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{q.q}{q.multi && <span className="muted" style={{ fontWeight: 600, fontSize: 12.5 }}> · any</span>}</div>
              <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
                {q.opts.map((o, i) => { const on = picked(ans[q.id]).includes(i); return <button key={o.l} className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggle(q, i)} style={{ height: 38, fontSize: 14 }}>{o.l}</button>; })}
              </div>
            </div>
          ))}
          <button className="pill pill-dark" onClick={() => go(3)} style={{ height: 50, marginTop: 4 }}>See my profile</button>
        </div>
      )}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30, flex: 1 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>You are</div>
          <h1 className="disp" style={{ margin: 0, fontSize: 36, lineHeight: 1.04 }}>{prof.name}</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{prof.lines.map((l) => <div key={l} className="card-sm" style={{ padding: "12px 14px", fontSize: 15.5, fontWeight: 700 }}>{l}</div>)}</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>A first guess from {nLoved} loves. Good Plans keeps learning from what you open, save and skip. Retake this any time in Me.</div>
          <button onClick={() => setMeet(!wantsMeet)} aria-pressed={wantsMeet} className="card-sm" style={{ border: wantsMeet ? "2px solid var(--navy)" : "2px solid transparent", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", color: "var(--ink)" }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, border: wantsMeet ? "none" : "2px solid var(--line)", background: wantsMeet ? "var(--navy)" : "transparent", color: "var(--onnavy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wantsMeet && <Icon name="check" size={16} />}</span>
            <span><span className="disp" style={{ fontSize: 16.5, display: "block" }}>I want to meet new people</span><span className="muted" style={{ fontSize: 13.5, lineHeight: 1.4 }}>Favours classes, clubs and events built for meeting people.</span></span>
          </button>
          <div className="card-sm" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="disp" style={{ fontSize: 17 }}>Make it even sharper</div>
            <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>Import your Google Maps lists: events at places you saved get a boost.</div>
            <button className="pill pill-line" onClick={() => { onDone(ans, prof, wantsMeet); onImportMaps(); }}>Import Google Maps lists</button>
          </div>
          <button className="pill pill-dark" style={{ height: 52, marginTop: "auto" }} onClick={() => onDone(ans, prof, wantsMeet)}>Show me good plans</button>
        </div>
      )}
    </div>,
    document.body
  );
}
