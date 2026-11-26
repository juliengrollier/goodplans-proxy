import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { tx } from "./i18n.js";
import { createPortal } from "react-dom";
import { Glyph, Icon, glyphSvgString } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { evColor, evNode, LIcon, lIconString } from "./taxonomy.js";
import { whenLabel, isFree, weatherBadge, startMinutes, endMinutes, nowMinutes, fmtClock, eventWindow } from "./engine.js";
import { ACT } from "./activities.js";
import { primaryIntent } from "./intents.js";
import { daysUntil, nextOn } from "../lib/core.js";
import { useEventImage, dropImage } from "./images.js";
import { neighbourhoodOf } from "./tiles.js";

export const ActionsCtx = createContext({ onSeen: () => {}, prefOf: () => 0, onReact: () => {}, onSave: () => {}, isSaved: () => false, thumbOf: () => 0, isStar: () => false, toggleStar: () => {} });

export function CatBullet({ cat, ev, size = 30, dark }) {
  // With an event: its category icon in its family colour. With only a (legacy) category name: the older glyph.
  const c = ev ? evColor(ev, dark) : catColor(cat, dark);
  return (
    <span title={ev ? ev.ncat : cat} style={{ width: size, height: size, borderRadius: "50%", background: c, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {ev ? <LIcon node={evNode(ev)} size={Math.round(size * 0.56)} color="#fff" /> : <Glyph name={catIcon(cat)} size={Math.round(size * 0.56)} color={c} />}
    </span>
  );
}

export function PriceTag({ ev }) {
  if (isFree(ev)) return <span className="tag tag-free">{tx("Free")}</span>;
  const p = (ev.price || "").split("/")[0].trim();
  // Only real prices: "See website" or "Tickets" say nothing on a card
  if (!/\$\s?\d|\d\s?(usd|\$)/i.test(p)) return null;
  return p ? <span className="tag tag-plain">{p.length > 14 ? p.slice(0, 13) + "…" : p}</span> : null;
}

// Travel time with the transport mode icon (and the subway line bullet when known)
export function Travel({ tt, size = 13, muted }) {
  if (!tt) return null;
  const walk = tt.mode === "walk";
  return (
    <span className="row" style={{ gap: 4, whiteSpace: "nowrap", color: muted ? "var(--ink3)" : "inherit" }}>
      <Icon name={walk ? "walk" : "train"} size={size + 3} width={2.2} />
      {tt.mins} min
    </span>
  );
}

// What to expect: Claude keywords when available, else the sub-category
export function Keywords({ ev, max = 3, size = "sm", oneLine }) {
  const k = (ev.kw && ev.kw.length ? ev.kw : ev.sub ? [ev.sub.toLowerCase()] : []).filter((w) => !/^(other|misc|miscellaneous|general|event|events|n\/a)$/i.test(String(w).trim())).slice(0, max);
  if (!k.length) return null;
  return (
    <div className="row" style={oneLine ? { gap: 4, flexWrap: "nowrap", overflow: "hidden", minWidth: 0, flex: 1, maskImage: "linear-gradient(90deg,#000 85%,transparent)", WebkitMaskImage: "linear-gradient(90deg,#000 85%,transparent)" } : { gap: 5, flexWrap: "wrap" }}>
      {k.map((w) => <span key={w} className="kw" style={size === "lg" ? { height: 28, fontSize: 13, padding: "0 11px" } : null}>{w}</span>)}
    </div>
  );
}

// First words of the description, so a card says what the event is
// Dot-separated keywords on one line, in the same soft style as the blurb they replace
// One word that says the most about the event (the rarest of its keywords in the feed, or its activity), then its area
let KW_DF = {};
export const setKeywordDf = (events) => { const df = {}; events.forEach((e) => new Set((e.kw || []).map((k) => String(k).toLowerCase())).forEach((k) => { df[k] = (df[k] || 0) + 1; })); KW_DF = df; };
const KW_JUNK = /^(nyc|new york|brooklyn|manhattan|queens|free|event|events|other|misc|general|live|night|show|fun|social|outdoor|indoor|family-friendly|all ages|21\+|late night)$/i;
// The most precise word for what the event is: its rarest specific keyword (e.g. "glassblowing"), else the activity, sub-type, category
export function preciseLabel(ev) {
  const t = (ev.title || "").toLowerCase(), cat = String(ev.ncat || ev.cat || "").toLowerCase();
  const kws = (ev.kw || []).map((k) => String(k).trim()).filter((k) => k && k.length <= 18 && !KW_JUNK.test(k) && k.toLowerCase() !== cat && !/\b(night|show|class|event|party|session|series)s?$/i.test(k));
  const best = kws.sort((a, b) => (KW_DF[a.toLowerCase()] || 1) - (KW_DF[b.toLowerCase()] || 1) || a.length - b.length)[0];
  const l = best || (ev.act && ACT[ev.act]?.label) || ev.nsub || ev.ncat || ev.cat || "";
  return l ? l[0].toUpperCase() + l.slice(1) : "";
}
export function KeywordLine({ ev, size = 12 }) {
  const t = (ev.title || "").toLowerCase(), cat = String(ev.ncat || ev.cat || "").toLowerCase();
  const kws = (ev.kw || []).map((k) => String(k).trim()).filter((k) => k && !KW_JUNK.test(k) && k.toLowerCase() !== cat && !t.includes(k.toLowerCase()));
  const word = kws.sort((a, b) => (KW_DF[a.toLowerCase()] || 1) - (KW_DF[b.toLowerCase()] || 1) || a.length - b.length)[0] || ev.nsub || ev.sub;
  const area = neighbourhoodOf(ev) || (ev.hood ? String(ev.hood).split(",")[0] : null);
  const bits = [word, area].filter(Boolean);
  if (!bits.length) return <div style={{ fontSize: size, lineHeight: 1.35 }}>&nbsp;</div>;
  return <div className="ell" style={{ fontSize: size, lineHeight: 1.35, color: "var(--ink3)", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bits.join(" · ")}</div>;
}

export function Snippet({ ev, lines = 2, size = 13.5 }) {
  // A punchy one-liner written by Claude when tagging; the source's description otherwise
  const d = (ev.hook || ev.desc || "").replace(/\s+/g, " ").trim();
  if (!d || d.toLowerCase() === (ev.title || "").toLowerCase()) return null;
  return <div style={{ fontSize: size, lineHeight: 1.35, color: "var(--ink3)", opacity: 0.7, display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d}</div>;
}

export function WeatherTag({ ev, compact }) {
  const b = weatherBadge(ev);
  if (!b) return null;
  return <span className={"tag tag-" + b.tone} style={{ gap: 4, flexShrink: 0 }} title={b.text}><Icon name={b.icon} size={13} width={2.4} />{compact ? b.text.split(" · ")[0] : b.text}</span>;
}

// Thumbs down (less like this) and save on every card; saves are the "more like this" signal. Clicks don't open the card.
export function CardActions({ ev, size = 34, onNfm, noSave }) {
  const a = useContext(ActionsCtx);
  const t = a.thumbOf(ev.id), saved = a.isSaved(ev.id);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  // Saves are the strong signal (full navy circle). Thumbs are bare, faint icons: fainter when idle, a bit firmer when active
  const btn = (on, soft) => soft
    ? { width: size, height: size, borderRadius: size / 2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent", color: "var(--ink)", opacity: on ? 0.6 : 0.25 }
    : { width: size, height: size, borderRadius: size / 2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: on ? "var(--navy)" : "var(--chip)", color: on ? "var(--onnavy)" : "var(--ink)" };
  const is = Math.round(size * 0.5);
  return (
    <div className="row" style={{ gap: 6 }}>
      <button aria-label={tx("Less like this")} aria-pressed={t === -1} style={btn(t === -1, true)} onClick={stop(() => { if (onNfm) return onNfm(ev); if (t === -1) a.onReact(ev, "undo"); else { a.onReact(ev, "down", null, true); a.askWhy(ev, "down"); } })}><Icon name="down" size={is} /></button>
      {!noSave && <button aria-label={saved ? tx("Remove from plans") : tx("Save to plans")} aria-pressed={saved} style={{ ...btn(saved), width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, border: saved ? "none" : "2px solid var(--ink)", background: saved ? "var(--navy)" : "transparent" }} onClick={stop(() => a.onSave(ev))}><Icon name="save" size={is + 2} fill={saved ? "currentColor" : "none"} /></button>}
    </div>
  );
}

// Save button and price sit on the picture itself
export function PicOverlay({ ev, size = 36, mood }) {
  const a = useContext(ActionsCtx);
  const saved = a.isSaved(ev.id);
  const m = primaryIntent(ev);
  return (
    <>
      <button aria-label={saved ? tx("Remove from plans") : tx("Save to plans")} aria-pressed={saved} onClick={(e) => { e.stopPropagation(); a.onSave(ev); }}
        style={{ position: "absolute", top: 8, right: 8, width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: saved ? "rgba(255,255,255,.92)" : "rgba(10,12,30,.28)", color: saved ? "#1B1F3B" : "#fff", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
        <Icon name="save" size={Math.round(size * 0.46)} fill={saved ? "currentColor" : "none"} />
      </button>
      {mood && m && <span className="row" style={{ position: "absolute", left: 0, top: 0, gap: 6, padding: "7px 12px 7px 11px", borderBottomRightRadius: 14, background: m.color, color: "#fff", fontSize: 12.5, fontWeight: 500 }}>{React.createElement(m.icon, { size: 14, strokeWidth: 2.2 })}{m.label}</span>}
    </>
  );
}

// Real picture when one is found (poster, then venue), else a typographic poster in the category colour
export function Media({ ev, dark, height, radius = 18, big, hideTitle, credit, tint }) {
  const img = useEventImage(ev);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [img?.src]);
  const c = evColor(ev, dark);
  if (img?.src && !broken) {
    return (
      <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden", background: "var(--media)" }}>
        <img src={img.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => { setBroken(true); dropImage(ev.id); }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: big ? "none" : "var(--img-filter)" }} />
        {!big && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--bg)", opacity: "var(--img-veil)", pointerEvents: "none" }} />}
        {tint && !big && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: tint, opacity: 0.28, mixBlendMode: "soft-light", pointerEvents: "none" }} />}
        {tint && !big && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: tint, opacity: 0.12, pointerEvents: "none" }} />}
        {credit && img.credit && <span style={{ position: "absolute", left: 12, bottom: 8, fontSize: 10, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{img.credit}</span>}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", height, borderRadius: radius, background: c, color: "#fff", padding: big ? 18 : 12, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
      {!big && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--bg)", opacity: "var(--ph-veil)", pointerEvents: "none" }} />}
      {hideTitle ? <div style={{ margin: "auto", opacity: 0.9 }}><LIcon node={evNode(ev)} size={Math.min(96, Math.round((typeof height === "number" ? height : 200) * 0.42))} color="#fff" stroke={1.8} /></div> : <LIcon node={evNode(ev)} size={big ? 46 : 30} color="#fff" stroke={2} />}
      {!hideTitle && <span className="disp clamp2" style={{ fontSize: big ? 28 : 18, lineHeight: 1, letterSpacing: -0.3 }}>{ev.title}</span>}
    </div>
  );
}

export function Flags({ ev }) {
  return (
    <>
      {ev.recurring && <span className="tag tag-plain">{(ev.recLabel || tx("Recurring")).split(" · ")[0]}</span>}
      <WeatherTag ev={ev} />
    </>
  );
}

// Day and time stay semi-bold; "until Dec 3" is context, so it is regular weight and softer
export function When({ text, plain }) {
  const i = (text || "").indexOf(" · until "), fw = plain ? 500 : 700;
  if (i < 0) return <span style={{ fontWeight: fw }}>{text}</span>;
  return <span><span style={{ fontWeight: fw }}>{text.slice(0, i)}</span><span style={{ fontWeight: 400, color: "var(--ink3)" }}>{text.slice(i)}</span></span>;
}

// Category · sub-type, shown next to the icon on cards
export const catLabel = (ev) => (ev.ncat ? ev.ncat + (ev.nsub ? " · " + ev.nsub : "") : ev.cat || "");
// Venue, after time and travel on the meta line (truncates first)
function Venue({ ev }) {
  const v = (ev.venue || "").split(",")[0];
  return v ? <span className="ell" style={{ minWidth: 0, flex: "0 1 auto", color: "var(--ink3)", fontWeight: 600 }}>· {v}</span> : null;
}

// A card counts as seen once per app session when most of it stays on screen for a second
const seenSession = new Set();
function useSeen(ev) {
  const a = useContext(ActionsCtx);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || !ev?.id || seenSession.has(ev.id) || typeof IntersectionObserver === "undefined") return;
    let t = null;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) t = setTimeout(() => { if (!seenSession.has(ev.id)) { seenSession.add(ev.id); a.onSeen(ev); } io.disconnect(); }, 1000);
      else clearTimeout(t);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [ev?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
const tap = (fn, ev) => ({ role: "button", tabIndex: 0, "data-ev": ev?.id, onClick: () => fn(ev), onKeyDown: (e) => { if (e.key === "Enter") fn(ev); } });

export function HeroCard({ ev, dark, today, onOpen, label }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} className="ev-flat" style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 10, width: "100%", opacity: 1, cursor: "pointer" }}>
      <div style={{ position: "relative" }}>
        <Media ev={ev} dark={dark} height={190} big />
        <PicOverlay ev={ev} size={40} />
        {label && <span className="tag tag-white" style={{ position: "absolute", top: 10, left: 10 }}>{label}</span>}
      </div>
      <div style={{ padding: "0 6px 4px", display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
        <div className="row" style={{ gap: 8 }}>
          <CatBullet ev={ev} size={26} dark={dark} />
          <span className="ell" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{catLabel(ev)}</span>
        </div>
        <div className="disp clamp2" style={{ fontSize: 23, lineHeight: 1.1 }}>{ev.title}</div>

        <div className="row" style={{ gap: 10, fontSize: 14, minWidth: 0 }}>
          <When text={whenLabel(ev, today)} plain /><span style={{ fontWeight: 400, color: "var(--ink3)" }}><Travel tt={ev.tt} size={14} /></span>
          <span style={{ marginLeft: "auto", flexShrink: 0 }}><CardActions ev={ev} noSave /></span>
        </div>
      </div>
    </div>
  );
}

// A horizontal carousel with page dots under it, so it is obvious there is more to swipe to
// The carousel a card was last opened from, and which card: when that card's page closes, the carousel
// slides on to the next one, so you see where you are and what's next
let dotArm = null;
export const SHEET_CLOSED = "gp:sheet-closed";
export function DotScroll({ children, className = "hscroll", style, onMore, snap }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const last = useRef({ x: 0, dir: 0, idx: 0, t: 0 });
  const n = React.Children.count(children);
  const arm = (ev) => {
    const el = ref.current; if (!el) return;
    const j = [...el.children].findIndex((k) => k.contains(ev.target));
    dotArm = j >= 0 && el.children[j].tagName !== "BUTTON" ? { el, j, at: Date.now() } : null;
  };
  useEffect(() => {
    const onClosed = () => {
      const a = dotArm, el = ref.current;
      if (!a || a.el !== el || !el) return;
      dotArm = null;
      if (Date.now() - a.at > 30 * 60000) return;
      // a moment for the page to slide away first; only when the carousel is on screen
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        if (!el.isConnected || !el.offsetParent || r.bottom < 0 || r.top > window.innerHeight) return;
        const next = el.children[a.j + 1];
        if (!next || next.tagName === "BUTTON") return; // the "More" tile is not a card
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ left: next.offsetLeft - pad, behavior: reduce ? "auto" : "smooth" });
      }, 260);
    };
    window.addEventListener(SHEET_CLOSED, onClosed);
    return () => window.removeEventListener(SHEET_CLOSED, onClosed);
  }, []);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const kids = [...el.children]; if (kids.length < 2) return;
    const x = el.scrollLeft + (parseFloat(getComputedStyle(el).paddingLeft) || 0);
    let best = 0, bd = 1e9;
    kids.forEach((k, j) => { const d = Math.abs(k.offsetLeft - x); if (d < bd) { bd = d; best = j; } });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = kids.length - 1;
    // Endless: ask for more when within about two cards of the end
    if (onMore && el.scrollLeft + el.clientWidth >= el.scrollWidth - 380) onMore();
    setI(best);
    if (snap) {
      // Springy settle: when a swipe comes to rest, the card lands with a small overshoot
      const L = last.current;
      if (el.scrollLeft !== L.x) L.dir = el.scrollLeft > L.x ? 1 : -1;
      L.x = el.scrollLeft; clearTimeout(L.t);
      L.t = setTimeout(() => {
        const k = [...el.children][best];
        if (!k || !k.animate || best === L.idx && L.dir === 0) return;
        L.idx = best;
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const d = L.dir || 1; L.dir = 0;
        k.animate([{ transform: "translateX(" + d * 12 + "px)" }, { transform: "translateX(" + d * -4 + "px)", offset: 0.55 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)" });
      }, 120);
    }
  };
  const shown = Math.min(n, 7), at = n > 1 ? Math.round((i / (n - 1)) * (shown - 1)) : 0;
  return (
    <>
      <div ref={ref} className={className + (snap ? " gp-snap" : "")} style={style} onScroll={onScroll} onClickCapture={arm}>{children}</div>
      {n > 1 && (
        <div className="row" style={{ justifyContent: "center", gap: 5, padding: "20px 0 0" }} aria-hidden="true">
          {Array.from({ length: shown }, (_, k) => <span key={k} style={{ width: k === at ? 16 : 6, height: 6, borderRadius: 3, background: "var(--ink)", opacity: k === at ? 0.85 : 0.22, transition: "all .2s" }} />)}
        </div>
      )}
    </>
  );
}

export function CompactCard({ ev, dark, today, onOpen, label, when, walk }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} className="ev-flat" style={{ padding: "0 4px", display: "flex", gap: 12, width: "100%", opacity: 1, cursor: "pointer" }}>
      <div style={{ width: 96, flexShrink: 0, position: "relative" }}><Media ev={ev} dark={dark} height={112} radius={16} hideTitle /><PicOverlay ev={ev} size={28} /></div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {label ? <span className="tag tag-soon" style={{ alignSelf: "flex-start", height: 22 }}>{label}</span> : <span className="row ell" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}><CatBullet ev={ev} size={16} dark={dark} />{catLabel(ev)}</span>}
        <span className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.12 }}>{ev.title}</span>
        <Snippet ev={ev} lines={2} size={13} />
        <span className="row" style={{ gap: 8, fontSize: 13, minWidth: 0 }}>
          <span style={{ whiteSpace: "nowrap" }}><When text={when || whenLabel(ev, today)} plain />{ev.moreDates ? <span style={{ color: "var(--ink3)", fontWeight: 700 }}> · +{ev.moreDates} more {ev.moreDates > 1 ? "dates" : "date"}</span> : null}</span><span style={{ fontWeight: 400, color: "var(--ink3)" }}>{walk ? <span className="row" style={{ gap: 3, whiteSpace: "nowrap" }}><Icon name="walk" size={13} width={2.2} />{walk}</span> : <Travel tt={ev.tt} />}</span>
          <span style={{ marginLeft: "auto", flexShrink: 0 }}><CardActions ev={ev} size={28} noSave /></span>
        </span>
      </div>
    </div>
  );
}

// Home card (one style everywhere on Home): picture, category, title, one-line hook, when and how far, Free, actions
// Card helpers: the activity (most specific thing we know), a short time, the area, and travel minutes as 12′
export const actLabel = (ev) => { const l = (ev.act && ACT[ev.act]?.label) || ev.nsub || ev.sub || ev.ncat || ev.cat || ""; return l ? l[0].toUpperCase() + l.slice(1) : ""; };
export const areaLabel = (ev) => neighbourhoodOf(ev) || (ev.hood ? String(ev.hood).split(",")[0].trim() : "");
export const minsLabel = (ev) => (ev.tt?.mins != null ? Math.round(ev.tt.mins) + "\u2032" : "");
export const priceShort = (ev) => { if (isFree(ev)) return tx("Free"); const m = String(ev.price || "").match(/\$\s?\d+(\.\d+)?/); return m ? m[0].replace(/\s/g, "") : ""; };
export function TravelMini({ ev, size = 13 }) {
  if (ev.tt?.mins == null) return null;
  return <span className="row" style={{ gap: 2, color: "var(--ink3)", flexShrink: 0, whiteSpace: "nowrap" }}><Icon name={ev.tt.mode === "walk" ? "walk" : "train"} size={size} width={2.2} />{minsLabel(ev)}</span>;
}
export function shortWhen(ev, today) {
  // Runs show their next day and start time (never "until <date>"); a day whose session is already over skips to the next one
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const st = startMinutes(ev), now = nowMinutes();
  const multi = ev.X && ev.X > ev.E;
  let nx = multi ? nextOn(ev, t0) : null;
  let d = nx ? Math.round((nx - t0) / 86400000) : Math.max(0, daysUntil(ev, today));
  if (d === 0) {
    const w = eventWindow(ev), end = endMinutes(ev) ?? (st != null ? st + 120 : null);
    if (st != null && st <= now && (end ?? st + 120) > now) return tx("On now");
    if (st == null && multi && w.s <= now && w.e > now) return tx("On now");
    if (st != null && st > now) return fmtClock(st);
    if (st == null) return tx("Today");
    // today's session is over: next one
    if (multi) { nx = nextOn(ev, new Date(t0.getTime() + 86400000)); if (nx) d = Math.round((nx - t0) / 86400000); }
    if (d === 0) return fmtClock(st);
  }
  // a weekday name only within the coming week; further out, the date ("Thu Nov 26")
  const day = d === 1 ? tx("Tomorrow") : d < 7 ? new Date(t0.getTime() + d * 86400000).toLocaleDateString("en-US", { weekday: "long" }) : new Date(t0.getTime() + d * 86400000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
  return day + (st != null ? " " + fmtClock(st) : "");
}

// Large cards come alive with your thumb, never on their own: one shared scroll listener drives a small parallax on the
// picture, a slow zoom only on the card that is on screen, and a one-time fade-up of the text when it first appears
const lifeSet = new Map(); let lifeRaf = 0, lifeBound = false, lifeWin = null;
const lifeVis = (b) => { const r = b.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth; return Math.min(r.right, vw) - Math.max(r.left, 0) > r.width * 0.6 && r.bottom > vh * 0.15 && r.top < vh * 0.85 ? Math.hypot(r.left + r.width / 2 - vw / 2, r.top + r.height / 2 - vh / 2) : -1; };
const lifeKick = () => { if (!lifeRaf) lifeRaf = requestAnimationFrame(() => {
  lifeRaf = 0; lifeWin = null; let best = 1e9;
  lifeSet.forEach((ref) => { const b = ref.current; if (!b) return; const d = lifeVis(b); if (d >= 0 && d < best) { best = d; lifeWin = b; } });
  lifeSet.forEach((_, f) => f());
}); };
function lifeAdd(f, ref) {
  lifeSet.set(f, ref);
  if (!lifeBound) { lifeBound = true; window.addEventListener("scroll", lifeKick, { passive: true, capture: true }); window.addEventListener("resize", lifeKick); }
  lifeKick();
  return () => lifeSet.delete(f);
}
function useCardLife(boxRef, parRef, kbRef, txtRef) {
  useEffect(() => {
    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let entered = false;
    const f = () => {
      const b = boxRef.current; if (!b) return;
      const r = b.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
      const vis = Math.min(r.right, vw) - Math.max(r.left, 0) > r.width * 0.6 && r.bottom > vh * 0.15 && r.top < vh * 0.85;
      if (!reduce && parRef.current && r.bottom > 0 && r.top < vh) { const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh)); parRef.current.style.transform = "translate3d(0," + (t * -26).toFixed(1) + "px,0)"; }
      kbRef.current?.classList.toggle("on", vis && b === lifeWin && !reduce);
      if (vis && !entered) { entered = true; txtRef.current?.classList.add("on"); }
    };
    const off = lifeAdd(f, boxRef), t = setTimeout(() => txtRef.current?.classList.add("on"), 3000);
    return () => { off(); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
const hashStr = (x) => { let h = 0; for (const c of String(x)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
export function PosterCard({ ev, dark, today, onOpen, fluid, label }) {
  const seenRef = useSeen(ev);
  const boxRef = useRef(null), parRef = useRef(null), kbRef = useRef(null), txtRef = useRef(null);
  useCardLife(boxRef, parRef, kbRef, txtRef);
  const act = actLabel(ev), area = areaLabel(ev);
  if (fluid) {
    const line = [act, area].filter(Boolean).join(" · ");
    return (
      <div {...tap(onOpen, ev)} ref={seenRef} style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", cursor: "pointer", opacity: 1 }}>
        <div ref={boxRef} style={{ height: 262, borderRadius: 20, overflow: "hidden" }}><div ref={parRef} style={{ willChange: "transform" }}><div ref={kbRef} className="gp-kb" style={{ animationDelay: "-" + (hashStr(ev.id) % 12) + "s" }}><Media ev={ev} dark={dark} height={262} radius={20} hideTitle /></div></div></div>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,12,30,0) 22%, rgba(10,12,30,.78) 100%)" }} />
        <PicOverlay ev={ev} size={30} mood />
        <div ref={txtRef} className="gp-enter" style={{ position: "absolute", left: 14, right: 14, bottom: 12, color: "#fff", display: "flex", flexDirection: "column", gap: 4, textShadow: "0 1px 3px rgba(0,0,0,.45)" }}>
          {label && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.95 }}>{label}</span>}
          <span className="row" style={{ gap: 6, minWidth: 0 }}><CatBullet ev={ev} size={18} dark={dark} /><span className="ell" style={{ fontSize: 12.5, opacity: 0.92 }}>{line}</span></span>
          <span className="disp ell" style={{ fontSize: 20, lineHeight: 1.15, whiteSpace: "nowrap" }}>{ev.title}</span>
          {ev.desc && <span style={{ fontSize: 12, lineHeight: 1.35, opacity: 0.62, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.desc}</span>}
          <span className="row" style={{ justifyContent: "space-between", alignItems: "center", fontSize: 12.5, minWidth: 0 }}>
            <span className="row" style={{ gap: 6, opacity: 0.9, minWidth: 0, whiteSpace: "nowrap" }}>{shortWhen(ev, today) === tx("On now") && <span className="gp-pulse" aria-hidden="true" />}<span className="ell">{shortWhen(ev, today)}{priceShort(ev) ? " · " + priceShort(ev) : ""}</span>{ev.tt?.mins != null && <span className="row" style={{ gap: 2 }}>·&nbsp;<Icon name={ev.tt.mode === "walk" ? "walk" : "train"} size={12} width={2.2} />{minsLabel(ev)}</span>}</span>
            <span className="onpic" style={{ display: "flex", marginRight: -6 }}><CardActions ev={ev} size={24} noSave /></span>
          </span>
        </div>
      </div>
    );
  }
  const top = area && (act + " · " + area).length <= 24 ? act + " · " + area : act; // the area only when it fits
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} style={{ width: fluid ? "100%" : 168, minWidth: 0, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, color: "var(--ink)", cursor: "pointer", opacity: 1 }}>
      <div style={{ position: "relative" }}><Media ev={ev} dark={dark} height={fluid ? 200 : 140} radius={18} hideTitle /><PicOverlay ev={ev} size={30} /></div>
      <span className="row" style={{ gap: 5, minWidth: 0, height: 18, marginTop: 2 }}><CatBullet ev={ev} size={16} dark={dark} /><span className="ell" style={{ fontSize: 12, fontWeight: 400, color: "var(--ink2)" }}>{top}</span></span>
      <div className="disp ell" style={{ fontSize: fluid ? 18 : 15.5, lineHeight: 1.2, whiteSpace: "nowrap" }}>{ev.title}</div>
      <div className="row" style={{ gap: 6, fontSize: 12.5, minWidth: 0, justifyContent: "space-between", fontWeight: 400 }}>
        <span className="ell" style={{ minWidth: 0, color: "var(--ink3)" }}>{shortWhen(ev, today)}{priceShort(ev) ? " · " + priceShort(ev) : ""}</span>
        <TravelMini ev={ev} size={12} />
      </div>
      <div className="row" style={{ marginLeft: -6, height: 24 }}><CardActions ev={ev} size={24} noSave /></div>
    </div>
  );
}

// Compact plan card: square picture the size of the picks tiles, title, short time and area
export function MiniCard({ ev, dark, today, onOpen }) {
  const area = areaLabel(ev);
  return (
    <div {...tap(onOpen, ev)} style={{ width: "calc(100vw - 32px)", maxWidth: 420, flexShrink: 0, display: "flex", gap: 12, cursor: "pointer", color: "var(--ink)" }}>
      <div style={{ width: 76, height: 76, flexShrink: 0, position: "relative" }}><Media ev={ev} dark={dark} height={76} radius={16} hideTitle /></div>
      <div style={{ flex: 1, minWidth: 0, height: 76, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 5, minWidth: 0 }}><CatBullet ev={ev} size={15} dark={dark} /><span className="ell" style={{ fontSize: 12, color: "var(--ink2)" }}>{actLabel(ev)}</span></span>
        <span className="disp clamp2" style={{ fontSize: 15.5, lineHeight: 1.12 }}>{ev.title}</span>
        <span className="row" style={{ gap: 6, fontSize: 12.5, justifyContent: "space-between", minWidth: 0 }}><span className="ell" style={{ minWidth: 0 }}>{shortWhen(ev, today)}{area ? <span style={{ color: "var(--ink3)" }}>{" · " + area}</span> : null}</span><TravelMini ev={ev} size={12} /></span>
      </div>
    </div>
  );
}

export const ResultRow = CompactCard;

export function SectionHead({ title, n, color, icon, onMore }) {
  return (
    <div className="sec-h">
      {icon && <Icon name={icon} size={22} />}
      <h2>{title}</h2>
      {color && <svg width="56" height="14" viewBox="0 0 64 14" aria-hidden="true"><path d="M3 7c8-6 14 6 22 0s14-6 22 0 10 4 14 0" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" /></svg>}
      {n != null && !onMore && <span className="n">{n}</span>}
      {onMore && <button className="chip" onClick={onMore} style={{ marginLeft: "auto", height: 32, flexShrink: 0 }} aria-label={tx("See all: ") + title}>{tx("More")} <Icon name="chev" size={14} /></button>}
    </div>
  );
}

// ── Account entry point: the avatar shown top-right on every screen. Opens the account sheet (taste, lists, settings, admin).
export const AccountCtx = createContext({ account: null, open: () => {}, badge: 0 });
export function AccountButton({ size = 38 }) {
  const { account, open, badge } = useContext(AccountCtx);
  const g = account?.provider === "google";
  const initials = g ? String(account.name || account.email || "").trim().slice(0, 1).toUpperCase() : "";
  return (
    <button onClick={() => open()} aria-label={tx("Account and settings") + (badge ? " · " + badge + " " + tx("need attention") : "")}
      style={{ position: "relative", width: size, height: size, borderRadius: size / 2, border: "none", padding: 0, flexShrink: 0, background: "var(--chip)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
      {g && account.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover" }} />
        : initials ? <span style={{ fontWeight: 800, fontSize: size * 0.42 }}>{initials}</span> : <Icon name="me" size={size * 0.47} />}
      {badge > 0 && <span aria-hidden="true" style={{ position: "absolute", top: -1, right: -1, width: 11, height: 11, borderRadius: 6, background: "#F2611D", border: "2px solid var(--bg)" }} />}
    </button>
  );
}

export function LocationChip({ label }) {
  const { open } = useContext(AccountCtx);
  return (
    <button className="chip" onClick={() => open("location")} aria-label={tx("Location: ") + label + tx(". Change")} style={{ height: 28, fontSize: 12.5, gap: 4, padding: "0 10px" }}>
      <Icon name="pin" size={13} /> {label}
    </button>
  );
}

export function TabBar({ tab, setTab, plansCount }) {
  const night = new Date().getHours() >= 18;
  const items = [["today", night ? tx("Tonight") : tx("Today")], ["explore", tx("Explore")], ["map", tx("Map")], ["plans", tx("Plans")]];
  return (
    <nav className="tabbar" aria-label={tx("Main")}>
      {items.map(([k, l]) => (
        <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)} style={{ position: "relative" }}>
          <span className="tab-ic"><Icon name={k === "today" && night ? "moon" : k} size={22} width={tab === k ? 2.4 : 2.2} /></span>
          <span>{l}</span>
          {k === "plans" && plansCount > 0 && tab !== "plans" && <span style={{ position: "absolute", top: 2, right: "24%", minWidth: 16, height: 16, borderRadius: 8, background: "#F2611D", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{plansCount}</span>}
        </button>
      ))}
    </nav>
  );
}

export function Dialog({ title, onClose, children }) {
  // Portal to <body> so a dialog opened inside a sticky header still sits above the tab bar
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="disp" style={{ fontSize: 22 }}>{title}</span>
          <button onClick={onClose} aria-label={tx("Close")} style={{ marginLeft: "auto", border: "none", background: "var(--chip)", width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Leaflet map (loaded from unpkg once), category pins
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY || "";
let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L); s.onerror = reject;
    document.body.appendChild(s);
  });
  return leafletPromise;
}

export function LeafletMap({ events, home, dark, height, interactive = true, onPick, selectedId, zoom = 14, fit, rounded, twoFinger, hideHome, numbered, pinColor, numberOffset = 0 }) {
  const ref = useRef(null), mapRef = useRef(null), layerRef = useRef(null), tileRef = useRef(null), fitted = useRef(""), spread = useRef(null);
  const [err, setErr] = useState(null);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !ref.current || mapRef.current) return;
      const m = L.map(ref.current, { zoomControl: false, attributionControl: interactive, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: false }).setView(home, zoom);
      mapRef.current = m; layerRef.current = L.layerGroup().addTo(m);
      // Small map inside a scrolling page: one finger scrolls the page, two fingers move and zoom the map
      if (twoFinger && "ontouchstart" in window) {
        m.dragging.disable();
        let t = null;
        ref.current.addEventListener("touchmove", (e) => { if (e.touches.length === 1) { setHint(true); clearTimeout(t); t = setTimeout(() => setHint(false), 1300); } }, { passive: true });
      }
      setTimeout(() => m.invalidateSize(), 120);
      m.on("zoomend", () => drawRef.current && drawRef.current());
      // Tapping the map itself folds a spread-out stack back into its bubble
      m.on("click", () => { if (spread.current) { spread.current = null; drawRef.current && drawRef.current(); } });
      draw();
    }).catch(() => setErr(tx("Map could not load")));
    return () => { alive = false; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; tileRef.current = null; } };
    // eslint-disable-next-line
  }, []);
  const draw = () => {
    const L = window.L, m = mapRef.current; if (!L || !m) return;
    if (tileRef.current) m.removeLayer(tileRef.current);
    // CARTO raster tiles need a key since Sept 2026 (free up to 5M tiles/month). Without one, fall back to
    // OpenStreetMap tiles, darkened with a CSS filter in dark mode.
    tileRef.current = CARTO_KEY
      ? L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, { maxZoom: 19, attribution: "© OpenStreetMap © CARTO" }).addTo(m)
      : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap", className: dark ? "gp-tiles-dark" : "gp-tiles-light" }).addTo(m);
    layerRef.current.clearLayers();
    if (!hideHome) L.marker(home, { icon: L.divIcon({ className: "", html: '<div class="gp-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(layerRef.current);
    // Fit every shortlisted pin (home only when there are no pins); refit whenever the set of pins changes
    const fk = events.map((e) => e.id).join(",");
    if (fit && events.length && fitted.current !== fk) {
      m.invalidateSize();
      const pts = events.map((e) => e.coord).filter((c) => Array.isArray(c) && c.length === 2);
      if (pts.length === 1) m.setView(pts[0], 15); else if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [34, 34], maxZoom: 16 });
      fitted.current = fk;
      setTimeout(() => { try { m.invalidateSize(); if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [34, 34], maxZoom: 16 }); } catch { /* unmounted */ } }, 250);
    }
    // Clustering: pins closer than ~42px on screen merge into a count bubble; tapping it zooms to its pins
    // Pins that share (almost) the same spot can never separate by zooming: a tap on their bubble spreads them in a ring
    if (spread.current && !spread.current.every((id) => events.some((e) => e.id === id))) spread.current = null;
    const spreadSet = new Set(spread.current || []), fanned = events.filter((e) => spreadSet.has(e.id) && Array.isArray(e.coord));
    const groups = [];
    if (events.length > 6 && !numbered) {
      for (const ev of events) {
        if (spreadSet.has(ev.id)) continue;
        if (ev.id === selectedId || !Array.isArray(ev.coord)) { groups.push([ev]); continue; }
        const p = m.latLngToLayerPoint(ev.coord);
        const g = groups.find((g) => g.length && g[0].id !== selectedId && g.p && g.p.distanceTo(p) < 42);
        if (g) g.push(ev); else { const ng = [ev]; ng.p = p; groups.push(ng); }
      }
    }
    const singles = events.length > 6 && !numbered ? groups.filter((g) => g.length === 1).map((g) => g[0]) : events.filter((e) => !spreadSet.has(e.id));
    const pos = new Map();
    if (fanned.length) {
      const c = m.latLngToLayerPoint([fanned.reduce((a, e) => a + e.coord[0], 0) / fanned.length, fanned.reduce((a, e) => a + e.coord[1], 0) / fanned.length]);
      const r = Math.max(46, (fanned.length * 42) / (2 * Math.PI)), cLL = m.layerPointToLatLng(c);
      fanned.forEach((ev, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / fanned.length, ll = m.layerPointToLatLng(L.point(c.x + r * Math.cos(a), c.y + r * Math.sin(a)));
        pos.set(ev.id, ll);
        L.polyline([cLL, ll], { color: dark ? "#FBF7EF" : "#1B1F3B", weight: 1.5, opacity: 0.5, interactive: false }).addTo(layerRef.current);
      });
      singles.push(...fanned);
    }
    groups.filter((g) => g.length > 1).forEach((g) => {
      const lat = g.reduce((a, e) => a + e.coord[0], 0) / g.length, lon = g.reduce((a, e) => a + e.coord[1], 0) / g.length, sz = g.length > 20 ? 50 : g.length > 8 ? 44 : 38;
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${dark ? "#FBF7EF" : "#1B1F3B"};color:${dark ? "#1B1F3B" : "#fff"};font-weight:800;font-size:${sz > 40 ? 15 : 14}px;border:3px solid ${dark ? "#1B1F3B" : "#fff"}">${g.length}</div>`;
      const mk = L.marker([lat, lon], { icon: L.divIcon({ className: "", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
      mk.on("click", () => {
        // Would these pins still overlap at the closest zoom? Then spread them instead of zooming
        const pts = g.map((e) => m.project(e.coord, 17)), far = Math.max(...pts.map((p) => Math.max(...pts.map((q) => p.distanceTo(q)))));
        if (far < 42) { spread.current = g.map((e) => e.id); if (m.getZoom() < 16) m.setView([lat, lon], 16); else draw(); return; }
        m.fitBounds(L.latLngBounds(g.map((e) => e.coord)), { padding: [40, 40], maxZoom: 17 });
      });
      mk.addTo(layerRef.current);
    });
    singles.forEach((ev) => {
      const c = (pinColor && pinColor(ev)) || evColor(ev, dark), sel = ev.id === selectedId, sz = numbered ? (sel ? 34 : 28) : sel ? 44 : 34;
      const inner = numbered ? `<span style="color:#fff;font-weight:800;font-size:${sel ? 15 : 13}px">${numberOffset + events.indexOf(ev) + 1}</span>` : lIconString(evNode(ev), sel ? 20 : 16);
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${c};${sel ? "box-shadow:0 0 0 3px " + (dark ? "#FBF7EF" : "#1B1F3B") : ""}">${inner}</div>`;
      const mk = L.marker(pos.get(ev.id) || ev.coord, { icon: L.divIcon({ className: "", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }), interactive: !!onPick, zIndexOffset: pos.has(ev.id) ? 1000 : 0 });
      if (onPick) mk.on("click", () => onPick(ev));
      mk.addTo(layerRef.current);
    });
  };
  const drawRef = useRef(null); drawRef.current = draw;
  useEffect(() => { draw(); }); // redraw on every render (cheap: few dozen markers)
  useEffect(() => { if (mapRef.current && !fit) mapRef.current.setView(home, mapRef.current.getZoom()); }, [home[0], home[1]]);
  return (
    <div style={{ position: "relative", isolation: "isolate", height, borderRadius: rounded ? 22 : interactive ? 0 : 20, overflow: "hidden", background: "var(--mapbg)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      {hint && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,24,51,.45)", color: "#fff", fontWeight: 800, fontSize: 15, pointerEvents: "none" }}>{tx("Use two fingers to move the map")}</div>}
      {err && <div className="muted" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{err}</div>}
    </div>
  );
}


// Quick tile: small rectangle for Tonight, Tomorrow, This weekend, This week
export function QuickTile({ t }) {
  return (
    <button onClick={t.open} style={{ border: "none", borderRadius: 16, padding: "8px 11px", height: 62, background: t.color, color: "#fff", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2, minWidth: 0 }}>
      <span className="disp" style={{ fontSize: 14.5, lineHeight: 1.05 }}>{t.title}</span>
      <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}>{t.n} {t.n > 1 ? "events" : "event"}</span>
    </button>
  );
}

// Mood / Pick tile: colour, icon, title, a teaser saying what drives the list, a count, and a heart (bottom right) that adds it to My Interests
// Bells (notify me about new events): provided by App, read by interest tiles
export const NotifyCtx = React.createContext(null);

export function MoodTile({ t, compact, fb = 0, fav = false, onFav }) {
  const act = (fn) => (e) => { e.stopPropagation(); fn(); };
  const nc = useContext(NotifyCtx), belled = !!nc?.bells?.[t.key];
  return (
    <div role="button" tabIndex={0} onClick={t.open} onKeyDown={(e) => { if (e.key === "Enter") t.open(); }}
      style={{ width: compact ? 168 : undefined, flexShrink: compact ? 0 : undefined, borderRadius: 20, padding: "14px 14px 8px 14px", background: t.color, color: "#fff", textAlign: "left", minHeight: 132, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, position: "relative", overflow: "hidden", cursor: "pointer", opacity: fb === -1 ? 0.5 : 1 }}>
      <span style={{ position: "absolute", right: -8, bottom: -10, opacity: 0.22 }} aria-hidden="true">
        {t.node ? <LIcon node={t.node} size={64} color="#fff" stroke={1.8} /> : t.icon ? React.createElement(t.icon, { size: 64, strokeWidth: 1.8 }) : null}
      </span>
        <span className="row" style={{ gap: 6, position: "absolute", top: 8, right: 8 }}>
        {onFav && fav && nc && <button aria-label={belled ? tx("Stop notifications for ") + t.title : tx("Notify me about new ") + t.title} aria-pressed={belled} onClick={act(() => nc.toggle(t))} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: belled ? "rgba(255,255,255,.95)" : "rgba(0,0,0,.18)", color: belled ? t.color || "#1B1F3B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><Icon name="bell" size={18} fill={belled ? "currentColor" : "none"} /></button>}
        {onFav && <button aria-label={fav ? tx("Remove from My Interests") : tx("Add to My Interests")} aria-pressed={fav} onClick={act(() => onFav(t))} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: fav ? "rgba(255,255,255,.95)" : "rgba(0,0,0,.18)", color: fav ? t.color || "#E11D48" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><Icon name="heart" size={19} fill={fav ? "currentColor" : "none"} /></button>}
        </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {t.verb && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.85 }}>{t.verb}</span>}
        <span className="disp" style={{ fontSize: 18, lineHeight: 1.08, maxWidth: onFav ? "74%" : "86%" }}>{t.title}</span>

        {t.teaser && <span style={{ fontSize: 12.5, lineHeight: 1.3, opacity: 0.88, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.teaser}</span>}
      </span>
      <span className="row" style={{ justifyContent: "space-between", minHeight: 30 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, opacity: 0.85 }}>{t.n} {t.n > 1 ? "events" : "event"}</span>
      </span>
    </div>
  );
}

// One square carousel layout everywhere: picture on top; category, title, blurb, when and distance, thumbs below
export const SquareCard = PosterCard;


// A line of text that slides left and back when it is wider than its box (so a long title can be read in full)
export function Marquee({ children, style }) {
  const outer = useRef(null), inner = useRef(null);
  const [d, setD] = useState(0);
  useEffect(() => {
    const m = () => { const o = outer.current, n = inner.current; if (o && n) setD(Math.max(0, Math.ceil(n.scrollWidth - o.clientWidth))); };
    m(); const t = setTimeout(m, 300); window.addEventListener("resize", m);
    return () => { clearTimeout(t); window.removeEventListener("resize", m); };
  }, [children]);
  return (
    <span ref={outer} style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap", minWidth: 0, flex: 1, ...style }}>
      <span ref={inner} className={d > 4 ? "gp-marq" : undefined} style={{ display: "inline-block", "--mq": "-" + d + "px", animationDuration: Math.max(6, d / 14 + 4) + "s" }}>{children}</span>
    </span>
  );
}
