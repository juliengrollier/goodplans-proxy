import React from "react";

// ── Solid category glyphs (24×24): sf = white fill (evenodd), ss = white stroke, si = stroke in the bullet colour
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const PALETTE = "M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z";
const WAVES = "M3.5 9.5c3 1.5 6 1.5 8.5 0s5.5-1.5 8.5 0M3.5 14.5c3-1.5 6-1.5 8.5 0s5.5 1.5 8.5 0";
const BALLOON = "M12 3c3.3 0 6 2.9 6 6.5 0 3.9-2.7 6.5-6 6.5s-6-2.6-6-6.5C6 5.9 8.7 3 12 3z";

const GLYPH = {
  music:    { sf: circ(6.5, 18, 3) + circ(16.5, 16, 3), ss: "M9 18V6l10-2v10" },
  comedy:   { sf: circ(12, 12, 9.5) + "M7 12.6h10a5 5 0 0 1-10 0z", si: "M6.9 9.8q1.4-2.1 2.8 0 M14.3 9.8q1.4-2.1 2.8 0" }, // laughing face
  art:      { sf: PALETTE + circ(7.5, 11, 1.3) + circ(10, 7, 1.3) + circ(15, 7.5, 1.3) },
  film:     { sf: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M10 9.5l5 2.5-5 2.5z" },
  eat:      { sf: "M7.5 3h9l-.8 5.5a3.7 3.7 0 0 1-7.4 0z", ss: "M12 12.5V20 M8.5 20.5h7" },
  outdoors: { sf: "M12 3l6 8h-3.5l4.5 6H5l4.5-6H6z", ss: "M12 17v4" },
  sports:   { sf: circ(12, 12, 9.5), si: WAVES },
  family:   { sf: BALLOON + "M11 16h2l-1 1.6z", ss: "M12 17.5c-.8 1.2.8 2.2 0 3.5" },
  talks:    { sf: "M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", si: "M8 9h8M8 12.5h5" },
  creative: { sf: "M18.6 2.6a2 2 0 0 1 2.8 2.8l-8.2 8.2-2.8-2.8z M9 13.2l1.8 1.8c-.3 2.6-2.1 4.7-5.3 5-1 .1-2-.2-2.5-.5 1.3-.8 1.6-2.2 1.8-3.4.3-1.6 1.9-3 4.2-2.9z" },
  night:    { sf: "M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z M18 2.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" },
  shopping: { sf: "M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z", ss: "M9 8V6a3 3 0 0 1 6 0v2" },
  other:    { sf: "M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" },
};

export function Glyph({ name, size = 20, color }) {
  const g = GLYPH[name] || GLYPH.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d={g.sf} fill="#FFFFFF" fillRule="evenodd" />
      {g.ss && <path d={g.ss} fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      {g.si && <path d={g.si} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export function glyphSvgString(name, size, color) {
  const g = GLYPH[name] || GLYPH.other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${g.sf}" fill="#fff" fill-rule="evenodd"/>${g.ss ? `<path d="${g.ss}" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>` : ""}${g.si ? `<path d="${g.si}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` : ""}</svg>`;
}

// ── Line UI icons
const UI = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  map: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>,
  plans: <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z" />,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  calcheck: <><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
  up: <path d="M7 10v11H4V10zM7 10l4-7c1.7 0 2.5 1.2 2.2 2.8L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7.4A2 2 0 0 1 17.8 21H7" />,
  down: <path d="M17 14V3h3v11zM17 14l-4 7c-1.7 0-2.5-1.2-2.2-2.8l.6-3.2H5a2 2 0 0 1-2-2.3l1.2-7.4A2 2 0 0 1 6.2 3H17" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  rain: <><path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 7.5 3.8 3.8 0 0 1 17.5 15z" /><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" /></>,
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />,
  spark: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chev: <path d="M9 6l6 6-6 6" />,
  chevdown: <path d="M6 9l6 6 6-6" />,
  rows: <path d="M3 5h8v5H3zM13 5h8v5h-8zM3 14h8v5H3zM13 14h8v5h-8z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  hide: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-2.6 3.1M6.6 7.7A15 15 0 0 0 3 12s4 6 9 6a9 9 0 0 0 3.4-.7" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  link: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  explore: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="M10 21l2.5-6.5L15 17v4M9 12l1.5-4.5 3.5 1 2 3.5M12.5 14.5l-1-3.5" /></>,
  train: <><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M6 10h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 16l-1 4M15 16l1 4" /><circle cx="9.5" cy="13" r=".6" /><circle cx="14.5" cy="13" r=".6" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  down2: <path d="M6 9l6 6 6-6" />,
  layer: <path d="M8 3l4 3 4-3 4 3-2 4h-2v11H8V10H6L4 6z" />,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.7-9A6 6 0 0 1 17.6 9 4.5 4.5 0 0 1 17 18z" />,
  thumbup: <path d="M7 10v11H4V10zM7 10l4-7c1.7 0 2.5 1.2 2.2 2.8L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7.4A2 2 0 0 1 17.8 21H7" />,
  save: <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z" />,
  heart: <path d="M12 21s-7.5-4.6-9.3-9.3C1.5 8.5 3.4 5 6.7 5c2 0 3.6 1.1 5.3 3 1.7-1.9 3.3-3 5.3-3 3.3 0 5.2 3.5 4 6.7C19.5 16.4 12 21 12 21z" />,
};

export function Icon({ name, size = 22, color = "currentColor", width = 2.2, fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {UI[name]}
    </svg>
  );
}

// ── Smile pin logo: tilted pin, sparkle wink; smile = three subway lines meeting at a transfer
const PIN = "M40 4C21 4 6 18.5 6 37c0 13 8.5 24.5 20 34.5 5 4.4 9.6 8 14 11 4.4-3 9-6.6 14-11C65.5 61.5 74 50 74 37 74 18.5 59 4 40 4z";
export function Logo({ size = 28, dark }) {
  const pin = dark ? "#FBF7EF" : "#1B1F3B", eye = dark ? "#141833" : "#FBF7EF";
  return (
    <svg width={size} height={size * 1.075} viewBox="0 0 80 86" aria-hidden="true" style={{ display: "block" }}>
      <g transform="rotate(12 40 50)">
        <path d={PIN} fill={pin} />
        <circle cx="31" cy="30" r="4.6" fill={eye} />
        <path d="M49.00 23.60L50.45 28.55L55.40 30.00L50.45 31.45L49.00 36.40L47.55 31.45L42.60 30.00L47.55 28.55Z" fill={eye} stroke={eye} strokeWidth="0.8" strokeLinejoin="round" />
        <g transform="rotate(-6 40 44)" fill="none" strokeWidth="6.5" strokeLinecap="round">
        <path d="M27.31 43.92A14 14 0 0 0 34.76 50.98" stroke="#E53935" />
        <path d="M34.76 50.98A14 14 0 0 0 45.24 50.98" stroke="#FFB020" />
        <path d="M45.24 50.98A14 14 0 0 0 52.69 43.92" stroke="#2BB5E8" />
        </g>
      </g>
    </svg>
  );
}

export function Squiggle({ color, w = 64 }) {
  return (
    <svg width={w} height="14" viewBox="0 0 64 14" aria-hidden="true">
      <path d="M3 7c8-6 14 6 22 0s14-6 22 0 10 4 14 0" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
