import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph, Icon, glyphSvgString } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { evColor, evNode, LIcon, lIconString } from "./taxonomy.js";
import { whenLabel, isFree, weatherBadge, startMinutes, endMinutes, nowMinutes, fmtClock } from "./engine.js";
import { ACT } from "./activities.js";
import { daysUntil } from "../lib/core.js";
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
  if (isFree(ev)) return <span className="tag tag-free">Free</span>;
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

// Thumbs up / down / save on every card. Clicks don't open the card.
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
      <button aria-label="More like this" aria-pressed={t === 1} style={btn(t === 1, true)} onClick={stop(() => { if (t === 1) a.onReact(ev, "undo"); else { a.onReact(ev, "up", null, true); a.askWhy(ev, "up"); } })}><Icon name="up" size={is} /></button>
      <button aria-label="Less like this" aria-pressed={t === -1} style={btn(t === -1, true)} onClick={stop(() => { if (onNfm) return onNfm(ev); if (t === -1) a.onReact(ev, "undo"); else { a.onReact(ev, "down", null, true); a.askWhy(ev, "down"); } })}><Icon name="down" size={is} /></button>
      {!noSave && <button aria-label={saved ? "Remove from plans" : "Save to plans"} aria-pressed={saved} style={{ ...btn(saved), width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, border: saved ? "none" : "2px solid var(--ink)", background: saved ? "var(--navy)" : "transparent" }} onClick={stop(() => a.onSave(ev))}><Icon name="save" size={is + 2} fill={saved ? "currentColor" : "none"} /></button>}
    </div>
  );
}

// Save button and price sit on the picture itself
export function PicOverlay({ ev, size = 36 }) {
  const a = useContext(ActionsCtx);
  const saved = a.isSaved(ev.id);
  const free = isFree(ev);
  const p = (ev.price || "").split("/")[0].trim();
  const real = free || /\$\s?\d|\d\s?(usd|\$)/i.test(p);
  return (
    <>
      <button aria-label={saved ? "Remove from plans" : "Save to plans"} aria-pressed={saved} onClick={(e) => { e.stopPropagation(); a.onSave(ev); }}
        style={{ position: "absolute", top: 8, right: 8, width: size, height: size, borderRadius: size / 2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: saved ? "var(--navy)" : "rgba(255,255,255,.92)", color: saved ? "var(--onnavy)" : "#1B1F3B", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }}>
        <Icon name="save" size={Math.round(size * 0.52)} fill={saved ? "currentColor" : "none"} />
      </button>
      {real && <span className={"tag " + (free ? "tag-free" : "tag-white")} style={{ position: "absolute", left: 8, bottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}>{free ? "Free" : (p.length > 14 ? p.slice(0, 13) + "…" : p)}</span>}
      {ev.busy && <span className="tag tag-warn" style={{ position: "absolute", left: 8, top: 8 }}>Clash</span>}
    </>
  );
}

// Real picture when one is found (poster, then venue), else a typographic poster in the category colour
export function Media({ ev, dark, height, radius = 18, big, hideTitle, credit }) {
  const img = useEventImage(ev);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [img?.src]);
  const c = evColor(ev, dark);
  if (img?.src && !broken) {
    return (
      <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden", background: "var(--media)" }}>
        <img src={img.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => { setBroken(true); dropImage(ev.id); }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {credit && img.credit && <span style={{ position: "absolute", left: 12, bottom: 8, fontSize: 10, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{img.credit}</span>}
      </div>
    );
  }
  return (
    <div style={{ height, borderRadius: radius, background: c, color: "#fff", padding: big ? 18 : 12, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
      {hideTitle ? <div style={{ margin: "auto", opacity: 0.9 }}><LIcon node={evNode(ev)} size={Math.min(96, Math.round((typeof height === "number" ? height : 200) * 0.42))} color="#fff" stroke={1.8} /></div> : <LIcon node={evNode(ev)} size={big ? 46 : 30} color="#fff" stroke={2} />}
      {!hideTitle && <span className="disp clamp2" style={{ fontSize: big ? 28 : 18, lineHeight: 1, letterSpacing: -0.3 }}>{ev.title}</span>}
    </div>
  );
}

export function Flags({ ev }) {
  return (
    <>
      {ev.busy && <span className="tag tag-warn">Clashes with your calendar</span>}
      {ev.recurring && <span className="tag tag-plain">{(ev.recLabel || "Recurring").split(" · ")[0]}</span>}
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
const tap = (fn, ev) => ({ role: "button", tabIndex: 0, onClick: () => fn(ev), onKeyDown: (e) => { if (e.key === "Enter") fn(ev); } });

export function HeroCard({ ev, dark, today, onOpen, label }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} className="ev-flat" style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 10, width: "100%", opacity: ev.busy ? 0.6 : 1, cursor: "pointer" }}>
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
export function DotScroll({ children, className = "hscroll", style, onMore }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const n = React.Children.count(children);
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
  };
  const shown = Math.min(n, 7), at = n > 1 ? Math.round((i / (n - 1)) * (shown - 1)) : 0;
  return (
    <>
      <div ref={ref} className={className} style={style} onScroll={onScroll}>{children}</div>
      {n > 1 && (
        <div className="row" style={{ justifyContent: "center", gap: 5, padding: "20px 0 0" }} aria-hidden="true">
          {Array.from({ length: shown }, (_, k) => <span key={k} style={{ width: k === at ? 16 : 6, height: 6, borderRadius: 3, background: "var(--ink)", opacity: k === at ? 0.85 : 0.22, transition: "all .2s" }} />)}
        </div>
      )}
    </>
  );
}

export function CompactCard({ ev, dark, today, onOpen, label, when }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} className="ev-flat" style={{ padding: "0 4px", display: "flex", gap: 12, width: "100%", opacity: ev.busy ? 0.6 : 1, cursor: "pointer" }}>
      <div style={{ width: 96, flexShrink: 0, position: "relative" }}><Media ev={ev} dark={dark} height={112} radius={16} hideTitle /><PicOverlay ev={ev} size={28} /></div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {label ? <span className="tag tag-soon" style={{ alignSelf: "flex-start", height: 22 }}>{label}</span> : <span className="row ell" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}><CatBullet ev={ev} size={16} dark={dark} />{catLabel(ev)}</span>}
        <span className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.12 }}>{ev.title}</span>

        <span className="row" style={{ gap: 8, fontSize: 13, minWidth: 0 }}>
          <span style={{ whiteSpace: "nowrap" }}><When text={when || whenLabel(ev, today)} plain />{ev.moreDates ? <span style={{ color: "var(--ink3)", fontWeight: 700 }}> · +{ev.moreDates} more {ev.moreDates > 1 ? "dates" : "date"}</span> : null}</span><span style={{ fontWeight: 400, color: "var(--ink3)" }}><Travel tt={ev.tt} /></span>
        </span>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 2 }}><CardActions ev={ev} size={28} noSave /></div>
      </div>
    </div>
  );
}

// Home card (one style everywhere on Home): picture, category, title, one-line hook, when and how far, Free, actions
// Card helpers: the activity (most specific thing we know), a short time, the area, and travel minutes as 12′
export const actLabel = (ev) => { const l = (ev.act && ACT[ev.act]?.label) || ev.nsub || ev.sub || ev.ncat || ev.cat || ""; return l ? l[0].toUpperCase() + l.slice(1) : ""; };
export const areaLabel = (ev) => neighbourhoodOf(ev) || (ev.hood ? String(ev.hood).split(",")[0].trim() : "");
export const minsLabel = (ev) => (ev.tt?.mins != null ? Math.round(ev.tt.mins) + "\u2032" : "");
export function TravelMini({ ev, size = 13 }) {
  if (ev.tt?.mins == null) return null;
  return <span className="row" style={{ gap: 2, color: "var(--ink3)", flexShrink: 0, whiteSpace: "nowrap" }}><Icon name={ev.tt.mode === "walk" ? "walk" : "train"} size={size} width={2.2} />{minsLabel(ev)}</span>;
}
export function shortWhen(ev, today) {
  const d = Math.max(0, daysUntil(ev, today)), st = startMinutes(ev), now = nowMinutes();
  const multi = ev.X && ev.X > ev.E;
  if (d === 0) {
    if (st != null && st <= now && ((endMinutes(ev) ?? st + 120) > now)) return "On now";
    if (st != null) return fmtClock(st);
    return multi ? "Until " + new Date(ev.X + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today";
  }
  const day = d === 1 ? "Tomorrow" : new Date(today.getTime() + d * 86400000).toLocaleDateString("en-US", { weekday: "long" });
  return day + (st != null ? " " + fmtClock(st) : "");
}

export function PosterCard({ ev, dark, today, onOpen }) {
  const seenRef = useSeen(ev);
  const act = actLabel(ev), area = areaLabel(ev);
  const top = area && (act + " · " + area).length <= 24 ? act + " · " + area : act; // the area only when it fits
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, color: "var(--ink)", cursor: "pointer", opacity: ev.busy ? 0.6 : 1 }}>
      <div style={{ position: "relative" }}><Media ev={ev} dark={dark} height={140} radius={18} hideTitle /><PicOverlay ev={ev} size={30} /></div>
      <span className="row" style={{ gap: 5, minWidth: 0, height: 18, marginTop: 2 }}><CatBullet ev={ev} size={16} dark={dark} /><span className="ell" style={{ fontSize: 12, fontWeight: 500, color: "var(--ink2)" }}>{top}</span></span>
      <div className="disp ell" style={{ fontSize: 15.5, lineHeight: 1.2, whiteSpace: "nowrap" }}>{ev.title}</div>
      <div className="row" style={{ gap: 6, fontSize: 12.5, minWidth: 0, justifyContent: "space-between", fontWeight: 400 }}>
        <span className="ell" style={{ minWidth: 0 }}>{shortWhen(ev, today)}</span>
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
      {onMore && <button className="chip" onClick={onMore} style={{ marginLeft: "auto", height: 32, flexShrink: 0 }} aria-label={"See all: " + title}>More <Icon name="chev" size={14} /></button>}
    </div>
  );
}

export function TabBar({ tab, setTab, plansCount }) {
  const items = [["today", new Date().getHours() >= 18 ? "Tonight" : "Today"], ["explore", "Explore"], ["map", "Map"], ["plans", "Plans"], ["me", "Me"]];
  return (
    <nav className="tabbar" aria-label="Main">
      {items.map(([k, l]) => (
        <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)} style={{ position: "relative" }}>
          <span className="tab-ic"><Icon name={k} size={22} width={tab === k ? 2.4 : 2.2} /></span>
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
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", border: "none", background: "var(--chip)", width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={18} /></button>
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

export function LeafletMap({ events, home, dark, height, interactive = true, onPick, selectedId, zoom = 14, fit, rounded, twoFinger, hideHome, numbered, pinColor }) {
  const ref = useRef(null), mapRef = useRef(null), layerRef = useRef(null), tileRef = useRef(null), fitted = useRef("");
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
      draw();
    }).catch(() => setErr("Map could not load"));
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
    const groups = [];
    if (events.length > 6 && !numbered) {
      for (const ev of events) {
        if (ev.id === selectedId || !Array.isArray(ev.coord)) { groups.push([ev]); continue; }
        const p = m.latLngToLayerPoint(ev.coord);
        const g = groups.find((g) => g.length && g[0].id !== selectedId && g.p && g.p.distanceTo(p) < 42);
        if (g) g.push(ev); else { const ng = [ev]; ng.p = p; groups.push(ng); }
      }
    }
    const singles = events.length > 6 && !numbered ? groups.filter((g) => g.length === 1).map((g) => g[0]) : events;
    groups.filter((g) => g.length > 1).forEach((g) => {
      const lat = g.reduce((a, e) => a + e.coord[0], 0) / g.length, lon = g.reduce((a, e) => a + e.coord[1], 0) / g.length, sz = g.length > 20 ? 50 : g.length > 8 ? 44 : 38;
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${dark ? "#FBF7EF" : "#1B1F3B"};color:${dark ? "#1B1F3B" : "#fff"};font-weight:800;font-size:${sz > 40 ? 15 : 14}px;border:3px solid ${dark ? "#1B1F3B" : "#fff"}">${g.length}</div>`;
      const mk = L.marker([lat, lon], { icon: L.divIcon({ className: "", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
      mk.on("click", () => m.fitBounds(L.latLngBounds(g.map((e) => e.coord)), { padding: [40, 40], maxZoom: 17 }));
      mk.addTo(layerRef.current);
    });
    singles.forEach((ev) => {
      const c = (pinColor && pinColor(ev)) || evColor(ev, dark), sel = ev.id === selectedId, sz = numbered ? (sel ? 34 : 28) : sel ? 44 : 34;
      const inner = numbered ? `<span style="color:#fff;font-weight:800;font-size:${sel ? 15 : 13}px">${events.indexOf(ev) + 1}</span>` : lIconString(evNode(ev), sel ? 20 : 16);
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${c};${sel ? "box-shadow:0 0 0 3px " + (dark ? "#FBF7EF" : "#1B1F3B") : ""}">${inner}</div>`;
      const mk = L.marker(ev.coord, { icon: L.divIcon({ className: "", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }), interactive: !!onPick });
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
      {hint && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,24,51,.45)", color: "#fff", fontWeight: 800, fontSize: 15, pointerEvents: "none" }}>Use two fingers to move the map</div>}
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

// Mood / Pick tile: colour, icon, title, a teaser saying what drives the list, a count, and thumbs + heart so the app learns
export function MoodTile({ t, compact, fb = 0, fav = false, onFb, onFav }) {
  const act = (fn) => (e) => { e.stopPropagation(); fn(); };
  const ib = (on) => ({ width: 30, height: 30, borderRadius: 15, border: "none", background: "transparent", color: "#fff", opacity: on ? 1 : 0.55, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 });
  return (
    <div role="button" tabIndex={0} onClick={t.open} onKeyDown={(e) => { if (e.key === "Enter") t.open(); }}
      style={{ width: compact ? 168 : undefined, flexShrink: compact ? 0 : undefined, borderRadius: 20, padding: "14px 14px 8px 14px", background: t.color, color: "#fff", textAlign: "left", minHeight: 132, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, position: "relative", overflow: "hidden", cursor: "pointer", opacity: fb === -1 ? 0.5 : 1 }}>
      <span style={{ position: "absolute", right: -6, top: -6, opacity: 0.22 }} aria-hidden="true">
        {t.node ? <LIcon node={t.node} size={64} color="#fff" stroke={1.8} /> : t.icon ? React.createElement(t.icon, { size: 64, strokeWidth: 1.8 }) : null}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {t.verb && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.85 }}>{t.verb}</span>}
        <span className="disp" style={{ fontSize: 18, lineHeight: 1.08, maxWidth: "86%" }}>{t.title}</span>
        {/^(Because|You both|Something different)/.test(t.why || "") && <span className="ell" style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.3, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,.2)", alignSelf: "flex-start", maxWidth: "100%" }}>{t.why}</span>}
        {t.teaser && <span style={{ fontSize: 12.5, lineHeight: 1.3, opacity: 0.88, display: "-webkit-box", WebkitLineClamp: /^(Because|You both|Something different)/.test(t.why || "") ? 1 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.teaser}</span>}
      </span>
      <span className="row" style={{ justifyContent: "space-between", minHeight: 30 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, opacity: 0.85 }}>{t.n} {t.n > 1 ? "events" : "event"}</span>
        {onFb && (
          <span className="row" style={{ gap: 0, marginRight: -6 }}>
            <button aria-label="More like this" aria-pressed={fb === 1} style={ib(fb === 1)} onClick={act(() => onFb(t, 1))}><Icon name="up" size={16} /></button>
            <button aria-label="Less like this" aria-pressed={fb === -1} style={ib(fb === -1)} onClick={act(() => onFb(t, -1))}><Icon name="down" size={16} /></button>
            {onFav && <button aria-label={fav ? "Remove from your moods" : "Add to your moods"} aria-pressed={fav} style={ib(fav)} onClick={act(() => onFav(t))}><Icon name="heart" size={17} fill={fav ? "currentColor" : "none"} /></button>}
          </span>
        )}
      </span>
    </div>
  );
}

// One square carousel layout everywhere: picture on top; category, title, blurb, when and distance, thumbs below
export const SquareCard = PosterCard;
