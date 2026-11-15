import React, { useEffect, useMemo, useRef, useState } from "react";
import { ResultRow, CompactCard, MoodTile } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";
import { collapseSeries } from "./dedupe.js";
import { startMinutes } from "./engine.js";
import { daysUntil } from "../lib/core.js";

export default function Explore({ tiles, onTile = () => {}, scored, dark, today, onOpen, filters, setFilters, sort, setSort, regulars = [], annual = [] }) {
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars
  const [freq, setFreq] = useState("all"); // all | weekly | monthly | annual
  // When filters change, jump back to the top of the results so the new list is visible
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: "smooth" }); }, [filters, sort]);

  const listTile = filters.list ? (tiles?.lists || []).find((t) => t.title === filters.list) : null;
  const more = filters.list && tiles ? tiles.lists.filter((t) => t.title !== filters.list).slice(0, 8) : [];
  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  // Repeated dates of the same series collapse into one card ("+N more dates")
  // Opened from a Home tile: soonest first (then grouped by category below); otherwise the chosen sort
  const fromTile = !!filters.list;
  const soonest = (a, b) => (Math.max(0, daysUntil(a, today)) - Math.max(0, daysUntil(b, today))) || ((startMinutes(a) ?? 9999) - (startMinutes(b) ?? 9999));
  const results = useMemo(() => { const base = applyFilters(scored, filters, today); return collapseSeries(fromTile ? [...base].sort(soonest) : sortEvents(base, sort)); }, [scored, filters, sort, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    if (!fromTile) return null;
    const by = new Map();
    results.slice(0, limit).forEach((e) => { const k = e.ncat || e.cat || "Other"; if (!by.has(k)) by.set(k, []); by.get(k).push(e); });
    return [...by.entries()];
  }, [results, fromTile, limit]);

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
      <FilterHeader filters={filters} setFilters={(f) => { setFilters((f.ids || []).length ? f : { ...f, list: null }); setLimit(40); }} sort={sort} setSort={setSort} dark={dark} items={scored} today={today} style={{ position: "sticky", top: 0, zIndex: 20 }} />
      {filters.list && (
        <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--ink3)" }}>From Home</div>
            <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 28, lineHeight: 1.05 }}>{filters.list}</h1>
            {listTile?.teaser && <div className="muted" style={{ fontSize: 14, lineHeight: 1.4, marginTop: 4 }}>{listTile.teaser}</div>}
          </div>
          <button className="chip" aria-label="Clear" onClick={() => setFilters({ ...filters, ids: [], list: null })} style={{ height: 34, width: 34, padding: 0, justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={16} /></button>
        </div>
      )}
      <div className="row" style={{ padding: "12px 16px 8px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Regulars · {nReg}</button>
      </div>
      {view === "all" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          {groups
            ? groups.map(([cat, list]) => (
              <React.Fragment key={cat}>
                <div className="row" style={{ gap: 8, padding: "6px 4px 0", alignItems: "baseline" }}><span className="disp" style={{ fontSize: 19 }}>{cat}</span><span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{list.length}</span></div>
                {list.map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
              </React.Fragment>
            ))
            : results.slice(0, limit).map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
          {!results.length && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
          {results.length > limit && <button className="pill pill-line" onClick={() => setLimit(limit + 40)}>Show more</button>}
        </div>
      ) : null}
      {view === "all" && more.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="sec-h"><h2>More ideas</h2></div>
          <div className="hscroll">{more.map((t) => <MoodTile key={t.key} compact t={{ ...t, open: () => onTile(t) }} />)}</div>
        </div>
      )}
      {view !== "all" && (
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
