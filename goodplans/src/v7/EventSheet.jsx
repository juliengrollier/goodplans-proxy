import { FAM, CAT } from "./taxonomy.js";
import React, { useRef, useState } from "react";
import { moodProfile, primaryIntent } from "./intents.js";
import { Icon } from "./icons.jsx";
import { CatBullet, Media, PriceTag, Dialog, Travel, CompactCard, LeafletMap, When, DotScroll, MoodTile } from "./components.jsx";
import { catColor } from "./theme.js";
import { whenLabel, venueLabel, weatherBadge, fmtT } from "./engine.js";
import { parseT, toGC, nearestSubways, LINE_COLOR, safeCoord, isImprecise } from "../lib/core.js";

const NFM = [["far", "Too far", "Long trips get pushed down"], ["price", "Too pricey", "Paid nights get pushed down"], ["seen", "Seen it / not again", "Hides this series"], ["notus", "Not our thing", "Less of this kind of event"]];

export default function EventSheet({ tiles, onTile = () => {}, favs = [], onFav, ev, dark, today, onSignal = () => {}, onAskWhy = () => {}, similar = [], onOpen, onClose, saved, onSave, taste, onReact, onFollow, toast }) {
  const [nfm, setNfm] = useState(false);
  const thumb = taste.thumbs[ev.id] || 0;
  const followed = !!taste.follows[(ev.venue || "").split(",")[0].trim().toLowerCase()];
  const stations = nearestSubways(safeCoord(ev), 0.7);
  const coord = !isImprecise(ev) && ev.coord ? ev.coord : null;
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
  // You may also like: activities whose mood mix is closest to this event and its look-alikes
  const [alsoN, setAlsoN] = useState(6);
  const alsoLike = React.useMemo(() => {
    const base = [ev, ...similar]; const mine = moodProfile(base);
    const cosv = (a, b) => { let d = 0, na = 0, nb = 0; a.forEach((x, i) => { d += x * b[i]; na += x * x; nb += b[i] * b[i]; }); return na && nb ? d / Math.sqrt(na * nb) : 0; };
    return (tiles?.all || []).filter((t) => /^gen-(act|sub|term|cut)-/.test(t.key) && t.list?.length && !t.list.some((e) => e.id === ev.id))
      .map((t) => [t, cosv(mine, moodProfile(t.list))]).sort((a, b) => b[1] - a[1])
      .map(([t]) => { const b = primaryIntent(t.list[0]); return { ...t, title: t.short || t.title, ...(b ? { verb: b.label, color: b.color } : {}) }; });
  }, [ev, similar, tiles]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recurrence: the pattern, the next session, and the last date when the listing has one ("Monthly · next Sun, Nov 16 · until Nov 30")
  const recLine = (() => {
    const fd = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const multi = ev.X && ev.X > ev.E, t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const pat = ev.recurring ? ev.recLabel || "Recurring" : ev.moreDates ? "Several dates" : multi ? "Ongoing" : null;
    if (!pat) return null;
    const nx = new Date(ev.E + "T12:00:00"); const next = nx < t0 ? t0 : nx;
    return [pat, "next " + fd(next), multi ? "until " + new Date(ev.X + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null].filter(Boolean).join(" · ");
  })();

  return (
    <div className="sheet" role="dialog" aria-label={ev.title} ref={sheetRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--line)", margin: "8px auto 0" }} aria-hidden="true" />
      <div style={{ position: "relative", margin: "calc(8px + env(safe-area-inset-top)) 12px 0" }}>
        <Media ev={ev} dark={dark} height={300} radius={30} big hideTitle credit />
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {[["Save to plans", saved ? "In your plans" : "Add to plans", () => onSave(ev), <Icon key="s" name="save" size={22} fill={saved ? "currentColor" : "none"} />, saved],
            ["Add to Google Calendar", "Add to Google Calendar", addCal, <Icon key="c" name="cal" size={21} />, false],
            ["Share", "Share", share, <Icon key="h" name="share" size={21} />, false]].map(([al, , fn, ic, on]) => (
            <button key={al} onClick={fn} aria-label={al} aria-pressed={al === "Save to plans" ? on : undefined} style={{ width: 46, height: 46, borderRadius: 23, border: "none", background: on ? "var(--navy)" : "#fff", color: on ? "var(--onnavy)" : "#1B1F3B", boxShadow: "0 2px 8px rgba(0,0,0,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>
          ))}
        </div>
        {ev.why?.includes("One night only") && <span className="tag tag-white" style={{ position: "absolute", top: 21, left: 14, height: 30, fontSize: 13 }}>One night only</span>}
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", right: 16, bottom: -26, width: 52, height: 52, borderRadius: 26, border: "3px solid var(--bg)", background: "var(--navy)", color: "var(--onnavy)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(27,31,59,.25)", zIndex: 2 }}><Icon name="close" size={22} width={2.6} /></button>
      </div>

      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <CatBullet ev={ev} size={30} dark={dark} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{(FAM[CAT[ev.ncat]?.fam]?.label || "") + " · " + (ev.ncat || ev.cat)}</span>
        </div>
        <h1 className="disp" style={{ margin: 0, fontSize: 32, lineHeight: 1.02 }}>{ev.title}</h1>
        <div style={{ fontSize: 15, color: "var(--ink2)" }}>{ev.venue}</div>
        {recLine && (
          <div className="row" style={{ gap: 6, fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>
            <Icon name="refresh" size={15} /> {recLine}{ev.recurring === "synthetic" ? " · not in the latest feed, check before going" : ""}
          </div>
        )}
        {ev.desc && <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.6, color: "var(--ink2)" }}>{ev.desc}</p>}
        {ev.url && <a href={ev.url} target="_blank" rel="noreferrer" onClick={() => onSignal(ev, "link")} className="row" style={{ gap: 6, fontSize: 14, fontWeight: 800 }}>Open on {ev.src || "the source site"} <Icon name="link" size={15} /></a>}
      </div>

      <div style={{ margin: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["When", <When key="w" text={whenLabel(ev, today)} />], ["Getting there", ev.tt ? <Travel tt={ev.tt} size={16} /> : "—"], ["Price", null], ["Booking", ev.ticket ? "Tickets / RSVP" : "Walk in"]].map(([k, v]) => (
          <div key={k} className="card-sm" style={{ padding: "12px 14px", borderRadius: 20 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{k}</div>
            {v != null ? <div className="disp" style={{ fontSize: 17, marginTop: 2 }}>{v}</div> : <div style={{ marginTop: 4 }}><PriceTag ev={ev} /></div>}
          </div>
        ))}
      </div>

      {coord && (
        <div style={{ padding: "22px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", padding: "0 4px" }}>
            <span className="disp" style={{ fontSize: 20 }}>Where</span>
            <a href={"https://www.google.com/maps/search/?api=1&query=" + coord[0] + "," + coord[1]} target="_blank" rel="noreferrer" onClick={() => onSignal(ev, "link")} className="row" style={{ gap: 5, fontSize: 13, fontWeight: 800 }}>Open in Maps <Icon name="link" size={14} /></a>
          </div>
          <LeafletMap events={[ev]} home={coord} dark={dark} height={220} interactive twoFinger rounded hideHome selectedId={ev.id} zoom={15} />
          <div className="muted" style={{ fontSize: 13, padding: "0 4px" }}>{ev.venue}</div>
        </div>
      )}

      {stations.length > 0 && ev.tt?.mode === "transit" && (
        <div className="row" style={{ margin: "10px 20px 0", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
          <span className="muted">Nearest station: {stations[0].n}</span>
          {stations[0].l.slice(0, 6).map((l) => <span key={l} style={{ width: 22, height: 22, borderRadius: 11, background: LINE_COLOR[l] || "#808183", color: /[NQRW]/.test(l) ? "#1B1F3B" : "#fff", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{l}</span>)}
        </div>
      )}

      {similar.length > 0 && (
        <div style={{ padding: "26px 16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="disp" style={{ fontSize: 20, padding: "0 4px" }}>Similar events</div>
          {similar.map((s) => <CompactCard key={s.id} ev={s} dark={dark} today={today} onOpen={onOpen} />)}
        </div>
      )}

      {alsoLike.length > 0 && (
        <div style={{ paddingTop: 26 }}>
          <div className="disp" style={{ fontSize: 20, padding: "0 20px 12px" }}>You may also like</div>
          <DotScroll onMore={() => alsoN < alsoLike.length && setAlsoN(alsoN + 6)}>{alsoLike.slice(0, alsoN).map((t) => <MoodTile key={t.key} compact t={{ ...t, open: () => onTile(t) }} fav={favs.includes(t.key)} onFav={onFav} />)}</DotScroll>
        </div>
      )}

      <div style={{ height: 60 }} />

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
