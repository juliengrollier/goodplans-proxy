// Owner-only admin: who is registered, how they use the app, and flags waiting for approval.
// Visible only when the signed-in account is the owner (checked on the server); data needs a Google-verified owner token.
import React, { useEffect, useState, useCallback } from "react";
import { tx } from "./i18n.js";
import { API_BASE } from "./images.js";
import { GoogleButton } from "./Quiz.jsx";

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

export default function AdminPanel({ dark }) {
  const [tok, setTok] = useState(getTok);
  const [tab, setTab] = useState("people");
  const [data, setData] = useState(null);
  const [flags, setFlags] = useState(null);
  const [err, setErr] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    if (!tok) return;
    setErr("");
    try {
      const [a, b] = await Promise.all([fetch(`${API_BASE}/api/telemetry?admin=1&t=${encodeURIComponent(tok)}&view=overview&days=${days}`), fetch(`${API_BASE}/api/telemetry?admin=1&t=${encodeURIComponent(tok)}&view=flags`)]);
      if (a.status === 401 || b.status === 401) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setTok(""); return; }
      setData(await a.json()); setFlags((await b.json()).flags || []);
    } catch (e) { setErr(String(e.message || e)); }
  }, [tok, days]);
  useEffect(() => { load(); }, [load]);

  const verify = async () => {
    const cred = window.__gpCred; if (!cred) return;
    const d = await post({ action: "login", credential: cred }).catch(() => ({}));
    if (d.token) { try { localStorage.setItem(KEY, JSON.stringify({ token: d.token, exp: d.exp })); } catch { /* ignore */ } setTok(d.token); } else setErr(tx("That Google account isn't the owner."));
  };
  const review = async (id, set) => {
    await fetch(`${API_BASE}/api/telemetry?admin=1&t=${encodeURIComponent(tok)}&flag=${encodeURIComponent(id)}&set=${set}`);
    setFlags((l) => (l || []).map((f) => (f.id === id ? { ...f, status: set } : f)));
  };

  if (!tok) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{tx("Confirm it's you with Google to see people, activity and flags.")}</div>
        <GoogleButton dark={dark} width={260} onAccount={() => setTimeout(verify, 50)} />
        {err && <div style={{ fontSize: 13, color: "var(--red, #b3261e)" }}>{err}</div>}
      </div>
    );
  }
  const pend = (flags || []).filter((f) => f.status === "pending");
  const chip = (k, l) => <button key={k} className={"chip" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>;
  const stat = (l, v) => <div key={l} className="card-sm" style={{ flex: 1, minWidth: 72, padding: "8px 10px", textAlign: "center" }}><div style={{ fontWeight: 800, fontSize: 18 }}>{v}</div><div className="muted" style={{ fontSize: 11.5 }}>{l}</div></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {chip("people", tx("People"))}{chip("flags", tx("Flags") + (pend.length ? " · " + pend.length : ""))}
        <span style={{ flex: 1 }} />
        <select value={days} onChange={(e) => setDays(+e.target.value)} className="chip" aria-label="days">{[7, 30, 90].map((d) => <option key={d} value={d}>{d} {tx("days")}</option>)}</select>
        <button className="chip" onClick={load}>{tx("Refresh")}</button>
      </div>
      {err && <div style={{ fontSize: 13 }}>{err}</div>}
      {tab === "people" && (!data ? <div className="muted">{tx("Loading…")}</div> : (
        <>
          <div className="row" style={{ gap: 8 }}>{stat(tx("Registered"), data.registered)}{stat(tx("Not signed in"), data.anonymous)}{stat(tx("Active 7 d"), data.active7)}{stat(tx("Active 24 h"), data.active1)}</div>
          {data.people.map((p) => (
            <div key={p.user} className="card-sm" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 14 }}>{p.signedIn ? (p.name || tx("Signed in")) : tx("A phone not signed in")}</b>
                <span className="muted" style={{ fontSize: 12 }}>{tx("last seen")} {ago(p.lastSeen)}</span>
              </div>
              {p.email && <div className="muted ell" style={{ fontSize: 12.5 }}>{p.email}</div>}
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                {p.firstSeen ? tx("joined") + " " + new Date(p.firstSeen).toLocaleDateString() + " · " : ""}{p.sessions} {tx("sessions")} · {p.activeDays} {tx("active days")} · {tx("avg")} {dur(p.avgSessionSec)} · {tx("total")} {dur(p.totalSec)}
              </div>
              <div style={{ fontSize: 13 }}>{p.shown} {tx("seen")} · {p.opened} {tx("opened")} · {p.saved} {tx("saved")} · {p.hearted} {tx("hearted")} · {p.shared} {tx("shared")} · {p.linkClicks} {tx("links")}</div>
            </div>
          ))}
          <div className="muted" style={{ fontSize: 12 }}>{tx("Sessions are counted from when the app is open and visible. People who haven't updated yet only appear once they reopen the app.")}</div>
        </>
      ))}
      {tab === "flags" && (!flags ? <div className="muted">{tx("Loading…")}</div> : !flags.length ? <div className="muted">{tx("No flags.")}</div> : [...flags].reverse().map((f) => (
        <div key={f.id} className="card-sm" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, opacity: f.status === "rejected" ? 0.55 : 1 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 13.5 }}>{f.owner ? tx("You") : f.name || tx("Someone") + " (" + f.user.slice(0, 6) + ")"}</b>
            <span className="muted" style={{ fontSize: 12 }}>{ago(Date.parse(f.at))} · {f.status === "pending" ? tx("waiting for you") : f.status === "rejected" ? tx("rejected") : tx("approved")}</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{f.note}</div>
          <div className="muted ell" style={{ fontSize: 12 }}>{f.title || f.target} · {f.screen}</div>
          {f.status === "pending" && <div className="row" style={{ gap: 8 }}><button className="chip on" onClick={() => review(f.id, "approved")}>{tx("Approve")}</button><button className="chip" onClick={() => review(f.id, "rejected")}>{tx("Reject")}</button></div>}
        </div>
      )))}
      <button className="chip" style={{ alignSelf: "flex-start" }} onClick={() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setTok(""); setData(null); }}>{tx("Lock admin")}</button>
    </div>
  );
}
