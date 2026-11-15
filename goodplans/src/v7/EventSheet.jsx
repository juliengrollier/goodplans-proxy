import { FAM, CAT } from "./taxonomy.js";
import React, { useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { CatBullet, Media, PriceTag, Dialog, Keywords, Travel } from "./components.jsx";
import { catColor } from "./theme.js";
import { whenLabel, venueLabel, weatherBadge, fmtT } from "./engine.js";
import { parseT, toGC, nearestSubways, LINE_COLOR, safeCoord } from "../lib/core.js";

const NFM = [["far", "Too far", "Long trips get pushed down"], ["price", "Too pricey", "Paid nights get pushed down"], ["seen", "Seen it / not again", "Hides this series"], ["notus", "Not our thing", "Less of this kind of event"]];

export default function EventSheet({ ev, dark, today, onSignal = () => {}, onClose, saved, onSave, taste, onReact, onFollow, toast }) {
  const [nfm, setNfm] = useState(false);
  const thumb = taste.thumbs[ev.id] || 0;
  const followed = !!taste.follows[(ev.venue || "").split(",")[0].trim().toLowerCase()];
  const stations = nearestSubways(safeCoord(ev), 0.7);
  const bd = ev.bd || {};
  const bars = [["Taste", bd.taste, 50, catColor("Music", dark)], ["Nearby", bd.near, 15, catColor("Film", dark)], ["Your history", bd.bh, 15, catColor("Art & Culture", dark)], ["Source pick", bd.qual, 15, catColor("Comedy", dark)], ["Timing", bd.urg, 20, catColor("Talk & Learn", dark)]];

  const addCal = () => {
    const s = new Date(ev.E + "T" + parseT(ev.time)), e = new Date(s.getTime() + 2 * 3600000);
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(ev.title) + "&dates=" + toGC(s) + "/" + toGC(e) + "&details=" + encodeURIComponent((ev.desc || "") + "\n\n" + (ev.url || "")) + "&location=" + encodeURIComponent(ev.venue || "");
    window.open(url, "_blank"); onSignal(ev, "link");
  };
  const share = async () => {
    const link = location.origin + "/?event=" + encodeURIComponent(ev.id);
    const text = ev.title + " — " + whenLabel(ev, today) + " · " + (ev.venue || "");
    try {
      onSignal(ev, "share");
      if (navigator.share) await navigator.share({ title: ev.title, text, url: link });
      else { await navigator.clipboard.writeText(text + "\n" + link); toast("Link copied"); }
    } catch {}
  };

  // Swipe down from the top of the page to close
  const sheetRef = useRef(null), y0 = useRef(null);
  const onTouchStart = (e) => { y0.current = sheetRef.current?.scrollTop <= 0 ? e.touches[0].clientY : null; };
  const onTouchEnd = (e) => { if (y0.current != null && e.changedTouches[0].clientY - y0.current > 110) onClose(); y0.current = null; };
  const wb = weatherBadge(ev);

  return (
    <div className="sheet" role="dialog" aria-label={ev.title} ref={sheetRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--line)", margin: "8px auto 0" }} aria-hidden="true" />
      <div style={{ position: "relative", margin: "calc(8px + env(safe-area-inset-top)) 12px 0" }}>
        <Media ev={ev} dark={dark} height={300} radius={30} big hideTitle credit />
        <button onClick={onClose} aria-label="Back" style={{ position: "absolute", top: 14, left: 14, width: 44, height: 44, borderRadius: 22, border: "none", background: "#fff", color: "#1B1F3B", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(27,31,59,.15)" }}><Icon name="back" size={20} width={2.6} /></button>
        {ev.why?.includes("One night only") && <span className="tag tag-white" style={{ position: "absolute", top: 21, right: 14, height: 30, fontSize: 13 }}>One night only</span>}
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", right: 16, bottom: -26, width: 52, height: 52, borderRadius: 26, border: "3px solid var(--bg)", background: "var(--navy)", color: "var(--onnavy)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(27,31,59,.25)", zIndex: 2 }}><Icon name="close" size={22} width={2.6} /></button>
      </div>

      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <CatBullet ev={ev} size={30} dark={dark} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{(FAM[CAT[ev.ncat]?.fam]?.label || "") + " · " + (ev.ncat || ev.cat)}</span>
        </div>
        <h1 className="disp" style={{ margin: 0, fontSize: 32, lineHeight: 1.02 }}>{ev.title}</h1>
        <div style={{ fontSize: 15, color: "var(--ink2)" }}>{ev.venue}</div>
        <div style={{ marginTop: 4 }}><Keywords ev={ev} max={5} size="lg" /></div>
        {ev.recurring && (
          <div className="row" style={{ gap: 6, fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>
            <Icon name="refresh" size={15} /> {ev.recLabel || "Recurring"}{ev.recurring === "synthetic" ? " · not in the latest feed, check before going" : ""}
          </div>
        )}
        {ev.desc && <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.6, color: "var(--ink2)" }}>{ev.desc}</p>}
        {ev.url && <a href={ev.url} target="_blank" rel="noreferrer" onClick={() => onSignal(ev, "link")} className="row" style={{ gap: 6, fontSize: 14, fontWeight: 800 }}>Open on {ev.src || "the source site"} <Icon name="link" size={15} /></a>}
      </div>

      <div style={{ margin: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["When", whenLabel(ev, today)], ["Getting there", ev.tt ? <Travel tt={ev.tt} size={16} /> : "—"], ["Price", null], ["Booking", ev.ticket ? "Tickets / RSVP" : "Walk in"]].map(([k, v]) => (
          <div key={k} className="card-sm" style={{ padding: "12px 14px", borderRadius: 20 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{k}</div>
            {v != null ? <div className="disp" style={{ fontSize: 17, marginTop: 2 }}>{v}</div> : <div style={{ marginTop: 4 }}><PriceTag ev={ev} /></div>}
          </div>
        ))}
      </div>

      {stations.length > 0 && ev.tt?.mode === "transit" && (
        <div className="row" style={{ margin: "10px 20px 0", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
          <span className="muted">Nearest station: {stations[0].n}</span>
          {stations[0].l.slice(0, 6).map((l) => <span key={l} style={{ width: 22, height: 22, borderRadius: 11, background: LINE_COLOR[l] || "#808183", color: /[NQRW]/.test(l) ? "#1B1F3B" : "#fff", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{l}</span>)}
        </div>
      )}

      {ev.busy ? (
        <div className="row" style={{ margin: "12px 16px 0", gap: 10, padding: "12px 16px", borderRadius: 20, background: "var(--warn-bg)", color: "var(--warn-ink)" }}><Icon name="cal" size={20} /><span style={{ fontSize: 14, fontWeight: 700 }}>This clashes with something in your calendar.</span></div>
      ) : ev.calChecked ? (
        <div className="row" style={{ margin: "12px 16px 0", gap: 10, padding: "12px 16px", borderRadius: 20, background: "var(--free-bg)", color: "var(--free-ink)" }}><Icon name="calcheck" size={20} /><span style={{ fontSize: 14, fontWeight: 700 }}>No clash in your calendar.</span></div>
      ) : null}
      {ev.wx && (
        <div className="row" style={{ margin: "10px 16px 0", gap: 12, padding: "12px 16px", borderRadius: 20, background: wb?.tone === "warn" ? "var(--warn-bg)" : wb?.tone === "free" ? "var(--free-bg)" : "var(--chip)", color: wb?.tone === "warn" ? "var(--warn-ink)" : wb?.tone === "free" ? "var(--free-ink)" : "var(--ink)" }}>
          <Icon name={wb?.icon || (ev.wx.pmax >= 50 ? "rain" : ev.wx.pmax >= 25 ? "cloud" : "sun")} size={22} />
          <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
            {fmtT(ev.wx.hi)} high, {ev.wx.pmax}% chance of rain{ev.wx.evening != null ? ` (${ev.wx.evening}% in the evening)` : ""}.
            {ev.outdoor ? (ev.rain ? " It's outdoors: have a plan B." : ev.dark ? " Outdoors and ends after dark: bring a layer." : wb?.tone === "free" ? " Great day to be outside." : " It's outdoors.") : " Indoors, so the weather won't matter."}
          </span>
        </div>
      )}

      <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="disp" style={{ fontSize: 20 }}>Why it's picked</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {(ev.why?.length ? ev.why : ["Matches your settings"]).map((w) => <span key={w} className="tag tag-plain" style={{ height: 32, fontSize: 13, padding: "0 13px" }}>{w}</span>)}
        </div>
        <div className="card-sm" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Match</span><span className="disp" style={{ fontSize: 24 }}>{ev.sc}<span className="muted" style={{ fontSize: 14 }}>/100</span></span></div>
          {bars.map(([l, v, mx, c]) => (
            <div key={l} style={{ display: "grid", gridTemplateColumns: "92px 1fr 40px", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>{l}</span>
              <div style={{ height: 10, borderRadius: 5, background: "var(--chip)" }}><div style={{ height: 10, borderRadius: 5, width: Math.round(((v || 0) / mx) * 100) + "%", background: c }} /></div>
              <span style={{ fontSize: 12, fontWeight: 800, textAlign: "right" }}>{v || 0}/{mx}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="disp" style={{ fontSize: 20 }}>Teach Good Plans</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className={"chip" + (thumb === 1 ? " on" : "")} onClick={() => onReact(ev, thumb === 1 ? "undo" : "up")}><Icon name="up" size={16} /> More like this</button>
          <button className={"chip" + (thumb === -1 ? " on" : "")} onClick={() => onReact(ev, thumb === -1 ? "undo" : "down")}><Icon name="down" size={16} /> Less like this</button>
          <button className="chip" onClick={() => setNfm(true)}><Icon name="hide" size={16} /> Not for me…</button>
          {ev.venue && <button className={"chip" + (followed ? " on" : "")} onClick={() => onFollow(ev)}><Icon name={followed ? "check" : "plus"} size={16} /> {followed ? "Following" : "Follow"} {venueLabel(ev).slice(0, 22)}</button>}
        </div>
      </div>

      <div style={{ height: 110 }} />

      <div className="actionbar">
        <button className="roundbtn" aria-label="Back" onClick={onClose}><Icon name="back" size={24} width={2.6} /></button>
        <button className="pill pill-dark" style={{ flex: 1, height: 52, borderRadius: 26 }} onClick={() => onSave(ev)}>
          <Icon name="save" size={20} fill={saved ? "currentColor" : "none"} /> {saved ? "In your plans" : "Add to plans"}
        </button>
        <button className="roundbtn" aria-label="Add to Google Calendar" onClick={addCal}><Icon name="cal" size={22} /></button>
        <button className="roundbtn" aria-label="Share" onClick={share}><Icon name="share" size={22} /></button>
      </div>

      {nfm && (
        <Dialog title="Not for me because…" onClose={() => setNfm(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {NFM.map(([k, l, d]) => (
              <button key={k} className="card-sm" style={{ border: "none", textAlign: "left", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }} onClick={() => { onReact(ev, "nfm", k); setNfm(false); onClose(); }}>
                <span className="disp" style={{ fontSize: 17 }}>{l}</span><span className="muted" style={{ fontSize: 13 }}>{d}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
