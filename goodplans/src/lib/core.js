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
const evCovers=(ev,d)=>d>=evStart(ev)&&d<=evEnd(ev);
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
const SUBWAY=[
  // Manhattan
  {n:"14 St-Union Sq",l:["L","N","Q","R","W","4","5","6"],c:[40.7349,-73.9907]},
  {n:"Times Sq-42 St",l:["1","2","3","7","N","Q","R","W","S"],c:[40.7559,-73.9870]},
  {n:"Grand Central-42 St",l:["4","5","6","7","S"],c:[40.7527,-73.9772]},
  {n:"34 St-Penn Station",l:["1","2","3"],c:[40.7506,-73.9909]},
  {n:"34 St-Herald Sq",l:["B","D","F","M","N","Q","R","W"],c:[40.7497,-73.9879]},
  {n:"59 St-Columbus Circle",l:["1","A","B","C","D"],c:[40.7681,-73.9819]},
  {n:"42 St-Bryant Pk",l:["B","D","F","M","7"],c:[40.7546,-73.9842]},
  {n:"23 St (6th Ave)",l:["F","M"],c:[40.7421,-73.9938]},
  {n:"W 4 St-Wash Sq",l:["A","B","C","D","E","F","M"],c:[40.7322,-74.0006]},
  {n:"Astor Pl",l:["6"],c:[40.7299,-73.9911]},
  {n:"Delancey-Essex St",l:["F","J","M","Z"],c:[40.7185,-73.9879]},
  {n:"2 Av",l:["F"],c:[40.7235,-73.9897]},
  {n:"Bowery",l:["J","Z"],c:[40.7203,-73.9938]},
  {n:"East Broadway",l:["F"],c:[40.7137,-73.9900]},
  {n:"Canal St",l:["J","N","Q","R","Z","6","W"],c:[40.7185,-74.0001]},
  {n:"Chambers St",l:["1","2","3","A","C","J","Z"],c:[40.7152,-74.0090]},
  {n:"Wall St",l:["2","3","4","5"],c:[40.7077,-74.0099]},
  {n:"Fulton St",l:["2","3","4","5","A","C","J","Z"],c:[40.7102,-74.0090]},
  {n:"World Trade Center",l:["E","R"],c:[40.7126,-74.0099]},
  {n:"Spring St",l:["6","C","E"],c:[40.7224,-73.9974]},
  {n:"Houston St",l:["1"],c:[40.7282,-74.0050]},
  {n:"Christopher St-Sheridan Sq",l:["1"],c:[40.7335,-74.0026]},
  {n:"14 St (8th Ave)",l:["A","C","E","L"],c:[40.7407,-74.0024]},
  {n:"23 St (8th Ave)",l:["C","E"],c:[40.7457,-73.9999]},
  {n:"50 St (Bway)",l:["1"],c:[40.7615,-73.9839]},
  {n:"66 St-Lincoln Ctr",l:["1"],c:[40.7733,-73.9821]},
  {n:"72 St",l:["1","2","3"],c:[40.7783,-73.9819]},
  {n:"86 St (Bway)",l:["1"],c:[40.7886,-73.9763]},
  {n:"96 St (Bway)",l:["1","2","3"],c:[40.7935,-73.9725]},
  {n:"125 St (Bway)",l:["1"],c:[40.8157,-73.9583]},
  {n:"68 St-Hunter College",l:["6"],c:[40.7686,-73.9645]},
  {n:"77 St",l:["6"],c:[40.7740,-73.9598]},
  {n:"86 St (Lex)",l:["4","5","6"],c:[40.7790,-73.9555]},
  {n:"96 St (Lex)",l:["6"],c:[40.7853,-73.9514]},
  {n:"125 St (Lex)",l:["4","5","6"],c:[40.8044,-73.9374]},
  {n:"Lexington Av-63 St",l:["F","Q"],c:[40.7649,-73.9663]},
  // Brooklyn
  {n:"Bedford Av",l:["L"],c:[40.7172,-73.9568]},
  {n:"Lorimer St",l:["L","G"],c:[40.7140,-73.9504]},
  {n:"Graham Av",l:["L"],c:[40.7146,-73.9442]},
  {n:"Grand St",l:["L"],c:[40.7118,-73.9402]},
  {n:"Greenpoint Av",l:["G"],c:[40.7314,-73.9540]},
  {n:"Nassau Av",l:["G"],c:[40.7244,-73.9514]},
  {n:"Metropolitan Av",l:["G"],c:[40.7128,-73.9512]},
  {n:"Atlantic Av-Barclays",l:["B","D","N","Q","R","W","2","3","4","5"],c:[40.6841,-73.9772]},
  {n:"DeKalb Av",l:["B","Q","R"],c:[40.6905,-73.9817]},
  {n:"Jay St-MetroTech",l:["A","C","F","R"],c:[40.6924,-73.9870]},
  {n:"Hoyt St",l:["2","3"],c:[40.6905,-73.9851]},
  {n:"Court Sq",l:["G","7","E","M"],c:[40.7470,-73.9457]},
  {n:"Bergen St",l:["F","G","2","3"],c:[40.6809,-73.9756]},
  {n:"Carroll St",l:["F","G"],c:[40.6796,-73.9956]},
  {n:"Smith-9 Sts",l:["F","G"],c:[40.6736,-73.9959]},
  {n:"4 Av-9 St",l:["F","G","R"],c:[40.6705,-73.9897]},
  {n:"7 Av (Park Slope)",l:["F","G"],c:[40.6663,-73.9805]},
  {n:"15 St-Prospect Pk",l:["F","G"],c:[40.6606,-73.9794]},
  {n:"Prospect Park",l:["B","Q","S"],c:[40.6618,-73.9620]},
  {n:"Grand Army Plaza",l:["2","3"],c:[40.6750,-73.9707]},
  {n:"Eastern Pkwy-Museum",l:["2","3"],c:[40.6720,-73.9645]},
  {n:"Franklin Av",l:["2","3","4","5","C","S"],c:[40.6705,-73.9580]},
  {n:"Nostrand Av",l:["3","A","C"],c:[40.6800,-73.9504]},
  {n:"Marcy Av",l:["J","M","Z"],c:[40.7088,-73.9577]},
  {n:"Hewes St",l:["J","M"],c:[40.7068,-73.9531]},
  {n:"Lorimer St (J)",l:["J","M"],c:[40.7036,-73.9474]},
  // Queens
  {n:"Court Sq-23 St",l:["E","G","M","7"],c:[40.7470,-73.9457]},
  {n:"Vernon Blvd-Jackson Av",l:["7"],c:[40.7426,-73.9536]},
  {n:"Hunters Point Av",l:["7"],c:[40.7424,-73.9482]},
  {n:"Queensboro Plaza",l:["7","N","W"],c:[40.7507,-73.9402]},
  {n:"Long Island City-Court Sq",l:["7"],c:[40.7470,-73.9430]},
  {n:"Astoria-Ditmars",l:["N","W"],c:[40.7758,-73.9123]},
  {n:"Roosevelt Av-Jackson Hts",l:["E","F","M","R","7"],c:[40.7466,-73.8915]},
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
  const uStops=nearestSubways(home,1.0,3), eStops=nearestSubways(coord,1.0,3);
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




export {CATS,VIBES,DP,SK_P,SK_F,SK_B,VAPID_PUBLIC_KEY,getSWRegistration,subscribePush,registerSubWithAppsScript,DEFAULT_SUBS,sg,ss,mkDate,floorDay,evEnd,evStart,evCovers,evActive,runLen,daysUntil,DAYS,MONTHS,fmtD,friendlyDate,eHour,hasKnownTime,parseT,toGC,HOOD_COORD,isImprecise,safeCoord,kmdist,SUBWAY,LINE_COLOR,nearestSubways,transitTime,isEventBusy,similarToSaved,calcBd,calcScore,matchV,bookSoon,withTimeout,loadGIS,fetchBusyWithToken};
