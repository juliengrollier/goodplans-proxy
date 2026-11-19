// Dev mode: a small flag button. Tap it, tap anything on screen, add a note; the flag (with the event's tags and
// where it was) goes to /api/flags, where Claude reads it before the next round of changes.
import React, { useState, useEffect } from "react";
import { API_BASE } from "./images.js";
import { primaryIntent } from "./intents.js";
import { userId } from "./telemetry.js";

export const DEV_KEY = "gp_dev_v1";
const VER = typeof __BUILD__ !== "undefined" ? __BUILD__ : "";

const FlagIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" />
  </svg>
);

function describe(el) {
  const txt = (el.innerText || el.getAttribute("aria-label") || el.alt || "").replace(/\s+/g, " ").trim();
  return (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (txt ? ": " + txt.slice(0, 300) : ""));
}
function sectionOf(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.id && !/^root$/.test(n.id)) return "#" + n.id;
    // nearest heading above, within the same parent chain
    let p = n.previousElementSibling;
    for (let k = 0; p && k < 6; k++, p = p.previousElementSibling) {
      const h = p.matches?.("h1,h2,h3") ? p : p.querySelector?.("h1,h2,h3");
      if (h && h.innerText.trim()) return h.innerText.trim().slice(0, 80);
    }
  }
  return "";
}
function evInfo(e) {
  if (!e) return null;
  const pick = ["id", "title", "venue", "hood", "E", "X", "time", "price", "cat", "sub", "ncat", "nsub", "act", "kw", "d", "src", "url", "tier", "ticket", "recLabel", "dates", "dows", "sc", "why"];
  const o = {};
  pick.forEach((k) => { if (e[k] != null && e[k] !== "") o[k] = e[k]; });
  if (e.desc) o.desc = String(e.desc).slice(0, 400);
  try { o.mood = primaryIntent(e); } catch { /* n/a */ }
  if (e.tt) o.tt = { mode: e.tt.mode, mins: e.tt.mins, walk: e.tt.walk };
  return o;
}

export default function DevFlag({ events = [], screen = "", openEv = null }) {
  const [arming, setArming] = useState(false);
  const [pick, setPick] = useState(null); // { target, section, ev, rect }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!arming) return undefined;
    const grab = (x) => {
      const el = x.target;
      if (el.closest?.("[data-devflag]")) return;
      x.preventDefault(); x.stopPropagation(); x.stopImmediatePropagation?.();
      const card = el.closest?.("[data-ev]");
      const id = card?.getAttribute("data-ev") || (openEv && el.closest?.("[role=dialog]") ? openEv : null);
      const ev = id ? events.find((e) => String(e.id) === String(id)) : null;
      const r = el.getBoundingClientRect();
      setPick({ target: describe(card || el), inner: card && card !== el ? describe(el) : "", section: sectionOf(el), ev, rect: { x: r.left, y: r.top, w: r.width, h: r.height } });
      // the click that follows this tap must not open what was tapped
      const eat = (c) => { c.preventDefault(); c.stopPropagation(); c.stopImmediatePropagation?.(); };
      document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 450);
      setArming(false);
    };
    // capture on pointerup (fires on touch and mouse even when touchstart is blocked); swallow everything else
    const block = (x) => { if (!x.target.closest?.("[data-devflag]")) { x.preventDefault(); x.stopPropagation(); x.stopImmediatePropagation?.(); } };
    const T = ["pointerdown", "touchstart", "touchend", "mousedown", "mouseup", "click"];
    document.addEventListener("pointerup", grab, true);
    T.forEach((t) => document.addEventListener(t, block, { capture: true, passive: false }));
    return () => { document.removeEventListener("pointerup", grab, true); T.forEach((t) => document.removeEventListener(t, block, { capture: true })); };
  }, [arming, events, openEv]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch(API_BASE + "/api/flags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        note, target: pick.target + (pick.inner ? " › " + pick.inner : ""), section: pick.section, screen: screen + (openEv ? " › event " + openEv : ""),
        ev: evInfo(pick.ev), ctx: { w: window.innerWidth, h: window.innerHeight, at: new Date().toString(), rect: pick.rect }, ver: VER, user: userId(),
      }) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setPick(null); setNote(""); setMsg("Flag sent"); setTimeout(() => setMsg(""), 1800);
    } catch (e) {
      setMsg("Couldn't send: " + e.message);
    }
    setBusy(false);
  };

  return (
    <>
      {pick?.rect && <div style={{ position: "fixed", left: pick.rect.x - 3, top: pick.rect.y - 3, width: pick.rect.w + 6, height: pick.rect.h + 6, border: "2px solid #FF5A5F", borderRadius: 12, pointerEvents: "none", zIndex: 9997 }} />}
      {arming && <div data-devflag style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: "#FF5A5F", color: "#fff", padding: "8px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, zIndex: 9999 }} onClick={() => setArming(false)}>Tap what you want to flag · cancel</div>}
      {!pick && (
        <button data-devflag aria-label="Flag something" onClick={() => setArming((a) => !a)}
          style={{ position: "fixed", right: 14, bottom: 96, width: 44, height: 44, borderRadius: 22, border: "none", background: arming ? "#FF5A5F" : "rgba(30,30,40,0.85)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", zIndex: 9998 }}>
          <FlagIcon />
        </button>
      )}
      {msg && <div data-devflag style={{ position: "fixed", bottom: 150, right: 14, background: "rgba(30,30,40,0.92)", color: "#fff", padding: "8px 12px", borderRadius: 10, fontSize: 13, zIndex: 9999 }}>{msg}</div>}
      {pick && (
        <div data-devflag style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--bg, #14172b)", color: "var(--ink, #fff)", borderTop: "1px solid rgba(255,255,255,0.12)", borderRadius: "18px 18px 0 0", padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", zIndex: 9999, boxShadow: "0 -8px 30px rgba(0,0,0,0.4)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Flag for Claude</div>
          <div style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 10, maxHeight: 54, overflow: "hidden" }}>
            {pick.ev ? <><b>{pick.ev.title}</b> · {[pick.ev.ncat || pick.ev.cat, pick.ev.nsub || pick.ev.sub].filter(Boolean).join(" › ")}</> : pick.target}
            {pick.section ? " · in " + pick.section : ""}
          </div>
          <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's wrong, or what should happen instead?" rows={3}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", color: "inherit", padding: 10, fontSize: 15, resize: "none" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="pill pill-line" style={{ flex: 1 }} onClick={() => { setPick(null); setNote(""); }}>Cancel</button>
            <button className="pill" style={{ flex: 1 }} disabled={busy || !note.trim()} onClick={send}>{busy ? "Sending…" : "Send"}</button>
          </div>
        </div>
      )}
    </>
  );
}
