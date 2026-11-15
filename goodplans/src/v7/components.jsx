import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph, Icon, glyphSvgString } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { evColor, evNode, LIcon, lIconString } from "./taxonomy.js";
import { whenLabel, isFree, weatherBadge } from "./engine.js";
import { useEventImage, dropImage } from "./images.js";

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
export function Snippet({ ev, lines = 2, size = 13.5 }) {
  const d = (ev.desc || "").replace(/\s+/g, " ").trim();
  if (!d || d.toLowerCase() === (ev.title || "").toLowerCase()) return null;
  return <div style={{ fontSize: size, lineHeight: 1.35, color: "var(--ink3)", opacity: 0.7, display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d}</div>;
}

export function WeatherTag({ ev, compact }) {
  const b = weatherBadge(ev);
  if (!b) return null;
  return <span className={"tag tag-" + b.tone} style={{ gap: 4, flexShrink: 0 }} title={b.text}><Icon name={b.icon} size={13} width={2.4} />{compact ? b.text.split(" · ")[0] : b.text}</span>;
}

// Thumbs up / down / save on every card. Clicks don't open the card.
export function CardActions({ ev, size = 34, onNfm }) {
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
      <button aria-label={saved ? "Remove from plans" : "Save to plans"} aria-pressed={saved} style={btn(saved)} onClick={stop(() => a.onSave(ev))}><Icon name="save" size={is} fill={saved ? "currentColor" : "none"} /></button>
    </div>
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
        {label && <span className="tag tag-white" style={{ position: "absolute", top: 10, left: 10 }}>{label}</span>}
      </div>
      <div style={{ padding: "0 6px 4px", display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
        <div className="row" style={{ gap: 8 }}>
          <CatBullet ev={ev} size={26} dark={dark} />
          <span className="ell" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{catLabel(ev)}</span>
        </div>
        <div className="disp clamp2" style={{ fontSize: 23, lineHeight: 1.1 }}>{ev.title}</div>
        <Snippet ev={ev} />
        <div className="row" style={{ gap: 10, fontSize: 14, fontWeight: 800 }}>
          <span>{whenLabel(ev, today)}</span><Travel tt={ev.tt} size={14} /><Venue ev={ev} />
          <Keywords ev={ev} max={4} oneLine />
          <span style={{ marginLeft: "auto", flexShrink: 0 }}><PriceTag ev={ev} /></span>
        </div>
        <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}><Flags ev={ev} /></div>
          <CardActions ev={ev} />
        </div>
      </div>
    </div>
  );
}

export function CompactCard({ ev, dark, today, onOpen, label, when }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} className="ev-flat" style={{ padding: "0 4px", display: "flex", gap: 12, width: "100%", opacity: ev.busy ? 0.6 : 1, cursor: "pointer" }}>
      <div style={{ width: 84, flexShrink: 0 }}><Media ev={ev} dark={dark} height={104} radius={16} hideTitle /></div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {label ? <span className="tag tag-soon" style={{ alignSelf: "flex-start", height: 22 }}>{label}</span> : <span className="row ell" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}><CatBullet ev={ev} size={16} dark={dark} />{catLabel(ev)}</span>}
        <span className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.12 }}>{ev.title}</span>
        <Snippet ev={ev} lines={2} size={12.5} />
        <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700, minWidth: 0 }}>
          <span style={{ whiteSpace: "nowrap" }}>{when || whenLabel(ev, today)}{ev.moreDates ? <span style={{ color: "var(--ink3)", fontWeight: 700 }}> · +{ev.moreDates} more {ev.moreDates > 1 ? "dates" : "date"}</span> : null}</span><Travel tt={ev.tt} /><Venue ev={ev} />
        </span>
        <div className="row" style={{ gap: 6, justifyContent: "space-between", marginTop: 2, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, minWidth: 0, flex: 1, overflow: "hidden" }}><PriceTag ev={ev} />{ev.busy ? <span className="tag tag-warn">Clash</span> : <WeatherTag ev={ev} compact />}<Keywords ev={ev} max={3} oneLine /></div>
          <CardActions ev={ev} size={30} />
        </div>
      </div>
    </div>
  );
}

export function PosterCard({ ev, dark, today, onOpen }) {
  const seenRef = useSeen(ev);
  return (
    <div {...tap(onOpen, ev)} ref={seenRef} style={{ width: 176, flexShrink: 0, display: "flex", flexDirection: "column", gap: 7, color: "var(--ink)", cursor: "pointer" }}>
      <Media ev={ev} dark={dark} height={200} radius={24} hideTitle />
      <div className="row" style={{ gap: 6 }}><CatBullet ev={ev} size={18} dark={dark} /><span className="ell muted" style={{ fontSize: 12, fontWeight: 700 }}>{catLabel(ev)}</span></div>
      <div className="disp clamp2" style={{ fontSize: 16, lineHeight: 1.12 }}>{ev.title}</div>
      <Snippet ev={ev} lines={2} size={12.5} />
      <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 800 }}><span className="ell">{whenLabel(ev, today)}</span><Travel tt={ev.tt} muted /></div>
      <div className="ell muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: -4 }}>{(ev.venue || "").split(",")[0]}</div>
      <div className="row" style={{ gap: 6, minWidth: 0 }}><PriceTag ev={ev} /><Keywords ev={ev} max={2} oneLine /></div>
      <WeatherTag ev={ev} />
      <CardActions ev={ev} size={30} />
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
  const items = [["today", "Today"], ["explore", "Explore"], ["map", "Map"], ["plans", "Plans"], ["me", "Me"]];
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

export function LeafletMap({ events, home, dark, height, interactive = true, onPick, selectedId, zoom = 14 }) {
  const ref = useRef(null), mapRef = useRef(null), layerRef = useRef(null), tileRef = useRef(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !ref.current || mapRef.current) return;
      const m = L.map(ref.current, { zoomControl: false, attributionControl: interactive, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: false, keyboard: false }).setView(home, zoom);
      mapRef.current = m; layerRef.current = L.layerGroup().addTo(m);
      setTimeout(() => m.invalidateSize(), 120);
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
    L.marker(home, { icon: L.divIcon({ className: "", html: '<div class="gp-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(layerRef.current);
    events.forEach((ev) => {
      const c = evColor(ev, dark), sel = ev.id === selectedId, sz = sel ? 44 : 34;
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${c};${sel ? "box-shadow:0 0 0 3px " + (dark ? "#FBF7EF" : "#1B1F3B") : ""}">${lIconString(evNode(ev), sel ? 20 : 16)}</div>`;
      const mk = L.marker(ev.coord, { icon: L.divIcon({ className: "", html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }), interactive: !!onPick });
      if (onPick) mk.on("click", () => onPick(ev));
      mk.addTo(layerRef.current);
    });
  };
  useEffect(() => { draw(); }); // redraw on every render (cheap: few dozen markers)
  useEffect(() => { if (mapRef.current) mapRef.current.setView(home, mapRef.current.getZoom()); }, [home[0], home[1]]);
  return (
    <div style={{ position: "relative", height, borderRadius: interactive ? 0 : 20, overflow: "hidden", background: "var(--mapbg)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      {err && <div className="muted" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{err}</div>}
    </div>
  );
}
