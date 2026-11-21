import React, { createContext, useContext, useState } from "react";
import { tx, getLang, setLang, LANGS } from "./i18n.js";
import { Icon } from "./icons.jsx";
import { CatBullet } from "./components.jsx";
import { tasteSummary } from "./engine.js";
import { CATS } from "../lib/core.js";
import AdminPanel from "./AdminPanel.jsx";

const LEVELS = [[tx("Love"), 80], [tx("Like"), 55], [tx("Meh"), 25], [tx("Hide"), 0]];
const levelOf = (v) => (v === 0 ? 3 : v >= 70 ? 0 : v >= 45 ? 1 : 2);

// ── Account: opened from the avatar. A home list of rows, each opening a screen with a back arrow.
const TITLES = { home: "Account", taste: "Your taste", lists: "Your lists", settings: "Settings", account: "Google account", calendar: "Calendar", maps: "Google Maps lists",
  notifications: "Notifications", appearance: "Appearance", language: "Language", location: "Location", feed: "Events feed", advanced: "Advanced", admin: "Admin" };
const ScreenCtx = createContext("");

// Building blocks: a small-caps group label over a rounded card; rows inside are separated by hairlines
function Group({ label, children, foot }) {
  return (
    <section style={{ margin: "0 16px 22px" }}>
      {label && <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: "var(--ink3)", margin: "0 4px 8px" }}>{label}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>{React.Children.toArray(children).filter(Boolean).map((c, i) => <div key={i} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>{c}</div>)}</div>
      {foot && <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: "8px 4px 0" }}>{foot}</div>}
    </section>
  );
}
function Row({ icon, title, sub, value, onClick, danger, badge, right, chevron = true }) {
  const inner = (
    <>
      {icon && <span style={{ width: 32, height: 32, borderRadius: 9, background: danger ? "transparent" : "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: danger ? "#C2412D" : "var(--ink)" }}><Icon name={icon} size={17} /></span>}
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: danger ? "#C2412D" : "var(--ink)" }}>{title}</span>
        {sub && <span className="muted ell" style={{ display: "block", fontSize: 12.5, marginTop: 1 }}>{sub}</span>}
      </span>
      {value != null && <span className="muted ell" style={{ fontSize: 13.5, maxWidth: "45%" }}>{value}</span>}
      {badge > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "#F2611D", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>}
      {right}
      {onClick && chevron && !right && <Icon name="chev" size={15} />}
    </>
  );
  const st = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 52, width: "100%", border: "none", background: "none", color: "var(--ink3)" };
  return onClick ? <button onClick={onClick} style={st}>{inner}</button> : <div style={st}>{inner}</div>;
}
function Toggle({ on }) {
  return (
    <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, background: on ? "var(--navy)" : "var(--line)", position: "relative" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left .15s" }} />
    </span>
  );
}
// A content card inside a screen; its label is dropped when it repeats the screen title
function Card({ title, children, right }) {
  const screen = useContext(ScreenCtx);
  const showTitle = title && title !== screen;
  return (
    <section style={{ margin: "0 16px 22px" }}>
      {(showTitle || right) && <div className="row" style={{ justifyContent: "space-between", gap: 10, margin: "0 4px 8px", minHeight: 20 }}>{showTitle ? <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: "var(--ink3)" }}>{title}</span> : <span />}{right}</div>}
      <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
  );
}
function Avatar({ account, size = 56 }) {
  const g = account?.provider === "google";
  if (g && account.picture) return <img src={account.picture} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0 }} />;
  const i = g ? String(account.name || account.email || "").slice(0, 1).toUpperCase() : "";
  return <span style={{ width: size, height: size, borderRadius: size / 2, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{i || <Icon name="me" size={size * 0.45} />}</span>;
}

export default function Me(p) {
  const { screen = "home", onPush, onBack, onClose, owner, pendingFlags = 0, locLabel } = p;
  const { prof, eprof, taste, setCatLevel, setCatValue, dark, theme, setTheme, unit, setUnit, hiddenCats = [], onShowCat, stars = {}, onUnstar, onUnfollow, onUndo,
    calStatus, busyCount, onCheckCal, calName, notif = {}, perm, onNotifOn, onNotifSet, onNotifTest, onNotifOff, onUnbell,
    backend, setBackend, lastRefreshed, eventCount, onRefresh, refreshing, refreshLog,
    locSt, onRetryGPS, resetTaste, axes, onNudge, quiz, onRetakeQuiz, onTour, maps, mapsBusy, mapsMatches = 0, onImportMaps, onRemoveMaps, learned = {}, cardBusy, onCardRefresh, onMuteLine, onResetLearning } = p;
  const [fine, setFine] = useState(false);
  const [showBackend, setShowBackend] = useState(false);
  const [listSeg, setListSeg] = useState("following");
  const cats = Object.keys(CATS).filter((c) => c !== "Other");
  const hidden = (taste.log || []).filter((l) => l.kind === "nfm" || l.kind === "down").filter((l) => taste.notForMe[l.id] || taste.thumbs[l.id] === -1);
  const follows = Object.entries(taste.follows || {});
  const boosts = [...Object.keys(stars.cats || {}).map((c) => ["cats", c]), ...Object.keys(stars.subs || {}).map((c) => ["subs", c])];
  const g = p.account?.provider === "google";
  const title = tx(TITLES[screen] || "Account");
  const go = (sc) => () => onPush(sc);
  const themeL = { system: tx("System"), light: tx("Light"), dark: tx("Dark") }[theme] || tx("System");
  const notifOn = notif.on && perm === "granted";
  const ver = typeof __BUILD__ !== "undefined" ? new Date(__BUILD__).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "dev";

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)", padding: "calc(10px + env(safe-area-inset-top)) 8px 10px", display: "flex", alignItems: "center", gap: 4, borderBottom: screen === "home" ? "none" : "1px solid var(--line)" }}>
        {screen !== "home" ? <button onClick={onBack} aria-label={tx("Back")} style={{ width: 40, height: 40, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}><Icon name="back" size={22} /></button> : <span style={{ width: 12 }} />}
        <h1 className="disp" style={{ margin: 0, fontSize: screen === "home" ? 30 : 21, flex: 1 }}>{title}</h1>
        <button onClick={onClose} aria-label={tx("Close")} style={{ width: 38, height: 38, borderRadius: 19, border: "none", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", marginRight: 6 }}><Icon name="close" size={17} /></button>
      </div>
      <div style={{ height: 14 }} />
      <ScreenCtx.Provider value={title}>

      {screen === "home" && (<>
        <section style={{ margin: "0 16px 22px" }}>
          <button className="card" onClick={go("account")} style={{ width: "100%", border: "none", padding: 16, display: "flex", alignItems: "center", gap: 14, textAlign: "left", color: "var(--ink)" }}>
            <Avatar account={p.account} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="disp" style={{ display: "block", fontSize: 20 }}>{g ? p.account.name || tx("Signed in") : tx("Not signed in")}</span>
              <span className="muted ell" style={{ display: "block", fontSize: 13.5 }}>{g ? p.account.email : tx("Sign in to keep your taste and plans on every device")}</span>
            </span>
            <Icon name="chev" size={15} />
          </button>
        </section>
        <Group label={tx("You")}>
          <Row icon="spark" title={tx("Your taste")} sub={quiz?.profile?.name || (learned.count || 0) + " " + tx("signals learned")} onClick={go("taste")} />
          <Row icon="list" title={tx("Your lists")} sub={follows.length + " " + tx("followed") + " · " + boosts.length + " " + tx("boosted") + " · " + (hidden.length + hiddenCats.length) + " " + tx("hidden")} onClick={go("lists")} />
        </Group>
        <Group>
          <Row icon="filter" title={tx("Settings")} sub={tx("Connections, alerts, display, data")} onClick={go("settings")} />
          {owner && <Row icon="layer" title={tx("Admin")} sub={tx("People, activity, flags")} badge={pendingFlags} onClick={go("admin")} />}
        </Group>
        <Group>
          {onTour && <Row icon="explore" title={tx("Show the tour")} onClick={onTour} chevron={false} />}
        </Group>
        <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>Good Plans · {tx("Version")} {ver}</div>
      </>)}

      {screen === "account" && (<>
        <section style={{ margin: "6px 16px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <Avatar account={p.account} size={76} />
          <div className="disp" style={{ fontSize: 22 }}>{g ? p.account.name || tx("Signed in") : tx("Not signed in")}</div>
          {g && <div className="muted" style={{ fontSize: 14 }}>{p.account.email}</div>}
        </section>
        <Group foot={g ? tx("Your taste, plans and interests are tied to this Google account. Only your name, email and photo are used.") : tx("Signing in keeps your taste and plans when you switch phones.")}>
          {g ? <Row icon="close" title={tx("Sign out")} danger onClick={() => { if (confirm(tx("Sign out of Good Plans on this phone?"))) p.onSignOut(); }} chevron={false} />
            : <Row icon="me" title={tx("Sign in with Google")} onClick={p.onSignIn} />}
        </Group>
      </>)}

      {screen === "taste" && (<>
      <Card title={tx("What Good Plans has learned")} right={learned.strong >= 5 && <button className="chip" onClick={onCardRefresh} disabled={cardBusy}>{cardBusy ? tx("Writing…") : tx("Refresh")}</button>}>
        {quiz?.profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="disp" style={{ fontSize: 19 }}>{quiz.profile.name}</div>
            {!learned.card?.lines?.length && quiz.profile.lines.map((l) => <div key={l} style={{ fontSize: 15, lineHeight: 1.4 }}>{l}</div>)}
          </div>
        )}
        {learned.card?.lines?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {learned.card.lines.map((l, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ flex: 1, fontSize: 15.5, lineHeight: 1.4 }}>{l.text}</span>
                <button aria-label={tx("Not me: ") + l.text} title={tx("That's not me")} onClick={() => onMuteLine(l)} style={{ border: "none", background: "none", padding: 2, color: "var(--ink3)", flexShrink: 0 }}><Icon name="close" size={15} /></button>
              </div>
            ))}
            <div className="muted" style={{ fontSize: 12.5 }}>{tx("Tap × on a line that isn't you and the app stops using it.")}</div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {learned.strong >= 5 ? (cardBusy ? tx("Writing your taste card…") : tx("Your taste card will appear here shortly.")) : tx("The app learns from what you open, read, save, share and attend, not only thumbs. Your taste card appears after a few saves or thumbs (") + (learned.strong || 0) + " of 5)."}
          </p>
        )}
        <button className="card-sm" aria-pressed={!!p.meet} onClick={() => p.onMeet(!p.meet)} style={{ border: p.meet ? "2px solid var(--navy)" : "2px solid transparent", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, border: p.meet ? "none" : "2px solid var(--line)", background: p.meet ? "var(--navy)" : "transparent", color: "var(--onnavy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.meet && <Icon name="check" size={15} width={3} />}</span>
          <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{tx("I want to meet new people")}<span className="muted" style={{ display: "block", fontSize: 12.5, fontWeight: 500 }}>{tx("Favours classes, clubs and events built for meeting people.")}</span></span>
        </button>
      </Card>
      <Card title={tx("Categories")}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{tasteSummary(eprof, taste, Object.keys(CATS))}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cats.map((c) => {
            const v = prof.categories?.[c] ?? 30, lv = levelOf(v);
            return (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="row" style={{ gap: 10 }}>
                  <CatBullet cat={c} size={28} dark={dark} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{c}</span>
                  <div className="seg" style={{ gridTemplateColumns: "repeat(4,auto)", padding: 3, gap: 2 }}>
                    {LEVELS.map(([l, val], i) => <button key={l} className={lv === i ? "on" : ""} style={{ height: 30, padding: "0 9px", fontSize: 12 }} onClick={() => setCatLevel(c, val)}>{l}</button>)}
                  </div>
                </div>
                {fine && <input type="range" min="0" max="100" value={v} aria-label={c + " weight"} onChange={(e) => setCatValue(c, +e.target.value)} />}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="chip" onClick={() => setFine(!fine)}>{fine ? tx("Hide fine-tune") : tx("Fine-tune")}</button>
          <button className="chip" onClick={resetTaste}>{tx("Reset what it learned")}</button>
        </div>
      </Card>
      {axes && (
        <Card title={tx("Your taste, dimension by dimension")}>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: -4 }}>{tx("How the app reads you so far. Tap ‹ or › to nudge a bar.")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {axes.axes.map((a) => (
              <div key={a.dim} style={{ display: "grid", gridTemplateColumns: "26px 78px 1fr 84px 26px", alignItems: "center", gap: 4 }}>
                <button aria-label={tx("More ") + a.loL} onClick={() => onNudge(a.dim, a.lo, a.hi, -1)} style={{ border: "none", background: "var(--chip)", borderRadius: 13, width: 26, height: 26, fontWeight: 800 }}>‹</button>
                <span style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: a.v != null && a.v < -0.2 ? "var(--ink)" : "var(--ink3)", textAlign: "right" }}>{a.loL}</span>
                <span style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--chip)", margin: "0 6px" }}>
                  <span style={{ position: "absolute", left: "50%", top: -3, width: 2, height: 14, background: "var(--line)" }} />
                  {a.v != null && <span style={{ position: "absolute", top: -4, left: `calc(${50 + a.v * 46}% - 8px)`, width: 16, height: 16, borderRadius: 8, background: "var(--navy)", transition: "left .3s" }} />}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: a.v != null && a.v > 0.2 ? "var(--ink)" : "var(--ink3)" }}>{a.hiL}</span>
                <button aria-label={tx("More ") + a.hiL} onClick={() => onNudge(a.dim, a.lo, a.hi, 1)} style={{ border: "none", background: "var(--chip)", borderRadius: 13, width: 26, height: 26, fontWeight: 800 }}>›</button>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {axes.choices.filter((c) => c.word).map((c) => <span key={c.dim} className="chip" style={{ height: 30, fontSize: 13 }}>{c.label} {c.word}</span>)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{tx("A bar with no dot means there isn't enough to go on yet.")}</div>
        </Card>
      )}
      {p.moodLab && (() => {
        const st = p.moodLab.stats, rate = (o, n) => (n ? Math.round((100 * o) / n) + "%" : "–");
        return (
          <Card title={tx("How your moods learn")}>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginTop: -4 }}>{tx("Every event's activity, keywords, venue, area, price and time become points in a taste map built from")} {p.moodLab.events} {tx("events so far. Things that turn up together sit close; your saves and taps pull moods toward the parts of the map you like.")}</div>
            <div className="row" style={{ gap: 8 }}>
              {[[tx("Shown"), st.shown], [tx("Opened"), st.opened + " · " + rate(st.opened, st.shown)], [tx("Saved from"), st.saved]].map(([l, v]) => (
                <div key={l} className="card-sm" style={{ flex: 1, padding: "10px 12px" }}><div className="muted" style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>{l}</div><div className="disp" style={{ fontSize: 18 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{tx("Discoveries (\"Because you like…\"):")} <b>{st.adjShown}</b> {tx("shown,")} <b>{rate(st.adjOpened, st.adjShown)}</b> {tx("opened,")} <b>{st.adjSaved}</b> saves. <span className="muted">{tx("Last 14 days.")}</span></div>
            {st.top.length > 0 && <div style={{ fontSize: 13, lineHeight: 1.5 }}><span style={{ fontWeight: 800 }}>{tx("Landing best:")} </span>{st.top.map((m) => m.title || m.key).join(" · ")}</div>}
            {p.moodLab.map.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{tx("Your taste map")}</span>
                {p.moodLab.map.map(([a, ns]) => <div key={a} style={{ fontSize: 13, lineHeight: 1.4 }}><b>{a}</b> <span className="muted">→ {ns.join(", ")}</span></div>)}
              </div>
            )}
          </Card>
        );
      })()}
        <Group label={tx("Learning")} foot={tx("The app learns from what you open, read, save, share and attend.")}>
          <Row icon="check" title={tx("Signals learned")} value={(learned.count || 0) + (learned.muted ? " · " + learned.muted + " " + tx("off") : "")} />
          <Row icon="spark" title={quiz ? tx("Retake the quiz") : tx("Take the quiz")} onClick={onRetakeQuiz} />
          <Row icon="refresh" title={tx("Reset learning")} danger chevron={false} onClick={() => { if (confirm(tx("Forget everything learned from your activity? Thumbs, saves and boosts stay."))) onResetLearning(); }} />
        </Group>
      </>)}

      {screen === "lists" && (<>
        <div className="seg" role="tablist" style={{ gridTemplateColumns: "1fr 1fr 1fr", margin: "0 16px 18px" }}>
          {[["following", tx("Following"), follows.length], ["boosted", tx("Boosted"), boosts.length], ["hidden", tx("Hidden"), hidden.length + hiddenCats.length]].map(([k, l, n]) => <button key={k} role="tab" aria-selected={listSeg === k} className={listSeg === k ? "on" : ""} onClick={() => setListSeg(k)}>{l} · {n}</button>)}
        </div>
        {listSeg === "following" && (
          <Group foot={tx("Follow a venue from any event page; its events get a boost.")}>
            {follows.length ? follows.map(([k, label]) => <Row key={k} title={label} right={<button className="chip" onClick={() => onUnfollow(k)}>{tx("Unfollow")}</button>} />) : <Row title={tx("Nothing followed yet")} />}
          </Group>
        )}
        {listSeg === "boosted" && (
          <Group foot={tx("Starred in filters. They rank higher everywhere.")}>
            {boosts.length ? boosts.map(([kind, c]) => <Row key={kind + c} title={"★ " + c} right={<button className="chip" onClick={() => onUnstar(kind, c)}>{tx("Remove")}</button>} />) : <Row title={tx("Nothing boosted yet")} />}
          </Group>
        )}
        {listSeg === "hidden" && (<>
          {hiddenCats.length > 0 && (
            <Group label={tx("Categories")} foot={tx("Kept out of Explore, Map and Top picks, and ranked lower everywhere else.")}>
              {hiddenCats.map((c) => <Row key={c} title={c} right={<button className="chip" onClick={() => onShowCat(c)}>{tx("Show")}</button>} />)}
            </Group>
          )}
          <Group label={tx("Events")}>
            {hidden.length ? hidden.slice(0, 30).map((l) => (
              <Row key={l.id + l.at} title={l.title} sub={l.reason === "far" ? tx("too far") : l.reason === "price" ? tx("too pricey") : l.reason === "seen" ? tx("seen it") : l.reason === "notus" ? tx("not our thing") : tx("less like this")}
                right={<button className="chip" onClick={() => onUndo(l)}>{tx("Undo")}</button>} />
            )) : <Row title={tx("Nothing hidden")} />}
          </Group>
        </>)}
      </>)}

      {screen === "settings" && (<>
        <Group label={tx("Account")}>
          <Row icon="me" title={tx("Google account")} value={g ? p.account.email : tx("Not signed in")} onClick={go("account")} />
        </Group>
        <Group label={tx("Connections")}>
          <Row icon="cal" title={tx("Calendar")} value={calStatus === "ok" ? tx("Connected") : calStatus === "checking" ? tx("Checking…") : tx("Not connected")} onClick={go("calendar")} />
          <Row icon="map" title={tx("Google Maps lists")} value={maps?.lists?.length ? maps.lists.length + " " + (maps.lists.length === 1 ? tx("list") : tx("lists")) : tx("Not imported")} onClick={go("maps")} />
        </Group>
        <Group label={tx("Alerts")}>
          <Row icon="bell" title={tx("Notifications")} value={notifOn ? tx("On") : tx("Off")} onClick={go("notifications")} />
        </Group>
        <Group label={tx("Display and place")}>
          <Row icon="sun" title={tx("Appearance")} value={themeL + " · °" + unit} onClick={go("appearance")} />
          <Row icon="spark" title={tx("Language")} value={(LANGS.find(([k]) => k === getLang()) || [])[1]} onClick={go("language")} />
          <Row icon="pin" title={tx("Location")} value={locLabel} onClick={go("location")} />
        </Group>
        <Group label={tx("Data")}>
          <Row icon="refresh" title={tx("Events feed")} value={eventCount + " " + tx("events")} onClick={go("feed")} />
        </Group>
        <Group label={tx("Advanced")}>
          {p.onDevMode && <Row icon="filter" title={tx("Developer mode")} sub={tx("Flag any element to report a problem")} onClick={p.onDevMode} right={<Toggle on={!!p.devMode} />} />}
          <Row icon="link" title={tx("Classic app")} sub={tx("Sync tools, enrichment, debug")} onClick={() => { window.location.href = "/?classic=1"; }} />
        </Group>
      </>)}

      {screen === "calendar" && (<>
      <Card title={tx("Calendar")}>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>
          {calStatus === "ok" ? `${tx("Connected")}${calName ? " (" + calName + ")" : ""} · ${busyCount} ${busyCount === 1 ? tx("busy slot") : tx("busy slots")} ${tx("in the next 3 weeks. Used for clash dimming and “free until”.")}` :
            calStatus === "checking" ? tx("Checking…") : calStatus === "unauth" ? tx("Your Apps Script needs Calendar permission (run it once from script.google.com).") :
            tx("Reads busy times through your Apps Script backend. No event details leave Google.")}
        </span>
        <button className="pill pill-line" onClick={onCheckCal}><Icon name="refresh" size={18} /> {calStatus === "ok" ? tx("Check again") : tx("Connect calendar")}</button>
      </Card>
      </>)}
      {screen === "maps" && (<>
      <Card title={tx("Google Maps lists")}>
        {maps?.lists?.length ? (
          <>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{maps.lists.length} {tx("lists ·")} {maps.lists.reduce((a, l) => a + l.places.length, 0)} places. <b>{mapsMatches}</b> {tx("upcoming events are at places you saved.")}</div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{maps.lists.slice(0, 12).map((l) => <span key={l.name} className="chip" style={{ height: 30, fontSize: 13 }}>{l.name} · {l.places.length}</span>)}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{tx("Imported")} {new Date(maps.at).toLocaleDateString()}{maps.themes ? " · themes learned" : ""}{tx(". Re-import a fresh export now and then to keep it current.")}</div>
          </>
        ) : (
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{tx("Events at places you saved in Google Maps get a boost, and your lists teach the app your taste. Export them at")} <b>takeout.google.com</b>{tx(": deselect all, tick")} <b>{tx("Saved")}</b> and <b>{tx("Maps (your places)")}</b>{tx(", then pick the .zip here.")}</div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <label className="pill pill-dark" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", opacity: mapsBusy ? 0.6 : 1 }}>
            {mapsBusy ? tx("Reading…") : maps ? tx("Re-import") : tx("Import Takeout file")}
            <input type="file" accept=".zip,.csv,.json,.geojson" multiple style={{ display: "none" }} disabled={mapsBusy} onChange={(e) => { onImportMaps(e.target.files); e.target.value = ""; }} />
          </label>
          {maps && <button className="chip" onClick={onRemoveMaps}>{tx("Remove")}</button>}
        </div>
      </Card>
      </>)}
      {screen === "notifications" && (<>
      <Card title={tx("Notifications")}>
        {perm === "unsupported" ? (
          <span style={{ fontSize: 14, color: "var(--ink2)" }}>{tx("This browser can't get notifications. On iPhone, add Good Plans to the Home Screen and open it from there.")}</span>
        ) : !notif.on || perm !== "granted" ? (
          <>
            <span style={{ fontSize: 14, color: "var(--ink2)" }}>{perm === "denied" ? tx("Blocked for Good Plans in your phone settings. Allow notifications there, then tap below.") : tx("Reminders before your saved plans, and new events for the things you bell.")}</span>
            <button className="pill pill-dark" onClick={onNotifOn}><Icon name="bell" size={18} /> {tx("Turn on notifications")}</button>
          </>
        ) : (
          <>
            {[["reminders", tx("Saved plans"), tx("A reminder a couple of hours before, with when to leave. Also when the time or venue changes, and when a long run is about to end.")],
              ["digest", tx("New for your bells"), tx("At most one notification a day with new events for the interests, venues and series you bell.")]].map(([k, l, d]) => (
              <button key={k} role="switch" aria-checked={notif[k] !== false} onClick={() => onNotifSet({ [k]: notif[k] === false })} className="row" style={{ gap: 12, border: "none", background: "none", padding: 0, textAlign: "left", alignItems: "flex-start", color: "var(--ink)" }}>
                <span style={{ flex: 1 }}><span className="disp" style={{ fontSize: 16, display: "block" }}>{l}</span><span className="muted" style={{ fontSize: 13 }}>{d}</span></span>
                <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, background: notif[k] !== false ? "var(--navy)" : "var(--line)", position: "relative", marginTop: 2 }}>
                  <span style={{ position: "absolute", top: 3, left: notif[k] !== false ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left .15s" }} />
                </span>
              </button>
            ))}
            {notif.digest !== false && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 13, fontWeight: 700, marginRight: 4 }}>{tx("Daily bundle at")}</span>
                {[[9, tx("Morning")], [12, tx("Lunch")], [17, tx("Evening")]].map(([h, l]) => <button key={h} className={"chip" + ((notif.digestAt ?? 12) === h ? " on" : "")} style={{ height: 32 }} onClick={() => onNotifSet({ digestAt: h })}>{l}</button>)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="disp" style={{ fontSize: 16 }}>{tx("Your bells")}</span>
              {Object.values(notif.bells || {}).length ? (
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {Object.values(notif.bells).map((b) => <button key={b.key} className="chip" style={{ height: 32 }} onClick={() => onUnbell(b.key)} aria-label={tx("Remove bell: ") + b.label}><Icon name="bell" size={14} fill="currentColor" /> {b.label} <Icon name="close" size={13} /></button>)}
                </div>
              ) : <span className="muted" style={{ fontSize: 13 }}>{tx("None yet. Ring the bell on a tile in My Interests, or on a venue or series on an event page.")}</span>}
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>{tx("Paused automatically while your phone is on another time zone than New York. Quiet at night.")}</span>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="pill pill-line" style={{ height: 38, fontSize: 14 }} onClick={onNotifOff}>{tx("Turn off on this phone")}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="disp" style={{ fontSize: 16 }}>{tx("Send a test")}</span>
              <span className="muted" style={{ fontSize: 13 }}>{tx("Shows each kind of notification on this phone, using one of your saved plans when you have one.")}</span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {[["basic", tx("Welcome")], ["reminder", tx("Reminder")], ["evening", tx("Evening before")], ["ends", tx("Ends soon")], ["change", tx("Time change")], ["digest", tx("New for you")]].map(([k, l]) => <button key={k} className="chip" style={{ height: 34 }} onClick={() => onNotifTest(k)}>{l}</button>)}
              </div>
            </div>
          </>
        )}
      </Card>
      </>)}
      {screen === "appearance" && (<>
      <Card title={tx("Theme and units")}>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {[["system", tx("System")], ["light", tx("Light")], ["dark", tx("Dark")]].map(([k, l]) => <button key={k} className={theme === k ? "on" : ""} onClick={() => setTheme(k)}>{l}</button>)}
        </div>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          {[["C", tx("Celsius")], ["F", tx("Fahrenheit")]].map(([k, l]) => <button key={k} className={unit === k ? "on" : ""} onClick={() => setUnit(k)}>{l}</button>)}
        </div>
      </Card>
      </>)}
      {screen === "language" && (<>
      <Card title={tx("Language")}>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {LANGS.map(([k, l]) => <button key={k} lang={k} className={getLang() === k ? "on" : ""} onClick={() => { if (getLang() !== k) setLang(k); }}>{l}</button>)}
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{tx("Menus, buttons and messages. Event titles, categories and neighbourhood notes stay in English for now.")}</div>
      </Card>
      </>)}
      {screen === "location" && (<>
      <Card title={tx("Location")}>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{locSt === "ok" ? tx("Using your live location.") : locSt === "cached" ? tx("Using your last known location.") : locSt === "locating" ? tx("Locating…") : tx("Using the Lower East Side as home. Allow location for “nearby” picks.")}</span>
        <button className="pill pill-line" onClick={onRetryGPS}><Icon name="pin" size={18} /> {tx("Update my location")}</button>
      </Card>
      </>)}
      {screen === "feed" && (<>
      <Card title={tx("Events feed")} right={<span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{eventCount} {tx("events")}</span>}>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{tx("Last refreshed")} {lastRefreshed ? new Date(lastRefreshed).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "never"}{tx(". Refreshes on its own every 6 hours.")}</span>
        <button className="pill pill-dark" onClick={onRefresh} disabled={refreshing}><Icon name="refresh" size={18} /> {refreshing ? tx("Refreshing…") : tx("Refresh now")}</button>
        {refreshLog && <span className="muted" style={{ fontSize: 13 }}>{refreshLog}</span>}
        <button className="chip" style={{ alignSelf: "flex-start" }} onClick={() => setShowBackend(!showBackend)}>{showBackend ? tx("Hide backend settings") : tx("Backend settings")}</button>
        {showBackend && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 800 }} className="muted">{tx("Apps Script URL")}</label>
            <input className="input" value={backend.url} onChange={(e) => setBackend({ ...backend, url: e.target.value.trim() })} />
            <label style={{ fontSize: 12, fontWeight: 800 }} className="muted">{tx("Secret key")}</label>
            <input className="input" type="password" value={backend.key} onChange={(e) => setBackend({ ...backend, key: e.target.value.trim() })} />
          </div>
        )}
      </Card>
      </>)}
      {screen === "admin" && owner && <section style={{ margin: "0 16px" }}><AdminPanel dark={dark} /></section>}
      </ScreenCtx.Provider>
    </div>
  );
}
