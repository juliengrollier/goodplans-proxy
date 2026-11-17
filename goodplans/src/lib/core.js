const GRAY="#6B7280",GRAY_LT="#E8E6E0";
// Extracted from the classic App.jsx (data, scoring, transit, push helpers). Shared by v7 and the classic app.
const CATS={
  "Music":{emoji:"🎵",color:"#7C3AED",bg:"#EDE7F6",sub:["Live Jazz","Blues","Classical","Hip-Hop","Indie/Alt","Electronic","Brass/Funk","World Music","Soul/R&B","Rock","Open Mic","Karaoke"]},
  "Comedy":{emoji:"😂",color:"#EA580C",bg:"#FFF7ED",sub:["Stand-up","Improv","Variety","Storytelling"]},
  "Art & Culture":{emoji:"🎨",color:"#BE185D",bg:"#FCE7F3",sub:["Exhibition","Performance Art","Theater","Workshop","Street Art"]},
  "Film":{emoji:"🎬",color:"#1D4ED8",bg:"#EFF6FF",sub:["Outdoor Screening","Arthouse","Documentary","Film Series"]},
  "Food & Drink":{emoji:"🍽️",color:"#059669",bg:"#ECFDF5",sub:["Street Fair","Markets & Fairs","Night Market","Tasting","Pop-up","Bar Night"]},
  "Outdoors":{emoji:"🌿",color:"#15803D",bg:"#F0FDF4",sub:["Park Event","Waterfront","Walking Tour","Garden","Birding","Street Fair","Parades & Celebrations"]},
  "Sports":{emoji:"⚽",color:"#0369A1",bg:"#E0F2FE",sub:["Running","Kayaking","Yoga","Cycling","Fitness","Wellness","Martial Arts","Soccer","Baseball","Basketball"]},
  "Family":{emoji:"👨‍👩‍👧",color:"#D97706",bg:"#FFFBEB",sub:["Kids","Educational","Festival","Playground"]},
  "Talk & Learn":{emoji:"🎤",color:"#0891B2",bg:"#ECFEFF",sub:["Lecture","Panel","Book Launch","Literary & Books","History Tour"]},
  "Get Creative":{emoji:"🧑‍🎨",color:"#B45309",bg:"#FFFBEB",sub:["Painting","Drawing","Pottery","Ceramics","Glassmaking","Printmaking","Sewing & Textiles","Jewellery","Sculpture","Photography","Woodworking","Music & Instruments","Singing & Voice","Dance Class","Cooking Class","Cocktail Class","Open Studio"]},
  "Nightlife":{emoji:"🌙",color:"#9333EA",bg:"#FAF5FF",sub:["Dance Party","Late Night","Club Night"]},
  "Shopping":{emoji:"🛍️",color:"#DB2777",bg:"#FDF2F8",sub:["Flea Market","Vintage Market","Pop-up Shop","Sample Sale","Holiday Market","Bookstore","Record Store"]},
  "Other":{emoji:"✨",color:GRAY,bg:GRAY_LT,sub:[]},
};

const VIBES=[
  {key:"chill",label:"Chill & Free",emoji:"😌",desc:"Low-key, free or cheap"},
  {key:"dance",label:"Go Out & Dance",emoji:"🕺",desc:"Late night, music, movement"},
  {key:"culture",label:"Culture Fix",emoji:"🎭",desc:"Exhibitions, performances, film"},
  {key:"eat",label:"Eat & Drink",emoji:"🍷",desc:"Food markets, street fairs, bars"},
  {key:"weird",label:"Something Weird",emoji:"🤡",desc:"Unexpected, one-of-a-kind"},
  {key:"date",label:"Date Night",emoji:"✨",desc:"Intimate and special for two"},
  {key:"kids",label:"With Kids",emoji:"👧",desc:"Family-friendly"},
  {key:"solo",label:"Solo & Low-Key",emoji:"🎧",desc:"Good alone or with one friend"},
  {key:"big",label:"Big Night Out",emoji:"🎉",desc:"Go all in, stay late"},
  {key:"sunday",label:"Sunday Reset",emoji:"☕",desc:"Calm, restorative, easy"},
  {key:"nyc",label:"Only in NYC",emoji:"🗽",desc:"Truly local, only here"},
  {key:"free",label:"Free Afternoon",emoji:"🌤️",desc:"Daytime, spontaneous, free"},
  {key:"late",label:"After Dark",emoji:"🌃",desc:"Starts after 9pm"},
  {key:"move",label:"Get Moving",emoji:"🏃",desc:"Do something physical"},
  {key:"watch",label:"Watch the Game",emoji:"👟",desc:"Spectate live sport"},
];

const DP={
  categories:{Music:60,Comedy:60,"Art & Culture":50,Film:25,"Food & Drink":15,Outdoors:70,Sports:35,Family:35,"Talk & Learn":25,"Get Creative":45,Nightlife:25,Shopping:5,Other:30},
  vibes:{chill:60,dance:15,culture:55,eat:25,weird:70,date:49,kids:25,solo:50,big:30,sunday:50,nyc:70,free:60,late:40,move:50,watch:49},
  subcategories:{
    "Music::Live Jazz":20,"Music::Blues":80,"Music::Classical":0,"Music::Hip-Hop":15,"Music::Indie/Alt":70,"Music::Electronic":15,"Music::Brass/Funk":65,"Music::World Music":50,"Music::Soul/R&B":50,"Music::Rock":80,"Music::Open Mic":76,"Music::Karaoke":5,
    "Film::Outdoor Screening":50,"Film::Arthouse":50,"Film::Documentary":50,"Film::Film Series":50,
    "Food & Drink::Street Fair":50,"Food & Drink::Markets & Fairs":50,"Food & Drink::Night Market":50,"Food & Drink::Tasting":5,"Food & Drink::Pop-up":5,"Food & Drink::Bar Night":50,
    "Outdoors::Park Event":50,"Outdoors::Waterfront":60,"Outdoors::Walking Tour":50,"Outdoors::Garden":20,"Outdoors::Parades & Celebrations":50,
    "Sports::Running":10,"Sports::Kayaking":50,"Sports::Yoga":50,"Sports::Cycling":50,"Sports::Fitness":10,"Sports::Wellness":50,"Sports::Martial Arts":50,"Sports::Soccer":70,"Sports::Baseball":50,"Sports::Basketball":50,
    "Talk & Learn::Lecture":31,"Talk & Learn::Panel":15,"Talk & Learn::Book Launch":15,"Talk & Learn::Literary & Books":20,"Talk & Learn::History Tour":50,
    "Get Creative::Music & Instruments":70,"Get Creative::Dance Class":20
  },
};

const SK_P="gp_prefs_v5",SK_F="gp_favs_v3",SK_B="gp_beh_v3";

// ─── Web Push ────────────────────────────────────────────────────────────────
// VAPID public key — generated once, matches the VAPID_PUBLIC_KEY in Vercel env vars.
// This key is intentionally public and safe to commit.
// TODO: paste your generated public key here after running:
//   npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = "BCTlVGd0u-gFI7sHMIDxRUo9YcCrvLn5FL8oyZI_4-8GxC8fXoY3vzY7ma6tVcoOEs4PlR1h91mC9-vneve5YDU";

// Convert VAPID public key from base64url to Uint8Array for the browser API
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

// Register the service worker and return the registration
async function getSWRegistration(){
  if(!("serviceWorker" in navigator))return null;
  try{
    // sw.js lives at the root of the Vite public/ folder → always /sw.js
    const existing=await navigator.serviceWorker.getRegistration("/");
    if(existing)return existing;
    return await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
  }catch(e){console.warn("SW register failed:",e);return null;}
}

// Subscribe this device to Web Push. Returns the subscription object or null.
async function subscribePush(reg){
  if(!VAPID_PUBLIC_KEY)return null;
  try{
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    return sub.toJSON();
  }catch(e){console.warn("Push subscribe failed:",e);return null;}
}

// Send subscription to Apps Script for storage + future pushes.
// Uses GET (not POST+JSON) to avoid CORS preflight rejection by Apps Script.
async function registerSubWithAppsScript(gmailUrl,gmailKey,sub){
  if(!gmailUrl||!sub)return;
  try{
    const subStr=encodeURIComponent(JSON.stringify(sub));
    await fetch(gmailUrl+"?action=registerPush&key="+encodeURIComponent(gmailKey)+"&sub="+subStr);
  }catch(e){console.warn("Push registration to Apps Script failed:",e);}
}
const DEFAULT_SUBS=Object.fromEntries(Object.entries(CATS).flatMap(([cat,cfg])=>cfg.sub.map(s=>[cat+"::"+s,50])));
const sg=async(k)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch{return null;}};
const ss=async(k,v)=>{try{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch{}};
const FONT="@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;}::-webkit-scrollbar{display:none;}@keyframes fu{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}";

const mkDate=s=>new Date(s+"T00:00:00");
const floorDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const evEnd=ev=>mkDate(ev.X||ev.E);
const evStart=ev=>mkDate(ev.E);
// Runs over several days are often on certain weekdays only ("Sundays Nov 15 and 22", "Thu–Sun", "weekends",
// "closed Mondays"); read that from the listing so the event only counts on those days. Cached per listing.
const DOWK=["sun","mon","tue","wed","thu","fri","sat"];
const DOW_RE="(sun|mon|tue|wed|thu|fri|sat)(?:day|s|\\.)?(?:s)?";
const _dows=new Map();
function runDows(ev){
  if(!ev||!ev.X||ev.X===ev.E)return null;
  // Structured weekday list from the extraction (0=Sun..6=Sat) wins over the text guess below
  if(Array.isArray(ev.dows)&&ev.dows.length&&ev.dows.length<7){const w=new Set(ev.dows.map(Number).filter((x)=>x>=0&&x<=6));if(w.size&&w.size<7)return w;}
  const key=(ev.id||ev.title)+"|"+ev.E+"|"+ev.X;
  if(_dows.has(key))return _dows.get(key);
  const t=[ev.time,ev.title,ev.desc,ev.recLabel].filter(Boolean).join(" ").toLowerCase().replace(/[–—]/g,"-");
  const on=new Set(), off=new Set();
  const idx=(w)=>DOWK.indexOf(w.slice(0,3));
  // closed days first, so "closed Mondays" doesn't count as open
  let rest=t.replace(new RegExp("closed (?:on )?"+DOW_RE+"(?:\\s*(?:and|&|,)\\s*"+DOW_RE+")?","g"),(m,a,b)=>{off.add(idx(a));if(b)off.add(idx(b));return " ";});
  rest.replace(new RegExp("\\b"+DOW_RE+"\\s*(?:-|to|through|thru)\\s*"+DOW_RE+"\\b","g"),(m,a,b)=>{let i=idx(a);const j=idx(b);for(let k=0;k<7;k++){on.add(i);if(i===j)break;i=(i+1)%7;}return " ";});
  if(/\b(every )?weekends?\b/.test(rest))[6,0].forEach((x)=>on.add(x));
  if(/\bweekdays\b/.test(rest))[1,2,3,4,5].forEach((x)=>on.add(x));
  // "Sundays", "every Sunday", "on Sunday(s)"; a bare single weekday name alone isn't enough
  for(const m of rest.matchAll(/\b(?:every |on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(s)?\b/g)){
    if(m[2]||/^(every|on) /.test(m[0]))on.add(idx(m[1]));
  }
  let r=null;
  if(on.size&&on.size<7)r=on;
  else if(off.size)r=new Set([0,1,2,3,4,5,6].filter((x)=>!off.has(x)));
  _dows.set(key,r);
  return r;
}
const _iso=(d)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const evCovers=(ev,d)=>{if(d<evStart(ev)||d>evEnd(ev))return false;
  // Exact dates from the extraction (irregular runs: "Nov 15, 22 and 29") beat any weekday pattern
  if(Array.isArray(ev.dates)&&ev.dates.length)return ev.dates.includes(_iso(d));
  const w=runDows(ev);return !w||w.has(d.getDay());};
// The next day (from d) the event is on, or null once it's over
const nextOn=(ev,d)=>{const s=evStart(ev),e=evEnd(ev);let x=new Date(Math.max(+s,+floorDay(d)));for(let k=0;k<400&&x<=e;k++){if(evCovers(ev,x))return x;x=new Date(x.getFullYear(),x.getMonth(),x.getDate()+1);}return null;};
const evActive=(ev,d)=>evEnd(ev)>=d;
const runLen=ev=>Math.round((evEnd(ev)-evStart(ev))/86400000)+1;
const daysUntil=(ev,d)=>Math.round((evStart(ev)-d)/86400000);
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>{const d=mkDate(s);return DAYS[d.getDay()]+" "+d.getDate()+" "+MONTHS[d.getMonth()];};
const friendlyDate=(ev,t,tom)=>{
  if(evCovers(ev,t)&&(!ev.X||ev.X===ev.E))return"Today";
  if(evCovers(ev,tom)&&(!ev.X||ev.X===ev.E))return"Tomorrow";
  if(ev.X&&ev.X!==ev.E)return fmtD(ev.E)+" - "+fmtD(ev.X);
  return fmtD(ev.E);
};
// Category-based assumed hour for events with unknown / "All day" / "Various" times.
// Evening-by-default categories: Music, Comedy, Film, Nightlife.
// Daytime-by-default: everything else.
const NIGHT_CATS=new Set(["Music","Comedy","Film","Nightlife"]);
const eHour=(t,cat)=>{
  if(t&&t!=="All day"&&t!=="Various"){
    const m=t.match(/(\d+):?(\d*)\s*(AM|PM)/i);
    if(m){let h=parseInt(m[1]);if(m[3].toUpperCase()==="PM"&&h!==12)h+=12;if(m[3].toUpperCase()==="AM"&&h===12)h=0;return h;}
    const m24=t.match(/^(\d{1,2}):(\d{2})/);
    if(m24)return parseInt(m24[1]);
  }
  // Unknown time → assumed default per category
  return NIGHT_CATS.has(cat)?20:13;
};
// Returns true if the event has a real, parseable start time (not "All day" / "Various")
const hasKnownTime=(ev)=>{
  const t=ev.time;
  if(!t||t==="All day"||t==="Various")return false;
  return /\d/.test(t);
};
const parseT=t=>{if(!t||t==="All day")return"18:00";const m=t.match(/(\d+):?(\d*)\s*(AM|PM)/i);if(!m)return"18:00";let h=parseInt(m[1]);const mn=m[2]||"00",ap=m[3].toUpperCase();if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return String(h).padStart(2,"0")+":"+mn;};
const toGC=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";

// NYC borough centroids — fallback when model assigns bad coords
const HOOD_COORD={
  "Manhattan":[40.7831,-73.9712],"Brooklyn":[40.6501,-73.9496],
  "Queens":[40.7282,-73.7949],"Bronx":[40.8448,-73.8648],
  "Staten Island":[40.5795,-74.1502]
};

// Detect events with unspecific locations — citywide, various venues, or coords
// that exactly match a borough centroid (= Maps geocoder fell back). These
// should NOT appear in "Nearby Now" / "Tonight" since we can't claim they're
// actually nearby.
const isImprecise=(ev)=>{
  const v=(ev.venue||"").toLowerCase();
  if(/citywide|various venues|various locations|multiple venues|multiple locations|all (five )?boroughs|across nyc|across the city|tba|tbd|nyc parks( department)?$|^nyc parks/.test(v))return true;
  const c=ev.coord;
  if(Array.isArray(c)&&c.length===2){
    for(const hc of Object.values(HOOD_COORD)){
      if(Math.abs(c[0]-hc[0])<0.0005&&Math.abs(c[1]-hc[1])<0.0005)return true;
    }
    // Also catch the legacy LES default [40.7186, -73.9865]
    if(Math.abs(c[0]-40.7186)<0.0005&&Math.abs(c[1]-(-73.9865))<0.0005)return true;
  }
  return false;
};
// Validate coord is within greater NYC area; fall back to hood centroid or LES
const safeCoord=(ev)=>{
  const c=ev.coord;
  if(Array.isArray(c)&&c.length===2){
    const [la,lo]=c;
    if(la>=40.4&&la<=41.1&&lo>=-74.4&&lo<=-73.5)return c;
  }
  return HOOD_COORD[ev.hood]||[40.7186,-73.9865];
};
const kmdist=(c,h)=>{const R=6371,dLa=(c[0]-h[0])*Math.PI/180,dLo=(c[1]-h[1])*Math.PI/180,a=Math.sin(dLa/2)**2+Math.cos(h[0]*Math.PI/180)*Math.cos(c[0]*Math.PI/180)*Math.sin(dLo/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
// ─── NYC subway stations — major stops, hardcoded for offline use ──────────
// All MTA subway stations (MTA Stations.csv); lines = every route at the station complex, so transfers count
const SUBWAY=[
{n:"Astoria-Ditmars Blvd",l:["N","W"],c:[40.7750,-73.9120]},
{n:"Astoria Blvd",l:["N","W"],c:[40.7703,-73.9178]},
{n:"30 Av",l:["N","W"],c:[40.7668,-73.9215]},
{n:"Broadway",l:["N","W"],c:[40.7618,-73.9255]},
{n:"36 Av",l:["N","W"],c:[40.7568,-73.9296]},
{n:"39 Av-Dutch Kills",l:["N","W"],c:[40.7529,-73.9328]},
{n:"Lexington Av/59 St",l:["4","5","6","N","R","W"],c:[40.7627,-73.9673]},
{n:"5 Av/59 St",l:["N","R","W"],c:[40.7648,-73.9733]},
{n:"57 St-7 Av",l:["N","Q","R","W"],c:[40.7647,-73.9807]},
{n:"49 St",l:["N","R","W"],c:[40.7599,-73.9841]},
{n:"Times Sq-42 St",l:["1","2","3","7","A","C","E","N","Q","R","W","S"],c:[40.7547,-73.9868]},
{n:"34 St-Herald Sq",l:["B","D","F","M","N","Q","R","W"],c:[40.7496,-73.9879]},
{n:"28 St",l:["R","W"],c:[40.7455,-73.9887]},
{n:"23 St",l:["R","W"],c:[40.7413,-73.9893]},
{n:"14 St-Union Sq",l:["4","5","6","L","N","Q","R","W"],c:[40.7357,-73.9906]},
{n:"8 St-NYU",l:["R","W"],c:[40.7303,-73.9926]},
{n:"Prince St",l:["R","W"],c:[40.7243,-73.9977]},
{n:"Canal St",l:["6","J","Z","N","Q","R","W"],c:[40.7195,-74.0018]},
{n:"Canal St",l:["6","J","Z","N","Q","R","W"],c:[40.7184,-74.0005]},
{n:"City Hall",l:["R","W"],c:[40.7133,-74.0070]},
{n:"Cortlandt St",l:["2","3","A","C","E","R","W"],c:[40.7107,-74.0110]},
{n:"Rector St",l:["R","W"],c:[40.7072,-74.0133]},
{n:"Whitehall St-South Ferry",l:["1","R","W"],c:[40.7031,-74.0130]},
{n:"Court St",l:["2","3","4","5","R"],c:[40.6941,-73.9918]},
{n:"Jay St-MetroTech",l:["A","C","F","R"],c:[40.6922,-73.9859]},
{n:"DeKalb Av",l:["B","Q","R"],c:[40.6906,-73.9818]},
{n:"Atlantic Av-Barclays Ctr",l:["2","3","4","5","B","D","N","Q","R"],c:[40.6837,-73.9788]},
{n:"Union St",l:["R"],c:[40.6773,-73.9831]},
{n:"4 Av-9 St",l:["F","G","R"],c:[40.6708,-73.9883]},
{n:"Prospect Av",l:["R"],c:[40.6654,-73.9929]},
{n:"25 St",l:["R"],c:[40.6604,-73.9981]},
{n:"36 St",l:["D","N","R"],c:[40.6551,-74.0035]},
{n:"45 St",l:["R"],c:[40.6489,-74.0100]},
{n:"53 St",l:["R"],c:[40.6451,-74.0140]},
{n:"59 St",l:["N","R"],c:[40.6414,-74.0179]},
{n:"Bay Ridge Av",l:["R"],c:[40.6350,-74.0234]},
{n:"77 St",l:["R"],c:[40.6297,-74.0255]},
{n:"86 St",l:["R"],c:[40.6227,-74.0284]},
{n:"Bay Ridge-95 St",l:["R"],c:[40.6166,-74.0309]},
{n:"7 Av",l:["B","Q"],c:[40.6771,-73.9724]},
{n:"Prospect Park",l:["B","Q","S"],c:[40.6616,-73.9622]},
{n:"Parkside Av",l:["Q"],c:[40.6553,-73.9615]},
{n:"Church Av",l:["B","Q"],c:[40.6505,-73.9630]},
{n:"Beverley Rd",l:["Q"],c:[40.6440,-73.9645]},
{n:"Cortelyou Rd",l:["Q"],c:[40.6409,-73.9639]},
{n:"Newkirk Plaza",l:["B","Q"],c:[40.6351,-73.9628]},
{n:"Avenue H",l:["Q"],c:[40.6293,-73.9616]},
{n:"Avenue J",l:["Q"],c:[40.6250,-73.9608]},
{n:"Avenue M",l:["Q"],c:[40.6176,-73.9594]},
{n:"Kings Hwy",l:["B","Q"],c:[40.6087,-73.9577]},
{n:"Avenue U",l:["Q"],c:[40.5993,-73.9559]},
{n:"Neck Rd",l:["Q"],c:[40.5952,-73.9552]},
{n:"Sheepshead Bay",l:["B","Q"],c:[40.5869,-73.9542]},
{n:"Brighton Beach",l:["B","Q"],c:[40.5776,-73.9614]},
{n:"Ocean Pkwy",l:["Q"],c:[40.5763,-73.9685]},
{n:"W 8 St-NY Aquarium",l:["F","Q"],c:[40.5761,-73.9759]},
{n:"Coney Island-Stillwell Av",l:["D","F","N","Q"],c:[40.5774,-73.9812]},
{n:"9 Av",l:["D"],c:[40.6463,-73.9943]},
{n:"Fort Hamilton Pkwy",l:["D"],c:[40.6409,-73.9943]},
{n:"50 St",l:["D"],c:[40.6363,-73.9948]},
{n:"55 St",l:["D"],c:[40.6314,-73.9955]},
{n:"62 St",l:["D","N"],c:[40.6265,-73.9969]},
{n:"71 St",l:["D"],c:[40.6196,-73.9989]},
{n:"79 St",l:["D"],c:[40.6135,-74.0006]},
{n:"18 Av",l:["D"],c:[40.6080,-74.0017]},
{n:"20 Av",l:["D"],c:[40.6046,-73.9982]},
{n:"Bay Pkwy",l:["D"],c:[40.6019,-73.9937]},
{n:"25 Av",l:["D"],c:[40.5977,-73.9868]},
{n:"Bay 50 St",l:["D"],c:[40.5888,-73.9838]},
{n:"8 Av",l:["N"],c:[40.6351,-74.0117]},
{n:"Fort Hamilton Pkwy",l:["N"],c:[40.6314,-74.0054]},
{n:"New Utrecht Av",l:["D","N"],c:[40.6248,-73.9964]},
{n:"18 Av",l:["N"],c:[40.6207,-73.9904]},
{n:"20 Av",l:["N"],c:[40.6174,-73.9850]},
{n:"Bay Pkwy",l:["N"],c:[40.6118,-73.9818]},
{n:"Kings Hwy",l:["N"],c:[40.6039,-73.9804]},
{n:"Avenue U",l:["N"],c:[40.5975,-73.9791]},
{n:"86 St",l:["N"],c:[40.5927,-73.9782]},
{n:"121 St",l:["J","Z"],c:[40.7005,-73.8283]},
{n:"111 St",l:["J"],c:[40.6974,-73.8363]},
{n:"104 St",l:["J","Z"],c:[40.6952,-73.8443]},
{n:"Woodhaven Blvd",l:["J","Z"],c:[40.6939,-73.8516]},
{n:"85 St-Forest Pkwy",l:["J"],c:[40.6924,-73.8600]},
{n:"75 St-Elderts Ln",l:["J","Z"],c:[40.6913,-73.8671]},
{n:"Cypress Hills",l:["J"],c:[40.6899,-73.8726]},
{n:"Crescent St",l:["J","Z"],c:[40.6832,-73.8738]},
{n:"Norwood Av",l:["J","Z"],c:[40.6814,-73.8800]},
{n:"Cleveland St",l:["J"],c:[40.6799,-73.8846]},
{n:"Van Siclen Av",l:["J","Z"],c:[40.6780,-73.8917]},
{n:"Alabama Av",l:["J","Z"],c:[40.6770,-73.8987]},
{n:"Broadway Junction",l:["A","C","J","Z","L"],c:[40.6795,-73.9045]},
{n:"Chauncey St",l:["J","Z"],c:[40.6829,-73.9105]},
{n:"Halsey St",l:["J"],c:[40.6864,-73.9166]},
{n:"Gates Av",l:["J","Z"],c:[40.6896,-73.9223]},
{n:"Kosciuszko St",l:["J"],c:[40.6933,-73.9288]},
{n:"Myrtle Av",l:["M","J","Z"],c:[40.6972,-73.9357]},
{n:"Flushing Av",l:["M","J"],c:[40.7003,-73.9411]},
{n:"Lorimer St",l:["M","J"],c:[40.7039,-73.9474]},
{n:"Hewes St",l:["M","J"],c:[40.7069,-73.9534]},
{n:"Marcy Av",l:["M","J","Z"],c:[40.7084,-73.9578]},
{n:"Delancey St-Essex St",l:["F","M","J","Z"],c:[40.7183,-73.9874]},
{n:"Bowery",l:["J","Z"],c:[40.7203,-73.9939]},
{n:"Chambers St",l:["4","5","6","J","Z"],c:[40.7132,-74.0034]},
{n:"Fulton St",l:["2","3","4","5","A","C","J","Z"],c:[40.7104,-74.0076]},
{n:"Broad St",l:["J","Z"],c:[40.7065,-74.0111]},
{n:"Middle Village-Metropolitan Av",l:["M"],c:[40.7114,-73.8896]},
{n:"Fresh Pond Rd",l:["M"],c:[40.7062,-73.8959]},
{n:"Forest Av",l:["M"],c:[40.7044,-73.9031]},
{n:"Seneca Av",l:["M"],c:[40.7028,-73.9077]},
{n:"Myrtle-Wyckoff Avs",l:["M","L"],c:[40.6994,-73.9124]},
{n:"Knickerbocker Av",l:["M"],c:[40.6987,-73.9197]},
{n:"Central Av",l:["M"],c:[40.6979,-73.9274]},
{n:"8 Av",l:["A","C","E","L"],c:[40.7398,-74.0026]},
{n:"6 Av",l:["1","2","3","F","M","L"],c:[40.7373,-73.9968]},
{n:"14 St-Union Sq",l:["4","5","6","L","N","Q","R","W"],c:[40.7348,-73.9907]},
{n:"3 Av",l:["L"],c:[40.7328,-73.9861]},
{n:"1 Av",l:["L"],c:[40.7310,-73.9816]},
{n:"Bedford Av",l:["L"],c:[40.7173,-73.9569]},
{n:"Lorimer St",l:["G","L"],c:[40.7141,-73.9503]},
{n:"Graham Av",l:["L"],c:[40.7146,-73.9441]},
{n:"Grand St",l:["L"],c:[40.7119,-73.9407]},
{n:"Montrose Av",l:["L"],c:[40.7077,-73.9399]},
{n:"Morgan Av",l:["L"],c:[40.7062,-73.9331]},
{n:"Jefferson St",l:["L"],c:[40.7066,-73.9229]},
{n:"DeKalb Av",l:["L"],c:[40.7038,-73.9184]},
{n:"Myrtle-Wyckoff Avs",l:["M","L"],c:[40.6998,-73.9116]},
{n:"Halsey St",l:["L"],c:[40.6956,-73.9041]},
{n:"Wilson Av",l:["L"],c:[40.6888,-73.9040]},
{n:"Bushwick Av-Aberdeen St",l:["L"],c:[40.6828,-73.9052]},
{n:"Atlantic Av",l:["L"],c:[40.6753,-73.9031]},
{n:"Sutter Av",l:["L"],c:[40.6694,-73.9020]},
{n:"Livonia Av",l:["L"],c:[40.6640,-73.9006]},
{n:"New Lots Av",l:["L"],c:[40.6587,-73.8992]},
{n:"East 105 St",l:["L"],c:[40.6506,-73.8995]},
{n:"Canarsie-Rockaway Pkwy",l:["L"],c:[40.6467,-73.9018]},
{n:"Franklin Av",l:["C","S"],c:[40.6806,-73.9558]},
{n:"Park Pl",l:["S"],c:[40.6748,-73.9576]},
{n:"Botanic Garden",l:["2","3","4","5","S"],c:[40.6703,-73.9592]},
{n:"Inwood-207 St",l:["A"],c:[40.8681,-73.9199]},
{n:"Dyckman St",l:["A"],c:[40.8655,-73.9273]},
{n:"190 St",l:["A"],c:[40.8590,-73.9342]},
{n:"181 St",l:["A"],c:[40.8517,-73.9380]},
{n:"175 St",l:["A"],c:[40.8474,-73.9397]},
{n:"168 St",l:["1","A","C"],c:[40.8407,-73.9396]},
{n:"163 St-Amsterdam Av",l:["C"],c:[40.8360,-73.9399]},
{n:"155 St",l:["C"],c:[40.8305,-73.9415]},
{n:"145 St",l:["A","C","B","D"],c:[40.8248,-73.9442]},
{n:"135 St",l:["C","B"],c:[40.8179,-73.9476]},
{n:"125 St",l:["A","C","B","D"],c:[40.8111,-73.9523]},
{n:"116 St",l:["C","B"],c:[40.8051,-73.9549]},
{n:"Cathedral Pkwy (110 St)",l:["C","B"],c:[40.8006,-73.9582]},
{n:"103 St",l:["C","B"],c:[40.7961,-73.9615]},
{n:"96 St",l:["C","B"],c:[40.7916,-73.9647]},
{n:"86 St",l:["C","B"],c:[40.7859,-73.9689]},
{n:"81 St-Museum of Natural History",l:["C","B"],c:[40.7814,-73.9721]},
{n:"72 St",l:["C","B"],c:[40.7756,-73.9764]},
{n:"59 St-Columbus Circle",l:["1","A","C","B","D"],c:[40.7683,-73.9817]},
{n:"50 St",l:["C","E"],c:[40.7625,-73.9860]},
{n:"42 St-Port Authority Bus Terminal",l:["1","2","3","7","A","C","E","N","Q","R","W","S"],c:[40.7573,-73.9897]},
{n:"34 St-Penn Station",l:["A","C","E"],c:[40.7523,-73.9934]},
{n:"23 St",l:["C","E"],c:[40.7459,-73.9980]},
{n:"14 St",l:["A","C","E","L"],c:[40.7409,-74.0017]},
{n:"W 4 St-Wash Sq",l:["A","C","E","B","D","F","M"],c:[40.7323,-74.0005]},
{n:"Spring St",l:["C","E"],c:[40.7262,-74.0037]},
{n:"Canal St",l:["A","C","E"],c:[40.7208,-74.0052]},
{n:"Chambers St",l:["2","3","A","C","E","R","W"],c:[40.7141,-74.0086]},
{n:"World Trade Center",l:["2","3","A","C","E","R","W"],c:[40.7126,-74.0098]},
{n:"High St",l:["A","C"],c:[40.6993,-73.9905]},
{n:"Hoyt-Schermerhorn Sts",l:["A","C","G"],c:[40.6885,-73.9850]},
{n:"Lafayette Av",l:["C"],c:[40.6861,-73.9739]},
{n:"Clinton-Washington Avs",l:["C"],c:[40.6833,-73.9658]},
{n:"Nostrand Av",l:["A","C"],c:[40.6804,-73.9504]},
{n:"Kingston-Throop Avs",l:["C"],c:[40.6799,-73.9409]},
{n:"Utica Av",l:["A","C"],c:[40.6794,-73.9307]},
{n:"Ralph Av",l:["C"],c:[40.6788,-73.9208]},
{n:"Rockaway Av",l:["C"],c:[40.6783,-73.9119]},
{n:"Broadway Junction",l:["A","C","J","Z","L"],c:[40.6783,-73.9053]},
{n:"Liberty Av",l:["C"],c:[40.6745,-73.8965]},
{n:"Van Siclen Av",l:["C"],c:[40.6727,-73.8904]},
{n:"Shepherd Av",l:["C"],c:[40.6741,-73.8808]},
{n:"Euclid Av",l:["A","C"],c:[40.6754,-73.8721]},
{n:"Grant Av",l:["A"],c:[40.6770,-73.8650]},
{n:"80 St",l:["A"],c:[40.6794,-73.8590]},
{n:"88 St",l:["A"],c:[40.6798,-73.8515]},
{n:"Rockaway Blvd",l:["A"],c:[40.6804,-73.8439]},
{n:"104 St",l:["A"],c:[40.6817,-73.8377]},
{n:"111 St",l:["A"],c:[40.6843,-73.8322]},
{n:"Ozone Park-Lefferts Blvd",l:["A"],c:[40.6860,-73.8258]},
{n:"Aqueduct Racetrack",l:["A"],c:[40.6724,-73.8353]},
{n:"Aqueduct-N Conduit Av",l:["A"],c:[40.6682,-73.8341]},
{n:"Howard Beach-JFK Airport",l:["A"],c:[40.6605,-73.8303]},
{n:"Broad Channel",l:["A","S"],c:[40.6084,-73.8159]},
{n:"Beach 90 St",l:["A","S"],c:[40.5880,-73.8136]},
{n:"Beach 98 St",l:["A","S"],c:[40.5853,-73.8206]},
{n:"Beach 105 St",l:["A","S"],c:[40.5832,-73.8276]},
{n:"Rockaway Park-Beach 116 St",l:["A","S"],c:[40.5809,-73.8356]},
{n:"Beach 67 St",l:["A"],c:[40.5909,-73.7969]},
{n:"Beach 60 St",l:["A"],c:[40.5924,-73.7885]},
{n:"Beach 44 St",l:["A"],c:[40.5929,-73.7760]},
{n:"Beach 36 St",l:["A"],c:[40.5954,-73.7682]},
{n:"Beach 25 St",l:["A"],c:[40.6001,-73.7614]},
{n:"Far Rockaway-Mott Av",l:["A"],c:[40.6040,-73.7554]},
{n:"Norwood-205 St",l:["D"],c:[40.8748,-73.8789]},
{n:"Bedford Park Blvd",l:["B","D"],c:[40.8732,-73.8871]},
{n:"Kingsbridge Rd",l:["B","D"],c:[40.8670,-73.8935]},
{n:"Fordham Rd",l:["B","D"],c:[40.8613,-73.8977]},
{n:"182-183 Sts",l:["B","D"],c:[40.8561,-73.9007]},
{n:"Tremont Av",l:["B","D"],c:[40.8504,-73.9052]},
{n:"174-175 Sts",l:["B","D"],c:[40.8459,-73.9101]},
{n:"170 St",l:["B","D"],c:[40.8393,-73.9134]},
{n:"167 St",l:["B","D"],c:[40.8338,-73.9184]},
{n:"161 St-Yankee Stadium",l:["4","B","D"],c:[40.8279,-73.9257]},
{n:"155 St",l:["B","D"],c:[40.8301,-73.9382]},
{n:"21 St-Queensbridge",l:["F"],c:[40.7542,-73.9428]},
{n:"Roosevelt Island",l:["F"],c:[40.7591,-73.9533]},
{n:"Lexington Av/63 St",l:["F","Q"],c:[40.7646,-73.9661]},
{n:"57 St",l:["F"],c:[40.7640,-73.9775]},
{n:"47-50 Sts-Rockefeller Ctr",l:["B","D","F","M"],c:[40.7587,-73.9813]},
{n:"42 St-Bryant Pk",l:["7","B","D","F","M"],c:[40.7542,-73.9846]},
{n:"23 St",l:["F","M"],c:[40.7429,-73.9928]},
{n:"14 St",l:["1","2","3","F","M","L"],c:[40.7382,-73.9962]},
{n:"Broadway-Lafayette St",l:["6","B","D","F","M"],c:[40.7253,-73.9962]},
{n:"Grand St",l:["B","D"],c:[40.7183,-73.9938]},
{n:"2 Av",l:["F"],c:[40.7234,-73.9899]},
{n:"Delancey St-Essex St",l:["F","M","J","Z"],c:[40.7186,-73.9881]},
{n:"East Broadway",l:["F"],c:[40.7137,-73.9902]},
{n:"York St",l:["F"],c:[40.7014,-73.9868]},
{n:"Bergen St",l:["F","G"],c:[40.6861,-73.9909]},
{n:"Carroll St",l:["F","G"],c:[40.6803,-73.9950]},
{n:"Smith-9 Sts",l:["F","G"],c:[40.6736,-73.9960]},
{n:"4 Av-9 St",l:["F","G","R"],c:[40.6703,-73.9898]},
{n:"7 Av",l:["F","G"],c:[40.6663,-73.9803]},
{n:"15 St-Prospect Park",l:["F","G"],c:[40.6604,-73.9795]},
{n:"Fort Hamilton Pkwy",l:["F","G"],c:[40.6508,-73.9758]},
{n:"Church Av",l:["F","G"],c:[40.6440,-73.9797]},
{n:"Ditmas Av",l:["F"],c:[40.6361,-73.9782]},
{n:"18 Av",l:["F"],c:[40.6298,-73.9770]},
{n:"Avenue I",l:["F"],c:[40.6253,-73.9761]},
{n:"Bay Pkwy",l:["F"],c:[40.6208,-73.9753]},
{n:"Avenue N",l:["F"],c:[40.6151,-73.9742]},
{n:"Avenue P",l:["F"],c:[40.6089,-73.9730]},
{n:"Kings Hwy",l:["F"],c:[40.6032,-73.9724]},
{n:"Avenue U",l:["F"],c:[40.5961,-73.9734]},
{n:"Avenue X",l:["F"],c:[40.5896,-73.9742]},
{n:"Neptune Av",l:["F"],c:[40.5810,-73.9746]},
{n:"Jamaica-179 St",l:["F"],c:[40.7126,-73.7838]},
{n:"169 St",l:["F"],c:[40.7105,-73.7936]},
{n:"Parsons Blvd",l:["F"],c:[40.7076,-73.8033]},
{n:"Sutphin Blvd",l:["F"],c:[40.7055,-73.8107]},
{n:"Briarwood",l:["E","F"],c:[40.7092,-73.8206]},
{n:"Kew Gardens-Union Tpke",l:["E","F"],c:[40.7144,-73.8310]},
{n:"75 Av",l:["E","F"],c:[40.7183,-73.8373]},
{n:"Forest Hills-71 Av",l:["E","F","M","R"],c:[40.7217,-73.8445]},
{n:"67 Av",l:["M","R"],c:[40.7265,-73.8527]},
{n:"63 Dr-Rego Park",l:["M","R"],c:[40.7298,-73.8616]},
{n:"Woodhaven Blvd",l:["M","R"],c:[40.7331,-73.8692]},
{n:"Grand Av-Newtown",l:["M","R"],c:[40.7370,-73.8772]},
{n:"Elmhurst Av",l:["M","R"],c:[40.7425,-73.8820]},
{n:"Jackson Hts-Roosevelt Av",l:["7","E","F","M","R"],c:[40.7466,-73.8913]},
{n:"65 St",l:["M","R"],c:[40.7497,-73.8985]},
{n:"Northern Blvd",l:["M","R"],c:[40.7529,-73.9060]},
{n:"46 St",l:["M","R"],c:[40.7563,-73.9133]},
{n:"Steinway St",l:["M","R"],c:[40.7569,-73.9207]},
{n:"36 St",l:["M","R"],c:[40.7520,-73.9288]},
{n:"Queens Plaza",l:["E","M","R"],c:[40.7490,-73.9372]},
{n:"Court Sq-23 St",l:["7","E","M","G"],c:[40.7478,-73.9460]},
{n:"Lexington Av/53 St",l:["6","E","M"],c:[40.7576,-73.9691]},
{n:"5 Av/53 St",l:["E","M"],c:[40.7602,-73.9752]},
{n:"7 Av",l:["E","B","D"],c:[40.7629,-73.9816]},
{n:"Jamaica Center-Parsons/Archer",l:["E","J","Z"],c:[40.7021,-73.8011]},
{n:"Sutphin Blvd-Archer Av-JFK Airport",l:["E","J","Z"],c:[40.7005,-73.8080]},
{n:"Jamaica-Van Wyck",l:["E"],c:[40.7026,-73.8169]},
{n:"Court Sq",l:["7","E","M","G"],c:[40.7466,-73.9438]},
{n:"21 St",l:["G"],c:[40.7441,-73.9497]},
{n:"Greenpoint Av",l:["G"],c:[40.7314,-73.9544]},
{n:"Nassau Av",l:["G"],c:[40.7246,-73.9513]},
{n:"Metropolitan Av",l:["G","L"],c:[40.7128,-73.9514]},
{n:"Broadway",l:["G"],c:[40.7061,-73.9503]},
{n:"Flushing Av",l:["G"],c:[40.7004,-73.9502]},
{n:"Myrtle-Willoughby Avs",l:["G"],c:[40.6946,-73.9490]},
{n:"Bedford-Nostrand Avs",l:["G"],c:[40.6896,-73.9535]},
{n:"Classon Av",l:["G"],c:[40.6889,-73.9601]},
{n:"Clinton-Washington Avs",l:["G"],c:[40.6881,-73.9668]},
{n:"Fulton St",l:["G"],c:[40.6871,-73.9754]},
{n:"Van Cortlandt Park-242 St",l:["1"],c:[40.8892,-73.8986]},
{n:"238 St",l:["1"],c:[40.8847,-73.9009]},
{n:"231 St",l:["1"],c:[40.8789,-73.9048]},
{n:"Marble Hill-225 St",l:["1"],c:[40.8746,-73.9098]},
{n:"215 St",l:["1"],c:[40.8694,-73.9153]},
{n:"207 St",l:["1"],c:[40.8646,-73.9188]},
{n:"Dyckman St",l:["1"],c:[40.8605,-73.9255]},
{n:"191 St",l:["1"],c:[40.8552,-73.9294]},
{n:"181 St",l:["1"],c:[40.8495,-73.9336]},
{n:"168 St-Washington Hts",l:["1","A","C"],c:[40.8406,-73.9401]},
{n:"157 St",l:["1"],c:[40.8340,-73.9449]},
{n:"145 St",l:["1"],c:[40.8266,-73.9504]},
{n:"137 St-City College",l:["1"],c:[40.8220,-73.9537]},
{n:"125 St",l:["1"],c:[40.8156,-73.9584]},
{n:"116 St-Columbia University",l:["1"],c:[40.8077,-73.9641]},
{n:"Cathedral Pkwy (110 St)",l:["1"],c:[40.8040,-73.9668]},
{n:"103 St",l:["1"],c:[40.7994,-73.9684]},
{n:"96 St",l:["1","2","3"],c:[40.7939,-73.9723]},
{n:"86 St",l:["1"],c:[40.7886,-73.9762]},
{n:"79 St",l:["1"],c:[40.7839,-73.9799]},
{n:"72 St",l:["1","2","3"],c:[40.7785,-73.9820]},
{n:"66 St-Lincoln Center",l:["1"],c:[40.7734,-73.9822]},
{n:"50 St",l:["1"],c:[40.7617,-73.9838]},
{n:"34 St-Penn Station",l:["1","2","3"],c:[40.7504,-73.9911]},
{n:"28 St",l:["1"],c:[40.7472,-73.9934]},
{n:"23 St",l:["1"],c:[40.7441,-73.9957]},
{n:"18 St",l:["1"],c:[40.7410,-73.9979]},
{n:"Christopher St-Stonewall",l:["1"],c:[40.7334,-74.0029]},
{n:"Houston St",l:["1"],c:[40.7283,-74.0054]},
{n:"Canal St",l:["1"],c:[40.7229,-74.0063]},
{n:"Franklin St",l:["1"],c:[40.7193,-74.0069]},
{n:"Chambers St",l:["1","2","3"],c:[40.7155,-74.0093]},
{n:"WTC Cortlandt",l:["1"],c:[40.7118,-74.0122]},
{n:"Rector St",l:["1"],c:[40.7075,-74.0138]},
{n:"South Ferry",l:["1","R","W"],c:[40.7021,-74.0137]},
{n:"Park Place",l:["2","3","A","C","E","R","W"],c:[40.7131,-74.0088]},
{n:"Fulton St",l:["2","3","4","5","A","C","J","Z"],c:[40.7094,-74.0066]},
{n:"Wall St",l:["2","3"],c:[40.7068,-74.0091]},
{n:"Clark St",l:["2","3"],c:[40.6975,-73.9931]},
{n:"Borough Hall",l:["2","3","4","5","R"],c:[40.6932,-73.9900]},
{n:"Hoyt St",l:["2","3"],c:[40.6905,-73.9851]},
{n:"Nevins St",l:["2","3","4","5"],c:[40.6882,-73.9805]},
{n:"Bergen St",l:["2","3"],c:[40.6808,-73.9751]},
{n:"Grand Army Plaza",l:["2","3"],c:[40.6752,-73.9710]},
{n:"Eastern Pkwy-Brooklyn Museum",l:["2","3"],c:[40.6720,-73.9644]},
{n:"Franklin Av-Medgar Evers College",l:["2","3","4","5","S"],c:[40.6707,-73.9581]},
{n:"Nostrand Av",l:["3"],c:[40.6698,-73.9505]},
{n:"Kingston Av",l:["3"],c:[40.6694,-73.9422]},
{n:"Crown Hts-Utica Av",l:["3","4"],c:[40.6689,-73.9329]},
{n:"Sutter Av-Rutland Rd",l:["3"],c:[40.6647,-73.9226]},
{n:"Saratoga Av",l:["3"],c:[40.6615,-73.9163]},
{n:"Rockaway Av",l:["3"],c:[40.6625,-73.9089]},
{n:"Junius St",l:["3"],c:[40.6635,-73.9024]},
{n:"Pennsylvania Av",l:["3"],c:[40.6646,-73.8949]},
{n:"Van Siclen Av",l:["3"],c:[40.6654,-73.8894]},
{n:"New Lots Av",l:["3"],c:[40.6662,-73.8841]},
{n:"President St-Medgar Evers College",l:["2","5"],c:[40.6679,-73.9507]},
{n:"Sterling St",l:["2","5"],c:[40.6627,-73.9509]},
{n:"Winthrop St",l:["2","5"],c:[40.6567,-73.9502]},
{n:"Church Av",l:["2","5"],c:[40.6508,-73.9496]},
{n:"Beverly Rd",l:["2","5"],c:[40.6451,-73.9490]},
{n:"Newkirk Av-Little Haiti",l:["2","5"],c:[40.6400,-73.9484]},
{n:"Flatbush Av-Brooklyn College",l:["2","5"],c:[40.6328,-73.9476]},
{n:"Pelham Bay Park",l:["6"],c:[40.8525,-73.8281]},
{n:"Buhre Av",l:["6"],c:[40.8468,-73.8326]},
{n:"Middletown Rd",l:["6"],c:[40.8439,-73.8363]},
{n:"Westchester Sq-E Tremont Av",l:["6"],c:[40.8399,-73.8430]},
{n:"Zerega Av",l:["6"],c:[40.8365,-73.8470]},
{n:"Castle Hill Av",l:["6"],c:[40.8343,-73.8512]},
{n:"Parkchester",l:["6"],c:[40.8332,-73.8608]},
{n:"St Lawrence Av",l:["6"],c:[40.8315,-73.8676]},
{n:"Morrison Av-Soundview",l:["6"],c:[40.8295,-73.8745]},
{n:"Elder Av",l:["6"],c:[40.8286,-73.8792]},
{n:"Whitlock Av",l:["6"],c:[40.8265,-73.8863]},
{n:"Hunts Point Av",l:["6"],c:[40.8209,-73.8905]},
{n:"Longwood Av",l:["6"],c:[40.8161,-73.8964]},
{n:"E 149 St",l:["6"],c:[40.8121,-73.9041]},
{n:"E 143 St-St Mary's St",l:["6"],c:[40.8087,-73.9077]},
{n:"Cypress Av",l:["6"],c:[40.8054,-73.9140]},
{n:"Brook Av",l:["6"],c:[40.8076,-73.9192]},
{n:"3 Av-138 St",l:["6"],c:[40.8105,-73.9261]},
{n:"Woodlawn",l:["4"],c:[40.8860,-73.8788]},
{n:"Mosholu Pkwy",l:["4"],c:[40.8798,-73.8847]},
{n:"Bedford Park Blvd-Lehman College",l:["4"],c:[40.8734,-73.8901]},
{n:"Kingsbridge Rd",l:["4"],c:[40.8678,-73.8972]},
{n:"Fordham Rd",l:["4"],c:[40.8628,-73.9010]},
{n:"183 St",l:["4"],c:[40.8584,-73.9039]},
{n:"Burnside Av",l:["4"],c:[40.8535,-73.9077]},
{n:"176 St",l:["4"],c:[40.8485,-73.9118]},
{n:"Mt Eden Av",l:["4"],c:[40.8444,-73.9147]},
{n:"170 St",l:["4"],c:[40.8401,-73.9178]},
{n:"167 St",l:["4"],c:[40.8355,-73.9214]},
{n:"149 St-Grand Concourse",l:["2","4","5"],c:[40.8184,-73.9274]},
{n:"138 St-Grand Concourse",l:["4","5"],c:[40.8132,-73.9298]},
{n:"125 St",l:["4","5","6"],c:[40.8041,-73.9376]},
{n:"116 St",l:["6"],c:[40.7986,-73.9416]},
{n:"110 St",l:["6"],c:[40.7950,-73.9442]},
{n:"103 St",l:["6"],c:[40.7906,-73.9475]},
{n:"96 St",l:["6"],c:[40.7857,-73.9511]},
{n:"86 St",l:["4","5","6"],c:[40.7795,-73.9556]},
{n:"77 St",l:["6"],c:[40.7736,-73.9599]},
{n:"68 St-Hunter College",l:["6"],c:[40.7681,-73.9639]},
{n:"59 St",l:["4","5","6","N","R","W"],c:[40.7625,-73.9680]},
{n:"51 St",l:["6","E","M"],c:[40.7571,-73.9719]},
{n:"Grand Central-42 St",l:["4","5","6","7","S"],c:[40.7518,-73.9768]},
{n:"33 St",l:["6"],c:[40.7461,-73.9821]},
{n:"28 St",l:["6"],c:[40.7431,-73.9843]},
{n:"23 St",l:["6"],c:[40.7399,-73.9866]},
{n:"Astor Pl",l:["6"],c:[40.7301,-73.9911]},
{n:"Bleecker St",l:["6","B","D","F","M"],c:[40.7259,-73.9947]},
{n:"Spring St",l:["6"],c:[40.7223,-73.9971]},
{n:"Canal St",l:["6","J","Z","N","Q","R","W"],c:[40.7188,-74.0002]},
{n:"Brooklyn Bridge-City Hall",l:["4","5","6","J","Z"],c:[40.7131,-74.0041]},
{n:"Wall St",l:["4","5"],c:[40.7076,-74.0119]},
{n:"Bowling Green",l:["4","5"],c:[40.7048,-74.0141]},
{n:"Borough Hall",l:["2","3","4","5","R"],c:[40.6924,-73.9902]},
{n:"Wakefield-241 St",l:["2"],c:[40.9031,-73.8506]},
{n:"Nereid Av",l:["2","5"],c:[40.8984,-73.8544]},
{n:"233 St",l:["2","5"],c:[40.8932,-73.8575]},
{n:"225 St",l:["2","5"],c:[40.8880,-73.8603]},
{n:"219 St",l:["2","5"],c:[40.8839,-73.8626]},
{n:"Gun Hill Rd",l:["2","5"],c:[40.8779,-73.8663]},
{n:"Burke Av",l:["2","5"],c:[40.8714,-73.8672]},
{n:"Allerton Av",l:["2","5"],c:[40.8655,-73.8674]},
{n:"Pelham Pkwy",l:["2","5"],c:[40.8572,-73.8676]},
{n:"Bronx Park East",l:["2","5"],c:[40.8488,-73.8685]},
{n:"E 180 St",l:["2","5"],c:[40.8419,-73.8735]},
{n:"West Farms Sq-E Tremont Av",l:["2","5"],c:[40.8403,-73.8800]},
{n:"174 St",l:["2","5"],c:[40.8373,-73.8877]},
{n:"Freeman St",l:["2","5"],c:[40.8300,-73.8919]},
{n:"Simpson St",l:["2","5"],c:[40.8241,-73.8931]},
{n:"Intervale Av",l:["2","5"],c:[40.8222,-73.8967]},
{n:"Prospect Av",l:["2","5"],c:[40.8196,-73.9018]},
{n:"Jackson Av",l:["2","5"],c:[40.8165,-73.9078]},
{n:"3 Av-149 St",l:["2","5"],c:[40.8161,-73.9178]},
{n:"Harlem-148 St",l:["3"],c:[40.8239,-73.9365]},
{n:"145 St",l:["3"],c:[40.8204,-73.9362]},
{n:"135 St",l:["2","3"],c:[40.8142,-73.9408]},
{n:"125 St",l:["2","3"],c:[40.8078,-73.9455]},
{n:"116 St",l:["2","3"],c:[40.8021,-73.9496]},
{n:"Central Park North (110 St)",l:["2","3"],c:[40.7991,-73.9518]},
{n:"Eastchester-Dyre Av",l:["5"],c:[40.8883,-73.8308]},
{n:"Baychester Av",l:["5"],c:[40.8787,-73.8386]},
{n:"Gun Hill Rd",l:["5"],c:[40.8695,-73.8464]},
{n:"Pelham Pkwy",l:["5"],c:[40.8590,-73.8554]},
{n:"Morris Park",l:["5"],c:[40.8544,-73.8605]},
{n:"Flushing-Main St",l:["7"],c:[40.7596,-73.8300]},
{n:"Mets-Willets Point",l:["7"],c:[40.7546,-73.8456]},
{n:"111 St",l:["7"],c:[40.7517,-73.8553]},
{n:"103 St-Corona Plaza",l:["7"],c:[40.7499,-73.8627]},
{n:"Junction Blvd",l:["7"],c:[40.7491,-73.8695]},
{n:"90 St-Elmhurst Av",l:["7"],c:[40.7484,-73.8766]},
{n:"82 St-Jackson Hts",l:["7"],c:[40.7477,-73.8837]},
{n:"74 St-Broadway",l:["7","E","F","M","R"],c:[40.7468,-73.8914]},
{n:"69 St",l:["7"],c:[40.7463,-73.8964]},
{n:"61 St-Woodside",l:["7"],c:[40.7456,-73.9030]},
{n:"52 St",l:["7"],c:[40.7441,-73.9125]},
{n:"46 St-Bliss St",l:["7"],c:[40.7431,-73.9184]},
{n:"40 St-Lowery St",l:["7"],c:[40.7438,-73.9240]},
{n:"33 St-Rawson St",l:["7"],c:[40.7446,-73.9310]},
{n:"Queensboro Plaza",l:["7","N","W"],c:[40.7506,-73.9402]},
{n:"Hunters Point Av",l:["7"],c:[40.7422,-73.9489]},
{n:"Vernon Blvd-Jackson Av",l:["7"],c:[40.7426,-73.9536]},
{n:"Grand Central-42 St",l:["4","5","6","7","S"],c:[40.7514,-73.9760]},
{n:"5 Av",l:["7","B","D","F","M"],c:[40.7538,-73.9820]},
{n:"Times Sq-42 St",l:["1","2","3","7","A","C","E","N","Q","R","W","S"],c:[40.7560,-73.9862]},
{n:"Grand Central-42 St",l:["4","5","6","7","S"],c:[40.7528,-73.9792]},
{n:"34 St-Hudson Yards",l:["7"],c:[40.7559,-74.0019]},
{n:"96 St",l:["Q"],c:[40.7843,-73.9472]},
{n:"86 St",l:["Q"],c:[40.7779,-73.9518]},
{n:"72 St",l:["Q"],c:[40.7688,-73.9584]},
{n:"St George",l:["SIR"],c:[40.6437,-74.0736]},
{n:"Tompkinsville",l:["SIR"],c:[40.6369,-74.0748]},
{n:"Stapleton",l:["SIR"],c:[40.6279,-74.0752]},
{n:"Clifton",l:["SIR"],c:[40.6213,-74.0714]},
{n:"Grasmere",l:["SIR"],c:[40.6031,-74.0841]},
{n:"Old Town",l:["SIR"],c:[40.5966,-74.0874]},
{n:"Dongan Hills",l:["SIR"],c:[40.5888,-74.0961]},
{n:"Jefferson Av",l:["SIR"],c:[40.5836,-74.1033]},
{n:"Grant City",l:["SIR"],c:[40.5790,-74.1097]},
{n:"New Dorp",l:["SIR"],c:[40.5735,-74.1172]},
{n:"Oakwood Heights",l:["SIR"],c:[40.5651,-74.1263]},
{n:"Bay Terrace",l:["SIR"],c:[40.5564,-74.1369]},
{n:"Great Kills",l:["SIR"],c:[40.5512,-74.1514]},
{n:"Eltingville",l:["SIR"],c:[40.5446,-74.1646]},
{n:"Annadale",l:["SIR"],c:[40.5405,-74.1782]},
{n:"Huguenot",l:["SIR"],c:[40.5337,-74.1918]},
{n:"Prince's Bay",l:["SIR"],c:[40.5255,-74.2001]},
{n:"Pleasant Plains",l:["SIR"],c:[40.5224,-74.2178]},
{n:"Richmond Valley",l:["SIR"],c:[40.5196,-74.2291]},
{n:"Tottenville",l:["SIR"],c:[40.5128,-74.2520]},
{n:"Arthur Kill",l:["SIR"],c:[40.5166,-74.2421]}
];
const LINE_COLOR={"1":"#EE352E","2":"#EE352E","3":"#EE352E","4":"#00933C","5":"#00933C","6":"#00933C","7":"#B933AD","A":"#0039A6","C":"#0039A6","E":"#0039A6","B":"#FF6319","D":"#FF6319","F":"#FF6319","M":"#FF6319","G":"#6CBE45","J":"#996633","Z":"#996633","L":"#A7A9AC","N":"#FCCC0A","Q":"#FCCC0A","R":"#FCCC0A","W":"#FCCC0A","S":"#808183"};
const nearestSubways=(coord,maxKm,n)=>{
  const out=[];
  for(const s of SUBWAY){
    const d=kmdist(coord,s.c);
    if(d<=(maxKm||0.6))out.push({...s,d});
  }
  return out.sort((a,b)=>a.d-b.d).slice(0,n||2);
};

// Estimate travel time (minutes) from home to a coord using walking + subway heuristic.
// Returns { mins, mode:'walk'|'transit', line:string|null }
// Uses the hardcoded SUBWAY stations — no external API, works offline.
function transitTime(home,coord){
  // Street distance ≈ 1.25 × straight line; walking 4.8 km/h. Subway: walk to the best of the 3 nearest
  // stations each side, wait (longer late), ride ~27 km/h along a 1.25× track, +6 min per transfer.
  const d=kmdist(home,coord), WALK=1.25*60/4.8;
  const walk=Math.max(1,Math.round(d*WALK));
  const W={mins:walk,mode:"walk",line:null,toLine:null,direct:true,walk};
  if(walk<=18)return W;
  const uStops=nearestSubways(home,1.1,6), eStops=nearestSubways(coord,1.1,6);
  if(!uStops.length||!eStops.length)return W;
  const h=new Date().getHours(), wait=h>=22||h<6?8:h>=20?6:4;
  let best=null;
  for(const u of uStops)for(const e of eStops){
    if(u.n===e.n)continue;
    const shared=u.l.find(l=>e.l.includes(l))||null;
    const t=u.d*WALK+2+wait+kmdist(u.c,e.c)*1.25*(60/27)+(shared?0:6)+e.d*WALK+1;
    if(!best||t<best.t)best={t,u,e,shared};
  }
  if(!best)return W;
  const tr=Math.max(5,Math.round(best.t));
  // Walk unless the subway saves real time
  if(walk<=tr+6||walk<=22&&walk<=tr+10)return W;
  return{mins:tr,mode:"transit",line:best.shared||best.u.l[0]||null,toLine:best.shared?null:(best.e.l[0]||null),direct:!!best.shared,walk};
}


// Compute a priority bonus (−15 to +20) based on a parsed priorityProfile.
// pp comes from the user's natural-language priorities → Claude parse.
// This is a transparent bonus: visible as its own row in the score breakdown.
function calcPriority(ev,pp,today){
  if(!pp)return 0;
  let b=0;
  const cat=ev.cat||"Other",sub=ev.sub||"";
  const text=((ev.title||"")+" "+(ev.desc||"")).toLowerCase();
  const free=(ev.price||"").toLowerCase().includes("free");
  const dow=new Date().getDay(),hr=new Date().getHours();
  const isWeekend=dow===0||dow===6||dow===5;
  // Category matches
  if((pp.favCats||[]).includes(cat))b+=10;
  if((pp.avoidCats||[]).includes(cat))b-=10;
  // Subcategory matches
  if(sub&&(pp.favSubcats||[]).includes(sub))b+=8;
  // Keyword hits in title/desc
  const hits=(pp.keywords||[]).filter(k=>text.includes(k.toLowerCase())).length;
  b+=Math.min(8,hits*3);
  // Free bonus
  if(pp.freeBonus&&free)b+=5;
  // Context boosts
  if(isWeekend&&(pp.weekendBoost||[]).includes(cat))b+=5;
  if(hr>=17&&(pp.eveningBoost||[]).includes(cat))b+=4;
  // Advance booking window: boost ticketed events exactly in the user's stated window
  if(pp.advanceBooking&&ev.ticket&&today){
    const daysAway=Math.round((evStart(ev)-today)/86400000);
    const{minDays=4,maxDays=10}=pp.advanceBooking;
    if(daysAway>=minDays&&daysAway<=maxDays)b+=14; // strong signal — exactly what they asked for
  }
  return Math.max(-15,Math.min(20,Math.round(b)));
}
// Check whether a Good Plans event's time slot overlaps with a calendar busy slot.
// Only fires when the event has a specific known time (not "All day").
// Multi-day runs are never dimmed — being busy one evening doesn't block a whole festival.
// Assumes a ~2.5h default duration for Good Plans events (typical for NYC events).
function isEventBusy(ev, busySlots){
  if(!busySlots||!busySlots.length)return false;
  if(!ev.E||!ev.time||ev.time==="All day"||ev.time==="Various")return false;
  if(ev.X&&ev.X!==ev.E)return false; // multi-day run — never dim
  const evStart=eHour(ev.time,ev.cat);
  const evEnd=evStart+2.5; // assume ~2.5h
  return busySlots.some(slot=>{
    if(slot.date!==ev.E)return false;
    // Overlap: ev starts before slot ends AND ev ends after slot starts
    return evStart<slot.endH&&evEnd>slot.startH;
  });
}
// Returns true if the event is a meaningful match.
function matchesInterest(ev, interest){
  if(!interest)return false;
  const text=((ev.title||"")+" "+(ev.desc||"")).toLowerCase();
  const catMatch=(interest.favCats||[]).includes(ev.cat);
  const subMatch=ev.sub&&(interest.favSubcats||[]).includes(ev.sub);
  const kwHits=(interest.keywords||[]).filter(k=>text.includes(k.toLowerCase())).length;
  // Time filter: exclude events outside the stated preference
  const h=eHour(ev.time,ev.cat),dow=new Date().getDay();
  const isWeekend=dow===0||dow===5||dow===6;
  if(interest.timeFilter==="daytime"&&h>=18)return false;
  if(interest.timeFilter==="evening"&&h<17)return false;
  if(interest.timeFilter==="weekend"&&!isWeekend)return false;
  // Must have at least a category match OR a sub match OR 2+ keyword hits
  return catMatch||subMatch||kwHits>=2;
}

// Compute how similar a new event is to something the user already saved.
// Returns {score, matchedTitle} — score 0-12; 7+ is worth flagging.
function similarToSaved(ev, favs){
  const saved=Object.values(favs||{});
  if(!saved.length)return{score:0,matchedTitle:null};
  let best=0,matchedTitle=null;
  for(const s of saved){
    let sim=0;
    if(s.cat===ev.cat)sim+=3;
    if(s.sub&&s.sub===ev.sub)sim+=4;
    // Keyword overlap in titles (meaningful words >3 chars)
    const evW=(ev.title||"").toLowerCase().split(/\s+/).filter(w=>w.length>3);
    const sW =(s.title ||"").toLowerCase().split(/\s+/).filter(w=>w.length>3);
    sim+=Math.min(5,evW.filter(w=>sW.includes(w)).length*2);
    if(sim>best){best=sim;matchedTitle=s.title;}
  }
  return{score:best,matchedTitle};
}
// applied to the TOTAL only, and the final 0-100 total.
// Component maxes: Taste 50, Nearby 15, Behaviour 15, Quality 15, Urgency 20.
// "Nearby" uses estimated travel time (walking or subway), not raw distance.
function calcBd(ev,prof,beh,today,home,pp){
  const cat=ev.cat||"Other";
  const catPref=prof.categories?.[cat]??30;
  const rl=runLen(ev),de=Math.round((evEnd(ev)-today)/86400000);
  const coord=safeCoord(ev);
  const d=kmdist(coord,home);
  const subKey=cat+"::"+(ev.sub||"");
  const subPrefRaw=(prof.subcategories?.[subKey]??DEFAULT_SUBS[subKey]??50);
  const subHidden=ev.sub&&subPrefRaw===0;
  const excluded=catPref===0||subHidden;
  const effectiveSubPref=(catPref/100)*subPrefRaw;

  // Taste — dominant, max 50
  let taste=Math.max(0,Math.min(50, catPref*0.44+(effectiveSubPref-50)*0.14));
  // Nearby — travel time (walk or subway), max 15
  const tt=transitTime(home,coord);
  let near=0;
  if(tt.mins<=5)near=15;else if(tt.mins<=10)near=13;else if(tt.mins<=15)near=10;
  else if(tt.mins<=20)near=7;else if(tt.mins<=30)near=4;else if(tt.mins<=45)near=2;
  // Behaviour — max 15
  let bh=0;
  if(beh.viewedCats?.[cat])bh+=Math.min(beh.viewedCats[cat]*1.5,4);
  if(beh.savedCats?.[cat])bh+=Math.min(beh.savedCats[cat]*3,5);
  if(beh.calCats?.[cat])bh+=Math.min(beh.calCats[cat]*4,6);
  bh=Math.min(15,bh);
  // Quality (source tier) — max 15
  let qual=({1:15,2:8,3:0})[ev.tier||2]??8;
  // Urgency — max 20
  let urg=0;
  if(rl===1)urg=20;else if(rl<=3)urg=15;else if(de<=3)urg=12;else if(de<=7)urg=8;else if(de<=14)urg=4;
  if(rl>30)urg=Math.max(0,urg-5);

  const mult=excluded?0:Math.max(0.3,Math.min(2.0,catPref/50));
  const prio=excluded?0:calcPriority(ev,pp||null,today);
  const raw=taste+near+bh+qual+urg+prio;
  const total=excluded?0:Math.max(0,Math.min(100,Math.round(raw*mult)));

  const free=(ev.price||"").toLowerCase().includes("free");
  const why=[];
  if(catPref===0)why.push("Hidden — "+cat+" set to 0%");
  else if(subHidden)why.push("Hidden — "+ev.sub+" set to 0%");
  else{
    if(taste>30)why.push("Strong "+cat+" match");else if(taste>18)why.push("Matches your "+cat+" taste");
    if(tt.mins<=5)why.push("Very close (~"+tt.mins+" min)");
    else if(tt.mins<=15)why.push(tt.mode==="transit"?"🚇 ~"+tt.mins+" min"+(tt.line?" on "+tt.line:""):"🚶 ~"+tt.mins+" min walk");
    else if(tt.mins<=25)why.push("~"+tt.mins+" min away");
    if(ev.tier===1)why.push("Top source pick");
    if(rl===1)why.push("One night only");else if(rl<=3)why.push("Short run");else if(de<=7)why.push("Ending soon");
    if(free)why.push("Free admission");
    if(catPref<50)why.push("Demoted — "+cat+" at "+catPref+"% ("+mult.toFixed(1)+"×)");
    else if(catPref>50)why.push("Boosted — "+cat+" at "+catPref+"% ("+mult.toFixed(1)+"×)");
  }
  return{excluded,taste:Math.round(taste),near:Math.round(near),bh:Math.round(bh),qual,urg,prio,mult,total,why,d:d.toFixed(1),tt};
}

function calcScore(ev,prof,beh,today,home,pp){
  const bd=calcBd(ev,prof,beh,today,home,pp);
  return bd.excluded?-1:bd.total;
}

function matchV(ev,vk){
  const h=eHour(ev.time,ev.cat),free=(ev.price||"").toLowerCase().includes("free");
  const n=parseFloat((ev.price||"").replace(/[^0-9.]/g,"")||"999"),cheap=free||n<20,t=ev.tags||[];
  const m={
    chill:()=>cheap&&h<21,
    dance:()=>(ev.cat==="Music"&&h>=21)||t.includes("dance"),
    culture:()=>["Art & Culture","Film","Music","Talk & Learn"].includes(ev.cat),
    eat:()=>ev.cat==="Food & Drink",
    weird:()=>t.includes("weird")||t.includes("unusual")||t.includes("offbeat")||ev.cat==="Other",
    date:()=>["Art & Culture","Music","Film","Food & Drink","Get Creative"].includes(ev.cat)&&(ev.tier||2)<=2&&h>=17,
    kids:()=>ev.cat==="Family",
    solo:()=>["Art & Culture","Film","Talk & Learn","Get Creative"].includes(ev.cat),
    big:()=>["Music","Nightlife","Comedy"].includes(ev.cat)&&h>=20,
    sunday:()=>["Outdoors","Food & Drink","Art & Culture","Get Creative"].includes(ev.cat),
    nyc:()=>(ev.tier||2)===1||t.includes("local"),
    free:()=>free&&h<20,
    late:()=>h>=21,
    move:()=>ev.cat==="Sports"&&t.includes("do"),
    watch:()=>ev.cat==="Sports"&&t.includes("watch"),
  };
  return m[vk]?.()===true;
}

const bookSoon=(ev,today)=>daysUntil(ev,today)>=1&&daysUntil(ev,today)<=30&&runLen(ev)<=7&&ev.ticket===true&&(ev.tier||2)<=2;

const withTimeout=(promise,ms,label)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||"Request")+" timed out after "+Math.round(ms/1000)+"s")),ms))
]);

// ── Google Calendar OAuth utilities (module-level, not inside component) ─────
function loadGIS(){
  return new Promise((resolve,reject)=>{
    if(window.google?.accounts?.oauth2){resolve();return;}
    const s=document.createElement("script");
    s.src="https://accounts.google.com/gsi/client";
    s.onload=resolve;s.onerror=reject;
    document.head.appendChild(s);
  });
}
async function fetchBusyWithToken(token,selectedId){
  const now=new Date(),end=new Date(now.getTime()+21*86400000);
  const resp=await fetch("https://www.googleapis.com/calendar/v3/freeBusy",{
    method:"POST",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({timeMin:now.toISOString(),timeMax:end.toISOString(),items:[{id:selectedId||"primary"}]}),
  });
  const data=await resp.json();
  const busy=(data.calendars?.[selectedId||"primary"]?.busy)||[];
  return busy.map(b=>{
    const s=new Date(b.start),e=new Date(b.end);
    return{date:s.toISOString().split("T")[0],startH:s.getHours()+s.getMinutes()/60,endH:e.getHours()+e.getMinutes()/60};
  });
}




export {runDows,nextOn,CATS,VIBES,DP,SK_P,SK_F,SK_B,VAPID_PUBLIC_KEY,getSWRegistration,subscribePush,registerSubWithAppsScript,DEFAULT_SUBS,sg,ss,mkDate,floorDay,evEnd,evStart,evCovers,evActive,runLen,daysUntil,DAYS,MONTHS,fmtD,friendlyDate,eHour,hasKnownTime,parseT,toGC,HOOD_COORD,isImprecise,safeCoord,kmdist,SUBWAY,LINE_COLOR,nearestSubways,transitTime,isEventBusy,similarToSaved,calcBd,calcScore,matchV,bookSoon,withTimeout,loadGIS,fetchBusyWithToken};
