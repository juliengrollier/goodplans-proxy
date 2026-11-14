import React, { useMemo, useState } from "react";
import { LeafletMap, CompactCard } from "./components.jsx";
import { startMinutes, nowMinutes } from "./engine.js";
import { evCovers, evStart, evEnd, isImprecise, eHour } from "../lib/core.js";

const MODES = [["now", "Now"], ["tonight", "Tonight"], ["weekend", "Weekend"], ["week", "7 days"]];

export default function MapView({ scored, home, dark, today, onOpen }) {
  const [mode, setMode] = useState("tonight");
  const [sel, setSel] = useState(null);
  const pins = useMemo(() => {
    const now = nowMinutes();
    const dow = today.getDay();
    const fri = new Date(today); fri.setDate(today.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const wk = new Date(today); wk.setDate(today.getDate() + 7);
    return scored.filter((e) => !e.hidden && !isImprecise(e)).filter((e) => {
      if (mode === "now") { const sm = startMinutes(e); return evCovers(e, today) && sm != null && sm >= now - 90 && sm <= now + 150; }
      if (mode === "tonight") return evCovers(e, today) && (startMinutes(e) ?? eHour(e.time, e.cat) * 60) >= 16 * 60;
      if (mode === "weekend") return evStart(e) <= sun && evEnd(e) >= (dow === 0 || dow >= 5 ? today : fri);
      return evStart(e) <= wk;
    }).sort((a, b) => b.sc - a.sc).slice(0, 60);
  }, [scored, mode, today]);
  const selEv = pins.find((p) => p.id === sel?.id) || null;

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 480, margin: "0 auto" }}>
      <LeafletMap events={pins} home={home} dark={dark} height="100%" interactive onPick={setSel} selectedId={selEv?.id} zoom={14} />
      <div style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top))", left: 16, right: 16, zIndex: 500 }}>
        <div className="seg" style={{ gridTemplateColumns: "repeat(4,1fr)", background: "var(--card)", boxShadow: "0 4px 14px rgba(27,31,59,.15)" }}>
          {MODES.map(([k, l]) => <button key={k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); setSel(null); }}>{l}</button>)}
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, background: "var(--card)", display: "inline-block", padding: "4px 10px", borderRadius: 12 }}>{pins.length} on the map</div>
      </div>
      {selEv && (
        <div style={{ position: "absolute", left: 12, right: 12, bottom: "calc(96px + env(safe-area-inset-bottom))", zIndex: 500 }}>
          <CompactCard ev={selEv} dark={dark} today={today} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}
