import { evColor, evNode, LIcon } from "./taxonomy.js";
import React, { useState } from "react";
import { Icon, Glyph } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { whenLabel, travelLabel } from "./engine.js";
import { runLen, evStart, DAYS, MONTHS, isEventBusy, evActive } from "../lib/core.js";

export default function Plans({ favs, scoreOne, dark, today, onOpen, onRemove, busySlots, calStatus }) {
  const [tab, setTab] = useState("up");
  const all = Object.values(favs).filter((e) => evActive(e, today)).map(scoreOne);
  const dated = all.filter((e) => runLen(e) <= 3).sort((a, b) => evStart(a) - evStart(b));
  const ideas = all.filter((e) => runLen(e) > 3).sort((a, b) => evStart(a) - evStart(b));
  const groups = [];
  dated.forEach((e) => {
    const d = evStart(e) < today ? today : evStart(e);
    const key = d.toDateString();
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, d, items: [] }; groups.push(g); }
    g.items.push(e);
  });
  const dayLabel = (d) => {
    const diff = Math.round((d - today) / 86400000);
    return (diff === 0 ? "Today · " : diff === 1 ? "Tomorrow · " : "") + DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate();
  };
  const Item = ({ ev }) => {
    const c = evColor(ev, dark), clash = isEventBusy(ev, busySlots);
    return (
      <div className="row" style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", opacity: clash ? 0.5 : 1 }}>
        <button onClick={() => onOpen(ev)} aria-label={ev.title} style={{ width: 56, height: 56, borderRadius: 16, border: "none", background: c, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><LIcon node={evNode(ev)} size={26} color="#fff" /></button>
        <button onClick={() => onOpen(ev)} style={{ flex: 1, minWidth: 0, border: "none", background: "none", textAlign: "left", padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="disp clamp2" style={{ fontSize: 16, lineHeight: 1.15 }}>{ev.title}</span>
          <span className="muted ell" style={{ fontSize: 13 }}>{whenLabel(ev, today)} · {travelLabel(ev.tt)}</span>
          {clash && <span className="row" style={{ gap: 6, fontSize: 12, fontWeight: 800 }}><Icon name="cal" size={14} /> Clashes with your calendar</span>}
        </button>
        <button onClick={() => onRemove(ev)} aria-label={"Remove " + ev.title} style={{ border: "none", background: "var(--chip)", width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={16} /></button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ padding: "calc(18px + env(safe-area-inset-top)) 20px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 className="disp" style={{ margin: 0, fontSize: 34 }}>Our plans</h1>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button className={tab === "up" ? "on" : ""} onClick={() => setTab("up")}>Upcoming · {dated.length}</button>
          <button className={tab === "ideas" ? "on" : ""} onClick={() => setTab("ideas")}>Ideas · {ideas.length}</button>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {calStatus === "ok" ? "Plans that clash with your calendar are dimmed." : "Connect your calendar in Me to see clashes."} Sharing with your partner comes with accounts.
        </div>
      </div>
      {tab === "up" && (groups.length ? groups.map((g) => (
        <div key={g.key}>
          <div style={{ background: "var(--navy)", color: "var(--onnavy)", margin: "6px 16px 0", borderRadius: 14, padding: "8px 14px", fontSize: 13, fontWeight: 800 }}>{dayLabel(g.d)}</div>
          <div style={{ padding: "0 20px" }}>{g.items.map((e) => <Item key={e.id} ev={e} />)}</div>
        </div>
      )) : <Empty text="Tap “Add to plans” on any event and it lands here, grouped by day." />)}
      {tab === "ideas" && (ideas.length ? <div style={{ padding: "0 20px" }}>{ideas.map((e) => <Item key={e.id} ev={e} />)}</div> : <Empty text="Exhibitions and long runs you save wait here until you're free." />)}
    </div>
  );
}

function Empty({ text }) {
  return <div className="muted" style={{ padding: "40px 32px", textAlign: "center", fontSize: 15 }}>{text}</div>;
}
