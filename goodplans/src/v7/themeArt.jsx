// Standard artwork for "New York right now" cards: a palette, a motif and the skyline, chosen from the theme.
// No network and no event photos: always there, always readable under white text.
import React from "react";

const THEMES = {
  snow: { g: ["#0F2A5C", "#5B8DEF"], m: "snow" },
  sun: { g: ["#E5533D", "#FFC857"], m: "sun" },
  leaves: { g: ["#7C2D12", "#F59E0B"], m: "leaves" },
  night: { g: ["#14172F", "#5B3FA8"], m: "stars" },
  lights: { g: ["#0E1A33", "#A16207"], m: "lights" },
  fireworks: { g: ["#14172F", "#C026D3"], m: "bursts" },
  spring: { g: ["#9D174D", "#F9A8D4"], m: "blossom" },
  pride: { g: ["#4338CA", "#EC4899"], m: "rainbow" },
  lantern: { g: ["#7F1D1D", "#F59E0B"], m: "lanterns" },
  waves: { g: ["#0E7490", "#7DD3FC"], m: "waves" },
  feast: { g: ["#9A3412", "#FB923C"], m: "dots" },
  green: { g: ["#14532D", "#4ADE80"], m: "blossom" },
  city: { g: ["#1B1F3B", "#4B4F7A"], m: "dots" },
};
const RULES = [
  [/cold-snap|snow|polar/, "snow"],
  [/pride/, "pride"],
  [/nye|july4|gov-ball/, "fireworks"],
  [/holiday-lights|season-opens|tree-lighting|christmas|hanukkah|kwanzaa|santacon|dyker|tribute|diwali/, "lights"],
  [/lunar|aapi/, "lantern"],
  [/halloween|muertos|dark-evenings|eid|comic-con/, "night"],
  [/last-leaves|foliage|thanksgiving|veterans|columbus|pulaski|steuben/, "leaves"],
  [/cherry|flower|easter|holi|valentine|womens/, "spring"],
  [/stpat|greek/, "green"],
  [/mermaid|fleet|summer-streets|five-boro|marathon/, "waves"],
  [/restaurant-week|san-gennaro|wine-food|oktoberfest|passover|rosh|atlantic|ohny/, "feast"],
  [/first-warm|warm-surprise|warming|light-evenings|long-weekend|manhattanhenge|summer|juneteenth|us-open|dominican|west-indian|india|puerto|philippine|harlem|hispanic/, "sun"],
];
export const themeOf = (id) => THEMES[(RULES.find(([re]) => re.test(id || "")) || [null, "city"])[1]];

// Small deterministic random so a theme always looks the same
const rng = (seed) => { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

function Motif({ kind, r }) {
  const items = [];
  const W = 400, H = 220;
  if (kind === "snow") for (let i = 0; i < 40; i++) items.push(<circle key={i} cx={r() * W} cy={r() * H} r={1.2 + r() * 2.8} fill="#fff" opacity={0.35 + r() * 0.5} />);
  else if (kind === "sun") {
    items.push(<circle key="g" cx={320} cy={60} r={90} fill="#FFE9A8" opacity={0.28} />, <circle key="s" cx={320} cy={60} r={38} fill="#FFF4CC" opacity={0.9} />);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; items.push(<line key={"r" + i} x1={320 + Math.cos(a) * 52} y1={60 + Math.sin(a) * 52} x2={320 + Math.cos(a) * 74} y2={60 + Math.sin(a) * 74} stroke="#FFF4CC" strokeWidth="4" strokeLinecap="round" opacity={0.7} />); }
  } else if (kind === "leaves") for (let i = 0; i < 18; i++) items.push(<ellipse key={i} cx={r() * W} cy={r() * 170} rx={9 + r() * 9} ry={4 + r() * 4} transform={`rotate(${r() * 180} ${0} ${0})`} fill={["#F59E0B", "#EA580C", "#B91C1C", "#FBBF24"][i % 4]} opacity={0.75} style={{ transformBox: "fill-box", transformOrigin: "center", transform: `rotate(${Math.round(r() * 180)}deg)` }} />);
  else if (kind === "stars") {
    items.push(<circle key="m" cx={330} cy={55} r={26} fill="#FDF3C7" opacity={0.92} />, <circle key="m2" cx={341} cy={49} r={24} fill="#3B2A78" opacity={0.95} />);
    for (let i = 0; i < 34; i++) items.push(<circle key={i} cx={r() * W} cy={r() * 150} r={0.8 + r() * 1.8} fill="#fff" opacity={0.4 + r() * 0.6} />);
  } else if (kind === "lights") for (let i = 0; i < 26; i++) items.push(<circle key={i} cx={r() * W} cy={r() * 170} r={4 + r() * 10} fill={["#FDE68A", "#FCA5A5", "#A7F3D0", "#FDBA74"][i % 4]} opacity={0.22 + r() * 0.4} />);
  else if (kind === "bursts") for (let b = 0; b < 4; b++) { const cx = 60 + r() * 280, cy = 30 + r() * 90, col = ["#FDE68A", "#F9A8D4", "#A5B4FC", "#6EE7B7"][b]; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; items.push(<line key={b + "-" + i} x1={cx + Math.cos(a) * 8} y1={cy + Math.sin(a) * 8} x2={cx + Math.cos(a) * (26 + r() * 10)} y2={cy + Math.sin(a) * (26 + r() * 10)} stroke={col} strokeWidth="2.5" strokeLinecap="round" opacity={0.85} />); } }
  else if (kind === "blossom") for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * 170; items.push(<g key={i} opacity={0.7}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 6} cy={y + Math.sin((a * Math.PI) / 180) * 6} r={5} fill="#FFF1F6" />)}<circle cx={x} cy={y} r={3} fill="#FBBF24" /></g>); }
  else if (kind === "rainbow") ["#EF4444", "#F59E0B", "#FDE047", "#22C55E", "#38BDF8", "#8B5CF6"].forEach((c, i) => items.push(<path key={i} d={`M ${40 + i * 12} 200 A ${160 - i * 12} ${160 - i * 12} 0 0 1 ${360 - i * 12} 200`} fill="none" stroke={c} strokeWidth="9" opacity={0.75} />));
  else if (kind === "lanterns") for (let i = 0; i < 6; i++) { const x = 40 + i * 62 + r() * 14, h = 20 + r() * 40; items.push(<g key={i}><line x1={x} y1={0} x2={x} y2={h} stroke="#FDE68A" strokeWidth="1.5" opacity={0.7} /><rect x={x - 13} y={h} width={26} height={32} rx={13} fill="#DC2626" /><rect x={x - 13} y={h + 3} width={26} height={4} fill="#FBBF24" /></g>); }
  else if (kind === "waves") for (let i = 0; i < 5; i++) items.push(<path key={i} d={`M 0 ${70 + i * 22} Q 50 ${50 + i * 22} 100 ${70 + i * 22} T 200 ${70 + i * 22} T 300 ${70 + i * 22} T 400 ${70 + i * 22}`} fill="none" stroke="#fff" strokeWidth="3" opacity={0.18 + i * 0.05} />);
  else for (let i = 0; i < 16; i++) items.push(<circle key={i} cx={r() * W} cy={r() * 170} r={6 + r() * 22} fill="#fff" opacity={0.05 + r() * 0.08} />);
  return <>{items}</>;
}

const SKY = "M0 220 V170 h22 v-30 h18 v30 h14 v-58 h8 v-14 h6 v14 h8 v58 h20 v-44 h26 v44 h16 v-72 h4 v-18 h4 v18 h4 v72 h24 v-36 h22 v36 h12 v-50 h18 v50 h20 v-26 h24 v26 h18 v-64 h8 v-12 h4 v12 h8 v64 h22 v-40 h20 v40 h22 V220 Z";

export function ThemeArt({ id, height = 190 }) {
  const t = themeOf(id), r = rng(id || "x");
  const gid = "ta-" + String(id).replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height, display: "block" }} aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.g[0]} /><stop offset="1" stopColor={t.g[1]} /></linearGradient></defs>
      <rect width="400" height="220" fill={`url(#${gid})`} />
      <Motif kind={t.m} r={r} />
      <path d={SKY} fill="#0B0E22" opacity="0.4" />
    </svg>
  );
}
