// Shared filters for Explore and Map, the same structure as Home:
// row 1 = the 10 moods (colour + icon); tapping one reveals its home categories as chips (only those with events, with counts);
// row 2 = When + a Filters button (price, distance, who with, calendar in a sheet); active sheet filters show as removable pills.
import React, { useContext, useMemo, useState } from "react";
import { tx } from "./i18n.js";
import { Icon } from "./icons.jsx";
import { Dialog, ActionsCtx } from "./components.jsx";
import { isFree, priceNum, startMinutes, nowMinutes } from "./engine.js";
import { matchV, evCovers, evStart, evEnd, eHour } from "../lib/core.js";
import { FAM, CATEGORIES, CAT, SUBTYPES, CatChip } from "./taxonomy.js";
import { INTENTS, INTENT, member, SOCIAL, SOCIAL_BY, socialFit } from "./intents.js";

export const EMPTY_FILTERS = { fam: null, cats: [], xcats: [], subs: [], xsubs: [], when: "any", price: "any", dist: "any", mood: null, mi: null, with: null, noClash: false, q: "", ids: [], list: null };

const OPTS = {
  when: [["today", tx("Today")], ["now", tx("Now & soon")], ["tonight", tx("Tonight")], ["tomorrow", tx("Tomorrow")], ["weekend", tx("This weekend")], ["week", tx("Next 7 days")], ["any", tx("Any time")]],
  price: [["any", tx("Any price")], ["free", tx("Free")], ["u20", tx("Under $20")], ["u40", tx("Under $40")]],
  dist: [["any", tx("Any distance")], ["10", "10 min"], ["20", "20 min"], ["30", "30 min"]],
  with: [[null, tx("Any")], ...SOCIAL.map((m) => [m.id, m.label])],
};
const labelOf = (k, v) => (OPTS[k].find(([x]) => x === v) || [])[1];
const sheetCount = (f) => (f.price !== "any") + (f.dist !== "any") + !!f.with + !!f.noClash;

export const activeCount = (f) => ((f.ids || []).length ? 1 : 0) + !!f.fam + !!f.mi + f.cats.length + (f.xcats || []).length + (f.subs || []).length + (f.xsubs || []).length + (f.when !== EMPTY_FILTERS.when) + sheetCount(f) + !!f.q.trim();

export function applyFilters(list, f, today) {
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  const dow = today.getDay();
  const fri = new Date(today); fri.setDate(today.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const wk = new Date(today); wk.setDate(today.getDate() + 7);
  const now = nowMinutes();
  const ql = f.q.trim().toLowerCase();
  return list.filter((e) => {
    if ((f.ids || []).length && !f.ids.includes(e.id) && !(e.altIds || []).some((x) => f.ids.includes(x))) return false; // a curated list opened from a Home tile
    if (f.fam && e.fam !== f.fam) return false;
    if (f.mi && member(e, f.mi) < 0.45) return false;
    if (f.cats.length && !f.cats.includes(e.ncat)) return false;
    if ((f.xcats || []).includes(e.ncat)) return false;
    if ((f.subs || []).length && !f.subs.includes(e.nsub)) return false;
    if (e.nsub && (f.xsubs || []).includes(e.nsub)) return false;
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
    if (f.with && SOCIAL_BY[f.with] && socialFit(e, f.with) < 0.3) return false;
    if (f.noClash && e.busy) return false;
    if (ql && ![e.title, e.venue, e.desc, e.sub, e.cat, e.ncat, e.hood, ...(e.kw || [])].join(" ").toLowerCase().includes(ql)) return false;
    return true;
  });
}

export default function FilterBar({ f, setF, dark, items = [], today }) {
  const [openWhen, setOpenWhen] = useState(false);
  const [sheet, setSheet] = useState(false);
  // Counts follow every other filter, so the numbers match what a tap would show
  const base = useMemo(() => (today ? applyFilters(items, { ...f, fam: null, mi: null, cats: [], xcats: [], subs: [], xsubs: [] }, today) : items), [items, f.when, f.price, f.dist, f.mood, f.with, f.noClash, f.q, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const moodN = useMemo(() => Object.fromEntries(INTENTS.map((it) => [it.id, base.filter((e) => member(e, it.id) >= 0.45).length])), [base]);
  const catN = useMemo(() => base.reduce((m, e) => ((m[e.ncat] = (m[e.ncat] || 0) + 1), m), {}), [base]);
  const subN = useMemo(() => base.reduce((m, e) => { if (e.nsub) m[e.ncat + '|' + e.nsub] = (m[e.ncat + '|' + e.nsub] || 0) + 1; return m; }, {}), [base]);
  const A = useContext(ActionsCtx);
  const pickMood = (id) => setF({ ...f, mi: f.mi === id ? null : id, fam: null, cats: [], subs: [] });
  const xc = f.xcats || [];
  const toggleCat = (c) => setF({ ...f, cats: f.cats.includes(c) ? f.cats.filter((x) => x !== c) : [...f.cats, c], xcats: xc.filter((x) => x !== c), subs: [] });
  const hideCat = (c) => setF({ ...f, xcats: xc.includes(c) ? xc.filter((x) => x !== c) : [...xc, c], cats: f.cats.filter((x) => x !== c) });
  const homeCats = f.mi ? INTENT[f.mi].cats : f.fam ? CATEGORIES.filter((c) => c.fam === f.fam).map((c) => c.id) : [];
  const cats = CATEGORIES.filter((c) => homeCats.includes(c.id) && (catN[c.id] || f.cats.includes(c.id) || xc.includes(c.id))).sort((a, b) => (catN[b.id] || 0) - (catN[a.id] || 0));
  // Third level: sub-types of the focused category (one category picked, or a family with a single category),
  // shown only when it has enough events to be worth splitting
  const famCats = CATEGORIES.filter((c) => homeCats.includes(c.id) && catN[c.id]);
  const focus = f.cats.length === 1 ? f.cats[0] : famCats.length === 1 ? famCats[0].id : null;
  const subs = focus && SUBTYPES[focus] ? SUBTYPES[focus].map(([n]) => n).filter((n) => subN[focus + "|" + n] || (f.subs || []).includes(n) || (f.xsubs || []).includes(n)) : [];
  const showSubs = focus && subs.length >= 2 && (catN[focus] || 0) >= 6;
  const xs = f.xsubs || [], ps = f.subs || [];
  const toggleSub = (n) => setF({ ...f, subs: ps.includes(n) ? ps.filter((x) => x !== n) : [...ps, n], xsubs: xs.filter((x) => x !== n) });
  const hideSub = (n) => setF({ ...f, xsubs: xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n], subs: ps.filter((x) => x !== n) });
  const nSheet = sheetCount(f);
  const pills = [
    (f.ids || []).length > 0 && ["list", f.list || tx("Curated list"), () => setF({ ...f, ids: [], list: null })],
    f.price !== "any" && ["price", labelOf("price", f.price), () => setF({ ...f, price: "any" })],
    f.dist !== "any" && ["dist", tx("Within ") + labelOf("dist", f.dist), () => setF({ ...f, dist: "any" })],
    f.with && ["with", tx("With ") + labelOf("with", f.with).toLowerCase(), () => setF({ ...f, with: null })],
    f.mood && ["mood", tx("Mood: ") + f.mood, () => setF({ ...f, mood: null })],
    f.noClash && ["cal", tx("Free in calendar"), () => setF({ ...f, noClash: false })],
  ].filter(Boolean);
  const chip = { height: 32, flexShrink: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Row 1: the ten moods */}
      <div className="hscroll" role="group" aria-label={tx("I'm in the mood for")} style={{ gap: 2, padding: "6px 8px 2px", scrollPaddingInline: 8 }}>
        {INTENTS.map((it) => {
          const on = f.mi === it.id, n = moodN[it.id] || 0, dim = (f.mi && !on) || (!n && !on);
          return (
            <button key={it.id} onClick={() => pickMood(it.id)} aria-pressed={on} aria-label={it.label + " · " + n}
              style={{ border: "none", background: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 56, flexShrink: 0, opacity: dim ? 0.38 : 1 }}>
              <span style={{ width: 38, height: 38, borderRadius: 19, background: it.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: on ? `0 0 0 3px var(--bg), 0 0 0 5px ${it.color}` : "none" }}>
                {React.createElement(it.icon, { size: 19, strokeWidth: 2.2, color: "#fff" })}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ink2)", whiteSpace: "nowrap" }}>{it.short || it.label}</span>
            </button>
          );
        })}
      </div>

      {/* Categories of the chosen family */}
      {(f.mi || f.fam) && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }} role="group" aria-label={(f.mi ? INTENT[f.mi].label : FAM[f.fam].label) + " categories"}>
          {cats.map((c) => <CatChip key={c.id} c={c} n={catN[c.id] || 0} on={f.cats.includes(c.id)} off={xc.includes(c.id)} starred={A.isStar("cats", c.id)} dark={dark} onPick={() => toggleCat(c.id)} onHide={() => hideCat(c.id)} onStar={() => A.toggleStar("cats", c.id)} />)}
          {!cats.length && <span className="muted" style={{ fontSize: 13, padding: "6px 4px" }}>{tx("Nothing in")} {f.mi ? INTENT[f.mi].label : FAM[f.fam].label} {tx("with these filters")}</span>}
        </div>
      )}

      {showSubs && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }} role="group" aria-label={focus + " types"}>
          <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>{focus}</span>
          {subs.map((n) => <CatChip key={n} c={CAT[focus]} label={n} n={subN[focus + "|" + n] || 0} on={ps.includes(n)} off={xs.includes(n)} starred={A.isStar("subs", n)} dark={dark} onPick={() => toggleSub(n)} onHide={() => hideSub(n)} onStar={() => A.toggleStar("subs", n)} />)}
        </div>
      )}

      {/* Row 2: When + Filters */}
      <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }}>
        <button className={"chip" + (f.when !== EMPTY_FILTERS.when ? " on" : "")} style={{ ...chip, outline: openWhen ? "2px solid var(--ink)" : "none" }} onClick={() => setOpenWhen(!openWhen)} aria-expanded={openWhen}>
          <Icon name="clock" size={13} /> {labelOf("when", f.when)} <Icon name="down2" size={13} />
        </button>
        <button className={"chip" + (nSheet ? " on" : "")} style={chip} onClick={() => setSheet(true)}>
          <Icon name="filter" size={13} /> {tx("Filters")}{nSheet ? " · " + nSheet : ""}
        </button>
        {pills.map(([k, l, clear]) => (
          <button key={k} className="chip" style={{ ...chip, background: "var(--chip)", border: "none" }} onClick={clear} aria-label={tx("Remove ") + l}>{l} <Icon name="close" size={12} /></button>
        ))}
        {activeCount({ ...f, q: "" }) > 0 && <button className="chip" style={{ ...chip, border: "none", background: "none", textDecoration: "underline" }} onClick={() => { setF({ ...EMPTY_FILTERS, q: f.q }); setOpenWhen(false); }}>{tx("Reset")}</button>}
      </div>
      {openWhen && (
        <div className="hscroll" style={{ gap: 6, padding: "0 12px", scrollPaddingInline: 12 }}>
          {OPTS.when.map(([v, l]) => (
            <button key={v} className={"chip" + (f.when === v ? " on" : "")} style={{ ...chip, background: f.when === v ? undefined : "var(--chip)", border: "none" }} onClick={() => { setF({ ...f, when: v }); setOpenWhen(false); }}>{l}</button>
          ))}
        </div>
      )}

      {sheet && (
        <Dialog title={tx("Filters")} onClose={() => setSheet(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[["price", tx("Price")], ["dist", tx("Distance")], ["with", tx("With")]].map(([k, t]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 1 }}>{t}</span>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {OPTS[k].map(([v, l]) => <button key={String(v)} className={"chip" + (f[k] === v ? " on" : "")} style={{ height: 34 }} onClick={() => setF({ ...f, [k]: v })}>{l}</button>)}
                </div>
              </div>
            ))}
            <div className="row" style={{ gap: 8 }}>
              <button className="pill pill-line" style={{ flex: 1 }} onClick={() => setF({ ...f, price: "any", dist: "any", mood: null, with: null, noClash: false })}>{tx("Clear")}</button>
              <button className="pill pill-dark" style={{ flex: 1 }} onClick={() => setSheet(false)}>{tx("Done")}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export const SORTS = [["best", tx("Best match")], ["soonest", tx("Soonest")], ["closest", tx("Closest")]];

// Identical header for Explore and Map: search, sort, then the filter bar
export function FilterHeader({ filters, setFilters, sort, setSort, dark, items, today, style }) {
  return (
    <div style={{ background: "var(--bg)", padding: "calc(12px + env(safe-area-inset-top)) 0 10px", borderBottom: "1px solid var(--line)", ...style }}>
      <div className="row" style={{ padding: "0 12px 10px", gap: 8 }}>
        <label className="row" style={{ flex: 1, gap: 8, height: 40, padding: "0 12px", borderRadius: 20, background: "var(--chip)", minWidth: 0 }}>
          <Icon name="search" size={17} />
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} type="search" placeholder={tx("Search jazz, Brooklyn, free…")} aria-label={tx("Search events")} style={{ border: "none", outline: "none", flex: 1, fontSize: 15, background: "transparent", color: "var(--ink)", fontFamily: "inherit", minWidth: 0 }} />
          {filters.q && <button onClick={() => setFilters({ ...filters, q: "" })} aria-label={tx("Clear search")} style={{ border: "none", background: "none", padding: 0 }}><Icon name="close" size={15} /></button>}
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={tx("Sort")} className="chip" style={{ height: 32, appearance: "none", paddingRight: 14 }}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <FilterBar f={filters} setF={setFilters} dark={dark} items={items} today={today} />
    </div>
  );
}

export function sortEvents(r, sort) {
  if (sort === "best") r.sort((a, b) => (b.rk ?? b.sc) - (a.rk ?? a.sc));
  if (sort === "soonest") r.sort((a, b) => (evStart(a) - evStart(b)) || ((startMinutes(a) ?? 720) - (startMinutes(b) ?? 720)));
  if (sort === "closest") r.sort((a, b) => (a.tt?.mins ?? 99) - (b.tt?.mins ?? 99));
  return r;
}
