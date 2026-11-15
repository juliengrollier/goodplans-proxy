import React, { useMemo, useState } from "react";
import { ResultRow, CompactCard } from "./components.jsx";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";

export default function Explore({ scored, dark, today, onOpen, filters, setFilters, sort, setSort, regulars = [], annual = [] }) {
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars
  const [freq, setFreq] = useState("all"); // all | weekly | monthly | annual

  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  const results = useMemo(() => sortEvents(applyFilters(scored, filters, today), sort), [scored, filters, sort, today]);

  // Regulars: series learned from the feed (weekly, every other week, monthly, varying) plus the city's yearly events.
  // The When filter doesn't apply here; the other filters do.
  const kindOf = (x) => (x.r.kind === "weekly" || x.r.kind === "biweekly" ? "weekly" : x.r.kind === "monthly" ? "monthly" : "other");
  const regGroups = useMemo(() => {
    const f = { ...filters, when: "any" };
    const keep = new Set(applyFilters([...regulars.map((x) => x.ev), ...annual], f, today).map((e) => e.id));
    const groups = [];
    if (freq !== "annual") {
      const by = {};
      regulars.filter((x) => keep.has(x.ev.id) && (freq === "all" || kindOf(x) === freq))
        .sort((a, b) => (!!a.when - !!b.when) || (a.ev.E < b.ev.E ? -1 : 1))
        .forEach((x) => { const k = x.ev.recLabel || "Recurring"; (by[k] = by[k] || []).push({ ev: x.ev, when: x.when, key: x.r.key }); });
      groups.push(...Object.entries(by));
    }
    if (freq === "all" || freq === "annual") {
      const byM = {};
      annual.filter((e) => keep.has(e.id)).forEach((e) => {
        const m = new Date(e.E + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
        (byM[m] = byM[m] || []).push({ ev: e, when: e.exact ? null : "Usually in " + e.usual, key: e.id });
      });
      groups.push(...Object.entries(byM).map(([m, l]) => ["Every year · " + m, l]));
    }
    return groups;
  }, [regulars, annual, filters, today, freq]);
  const nReg = regGroups.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div>
      <FilterHeader filters={filters} setFilters={(f) => { setFilters(f); setLimit(40); }} sort={sort} setSort={setSort} dark={dark} items={scored} today={today} style={{ position: "sticky", top: 0, zIndex: 20 }} />
      <div className="row" style={{ padding: "12px 16px 8px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Regulars · {nReg}</button>
      </div>
      {view === "all" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          {results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          {!results.length && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
          {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
        </div>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }} role="tablist" aria-label="How often">
            {[["all", "All"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["annual", "Yearly"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={freq === k} className={"chip" + (freq === k ? " on" : "")} style={{ height: 30 }} onClick={() => setFreq(k)}>{l}</button>
            ))}
          </div>
          {!nReg && <div className="card" style={{ padding: 20, fontSize: 15 }}>No regulars yet. A series shows up here once it appears on two dates with a pattern (weekly, every other week, monthly), or says "every Tuesday". The app keeps them between refreshes.</div>}
          {regGroups.map(([label, list]) => (
            <React.Fragment key={label}>
              <div className="disp" style={{ fontSize: 19, padding: "8px 4px 0" }}>{label}</div>
              {list.map((x) => <CompactCard key={x.key} ev={x.ev} dark={dark} today={today} onOpen={onOpen} when={x.when} />)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
