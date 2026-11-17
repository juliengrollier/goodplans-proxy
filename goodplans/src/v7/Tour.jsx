// Quick tour after onboarding: a welcome, five tips on the real screen (spotlight + card), a goodbye.
// Skippable, shown once, replayable from Me. Each tip scrolls so the highlighted part and its card sit centred together.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import { Icon } from "./icons.jsx";

export const TOUR_KEY = "gp_tour_done_v1";

const firstName = () => { try { return localStorage.getItem("gp_name_v1") || ""; } catch { return ""; } };
// Inline icon in tip text, as it looks in the app
const I = ({ n, fill }) => <span style={{ display: "inline-flex", verticalAlign: "-3px", margin: "0 1px" }}><Icon name={n} size={16} fill={fill ? "currentColor" : "none"} /></span>;

// Vocabulary: picks = what Good Plans suggests; plans = what you saved (bookmark); favourites = what you hearted
export const TOUR_STEPS = [
  { title: () => (firstName() ? "Hi " + firstName() : "Hi there"),
    text: () => "Never wonder what to do next. Good Plans knows you, the city, and how to make you love it. Quick tour?", next: "Show me", skip: "Skip" },
  { sel: "#tour-around", from: "#tour-around .sec-h > span", title: "Right now, nearby",
    text: () => <>What's happening within a 25-minute walk, soonest first. Tap one for details, or <span style={{ display: "inline-flex", verticalAlign: "-3px" }}><Maximize2 size={15} strokeWidth={2.4} /></span> for the full map.</> },
  { sel: "#tour-card", title: "Picked for you",
    text: () => <>Your best picks for the next outing. Tap <I n="save" /> to save one to your plans, the list under <I n="plans" /> Plans at the bottom.</> },
  { sel: "#tour-moods", title: "What are you in the mood for?",
    text: () => <>Tap a mood and your picks follow: live music tonight, a good laugh, something creative… Tap <I n="heart" /> to add a mood to your favourites.</> },
  { sel: "#my-favs", from: "#my-favs .sec-h > span", title: "One tap to what you love",
    text: () => <>Every mood and activity you <I n="heart" fill /> is kept here. You can also reach them from <I n="heart" /> at the top.</> },
  { sel: "#tour-city-first > :first-child", from: "#tour-city .sec-h > span", title: "Today's local heartbeat",
    text: () => "What the city is up to today: the season, the neighbourhoods, the weather. New every day." },
  { title: "You're set", text: () => "The more you save, the better your picks get. Enjoy the city!", next: "Let's go" },
];

const CARD_H = 200, GAP = 12, BOTTOM = 92; // tip card height (approx.), gap to the highlight, tab bar
const box = (step) => {
  const el = document.querySelector(step.sel); if (!el) return null;
  const r = el.getBoundingClientRect(), f = step.from && document.querySelector(step.from)?.getBoundingClientRect();
  const top = f ? Math.min(f.top, r.top) : r.top;
  return { x: r.left, y: top, w: r.width, h: r.bottom - top };
};

export default function Tour({ steps = TOUR_STEPS, onDone }) {
  const [live] = useState(() => steps.filter((s) => !s.sel || document.querySelector(s.sel)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [cardH, setCardH] = useState(CARD_H);
  const cardRef = useRef(null);
  const step = live[i];
  const tips = live.filter((s) => s.sel);
  // Scroll so highlight + card are centred in the visible area, wait for the scroll to settle, then measure
  useLayoutEffect(() => {
    if (!step) return undefined;
    setRect(null);
    if (!step.sel) { if (i === live.length - 1) window.scrollTo({ top: 0, behavior: "smooth" }); return undefined; }
    const b0 = box(step); if (!b0) return undefined;
    const vh = window.innerHeight - BOTTOM, block = b0.h + GAP + CARD_H + 16;
    const target = block < vh ? window.scrollY + b0.y - (vh - block) / 2 : window.scrollY + b0.y - 16;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    let last = -1, same = 0, alive = true;
    const settle = () => { if (!alive) return; const y = window.scrollY; same = y === last ? same + 1 : 0; last = y; if (same >= 3) setRect(box(step)); else setTimeout(settle, 60); };
    const t = setTimeout(settle, 120);
    const onResize = () => setRect(box(step));
    window.addEventListener("resize", onResize);
    return () => { alive = false; clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (cardRef.current && Math.abs(cardRef.current.offsetHeight - cardH) > 2) setCardH(cardRef.current.offsetHeight); });
  useEffect(() => { if (!live.length) onDone(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!step) return null;
  const done = () => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* private */ } onDone(); };
  const next = () => (i + 1 < live.length ? setI(i + 1) : done());
  const pad = 8, vh = window.innerHeight, vw = window.innerWidth;
  const hole = rect && { left: Math.max(4, rect.x - pad), top: rect.y - pad, width: Math.min(vw - 8, rect.w + pad * 2), height: rect.h + pad * 2 };
  const centred = !step.sel;
  const below = hole && hole.top + hole.height + GAP + cardH < vh - BOTTOM + 40;
  const cardTop = hole ? (below ? hole.top + hole.height + GAP : Math.max(12, hole.top - GAP - cardH)) : (vh - cardH) / 2 - 30;
  const val = (x) => (typeof x === "function" ? x() : x);
  return createPortal(
    <div role="dialog" aria-label={"Tour, step " + (i + 1) + " of " + live.length} style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <style>{"@keyframes gpTourIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
      {hole
        ? <div style={{ position: "fixed", ...hole, borderRadius: 18, boxShadow: "0 0 0 9999px rgba(10,12,30,.64)", transition: "all .25s ease", pointerEvents: "none" }} />
        : <div style={{ position: "fixed", inset: 0, background: "rgba(10,12,30,.64)" }} />}
      {(centred || hole) && (
        <div key={i} ref={cardRef} className="card"
          style={{ position: "fixed", left: 16, right: 16, top: cardTop, maxWidth: 448, margin: "0 auto", padding: centred ? "22px 20px 16px" : "16px 18px 14px", boxShadow: "0 12px 32px rgba(0,0,0,.3)", animation: "gpTourIn .3s ease both" }}>
          {!centred && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>{tips.indexOf(step) + 1} of {tips.length}</div>}
          <div className="disp" style={{ fontSize: centred ? 24 : 20, margin: centred ? "0 0 8px" : "4px 0 6px" }}>{val(step.title)}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{val(step.text)}</div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
            {i + 1 < live.length ? <button onClick={done} style={{ border: "none", background: "none", padding: "6px 0", fontSize: 14, fontWeight: 700, color: "var(--ink3)" }}>{step.skip || "Skip tour"}</button> : <span />}
            <button className="pill pill-dark" onClick={next} style={{ height: 40, padding: "0 20px" }}>{step.next || "Next"}</button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
