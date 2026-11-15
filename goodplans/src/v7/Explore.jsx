import React, { useMemo, useState } from "react";
import { ResultRow, CompactCard } from "./components.jsx";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";
import { DOW_LONG } from "./recurring.js";

export default function Explore({ scored, dark, today, onOpen, filters, setFilters, sort, setSort }) {
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars

  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  const results = useMemo(() => sortEvents(applyFilters(scored, filters, today), sort), [scored, filters, sort, today]);

  // Weekly regulars: next occurrence of each, grouped by weekday starting today
  const regulars = useMemo(() => {
    const seen = new Set(), by = {};
    applyFilters(scored.filter((e) => e.recurring), filters, today)
      .sort((a, b) => (a.E < b.E ? -1 : a.E > b.E ? 1 : b.sc - a.sc))
      .forEach((e) => { const k = e.title + "@" + e.venue; if (seen.has(k)) return; seen.add(k); (by[e.recDow] = by[e.recDow] || []).push(e); });
    const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (today.getDay() + i) % 7);
    return order.filter((d) => by[d]).map((d) => [d, by[d]]);
  }, [scored, filters, today]);
  const nReg = regulars.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div>
      <FilterHeader filters={filters} setFilters={(f) => { setFilters(f); setLimit(40); }} sort={sort} setSort={setSort} dark={dark} counts={counts} style={{ position: "sticky", top: 0, zIndex: 20 }} />
      <div className="row" style={{ padding: "12px 16px 8px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Weekly regulars · {nReg}</button>
      </div>
      {view === "all" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          {!results.length && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
          {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
        </div>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!nReg && <div className="card" style={{ padding: 20, fontSize: 15 }}>No weekly regulars yet. They appear once an event shows up on the same weekday twice, or says "every Tuesday". The app keeps them between refreshes.</div>}
          {regulars.map(([d, list]) => (
            <React.Fragment key={d}>
              <div className="disp" style={{ fontSize: 19, padding: "8px 4px 0" }}>{DOW_LONG[d]}</div>
              {list.map((ev) => <CompactCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
