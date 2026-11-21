// Owner-only admin: who is registered, how they use the app, and flags waiting for approval.
// Visible only when the signed-in account is the owner (checked on the server); data needs a Google-verified owner token.
import React, { useEffect, useState, useCallback } from "react";
import { tx } from "./i18n.js";
import { API_BASE } from "./images.js";
import { GoogleButton } from "./Quiz.jsx";
import { Icon } from "./icons.jsx";

const KEY = "gp_admin_v1";
const getTok = () => { try { const t = JSON.parse(localStorage.getItem(KEY) || "null"); return t && t.exp > Date.now() ? t.token : ""; } catch { return ""; } };
const ago = (t) => { if (!t) return "–"; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? tx("now") : m < 90 ? m + " min" : m < 2880 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " d"; };
const dur = (s) => (s == null ? "–" : s < 90 ? s + " s" : Math.round(s / 60) + " min");
const post = (b) => fetch(API_BASE + "/api/telemetry?admin=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json().then((d) => ({ ok: r.ok, ...d })));

export function useIsOwner(account) {
  const [yes, setYes] = useState(false);
  useEffect(() => {
    if (!account?.email) { setYes(false); return; }
    let on = true; post({ action: "isadmin", email: account.email }).then((d) => on && setYes(!!d.admin)).catch(() => {});
    return () => { on = false; };
  }, [account?.email]);
  return yes;
}

// Owner badge: number of flags from other people waiting for review (needs the owner token from a previous Admin visit)
export function usePendingFlags(owner) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = getTok(); if (!owner || !t) { setN(0); return undefined; }
    let on = true;
    const load = () => fetch(`${API_BASE}/api/telemetry?admin=1&t=${encodeURIComponent(t)}&view=flags`).then((r) => r.json()).then((d) => on && setN((d.flags || []).filter((f) => f.status === "pending").length)).catch(() => {});
    load(); const iv = setInterval(load, 300000);
    return () => { on = false; clearInterval(iv); };
  }, [owner]);
  return n;
}

export default function AdminPanel({ dark }) {
  const [tok, setTok] = useState(getTok);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [flags, setFlags] = useState(null);
  const [srcs, setSrcs] = useState(null);
  const [err, setErr] = useState("");
  const [days, setDays] = useState(30);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState("");
  const [flagView, setFlagView] = useState("pending");

  const load = useCallback(async () => {
    if (!tok) return;
    setErr("");
    const T = encodeURIComponent(tok);
    try {
      const [a, b, c] = await Promise.all([fetch(`${API_BASE}/api/telemetry?admin=1&t=${T}&view=overview&days=${days}`), fetch(`${API_BASE}/api/telemetry?admin=1&t=${T}&view=flags`), fetch(`${API_BASE}/api/ingest?status=1&t=${T}`)]);
      if (a.status === 401 || b.status === 401) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setTok(""); return; }
      setData(await a.json()); setFlags((await b.json()).flags || []); setSrcs(c.ok ? await c.json() : []);
    } catch (e) { setErr(String(e.message || e)); }
  }, [tok, days]);
  useEffect(() => { load(); }, [load]);

  const verify = async () => {
    const cred = window.__gpCred; if (!cred) return;
    const d = await post({ action: "login", credential: cred }).catch(() => ({}));
    if (d.token) { try { localStorage.setItem(KEY, JSON.stringify({ token: d.token, exp: d.exp })); } catch { /* ignore */ } setTok(d.token); } else setErr(tx("That Google account isn't the owner."));
  };
  const review = async (id, set) => {
    setFlags((l) => (l || []).map((f) => (f.id === id ? { ...f, status: set } : f)));
    await fetch(`${API_BASE}/api/telemetry?admin=1&t=${encodeURIComponent(tok)}&flag=${encodeURIComponent(id)}&set=${set}`).catch(() => {});
  };

  const label = (t) => <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: "var(--ink3)", margin: "4px 4px 8px" }}>{t}</div>;
  const box = { padding: 0, overflow: "hidden" };
  const line = (i) => ({ borderTop: i ? "1px solid var(--line)" : "none", padding: "12px 14px" });

  if (!tok) {
    return (
      <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="disp" style={{ fontSize: 18 }}>{tx("Confirm it's you")}</div>
        <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>{tx("Admin data is only shown after Google confirms the owner account. You stay unlocked on this phone for 30 days.")}</div>
        <GoogleButton dark={dark} width={260} onAccount={() => setTimeout(verify, 50)} />
        {err && <div style={{ fontSize: 13, color: "#C2412D" }}>{err}</div>}
      </div>
    );
  }
  const pend = (flags || []).filter((f) => f.status === "pending");
  const people = (data?.people || []).filter((p) => p.user !== "ptest").filter((p) => !q || (p.name + " " + p.email + " " + p.user).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "active" ? b.opened + b.saved * 3 + b.activeDays * 5 - (a.opened + a.saved * 3 + a.activeDays * 5) : (b.lastSeen || 0) - (a.lastSeen || 0)));
  const stat = (l, v, sub) => <div className="card" style={{ flex: "1 1 40%", padding: "12px 14px" }}><div className="disp" style={{ fontSize: 24 }}>{v ?? "–"}</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{l}</div>{sub && <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>}</div>;
  const who = (p) => (p.signedIn ? p.name || p.email || tx("Signed-in account") : tx("Phone not signed in") + " · " + p.user.slice(1, 5));
  const daily = data?.daily || [], maxU = Math.max(1, ...daily.map((d) => d.users)), maxO = Math.max(1, ...daily.map((d) => d.opens));
  const srcBad = (srcs || []).filter((x) => !x.off && x.at && !x.ok).length;
  const fl = (flags || []).filter((f) => (flagView === "pending" ? f.status === "pending" : true)).slice().reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="seg" role="tablist" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[["overview", tx("Overview")], ["people", tx("People")], ["flags", tx("Flags") + (pend.length ? " · " + pend.length : "")], ["sources", tx("Sources") + (srcBad ? " · !" : "")]].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} style={{ fontSize: 13 }}>{l}</button>)}
      </div>
      {err && <div style={{ fontSize: 13, color: "#C2412D" }}>{err}</div>}

      {tab === "overview" && (!data ? <div className="muted">{tx("Loading…")}</div> : (<>
        <div className="row" style={{ justifyContent: "space-between" }}>
          {label(tx("Last") + " " + days + " " + tx("days"))}
          <div className="row" style={{ gap: 6 }}>{[7, 30, 90].map((d) => <button key={d} className={"chip" + (days === d ? " on" : "")} style={{ height: 30 }} onClick={() => setDays(d)}>{d} d</button>)}<button className="chip" style={{ height: 30 }} onClick={load} aria-label={tx("Refresh")}><Icon name="refresh" size={14} /></button></div>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {stat(tx("Registered"), data.registered, data.anonymous + " " + tx("not signed in"))}
          {stat(tx("Active today"), data.active1, data.active7 + " " + tx("this week"))}
          {stat(tx("Events opened"), people.reduce((a, p) => a + p.opened, 0), people.reduce((a, p) => a + p.shown, 0) + " " + tx("seen"))}
          {stat(tx("Saved · hearted"), people.reduce((a, p) => a + p.saved, 0) + " · " + people.reduce((a, p) => a + p.hearted, 0), people.reduce((a, p) => a + p.shared, 0) + " " + tx("shared"))}
        </div>
        {daily.length > 1 && (
          <div className="card" style={{ padding: "14px 14px 10px" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}><b style={{ fontSize: 13.5 }}>{tx("Daily activity")}</b><span className="muted" style={{ fontSize: 12 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--navy)" }} /> {tx("people")}  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#F2611D", marginLeft: 8 }} /> {tx("opens")}</span></div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }}>
              {daily.slice(-30).map((d) => (
                <div key={d.day} title={d.day + ": " + d.users + " people, " + d.opens + " opens"} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 1, height: "100%" }}>
                  <span style={{ flex: 1, height: Math.max(3, (d.users / maxU) * 100) + "%", background: "var(--navy)", borderRadius: 2 }} />
                  <span style={{ flex: 1, height: Math.max(2, (d.opens / maxO) * 100) + "%", background: "#F2611D", borderRadius: 2 }} />
                </div>
              ))}
            </div>
            <div className="row muted" style={{ justifyContent: "space-between", fontSize: 11, marginTop: 4 }}><span>{daily.slice(-30)[0]?.day.slice(5)}</span><span>{daily[daily.length - 1]?.day.slice(5)}</span></div>
          </div>
        )}
        {(pend.length > 0 || srcBad > 0) && (
          <div className="card" style={box}>
            {pend.length > 0 && <button onClick={() => setTab("flags")} className="row" style={{ ...line(0), width: "100%", border: "none", background: "none", color: "var(--ink)", gap: 10 }}><b style={{ flex: 1, textAlign: "left" }}>{pend.length} {tx("flags waiting for you")}</b><Icon name="chev" size={14} /></button>}
            {srcBad > 0 && <button onClick={() => setTab("sources")} className="row" style={{ ...line(pend.length ? 1 : 0), width: "100%", border: "none", background: "none", color: "var(--ink)", gap: 10 }}><b style={{ flex: 1, textAlign: "left" }}>{srcBad} {tx("sources failing")}</b><Icon name="chev" size={14} /></button>}
          </div>
        )}
      </>))}

      {tab === "people" && (!data ? <div className="muted">{tx("Loading…")}</div> : (<>
        <div className="row" style={{ gap: 8 }}>
          <label className="row" style={{ flex: 1, gap: 8, height: 38, padding: "0 12px", borderRadius: 19, background: "var(--chip)", minWidth: 0 }}>
            <Icon name="search" size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Search name or email")} style={{ border: "none", outline: "none", background: "none", flex: 1, minWidth: 0, fontSize: 14, color: "var(--ink)" }} />
          </label>
          <select className="chip" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={tx("Sort")} style={{ height: 34 }}><option value="recent">{tx("Recent")}</option><option value="active">{tx("Most active")}</option></select>
        </div>
        <div className="card" style={box}>
          {people.length ? people.map((p, i) => (
            <div key={p.user} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
              <button onClick={() => setOpen(open === p.user ? "" : p.user)} className="row" style={{ width: "100%", border: "none", background: "none", padding: "12px 14px", gap: 12, color: "var(--ink)", textAlign: "left" }}>
                <span style={{ width: 34, height: 34, borderRadius: 17, background: p.signedIn ? "var(--navy)" : "var(--chip)", color: p.signedIn ? "var(--onnavy, #fff)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{p.signedIn ? (p.name || p.email || "?").slice(0, 1).toUpperCase() : <Icon name="me" size={16} />}</span>
                <span style={{ flex: 1, minWidth: 0 }}><b className="ell" style={{ display: "block", fontSize: 14.5 }}>{who(p)}</b><span className="muted ell" style={{ display: "block", fontSize: 12.5 }}>{p.email || p.opened + " " + tx("opened") + " · " + p.saved + " " + tx("saved")}</span></span>
                <span className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{ago(p.lastSeen)}</span>
              </button>
              {open === p.user && (
                <div style={{ padding: "0 14px 14px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13 }}>
                  {[[tx("Joined"), p.firstSeen ? new Date(p.firstSeen).toLocaleDateString() : "–"], [tx("Last seen"), ago(p.lastSeen)], [tx("Sessions"), p.sessions], [tx("Active days"), p.activeDays], [tx("Avg session"), dur(p.avgSessionSec)], [tx("Total time"), dur(p.totalSec)],
                    [tx("Seen"), p.shown], [tx("Opened"), p.opened + (p.shown ? " · " + Math.round((100 * p.opened) / p.shown) + "%" : "")], [tx("Saved"), p.saved], [tx("Hearted"), p.hearted], [tx("Shared"), p.shared], [tx("Link clicks"), p.linkClicks], [tx("Dismissed"), p.dismissed], [tx("Devices"), p.devices || "–"]].map(([k, v]) => (
                    <div key={k}><span className="muted" style={{ fontSize: 11.5, display: "block" }}>{k}</span><b>{v}</b></div>
                  ))}
                </div>
              )}
            </div>
          )) : <div style={line(0)} className="muted">{tx("No one matches.")}</div>}
        </div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>{tx("Sessions, names and join dates fill in as people open the updated app. Activity covers the last")} {days} {tx("days")}.</div>
      </>))}

      {tab === "flags" && (!flags ? <div className="muted">{tx("Loading…")}</div> : (<>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[["pending", tx("Waiting") + " · " + pend.length], ["all", tx("All") + " · " + flags.length]].map(([k, l]) => <button key={k} className={flagView === k ? "on" : ""} onClick={() => setFlagView(k)}>{l}</button>)}
        </div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{tx("Flags from other people are only worked on after you approve them. Yours are approved automatically.")}</div>
        {!fl.length ? <div className="card" style={{ padding: 18 }}><span className="muted">{flagView === "pending" ? tx("Nothing waiting.") : tx("No flags.")}</span></div> : (
          <div className="card" style={box}>
            {fl.map((f, i) => (
              <div key={f.id} style={{ ...line(i), display: "flex", flexDirection: "column", gap: 6, opacity: f.status === "rejected" ? 0.55 : 1 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{f.owner ? tx("You") : f.name || tx("Someone") + " · " + f.user.slice(1, 5)}</b>
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: f.status === "pending" ? "#FDE7DC" : "var(--chip)", color: f.status === "pending" ? "#B4461A" : "var(--ink3)" }}>{f.status === "pending" ? tx("Waiting") : f.status === "rejected" ? tx("Rejected") : tx("Approved")}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{f.note}</div>
                <div className="muted ell" style={{ fontSize: 12 }}>{ago(Date.parse(f.at))} · {f.title || f.target} · {f.screen}</div>
                {f.status === "pending" && <div className="row" style={{ gap: 8, marginTop: 2 }}><button className="pill pill-dark" style={{ height: 34, padding: "0 16px" }} onClick={() => review(f.id, "approved")}>{tx("Approve")}</button><button className="pill pill-line" style={{ height: 34, padding: "0 16px" }} onClick={() => { if (confirm(tx("Reject this flag? It won't be worked on."))) review(f.id, "rejected"); }}>{tx("Reject")}</button></div>}
              </div>
            ))}
          </div>
        )}
      </>))}

      {tab === "sources" && (!srcs ? <div className="muted">{tx("Loading…")}</div> : (<>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {stat(tx("Live sources"), srcs.filter((x) => !x.off).length, srcs.filter((x) => x.off).length + " " + tx("paused"))}
          {stat(tx("Events from them"), srcs.reduce((a, x) => a + (x.off ? 0 : x.count || 0), 0), srcBad ? srcBad + " " + tx("failing") : tx("all healthy"))}
        </div>
        <div className="card" style={box}>
          {srcs.slice().sort((a, b) => (!!a.off - !!b.off) || (b.count || 0) - (a.count || 0)).map((x, i) => (
            <div key={x.id} className="row" style={{ ...line(i), gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, flexShrink: 0, background: x.off ? "var(--line)" : !x.at ? "#E6B422" : x.ok ? "#2E9E5B" : "#C2412D" }} />
              <span style={{ flex: 1, minWidth: 0 }}><b className="ell" style={{ display: "block", fontSize: 14 }}>{x.name || x.id}</b><span className="muted ell" style={{ display: "block", fontSize: 12 }}>{x.off ? tx("Paused: ") + x.off : x.err ? x.err : (x.how || "–") + " · " + x.cadence + " · " + (x.at ? ago(Date.parse(x.at)) : tx("not run yet"))}</span></span>
              <b style={{ fontSize: 14 }}>{x.off ? "" : x.count ?? "–"}</b>
            </div>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>{tx("Direct sources only. Newsletter events from the Apps Script feed are not listed here.")}</div>
      </>))}

      <button className="chip" style={{ alignSelf: "center" }} onClick={() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setTok(""); setData(null); }}>{tx("Lock admin on this phone")}</button>
    </div>
  );
}
