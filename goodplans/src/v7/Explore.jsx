import React, { useMemo, useState } from "react";
import { ResultRow } from "./components.jsx";
import { Icon } from "./icons.jsx";
import FilterBar, { applyFilters } from "./Filters.jsx";
import { startMinutes } from "./engine.js";
import { evStart } from "../lib/core.js";

const SORTS = [["best", "Best match"], ["soonest", "Soonest"], ["closest", "Closest"]];

export default function Explore({ scored, dark, today, onOpen, filters, setFilters }) {
  const [sort, setSort] = useState("best");
  const [limit, setLimit] = useState(40);

  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  const results = useMemo(() => {
    const r = applyFilters(scored, filters, today);
    if (sort === "best") r.sort((a, b) => b.sc - a.sc);
    if (sort === "soonest") r.sort((a, b) => (evStart(a) - evStart(b)) || ((startMinutes(a) ?? 720) - (startMinutes(b) ?? 720)));
    if (sort === "closest") r.sort((a, b) => (a.tt?.mins ?? 99) - (b.tt?.mins ?? 99));
    return r;
  }, [scored, filters, sort, today]);

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)", padding: "calc(12px + env(safe-area-inset-top)) 0 10px", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ padding: "0 12px 10px", gap: 8 }}>
          <label className="row" style={{ flex: 1, gap: 8, height: 40, padding: "0 12px", borderRadius: 20, background: "var(--chip)", minWidth: 0 }}>
            <Icon name="search" size={17} />
            <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} type="search" placeholder="Search jazz, Brooklyn, free…" aria-label="Search events" style={{ border: "none", outline: "none", flex: 1, fontSize: 15, background: "transparent", color: "var(--ink)", fontFamily: "inherit", minWidth: 0 }} />
            {filters.q && <button onClick={() => setFilters({ ...filters, q: "" })} aria-label="Clear search" style={{ border: "none", background: "none", padding: 0 }}><Icon name="close" size={15} /></button>}
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="chip" style={{ height: 32, appearance: "none", paddingRight: 14 }}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <FilterBar f={filters} setF={(f) => { setFilters(f); setLimit(40); }} dark={dark} counts={counts} />
      </div>
      <div className="muted" style={{ padding: "12px 20px 8px", fontSize: 13, fontWeight: 700 }}>{results.length} event{results.length === 1 ? "" : "s"}</div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
        {!results.length && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
        {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
      </div>
    </div>
  );
}
