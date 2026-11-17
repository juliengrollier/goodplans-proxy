// Onboarding v7: three quiet screens. 1) Sign in (logo + promise; Google, or continue without an account)
// 2) Favourite moods (at least one) 3) "Which would you rather?" (at least three rows). Then Home and the tour.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ROWS, profileFrom, meetFrom } from "./quiz.js";
import { ACT } from "./activities.js";
import { CATEGORIES, LIcon } from "./taxonomy.js";
import { Icon, Logo } from "./icons.jsx";
import { INTENTS, INTENT, primaryIntent } from "./intents.js";
import { loadGIS } from "../lib/core.js";

const CATI = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const GOOGLE_CLIENT_ID = "485243730775-p30fh8ams562nt6b6tm234p3kc3plecb.apps.googleusercontent.com";
export const ACCOUNT_KEY = "gp_account_v1";
export const loadAccount = () => { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null"); } catch { return null; } };
const saveAccount = (a) => { try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a)); if (a.name) localStorage.setItem("gp_name_v1", a.name); } catch { /* private */ } };
const jwt = (t) => { try { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(p)))); } catch { return null; } };

const CSS = `
@keyframes gpIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes gpBack{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
@keyframes gpRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.gp-ob button{-webkit-tap-highlight-color:transparent}
.gp-ob .tap:active{transform:scale(.97)}
`;

// Official Google button (Google Identity Services); hidden if it can't load here
function GoogleButton({ onAccount, dark, width }) {
  const ref = useRef(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    loadGIS().then(() => {
      if (!alive || !window.google?.accounts?.id || !ref.current) { setState("off"); return; }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID, ux_mode: "popup", auto_select: false, itp_support: true,
        callback: (r) => { const p = jwt(r.credential || ""); if (p) onAccount({ provider: "google", sub: p.sub, name: p.given_name || (p.name || "").split(" ")[0] || "", email: p.email || "", picture: p.picture || "", at: Date.now() }); },
      });
      window.google.accounts.id.renderButton(ref.current, { type: "standard", theme: dark ? "filled_black" : "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", width });
      setState("on");
    }).catch(() => alive && setState("off"));
    return () => { alive = false; };
  }, [dark, width]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ minHeight: 44, display: "flex", justifyContent: "center" }}>
      <div ref={ref} style={{ display: state === "off" ? "none" : "block", colorScheme: "light" }} />
      {state === "off" && <div className="muted" style={{ fontSize: 13, textAlign: "center", padding: "12px 0" }}>Google sign-in isn't available right now.</div>}
    </div>
  );
}

function Progress({ at }) {
  return (
    <div className="row" style={{ gap: 6, flex: 1, maxWidth: 120 }} aria-label={"Step " + at + " of 2"}>
      {[1, 2].map((k) => <span key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= at ? "var(--ink)" : "var(--line)", transition: "background .3s" }} />)}
    </div>
  );
}

export default function Quiz({ onDone, onAuth, dark, startAt = "auth", needQuiz = true }) {
  const [step, setStep] = useState(startAt);
  const [dir, setDir] = useState(1);
  const go = (s, d = 1) => { setDir(d); setStep(s); document.querySelector(".gp-ob")?.scrollTo({ top: 0 }); };
  const [rows, setRows] = useState({});
  const n = Object.keys(rows).length;
  const [moods, setMoods] = useState(() => { try { const f = JSON.parse(localStorage.getItem("gp_intent_fav") || "[]"); return Array.isArray(f) ? f.filter((id) => INTENT[id]) : []; } catch { return []; } });
  const flip = (id) => setMoods(moods.includes(id) ? moods.filter((x) => x !== id) : [...moods, id]);
  const tap = (r, i) => { const x = { ...rows }; if (x[r] === i) delete x[r]; else x[r] = i; setRows(x); };
  const authed = (a) => { saveAccount(a); onAuth?.(a); if (needQuiz) go("moods"); else onDone(null); };
  const finish = () => {
    try { localStorage.setItem("gp_intent_fav", JSON.stringify(moods)); window.dispatchEvent(new Event("gp-moodfav")); } catch { /* private */ }
    const ans = { rows, moods }; onDone(ans, profileFrom(ans), meetFrom(ans));
  };
  const w = Math.min(340, (typeof window !== "undefined" ? window.innerWidth : 400) - 48);
  const anim = { animation: (dir > 0 ? "gpIn" : "gpBack") + " .32s cubic-bezier(.2,.8,.2,1) both" };
  const wrap = { position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", overflowY: "auto", WebkitOverflowScrolling: "touch" };
  const col = { maxWidth: 480, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column", padding: "calc(14px + env(safe-area-inset-top)) 22px 0" };
  const footer = { position: "sticky", bottom: 0, margin: "auto -22px 0", padding: "14px 22px calc(18px + env(safe-area-inset-bottom))", background: "linear-gradient(to bottom, transparent, var(--bg) 22%)" };
  const cta = (ok, label, onClick) => <button className="pill pill-dark tap" onClick={onClick} disabled={!ok} style={{ width: "100%", height: 54, fontSize: 16, opacity: ok ? 1 : 0.4, transition: "opacity .2s, transform .1s" }}>{label}</button>;
  const h1 = { margin: "26px 0 8px", fontSize: 31, lineHeight: 1.1, letterSpacing: -0.4 };
  const sub = { margin: 0, fontSize: 15.5, lineHeight: 1.45, color: "var(--ink2)" };

  return createPortal(
    <div className="gp-ob" style={wrap} role="dialog" aria-label="Welcome to Good Plans">
      <style>{CSS}</style>

      {step === "auth" && (
        <div style={{ ...col, justifyContent: "space-between" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 6px 24px", animation: "gpRise .5s ease both" }}>
            <div className="row" style={{ gap: 10, marginBottom: 44 }}>
              <Logo size={40} dark={dark} />
              <span className="disp" style={{ fontSize: 27, letterSpacing: -0.3 }}>good plans</span>
            </div>
            <h1 className="disp" style={{ margin: 0, fontSize: 42, lineHeight: 1.02, letterSpacing: -1 }}>Never wonder what to do next.</h1>
            <p style={{ margin: "16px 0 0", fontSize: 17.5, lineHeight: 1.45, color: "var(--ink2)", maxWidth: 330 }}>Good Plans knows you, the city, and how to make you love it.</p>
          </div>
          <div style={{ padding: "0 0 calc(22px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14, animation: "gpRise .5s .12s ease both" }}>
            <GoogleButton onAccount={authed} dark={dark} width={w} />
            <button className="tap" onClick={() => authed({ provider: "guest", at: Date.now() })} style={{ border: "none", background: "none", padding: "8px 0", fontSize: 15, fontWeight: 700, color: "var(--ink2)" }}>Continue without an account</button>
            <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center" }}>Your name and email stay on this phone. Nothing is ever posted.</p>
          </div>
        </div>
      )}

      {step === "moods" && (
        <div key="moods" style={col}>
          <div className="row" style={{ height: 36, gap: 14 }}><Progress at={1} /></div>
          <div style={anim}>
            <h1 className="disp" style={h1}>What are you often in the mood for?</h1>
            <p style={sub}>Pick as many as you like. They'll always come first.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "24px 0 16px" }}>
              {INTENTS.map((it) => { const on = moods.includes(it.id); return (
                <button key={it.id} className="tap" aria-pressed={on} onClick={() => flip(it.id)}
                  style={{ height: 62, borderRadius: 18, border: "1.5px solid " + (on ? it.color : "var(--line)"), background: on ? it.color : "var(--card)", color: on ? "#fff" : "var(--ink)", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 15, fontWeight: 700, textAlign: "left", transition: "background .18s, border-color .18s, color .18s, transform .1s" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "rgba(255,255,255,.2)" : it.color + "1F" }}>{React.createElement(it.icon, { size: 18, strokeWidth: 2.2, color: on ? "#fff" : it.color })}</span>
                  <span style={{ flex: 1, lineHeight: 1.15 }}>{it.label}</span>
                  <span style={{ display: "flex", opacity: on ? 0.9 : 0.25 }}><Icon name="heart" size={15} fill={on ? "currentColor" : "none"} /></span>
                </button>
              ); })}
            </div>
          </div>
          <div style={footer}>{cta(moods.length > 0, moods.length ? "Continue" : "Pick at least one", () => go("rather"))}</div>
        </div>
      )}

      {step === "rather" && (
        <div key="rather" style={col}>
          <div className="row" style={{ height: 36, gap: 14 }}>
            <button className="tap" aria-label="Back" onClick={() => go("moods", -1)} style={{ border: "none", background: "none", padding: 0, marginLeft: -4, display: "flex", color: "var(--ink)" }}><Icon name="back" size={24} /></button>
            <Progress at={2} />
          </div>
          <div style={anim}>
            <h1 className="disp" style={h1}>Which would you rather?</h1>
            <p style={sub}>One tap per row. Skip any you can't decide.</p>
            <div style={{ display: "flex", flexDirection: "column", margin: "16px 0 16px" }}>
              {ROWS.map((r, ri) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "18px 0", borderTop: ri ? "1px solid var(--line)" : "none" }}>
                  {r.opts.map((o, i) => {
                    const a = o.acts && ACT[o.acts[0]], c = a && CATI[a.ncat], m = a ? primaryIntent({ act: o.acts[0], ncat: a.ncat }) : null;
                    const color = m ? m.color : "#475569";
                    const on = rows[r.id] === i, dim = rows[r.id] != null && !on;
                    return (
                      <button key={o.l} className="tap" aria-pressed={on} onClick={() => tap(r.id, i)}
                        style={{ minHeight: 88, border: "1.5px solid " + (on ? color : "var(--line)"), borderRadius: 18, padding: "10px 6px", background: on ? color : "var(--card)", color: on ? "#fff" : "var(--ink)", opacity: dim ? 0.45 : 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, textAlign: "center", transition: "background .18s, opacity .18s, border-color .18s, transform .1s" }}>
                        {c && <span style={{ width: 30, height: 30, borderRadius: 15, background: on ? "rgba(255,255,255,.2)" : color + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><LIcon node={c.icon} size={16} color={on ? "#fff" : color} /></span>}
                        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.18 }}>{o.l}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div style={footer}>{cta(n >= 3, n >= 3 ? "Show me good plans" : "Pick " + (3 - n) + " more", finish)}</div>
        </div>
      )}
    </div>,
    document.body
  );
}
