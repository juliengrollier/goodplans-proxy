import React, { useMemo, useRef, useState } from "react";
import { LeafletMap, Media, CatBullet, Keywords, Snippet, Travel, PriceTag, CardActions, WeatherTag } from "./components.jsx";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";
import { whenLabel } from "./engine.js";
import { isImprecise } from "../lib/core.js";

// Large preview card for a tapped pin. Swipe up (or tap) opens the full profile; swipe down dismisses.
function Peek({ ev, dark, today, onOpen, onClose }) {
  const y0 = useRef(null);
  const [dy, setDy] = useState(0);
  const start = (e) => { y0.current = e.touches[0].clientY; };
  const move = (e) => { if (y0.current != null) setDy(Math.max(-140, Math.min(160, e.touches[0].clientY - y0.current))); };
  const end = () => { if (dy < -50) onOpen(ev); else if (dy > 60) onClose(); setDy(0); y0.current = null; };
  return (
    <div onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      style={{ position: "absolute", left: 10, right: 10, bottom: "calc(74px + env(safe-area-inset-bottom))", zIndex: 30, transform: `translateY(${dy}px)`, transition: y0.current == null ? "transform .2s" : "none" }}>
      <div className="card" role="button" tabIndex={0} onClick={() => onOpen(ev)} style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", boxShadow: "0 12px 34px rgba(27,31,59,.28)" }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: "var(--line)", margin: "0 auto" }} aria-hidden="true" />
        <Media ev={ev} dark={dark} height={150} radius={18} hideTitle />
        <div style={{ padding: "0 4px 2px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="row" style={{ gap: 8 }}><CatBullet cat={ev.cat} size={22} dark={dark} /><span className="ell" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{(ev.venue || "").split(",")[0]}</span><span style={{ marginLeft: "auto" }}><PriceTag ev={ev} /></span></div>
          <div className="disp clamp2" style={{ fontSize: 20, lineHeight: 1.1 }}>{ev.title}</div>
          <Snippet ev={ev} lines={2} />
          <Keywords ev={ev} max={4} />
          <div className="row" style={{ gap: 10, fontSize: 14, fontWeight: 800, flexWrap: "wrap" }}><span>{whenLabel(ev, today)}</span><Travel tt={ev.tt} size={14} /><WeatherTag ev={ev} /></div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Swipe up for details</span>
            <CardActions ev={ev} size={34} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapView({ scored, home, dark, today, onOpen, filters, setFilters, sort, setSort }) {
  const [sel, setSel] = useState(null);
  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  const pins = useMemo(() => sortEvents(applyFilters(scored.filter((e) => !isImprecise(e)), filters, today), sort).slice(0, 120), [scored, filters, today, sort]);
  const selEv = pins.find((p) => p.id === sel) || null;

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 480, margin: "0 auto" }}>
      <LeafletMap events={pins} home={home} dark={dark} height="100%" interactive onPick={(ev) => setSel(ev.id)} selectedId={selEv?.id} zoom={14} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
        <FilterHeader filters={filters} setFilters={(f) => { setFilters(f); setSel(null); }} sort={sort} setSort={setSort} dark={dark} counts={counts} />
        <div className="muted" style={{ margin: "6px 0 0 12px", fontSize: 12, fontWeight: 800, background: "var(--card)", display: "inline-block", padding: "4px 10px", borderRadius: 12, boxShadow: "0 2px 8px rgba(27,31,59,.12)" }}>
          {pins.length} on the map{filters.when === "any" ? " · tip: pick a time in When" : ""}
        </div>
      </div>
      {selEv && <Peek key={selEv.id} ev={selEv} dark={dark} today={today} onOpen={onOpen} onClose={() => setSel(null)} />}
    </div>
  );
}
