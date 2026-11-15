// Onboarding quiz: 12 everyday situations. Each answer seeds the taste model's features at "first guess"
// strength (real behaviour overrides it within days), plus price and distance sensitivity in the older taste layer.
import {
  Utensils, Drama, Sparkles, Sofa, Wine, Warehouse, Trees, Landmark, Laugh, Guitar, Dices, Ghost, Music4,
  Footprints, ShoppingBasket, Volleyball, GraduationCap, Scissors, Activity, Clapperboard, PartyPopper, User, Heart, Users,
  Moon, Sunset, Clock, CalendarDays, Zap, Wallet, BadgeDollarSign, Gem, MapPin, TrainFront, Globe, Coffee, Timer, BedDouble, CircleSlash,
} from "lucide";

// f: feature weights (names as in learn.js features()); price / far: older taste sensitivities (0–3)
export const QUESTIONS = [
  { id: "friday", q: "Friday, 7pm. You're free. You're hoping for…", opts: [
    { l: "Dinner and drinks", i: Utensils, f: { "fam:eat": 0.6, "dim:food=food": 0.5, "dim:social=group": 0.3, "dim:energy=lively": 0.3 } },
    { l: "A show", i: Drama, f: { "fam:watch": 0.6, "dim:mode=watch": 0.5 } },
    { l: "Something I've never done", i: Sparkles, f: { "dim:novelty=weird": 0.6, "len:oneoff": 0.4, "dim:novelty=classic": -0.3 } },
    { l: "A quiet night in, honestly", i: Sofa, f: { "dim:energy=calm": 0.5, "dim:energy=wild": -0.5, "x:weekend&late": -0.3 } },
  ] },
  { id: "room", q: "Pick the room.", opts: [
    { l: "Tiny basement, 30 people", i: Wine, f: { "dim:crowd=intimate": 0.7, "dim:scene=underground": 0.4, "dim:crowd=big": -0.3 } },
    { l: "Packed warehouse", i: Warehouse, f: { "dim:crowd=big": 0.6, "dim:energy=wild": 0.5, "dim:noise=loud": 0.4 } },
    { l: "Park crowd at sunset", i: Trees, f: { "dim:setting=outdoor": 0.7, "dim:energy=lively": 0.3 } },
    { l: "Quiet gallery", i: Landmark, f: { "dim:noise=quiet": 0.6, "dim:energy=calm": 0.4, "fam:explore": 0.4 } },
  ] },
  { id: "tickets", q: "A friend has free tickets for tonight. You hope it's…", opts: [
    { l: "Comedy", i: Laugh, f: { "cat:comedy": 0.8 } },
    { l: "A concert", i: Guitar, f: { "cat:concerts": 0.8 } },
    { l: "Theatre", i: Drama, f: { "cat:theater": 0.8 } },
    { l: "A game night", i: Dices, f: { "fam:play": 0.7 } },
  ] },
  { id: "weird", q: "Which one would you actually go to?", opts: [
    { l: "Immersive show in an old hospital", i: Ghost, f: { "dim:novelty=weird": 0.8, "dim:mode=take-part": 0.3, "dim:novelty=classic": -0.3 } },
    { l: "A classic jazz trio", i: Music4, f: { "dim:novelty=classic": 0.6, "dim:crowd=intimate": 0.3, "dim:novelty=weird": -0.2 } },
  ] },
  { id: "saturday", q: "Sunny Saturday afternoon.", opts: [
    { l: "Wander a neighbourhood", i: Footprints, f: { "fam:explore": 0.6, "dim:setting=outdoor": 0.4 } },
    { l: "A market", i: ShoppingBasket, f: { "cat:markets": 0.7, "cat:food markets & pop-ups": 0.4 } },
    { l: "A pickup game", i: Volleyball, f: { "fam:move": 0.7, "dim:body=active": 0.5 } },
    { l: "A museum", i: Landmark, f: { "cat:museums & galleries": 0.8 } },
  ] },
  { id: "mode", q: "The best nights, you…", opts: [
    { l: "Learn something", i: GraduationCap, f: { "fam:learn": 0.7, "dim:tone=thoughtful": 0.4 } },
    { l: "Make something", i: Scissors, f: { "fam:make": 0.7, "dim:mode=take-part": 0.5 } },
    { l: "Move", i: Activity, f: { "fam:move": 0.6, "dim:body=active": 0.6 } },
    { l: "Watch", i: Clapperboard, f: { "fam:watch": 0.5, "dim:mode=watch": 0.5, "dim:body=seated": 0.3 } },
    { l: "Dance", i: PartyPopper, f: { "fam:party": 0.7, "dim:body=on-your-feet": 0.5 } },
  ] },
  { id: "who", q: "Who's usually with you?", opts: [
    { l: "Just me", i: User, f: { "dim:social=solo-friendly": 0.7 } },
    { l: "A date", i: Heart, f: { "dim:social=date": 0.7, "dim:tone=romantic": 0.3 } },
    { l: "A group", i: Users, f: { "dim:social=group": 0.7 } },
  ] },
  { id: "end", q: "Your night usually ends…", opts: [
    { l: "By 10", i: Sunset, f: { "tod:late": -0.6, "tod:evening": 0.3, "tod:afternoon": 0.3 } },
    { l: "Around midnight", i: Moon, f: { "tod:evening": 0.5 } },
    { l: "Whenever", i: Clock, f: { "tod:late": 0.6, "x:weekend&late": 0.4 } },
  ] },
  { id: "plan", q: "How do you plan?", opts: [
    { l: "Weeks ahead", i: CalendarDays, f: { "dim:polish=polished": 0.3 } },
    { l: "The day of", i: Clock, f: {} },
    { l: "On the spot", i: Zap, f: { "dist:near": 0.4, "len:run": 0.2 } },
  ] },
  { id: "spend", q: "A good night out is worth…", opts: [
    { l: "Free, ideally", i: CircleSlash, f: { "price:free": 0.7, "price:high": -0.5 }, price: 2 },
    { l: "Under $20", i: Wallet, f: { "price:cheap": 0.5, "price:free": 0.3, "price:high": -0.3 }, price: 1 },
    { l: "Under $50", i: BadgeDollarSign, f: { "price:mid": 0.4 } },
    { l: "Whatever, if it's great", i: Gem, f: { "price:high": 0.3, "dim:polish=upscale": 0.3 } },
  ] },
  { id: "far", q: "How far will you go?", opts: [
    { l: "Walking distance", i: MapPin, f: { "dist:near": 0.7, "dist:far": -0.6 }, far: 2 },
    { l: "20 minutes", i: TrainFront, f: { "dist:mid": 0.3, "dist:far": -0.3 }, far: 1 },
    { l: "Anywhere for the right thing", i: Globe, f: {} },
  ] },
  { id: "sunday", q: "Sunday morning.", opts: [
    { l: "Brunch", i: Coffee, f: { "dim:food=food": 0.4, "x:weekend&morning": 0.3 } },
    { l: "Run club", i: Timer, f: { "cat:running": 0.7, "x:weekend&morning": 0.5 } },
    { l: "Flea market", i: ShoppingBasket, f: { "cat:markets": 0.6, "x:weekend&morning": 0.3 } },
    { l: "Sleep in", i: BedDouble, f: { "x:weekend&morning": -0.4 } },
  ] },
];

// A playful name and three plain lines from the answers
export function profileFrom(ans) {
  const pick = (id) => QUESTIONS.find((q) => q.id === id)?.opts[ans[id]]?.l;
  const time = { "By 10": "Early", "Around midnight": "Evening", "Whenever": "Late-Night" }[pick("end")] || "Weekend";
  const kind = pick("weird") === "Immersive show in an old hospital" || pick("friday") === "Something I've never done" ? "Explorer"
    : pick("mode") === "Learn something" ? "Curious Mind" : pick("mode") === "Make something" ? "Maker" : pick("mode") === "Move" ? "Mover"
    : pick("mode") === "Dance" ? "Dancer" : pick("room") === "Tiny basement, 30 people" ? "Regular" : "Enthusiast";
  const lines = [];
  const room = pick("room"); if (room) lines.push({ "Tiny basement, 30 people": "Small rooms over big crowds", "Packed warehouse": "Big, loud and packed is the point", "Park crowd at sunset": "Happiest outdoors", "Quiet gallery": "Calm places where you can think" }[room]);
  const t = pick("tickets"); if (t) lines.push("Free tickets? You're hoping for " + t.toLowerCase());
  const sp = pick("spend"), fr = pick("far");
  if (sp || fr) lines.push([sp && { "Free, ideally": "Free first", "Under $20": "Cheap and cheerful", "Under $50": "Happy to pay a bit", "Whatever, if it's great": "Pays for quality" }[sp], fr && { "Walking distance": "close to home", "20 minutes": "within 20 minutes", "Anywhere for the right thing": "will cross town for the right thing" }[fr]].filter(Boolean).join(", "));
  return { name: "The " + time + " " + kind, lines: lines.filter(Boolean).slice(0, 3) };
}

export const QUIZ_KEY = "gp_quiz_v1";
export const loadQuiz = () => { try { return JSON.parse(localStorage.getItem(QUIZ_KEY) || "null"); } catch { return null; } };
export const saveQuiz = (q) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch { /* private mode */ } };
