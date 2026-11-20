// Interface language. English is the source text; French lives in fr.js and anything missing falls back to English.
import { FR } from "./fr.js";
let lang = "en";
try { const l = localStorage.getItem("gp_lang_v1"); if (l === "fr") lang = "fr"; } catch { /* private mode */ }
if (typeof document !== "undefined") document.documentElement.lang = lang;
export const getLang = () => lang;
// A reload applies the change everywhere at once, including labels built at start-up
export function setLang(l) { try { localStorage.setItem("gp_lang_v1", l); } catch { /* full */ } window.location.reload(); }
export const tx = (s) => (lang === "fr" && FR[s] != null ? FR[s] : s);
export const LANGS = [["en", "English"], ["fr", "Français"]];
