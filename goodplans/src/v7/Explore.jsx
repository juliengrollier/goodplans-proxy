import React, { useMemo, useState } from "react";
import { ResultRow, CompactCard } from "./components.jsx";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";

export default function Explore({ scored, dark, today, onOpen, filters, setFilters, sort, setSort, regulars = [] }) {
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars

  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  const results = useMemo(() => sortEvents(applyFilters(scored, filters, today), sort), [scored, filters, sort, today]);

  // Regulars: every remembered series, grouped by pattern, next date first. The When filter doesn't apply here.
  const regGroups = useMemo(() => {
    const keep = new Set(applyFilters(regulars.map((x) => x.ev), { ...filters, when: "any" }, today).map((e) => e.id));
    const by = {};
    regulars.filter((x) => keep.has(x.ev.id)).sort((a, b) => (!!a.when - !!b.when) || (a.ev.E < b.ev.E ? -1 : 1))
      .forEach((x) => { const k = x.ev.recLabel || "Recurring"; (by[k] = by[k] || []).push(x); });
    return Object.entries(by);
  }, [regulars, filters, today]);
  const nReg = regGroups.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div>
      <FilterHeader filters={filters} setFilters={(f) => { setFilters(f); setLimit(40); }} sort={sort} setSort={setSort} dark={dark} counts={counts} style={{ position: "sticky", top: 0, zIndex: 20 }} />
      <div className="row" style={{ padding: "12px 16px 8px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Regulars · {nReg}</button>
      </div>
      {view === "all" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          {!results.length && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
          {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
        </div>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!nReg && <div className="card" style={{ padding: 20, fontSize: 15 }}>No regulars yet. A series shows up here once it appears on two dates with a pattern (weekly, every other week, monthly), or says "every Tuesday". The app keeps them between refreshes.</div>}
          {regGroups.map(([label, list]) => (
            <React.Fragment key={label}>
              <div className="disp" style={{ fontSize: 19, padding: "8px 4px 0" }}>{label}</div>
              {list.map((x) => <CompactCard key={x.r.key} ev={x.ev} dark={dark} today={today} onOpen={onOpen} when={x.when} />)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
