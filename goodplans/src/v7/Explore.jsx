import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ResultRow, CompactCard, SquareCard, MoodTile, DotScroll, CatBullet, ActionsCtx } from "./components.jsx";
import { Icon } from "./icons.jsx";
import { LIcon } from "./taxonomy.js";
import { FilterHeader, applyFilters, sortEvents } from "./Filters.jsx";
import { collapseSeries } from "./dedupe.js";
import { startMinutes, whenLabel } from "./engine.js";
import { daysUntil } from "../lib/core.js";
import { neighbourhoodOf } from "./tiles.js";
import { moodProfile, primaryIntent } from "./intents.js";
import { ACT } from "./activities.js";
import { AroundMap } from "./Today.jsx";

export default function Explore({ listMeta, tiles, moodFav = [], onMoodFav, onClose, onTile = () => {}, scored, dark, today, onOpen, filters, setFilters, sort, setSort, regulars = [], annual = [], home, onFullMap, moodFb = {}, onMoodFb }) {
  const act = useContext(ActionsCtx);
  const [collapsed, setCollapsed] = useState({});
  const [style, setStyle] = useState("carousel");
  const [groupBy, setGroupBy] = useState(listMeta?.group || "cat"); // cat | day | area, defaulting from where you came
  useEffect(() => { setGroupBy(listMeta?.group || "cat"); }, [filters.list]); // eslint-disable-line react-hooks/exhaustive-deps // carousel: one row per category; list: one long list
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState("all"); // all | regulars
  const [freq, setFreq] = useState("all"); // all | weekly | monthly | annual
  // When filters change, jump back to the top of the results so the new list is visible
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: "smooth" }); }, [filters, sort]);

  const listTile = filters.list ? (tiles?.every || tiles?.lists || []).find((t) => t.title === filters.list) : null;
  const counts = useMemo(() => scored.reduce((m, e) => ((m[e.cat] = (m[e.cat] || 0) + 1), m), {}), [scored]);
  // Repeated dates of the same series collapse into one card ("+N more dates")
  // Opened from a Home tile: soonest first (then grouped by category below); otherwise the chosen sort
  const fromTile = !!filters.list;
  const soonest = (a, b) => (Math.max(0, daysUntil(a, today)) - Math.max(0, daysUntil(b, today))) || ((startMinutes(a) ?? 9999) - (startMinutes(b) ?? 9999));
  const results = useMemo(() => { const base = applyFilters(scored, filters, today); return collapseSeries(fromTile ? [...base].sort(soonest) : sortEvents(base, sort)); }, [scored, filters, sort, today]); // eslint-disable-line react-hooks/exhaustive-deps
  // You may also like: activities with the closest mood profile to this list, not mostly the same events, not this one
  const [alsoN, setAlsoN] = useState(6);
  useEffect(() => setAlsoN(6), [filters.list]);
  const alsoLike = useMemo(() => {
    if (!filters.list || !results.length || !tiles?.all) return [];
    const mine = moodProfile(results), ids = new Set(results.map((e) => e.id));
    const cosv = (a, b) => { let d = 0, na = 0, nb = 0; a.forEach((x, i) => { d += x * b[i]; na += x * x; nb += b[i] * b[i]; }); return na && nb ? d / Math.sqrt(na * nb) : 0; };
    return tiles.all.filter((t) => /^gen-(act|sub|term|cut)-/.test(t.key) && t.list?.length && (t.short || t.title) !== filters.list)
      .map((t) => { const ov = t.list.filter((e) => ids.has(e.id)).length / t.list.length; return [t, cosv(mine, moodProfile(t.list)) - ov, ov]; })
      .filter(([, , ov]) => ov < 0.5).sort((a, b) => b[1] - a[1])
      // Variety: at most two per category, and no two lists sharing most of their events
      .reduce((acc, x) => { const [t] = x, c = t.list[0]?.ncat, n = acc.filter(([u]) => u.list[0]?.ncat === c).length; const dup = acc.some(([u]) => { const ids2 = new Set(u.list.map((e) => e.id)); return t.list.filter((e) => ids2.has(e.id)).length / t.list.length > 0.5; }); if (acc.length < 30 && n < 3 && !dup) acc.push(x); return acc; }, [])
      .map(([t]) => { const b = primaryIntent(t.list[0]); return { ...t, title: t.short || t.title, ...(b ? { verb: b.label, color: b.color } : {}) }; });
  }, [filters.list, results, tiles]);
  const greatFor = useMemo(() => { const m = {}; results.forEach((e) => { if (e.act && ACT[e.act]) (m[e.act] = m[e.act] || []).push(e); }); return Object.entries(m).sort((a, b) => b[1].length - a[1].length).slice(0, 6); }, [results]);
  const savedHere = fromTile ? results.filter((e) => act.isSaved(e.id)) : [];
  // Grouping: by category (default), by day (soonest first) or by neighbourhood (biggest first)
  const keyOf = (e) => {
    if (groupBy === "day") { const d = Math.max(0, daysUntil(e, today)); return [d === 0 ? "Today" : d === 1 ? "Tomorrow" : new Date(today.getTime() + d * 86400000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }), d]; }
    if (groupBy === "area") { const a = neighbourhoodOf(e) || (e.hood ? String(e.hood).split(",")[0].trim() : "") || "Elsewhere"; return [a, 0]; }
    return [e.ncat || e.cat || "Other", 0];
  };
  const groupUp = (list) => {
    const by = new Map(), ord = {};
    list.forEach((e) => { const [k, o] = keyOf(e); if (!by.has(k)) { by.set(k, []); ord[k] = o; } by.get(k).push(e); });
    let out = [...by.entries()];
    if (groupBy === "day") out = out.sort((a, b) => ord[a[0]] - ord[b[0]]).map(([k, l]) => [k, l.slice().sort((x, y) => (startMinutes(x) ?? 9999) - (startMinutes(y) ?? 9999))]);
    if (groupBy === "area") out = out.sort((a, b) => (a[0] === "Elsewhere") - (b[0] === "Elsewhere") || b[1].length - a[1].length);
    return out;
  };
  const catGroups = useMemo(() => groupUp(results.slice(0, 160).filter((e) => !(fromTile && act.isSaved(e.id)))), [results, fromTile, act, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => (fromTile ? groupUp(results.slice(0, limit).filter((e) => !act.isSaved(e.id))) : null), [results, fromTile, limit, act, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const col = meta?.color || "#1F2A5C";
        const ico = (n) => (meta?.node ? <LIcon node={meta.node} size={n} color="#fff" stroke={2.2} /> : meta?.icon ? React.createElement(meta.icon, { size: n, strokeWidth: 2.2 }) : null);
        const btn = { width: 38, height: 38, borderRadius: 19, border: "1px solid var(--line, rgba(128,128,128,.25))", background: "var(--card)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 };
        const on = listTile && moodFav.includes(listTile.key);
        const first = results[0];
        const mapEvs = results.filter((e) => Array.isArray(e.coord) && e.coord.length === 2).slice(0, 80);
        return (
          <div>
            <div style={{ padding: "20px 20px 4px" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span className="row" style={{ gap: 10, alignItems: "center" }}>
                  <span style={{ width: 44, height: 44, borderRadius: 14, background: col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ico(22)}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase", color: col }}>{meta?.verb || "Your list"}</span>
                </span>
                <span className="row" style={{ gap: 8 }}>
                  {listTile && onMoodFav && <button aria-label={on ? "Remove from your moods" : "Add to your moods"} aria-pressed={on} onClick={() => onMoodFav(listTile)} style={{ ...btn, color: on ? col : "var(--ink)" }}><Icon name="heart" size={18} fill={on ? "currentColor" : "none"} /></button>}
                  <button aria-label="Close and go back to Home" onClick={() => (onClose ? onClose() : setFilters({ ...filters, ids: [], list: null }))} style={btn}><Icon name="close" size={16} /></button>
                </span>
              </div>
              <h1 className="disp" style={{ margin: 0, fontSize: 30, lineHeight: 1.08 }}>{filters.list}</h1>
              {meta?.kind === "hood" && meta.intro ? <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8, color: "var(--ink2, var(--ink3))" }}>{meta.intro}</div>
                : meta?.teaser && <div style={{ fontSize: 15, lineHeight: 1.45, marginTop: 8, color: "var(--ink2, var(--ink3))", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{meta.teaser}</div>}
              {meta?.kind === "hood" && greatFor.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink3)", marginBottom: 7 }}>Great for</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {greatFor.map(([id, l]) => <button key={id} className="chip" style={{ height: 32, fontSize: 13.5 }} onClick={() => onTile({ key: "hood-act-" + id, title: ACT[id].label[0].toUpperCase() + ACT[id].label.slice(1) + " in " + filters.list, list: l, color: col, icon: meta.icon, teaser: "Soonest first.", verb: filters.list, group: "day" })}>{ACT[id].label} <span style={{ opacity: 0.6, fontWeight: 800, marginLeft: 4 }}>{l.length}</span></button>)}
                  </div>
                </div>
              )}
              {meta?.why && <div className="row" style={{ gap: 6, marginTop: 10, fontSize: 13, fontWeight: 800, color: col }}><Icon name="spark" size={14} />{meta.why}</div>}
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: meta?.why ? 6 : 12, color: "var(--ink3)" }}>{results.length} {results.length === 1 ? "event" : "events"}{first ? " · from " + whenLabel(first, today).split(" · until")[0].replace(/\s[-–]\s\d.*$/, "") : ""}</div>
            </div>
            {mapEvs.length > 0 && home && <div style={{ paddingTop: 16 }}><AroundMap evs={mapEvs} home={home} dark={dark} today={today} onOpen={onOpen} height={180} onFull={() => onFullMap && onFullMap(mapEvs.map((e) => e.id), filters.list)} /></div>}
          </div>
        );
      })()}
      <div className="row" style={{ padding: "20px 16px 12px", gap: 6 }} role="tablist">
        <button role="tab" aria-selected={view === "all"} className={"chip" + (view === "all" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("all")}>All · {results.length}</button>
        <button role="tab" aria-selected={view === "regulars"} className={"chip" + (view === "regulars" ? " on" : "")} style={{ height: 32 }} onClick={() => setView("regulars")}>Recurring · {nReg}</button>
        {view === "all" && (
          <span className="row" style={{ marginLeft: "auto", gap: 4 }} role="group" aria-label="Layout">
            <span className="chip" style={{ height: 32, padding: 0, position: "relative", gap: 0 }}>
              <select aria-label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ appearance: "none", WebkitAppearance: "none", border: "none", background: "transparent", color: "inherit", font: "inherit", fontSize: 13, fontWeight: 800, height: "100%", padding: "0 26px 0 12px" }}>
                <option value="cat">Category</option><option value="day">Day</option><option value="area">Area</option>
              </select>
              <span style={{ position: "absolute", right: 8, top: 8, pointerEvents: "none", display: "flex" }}><Icon name="chevdown" size={15} /></span>
            </span>
            <button className={"chip" + (style === "carousel" ? " on" : "")} aria-pressed={style === "carousel"} aria-label="Carousels" style={{ height: 32, width: 36, padding: 0, justifyContent: "center" }} onClick={() => setStyle("carousel")}><Icon name="rows" size={16} /></button>
            <button className={"chip" + (style === "list" ? " on" : "")} aria-pressed={style === "list"} aria-label="List" style={{ height: 32, width: 36, padding: 0, justifyContent: "center" }} onClick={() => setStyle("list")}><Icon name="list" size={16} /></button>
          </span>
        )}
      </div>

      {savedHere.length > 0 && (
        <div style={{ paddingTop: 8, marginBottom: 14 }}>
          <div style={{ padding: "0 20px 12px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink3)" }}>Saved · {savedHere.length}</div>
          {savedHere.length === 1
            ? <div style={{ padding: "0 16px" }}><CompactCard ev={savedHere[0]} dark={dark} today={today} onOpen={onOpen} /></div>
            : <DotScroll>{savedHere.map((ev) => <SquareCard key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</DotScroll>}
        </div>
      )}
      {view === "all" && style === "carousel" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 30, paddingTop: 12 }}>
          {catGroups.map(([cat, list]) => (
            <div key={cat}>
              <button aria-expanded={!collapsed[cat]} className="row" onClick={() => setCollapsed({ ...collapsed, [cat]: !collapsed[cat] })} style={{ gap: 8, padding: "2px 20px 12px", alignItems: "center", background: "transparent", border: "none", color: "var(--ink)", width: "100%", textAlign: "left" }}>{groupBy === "cat" ? <CatBullet ev={list[0]} size={24} dark={dark} /> : <span style={{ display: "flex", color: "var(--ink2)" }}><Icon name={groupBy === "day" ? "cal" : "pin"} size={20} /></span>}<span className="disp" style={{ fontSize: 19 }}>{cat}</span><span className="muted" style={{ fontSize: 13, fontWeight: 800 }}>{list.length}</span><span style={{ marginLeft: "auto", display: "flex", transform: collapsed[cat] ? "rotate(-90deg)" : "none", transition: "transform .15s" }}><Icon name="chevdown" size={18} /></span></button>
              {!collapsed[cat] && <DotScroll>{list.map((ev) => <SquareCard hideCat={groupBy === "cat"} key={ev.id} ev={ev} dark={dark} today={today} onOpen={onOpen} />)}</DotScroll>}
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
      {view === "all" && fromTile && alsoLike.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div className="sec-h" style={{ flexDirection: "column", alignItems: "flex-start", gap: 3 }}><h2>You may also like</h2><span className="muted" style={{ fontSize: 14 }}>Activities close to this one.</span></div>
          <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {alsoLike.slice(0, alsoN).map((t) => <MoodTile key={t.key} t={{ ...t, open: () => onTile(t) }} fb={moodFb[t.key] || 0} onFb={onMoodFb} />)}
          </div>
          {alsoLike.length > alsoN && (
            <div style={{ padding: "12px 16px 0" }}>
              <button className="btn" onClick={() => setAlsoN(alsoN + 6)} style={{ width: "100%", padding: "12px 0", borderRadius: 14, border: "1.5px solid var(--ink)", background: "transparent", color: "var(--ink)", fontWeight: 800, fontSize: 14 }}>More activities</button>
            </div>
          )}
        </div>
      )}
      {view !== "all" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }} role="tablist" aria-label="How often">
            {[["all", "All"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["annual", "Yearly"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={freq === k} className={"chip" + (freq === k ? " on" : "")} style={{ height: 30 }} onClick={() => setFreq(k)}>{l}</button>
            ))}
          </div>
          {!nReg && <div className="card" style={{ padding: 20, fontSize: 15 }}>Nothing recurring yet. A series shows up here once it appears on two dates with a pattern (weekly, every other week, monthly), or says "every Tuesday". The app keeps them between refreshes.</div>}
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
