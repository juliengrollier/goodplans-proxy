import React, { useMemo, useState } from "react";
import { Icon, Glyph } from "./icons.jsx";
import { ResultRow } from "./components.jsx";
import { catColor, catIcon } from "./theme.js";
import { isFree, priceNum, startMinutes } from "./engine.js";
import { CATS, matchV, evCovers, evStart, evEnd, runLen } from "../lib/core.js";

const MOODS = [["date", "Date night"], ["weird", "Something weird"], ["sunday", "Sunday reset"], ["nyc", "Only in NYC"], ["chill", "Chill & free"], ["move", "Get moving"], ["late", "After dark"], ["solo", "Solo & low-key"]];
const WHEN = [["any", "Any time"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["weekend", "This weekend"], ["week", "Next 7 days"]];

export default function Explore({ scored, dark, today, onOpen }) {
  const [q, setQ] = useState("");
  const [when, setWhen] = useState("any");
  const [free, setFree] = useState(false);
  const [walk, setWalk] = useState(false);
  const [u20, setU20] = useState(false);
  const [noClash, setNoClash] = useState(false);
  const [cats, setCats] = useState([]);
  const [mood, setMood] = useState(null);
  const [sort, setSort] = useState("best");
  const [limit, setLimit] = useState(40);

  const results = useMemo(() => {
    const tom = new Date(today); tom.setDate(today.getDate() + 1);
    const dow = today.getDay();
    const fri = new Date(today); fri.setDate(today.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    const wk = new Date(today); wk.setDate(today.getDate() + 7);
    const ql = q.trim().toLowerCase();
    let r = scored.filter((e) => !e.hidden).filter((e) => {
      if (when === "today" && !evCovers(e, today)) return false;
      if (when === "tomorrow" && !evCovers(e, tom)) return false;
      if (when === "weekend" && !(evStart(e) <= sun && evEnd(e) >= (dow === 0 || dow >= 5 ? today : fri))) return false;
      if (when === "week" && !(evStart(e) <= wk)) return false;
      if (free && !isFree(e)) return false;
      if (walk && !(e.tt?.mins <= 15)) return false;
      if (u20 && !(isFree(e) || (priceNum(e) ?? 99) < 20)) return false;
      if (noClash && e.busy) return false;
      if (cats.length && !cats.includes(e.cat)) return false;
      if (mood && !matchV(e, mood)) return false;
      if (ql && !((e.title || "") + " " + (e.venue || "") + " " + (e.desc || "") + " " + (e.sub || "") + " " + (e.cat || "")).toLowerCase().includes(ql)) return false;
      return true;
    });
    if (sort === "best") r.sort((a, b) => b.sc - a.sc);
    if (sort === "soonest") r.sort((a, b) => (evStart(a) - evStart(b)) || ((startMinutes(a) ?? 720) - (startMinutes(b) ?? 720)));
    if (sort === "closest") r.sort((a, b) => (a.tt?.mins ?? 99) - (b.tt?.mins ?? 99));
    return r;
  }, [scored, q, when, free, walk, u20, noClash, cats, mood, sort, today]);

  const toggleCat = (c) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const catKeys = Object.keys(CATS);

  return (
    <div>
      <div style={{ padding: "calc(18px + env(safe-area-inset-top)) 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 className="disp" style={{ margin: 0, fontSize: 34 }}>Explore</h1>
        <label className="row card-sm" style={{ gap: 10, height: 50, padding: "0 16px", borderRadius: 25 }}>
          <Icon name="search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Try “jazz”, “Brooklyn”, “free”" aria-label="Search events" style={{ border: "none", outline: "none", flex: 1, fontSize: 15, background: "transparent", color: "var(--ink)", fontFamily: "inherit" }} />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" style={{ border: "none", background: "none" }}><Icon name="close" size={16} /></button>}
        </label>
      </div>
      <div className="hscroll" style={{ gap: 8, paddingBottom: 10 }}>
        {WHEN.map(([k, l]) => <button key={k} className={"chip" + (when === k ? " on" : "")} onClick={() => setWhen(k)}>{l}</button>)}
      </div>
      <div className="hscroll" style={{ gap: 8, paddingBottom: 12 }}>
        <button className={"chip" + (free ? " on" : "")} onClick={() => setFree(!free)}>Free</button>
        <button className={"chip" + (walk ? " on" : "")} onClick={() => setWalk(!walk)}>Within 15 min</button>
        <button className={"chip" + (u20 ? " on" : "")} onClick={() => setU20(!u20)}>Under $20</button>
        <button className={"chip" + (noClash ? " on" : "")} onClick={() => setNoClash(!noClash)}>Hide clashes</button>
      </div>
      <div className="hscroll" style={{ gap: 8, paddingBottom: 12 }}>
        {catKeys.map((c) => {
          const on = cats.includes(c), col = catColor(c, dark);
          return (
            <button key={c} aria-label={c} aria-pressed={on} title={c} onClick={() => toggleCat(c)}
              style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, border: "none", padding: 0, background: col, opacity: cats.length && !on ? 0.35 : 1, boxShadow: on ? "0 0 0 3px var(--bg), 0 0 0 5px var(--navy)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Glyph name={catIcon(c)} size={22} color={col} />
            </button>
          );
        })}
      </div>
      <div className="hscroll" style={{ gap: 8, paddingBottom: 16 }}>
        {MOODS.map(([k, l]) => <button key={k} className="chip" onClick={() => setMood(mood === k ? null : k)} style={mood === k ? { background: "var(--navy)", color: "var(--onnavy)", borderColor: "var(--navy)" } : { background: "var(--chip)", borderColor: "var(--chip)" }}>{l}</button>)}
      </div>
      <div className="row" style={{ padding: "0 20px 10px", justifyContent: "space-between" }}>
        <span className="disp" style={{ fontSize: 19 }}>{results.length} result{results.length === 1 ? "" : "s"}{cats.length ? " · " + cats.join(", ") : ""}</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="chip" style={{ appearance: "none", paddingRight: 14 }}>
          <option value="best">Best match</option><option value="soonest">Soonest</option><option value="closest">Closest</option>
        </select>
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
        {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
        {!results.length && <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 15 }}>Nothing matches. Try fewer filters.</div>}
      </div>
    </div>
  );
}
