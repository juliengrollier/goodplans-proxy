import React, { useEffect, useRef, useState } from "react";
import { Glyph, Icon, glyphSvgString } from "./icons.jsx";
import { catColor, catIcon } from "./theme.js";
import { whenLabel, travelLabel, isFree } from "./engine.js";

export function CatBullet({ cat, size = 30, dark }) {
  const c = catColor(cat, dark);
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: c, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Glyph name={catIcon(cat)} size={Math.round(size * 0.56)} color={c} />
    </span>
  );
}

export function PriceTag({ ev }) {
  if (isFree(ev)) return <span className="tag tag-free">Free</span>;
  const p = (ev.price || "").split("/")[0].trim();
  return p ? <span className="tag tag-plain">{p.length > 14 ? p.slice(0, 13) + "…" : p}</span> : null;
}

// Photo if the feed has one, else a typographic poster in the category colour
export function Media({ ev, dark, height, radius = 18, big, hideTitle }) {
  const [broken, setBroken] = useState(false);
  const c = catColor(ev.cat, dark);
  if (ev.image && !broken) {
    return <img src={ev.image} alt="" loading="lazy" onError={() => setBroken(true)} style={{ width: "100%", height, objectFit: "cover", borderRadius: radius, display: "block", background: "var(--media)" }} />;
  }
  return (
    <div style={{ height, borderRadius: radius, background: c, color: "#fff", padding: big ? 18 : 12, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
      {hideTitle ? <div style={{ margin: "auto", opacity: 0.9 }}><Glyph name={catIcon(ev.cat)} size={96} color={c} /></div> : <Glyph name={catIcon(ev.cat)} size={big ? 46 : 36} color={c} />}
      {!hideTitle && <span className="disp clamp2" style={{ fontSize: big ? 28 : 21, lineHeight: 1, letterSpacing: -0.3 }}>{ev.title}</span>}
    </div>
  );
}

export function Flags({ ev }) {
  return (
    <>
      {ev.busy && <span className="tag tag-warn">Clashes with your calendar</span>}
      {ev.rain && <span className="tag tag-warn">Rain likely</span>}
      {ev.dark && !ev.rain && <span className="tag tag-plain">Ends after dark</span>}
    </>
  );
}

export function HeroCard({ ev, dark, today, onOpen, label }) {
  return (
    <button onClick={() => onOpen(ev)} className="card" style={{ border: "none", textAlign: "left", padding: 10, display: "flex", flexDirection: "column", gap: 10, width: "100%", opacity: ev.busy ? 0.55 : 1 }}>
      <div style={{ position: "relative" }}>
        <Media ev={ev} dark={dark} height={160} big />
        {label && <span className="tag tag-white" style={{ position: "absolute", top: 10, left: 10 }}>{label}</span>}
      </div>
      <div style={{ padding: "0 6px 6px", display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        <div className="row" style={{ gap: 8 }}>
          <CatBullet cat={ev.cat} size={26} dark={dark} />
          <span className="ell" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{(ev.venue || "").split(",")[0]}</span>
        </div>
        <div className="disp clamp2" style={{ fontSize: 23, lineHeight: 1.1 }}>{ev.title}</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{whenLabel(ev, today)} · {travelLabel(ev.tt)}</span>
          <span style={{ marginLeft: "auto" }}><PriceTag ev={ev} /></span>
        </div>
        {ev.why?.length > 0 && <div className="muted" style={{ fontSize: 13 }}>{ev.why.slice(0, 3).join(" · ")}</div>}
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}><Flags ev={ev} /></div>
      </div>
    </button>
  );
}

export function CompactCard({ ev, dark, today, onOpen, label }) {
  const c = catColor(ev.cat, dark);
  return (
    <button onClick={() => onOpen(ev)} className="card-sm" style={{ border: "none", textAlign: "left", padding: 8, display: "flex", gap: 12, alignItems: "center", width: "100%", opacity: ev.busy ? 0.55 : 1 }}>
      {ev.image ? <div style={{ width: 76, height: 76, flexShrink: 0 }}><Media ev={ev} dark={dark} height={76} radius={16} /></div> :
        <div style={{ width: 76, height: 76, borderRadius: 16, background: c, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Glyph name={catIcon(ev.cat)} size={34} color={c} /></div>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {label ? <span className="tag tag-soon" style={{ alignSelf: "flex-start", height: 22 }}>{label}</span> : <span className="ell" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{(ev.venue || "").split(",")[0]}</span>}
        <span className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.12 }}>{ev.title}</span>
        <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
          <span className="ell">{whenLabel(ev, today)} · {travelLabel(ev.tt)}</span>
          <span style={{ marginLeft: "auto" }}><PriceTag ev={ev} /></span>
        </span>
        {(ev.busy || ev.rain) && <span className="row" style={{ gap: 6 }}><Flags ev={ev} /></span>}
      </div>
    </button>
  );
}

export function PosterCard({ ev, dark, today, onOpen }) {
  return (
    <button onClick={() => onOpen(ev)} style={{ border: "none", background: "none", padding: 0, textAlign: "left", width: 156, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, color: "var(--ink)" }}>
      <div style={{ width: 156 }}>{ev.image ? <Media ev={ev} dark={dark} height={196} radius={24} /> : <Media ev={ev} dark={dark} height={196} radius={24} />}</div>
      {ev.image && <div className="disp clamp2" style={{ fontSize: 16, lineHeight: 1.1 }}>{ev.title}</div>}
      <div style={{ fontSize: 13, fontWeight: 800 }}>{whenLabel(ev, today)}</div>
      <div className="muted" style={{ fontSize: 13 }}>{travelLabel(ev.tt)} · <b style={{ color: "var(--ink)" }}>{isFree(ev) ? "Free" : (ev.price || "").split("/")[0]}</b></div>
    </button>
  );
}

export function ResultRow({ ev, dark, today, onOpen }) {
  const c = catColor(ev.cat, dark);
  return (
    <button onClick={() => onOpen(ev)} className="card-sm" style={{ border: "none", textAlign: "left", padding: "8px 14px 8px 8px", display: "flex", gap: 12, alignItems: "center", width: "100%", opacity: ev.busy ? 0.55 : 1 }}>
      <div style={{ width: 58, height: 58, borderRadius: 16, background: c, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Glyph name={catIcon(ev.cat)} size={28} color={c} /></div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="disp clamp2" style={{ fontSize: 17, lineHeight: 1.15 }}>{ev.title}</span>
        <span className="muted ell" style={{ fontSize: 13 }}>{whenLabel(ev, today)} · {travelLabel(ev.tt)}</span>
        {ev.followed && <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink2)" }}>You follow this venue</span>}
      </div>
      <PriceTag ev={ev} />
    </button>
  );
}

export function SectionHead({ title, n, color }) {
  return (
    <div className="sec-h">
      <h2>{title}</h2>
      {color && <svg width="56" height="14" viewBox="0 0 64 14" aria-hidden="true"><path d="M3 7c8-6 14 6 22 0s14-6 22 0 10 4 14 0" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" /></svg>}
      {n != null && <span className="n">{n}</span>}
    </div>
  );
}

export function TabBar({ tab, setTab, plansCount }) {
  const items = [["today", "Today"], ["explore", "Explore"], ["map", "Map"], ["plans", "Plans"], ["me", "Me"]];
  return (
    <nav className="tabbar" aria-label="Main">
      {items.map(([k, l]) => (
        <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)} style={{ position: "relative" }}>
          <Icon name={k} size={22} width={tab === k ? 2.4 : 2.2} />
          <span>{l}</span>
          {k === "plans" && plansCount > 0 && tab !== "plans" && <span style={{ position: "absolute", top: 4, right: "22%", minWidth: 16, height: 16, borderRadius: 8, background: "#F2611D", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{plansCount}</span>}
        </button>
      ))}
    </nav>
  );
}

export function Dialog({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="disp" style={{ fontSize: 22 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", border: "none", background: "var(--chip)", width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
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
      const c = catColor(ev.cat, dark), sel = ev.id === selectedId, sz = sel ? 44 : 34;
      const html = `<div class="gp-pin" style="width:${sz}px;height:${sz}px;background:${c};${sel ? "box-shadow:0 0 0 3px " + (dark ? "#FBF7EF" : "#1B1F3B") : ""}">${glyphSvgString(catIcon(ev.cat), sel ? 20 : 16, c)}</div>`;
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
