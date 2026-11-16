// Onboarding v5: swipe deck. Right = love, left = meh, skip = no opinion. 12 cards, then straight to Home.
import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Tag, Users } from "lucide";
import { START, VIBES, DECK_SIZE, profileFrom, meetFrom } from "./quiz.js";
import { ACT } from "./activities.js";
import { CATEGORIES, FAM, LIcon } from "./taxonomy.js";
import { getSpace, cos } from "./embed.js";
import { Icon } from "./icons.jsx";

const CATI = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const VIBE_ICON = { late: Moon, free: Tag, meet: Users };
const VIBE_COLOR = { late: "#4338CA", free: "#0F766E", meet: "#DB2777" };

// Next card: a "how you go out" card at its slot; otherwise alternate between a close neighbour of what you loved
// and the next card of the spread that isn't close to anything you said meh to
function nextCard(i, ans, seen) {
  const vk = Object.keys(VIBES).find((k) => VIBES[k].at === i);
  if (vk) return { vibe: vk };
  const sp = getSpace(), v = (id) => sp.vec.get("act:" + id);
  const loves = Object.entries(ans.acts).filter(([, x]) => x > 0).map(([k]) => k), mehs = Object.entries(ans.acts).filter(([, x]) => x < 0).map(([k]) => k);
  const near = (id, set) => Math.max(0, ...set.map((o) => cos(v(id), v(o))));
  const actTurn = i - Object.values(VIBES).filter((x) => x.at < i).length;
  if (loves.length && actTurn % 2 === 1) {
    let best = null, bs = 0.3;
    for (const id of Object.keys(ACT)) { if (seen.has(id) || !v(id)) continue; const s = near(id, loves) - 0.6 * near(id, mehs); if (s > bs) { bs = s; best = id; } }
    if (best) return { act: best };
  }
  const pick = START.find((id) => !seen.has(id) && near(id, mehs) < 0.7) || START.find((id) => !seen.has(id));
  return { act: pick };
}

export default function Quiz({ onDone, onClose, dark }) {
  const [ans, setAns] = useState({ acts: {}, vibe: {} });
  const [i, setI] = useState(0);
  const [seen] = useState(() => new Set());
  const [dx, setDx] = useState(0), [fly, setFly] = useState(0);
  const x0 = useRef(null), dxr = useRef(0);
  const card = useMemo(() => { const c = nextCard(i, ans, seen); if (c.act) seen.add(c.act); return c; }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const loves = Object.values(ans.acts).filter((x) => x > 0).length;

  const finish = (a) => onDone(a, profileFrom(a), meetFrom(a));
  const decide = (val) => {
    if (fly) return;
    const a = card.vibe ? { ...ans, vibe: { ...ans.vibe, [card.vibe]: val } } : val ? { ...ans, acts: { ...ans.acts, [card.act]: val } } : ans;
    setAns(a); setFly(val || 0.001);
    setTimeout(() => { setFly(0); setDx(0); if (i + 1 >= DECK_SIZE) finish(a); else setI(i + 1); }, 230);
  };
  const down = (e) => { x0.current = e.clientX; dxr.current = 0; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (x0.current != null) { dxr.current = e.clientX - x0.current; setDx(dxr.current); } };
  const up = () => { if (x0.current == null) return; x0.current = null; const d = dxr.current; dxr.current = 0; if (d > 90) decide(1); else if (d < -90) decide(-1); else setDx(0); };

  const a = card.act && ACT[card.act], c = a && CATI[a.ncat], fam = c && FAM[c.fam];
  const col = card.vibe ? VIBE_COLOR[card.vibe] : fam ? (dark ? fam.dark : fam.light) : "#475569";
  const label = card.vibe ? VIBES[card.vibe].label : a ? a.label[0].toUpperCase() + a.label.slice(1) : "";
  const sub = card.vibe ? VIBES[card.vibe].sub : c ? c.id : "";
  const node = card.vibe ? VIBE_ICON[card.vibe] : c?.icon;
  const off = fly ? (fly > 0.5 ? 600 : fly < -0.5 ? -600 : 0) : dx;
  const wrap = { position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 20px calc(22px + env(safe-area-inset-bottom))", overflow: "hidden", touchAction: "none" };
  const round = (bg, fg, sz) => ({ width: sz, height: sz, borderRadius: sz / 2, border: "none", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(20,24,51,.18)" });

  return createPortal(
    <div style={wrap} role="dialog" aria-label="Get to know you">
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <div className="row" style={{ flex: 1, gap: 4 }}>{Array.from({ length: DECK_SIZE }, (_, k) => <span key={k} style={{ flex: 1, height: 5, borderRadius: 3, background: k < i ? "var(--navy)" : "var(--chip)" }} />)}</div>
        <button className="chip" onClick={() => (loves >= 3 ? finish(ans) : onClose())} style={{ height: 34 }}>{loves >= 3 ? "Done" : "Later"}</button>
      </div>
      <h1 className="disp" style={{ margin: "22px 0 4px", fontSize: 28, lineHeight: 1.1 }}>{card.vibe ? "And how do you go out?" : loves ? "How about this?" : "Would you go?"}</h1>
      <div className="muted" style={{ fontSize: 14 }}>Swipe right if yes, left if not.</div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 0" }}>
        <div key={i} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ position: "relative", width: "100%", maxWidth: 340, aspectRatio: "3 / 4", maxHeight: "52vh", borderRadius: 32, background: col, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center", cursor: "grab", userSelect: "none",
            transform: `translateX(${off}px) rotate(${off / 18}deg)`, transition: x0.current != null ? "none" : "transform .23s ease", boxShadow: "0 18px 40px rgba(20,24,51,.22)" }}>
          <span style={{ position: "absolute", top: 20, left: 20, padding: "4px 12px", borderRadius: 10, border: "3px solid #fff", fontWeight: 900, fontSize: 18, letterSpacing: 1, opacity: Math.max(0, Math.min(1, off / 90)), transform: "rotate(-12deg)" }}>YES</span>
          <span style={{ position: "absolute", top: 20, right: 20, padding: "4px 12px", borderRadius: 10, border: "3px solid #fff", fontWeight: 900, fontSize: 18, letterSpacing: 1, opacity: Math.max(0, Math.min(1, -off / 90)), transform: "rotate(12deg)" }}>NAH</span>
          <span style={{ width: 110, height: 110, borderRadius: 55, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>{node && <LIcon node={node} size={56} color="#fff" stroke={1.8} />}</span>
          <span className="disp" style={{ fontSize: 34, lineHeight: 1.05 }}>{label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.85 }}>{sub}</span>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "center", alignItems: "center", gap: 22 }}>
        <button aria-label="Nah" onClick={() => decide(-1)} style={round("var(--card)", "var(--ink)", 64)}><Icon name="close" size={26} /></button>
        <button aria-label="Skip" onClick={() => decide(0)} style={{ border: "none", background: "none", color: "var(--ink3)", fontWeight: 800, fontSize: 14, padding: 8 }}>Not sure</button>
        <button aria-label="Yes" onClick={() => decide(1)} style={round(col, "#fff", 64)}><Icon name="heart" size={26} fill="currentColor" /></button>
      </div>
    </div>,
    document.body
  );
}
