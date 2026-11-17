// Quick tour after onboarding: a few tips pointed at the real screen (spotlight + card), skippable, shown once.
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export const TOUR_KEY = "gp_tour_done_v1";

export const TOUR_STEPS = [
  { sel: "#tour-moods", title: "Pick a mood", text: "Tap a mood to see picks for it. Heart the ones you love to keep them first. Hold a tile and drag to reorder." },
  { sel: "#tour-with", title: "Who are you with?", text: "On a date, with friends or kids, or out to meet people? Pick it and the suggestions adjust." },
  { sel: "#tour-card", title: "Save and teach", text: "The bookmark saves a plan to your list and calendar. Thumbs up or down teach Good Plans your taste; a thumbs-down hides it for good." },
  { sel: "#tour-head", title: "Your corner", text: "Your saved plans, your favourites and your profile, always up here." },
];

export default function Tour({ steps = TOUR_STEPS, onDone }) {
  const live = steps.filter((s) => document.querySelector(s.sel));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = live[i];
  // Bring the element into view, then measure it (again on scroll and resize)
  useLayoutEffect(() => {
    if (!step) return;
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
  const cardTop = hole ? (below ? hole.top + hole.height + 12 : Math.max(12, hole.top - 12 - 178)) : vh / 2 - 90;
  return createPortal(
    <div role="dialog" aria-label={"Tour, step " + (i + 1) + " of " + live.length} style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={next}>
      {hole
        ? <div style={{ position: "fixed", ...hole, borderRadius: 18, boxShadow: "0 0 0 9999px rgba(10,12,30,.64)", transition: "all .25s ease", pointerEvents: "none" }} />
        : <div style={{ position: "fixed", inset: 0, background: "rgba(10,12,30,.64)" }} />}
      <div onClick={(e) => e.stopPropagation()} className="card"
        style={{ position: "fixed", left: 16, right: 16, top: cardTop, maxWidth: 448, margin: "0 auto", padding: "16px 18px 14px", transition: "top .25s ease", boxShadow: "0 12px 32px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{i + 1} of {live.length}</div>
        <div className="disp" style={{ fontSize: 20, margin: "4px 0 6px" }}>{step.title}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>{step.text}</div>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <button onClick={done} style={{ border: "none", background: "none", padding: "6px 0", fontSize: 14, fontWeight: 700, color: "var(--ink3)" }}>Skip</button>
          <button className="pill pill-dark" onClick={next} style={{ height: 40, padding: "0 20px" }}>{i + 1 < live.length ? "Next" : "Got it"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
