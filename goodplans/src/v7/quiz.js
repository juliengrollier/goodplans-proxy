// Onboarding quiz: 9 everyday situations, most with several picks allowed. Each answer seeds the taste model's features at "first guess"
// strength (real behaviour overrides it within days), plus price and distance sensitivity in the older taste layer.
import {
  Utensils, Drama, Sparkles, Sofa, Wine, Warehouse, Trees, Landmark, Laugh, Guitar, Dices, Ghost, Music4,
  Footprints, ShoppingBasket, Volleyball, GraduationCap, Scissors, Activity, Clapperboard, PartyPopper, User, Heart, Users,
  Moon, Sunset, Clock, CalendarDays, Zap, Wallet, BadgeDollarSign, Gem, MapPin, TrainFront, Globe, Coffee, Timer, BedDouble, CircleSlash,
} from "lucide";

// f: feature weights (names as in learn.js features()); price / far: older taste sensitivities (0–3)
// multi: pick as many as fit; each picked card counts at 1/sqrt(n) so picking everything doesn't shout
export const QUESTIONS = [
  { id: "friday", multi: true, q: "Friday, 7pm, you're free. What sounds good?", opts: [
    { l: "Dinner and drinks", i: Utensils, f: { "fam:eat": 0.6, "dim:food=food": 0.5, "dim:food=drinks": 0.3, "dim:social=group": 0.3, "dim:energy=lively": 0.3 } },
    { l: "A show", i: Drama, f: { "fam:watch": 0.6, "dim:mode=watch": 0.5 } },
    { l: "Something I've never done", i: Sparkles, f: { "dim:novelty=weird": 0.6, "len:oneoff": 0.4, "dim:novelty=classic": -0.3 } },
    { l: "A classic I know I'll love", i: Landmark, f: { "dim:novelty=classic": 0.6, "dim:polish=polished": 0.3 } },
    { l: "Dancing until late", i: PartyPopper, f: { "fam:party": 0.6, "dim:energy=wild": 0.5, "tod:late": 0.5, "dim:body=on-your-feet": 0.3 } },
    { l: "A quiet night in, honestly", i: Sofa, f: { "dim:energy=calm": 0.5, "dim:energy=wild": -0.5, "x:weekend&late": -0.3 } },
  ] },
  { id: "room", multi: true, q: "Which rooms sound like you?", opts: [
    { l: "Tiny basement, 30 people", i: Wine, f: { "dim:crowd=intimate": 0.7, "dim:scene=underground": 0.4, "dim:crowd=big": -0.3, "dim:scene=indie": 0.3, "dim:audience=21+": 0.2 } },
    { l: "Packed warehouse", i: Warehouse, f: { "dim:crowd=big": 0.6, "dim:energy=wild": 0.5, "dim:noise=loud": 0.4, "dim:body=on-your-feet": 0.3, "dim:audience=21+": 0.3 } },
    { l: "Park crowd at sunset", i: Trees, f: { "dim:setting=outdoor": 0.7, "dim:energy=lively": 0.3 } },
    { l: "Quiet gallery", i: Landmark, f: { "dim:noise=quiet": 0.6, "dim:energy=calm": 0.4, "fam:explore": 0.4, "dim:polish=polished": 0.2, "dim:tone=thoughtful": 0.2 } },
    { l: "Dressed-up cocktail bar", i: Wine, f: { "dim:polish=upscale": 0.6, "dim:audience=21+": 0.4, "dim:food=drinks": 0.4, "dim:scene=mainstream": 0.2 } },
    { l: "Scrappy DIY space", i: Warehouse, f: { "dim:polish=diy": 0.6, "dim:scene=underground": 0.5, "dim:scene=mainstream": -0.3 } },
  ] },
  { id: "tickets", multi: true, q: "A friend has free tickets for tonight. You'd hope for…", opts: [
    { l: "Comedy", i: Laugh, f: { "cat:comedy": 0.8 } },
    { l: "A concert", i: Guitar, f: { "cat:concerts": 0.8 } },
    { l: "Theatre", i: Drama, f: { "cat:theater": 0.8 } },
    { l: "A film", i: Clapperboard, f: { "cat:film": 0.8 } },
    { l: "A game night", i: Dices, f: { "fam:play": 0.7 } },
    { l: "A live sports game", i: Volleyball, f: { "cat:live sports": 0.8, "dim:crowd=big": 0.2 } },
  ] },
  { id: "saturday", multi: true, q: "Sunny Saturday afternoon. You'd…", opts: [
    { l: "Wander a neighbourhood", i: Footprints, f: { "fam:explore": 0.6, "dim:setting=outdoor": 0.4 } },
    { l: "Hit a market", i: ShoppingBasket, f: { "cat:markets": 0.7, "cat:food markets & pop-ups": 0.4 } },
    { l: "Join a pickup game", i: Volleyball, f: { "fam:move": 0.7, "dim:body=active": 0.5 } },
    { l: "Visit a museum", i: Landmark, f: { "cat:museums & galleries": 0.8 } },
    { l: "Make a whole afternoon of it", i: Sunset, f: { "dim:length=half-day+": 0.6, "dim:length=quick": -0.2 } },
    { l: "Stretch out a long brunch", i: Coffee, f: { "dim:food=food": 0.4, "x:weekend&morning": 0.4, "dim:energy=calm": 0.2 } },
  ] },
  { id: "mode", multi: true, q: "The best nights, you…", opts: [
    { l: "Learn something", i: GraduationCap, f: { "fam:learn": 0.7, "dim:tone=thoughtful": 0.4 } },
    { l: "Make something", i: Scissors, f: { "fam:make": 0.7, "dim:mode=take-part": 0.5 } },
    { l: "Move", i: Activity, f: { "fam:move": 0.6, "dim:body=active": 0.6 } },
    { l: "Watch", i: Clapperboard, f: { "fam:watch": 0.5, "dim:mode=watch": 0.5, "dim:body=seated": 0.3 } },
    { l: "Dance", i: PartyPopper, f: { "fam:party": 0.7, "dim:body=on-your-feet": 0.5 } },
    { l: "Meet people", i: Users, f: { "dim:mode=mingle": 0.6, "dim:social=group": 0.3 } },
  ] },
  { id: "outing", multi: true, q: "Your usual outing is…", opts: [
    { l: "Solo, and happy about it", i: User, f: { "dim:social=solo-friendly": 0.7 } },
    { l: "A date", i: Heart, f: { "dim:social=date": 0.7, "dim:tone=romantic": 0.3 } },
    { l: "With a group", i: Users, f: { "dim:social=group": 0.7 } },
    { l: "Quick and close to home", i: Timer, f: { "dim:length=quick": 0.6, "dist:near": 0.4 } },
    { l: "A full evening", i: Moon, f: { "dim:length=evening": 0.5, "tod:evening": 0.4 } },
    { l: "Out past midnight", i: Clock, f: { "tod:late": 0.6, "x:weekend&late": 0.4, "dim:audience=21+": 0.3, "dim:audience=kids": -0.3 } },
  ] },
  { id: "tone", multi: true, q: "The best things you've seen lately made you…", opts: [
    { l: "Laugh", i: Laugh, f: { "dim:tone=fun": 0.6 } },
    { l: "Cry a little", i: Drama, f: { "dim:tone=moving": 0.6 } },
    { l: "Think", i: GraduationCap, f: { "dim:tone=thoughtful": 0.6 } },
    { l: "Fall in love a bit", i: Heart, f: { "dim:tone=romantic": 0.6 } },
  ] },
  { id: "spend", q: "What feels right for the ticket or entry itself?", hint: "Just the ticket or cover. Not drinks, food or getting there.", opts: [
    { l: "Free, ideally", i: CircleSlash, f: { "price:free": 0.7, "price:high": -0.5 }, price: 2 },
    { l: "Up to $20", i: Wallet, f: { "price:cheap": 0.5, "price:free": 0.3, "price:high": -0.3 }, price: 1 },
    { l: "Up to $50", i: BadgeDollarSign, f: { "price:mid": 0.4 } },
    { l: "Whatever, if it's great", i: Gem, f: { "price:high": 0.3, "dim:polish=upscale": 0.3, "dim:polish=polished": 0.2 } },
  ] },
  { id: "far", q: "How far will you travel for it?", opts: [
    { l: "Walking distance", i: MapPin, f: { "dist:near": 0.7, "dist:far": -0.6 }, far: 2 },
    { l: "About 20 minutes", i: TrainFront, f: { "dist:mid": 0.3, "dist:far": -0.3 }, far: 1 },
    { l: "Anywhere for the right thing", i: Globe, f: {} },
  ] },
];
export const QUIZ_VERSION = 2;
// Answers are lists of option numbers (older saves held a single number)
export const picked = (a) => (Array.isArray(a) ? a : a == null ? [] : [a]);
// Feature weights from the answers: a picked card counts at 1/sqrt(n) of its strength
export function weightsFrom(ans) {
  const w = {}; let price = 0, far = 0;
  QUESTIONS.forEach((q) => {
    const ks = picked(ans[q.id]); if (!ks.length) return;
    const k = 1 / Math.sqrt(ks.length);
    ks.forEach((i) => { const o = q.opts[i]; if (!o) return; Object.entries(o.f || {}).forEach(([f, x]) => { w[f] = (w[f] || 0) + x * k; }); price = Math.max(price, o.price || 0); far = Math.max(far, o.far || 0); });
  });
  return { weights: w, price, far };
}

// A playful name and three plain lines from the answers
export function profileFrom(ans) {
  const picks = (id) => picked(ans[id]).map((k) => QUESTIONS.find((q) => q.id === id)?.opts[k]?.l).filter(Boolean);
  const pick = (id) => picks(id)[0];
  const has = (id, l) => picks(id).includes(l);
  const time = has("outing", "Out past midnight") ? "Late-Night" : has("outing", "A full evening") ? "Evening" : has("outing", "Quick and close to home") ? "Early" : "Weekend";
  const kind = has("friday", "Something I've never done") ? "Explorer"
    : has("mode", "Learn something") ? "Curious Mind" : has("mode", "Make something") ? "Maker" : has("mode", "Move") ? "Mover"
    : has("mode", "Dance") || has("friday", "Dancing until late") ? "Dancer" : has("room", "Tiny basement, 30 people") ? "Regular" : "Enthusiast";
  const ROOM = { "Tiny basement, 30 people": "Small rooms over big crowds", "Packed warehouse": "Big, loud and packed is the point", "Park crowd at sunset": "Happiest outdoors", "Quiet gallery": "Calm places where you can think", "Dressed-up cocktail bar": "A little dressed up", "Scrappy DIY space": "Scrappy and DIY" };
  const lines = [];
  const rooms = picks("room").map((r) => ROOM[r]).filter(Boolean).slice(0, 2); if (rooms.length) lines.push(rooms.join(" · "));
  const t = picks("tickets").slice(0, 2).map((x) => x.toLowerCase()); if (t.length) lines.push("Free tickets? You're hoping for " + t.join(" or "));
  const sp = pick("spend"), fr = pick("far");
  if (sp || fr) lines.push([sp && { "Free, ideally": "Free first", "Up to $20": "Cheap and cheerful", "Up to $50": "Happy to pay a bit", "Whatever, if it's great": "Pays for quality" }[sp], fr && { "Walking distance": "close to home", "About 20 minutes": "within 20 minutes", "Anywhere for the right thing": "will cross town for the right thing" }[fr]].filter(Boolean).join(", "));
  return { name: "The " + time + " " + kind, lines: lines.filter(Boolean).slice(0, 3) };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
