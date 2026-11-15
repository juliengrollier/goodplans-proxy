// Shared filters for Explore and Map: a row of category icons + one row of compact chips.
// Tapping a chip opens its choices inline (one at a time), so the bar never takes more than 3 short rows.
import React, { useState } from "react";
import { Icon, Glyph } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { isFree, priceNum, startMinutes, nowMinutes } from "./engine.js";
import { CATS, matchV, evCovers, evStart, evEnd, eHour } from "../lib/core.js";

export const EMPTY_FILTERS = { cats: [], when: "today", price: "any", dist: "any", mood: null, noClash: false, q: "" };

const OPTS = {
  when: [["today", "Today"], ["now", "Now & soon"], ["tonight", "Tonight"], ["tomorrow", "Tomorrow"], ["weekend", "This weekend"], ["week", "Next 7 days"], ["any", "Any time"]],
  price: [["any", "Any price"], ["free", "Free"], ["u20", "Under $20"], ["u40", "Under $40"]],
  dist: [["any", "Any distance"], ["10", "10 min"], ["20", "20 min"], ["30", "30 min"]],
  mood: [[null, "Any mood"], ["date", "Date night"], ["weird", "Something weird"], ["sunday", "Sunday reset"], ["nyc", "Only in NYC"], ["chill", "Chill"], ["move", "Get moving"], ["late", "After dark"], ["solo", "Solo"], ["kids", "With kids"]],
};
const NAMES = { when: "When", price: "Price", dist: "Distance", mood: "Mood" };
const labelOf = (k, v) => (OPTS[k].find(([x]) => x === v) || [])[1];

export const activeCount = (f) => f.cats.length + (f.when !== EMPTY_FILTERS.when) + (f.price !== "any") + (f.dist !== "any") + !!f.mood + !!f.noClash + !!f.q.trim();

export function applyFilters(list, f, today) {
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  const dow = today.getDay();
  const fri = new Date(today); fri.setDate(today.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const wk = new Date(today); wk.setDate(today.getDate() + 7);
  const now = nowMinutes();
  const ql = f.q.trim().toLowerCase();
  return list.filter((e) => {
    if (f.cats.length && !f.cats.includes(e.cat)) return false;
    if (f.when === "today" && !evCovers(e, today)) return false;
    if (f.when === "now") { const sm = startMinutes(e); if (!(evCovers(e, today) && sm != null && sm >= now - 90 && sm <= now + 150)) return false; }
    if (f.when === "tonight" && !(evCovers(e, today) && (startMinutes(e) ?? eHour(e.time, e.cat) * 60) >= 16 * 60)) return false;
    if (f.when === "tomorrow" && !evCovers(e, tom)) return false;
    if (f.when === "weekend" && !(evStart(e) <= sun && evEnd(e) >= (dow === 0 || dow >= 5 ? today : fri))) return false;
    if (f.when === "week" && !(evStart(e) <= wk)) return false;
    const p = isFree(e) ? 0 : priceNum(e);
    if (f.price === "free" && !isFree(e)) return false;
    if (f.price === "u20" && !(p != null && p < 20)) return false;
    if (f.price === "u40" && !(p != null && p < 40)) return false;
    if (f.dist !== "any" && !((e.tt?.mins ?? 99) <= +f.dist)) return false;
    if (f.mood && !matchV(e, f.mood)) return false;
    if (f.noClash && e.busy) return false;
    if (ql && ![e.title, e.venue, e.desc, e.sub, e.cat, e.hood, ...(e.kw || [])].join(" ").toLowerCase().includes(ql)) return false;
    return true;
  });
}

export default function FilterBar({ f, setF, dark, counts, floating, showSearch }) {
  const [open, setOpen] = useState(null);
  const cats = Object.keys(CATS).filter((c) => !counts || counts[c] || f.cats.includes(c));
  const toggleCat = (c) => setF({ ...f, cats: f.cats.includes(c) ? f.cats.filter((x) => x !== c) : [...f.cats, c] });
  const n = activeCount(f);
  const bg = floating ? { background: "var(--card)", borderRadius: 22, boxShadow: "0 6px 20px rgba(27,31,59,.16)", padding: "8px 0" } : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...bg }}>
      {showSearch && (
        <label className="row" style={{ gap: 8, height: 40, margin: "0 12px", padding: "0 12px", borderRadius: 20, background: "var(--chip)" }}>
          <Icon name="search" size={17} />
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} type="search" placeholder="Search jazz, Brooklyn, free…" aria-label="Search events" style={{ border: "none", outline: "none", flex: 1, fontSize: 15, background: "transparent", color: "var(--ink)", fontFamily: "inherit", minWidth: 0 }} />
          {f.q && <button onClick={() => setF({ ...f, q: "" })} aria-label="Clear search" style={{ border: "none", background: "none", padding: 0 }}><Icon name="close" size={15} /></button>}
        </label>
      )}

      {/* Row 1: categories. None selected = all shown; selected ones light up, the rest dim */}
      <div className="hscroll" style={{ gap: 8, padding: "0 12px", scrollPaddingInline: 12 }} role="group" aria-label="Categories">
        {cats.map((c) => {
          const on = f.cats.includes(c), col = catColor(c, dark), dim = f.cats.length && !on;
          return (
            <button key={c} onClick={() => toggleCat(c)} aria-pressed={on} aria-label={c} title={c}
              style={{ flexShrink: 0, border: "none", background: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 50, opacity: dim ? 0.35 : 1 }}>
              <span style={{ width: 38, height: 38, borderRadius: 19, background: col, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? `0 0 0 3px var(--bg), 0 0 0 5px ${col}` : "none" }}>
                <Glyph name={catIcon(c)} size={21} color={col} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ink2)", whiteSpace: "nowrap", maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis" }}>{c.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Row 2: compact chips; each opens its choices below */}
      <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }}>
        {n > 0 && <button className="chip" style={{ height: 32 }} onClick={() => { setF({ ...EMPTY_FILTERS, q: f.q }); setOpen(null); }}><Icon name="close" size={13} /> Clear</button>}
        {["when", "price", "dist", "mood"].map((k) => {
          const isOn = k === "mood" ? !!f.mood : f[k] !== (EMPTY_FILTERS[k]);
          const shown = k === "when" || isOn;
          return (
            <button key={k} className={"chip" + (isOn ? " on" : "")} style={{ height: 32, outline: open === k ? "2px solid var(--ink)" : "none" }} onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>
              {shown ? labelOf(k, f[k]) : NAMES[k]} <Icon name="down2" size={13} />
            </button>
          );
        })}
        <button className={"chip" + (f.noClash ? " on" : "")} style={{ height: 32 }} onClick={() => setF({ ...f, noClash: !f.noClash })}><Icon name="cal" size={13} /> Free in calendar</button>
      </div>

      {open && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }}>
          {OPTS[open].map(([v, l]) => (
            <button key={String(v)} className={"chip" + (f[open] === v ? " on" : "")} style={{ height: 32, background: f[open] === v ? undefined : "var(--chip)", border: "none" }}
              onClick={() => { setF({ ...f, [open]: v }); setOpen(null); }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export const SORTS = [["best", "Best match"], ["soonest", "Soonest"], ["closest", "Closest"]];

// Identical header for Explore and Map: search, sort, then the filter bar
export function FilterHeader({ filters, setFilters, sort, setSort, dark, counts, style }) {
  return (
    <div style={{ background: "var(--bg)", padding: "calc(12px + env(safe-area-inset-top)) 0 10px", borderBottom: "1px solid var(--line)", ...style }}>
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
      <FilterBar f={filters} setF={setFilters} dark={dark} counts={counts} />
    </div>
  );
}

export function sortEvents(r, sort) {
  if (sort === "best") r.sort((a, b) => b.sc - a.sc);
  if (sort === "soonest") r.sort((a, b) => (evStart(a) - evStart(b)) || ((startMinutes(a) ?? 720) - (startMinutes(b) ?? 720)));
  if (sort === "closest") r.sort((a, b) => (a.tt?.mins ?? 99) - (b.tt?.mins ?? 99));
  return r;
}
