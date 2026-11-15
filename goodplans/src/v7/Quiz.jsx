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

// Each card: neutral by default; Meh or Love buttons (tap the same one again to go back to neutral)
function ActGrid({ ids, val, onSet, dark }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {ids.map((id) => {
        const a = ACT[id], c = CATI[a.ncat], fam = FAM[c?.fam], col = fam ? (dark ? fam.dark : fam.light) : "#475569", v = val[id] || 0;
        const btn = (on) => ({ flex: 1, height: 32, border: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, background: on ? (v > 0 ? "#fff" : "var(--ink)") : v > 0 ? "rgba(255,255,255,.2)" : "var(--chip)", color: on ? (v > 0 ? col : "var(--bg)") : v > 0 ? "#fff" : "var(--ink2)" });
        return (
          <div key={id} style={{ borderRadius: 18, padding: "11px 7px 7px", background: v > 0 ? col : "var(--card)", color: v > 0 ? "#fff" : "var(--ink)", opacity: v < 0 ? 0.55 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", transition: "background .15s, opacity .15s" }}>
            <span style={{ width: 32, height: 32, borderRadius: 16, background: v > 0 ? "rgba(255,255,255,.22)" : col, display: "flex", alignItems: "center", justifyContent: "center" }}>{c && <LIcon node={c.icon} size={16} color="#fff" />}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, minHeight: 29, display: "flex", alignItems: "center" }}>{a.label[0].toUpperCase() + a.label.slice(1)}</span>
            <span className="row" style={{ gap: 5, width: "100%" }}>
              <button aria-label={"Meh: " + a.label} aria-pressed={v < 0} onClick={() => onSet(id, v < 0 ? 0 : -1)} style={btn(v < 0)}><Icon name="down" size={15} /></button>
              <button aria-label={"Love: " + a.label} aria-pressed={v > 0} onClick={() => onSet(id, v > 0 ? 0 : 1)} style={btn(v > 0)}><Icon name="heart" size={15} fill={v > 0 ? "currentColor" : "none"} /></button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Quiz({ initial = {}, onDone, onClose, onImportMaps, dark }) {
  const [step, setStep] = useState(0); // 0 activities · 1 closer in · 2 profile · 3 reveal
  const [ans, setAns] = useState({ acts: {}, more: {}, ...initial });
  const [meet, setMeet] = useState(null);
  const setV = (k) => (id, nx) => { const o = { ...(ans[k] || {}) }; if (nx) o[id] = nx; else delete o[id]; setAns({ ...ans, [k]: o }); };
  const [qi, setQi] = useState(0); // screen 3: one question at a time
  const loved = Object.entries(ans.acts || {}).filter(([, v]) => v > 0).map(([k]) => k);
  const nope = new Set(Object.entries(ans.acts || {}).filter(([, v]) => v < 0).map(([k]) => k));
  // Closer in: activities nearest to what you loved in the taste map, scored by summed similarity
  const more = useMemo(() => {
    if (!loved.length) return [];
    const sp = getSpace(), s = {};
    loved.forEach((id) => neighbours(sp, "act:" + id, 8).forEach(([f, c]) => { const a = f.slice(4); if (START.includes(a) || nope.has(a) || !ACT[a]) return; s[a] = (s[a] || 0) + c; }));
    return Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([a]) => a);
  }, [step === 1]); // eslint-disable-line react-hooks/exhaustive-deps
  const answer = (q, i) => { setAns({ ...ans, [q.id]: [i] }); setTimeout(() => (qi + 1 < PROFILE.length ? setQi(qi + 1) : go(3)), 200); };
  const skipQ = () => (qi + 1 < PROFILE.length ? setQi(qi + 1) : go(3));
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
        {step > 0 && step < 3 && <button className="roundbtn" aria-label="Back" onClick={() => (step === 2 && qi > 0 ? setQi(qi - 1) : go(step === 2 && !more.length ? 0 : step - 1))} style={{ width: 40, height: 40 }}><Icon name="back" size={20} /></button>}
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--chip)", overflow: "hidden" }}><div style={{ width: ((step + (step === 2 ? qi / PROFILE.length : 0)) / 3) * 100 + "%", height: "100%", background: "var(--navy)", transition: "width .3s" }} /></div>
        <button className="chip" onClick={onClose} style={{ height: 34 }}>{step === 3 ? "Close" : "Later"}</button>
      </div>

      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <H k="1 of 3" t="What would you happily go to?" sub="Love what you'd go to, Meh what you wouldn't. Leave the rest." />
          <ActGrid ids={START} val={ans.acts || {}} onSet={setV("acts")} dark={dark} />
          <button className="pill pill-dark" disabled={!loved.length} onClick={() => go(more.length || loved.length ? 1 : 2)} style={{ height: 50, opacity: loved.length ? 1 : 0.4 }}>{loved.length ? "Next · " + loved.length + " loved" : "Love at least one"}</button>
        </div>
      )}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <H k="2 of 3" t="Closer to what you like" sub="Picked from what sits near your loves on the taste map." />
          {more.length ? <ActGrid ids={more} val={ans.more || {}} onSet={setV("more")} dark={dark} /> : <div className="muted">Nothing to add here.</div>}
          <button className="pill pill-dark" onClick={() => go(2)} style={{ height: 50 }}>Next</button>
        </div>
      )}
      {step === 2 && (() => { const q = PROFILE[qi], cur = picked(ans[q.id]); return (
        <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
          <H k={"3 of 3 · " + (qi + 1) + "/" + PROFILE.length} t={q.q} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
            {q.opts.map((o, i) => <button key={o.l} aria-pressed={cur.includes(i)} onClick={() => answer(q, i)} className="card-sm" style={{ height: 58, border: cur.includes(i) ? "2px solid var(--navy)" : "2px solid transparent", fontSize: 17, fontWeight: 800, textAlign: "left", padding: "0 18px", color: "var(--ink)", background: cur.includes(i) ? "var(--chip)" : undefined }}>{o.l}</button>)}
          </div>
          <button onClick={skipQ} style={{ border: "none", background: "none", color: "var(--ink3)", fontWeight: 800, fontSize: 14, alignSelf: "center", padding: 8 }}>It depends · skip</button>
        </div>
      ); })()}
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
