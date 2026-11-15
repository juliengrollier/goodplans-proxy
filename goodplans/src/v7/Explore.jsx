import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ResultRow, CompactCard, SquareCard, MoodTile, DotScroll, ActionsCtx } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { LIcon } from "./taxonomy.js";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";
import { collapseSeries } from "./dedupe.js";
import { startMinutes } from "./engine.js";
import { daysUntil } from "../lib/core.js";

export default function Explore({ listMeta, tiles, moodFav = [], onMoodFav, onClose, onTile = () => {}, scored, dark, today, onOpen, filters, setFilters, sort, setSort, regulars = [], annual = [] }) {
  const act = useContext(ActionsCtx);
  const [collapsed, setCollapsed] = useState({});
  const [style, setStyle] = useState("carousel"); // carousel: one row per category; list: one long list
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars
  const [freq, setFreq] = useState("all"); // all | weekly | monthly | annual
  // When filters change, jump back to the top of the results so the new list is visible
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: "smooth" }); }, [filters, sort]);

  const listTile = filters.list ? (tiles?.every || tiles?.lists || []).find((t) => t.title === filters.list) : null;
  const more = filters.list && tiles ? (tiles.all || tiles.lists).filter((t) => t.title !== filters.list).slice(0, 8) : [];
  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  // Repeated dates of the same series collapse into one card ("+N more dates")
  // Opened from a Home tile: soonest first (then grouped by category below); otherwise the chosen sort
  const fromTile = !!filters.list;
  const soonest = (a, b) => (Math.max(0, daysUntil(a, today)) - Math.max(0, daysUntil(b, today))) || ((startMinutes(a) ?? 9999) - (startMinutes(b) ?? 9999));
  const results = useMemo(() => { const base = applyFilters(scored, filters, today); return collapseSeries(fromTile ? [...base].sort(soonest) : sortEvents(base, sort)); }, [scored, filters, sort, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const savedHere = fromTile ? results.filter((e) => act.isSaved(e.id)) : [];
  const catGroups = useMemo(() => {
    const by = new Map();
    results.slice(0, 160).forEach((e) => { if (fromTile && act.isSaved(e.id)) return; const k = e.ncat || e.cat || "Other"; if (!by.has(k)) by.set(k, []); by.get(k).push(e); });
    return [...by.entries()];
  }, [results, fromTile, act]);
  const groups = useMemo(() => {
    if (!fromTile) return null;
    const by = new Map();
    results.slice(0, limit).forEach((e) => { if (act.isSaved(e.id)) return; const k = e.ncat || e.cat || "Other"; if (!by.has(k)) by.set(k, []); by.get(k).push(e); });
    return [...by.entries()];
  }, [results, fromTile, limit, act]);

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
      {!filters.list && (<FilterHeader filters={filters} setFilters={(f) => { setFilters((f.ids || []).length ? f : { ...f, list: null }); setLimit(40); }} sort={sort} setSort={setSort} dark={dark} items={scored} today={today} style={{ position: "sticky", top: 0, zIndex: 20 }} />)}
      {filters.list && (() => {
        const meta = listTile || (listMeta && listMeta.title === filters.list ? listMeta : null);
        const col = meta?.color, fg = col ? "#fff" : undefined;
        const btn = { height: 34, width: 34, padding: 0, justifyContent: "center", flexShrink: 0, ...(col ? { background: "rgba(255,255,255,.22)", color: "#fff", border: "none" } : {}) };
        const on = listTile && moodFav.includes(listTile.key);
        return (
          <div style={{ margin: 0, padding: col ? "16px 16px 18px 20px" : "14px 20px 0", borderRadius: 0, background: col || undefined, color: fg, position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-start", gap: 10 }}>
            {col && <span style={{ position: "absolute", right: 56, top: -6, opacity: 0.18 }} aria-hidden="true">{meta.node ? <LIcon node={meta.node} size={92} color="#fff" stroke={1.6} /> : meta.icon ? React.createElement(meta.icon, { size: 92, strokeWidth: 1.6 }) : null}</span>}
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <div className="row" style={{ gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", color: col ? "rgba(255,255,255,.85)" : "var(--ink3)" }}>
                {col && (meta.node ? <LIcon node={meta.node} size={15} color="#fff" stroke={2.2} /> : meta.icon ? React.createElement(meta.icon, { size: 15, strokeWidth: 2.4 }) : null)}
                <span>{meta?.verb ? meta.verb : "From Home"}</span>
              </div>
              <h1 className="disp" style={{ margin: "3px 0 0", fontSize: 28, lineHeight: 1.05 }}>{filters.list}</h1>
              {meta?.teaser && <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: 4, opacity: col ? 0.92 : 1, color: col ? undefined : "var(--ink2)" }}>{meta.teaser}</div>}
            </div>
            {listTile && onMoodFav && <button className={col ? "chip" : "chip"} aria-label={on ? "Remove from your moods" : "Add to your moods"} aria-pressed={on} onClick={() => onMoodFav(listTile)} style={{ ...btn, position: "relative" }}><Icon name="heart" size={17} fill={on ? "currentColor" : "none"} /></button>}
            <button className="chip" aria-label="Close and go back to Home" onClick={() => (onClose ? onClose() : setFilters({ ...filters, ids: [], list: null }))} style={{ ...btn, position: "relative" }}><Icon name="close" size={16} /></button>
          </div>
        );
      })()}
      {savedHere.length > 0 && (
        <div style={{ paddingTop: 14 }}>
          <div style={{ padding: "0 20px 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>Saved · {savedHere.length}</div>
          <DotScroll>{savedHere.map((ev) => <SquareCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</DotScroll>
        </div>
      )}
      <div className="row" style={{ padding: "12px 16px 8px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Regulars · {nReg}</button>
        {view === "all" && (
          <span className="row" style={{ marginLeft: "auto", gap: 4 }} role="group" aria-label="Layout">
            <button className={"chip" + (style === "carousel" ? " on" : "")} aria-pressed={style === "carousel"} aria-label="Carousels" style={{ height: 32, width: 36, padding: 0, justifyContent: "center" }} onClick={() => setStyle("carousel")}><Icon name="rows" size={16} /></button>
            <button className={"chip" + (style === "list" ? " on" : "")} aria-pressed={style === "list"} aria-label="List" style={{ height: 32, width: 36, padding: 0, justifyContent: "center" }} onClick={() => setStyle("list")}><Icon name="list" size={16} /></button>
          </span>
        )}
      </div>
      {view === "all" && style === "carousel" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {catGroups.map(([cat, list]) => (
            <div key={cat}>
              <button aria-expanded={!collapsed[cat]} className="row" onClick={() => setCollapsed({ ...collapsed, [cat]: !collapsed[cat] })} style={{ gap: 8, padding: "6px 20px 8px", alignItems: "center", background: "transparent", border: "none", color: "var(--ink)", width: "100%", textAlign: "left" }}><span className="disp" style={{ fontSize: 19 }}>{cat}</span><span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{list.length}</span><span style={{ marginLeft: "auto", display: "flex", transform: collapsed[cat] ? "rotate(-90deg)" : "none", transition: "transform .15s" }}><Icon name="chevdown" size={18} /></span></button>
              {!collapsed[cat] && <DotScroll>{list.map((ev) => <SquareCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</DotScroll>}
            </div>
          ))}
          {!results.length && <div className="card" style={{ margin: "0 16px", padding: 20, fontSize: 15 }}>Nothing matches. Try clearing a filter.</div>}
        </div>
      ) : view === "all" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          {groups
            ? groups.map(([cat, list]) => (
              <React.Fragment key={cat}>
                <button aria-expanded={!collapsed[cat]} className="row" onClick={() => setCollapsed({ ...collapsed, [cat]: !collapsed[cat] })} style={{ gap: 8, padding: "6px 4px 0", alignItems: "center", background: "transparent", border: "none", color: "var(--ink)", width: "100%", textAlign: "left" }}><span className="disp" style={{ fontSize: 19 }}>{cat}</span><span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{list.length}</span><span style={{ marginLeft: "auto", display: "flex", transform: collapsed[cat] ? "rotate(-90deg)" : "none", transition: "transform .15s" }}><Icon name="chevdown" size={18} /></span></button>
                {!collapsed[cat] && list.map((ev) => <ResultRow key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}
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
          <DotScroll>{more.map((t) => <MoodTile key={t.key} compact t={{ ...t, open: () => onTile(t) }} />)}</DotScroll>
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
