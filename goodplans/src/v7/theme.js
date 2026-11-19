// Good Plans v7 "Cream final" design tokens.
// Light = cream + navy ink; dark = navy night. Category "line colours" per theme.

export const CAT_STYLE = {
  "Music":         { icon: "music",    light: "#7B4BD6", dark: "#9B70F0" },
  "Comedy":        { icon: "comedy",   light: "#F2611D", dark: "#FF7A3D" },
  "Art & Culture": { icon: "art",      light: "#E0407A", dark: "#F06A99" },
  "Film":          { icon: "film",     light: "#2563EB", dark: "#4F86FF" },
  "Food & Drink":  { icon: "eat",      light: "#E53935", dark: "#F26260" },
  "Outdoors":      { icon: "outdoors", light: "#1E9E5A", dark: "#34C47A" },
  "Sports":        { icon: "sports",   light: "#0284C7", dark: "#2AA8E0" },
  "Family":        { icon: "family",   light: "#5FA318", dark: "#7CC23A" },
  "Talk & Learn":  { icon: "talks",    light: "#0D9488", dark: "#22B8AA" },
  "Get Creative":  { icon: "creative", light: "#C026D3", dark: "#DA5BE8" },
  "Nightlife":     { icon: "night",    light: "#4338CA", dark: "#6A62F0" },
  "Shopping":      { icon: "shopping", light: "#A16207", dark: "#C98A1B" },
  "Other":         { icon: "other",    light: "#8A8F98", dark: "#A3A8B0" },
};

export const catColor = (cat, dark) => {
  const s = CAT_STYLE[cat] || CAT_STYLE.Other;
  return dark ? s.dark : s.light;
};
export const catIcon = (cat) => (CAT_STYLE[cat] || CAT_STYLE.Other).icon;

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap";

export const CSS = `
:root{
  --bg:#FBF7EF; --card:#FFFFFF; --ink:#1B1F3B; --ink2:#3A3E58; --ink3:#5A5E78;
  --line:#E7E1D4; --chip:#EFE9DD; --media:#E9E3D6; --mapbg:#EEE8DC; --water:#CFE0E8; --street:#FFFFFF; --park:#D5E8CC;
  --navy:#1B1F3B; --onnavy:#FBF7EF; --onnavy2:#C9CBDB; --img-filter:saturate(.62) contrast(.86) brightness(1.06); --img-veil:.2; --ph-veil:.32;
  --free-bg:#DDF3E6; --free-ink:#11643A; --soon-bg:#FDE7DA; --soon-ink:#8A3410;
  --warn-bg:#FFF1D6; --warn-ink:#7A4B00;
  --shadow:0 6px 20px rgba(27,31,59,.08); --shadow-sm:0 4px 14px rgba(27,31,59,.06);
  --tab:#1B1F3B; --tab-ink:#C9CBDB; --tab-on:#FBF7EF; --tab-on-ink:#1B1F3B;
  color-scheme: light;
}
[data-theme="dark"]{
  --bg:#141833; --card:#1F2447; --ink:#FBF7EF; --ink2:#D3D5E4; --ink3:#A9ADC8;
  --line:#2E3463; --chip:#2A3060; --media:#262C57; --mapbg:#262C57; --water:#1B3A55; --street:#343C70; --park:#23423A;
  --navy:#FBF7EF; --onnavy:#141833; --onnavy2:#3A3E58; --img-filter:saturate(.62) contrast(.88) brightness(.8); --img-veil:.22; --ph-veil:.38;
  --free-bg:#123D2B; --free-ink:#8FE0B1; --soon-bg:#4A2A1A; --soon-ink:#FFC8A3;
  --warn-bg:#43360F; --warn-ink:#FFD98A;
  --shadow:none; --shadow-sm:none;
  --tab:#262C57; --tab-ink:#C9CBDB; --tab-on:#FBF7EF; --tab-on-ink:#141833;
  color-scheme: dark;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg)}
body{font-family:'Nunito Sans',system-ui,sans-serif;color:var(--ink)}
::-webkit-scrollbar{display:none}
button{font-family:inherit;color:inherit;cursor:pointer}
a{color:inherit}
.gp-app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--bg);position:relative;padding-bottom:calc(84px + env(safe-area-inset-bottom))}
.disp{font-family:'Fredoka',system-ui,sans-serif;font-weight:600}
.muted{color:var(--ink3)}
.row{display:flex;align-items:center}
.hscroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x proximity;padding:0 20px;scroll-padding-inline:20px}
.hscroll>*{scroll-snap-align:start}
@keyframes gp-marq{0%,18%{transform:translateX(0)}82%,100%{transform:translateX(var(--mq))}}
.gp-marq{animation:gp-marq 9s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.gp-marq{animation:none}}
.card{background:var(--card);border-radius:26px;box-shadow:var(--shadow)}
.card-sm{background:var(--card);border-radius:22px;box-shadow:var(--shadow-sm)}
[data-theme="dark"] .card,[data-theme="dark"] .card-sm{border:1px solid var(--line)}
.pill{height:44px;padding:0 20px;border-radius:22px;border:none;font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.pill-dark{background:var(--navy);color:var(--onnavy)}
.pill-line{background:var(--card);color:var(--ink);border:2px solid var(--navy)}
.chip{flex-shrink:0;height:36px;padding:0 14px;border-radius:18px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.chip.on{background:var(--navy);color:var(--onnavy);border-color:var(--navy)}
.tag{height:26px;padding:0 10px;border-radius:13px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;white-space:nowrap}
.tag-free{background:var(--free-bg);color:var(--free-ink)}
.tag-soon{background:var(--soon-bg);color:var(--soon-ink)}
.tag-warn{background:var(--warn-bg);color:var(--warn-ink)}
.tag-plain{background:var(--chip);color:var(--ink)}
.tag-white{background:#fff;color:#1B1F3B}
.sec-h{display:flex;align-items:center;gap:10px;padding:58px 20px 14px;position:relative}
.sec-h::before,.sec-sep::before{content:"";position:absolute;top:26px;left:20px;right:20px;height:1px;background:var(--line)}
.sec-sep{position:relative;height:52px}
/* Event cards: flat, no background, so long lists feel lighter */
.onpic button{color:#fff!important;opacity:.85!important}.onpic button[aria-pressed=true]{opacity:1!important;background:rgba(255,255,255,.3)!important}
.ev-flat{background:none!important;box-shadow:none!important;border:none!important;border-radius:0!important}
.sec-h h2{margin:0;font-family:'Fredoka',sans-serif;font-weight:600;font-size:25px}
.sec-h .n{margin-left:auto;font-size:14px;font-weight:700;color:var(--ink3)}
.clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tabbar{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:100%;max-width:480px;height:calc(64px + env(safe-area-inset-bottom));padding:6px 8px env(safe-area-inset-bottom);border-radius:24px 24px 0 0;background:var(--tab);display:grid;grid-template-columns:repeat(5,1fr);box-shadow:0 -6px 24px rgba(27,31,59,.18);z-index:50}
.tabbar button{border:none;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--tab-ink);font-size:11px;font-weight:700}
.tabbar .tab-ic{width:52px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center}
.tabbar button.on{color:var(--tab-on);font-weight:800}
.tabbar button.on .tab-ic{background:var(--tab-on);color:var(--tab-on-ink)}
.kw{height:22px;padding:0 8px;border-radius:11px;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;white-space:nowrap;background:transparent;border:1.5px solid var(--line);color:var(--ink2)}
.actionbar{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:100%;max-width:480px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--card);border-radius:24px 24px 0 0;box-shadow:0 -6px 24px rgba(27,31,59,.16);display:flex;gap:8px;align-items:center;z-index:110}
[data-theme="dark"] .actionbar{border-top:1px solid var(--line)}
.roundbtn{width:52px;height:52px;border-radius:26px;border:none;background:var(--chip);color:var(--ink);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sheet{position:fixed;inset:0;z-index:100;background:var(--bg);overflow-y:auto;max-width:480px;margin:0 auto;animation:up .22s ease}
@keyframes up{from{transform:translateY(24px);opacity:.4}to{transform:none;opacity:1}}
.overlay{position:fixed;inset:0;z-index:120;background:rgba(15,18,40,.45);display:flex;align-items:flex-end;justify-content:center}
.dialog{background:var(--bg);width:100%;max-width:480px;border-radius:28px 28px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom));max-height:85vh;overflow-y:auto}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));background:var(--navy);color:var(--onnavy);padding:12px 18px;border-radius:22px;font-weight:700;font-size:14px;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90%}
.input{width:100%;height:48px;border-radius:24px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:0 16px;font-size:15px;font-family:inherit;outline:none}
.seg{display:grid;border-radius:20px;background:var(--chip);padding:4px;gap:4px}
.seg button{border:none;background:none;border-radius:16px;height:36px;font-size:13px;font-weight:700;color:var(--ink)}
.seg button.on{background:var(--navy);color:var(--onnavy)}
.leaflet-container{background:var(--mapbg)!important;font-family:inherit}
.gp-pin{display:flex;align-items:center;justify-content:center;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(27,31,59,.3)}
.gp-me{width:18px;height:18px;border-radius:50%;background:#1B1F3B;border:4px solid #fff;box-shadow:0 0 0 6px rgba(27,31,59,.18)}
[data-theme="dark"] .gp-me{background:#FBF7EF;border-color:#141833}
input[type=range]{width:100%;accent-color:var(--ink)}
.gp-tiles-light { filter: saturate(.55) brightness(1.04); }
.gp-tiles-dark { filter: invert(1) hue-rotate(180deg) brightness(.82) contrast(.9) saturate(.5); }
/* Keep Leaflet's internal z-indexes (400–1000) inside the map so sheets, dialogs and the tab bar stay on top */
.leaflet-container { isolation: isolate; z-index: 0; }
`;
