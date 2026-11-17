// Quick tour after onboarding: a welcome, four tips pointed at the real screen (spotlight + card), a goodbye. Skippable, shown once.
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export const TOUR_KEY = "gp_tour_done_v1";

const nm = () => { try { const n = localStorage.getItem("gp_name_v1"); return n ? ", " + n : ""; } catch { return ""; } };
// A welcome, four tips on the real screen, a goodbye. Steps without sel are centred cards.
export const TOUR_STEPS = [
  { title: () => "Welcome to Good Plans" + nm(), text: "You're all set. Here's a 30-second look at how to get the most out of it.", next: "Show me", skip: "Not now" },
  { sel: "#tour-moods", title: "Start with a mood", text: "What do you feel like doing? Tap a mood and \u201cFor you\u201d fills up with plans that fit. The moods you hearted stay up front; hold any tile to move it." },
  { sel: "#tour-with", title: "Then, who's coming?", text: "Out on a date, with friends, with the kids, or hoping to meet people? Choose here and the picks shift to suit." },
  { sel: "#tour-card", title: "Keep what you like", text: "Tap the bookmark to save a plan; it lands in your plans and your calendar. Thumbs up or down help Good Plans learn your taste, and a thumbs down also clears that event away." },
  { sel: "#tour-head", title: "Everything you've kept", text: "Your saved plans, favourites and profile are always one tap away, right up here." },
  { title: "That's it", text: () => "The more you tap, save and react, the better your plans get. Enjoy the city" + nm() + "!", next: "Let's go" },
];

export default function Tour({ steps = TOUR_STEPS, onDone }) {
  const live = steps.filter((s) => !s.sel || document.querySelector(s.sel));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = live[i];
  const tips = live.filter((s) => s.sel);
  // Bring the element into view, then measure it (again on scroll and resize)
  useLayoutEffect(() => {
    if (!step) return;
    if (!step.sel) { setRect(null); if (i === live.length - 1) window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.querySelector(step.sel); if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(null);
    const measure = () => { const r = el.getBoundingClientRect(); setRect({ x: r.left, y: r.top, w: r.width, h: r.height }); };
    const t = setTimeout(measure, 420);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [i, step?.sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!live.length) onDone(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!step) return null;
  const done = () => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* private */ } onDone(); };
  const next = () => (i + 1 < live.length ? setI(i + 1) : done());
  const pad = 8, vh = window.innerHeight, vw = window.innerWidth;
  const hole = rect && { left: Math.max(4, rect.x - pad), top: rect.y - pad, width: Math.min(vw - 8, rect.w + pad * 2), height: rect.h + pad * 2 };
  const below = hole && hole.top + hole.height + 190 < vh;
  const cardTop = hole ? (below ? hole.top + hole.height + 12 : Math.max(12, hole.top - 12 - 190)) : vh / 2 - 110;
  const val = (x) => (typeof x === "function" ? x() : x);
  const centred = !step.sel;
  return createPortal(
    <div role="dialog" aria-label={"Tour, step " + (i + 1) + " of " + live.length} style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <style>{"@keyframes gpTourIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
      {hole
        ? <div style={{ position: "fixed", ...hole, borderRadius: 18, boxShadow: "0 0 0 9999px rgba(10,12,30,.64)", transition: "all .25s ease", pointerEvents: "none" }} />
        : <div style={{ position: "fixed", inset: 0, background: "rgba(10,12,30,.64)", transition: "background .25s" }} />}
      <div key={i} onClick={(e) => e.stopPropagation()} className="card"
        style={{ position: "fixed", left: 16, right: 16, top: cardTop, maxWidth: 448, margin: "0 auto", padding: centred ? "22px 20px 16px" : "16px 18px 14px", boxShadow: "0 12px 32px rgba(0,0,0,.3)", animation: "gpTourIn .3s ease both", visibility: step.sel && !rect ? "hidden" : "visible" }}>
        {!centred && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{tips.indexOf(step) + 1} of {tips.length}</div>}
        <div className="disp" style={{ fontSize: centred ? 24 : 20, margin: centred ? "0 0 8px" : "4px 0 6px" }}>{val(step.title)}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>{val(step.text)}</div>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          {i + 1 < live.length ? <button onClick={done} style={{ border: "none", background: "none", padding: "6px 0", fontSize: 14, fontWeight: 700, color: "var(--ink3)" }}>{step.skip || "Skip tour"}</button> : <span />}
          <button className="pill pill-dark" onClick={next} style={{ height: 40, padding: "0 20px" }}>{step.next || "Next"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
