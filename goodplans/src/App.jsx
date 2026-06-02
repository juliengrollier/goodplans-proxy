import React, { useState, useEffect, useRef } from "react";

const TEAL="#00796B",CORAL="#FF6B6B",INK="#111111",CREAM="#F7F5F0",WHITE="#FFFFFF",GRAY="#6B7280",GRAY_LT="#E8E6E0";
const UK="Xl4w_72vZpddQ2fy8uYG8nbPzRXoiL_8RX5-_ot7CHk";
const LOGO="data:image/jpeg;base64,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Nx/TTt/dK3plYkbrLu9Gq3Bpul2mvJ0uj7DT6asMVppXc0Ue4J918GtND2HVlJ3N2pWPeOkgGCF6nCY91j3kjOVEHDo14K93Xs4U0krn227ljPJpYuuh7OdzMjGyXnwZ3+7VlWggdVO/qtqyLPllF8PjP/xNS6M4Gads1VHV15+3TRnIzsFtenhipo2w08bY4mjAa0YCzRY2WORbpxKqFqC0eW1/oazazoPs1yj+8aPu5AN2rU1P2cKdlxa+e6d5Tg55eTGR6KwbfCcgoST1KRulFaRqyuMovfZrydNpPTlu01a2W+3QiONo39SV3CIsZScntluqpVQUUERFiZhERCQiIgCIibAREQBERAEREAREQbCIiEBERCQiIgCIiAIiIAiIhIREQjYREQBCA5pafMEIilENbNG6s4Cx3nUNZdG3EtFQ/mwXdF3nC7hK3Rl6fcm1hmcWFgbn1W1+b2CgbfnlbHZJrRRWBWrO6XkxAI+IbrIId0WnWi+loIiKSQiIhAREQBERY/JIREU7GwiImzEIiKdkhERCAiIhIREQkIiIQgiIhPoIiIQEREAREQBERQwEREQCIikBERAEREAREQgIiISEREICIiEhERAwiIhAREQkIiIYhERCQiIiJCIilAIiIyUERFBDCIiEBERCQiIsWSEREMQiIhIREUoBERSAiIgCIiGQREQx+QiIhLCIiGIREQk//9k=";

const CATS={
  "Music":{emoji:"🎵",color:"#7C3AED",bg:"#EDE7F6",sub:["Live Jazz","Blues","Classical","Hip-Hop","Indie/Alt","Electronic","Brass/Funk","World Music","Soul/R&B","Rock","Open Mic","Karaoke"]},
  "Comedy":{emoji:"😂",color:"#EA580C",bg:"#FFF7ED",sub:["Stand-up","Improv","Variety","Storytelling"]},
  "Art & Culture":{emoji:"🎨",color:"#BE185D",bg:"#FCE7F3",sub:["Exhibition","Performance Art","Theater","Workshop","Street Art"]},
  "Film":{emoji:"🎬",color:"#1D4ED8",bg:"#EFF6FF",sub:["Outdoor Screening","Arthouse","Documentary","Film Series"]},
  "Food & Drink":{emoji:"🍽️",color:"#059669",bg:"#ECFDF5",sub:["Street Fair","Markets & Fairs","Night Market","Tasting","Pop-up","Bar Night"]},
  "Outdoors":{emoji:"🌿",color:"#15803D",bg:"#F0FDF4",sub:["Park Event","Waterfront","Walking Tour","Garden","Parades & Celebrations"]},
  "Sports":{emoji:"⚽",color:"#0369A1",bg:"#E0F2FE",sub:["Running","Kayaking","Yoga","Cycling","Fitness","Wellness","Martial Arts","Soccer","Baseball","Basketball"]},
  "Family":{emoji:"👨‍👩‍👧",color:"#D97706",bg:"#FFFBEB",sub:["Kids","Educational","Festival","Playground"]},
  "Talk & Learn":{emoji:"🎤",color:"#0891B2",bg:"#ECFEFF",sub:["Lecture","Panel","Book Launch","Literary & Books","History Tour"]},
  "Get Creative":{emoji:"🧑‍🎨",color:"#B45309",bg:"#FFFBEB",sub:["Painting","Drawing","Pottery","Ceramics","Glassmaking","Printmaking","Sewing & Textiles","Jewellery","Sculpture","Photography","Woodworking","Music & Instruments","Singing & Voice","Dance Class","Cooking Class","Cocktail Class","Open Studio"]},
  "Nightlife":{emoji:"🌙",color:"#9333EA",bg:"#FAF5FF",sub:["Dance Party","Late Night","Club Night"]},
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
  categories:{Music:60,Comedy:60,"Art & Culture":50,Film:25,"Food & Drink":15,Outdoors:70,Sports:35,Family:35,"Talk & Learn":25,"Get Creative":45,Nightlife:25,Other:30},
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
const eHour=t=>{if(!t||t==="All day")return 12;const m=t.match(/(\d+):?(\d*)\s*(AM|PM)/i);if(!m)return 12;let h=parseInt(m[1]);if(m[3].toUpperCase()==="PM"&&h!==12)h+=12;if(m[3].toUpperCase()==="AM"&&h===12)h=0;return h;};
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
const nearestSubways=(coord,maxKm)=>{
  const out=[];
  for(const s of SUBWAY){
    const d=kmdist(coord,s.c);
    if(d<=(maxKm||0.6))out.push({...s,d});
  }
  return out.sort((a,b)=>a.d-b.d).slice(0,2);
};


function calcScore(ev,prof,beh,today,home){
  const cat=ev.cat||"Other",rl=runLen(ev),de=Math.round((evEnd(ev)-today)/86400000);
  const dow=today.getDay(),hr=new Date().getHours(),mo=today.getMonth();
  const we=dow===5||dow===6||dow===0,free=(ev.price||"").toLowerCase().includes("free");
  const d=kmdist(safeCoord(ev),home);
  const subKey=cat+"::"+(ev.sub||"");
  const subPref=(prof.subcategories?.[subKey]??DEFAULT_SUBS[subKey]??50);
  let s=(prof.categories?.[cat]||30)*0.55+(subPref-50)*0.12;
  if(d<1)s+=12;else if(d<3)s+=8;else if(d<7)s+=4;else if(d>15)s-=4;
  if(beh.viewedCats?.[cat])s+=Math.min(beh.viewedCats[cat]*1.5,5);
  if(beh.savedCats?.[cat])s+=Math.min(beh.savedCats[cat]*3,7);
  if(beh.calCats?.[cat])s+=Math.min(beh.calCats[cat]*4,8);
  s+=({1:15,2:8,3:0})[ev.tier||2]??8;
  if(rl===1)s+=20;else if(rl<=3)s+=15;else if(de<=3)s+=12;else if(de<=7)s+=8;else if(de<=14)s+=4;
  if(rl>30)s-=5;
  if(we&&["Outdoors","Food & Drink","Sports"].includes(cat))s+=8;
  if(we&&cat==="Music")s+=6;
  if((hr>=17||we)&&cat==="Comedy")s+=6;
  if(!we&&cat==="Art & Culture")s+=4;
  if(mo>=4&&mo<=8&&cat==="Outdoors")s+=6;
  if(free)s+=8;else{const n=parseFloat((ev.price||"").replace(/[^0-9.]/g,"")||"999");if(n<10)s+=5;else if(n<20)s+=3;else if(n<35)s+=1;}
  // Preference multiplier — category at 0% halves the score, at 100% adds 10% boost
  const prefMult=0.5+0.6*(prof.categories?.[cat]||30)/100;
  s=s*prefMult;
  return Math.max(0,Math.min(100,Math.round(s)));
}

function calcBd(ev,prof,beh,today,home){
  const cat=ev.cat||"Other",rl=runLen(ev),de=Math.round((evEnd(ev)-today)/86400000);
  const dow=today.getDay(),hr=new Date().getHours(),mo=today.getMonth();
  const we=dow===5||dow===6||dow===0,free=(ev.price||"").toLowerCase().includes("free");
  const d=kmdist(safeCoord(ev),home);
  const subKey=cat+"::"+(ev.sub||"");
  const subPref=(prof.subcategories?.[subKey]??DEFAULT_SUBS[subKey]??50);
  let taste=(prof.categories?.[cat]||30)*0.55+(subPref-50)*0.12,bh=0,ed=0,urg=0,ctx=0,deal=0;
  if(d<1)taste+=12;else if(d<3)taste+=8;else if(d<7)taste+=4;else if(d>15)taste-=4;
  if(beh.viewedCats?.[cat])bh+=Math.min(beh.viewedCats[cat]*1.5,5);
  if(beh.savedCats?.[cat])bh+=Math.min(beh.savedCats[cat]*3,7);
  if(beh.calCats?.[cat])bh+=Math.min(beh.calCats[cat]*4,8);
  ed=({1:15,2:8,3:0})[ev.tier||2]??8;
  if(rl===1)urg=20;else if(rl<=3)urg=15;else if(de<=3)urg=12;else if(de<=7)urg=8;else if(de<=14)urg=4;
  if(rl>30)urg=Math.max(0,urg-5);
  if(we&&["Outdoors","Food & Drink","Sports"].includes(cat))ctx+=8;
  if(we&&cat==="Music")ctx+=6;
  if((hr>=17||we)&&cat==="Comedy")ctx+=6;
  if(!we&&cat==="Art & Culture")ctx+=4;
  if(mo>=4&&mo<=8&&cat==="Outdoors")ctx+=6;
  if(free)deal=8;else{const n=parseFloat((ev.price||"").replace(/[^0-9.]/g,"")||"999");if(n<10)deal=5;else if(n<20)deal=3;else if(n<35)deal=1;}
  const prefMult=0.5+0.6*(prof.categories?.[cat]||30)/100;
  const total=Math.max(0,Math.min(100,Math.round((taste+bh+ed+urg+ctx+deal)*prefMult)));
  const why=[];
  if(taste>12)why.push("Matches your "+cat+" taste");
  if(d<2)why.push("Very close ("+d.toFixed(1)+"km)");else if(d<5)why.push("Nearby ("+d.toFixed(1)+"km)");
  if(ev.tier===1)why.push("Top source pick");
  if(rl===1)why.push("One night only");else if(rl<=3)why.push("Short run");else if(de<=7)why.push("Ending soon");
  if(free)why.push("Free admission");
  return{taste:Math.round(taste),bh:Math.round(bh),ed,urg,ctx:Math.round(ctx),deal,total,why,d:d.toFixed(1)};
}

function matchV(ev,vk){
  const h=eHour(ev.time),free=(ev.price||"").toLowerCase().includes("free");
  const n=parseFloat((ev.price||"").replace(/[^0-9.]/g,"")||"999"),cheap=free||n<20,t=ev.tags||[];
  const m={
    chill:()=>cheap&&h<21,
    dance:()=>(ev.cat==="Music"&&h>=21)||t.includes("dance"),
    culture:()=>["Art & Culture","Film","Music","Talk & Learn"].includes(ev.cat),
    eat:()=>ev.cat==="Food & Drink",
    weird:()=>["Comedy","Other"].includes(ev.cat)||t.includes("weird"),
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

const IC={};
async function fetchImg(cat){
  if(IC[cat])return IC[cat];
  const q={"Music":"live music concert stage lights","Comedy":"comedy show laughing audience","Art & Culture":"art gallery museum exhibition","Film":"outdoor cinema film screening night","Food & Drink":"street food market vendors","Outdoors":"new york city park summer","Sports":"outdoor sport fitness activity","Family":"family outdoor kids summer fun","Talk & Learn":"lecture talk event podium","Get Creative":"art workshop creative class studio","Nightlife":"nightclub dance party lights","Other":"new york city skyline night"}[cat]||"new york city";
  try{
    const r=await fetch("https://api.unsplash.com/photos/random?query="+encodeURIComponent(q)+"&orientation=landscape&client_id="+UK);
    const d=await r.json();
    IC[cat]=d?.urls?.small||null;
    return IC[cat];
  }catch{return null;}
}

function Slider({value,onChange,min,max,step,color}){
  const mn=min??0,mx=max??100,st=step??1,c=color||TEAL;
  const trackRef=useRef(null);
  const draggingRef=useRef(false);
  const pct=mx>mn?((value-mn)/(mx-mn))*100:0;
  const updateFromX=(clientX)=>{
    if(!trackRef.current)return;
    const r=trackRef.current.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(clientX-r.left)/r.width));
    onChange(Math.round((mn+ratio*(mx-mn))/st)*st);
  };
  const onMove=(e)=>{
    if(!draggingRef.current)return;
    if(e.preventDefault)e.preventDefault();
    updateFromX(e.touches?e.touches[0].clientX:e.clientX);
  };
  const onEnd=()=>{
    draggingRef.current=false;
    window.removeEventListener("pointermove",onMove);
    window.removeEventListener("pointerup",onEnd);
    window.removeEventListener("touchmove",onMove);
    window.removeEventListener("touchend",onEnd);
  };
  const onStart=(e)=>{
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current=true;
    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",onEnd);
    window.addEventListener("touchmove",onMove,{passive:false});
    window.addEventListener("touchend",onEnd);
  };
  return (
    <div ref={trackRef} style={{position:"relative",height:30,display:"flex",alignItems:"center",userSelect:"none",touchAction:"none"}}>
      <div style={{height:5,background:GRAY_LT,borderRadius:3,width:"100%",position:"relative"}}>
        <div style={{height:5,background:c,borderRadius:3,width:pct+"%",position:"absolute",top:0,left:0}}/>
      </div>
      <div
        onPointerDown={onStart}
        onTouchStart={onStart}
        style={{position:"absolute",left:"calc("+pct+"% - 12px)",width:24,height:24,borderRadius:"50%",background:c,boxShadow:"0 2px 6px rgba(0,0,0,0.25)",border:"2.5px solid "+WHITE,cursor:"grab",touchAction:"none"}}
      />
    </div>
  );
}

function Smiley({size,color}){
  const s=size||36,c=color||TEAL;
  return (
    <div style={{width:s,height:s,position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",width:s*.17,height:s*.17,background:c,borderRadius:"50%",top:s*.22,left:s*.16}}/>
      <div style={{position:"absolute",width:s*.17,height:s*.17,background:c,borderRadius:"50%",top:s*.22,right:s*.16}}/>
      <div style={{position:"absolute",bottom:s*.14,left:"50%",transform:"translateX(-50%)",width:s*.62,height:s*.35,borderBottom:s*.065+"px solid "+c,borderRadius:"0 0 "+s+"px "+s+"px"}}/>
    </div>
  );
}

function ScorePop({data,onClose}){
  const rows=[["Taste",data.taste,26],["Behaviour",data.bh,15],["Editorial",data.ed,15],["Urgency",data.urg,20],["Context",data.ctx,10],["Deal",data.deal,14]];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:WHITE,borderRadius:20,padding:20,width:"100%",maxWidth:340}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,color:INK}}>{"Score: "+data.total+"/100"+(data.d?" - "+data.d+"km":"")}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:GRAY}}>{"×"}</button>
        </div>
        {rows.map(([l,v,mx])=>(
          <div key={l} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:600,color:INK}}>{l}</span>
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:TEAL}}>{v+"/"+mx}</span>
            </div>
            <div style={{background:GRAY_LT,borderRadius:4,height:4}}><div style={{background:TEAL,height:"100%",width:Math.round(v/mx*100)+"%",borderRadius:4}}/></div>
          </div>
        ))}
        {data.why&&data.why.length>0&&(
          <div style={{marginTop:12,background:CREAM,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:5}}>Why picked</div>
            {data.why.map((w,i)=><div key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:INK,marginBottom:2}}>{"- "+w}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ev,isFav,onFav,onOpen,onCal,onShare,onScore,today,tomorrow,img}){
  const free=(ev.price||"").toLowerCase().includes("free");
  const cfg=CATS[ev.cat]||CATS.Other;
  const fd=friendlyDate(ev,today,tomorrow);
  const ts=ev.time&&ev.time!=="All day"?ev.time:null;
  const isToday=fd==="Today",isTom=fd==="Tomorrow";
  return (
    <div onClick={()=>onOpen(ev)} style={{background:WHITE,borderRadius:16,overflow:"hidden",cursor:"pointer",border:"1.5px solid "+GRAY_LT,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",flexShrink:0,width:164}}>
      <div style={{height:72,background:img?"url("+img+") center/cover":cfg.bg,position:"relative",display:"flex",alignItems:"center",padding:"0 10px"}}>
        {!img&&<span style={{fontSize:28}}>{cfg.emoji}</span>}
        <button onClick={e=>{e.stopPropagation();onScore(ev.bd);}} style={{position:"absolute",top:6,right:6,background:TEAL,color:WHITE,border:"none",borderRadius:5,padding:"2px 6px",fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:800,cursor:"pointer"}}>{ev.sc||0}</button>
        {ev.bs&&<div style={{position:"absolute",bottom:5,left:8,background:CORAL,color:WHITE,fontFamily:"'Sora',sans-serif",fontSize:7,fontWeight:700,padding:"2px 5px",borderRadius:3}}>Book Soon</div>}
        {img&&<div style={{position:"absolute",bottom:5,left:8,background:cfg.color,borderRadius:5,padding:"3px 8px",fontFamily:"'Sora',sans-serif",fontSize:10,color:WHITE,fontWeight:800,letterSpacing:"0.3px",boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}}>{cfg.emoji+" "+ev.cat}</div>}
      </div>
      <div style={{padding:"9px 10px 8px"}}>
        <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>
          {!img&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:cfg.color,background:cfg.bg,padding:"2px 6px",borderRadius:8}}>{ev.cat}</span>}
          {ev.sub&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:600,color:cfg.color,background:cfg.bg,padding:"2px 6px",borderRadius:8,opacity:0.8}}>{ev.sub}</span>}
          {free&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:"#059669",background:"#ECFDF5",padding:"2px 6px",borderRadius:8}}>Free</span>}
          {isToday&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:WHITE,background:CORAL,padding:"2px 6px",borderRadius:8}}>Today</span>}
          {isTom&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:WHITE,background:"#8B5CF6",padding:"2px 6px",borderRadius:8}}>Tomorrow</span>}
        </div>
        <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:INK,lineHeight:1.3,marginBottom:3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{ev.title}</div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:GRAY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.venue}</div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:GRAY}}>{fd}{ts?" - "+ts:""}</div>
        {ev.km&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:GRAY,marginTop:1}}>{"📍"+ev.km+"km"+(ev.src?" · "+ev.src:"")}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7,paddingTop:6,borderTop:"1px solid "+GRAY_LT}}>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:free?"#059669":TEAL}}>{ev.price||"Free"}</span>
            {ev.url&&<a href={ev.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:9,color:TEAL,textDecoration:"none"}}>{"↗"}</a>}
          </div>
          <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onCal(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:GRAY,padding:2}}>{"📅"}</button>
            <button onClick={()=>onShare(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:GRAY,padding:2}}>{"↗"}</button>
            <button onClick={()=>onFav(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:isFav?TEAL:GRAY,padding:2}}>{isFav?"★":"☆"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ev,isFav,onFav,onOpen,onCal,onShare,onScore,today,tomorrow}){
  const free=(ev.price||"").toLowerCase().includes("free");
  const cfg=CATS[ev.cat]||CATS.Other;
  const fd=friendlyDate(ev,today,tomorrow);
  const isToday=fd==="Today",isTom=fd==="Tomorrow";
  return (
    <div onClick={()=>onOpen(ev)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:"1px solid "+GRAY_LT,cursor:"pointer"}}>
      <div style={{width:44,height:44,borderRadius:12,background:cfg.bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{cfg.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:4,marginBottom:2,flexWrap:"wrap"}}>
          {isToday&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:8,fontWeight:700,color:WHITE,background:CORAL,padding:"1px 5px",borderRadius:6}}>Today</span>}
          {isTom&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:8,fontWeight:700,color:WHITE,background:"#8B5CF6",padding:"1px 5px",borderRadius:6}}>Tomorrow</span>}
          {ev.sub&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:8,fontWeight:600,color:cfg.color,background:cfg.bg,padding:"1px 5px",borderRadius:6}}>{ev.sub}</span>}
        </div>
        <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:INK,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{ev.title}</div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{ev.venue}</div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY}}>{fd}</span>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:free?"#059669":TEAL}}>{ev.price||"Free"}</span>
          <button onClick={e=>{e.stopPropagation();onScore(ev.bd);}} style={{background:TEAL,color:WHITE,border:"none",borderRadius:4,padding:"2px 5px",fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:800,cursor:"pointer"}}>{ev.sc||0}</button>
          {ev.km&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:GRAY}}>{"📍"+ev.km+"km"}</span>}
          {ev.url&&<a href={ev.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:9,color:TEAL,textDecoration:"none"}}>{"↗"}</a>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>onCal(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:GRAY,padding:2}}>{"📅"}</button>
        <button onClick={()=>onShare(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:GRAY,padding:2}}>{"↗"}</button>
        <button onClick={()=>onFav(ev)} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:isFav?TEAL:GRAY,padding:2}}>{isFav?"★":"☆"}</button>
      </div>
    </div>
  );
}

function SortPill({sortKey,setSortKey}){
  const [open,setOpen]=useState(false);
  const btnRef=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  const opts=[["score","For you"],["date","Date"],["distance","Distance"],["price","Price"]];
  const cur=opts.find(o=>o[0]===sortKey)||opts[0];
  return (
    <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
      <button ref={btnRef} onClick={()=>{if(!open&&btnRef.current){const b=btnRef.current.getBoundingClientRect();setPos({top:b.bottom+4,left:Math.min(b.left,window.innerWidth-160)});}setOpen(!open);}} style={{padding:"2px 7px",borderRadius:10,background:"none",border:"1px solid "+GRAY_LT,color:GRAY,fontSize:9,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>{"⇅ "+cur[1]}</button>
      {open&&(
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:WHITE,border:"1.5px solid "+GRAY_LT,borderRadius:10,padding:4,zIndex:9999,minWidth:130,boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
          {opts.map(([k,l])=>(
            <button key={k} onClick={()=>{setSortKey(k);setOpen(false);}} style={{display:"block",width:"100%",padding:"7px 10px",background:sortKey===k?TEAL+"22":"none",border:"none",cursor:"pointer",color:sortKey===k?TEAL:INK,fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:sortKey===k?700:500,textAlign:"left",borderRadius:6}}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Carousel({title,sub,evts,favs,onFav,onOpen,onCal,onShare,onScore,today,tomorrow,imgs,accent,noPad,sortKey,setSortKey,sortFn}){
  if(!evts||!evts.length)return null;
  const sorted=sortFn&&sortKey?sortFn(evts,sortKey):evts;
  return (
    <div style={{marginBottom:4}}>
      {title&&(
        <div style={{padding:(noPad?"4":"14")+"px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:accent||GRAY}}>{title}</div>
            {sub&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,marginTop:1}}>{sub}</div>}
          </div>
          {setSortKey&&<SortPill sortKey={sortKey||"score"} setSortKey={setSortKey}/>}
        </div>
      )}
      <div style={{display:"flex",gap:10,overflowX:"auto",padding:"0 16px 16px",scrollbarWidth:"none"}}>
        {sorted.map(ev=>(
          <Card key={ev.id} ev={ev} isFav={!!favs[ev.id]} onFav={onFav} onOpen={onOpen} onCal={onCal} onShare={onShare} onScore={onScore} today={today} tomorrow={tomorrow} img={imgs?.[ev.cat]}/>
        ))}
      </div>
    </div>
  );
}

function ModalMap({coord,venue,catColor,catEmoji}){
  const ref=useRef(null);
  const [ready,setReady]=useState(!!window.L);
  useEffect(()=>{
    if(window.L){setReady(true);return;}
    // Leaflet should have been loaded by MapTab; if not, load it now
    const cssId="leaflet-css";
    if(!document.getElementById(cssId)){
      const link=document.createElement("link");
      link.id=cssId;link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if(document.getElementById("leaflet-js")){
      const t=setInterval(()=>{if(window.L){clearInterval(t);setReady(true);}},80);
      setTimeout(()=>clearInterval(t),8000);
      return;
    }
    const s=document.createElement("script");
    s.id="leaflet-js";s.async=true;
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload=()=>setReady(true);
    document.body.appendChild(s);
  },[]);
  useEffect(()=>{
    if(!ready||!ref.current||!coord)return;
    const L=window.L;
    if(ref.current._leafmap){ref.current._leafmap.remove();}
    const m=L.map(ref.current,{zoomControl:false,attributionControl:false,dragging:true,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:true,tap:false}).setView(coord,15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18}).addTo(m);
    const ic=L.divIcon({className:"gp-pin",html:'<div style="width:30px;height:30px;background:'+catColor+';border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:15px;">'+catEmoji+'</div>',iconSize:[30,30],iconAnchor:[15,15]});
    L.marker(coord,{icon:ic}).addTo(m);
    ref.current._leafmap=m;
    setTimeout(()=>m.invalidateSize(),100);
    return ()=>{m.remove();ref.current&&(ref.current._leafmap=null);};
  },[ready,coord,catColor,catEmoji]);
  if(!coord)return null;
  return (
    <div style={{marginBottom:12}}>
      <div ref={ref} style={{width:"100%",height:160,borderRadius:12,overflow:"hidden",border:"1.5px solid "+GRAY_LT,background:"#E8F4F0"}}/>
      <a href={"https://www.google.com/maps/dir/?api=1&destination="+coord[0]+","+coord[1]+(venue?"&destination_place_id="+encodeURIComponent(venue):"")} target="_blank" rel="noreferrer" style={{display:"block",textAlign:"center",marginTop:6,fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:TEAL,textDecoration:"none"}}>{"↗ Directions in Google Maps"}</a>
    </div>
  );
}

function ModalSubway({coord}){
  if(!coord)return null;
  const stops=nearestSubways(coord,0.7);
  if(!stops.length)return null;
  return (
    <div style={{marginBottom:12,padding:"10px 12px",background:CREAM,borderRadius:10}}>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Nearest subway</div>
      {stops.map(s=>(
        <div key={s.n} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            {s.l.slice(0,4).map(line=>(
              <span key={line} style={{width:18,height:18,borderRadius:"50%",background:LINE_COLOR[line]||"#888",color:["N","Q","R","W"].includes(line)?"#111":"#fff",fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{line}</span>
            ))}
          </div>
          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:INK,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.n}</span>
          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,flexShrink:0}}>{Math.round(s.d*1000)+"m"}</span>
        </div>
      ))}
    </div>
  );
}

function Modal({ev,isFav,onClose,onFav,onCal,onShare,today,tomorrow}){
  const free=(ev.price||"").toLowerCase().includes("free");
  const cfg=CATS[ev.cat]||CATS.Other;
  const fd=friendlyDate(ev,today,tomorrow);
  const ts=ev.time&&ev.time!=="All day"?" - "+ev.time:"";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:WHITE,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{height:100,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <span style={{fontSize:48}}>{cfg.emoji}</span>
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.1)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:16,color:INK}}>{"×"}</button>
          {ev.bs&&<div style={{position:"absolute",bottom:10,right:12,background:CORAL,color:WHITE,fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6}}>Book Soon</div>}
        </div>
        <div style={{padding:"18px 20px 36px"}}>
          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,color:cfg.color,background:cfg.bg,padding:"3px 10px",borderRadius:10}}>{ev.cat}</span>
            {ev.sub&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:600,color:cfg.color,background:cfg.bg,padding:"3px 10px",borderRadius:10,opacity:0.8}}>{ev.sub}</span>}
            {free&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,color:"#059669",background:"#ECFDF5",padding:"3px 10px",borderRadius:10}}>Free</span>}
            {ev.src&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:GRAY,background:CREAM,padding:"3px 10px",borderRadius:10}}>{ev.src}</span>}
          </div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800,color:INK,lineHeight:1.2,marginBottom:12,letterSpacing:"-0.5px"}}>{ev.title}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY,marginBottom:3}}>{"📍 "+ev.venue+(ev.hood?", "+ev.hood:"")}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY,marginBottom:3}}>{"🗓 "+fd+ts}</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:free?"#059669":TEAL,marginBottom:14}}>{ev.price||"Free"}</div>
          {ev.desc&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:INK,lineHeight:1.7,marginBottom:14}}>{ev.desc}</div>}
          <ModalMap coord={safeCoord(ev)} venue={ev.venue} catColor={cfg.color} catEmoji={cfg.emoji}/>
          <ModalSubway coord={safeCoord(ev)}/>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
            {ev.url&&<a href={ev.url} target="_blank" rel="noreferrer" style={{display:"block",padding:"13px",background:TEAL,color:WHITE,border:"none",borderRadius:12,fontWeight:700,fontSize:14,textDecoration:"none",textAlign:"center",fontFamily:"'Sora',sans-serif"}}>View event page</a>}
            <button onClick={()=>onCal(ev)} style={{display:"block",width:"100%",padding:"12px",background:CREAM,color:INK,border:"1.5px solid "+GRAY_LT,borderRadius:12,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{"📅 Add to Google Calendar"}</button>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>onFav(ev)} style={{flex:1,padding:"12px",background:CREAM,color:isFav?TEAL:GRAY,border:"1.5px solid "+GRAY_LT,borderRadius:12,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{isFav?"Saved":"Save"}</button>
              <button onClick={()=>onShare(ev)} style={{flex:1,padding:"12px",background:CREAM,color:INK,border:"1.5px solid "+GRAY_LT,borderRadius:12,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Share</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBar({fc,setFc,fh,setFh,fp,setFp,fd,setFd,fv,setFv,fms,setFms,fmk,setFmk,fq,setFq,has,onClear,dd,setDd,cnt}){
  const HOODS=["Manhattan","Brooklyn","Queens","Bronx","Staten Island"];
  const PRICES=["Free","Under $10","Under $25"];
  const DATES=["Today","Tomorrow","This Weekend"];
  return (
    <div style={{background:WHITE,borderBottom:"1px solid "+GRAY_LT}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",gap:6,padding:"7px 12px",alignItems:"center"}}>
        <div style={{position:"relative",flex:"0 0 auto",minWidth:140,maxWidth:180}}>
          <input type="search" value={fq||""} onChange={e=>setFq(e.target.value)} placeholder="🔍 Search…" style={{width:"100%",padding:"6px 10px 6px 10px",borderRadius:18,border:"1.5px solid "+GRAY_LT,fontFamily:"'DM Sans',sans-serif",fontSize:12,outline:"none",background:fq?TEAL+"12":"none"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:6,padding:"0 12px 7px",overflowX:"auto",scrollbarWidth:"none",alignItems:"center"}}>
        {has&&<button onClick={onClear} style={{padding:"5px 10px",borderRadius:20,background:"none",border:"1.5px solid "+CORAL,color:CORAL,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,flexShrink:0}}>{"✕ Clear"}</button>}
        <DD label="Date" opts={DATES} sel={fd} setSel={setFd} open={dd==="d"} setOpen={v=>setDd(v?"d":null)}/>
        <DD label="Cat." opts={Object.keys(CATS).filter(c=>c!=="Other")} sel={fc} setSel={setFc} open={dd==="c"} setOpen={v=>setDd(v?"c":null)}/>
        <DD label="Area" opts={HOODS} sel={fh} setSel={setFh} open={dd==="h"} setOpen={v=>setDd(v?"h":null)}/>
        <DD label="Price" opts={PRICES} sel={fp} setSel={setFp} open={dd==="p"} setOpen={v=>setDd(v?"p":null)}/>
        <DD label="Vibe" opts={VIBES.map(v=>v.label)} sel={fv.map(k=>VIBES.find(v=>v.key===k)?.label||k)} setSel={ls=>setFv(ls.map(l=>VIBES.find(v=>v.label===l)?.key||l))} open={dd==="v"} setOpen={v=>setDd(v?"v":null)}/>
        <SP label="Rating" val={fms} setVal={setFms} min={0} max={90} step={10} fmt={v=>v>0?"★"+v+"+":"Any"} open={dd==="s"} setOpen={v=>setDd(v?"s":null)} on={fms>0}/>
        <SP label="Dist." val={fmk} setVal={setFmk} min={1} max={50} step={1} fmt={v=>v<50?v+"km":"Any"} open={dd==="k"} setOpen={v=>setDd(v?"k":null)} on={fmk<50}/>
        {cnt!=null&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,flexShrink:0}}>{cnt}</span>}
      </div>
    </div>
  );
}

function DD({label,opts,sel,setSel,open,setOpen}){
  const toggle=o=>{const next=sel.includes(o)?sel.filter(x=>x!==o):[...sel,o];setSel(next);};
  const btnRef=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  return (
    <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
      <button ref={btnRef} onClick={()=>{if(!open&&btnRef.current){const b=btnRef.current.getBoundingClientRect();setPos({top:b.bottom+6,left:Math.min(b.left,window.innerWidth-180)});}setOpen(!open);}} style={{padding:"5px 11px",borderRadius:20,background:sel.length>0?TEAL:"none",border:"1.5px solid "+(sel.length>0?TEAL:GRAY_LT),color:sel.length>0?WHITE:GRAY,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,display:"flex",gap:3,alignItems:"center",whiteSpace:"nowrap"}}>
        {label+(sel.length>0?" ("+sel.length+")":"")} <span style={{fontSize:8,opacity:.6}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:WHITE,border:"1.5px solid "+GRAY_LT,borderRadius:14,padding:"8px 0",zIndex:9999,minWidth:170,maxHeight:260,overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
          {opts.map(o=>(
            <button key={o} onClick={()=>toggle(o)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",background:"none",border:"none",cursor:"pointer",color:sel.includes(o)?TEAL:INK,fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:sel.includes(o)?700:400,textAlign:"left"}}>
              <span style={{width:14,height:14,borderRadius:3,border:"1.5px solid "+(sel.includes(o)?TEAL:GRAY_LT),background:sel.includes(o)?TEAL:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:WHITE,flexShrink:0}}>{sel.includes(o)?"✓":""}</span>
              {o}
            </button>
          ))}
          {sel.length>0&&<button onClick={()=>setSel([])} style={{display:"block",width:"100%",padding:"6px 14px",background:"none",border:"none",cursor:"pointer",color:CORAL,fontFamily:"'Sora',sans-serif",fontSize:11,textAlign:"left",borderTop:"1px solid "+GRAY_LT,marginTop:4}}>Clear</button>}
        </div>
      )}
    </div>
  );
}

function SP({label,val,setVal,min,max,step,fmt,open,setOpen,on}){
  const btnRef=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  return (
    <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
      <button ref={btnRef} onClick={()=>{if(!open&&btnRef.current){const b=btnRef.current.getBoundingClientRect();setPos({top:b.bottom+6,left:Math.min(b.left,window.innerWidth-210)});}setOpen(!open);}} style={{padding:"5px 11px",borderRadius:20,background:on?TEAL:"none",border:"1.5px solid "+(on?TEAL:GRAY_LT),color:on?WHITE:GRAY,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>{on?fmt(val):label}</button>
      {open&&(
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:WHITE,border:"1.5px solid "+GRAY_LT,borderRadius:14,padding:14,zIndex:9999,width:200,boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:INK}}>{label}</span>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:TEAL}}>{fmt(val)}</span>
          </div>
          <Slider value={val} onChange={setVal} min={min} max={max} step={step}/>
        </div>
      )}
    </div>
  );
}

function MapTab({evts,userLoc,CATS,onOpen}){
  const mapRef=useRef(null);
  const mapInstRef=useRef(null);
  const markersRef=useRef([]);
  const [ready,setReady]=useState(false);
  const [err,setErr]=useState(null);

  // Load Leaflet from CDN once
  useEffect(()=>{
    if(window.L){setReady(true);return;}
    const cssId="leaflet-css";
    if(!document.getElementById(cssId)){
      const link=document.createElement("link");
      link.id=cssId;link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin="";
      document.head.appendChild(link);
    }
    const jsId="leaflet-js";
    if(document.getElementById(jsId)){
      const check=setInterval(()=>{if(window.L){clearInterval(check);setReady(true);}},80);
      setTimeout(()=>{clearInterval(check);if(!window.L)setErr("Leaflet load timeout");},8000);
      return;
    }
    const s=document.createElement("script");
    s.id=jsId;s.async=true;
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    s.crossOrigin="";
    s.onload=()=>setReady(true);
    s.onerror=()=>setErr("Failed to load map library");
    document.body.appendChild(s);
  },[]);

  // Init map once Leaflet is ready
  useEffect(()=>{
    if(!ready||!mapRef.current||mapInstRef.current)return;
    const L=window.L;
    const m=L.map(mapRef.current,{zoomControl:true,attributionControl:true}).setView(userLoc||[40.7186,-73.9865],14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(m);
    mapInstRef.current=m;
    setTimeout(()=>m.invalidateSize(),100);
  },[ready,userLoc]);

  // Redraw markers when events or location change
  useEffect(()=>{
    if(!ready||!mapInstRef.current)return;
    const L=window.L;
    const m=mapInstRef.current;
    markersRef.current.forEach(mk=>m.removeLayer(mk));
    markersRef.current=[];
    // User location marker
    if(userLoc){
      const meIcon=L.divIcon({className:"gp-me",html:'<div style="width:14px;height:14px;background:#00796B;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(0,121,107,0.3);"></div>',iconSize:[20,20],iconAnchor:[10,10]});
      const meMk=L.marker(userLoc,{icon:meIcon,zIndexOffset:1000}).addTo(m).bindPopup("<b>You are here</b>");
      markersRef.current.push(meMk);
    }
    // Event markers
    evts.forEach(ev=>{
      const evCoord=safeCoord(ev);
      const cfg=CATS[ev.cat]||CATS.Other;
      const html='<div style="width:30px;height:30px;background:'+cfg.color+';border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;">'+cfg.emoji+'</div>';
      const ic=L.divIcon({className:"gp-pin",html,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-15]});
      const mk=L.marker(evCoord,{icon:ic}).addTo(m);
      const free=(ev.price||"").toLowerCase().includes("free");
      const popupHtml='<div style="font-family:Sora,sans-serif;min-width:180px;max-width:240px;">'
        +'<div style="font-size:8px;font-weight:700;color:'+cfg.color+';background:'+cfg.bg+';padding:2px 6px;border-radius:6px;display:inline-block;margin-bottom:6px;">'+cfg.emoji+' '+ev.cat+'</div>'
        +'<div style="font-size:13px;font-weight:700;color:#111;line-height:1.25;margin-bottom:4px;">'+(ev.title||"").replace(/</g,"&lt;")+'</div>'
        +'<div style="font-size:11px;color:#666;margin-bottom:3px;">📍 '+(ev.venue||"").replace(/</g,"&lt;")+'</div>'
        +'<div style="font-size:11px;color:#666;margin-bottom:6px;">🗓 '+(ev.time&&ev.time!=="All day"?ev.time:"All day")+'</div>'
        +'<div style="display:flex;justify-content:space-between;align-items:center;">'
        +'<span style="font-size:12px;font-weight:700;color:'+(free?"#059669":"#00796B")+'">'+(ev.price||"See website")+'</span>'
        +'<button data-gp-open="'+ev.id+'" style="background:#00796B;color:white;border:none;border-radius:6px;padding:4px 10px;font-family:Sora,sans-serif;font-size:11px;font-weight:700;cursor:pointer;">Details →</button>'
        +'</div></div>';
      mk.bindPopup(popupHtml);
      mk.on("popupopen",()=>{
        setTimeout(()=>{
          const btn=document.querySelector('[data-gp-open="'+ev.id+'"]');
          if(btn&&!btn.__bound){
            btn.__bound=true;
            btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();m.closePopup();if(onOpen)onOpen(ev);});
          }
        },50);
      });
      markersRef.current.push(mk);
    });
    // Fit bounds if we have events
    if(evts.length){
      const pts=evts.map(e=>safeCoord(e));
      if(userLoc)pts.push(userLoc);
      if(pts.length>1){
        try{m.fitBounds(pts,{padding:[40,40],maxZoom:15});}catch{}
      }
    }
  },[ready,evts,userLoc,CATS]);

  return (
    <div>
      <div style={{padding:"8px 16px",background:WHITE,borderBottom:"1px solid "+GRAY_LT,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:800,color:INK}}>Happening today</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY}}>{evts.length+" event"+(evts.length===1?"":"s")+" near you"}</div>
        </div>
      </div>
      {err
        ?<div style={{padding:"40px 20px",textAlign:"center",fontFamily:"'DM Sans',sans-serif",color:CORAL}}>{err}</div>
        :<div ref={mapRef} style={{width:"100%",height:"calc(100vh - 160px)",minHeight:400,background:"#E8F4F0"}}>
          {!ready&&<div style={{padding:"40px 20px",textAlign:"center",fontFamily:"'DM Sans',sans-serif",color:GRAY}}>Loading map…</div>}
        </div>
      }
    </div>
  );
}

function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [prof,setProf]=useState({...DP,categories:{...DP.categories},vibes:{...DP.vibes}});
  const btn={display:"block",width:"100%",padding:"13px",background:TEAL,color:WHITE,border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginTop:12};
  return (
    <div style={{minHeight:"100vh",background:CREAM,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Sora',sans-serif"}}>
      <style>{FONT}</style>
      <div style={{background:WHITE,borderRadius:24,padding:28,width:"100%",maxWidth:400,boxShadow:"0 8px 40px rgba(0,0,0,0.1)"}}>
        {step===0&&(
          <div style={{textAlign:"center"}}>
            <div style={{margin:"0 auto 20px",width:72,height:72}}><Smiley size={72}/></div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:800,color:INK,letterSpacing:"-1px",marginBottom:6}}>Good Plans.</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:GRAY,marginBottom:28,lineHeight:1.6}}>Good Plans. Great Times.<br/>NYC events worth going out for.</div>
            <button onClick={()=>setStep(1)} style={btn}>Get started</button>
          </div>
        )}
        {step===1&&(
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:INK,marginBottom:4}}>What do you enjoy?</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY,marginBottom:16}}>Set your interest in each category</div>
            {Object.entries(prof.categories).map(([cat,val])=>(
              <div key={cat} style={{marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:INK}}>{(CATS[cat]?.emoji||"")+" "+cat}</span>
                  <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:TEAL}}>{val+"%"}</span>
                </div>
                <Slider value={val} onChange={v=>setProf(p=>({...p,categories:{...p.categories,[cat]:v}}))}/>
              </div>
            ))}
            <button onClick={()=>setStep(2)} style={btn}>Next</button>
          </div>
        )}
        {step===2&&(
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:INK,marginBottom:4}}>Your vibes</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY,marginBottom:14}}>What kind of nights do you like?</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:22}}>
              {VIBES.map(v=>{
                const on=(prof.vibes?.[v.key]||50)>=60;
                return (
                  <button key={v.key} onClick={()=>setProf(p=>({...p,vibes:{...(p.vibes||{}),[v.key]:on?30:80}}))} style={{padding:"6px 12px",borderRadius:20,background:on?TEAL:"none",border:"1.5px solid "+(on?TEAL:GRAY_LT),color:on?WHITE:GRAY,fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:on?700:500}}>
                    {v.emoji+" "+v.label}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>{ss(SK_P,prof);onDone(prof);}} style={btn}>Start exploring</button>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:18}}>
          {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<=step?TEAL:GRAY_LT,transition:"background .3s"}}/>)}
        </div>
      </div>
    </div>
  );
}

const EV=[{"id":"rooftop-shaolin","title":"Rooftop Films: Shaolin Soccer 25th Anniversary","E":"2026-05-28","time":"7:00 PM","price":"Free","venue":"Fort Greene Park, Brooklyn","hood":"Brooklyn","cat":"Film","sub":"Outdoor Screening","tier":1,"ticket":true,"tags":["outdoor","free","weird","film"],"coord":[40.6876,-73.974],"src":"Rooftop Films","url":"https://rooftopfilms.com/event/shaolin-soccer-25th-anniversary-screening/","desc":"Cult classic Shaolin Soccer celebrates 25 years with a free outdoor screening in Fort Greene Park. RSVP required."},{"id":"little-island","title":"Little Island Summer Performances","E":"2026-06-01","X":"2026-09-03","time":"Various","price":"$25 / Free (Glade)","venue":"Little Island, Pier 55","hood":"Manhattan","cat":"Art & Culture","sub":"Performance Art","tier":1,"ticket":true,"tags":["outdoor","theater","music","dance","waterfront","weird"],"coord":[40.7408,-74.0087],"src":"Little Island","url":"https://littleisland.org","desc":"110+ performances spanning music, theater, dance, opera. Amphitheater $25, free shows in the Glade. Jun 1 - Sep 3."},{"id":"whitney-biennial","title":"Whitney Biennial 2026","E":"2026-05-24","X":"2026-08-23","time":"All day","price":"Free Fri 5-10pm / $30","venue":"Whitney Museum, Meatpacking District","hood":"Manhattan","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":true,"tags":["exhibition","local","free"],"coord":[40.7396,-74.0089],"src":"The Skint","url":"https://whitney.org/exhibitions/2026-biennial","desc":"82nd edition: 56 artists. Free every Friday 5-10pm and every second Sunday. Through August 23."},{"id":"loisaida","title":"Annual Loisaida Festival","E":"2026-05-24","time":"12:00 PM","price":"Free","venue":"Avenue C, LES","hood":"Manhattan","cat":"Music","sub":"Brass/Funk","tier":1,"ticket":false,"tags":["neighborhood","free","outdoor","local"],"coord":[40.7211,-73.9826],"src":"The Skint","url":"https://loisaidafest.nyc","desc":"Community street festival with music, art, food and opening parade at 11am. One of the last real neighborhood street fairs in the LES."},{"id":"shakespeare-park","title":"Free Shakespeare: Romeo + Juliet","E":"2026-05-24","X":"2026-06-28","time":"8:00 PM","price":"Free","venue":"Delacorte Theater, Central Park","hood":"Manhattan","cat":"Art & Culture","sub":"Theater","tier":1,"ticket":true,"tags":["outdoor","free","theater","local"],"coord":[40.7794,-73.9632],"src":"The Skint","url":"https://publictheater.org/free-shakespeare-in-the-park/","desc":"Free Shakespeare in the Park through June 28. Five ways to get tickets including TodayTix lottery."},{"id":"bppp-may28","title":"Bryant Park Picnic Performances","E":"2026-05-28","time":"7:00 PM","price":"Free","venue":"Bryant Park, Midtown","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":false,"tags":["free","outdoor","local","dance"],"coord":[40.7536,-73.9832],"src":"Bryant Park","url":"https://bryantpark.org/activities/picnic-performances","desc":"Free outdoor performance at Bryant Park. Thu May 28, 7pm. Blankets available."},{"id":"bppp-may29","title":"Bryant Park Picnic Performances","E":"2026-05-29","time":"7:00 PM","price":"Free","venue":"Bryant Park, Midtown","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":false,"tags":["free","outdoor","local","dance"],"coord":[40.7536,-73.9832],"src":"Bryant Park","url":"https://bryantpark.org/activities/picnic-performances","desc":"Free outdoor performance at Bryant Park. Fri May 29, 7pm."},{"id":"bppp-jun4","title":"Bryant Park Picnic Performances","E":"2026-06-04","time":"7:00 PM","price":"Free","venue":"Bryant Park, Midtown","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":false,"tags":["free","outdoor","local"],"coord":[40.7536,-73.9832],"src":"Bryant Park","url":"https://bryantpark.org/activities/picnic-performances","desc":"Free outdoor performance at Bryant Park. Thu Jun 4, 7pm."},{"id":"bppp-jun5","title":"Bryant Park Picnic Performances","E":"2026-06-05","time":"7:00 PM","price":"Free","venue":"Bryant Park, Midtown","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":false,"tags":["free","outdoor","local"],"coord":[40.7536,-73.9832],"src":"Bryant Park","url":"https://bryantpark.org/activities/picnic-performances","desc":"Free outdoor performance at Bryant Park. Fri Jun 5, 7pm."},{"id":"nylaughs","title":"NYLaughs Festival 2026","E":"2026-06-04","X":"2026-06-07","time":"Various","price":"Free","venue":"NYC Parks citywide","hood":"Manhattan","cat":"Comedy","sub":"Stand-up","tier":1,"ticket":false,"tags":["free","outdoor","local"],"coord":[40.758,-73.9855],"src":"NYC Parks","url":"https://www.nycgovparks.org/events","desc":"Four days of free stand-up comedy across NYC Parks. June 4-7."},{"id":"lincoln-summer","title":"Lincoln Center Summer for the City","E":"2026-06-01","X":"2026-08-10","time":"Various","price":"Free","venue":"Lincoln Center, UWS","hood":"Manhattan","cat":"Art & Culture","sub":"Performance Art","tier":1,"ticket":false,"tags":["free","outdoor","dance","music","film","local"],"coord":[40.7725,-73.9836],"src":"Lincoln Center","url":"https://www.lincolncenter.org/series/summer-for-the-city","desc":"Free music, dance, film, opera, comedy through August 10. Lincoln Center's annual summer gift to the city."},{"id":"green-wood-memorial","title":"26th Green-Wood Memorial Day Concert","E":"2026-05-25","time":"2:00 PM","price":"Free","venue":"Green-Wood Cemetery, Brooklyn","hood":"Brooklyn","cat":"Music","sub":"Classical","tier":1,"ticket":false,"tags":["outdoor","free","local","history"],"coord":[40.6534,-73.9948],"src":"The Skint","url":"https://www.green-wood.com/event/memorial-day-concert-6/","desc":"Annual outdoor concert at Green-Wood Cemetery featuring works by Bernstein, Fred Ebb, and James Weldon Johnson."},{"id":"rooftop-cemetery","title":"Rooftop Films: Cemetery Shorts 2026","E":"2026-06-05","time":"8:00 PM","price":"$18","venue":"Green-Wood Cemetery, Brooklyn","hood":"Brooklyn","cat":"Film","sub":"Outdoor Screening","tier":1,"ticket":true,"tags":["outdoor","weird","film","local"],"coord":[40.6534,-73.9948],"src":"Rooftop Films","url":"https://rooftopfilms.com/event/cemetery-shorts-2026/","desc":"Short films about grief and memory at dusk in Green-Wood Cemetery."},{"id":"greenwood-may29","title":"Green-Wood After Hours Night Tour","E":"2026-05-29","time":"7:30 PM","price":"$30","venue":"Green-Wood Cemetery, Brooklyn","hood":"Brooklyn","cat":"Outdoors","sub":"Walking Tour","tier":1,"ticket":true,"tags":["weird","local","history","outdoor"],"coord":[40.6534,-73.9948],"src":"Green-Wood","url":"https://www.green-wood.com/event/green-wood-after-hours-47/2026-05-29/","desc":"Explore Green-Wood under the night sky, ending in the Catacombs. BYO flashlight. Sells out."},{"id":"greenwood-may30","title":"Green-Wood After Hours Night Tour","E":"2026-05-30","time":"7:30 PM","price":"$30","venue":"Green-Wood Cemetery, Brooklyn","hood":"Brooklyn","cat":"Outdoors","sub":"Walking Tour","tier":1,"ticket":true,"tags":["weird","local","history","outdoor"],"coord":[40.6534,-73.9948],"src":"Green-Wood","url":"https://www.green-wood.com/event/green-wood-after-hours-47/2026-05-30/","desc":"Saturday night at Green-Wood - explore after dark, ending in the Catacombs."},{"id":"rooftop-griner","title":"Rooftop Films: The Brittney Griner Story","E":"2026-06-01","time":"7:00 PM","price":"Free","venue":"Gansevoort Plaza, Meatpacking District","hood":"Manhattan","cat":"Film","sub":"Outdoor Screening","tier":1,"ticket":true,"tags":["outdoor","free","film"],"coord":[40.7397,-74.0059],"src":"Rooftop Films","url":"https://rooftopfilms.com/event/the-brittney-griner-story/","desc":"Free outdoor screening at Gansevoort Plaza. RSVP required."},{"id":"bric-sheila-e","title":"BRIC Celebrate Brooklyn: Sheila E. Opening Night","E":"2026-06-04","time":"7:00 PM","price":"Free","venue":"Lena Horne Bandshell, Prospect Park","hood":"Brooklyn","cat":"Music","sub":"Brass/Funk","tier":1,"ticket":false,"tags":["free","outdoor","local","dance"],"coord":[40.6602,-73.969],"src":"BRIC","url":"https://bricartsmedia.org/celebrate-brooklyn","desc":"BRIC Celebrate Brooklyn 47th season opener with the Queen of Percussion Sheila E., Leon Knight and DJ Spinna. Radical Joy theme."},{"id":"rooftop-jaripeo","title":"Rooftop Films: Jaripeo","E":"2026-06-04","time":"7:00 PM","price":"Free","venue":"Fort Greene Park, Brooklyn","hood":"Brooklyn","cat":"Film","sub":"Outdoor Screening","tier":1,"ticket":true,"tags":["outdoor","free","film"],"coord":[40.6876,-73.974],"src":"Rooftop Films","url":"https://rooftopfilms.com/event/jaripeo/","desc":"A journey to hypermasculine rodeos and queer desire. Free with RSVP, Fort Greene Park."},{"id":"duchamp-moma","title":"Marcel Duchamp Retrospective at MoMA","E":"2026-05-24","X":"2026-08-22","time":"All day","price":"Free Fri / $30","venue":"MoMA, Midtown","hood":"Manhattan","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":true,"tags":["exhibition","free"],"coord":[40.7614,-73.9776],"src":"The Skint","url":"https://www.moma.org/calendar/exhibitions/5820","desc":"First Duchamp retrospective in the US since 1973: 300 works. Free for NY residents every Friday 5:30-8:30pm."},{"id":"ss-yiddish","title":"SummerStage: New York Sings Yiddish","E":"2026-06-22","time":"6:00 PM","price":"Free","venue":"Rumsey Playfield, Central Park","hood":"Manhattan","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","weird","local"],"coord":[40.7722,-73.969],"src":"SummerStage","url":"https://cityparksfoundation.org/summerstage/","desc":"The Shvesters, YidLife Crisis, Yair Keydar, Riki Rose and more. Free."},{"id":"ss-bastille","title":"SummerStage: Bastille Day Concert","E":"2026-07-12","time":"6:00 PM","price":"Free","venue":"Rumsey Playfield, Central Park","hood":"Manhattan","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","weird","local"],"coord":[40.7722,-73.969],"src":"SummerStage","url":"https://cityparksfoundation.org/summerstage/","desc":"Bastille Day: Black M, Laurent Voulzy, Legends of the 80s, Michel Polnareff. Free."},{"id":"bric-habibi","title":"BRIC Celebrate Brooklyn: Habibi Festival","E":"2026-07-10","time":"7:00 PM","price":"Free","venue":"Lena Horne Bandshell, Prospect Park","hood":"Brooklyn","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","local","weird"],"coord":[40.6602,-73.969],"src":"BRIC","url":"https://bricartsmedia.org/celebrate-brooklyn","desc":"EMEL, Mai Elgizouli, Nesrine, Yacine Boulares and the Habibi - free outdoor festival of Arab music."},{"id":"japan-fes","title":"Japan Fes Japanese Food Street Fair","E":"2026-05-24","time":"10:00 AM","price":"Free","venue":"Washington Square North","hood":"Manhattan","cat":"Food & Drink","sub":"Street Fair","tier":1,"ticket":false,"tags":["free","outdoor","food"],"coord":[40.7308,-73.9973],"src":"The Skint","url":"https://www.japanfes.com/newyork/2026","desc":"Annual Japanese food street fair: teriyaki, ramen, takoyaki, matcha shaved ice, bubble tea. 10am-6pm."},{"id":"keith-haring","title":"Keith Haring at Brant Foundation","E":"2026-05-24","X":"2026-05-31","time":"All day","price":"$20","venue":"Brant Foundation, East Village","hood":"Manhattan","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":true,"tags":["exhibition","local"],"coord":[40.7282,-73.9857],"src":"The Skint","url":"https://www.brantfoundation.org/exhibitions/keith-haring/","desc":"Keith Haring's rise from subway artist to pop-art icon 1980-1983. Through May 31 only."},{"id":"busta-rhymes","title":"Busta Rhymes + DJ Scratch (Free)","E":"2026-05-27","time":"6:00 PM","price":"Free","venue":"Public Square, Hudson Yards","hood":"Manhattan","cat":"Music","sub":"Hip-Hop","tier":1,"ticket":false,"tags":["free","outdoor","hip-hop"],"coord":[40.7538,-74.0],"src":"The Skint","url":"https://www.hudsonyardsnewyork.com/summer-concerts-wells-fargo-stage","desc":"Free outdoor concert at Hudson Yards. Final show in the Wells Fargo Stage series."},{"id":"greater-ny-ps1","title":"Greater New York 2026 at MoMA PS1","E":"2026-05-24","X":"2026-08-17","time":"All day","price":"$10","venue":"MoMA PS1, Long Island City","hood":"Queens","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":true,"tags":["exhibition","local"],"coord":[40.7445,-73.9482],"src":"The Skint","url":"https://www.moma.org/calendar/exhibitions/ps1","desc":"53 artists, 150+ works. Live performances through June. Through August 17."},{"id":"hrp-juneteenth","title":"Juneteenth Concert at Hudson River Park","E":"2026-06-18","time":"6:30 PM","price":"Free","venue":"Pier 45, Hudson River Park","hood":"Manhattan","cat":"Music","sub":"Soul/R&B","tier":1,"ticket":false,"tags":["free","outdoor","local","history"],"coord":[40.7339,-74.0085],"src":"Hudson River Park","url":"https://hudsonriverpark.org/explore-the-park/events","desc":"Special Juneteenth concert featuring dance, music and more at Pier 45. Free."},{"id":"ss-laurie","title":"SummerStage: Laurie Anderson with Sexmob","E":"2026-06-26","time":"6:00 PM","price":"Free","venue":"Rumsey Playfield, Central Park","hood":"Manhattan","cat":"Music","sub":"Indie/Alt","tier":1,"ticket":false,"tags":["free","outdoor","weird","nyc"],"coord":[40.7722,-73.969],"src":"SummerStage","url":"https://cityparksfoundation.org/summerstage/","desc":"Laurie Anderson brings her Republic of Love tour to Central Park with Sexmob. Free."},{"id":"ss-ledisi","title":"SummerStage: Ledisi (Opening Night)","E":"2026-06-10","time":"6:00 PM","price":"Free","venue":"Rumsey Playfield, Central Park","hood":"Manhattan","cat":"Music","sub":"Soul/R&B","tier":1,"ticket":false,"tags":["free","outdoor","jazz","local"],"coord":[40.7722,-73.969],"src":"SummerStage","url":"https://cityparksfoundation.org/summerstage/","desc":"SummerStage 40th anniversary opening: Grammy-winning Ledisi performing her Dinah Washington tribute. Blue Note Jazz Festival."},{"id":"sing-hope-pianos","title":"Sing for Hope Pianos NYC 2026","E":"2026-05-24","X":"2026-06-07","time":"All day","price":"Free","venue":"Parks citywide","hood":"Manhattan","cat":"Music","sub":"Open Mic","tier":2,"ticket":false,"tags":["free","outdoor","local","weird"],"coord":[40.758,-73.9855],"src":"The Skint","url":"https://www.singforhope.org/pianos/nyc26","desc":"Artist-decorated pianos in parks across all five boroughs for anyone to play. Through June 7."},{"id":"bric-juneteenth","title":"BRIC Celebrate Brooklyn: Juneteenth - Infinity Song","E":"2026-06-19","time":"7:00 PM","price":"Free","venue":"Lena Horne Bandshell, Prospect Park","hood":"Brooklyn","cat":"Music","sub":"Soul/R&B","tier":1,"ticket":false,"tags":["free","outdoor","local","history"],"coord":[40.6602,-73.969],"src":"BRIC","url":"https://bricartsmedia.org/celebrate-brooklyn","desc":"Juneteenth celebration: Infinity Song, Annie and the Caldwells, Victory Boyd, DJ Duane. Free."},{"id":"bric-wayne-wonder","title":"BRIC Celebrate Brooklyn: Wayne Wonder + Lila Ike","E":"2026-06-20","time":"7:00 PM","price":"Free","venue":"Lena Horne Bandshell, Prospect Park","hood":"Brooklyn","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","local","dance"],"coord":[40.6602,-73.969],"src":"BRIC","url":"https://bricartsmedia.org/celebrate-brooklyn","desc":"Wayne Wonder + Lila Ike + DJ Gravy at Prospect Park. Free."},{"id":"blue-note-fest","title":"Blue Note Jazz Festival NYC","E":"2026-06-01","X":"2026-07-01","time":"Various","price":"From $40","venue":"Multiple venues - Blue Note, Sony Hall, SummerStage","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":true,"tags":["jazz","nyc","intimate"],"coord":[40.7282,-74.0],"src":"Blue Note","url":"https://www.bluenotejazzfestival.com","desc":"15th annual Blue Note Jazz Festival. Ledisi, Big Freedia, Durand Bernarr, Shabaka Hutchins, Kokoroko, Jose James and more across NYC venues. Jun 1 - Jul 1."},{"id":"bric-global","title":"BRIC Celebrate Brooklyn: globalFEST - DakhaBrakha","E":"2026-08-07","time":"7:00 PM","price":"Free","venue":"Lena Horne Bandshell, Prospect Park","hood":"Brooklyn","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","weird","local"],"coord":[40.6602,-73.969],"src":"BRIC","url":"https://bricartsmedia.org/celebrate-brooklyn","desc":"DakhaBrakha, Yeison Landero, Sally Baby's Silver Dollars, Sunju Park. Free."},{"id":"out-of-silence","title":"Out of Silence: Sound Installation","E":"2026-05-24","X":"2026-06-21","time":"Runs on the hour","price":"Free","venue":"FDR Four Freedoms Park, Roosevelt Island","hood":"Manhattan","cat":"Art & Culture","sub":"Performance Art","tier":2,"ticket":false,"tags":["outdoor","free","local","weird"],"coord":[40.7618,-73.9518],"src":"The Skint","url":"https://www.fdrfourfreedomspark.org/event/out-of-silence/","desc":"15-minute sound installation by Hans Rosenstrom. Vocals by Estonian ensemble Vox Clamantis. Free, on the hour."},{"id":"carnegie-faure","title":"Carnegie Hall: Faure & Runestad ($14)","E":"2026-06-01","time":"8:00 PM","price":"$14","venue":"Carnegie Hall, Midtown","hood":"Manhattan","cat":"Music","sub":"Classical","tier":1,"ticket":true,"tags":["classical","intimate"],"coord":[40.7651,-73.98],"src":"The Skint","url":"https://www.carnegiehall.org/Calendar/2026/06/01/Masterwork-Festival-Choruses-0800PM","desc":"Faure's Requiem + Jake Runestad's Proud Music of the Storm. 100+ choir, full orchestra. Use code CLB53914 for $14 tickets (reg. up to $121)."},{"id":"bbp-movies","title":"Movies With A View at Brooklyn Bridge Park","E":"2026-07-02","X":"2026-08-28","time":"Sunset","price":"Free","venue":"Pier 1, Brooklyn Bridge Park","hood":"Brooklyn","cat":"Film","sub":"Outdoor Screening","tier":1,"ticket":false,"tags":["outdoor","free","film","waterfront"],"coord":[40.7024,-73.9988],"src":"Brooklyn Bridge Park","url":"https://brooklynbridgepark.org/events/movies-with-a-view/","desc":"Free outdoor films Thursday evenings at Pier 1 with New York Harbor views. Starts July 2."},{"id":"ohny-weekend","title":"Open House New York Weekend 2026","E":"2026-10-16","X":"2026-10-19","time":"Various","price":"Free / from $6","venue":"Citywide - 300+ sites","hood":"Manhattan","cat":"Talk & Learn","sub":"History Tour","tier":1,"ticket":true,"tags":["local","history","nyc","outdoor"],"coord":[40.758,-73.9855],"src":"OHNY","url":"https://ohny.org/calendar","desc":"NYC's largest architecture event: 300+ buildings usually closed to public open their doors. Oct 16-19."},{"id":"kingsland","title":"Kingsland Wildflowers Green Roof (Fridays)","E":"2026-05-24","X":"2026-06-26","time":"5:00 PM","price":"Free","venue":"Kingsland Wildflowers, Greenpoint","hood":"Brooklyn","cat":"Outdoors","sub":"Garden","tier":2,"ticket":true,"tags":["outdoor","free","waterfront","local"],"coord":[40.7299,-73.9516],"src":"The Skint","url":"https://www.eventbrite.com/e/kingsland-wildflowers","desc":"Golden hour among native plants with skyline views in Greenpoint. Live music. Every Friday through June 26. Free RSVP."},{"id":"raphael-met","title":"Raphael: Sublime Poetry at The Met","E":"2026-05-24","X":"2026-06-28","time":"All day","price":"PWYW (NY residents)","venue":"The Met Fifth Ave, UES","hood":"Manhattan","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":true,"tags":["exhibition"],"coord":[40.7794,-73.9632],"src":"The Skint","url":"https://www.metmuseum.org/exhibitions/raphael-sublime-poetry","desc":"First comprehensive Raphael exhibition in the US: 170+ works. PWYW for NY residents. Through June 28."},{"id":"hrp-jazz","title":"Jazz at Pier 84 (Wednesdays)","E":"2026-06-17","X":"2026-08-12","time":"7:00 PM","price":"Free","venue":"Pier 84, Hudson River Park","hood":"Manhattan","cat":"Music","sub":"Live Jazz","tier":1,"ticket":false,"tags":["free","outdoor","jazz","waterfront","recurring"],"coord":[40.7642,-74.0],"src":"Hudson River Park","url":"https://hudsonriverpark.org/explore-the-park/events","desc":"Free jazz on the riverfront every Wednesday. Local legends perform in tribute to NYC's storied jazz history. Jun 17 - Aug 12."},{"id":"hrp-broadway","title":"Broadway by the Boardwalk (Mondays)","E":"2026-07-06","X":"2026-08-03","time":"7:00 PM","price":"Free","venue":"Clinton Cove, Hudson River Park","hood":"Manhattan","cat":"Art & Culture","sub":"Performance Art","tier":1,"ticket":false,"tags":["free","outdoor","theater","waterfront","recurring"],"coord":[40.7642,-74.0],"src":"Hudson River Park","url":"https://hudsonriverpark.org/explore-the-park/events","desc":"Broadway stars perform outdoors at Clinton Cove on the Hudson waterfront. Free, every Monday in July-August."},{"id":"hrp-science","title":"Science After Dark at Hudson River Park","E":"2026-06-01","X":"2026-08-31","time":"7:00 PM","price":"Free","venue":"Wetlab, Hudson River Park","hood":"Manhattan","cat":"Talk & Learn","sub":"Lecture","tier":2,"ticket":false,"tags":["free","outdoor","weird","date","waterfront"],"coord":[40.7258,-74.0117],"src":"Hudson River Park","url":"https://hudsonriverpark.org/explore-the-park/events","desc":"Monthly Science After Dark events in the Park's Wetlab aquarium. Ask a Scientist, Fascinating Fish, Crab Lab. A one-of-a-kind date night. Free, monthly."},{"id":"rockwood-nightly","title":"Rockwood Music Hall: Nightly Free Shows","E":"2026-05-24","X":"2026-12-31","time":"Various","price":"Free (Stage 1)","venue":"Rockwood Music Hall, LES","hood":"Manhattan","cat":"Music","sub":"Indie/Alt","tier":2,"ticket":false,"tags":["free","local","intimate","recurring"],"coord":[40.7215,-73.9866],"src":"Rockwood","url":"https://rockwoodmusichall.com","desc":"Nightly free live music on Stage 1 (196 Allen St) with an eclectic mix of singer-songwriters, jazz, indie, and more. One of NYC's best free music venues."},{"id":"ss-met-opera","title":"SummerStage: Metropolitan Opera Summer Recital","E":"2026-06-15","time":"6:00 PM","price":"Free","venue":"Rumsey Playfield, Central Park","hood":"Manhattan","cat":"Music","sub":"Classical","tier":1,"ticket":false,"tags":["free","outdoor","classical"],"coord":[40.7722,-73.969],"src":"SummerStage","url":"https://cityparksfoundation.org/summerstage/","desc":"Free Metropolitan Opera Summer Recital at Central Park. Emily Pogorelc, Joshua Blue, Edward Nelson and Dmitri Dover."},{"id":"manhattanhenge-may","title":"Manhattanhenge 2026","E":"2026-05-28","X":"2026-05-29","time":"8:14 PM","price":"Free","venue":"East ends of 14th, 23rd, 34th, 42nd, 57th St","hood":"Manhattan","cat":"Outdoors","sub":"Waterfront","tier":1,"ticket":false,"tags":["free","outdoor","weird","local","nyc"],"coord":[40.7489,-73.9680],"src":"The Skint","url":"https://www.amnh.org/research/hayden-planetarium/manhattanhenge","desc":"Sun aligns with Manhattan's grid twice a year. Thu 8:14pm, Fri 8:13pm. Free."},{"id":"cooper-union-endofyear","title":"Cooper Union 2026 End of Year Show","E":"2026-05-27","X":"2026-06-14","time":"12:00 PM","price":"Free","venue":"Foundation Building + 41 Cooper Square, East Village","hood":"Manhattan","cat":"Art & Culture","sub":"Exhibition","tier":1,"ticket":false,"tags":["free","exhibition","local"],"coord":[40.7289,-73.9900],"src":"The Skint","url":"https://cooper.edu/events-and-exhibitions/exhibitions/2026-end-year-show","desc":"Art, architecture & engineering student work fills Cooper Union. Opening reception 5/27 5-8pm. Free."},{"id":"music-for-enophiles","title":"Music for Enophiles: Brian Eno Tribute","E":"2026-05-27","time":"9:00 PM","price":"$15","venue":"Mercury Lounge, LES","hood":"Manhattan","cat":"Music","sub":"Indie/Alt","tier":1,"ticket":true,"tags":["intimate","local","weird"],"coord":[40.7215,-73.9870],"src":"The Skint","url":"https://www.musicforenophiles.com/","desc":"NYC band plays Brian Eno's solo pop recordings 1974-1977. Annual concert at Mercury Lounge."},{"id":"flash-comedy-may27","title":"Flash Comedy: Free Polaroid Night","E":"2026-05-27","time":"8:00 PM","price":"$12","venue":"Mood Ring, Bushwick","hood":"Brooklyn","cat":"Comedy","sub":"Stand-up","tier":2,"ticket":true,"tags":["comedy","weird"],"coord":[40.7050,-73.9210],"src":"The Skint","url":"https://www.eventbrite.com/e/flash-comedy-tickets-1979288721848","desc":"Hosts snap free polaroids of you. Judah Friedlander headlines. Mood Ring, Bushwick. $12."},{"id":"wagner-park-summer","title":"Wagner Park Summer Series","E":"2026-05-28","X":"2026-08-28","time":"7:00 PM","price":"Free","venue":"Robert F. Wagner Park, Battery Park City","hood":"Manhattan","cat":"Music","sub":"World Music","tier":1,"ticket":false,"tags":["free","outdoor","waterfront","recurring"],"coord":[40.7047,-74.0171],"src":"The Skint","url":"https://downtownny.com/news/wagner-park-events-summer-2026/","desc":"Free outdoor music, dance and more at Battery Park waterfront all summer. Opener: Red Baraat."},{"id":"hudson-classical-uncle-vanya","title":"Hudson Classical Theater: Uncle Vanya (Outdoor)","E":"2026-05-28","X":"2026-06-21","time":"6:30 PM","price":"Pay What You Can","venue":"Soldiers & Sailors Monument, Riverside Park","hood":"Manhattan","cat":"Art & Culture","sub":"Theater","tier":1,"ticket":false,"tags":["outdoor","free","theater","local"],"coord":[40.7886,-73.9824],"src":"The Skint","url":"https://www.hudsonclassicaltheatercompany.org","desc":"Free outdoor Chekhov at Riverside Park monument. Thu-Sun 6:30pm thru 6/21. Pay-what-you-can."},{"id":"its-crowded-hilary","title":"Its Crowded: Cartoons by Hilary Fitzgerald Campbell","E":"2026-05-28","X":"2026-06-17","time":"All day","price":"Free","venue":"Yashar Gallery, Greenpoint","hood":"Brooklyn","cat":"Art & Culture","sub":"Exhibition","tier":2,"ticket":false,"tags":["free","exhibition","local"],"coord":[40.7299,-73.9516],"src":"The Skint","url":"https://partiful.com/e/fVxtP0Rv65wBtkuebGoh","desc":"New Yorker cartoonist exhibition at Yashar Gallery. Opening reception 5/28 6-9pm. Free."},{"id":"brooklyn-ceramics-tour","title":"Brooklyn Ceramic Arts Tour 2026","E":"2026-05-28","X":"2026-06-01","time":"All day","price":"Free","venue":"Studios across Brooklyn","hood":"Brooklyn","cat":"Get Creative","sub":"Ceramics","tier":2,"ticket":false,"tags":["free","outdoor","local","workshop"],"coord":[40.6782,-73.9442],"src":"The Skint","url":"https://brooklynceramicartstour.com/map-2026","desc":"Artists, studios and galleries across Brooklyn open their doors. Demos, sales, talks. Free."},{"id":"road-to-broadway","title":"Road to Broadway: Free Live Performances","E":"2026-05-28","X":"2026-06-11","time":"12:00 PM","price":"Free","venue":"The Rink at Rockefeller Center, Midtown","hood":"Manhattan","cat":"Art & Culture","sub":"Performance Art","tier":1,"ticket":false,"tags":["free","outdoor","theater","local","recurring"],"coord":[40.7587,-73.9787],"src":"The Skint","url":"https://www.rockefellercenter.com/magazine/events/road-to-broadway-free-performances-guide-nyc/","desc":"15 Broadway shows perform live outdoors at Rockefeller. Thursdays thru 6/11. Free."},{"id":"not-in-my-backyard","title":"Not In My Backyard! Political Comedy","E":"2026-05-28","time":"7:00 PM","price":"$10","venue":"UCB, East Village","hood":"Manhattan","cat":"Comedy","sub":"Improv","tier":1,"ticket":true,"tags":["comedy","weird","local","nyc"],"coord":[40.7264,-73.9853],"src":"The Skint","url":"https://ucbcomedy.com/show/not-in-my-backyard-05-28-26/","desc":"Comedians debate NYC neighborhood drama. Hosted by Cody Lindquist and Charlie Todd. $10 adv."},{"id":"dead-ladies-show-may","title":"The Dead Ladies Show NYC","E":"2026-05-28","time":"7:00 PM","price":"$10","venue":"KGB Bar, LES","hood":"Manhattan","cat":"Talk & Learn","sub":"Literary & Books","tier":2,"ticket":true,"tags":["weird","local","intimate"],"coord":[40.7265,-73.9841],"src":"The Skint","url":"https://www.eventbrite.com/e/dead-ladies-show-nyc-40-tickets-1988886763850","desc":"Presentations on three deceased women who shaped history. KGB Bar, LES. $10 adv, $15 door."},{"id":"swamp-city-two-step","title":"Swamp in the City: Cajun Two-Step Night","E":"2026-05-28","time":"7:30 PM","price":"$10","venue":"Jalopy Theater, Columbia Street Waterfront","hood":"Brooklyn","cat":"Music","sub":"World Music","tier":2,"ticket":true,"tags":["dance","weird","local"],"coord":[40.6792,-74.0015],"src":"The Skint","url":"https://www.viewcy.com/event/twostep_night_with_l","desc":"Cajun and norteno accordion night at Jalopy. Beginner dance lessons before each set. $10+."},{"id":"locrian-chamber-players","title":"Locrian Chamber Players: New Music Concert","E":"2026-05-28","time":"8:00 PM","price":"Free","venue":"Riverside Church, Morningside Heights","hood":"Manhattan","cat":"Music","sub":"Classical","tier":2,"ticket":false,"tags":["free","classical","intimate"],"coord":[40.8109,-73.9635],"src":"The Skint","url":"https://www.locrian.org/","desc":"Chamber group performs works from the last 10 years by established and emerging composers. Free."},{"id":"newfest-2026","title":"NewFest LGBTQ+ Film Festival: Pride Edition","E":"2026-05-28","X":"2026-06-01","time":"Various","price":"Various","venue":"SVA Theatre, Chelsea","hood":"Manhattan","cat":"Film","sub":"Film Series","tier":1,"ticket":true,"tags":["film","local","nyc"],"coord":[40.7456,-73.9979],"src":"The Skint","url":"https://newfest.org/newfest-pride-2026/","desc":"LGBTQ+ film festival Pride edition at SVA Theatre and Gansevoort Plaza and online. Thru 6/1."},{"id":"inwood-film-fest","title":"2026 Inwood Film Festival","E":"2026-05-28","X":"2026-06-01","time":"Various","price":"$15","venue":"Campbell Sports Center, Inwood","hood":"Manhattan","cat":"Film","sub":"Film Series","tier":2,"ticket":true,"tags":["film","local"],"coord":[40.8675,-73.9210],"src":"The Skint","url":"https://www.inwoodartworks.nyc/film-works/2026-film-festival-program/","desc":"Columbia University annual film festival in Inwood. $15 general, $10 students, $3 online."},{"id":"open-roads-italian","title":"Open Roads: New Italian Cinema Festival","E":"2026-05-28","X":"2026-06-05","time":"Various","price":"$19","venue":"Film at Lincoln Center, UWS","hood":"Manhattan","cat":"Film","sub":"Film Series","tier":2,"ticket":true,"tags":["film","arthouse"],"coord":[40.7725,-73.9836],"src":"The Skint","url":"https://www.filmlinc.org/festivals/open-roads-new-italian-cinema/","desc":"25th annual Italian cinema at Film at Lincoln Center. $19 general, $14 students/seniors."},{"id":"hrp-kayaking-season","title":"Free Kayaking at Hudson River Park","E":"2026-05-23","X":"2026-10-11","time":"Various","price":"Free","venue":"Piers 26 and 96, Hudson River Park","hood":"Manhattan","cat":"Sports","sub":"Kayaking","tier":1,"ticket":false,"tags":["free","outdoor","waterfront","recurring","do"],"coord":[40.7200,-74.0152],"src":"The Skint","url":"https://www.downtownboathouse.org","desc":"Free 20-min kayaking at Piers 26 (Tribeca) and 96 (Hell's Kitchen). Sat-Sun. Life vests provided."},{"id":"coney-island-history","title":"Coney Island History Project: Summer Season","E":"2026-05-23","X":"2026-09-07","time":"1:00 PM","price":"Free","venue":"Wonder Gallery, Coney Island","hood":"Brooklyn","cat":"Talk & Learn","sub":"History Tour","tier":2,"ticket":false,"tags":["free","local","outdoor","history","weird"],"coord":[40.5755,-73.9707],"src":"The Skint","url":"https://www.coneyislandhistory.org","desc":"Vintage Coney Island photo exhibits and mini zine machine at Wonder Gallery. Weekends 1-7pm."},{"id":"jordin-sparks-hudson","title":"Jordin Sparks + Emyrson Flora (Free)","E":"2026-06-03","time":"6:00 PM","price":"Free","venue":"Public Square, Hudson Yards","hood":"Manhattan","cat":"Music","sub":"Soul/R&B","tier":1,"ticket":false,"tags":["free","outdoor","local"],"coord":[40.7538,-74.0],"src":"The Skint","url":"https://www.hudsonyardsnewyork.com/summer-concerts-wells-fargo-stage","desc":"Free outdoor concert at Hudson Yards. Jordin Sparks with opener Emyrson Flora."},{"id":"hudson-classical-hamlet","title":"Hudson Classical Theater: Hamlet (Outdoor)","E":"2026-06-25","X":"2026-07-19","time":"6:30 PM","price":"Pay What You Can","venue":"Soldiers and Sailors Monument, Riverside Park","hood":"Manhattan","cat":"Art & Culture","sub":"Theater","tier":2,"ticket":false,"tags":["outdoor","free","theater","local"],"coord":[40.7886,-73.9824],"src":"The Skint","url":"https://www.hudsonclassicaltheatercompany.org","desc":"Free outdoor Shakespeare at Riverside Park. Thu-Sun 6:30pm, 6/25-7/19. Pay-what-you-can."},{"id":"bryant-yoga-2026","title":"Bryant Park Yoga (Free Wednesdays)","E":"2026-05-27","X":"2026-09-16","time":"6:00 PM","price":"Free","venue":"Bryant Park, Midtown","hood":"Manhattan","cat":"Sports","sub":"Yoga","tier":2,"ticket":true,"tags":["free","outdoor","recurring","do","wellness"],"coord":[40.7536,-73.9832],"src":"The Skint","url":"https://bryantpark.org/activities/yoga","desc":"Free outdoor yoga every Wednesday 6pm on the lawn. 23rd year. BYO mat. RSVP required."}];

const withTimeout=(promise,ms,label)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||"Request")+" timed out after "+Math.round(ms/1000)+"s")),ms))
]);

export default function App(){
  const [ready,setReady]=useState(false);
  const [prof,setProf]=useState({...DP,categories:{...DP.categories},vibes:{...DP.vibes}});
  const [beh,setBeh]=useState({viewedCats:{},savedCats:{},calCats:{}});
  const [favs,setFavs]=useState({});
  const [events,setEvents]=useState(EV);
  const [lastRefreshed,setLastRefreshed]=useState(null);
  const [refreshing,setRefreshing]=useState(false);
  const [notif,setNotif]=useState({enabled:false,shown:[]});
  const [refreshLog,setRefreshLog]=useState([]);
  const [sourceMeta,setSourceMeta]=useState({});
  const [gmailUrl,setGmailUrl]=useState("https://script.google.com/macros/s/AKfycbzyUXSvObga5nVWHavisMQu3jxwNCWWsiZwsVaq_IzRp5qgSfz_8J1kL_5zP2iKly2-/exec");
  const [gmailKey,setGmailKey]=useState("f{ZU6kRspFUn0MW744OEMY8s");
  const stopRef=useRef(false);
  const [tab,setTab]=useState("home");
  const [vm,setVm]=useState("cards");
  const [modal,setModal]=useState(null);
  const [sp,setSp]=useState(null);
  const [expandedCats,setExpandedCats]=useState({});
  const toggleCatExpand=cat=>setExpandedCats(p=>({...p,[cat]:!p[cat]}));
  const [profTab,setProfTab]=useState("prefs");
  const [toast,setToast]=useState(null);
  const [fc,setFc]=useState([]);
  const [fh,setFh]=useState([]);
  const [fp,setFp]=useState([]);
  const [fd,setFd]=useState([]);
  const [fv,setFv]=useState([]);
  const [fms,setFms]=useState(0);
  const [fmk,setFmk]=useState(50);
  const [fq,setFq]=useState("");
  const [sortBy,setSortBy]=useState("date");
  const [sortBy2,setSortBy2]=useState("score");
  // Per-carousel sort overrides (default each to score)
  const [carSort,setCarSort]=useState({});
  const setCar=(k,v)=>setCarSort(p=>({...p,[k]:v}));
  const [dd,setDd]=useState(null);
  const [loc,setLoc]=useState(null);
  const [locSt,setLocSt]=useState("idle");
  const [imgs,setImgs]=useState({});

  // Load cached GPS instantly, then refresh in background
  useEffect(()=>{
    (async()=>{
      const cached=await sg("gp_loc_v1");
      if(cached?.coord){setLoc(cached.coord);setLocSt("cached");}
      if(!navigator.geolocation){if(!cached)setLocSt("denied");return;}
      setLocSt(s=>s==="cached"?s:"locating");
      navigator.geolocation.getCurrentPosition(
        p=>{
          const c=[p.coords.latitude,p.coords.longitude];
          setLoc(c);setLocSt("ok");
          ss("gp_loc_v1",{coord:c,ts:Date.now()});
        },
        err=>{setLocSt(err.code===1?"denied":err.code===3?"timeout":"error");},
        {timeout:15000,maximumAge:60000,enableHighAccuracy:false}
      );
    })();
  },[]);
  const retryGPS=()=>{
    if(!navigator.geolocation){showToast("Geolocation not supported");return;}
    setLocSt("locating");
    navigator.geolocation.getCurrentPosition(
      p=>{
        const c=[p.coords.latitude,p.coords.longitude];
        setLoc(c);setLocSt("ok");
        ss("gp_loc_v1",{coord:c,ts:Date.now()});
        showToast("Location updated");
      },
      err=>{
        setLocSt(err.code===1?"denied":err.code===3?"timeout":"error");
        showToast(err.code===1?"Permission denied — enable in browser settings":"Could not get location");
      },
      {timeout:15000,maximumAge:0,enableHighAccuracy:true}
    );
  };

  useEffect(()=>{
    (async()=>{
      const [pr,fv2,bh,evStore,gm,nt0]=await Promise.all([sg(SK_P),sg(SK_F),sg(SK_B),sg("gp_events_v1"),sg("gp_gmail_v1"),sg("gp_notif_v1")]);
      if(nt0)setNotif(nt0);

      if(pr){setProf({...DP,...pr,categories:{...DP.categories,...(pr.categories||{})},vibes:{...DP.vibes,...(pr.vibes||{})},subcategories:{...DEFAULT_SUBS,...DP.subcategories,...(pr.subcategories||{})}});}
      if(fv2)setFavs(fv2);
      if(bh)setBeh(bh);
      if(evStore?.events&&evStore.events.length>0){setEvents(evStore.events);setLastRefreshed(evStore.refreshed||null);if(evStore.sourceMeta)setSourceMeta(evStore.sourceMeta);}
      if(gm){if(gm.url)setGmailUrl(gm.url);if(gm.key)setGmailKey(gm.key);}
      setReady(true);
    })();
  },[]);

  useEffect(()=>{
    Object.keys(CATS).forEach(async cat=>{
      const u=await fetchImg(cat);
      if(u)setImgs(p=>({...p,[cat]:u}));
    });
  },[]);

  // Auto-sync once per 24h if Gmail URL is set
  const autoSyncRef=useRef(false);
  useEffect(()=>{
    if(!ready||!gmailUrl||autoSyncRef.current||refreshing)return;
    const last=lastRefreshed?new Date(lastRefreshed).getTime():0;
    if(Date.now()-last>3*3600*1000){ // 3 hours — auto-refresh on app open if stale
      autoSyncRef.current=true;
      setTimeout(()=>doRefresh(),1500);
    }
  },[ready,gmailUrl,lastRefreshed]);

  // ─── Push-style local notifications ──────────────────────────────────────
  // Fire on app open for top-score events starting in next 4h, with dedup.
  const notifEnabled=notif.enabled&&typeof Notification!=="undefined"&&Notification.permission==="granted";
  useEffect(()=>{
    if(!ready||!notifEnabled)return;
    const home2=loc||[40.7186,-73.9865];
    const now=new Date(),today2=floorDay(now),fourH=new Date(now.getTime()+4*3600*1000);
    const candidates=events.filter(ev=>{
      if(!evCovers(ev,today2))return false;
      if(isImprecise(ev))return false;
      const t=parseT(ev.time);
      const startDT=new Date(ev.E+"T"+t);
      if(startDT<now||startDT>fourH)return false;
      const d=kmdist(safeCoord(ev),home2);
      if(d>3)return false;
      const sc=calcScore(ev,prof,beh,today2,home2);
      return sc>=55;
    }).map(ev=>({...ev,_sc:calcScore(ev,prof,beh,today2,home2)})).sort((a,b)=>b._sc-a._sc).slice(0,3);
    const already=new Set(notif.shown||[]);
    const fresh=candidates.filter(ev=>!already.has(ev.id));
    if(fresh.length===0)return;
    for(const ev of fresh){
      try{
        const cfg=CATS[ev.cat]||CATS.Other;
        const t=ev.time&&ev.time!=="All day"?ev.time:"soon";
        const d=kmdist(safeCoord(ev),home2).toFixed(1);
        const n=new Notification((cfg.emoji||"📍")+" "+ev.title,{
          body:t+" · "+(ev.venue||"")+" · "+d+"km · "+(ev.price||"Free"),
          tag:"gp-"+ev.id,
          icon:LOGO,
          badge:LOGO,
        });
        n.onclick=()=>{window.focus();openModal(ev);n.close();};
      }catch(e){console.warn("Notification failed",e);}
    }
    const newShown=[...(notif.shown||[]),...fresh.map(e=>e.id)].slice(-50);
    const next={...notif,shown:newShown};
    setNotif(next);ss("gp_notif_v1",next);
  },[ready,notifEnabled,events.length,prof,beh,loc]);

  const requestNotifPermission=async()=>{
    if(typeof Notification==="undefined"){showToast("Notifications not supported in this browser");return;}
    if(Notification.permission==="granted"){
      const next={...notif,enabled:true};
      setNotif(next);ss("gp_notif_v1",next);
      showToast("Notifications enabled");
      return;
    }
    if(Notification.permission==="denied"){
      showToast("Permission blocked — enable in browser settings");
      return;
    }
    const r=await Notification.requestPermission();
    if(r==="granted"){
      const next={...notif,enabled:true};
      setNotif(next);ss("gp_notif_v1",next);
      showToast("Notifications enabled");
    }else{
      showToast("Permission denied");
    }
  };
  const disableNotif=()=>{
    const next={...notif,enabled:false};
    setNotif(next);ss("gp_notif_v1",next);
    showToast("Notifications disabled");
  };

    const showToast=m=>{setToast(m);setTimeout(()=>setToast(null),2800);};
  const track=(type,cat)=>{
    setBeh(p=>{
      const k=type==="viewed"?"viewedCats":type==="saved"?"savedCats":"calCats";
      const nb={...p,[k]:{...p[k],[cat]:(p[k]?.[cat]||0)+1}};
      ss(SK_B,nb);
      return nb;
    });
  };
  const toggleFav=ev=>{
    setFavs(p=>{
      const n={...p};
      if(n[ev.id]){delete n[ev.id];showToast("Removed");}
      else{n[ev.id]=ev;track("saved",ev.cat);showToast("Saved");}
      ss(SK_F,n);
      return n;
    });
  };
  const updProf=np=>{setProf(np);ss(SK_P,np);};
  const openModal=ev=>{setModal(ev);track("viewed",ev.cat);};
  const addCal=ev=>{
    const s=new Date(ev.E+"T"+parseT(ev.time)),e=new Date(s.getTime()+7200000);
    window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(ev.title)+"&dates="+toGC(s)+"/"+toGC(e)+"&details="+encodeURIComponent((ev.desc||"")+"\n\n"+(ev.url||""))+"&location="+encodeURIComponent(ev.venue||""),"_blank");
    track("cal",ev.cat);
    showToast("Opening Google Calendar");
  };
  const share=ev=>{
    const t=ev.title+"\n"+ev.venue+" - "+fmtD(ev.E)+"\n"+(ev.price||"Free")+"\n"+(ev.url||"");
    if(navigator.share)navigator.share({title:ev.title,text:t,url:ev.url||""}).catch(()=>{});
    else navigator.clipboard?.writeText(t).then(()=>showToast("Copied!")).catch(()=>{});
  };

  const PROXY="https://goodplans-proxy.vercel.app/api/fetch";

  const proxyFetch=async url=>{
    let r;
    try{
      r=await fetch(`${PROXY}?url=${encodeURIComponent(url)}`);
    }catch(e){
      // Network/CORS/CSP failure — fetch threw before getting a response
      throw new Error(`Network: ${e.name||"Error"} — ${e.message||"unknown"}`);
    }
    if(!r.ok)throw new Error(`HTTP ${r.status} from proxy`);
    const html=await r.text();
    if(!html||html.trim().length<200)throw new Error("Empty response");
    if(html.includes("Just a moment")||html.includes("cf-browser-verification")||html.includes("Checking your browser"))throw new Error("Cloudflare blocked");
    return html;
  };

  const htmlToText=html=>html
    .replace(/<script[\s\S]*?<\/script>/gi,"")
    .replace(/<style[\s\S]*?<\/style>/gi,"")
    .replace(/<[^>]+>/g," ")
    .replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#\d+;/g," ").replace(/&[a-z]+;/g," ")
    .replace(/\s+/g," ").trim()
    .substring(0,10000);

  // MCP helper — calls the Anthropic API with an MCP server attached
  const callWithMCP=async(mcpUrl,prompt,sysOverride)=>{
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","anthropic-beta":"mcp-client-2025-04-04"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:8000,
        system:sysOverride||"You are a helpful assistant. Complete the task and return only JSON.",
        messages:[{role:"user",content:prompt}],
        mcp_servers:[{type:"url",url:mcpUrl,name:"mcp-server"}]
      })
    });
    const d=await r.json();
    if(d.error)throw new Error(d.error.message||"MCP API error");
    const texts=d.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
    const toolResults=d.content?.filter(b=>b.type==="mcp_tool_result").map(b=>b.content?.[0]?.text||"").join("")||"";
    return texts||toolResults;
  };

const doRefresh=async()=>{
    if(!gmailUrl){showToast("Set your Apps Script URL in Sync tab");setTab("sync");return;}
    stopRef.current=false;
    setRefreshing(true);
    setRefreshLog(["🔄 Fetching events from Apps Script..."]);
    const log=m=>setRefreshLog(p=>[...p,m]);
    try{
      const url=gmailUrl+(gmailUrl.includes("?")?"&":"?")+"key="+encodeURIComponent(gmailKey||"");
      log("⚡ Direct fetch to Apps Script...");
      const t0=Date.now();

      // Async heartbeat in case Apps Script is slow
      let done=false;
      (async()=>{
        while(!done){
          await new Promise(res=>setTimeout(res,3000));
          if(done)break;
          log("   ⏱ "+Math.floor((Date.now()-t0)/1000)+"s...");
        }
      })();

      let r;
      try{
        r=await Promise.race([
          fetch(url,{method:"GET",headers:{"Accept":"application/json"}}),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error("Apps Script took >30s to respond")),30000))
        ]);
      }finally{done=true;}

      if(!r.ok){throw new Error("HTTP "+r.status+" from Apps Script");}
      const data=await r.json();

      if(data.error){
        if(data.error.includes("Unauthorized"))throw new Error("Wrong secret key — check Sync settings");
        if(data.error.includes("No cache"))throw new Error("Apps Script has no cache yet — open script.google.com and run runDailySync() once");
        throw new Error("Apps Script: "+data.error);
      }

      const events=data.events||[];
      log("📬 "+events.length+" events received (synced "+(data.refreshed?new Date(data.refreshed).toLocaleString():"?")+")");

      const todayFloor=floorDay(new Date());
      const filtered=events.filter(ev=>{
        if(!ev.id||!ev.E)return false;
        const endD=ev.X?new Date(ev.X+"T00:00:00"):new Date(ev.E+"T00:00:00");
        return endD>=todayFloor;
      });
      log("✅ "+filtered.length+" upcoming ("+(events.length-filtered.length)+" past removed)");

      const ts=new Date().toISOString();
      await ss("gp_events_v1",{events:filtered,refreshed:ts,count:filtered.length,sources:["Gmail (Good Plans NYC)"]});
      setEvents(filtered);
      setLastRefreshed(ts);
      log("💾 Saved");
    }catch(e){
      log("❌ "+e.message);
    }finally{
      setRefreshing(false);
    }
  };
  const pushToCalendar=async(allEvents,log)=>{
    const todayFloor=floorDay(new Date());
    const eightWeeks=new Date(todayFloor);eightWeeks.setDate(eightWeeks.getDate()+56);
    const fmtD2=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const scored=allEvents.filter(ev=>evActive(ev,todayFloor)&&new Date(ev.E+"T00:00:00")<=eightWeeks)
      .map(ev=>({...ev,sc:calcScore(ev,prof,beh,todayFloor,home)}));
    const weekMap={};
    scored.forEach(ev=>{
      const bucket=Math.max(0,Math.floor((new Date(ev.E+"T00:00:00")-todayFloor)/(7*86400000)));
      if(bucket>7)return;
      if(!weekMap[bucket])weekMap[bucket]=[];
      weekMap[bucket].push(ev);
    });
    const seen2=new Set();const picks=[];
    Object.keys(weekMap).sort((a,b)=>+a-+b).forEach(wk=>{
      weekMap[wk].sort((a,b)=>b.sc-a.sc).slice(0,10).forEach(ev=>{
        if(!seen2.has(ev.id)){seen2.add(ev.id);picks.push(ev);}
      });
    });
    if(!picks.length){log("  no picks to push");return;}
    log("  "+picks.length+" picks ("+Object.keys(weekMap).length+" weeks)");
    const picksData=picks.map(e=>({id:e.id,title:e.title,date:e.E,endDate:e.X||e.E,time:e.time||"",venue:e.venue||"",price:e.price||"Free",url:e.url||"",score:e.sc}));
    const prompt="Today: "+fmtD2(todayFloor)+". Task: 1) Use list_calendars to find the Good Plans calendar. 2) Use list_events to get existing events from "+fmtD2(todayFloor)+" to "+fmtD2(eightWeeks)+". 3) Extract [gpid:X] from descriptions to find already-pushed IDs. 4) Use create_event for each pick not already pushed. Put [gpid:ID] in the description. 5) Return JSON: {pushed:[],skipped:[]}. Picks: "+JSON.stringify(picksData);
    try{
      const raw=await withTimeout(
          callWithMCP("https://calendarmcp.googleapis.com/mcp/v1",prompt,"You are a Google Calendar assistant. Complete the task and return only JSON."),
          60000,"Calendar MCP"
        );
      const clean=raw.replace(/[`]{3}[a-z]*|[`]{3}/g,"").trim();
      const s=clean.indexOf("{"),e2=clean.lastIndexOf("}");
      if(s!==-1&&e2!==-1){const res=JSON.parse(clean.substring(s,e2+1));log("  pushed: "+(res.pushed?.length||0)+", skipped: "+(res.skipped?.length||0));}
      else log("  calendar push done");
    }catch(e){log("  push error: "+e.message);}
  };

  const NOW=new Date(),TODAY=floorDay(NOW),TOMORROW=floorDay(NOW);
  TOMORROW.setDate(TOMORROW.getDate()+1);
  const DOW=TODAY.getDay(),dtf=DOW===5?0:DOW===6?-1:DOW===0?-2:(5-DOW);
  const FRI=floorDay(NOW);FRI.setDate(FRI.getDate()+dtf);
  const SUN=new Date(FRI);SUN.setDate(FRI.getDate()+2);
  const EOM=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0);
  const home=loc||[40.7186,-73.9865];
  const active=events.filter(ev=>evActive(ev,TODAY));

  const sc=arr=>[...arr].map(ev=>({
    ...ev,
    sc:calcScore(ev,prof,beh,floorDay(NOW),home),
    bs:bookSoon(ev,floorDay(NOW)),
    bd:calcBd(ev,prof,beh,floorDay(NOW),home),
    km:kmdist(safeCoord(ev),home).toFixed(1),
  })).sort((a,b)=>b.sc-a.sc);

  const has=fc.length>0||fh.length>0||fp.length>0||fd.length>0||fv.length>0||fms>0||fmk<50||(fq&&fq.length>0);
  const mf=ev=>{
    if(!evActive(ev,TODAY))return false;
    if(fq&&fq.trim()){
      const q=fq.trim().toLowerCase();
      const hay=((ev.title||"")+" "+(ev.venue||"")+" "+(ev.desc||"")+" "+(ev.hood||"")+" "+(ev.sub||"")+" "+(ev.cat||"")).toLowerCase();
      if(!hay.includes(q))return false;
    }
    const d=kmdist(safeCoord(ev),home);
    if(fmk<50&&d>fmk)return false;
    if(fms>0&&calcScore(ev,prof,beh,floorDay(NOW),home)<fms)return false;
    if(fv.length>0&&!fv.some(k=>matchV(ev,k)))return false;
    if(fc.length>0&&!fc.includes(ev.cat))return false;
    if(fh.length>0&&!fh.includes(ev.hood))return false;
    if(fp.length>0){
      const free=(ev.price||"").toLowerCase().includes("free");
      const n=parseFloat((ev.price||"").replace(/[^0-9.]/g,"")||"999");
      if(!fp.some(f=>f==="Free"?free:f==="Under $10"?free||n<10:free||n<25))return false;
    }
    if(fd.length>0){
      if(!fd.some(f=>f==="Today"?evCovers(ev,TODAY):f==="Tomorrow"?evCovers(ev,TOMORROW):evStart(ev)<=SUN&&evEnd(ev)>=FRI))return false;
    }
    return true;
  };
  const clr=()=>{setFc([]);setFh([]);setFp([]);setFd([]);setFv([]);setFms(0);setFmk(50);setFq("");};

  // Home filtering: if user has set any filter, apply it to ALL home carousels.
  // Also demote long-running events from "Nearby Now" / "Tonight" — a 3-month
  // exhibition technically "covers today" but isn't a fresh thing to do tonight.
  const isFreshToday=(ev)=>{
    const rl=runLen(ev);
    const startsToday=evStart(ev).getTime()===TODAY.getTime();
    return startsToday||rl<=7;
  };
  const hf=ev=>has?mf(ev):true; // apply user filters to home if any are set
  const nn=sc(active.filter(ev=>hf(ev)&&evCovers(ev,TODAY)&&isFreshToday(ev)&&!isImprecise(ev)&&kmdist(safeCoord(ev),home)<5));
  const nt=sc(active.filter(ev=>hf(ev)&&evCovers(ev,TODAY)&&isFreshToday(ev)&&!isImprecise(ev)&&eHour(ev.time)>=17&&kmdist(safeCoord(ev),home)<8));
  const wd=sc(active.filter(ev=>hf(ev)&&matchV(ev,"weird"))).slice(0,10);
  const tw=sc(active.filter(ev=>hf(ev)&&evStart(ev)<=SUN&&evEnd(ev)>=FRI));
  const bm=sc(active.filter(ev=>hf(ev)&&evStart(ev)<=EOM)).slice(0,24);
  const bk=sc(active.filter(ev=>hf(ev)&&bookSoon(ev,floorDay(NOW))));
  const sdo=sc(active.filter(ev=>hf(ev)&&ev.cat==="Sports"&&(ev.tags||[]).includes("do")));
  const swa=sc(active.filter(ev=>hf(ev)&&ev.cat==="Sports"&&(ev.tags||[]).includes("watch")));
  const filt=sc(active.filter(mf));
  // Reusable sort builder — accepts primary + optional secondary key
  const sortEvts=(arr,primary,secondary)=>{
    const keyFn={
      date:(a,b)=>{
        const aT=evCovers(a,TODAY)?0:1,bT=evCovers(b,TODAY)?0:1;
        if(aT!==bT)return aT-bT;
        return new Date(a.E)-new Date(b.E);
      },
      score:(a,b)=>(b.sc||0)-(a.sc||0),
      distance:(a,b)=>parseFloat(a.km||"99")-parseFloat(b.km||"99"),
      price:(a,b)=>{
        const px=ev=>{
          const p=(ev.price||"").toLowerCase();
          if(p.includes("free")||p.includes("pwyw")||p.includes("pay what"))return 0;
          const n=parseFloat(p.replace(/[^0-9.]/g,""));
          return isNaN(n)?9999:n;
        };
        return px(a)-px(b);
      },
    };
    const fnP=keyFn[primary]||keyFn.date;
    const fnS=secondary&&secondary!==primary?keyFn[secondary]:null;
    return [...arr].sort((a,b)=>{
      const r=fnP(a,b);
      if(r!==0||!fnS)return r;
      return fnS(a,b);
    });
  };
  const filtSorted=sortEvts(filt,sortBy,sortBy2);
  const sortedCats=Object.entries(prof.categories).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  const sortedVibes=[...VIBES].sort((a,b)=>(prof.vibes?.[b.key]||50)-(prof.vibes?.[a.key]||50));
  // Map tab: only events happening TODAY with valid coordinates
  const mapEvts=sc(active.filter(ev=>evCovers(ev,TODAY)));
  const favList=Object.values(favs);
  const fp2={favs,onFav:toggleFav,onOpen:openModal,onCal:addCal,onShare:share,onScore:setSp,today:TODAY,tomorrow:TOMORROW,imgs,sortFn:sortEvts};
  const carP=(k)=>({sortKey:carSort[k]||"score",setSortKey:v=>setCar(k,v)});
  const fbProps={fc,setFc,fh,setFh,fp,setFp,fd,setFd,fv,setFv,fms,setFms,fmk,setFmk,fq,setFq,has,onClear:clr,dd,setDd};

  if(!ready){
    return (
      <div style={{minHeight:"100vh",background:CREAM,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Sora',sans-serif"}}>
        <style>{FONT}</style>
        <Smiley size={48}/>
        <div style={{fontSize:14,color:GRAY}}>Loading Good Plans...</div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:CREAM,color:INK,fontFamily:"'Sora',sans-serif",maxWidth:480,margin:"0 auto"}} onClick={()=>setDd(null)}>
      <style>{FONT}</style>
      <header style={{background:WHITE,borderBottom:"1.5px solid "+GRAY_LT,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <img src={LOGO} alt="Good Plans" style={{height:30,width:"auto",display:"block"}}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:(locSt==="ok"||locSt==="cached")?TEAL:GRAY}}>{locSt==="locating"?"📍...":(locSt==="ok"||locSt==="cached")?"📍 GPS":"📍 LES"}</span>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:GRAY}}>{events.length}</span>
            <button onClick={()=>setVm(v=>v==="cards"?"list":"cards")} style={{background:"none",border:"1.5px solid "+GRAY_LT,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,color:GRAY}}>{vm==="cards"?"list":"grid"}</button>
          </div>
        </div>
      </header>
      <nav style={{display:"flex",background:WHITE,borderBottom:"1.5px solid "+GRAY_LT,position:"sticky",top:46,zIndex:40,overflowX:"auto",scrollbarWidth:"none"}}>
        {[["home","Home"],["browse","Browse"],["map","Map"],["saved",favList.length?"★ "+favList.length:"Saved"],["sync","Sync"],["profile","Profile"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flexShrink:0,padding:"9px 11px",background:"none",border:"none",color:tab===t?TEAL:GRAY,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",borderBottom:"2.5px solid "+(tab===t?TEAL:"transparent"),whiteSpace:"nowrap"}}>{l}</button>
        ))}
      </nav>
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:TEAL,color:WHITE,padding:"10px 20px",borderRadius:20,fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,zIndex:400,whiteSpace:"nowrap",pointerEvents:"none"}}>{toast}</div>}
      {sp&&<ScorePop data={sp} onClose={()=>setSp(null)}/>}
      <main style={{paddingBottom:60}}>
        {tab==="home"&&(
          <div>
            <FilterBar {...fbProps}/>
            <div style={{padding:"6px 16px 0",fontFamily:"'DM Sans',sans-serif",fontSize:10,color:GRAY}}>{(lastRefreshed?"🔄 "+lastRefreshed:"Sun 25 May 2026")+" · "+events.length+" events"+(lastRefreshed?"":" · 9 sources · hardcoded")}</div>
            {nn.length>0&&<Carousel title="📍 Nearby Now" sub={locSt==="ok"?"Active near your location":"Active near LES"} evts={nn} {...fp2} {...carP("nn")}/>}
            {nt.length>0&&<Carousel title="🌙 Tonight" sub="Starting after 5pm near you" evts={nt} {...fp2} {...carP("nt")}/>}
            {wd.length>0&&<Carousel title="🤡 Something Weird" sub="Unexpected, one-of-a-kind" evts={wd} accent={CORAL} {...fp2} {...carP("wd")}/>}
            {tw.length>0&&<Carousel title="⭐ This Weekend" sub="Top picks Fri-Sun" evts={tw} {...fp2} {...carP("tw")}/>}
            {sdo.length>0&&<Carousel title="🏃 Get Moving" sub="Physical activities to do" evts={sdo} {...fp2} {...carP("sdo")}/>}
            {swa.length>0&&<Carousel title="👟 Watch the Game" sub="Live sport to spectate" evts={swa} {...fp2} {...carP("swa")}/>}
            {bm.length>0&&<Carousel title="📅 Best This Month" sub="Top picks for the coming weeks" evts={bm} {...fp2} {...carP("bm")}/>}
            {bk.length>0&&<Carousel title="🔖 Book Soon" sub="These will sell out" evts={bk} accent={CORAL} {...fp2} {...carP("bk")}/>}
          </div>
        )}
        {tab==="browse"&&(
          <div>
            <FilterBar {...fbProps} cnt={filtSorted.length}/>
            <div style={{padding:"6px 12px",background:WHITE,borderBottom:"1px solid "+GRAY_LT}}>
              <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:GRAY,letterSpacing:"0.5px",textTransform:"uppercase",flexShrink:0}}>Sort by</span>
                {[["date","Date"],["score","For you"],["distance","Distance"],["price","Price"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)} style={{padding:"3px 9px",borderRadius:14,background:sortBy===k?TEAL:"none",border:"1.5px solid "+(sortBy===k?TEAL:GRAY_LT),color:sortBy===k?WHITE:GRAY,fontSize:10,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",scrollbarWidth:"none",marginTop:4}}>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:GRAY,letterSpacing:"0.5px",textTransform:"uppercase",flexShrink:0}}>Then by</span>
                {[["none","—"],["date","Date"],["score","For you"],["distance","Distance"],["price","Price"]].filter(([k])=>k==="none"||k!==sortBy).map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy2(k==="none"?null:k)} style={{padding:"3px 9px",borderRadius:14,background:(sortBy2===k||(k==="none"&&!sortBy2))?TEAL+"66":"none",border:"1.5px solid "+((sortBy2===k||(k==="none"&&!sortBy2))?TEAL:GRAY_LT),color:(sortBy2===k||(k==="none"&&!sortBy2))?TEAL:GRAY,fontSize:10,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>
                ))}
              </div>
            </div>
            {filtSorted.length===0
              ?<div style={{padding:"60px 20px",textAlign:"center",fontFamily:"'DM Sans',sans-serif",color:GRAY}}>No events match.</div>
              :vm==="list"
                ?<div>{filtSorted.map(ev=><Row key={ev.id} ev={ev} isFav={!!favs[ev.id]} onFav={toggleFav} onOpen={openModal} onCal={addCal} onShare={share} onScore={setSp} today={TODAY} tomorrow={TOMORROW}/>)}</div>
                :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:10}}>{filtSorted.map(ev=><Card key={ev.id} ev={ev} isFav={!!favs[ev.id]} onFav={toggleFav} onOpen={openModal} onCal={addCal} onShare={share} onScore={setSp} today={TODAY} tomorrow={TOMORROW} img={imgs[ev.cat]}/>)}</div>
            }
          </div>
        )}
        {tab==="sync"&&(
          <div style={{padding:16}}>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,color:INK,marginBottom:4}}>Sync Events</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:GRAY,marginBottom:16,lineHeight:1.5}}>
              Apps Script extracts events daily at 7am (Google's servers, automatic). The app fetches the cached JSON directly — no rate limits, no claude.ai involvement.
            </div>

            <div style={{background:WHITE,borderRadius:12,padding:"14px 14px",marginBottom:14,border:"1.5px solid "+GRAY_LT}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>Gmail Source</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:600,color:INK,marginBottom:5}}>Apps Script URL</div>
              <input value={gmailUrl} onChange={e=>setGmailUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" style={{width:"100%",padding:"9px 11px",border:"1.5px solid "+GRAY_LT,borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:11,marginBottom:10,boxSizing:"border-box"}}/>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:600,color:INK,marginBottom:5}}>Apps Script secret key</div>
              <input value={gmailKey} onChange={e=>setGmailKey(e.target.value)} placeholder="your secret string" style={{width:"100%",padding:"9px 11px",border:"1.5px solid "+GRAY_LT,borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:11,marginBottom:10,boxSizing:"border-box"}}/>
              <button onClick={async()=>{await ss("gp_gmail_v1",{url:gmailUrl,key:gmailKey});showToast("Saved");}} style={{padding:"8px 14px",background:TEAL,color:WHITE,border:"none",borderRadius:8,fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
            </div>

            <div style={{background:lastRefreshed?TEAL+"12":GRAY+"12",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:18}}>🔄</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:INK}}>{lastRefreshed?"Last synced":"Not yet synced"}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,overflow:"hidden",textOverflow:"ellipsis"}}>{lastRefreshed?new Date(lastRefreshed).toLocaleString():"Using built-in events ("+EV.length+")"}</div>
              </div>
            </div>
            <div style={{background:TEAL+"12",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:18}}>📦</span>
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:INK}}>{events.length+" events loaded"}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY}}>Past events auto-removed on each sync</div>
              </div>
            </div>

            {refreshing
              ?<button onClick={()=>{stopRef.current=true;showToast("Stopping...");}} style={{display:"block",width:"100%",padding:"14px",background:CORAL,color:WHITE,border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:8}}>
                ⏹️ Stop refresh
              </button>
              :<button onClick={doRefresh} disabled={!gmailUrl} style={{display:"block",width:"100%",padding:"14px",background:gmailUrl?TEAL:GRAY,color:WHITE,border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:gmailUrl?"pointer":"not-allowed",fontFamily:"'Sora',sans-serif",marginBottom:8}}>
                🔄 Sync now
              </button>
            }
            <button onClick={async()=>{
              await ss("gp_events_v1",null);
              setSourceMeta({});
              setEvents(EV);
              setLastRefreshed(null);
              autoSyncRef.current=false;
              showToast("Cache cleared");
            }} disabled={refreshing} style={{display:"block",width:"100%",padding:"11px",background:"none",color:CORAL,border:"1.5px solid "+CORAL,borderRadius:12,fontWeight:600,fontSize:12,cursor:refreshing?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",marginBottom:16}}>
              🗑️ Clear cache &amp; reset
            </button>
            {refreshLog.length>0&&(
              <div style={{background:WHITE,borderRadius:12,padding:"12px 14px",border:"1.5px solid "+GRAY_LT}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Refresh log</div>
                {refreshLog.map((l,i)=>(
                  <div key={i} style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:INK,marginBottom:4,lineHeight:1.4}}>{l}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==="map"&&(
          <MapTab evts={mapEvts} userLoc={home} CATS={CATS} onOpen={openModal}/>
        )}
        {tab==="saved"&&(
          <div>
            {favList.length===0
              ?<div style={{padding:"60px 20px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:12}}>{"☆"}</div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:INK}}>Nothing saved yet</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY,marginTop:6}}>Tap the star on any event</div>
              </div>
              :<div>
                {favList.map(ev=>{
                  const e={...ev,sc:calcScore(ev,prof,beh,floorDay(NOW),home),bs:bookSoon(ev,floorDay(NOW)),bd:calcBd(ev,prof,beh,floorDay(NOW),home),km:kmdist(safeCoord(ev),home).toFixed(1)};
                  return <Row key={e.id} ev={e} isFav={true} onFav={toggleFav} onOpen={openModal} onCal={addCal} onShare={share} onScore={setSp} today={TODAY} tomorrow={TOMORROW}/>;
                })}
              </div>
            }
          </div>
        )}
        {tab==="profile"&&(
          <div style={{paddingBottom:60}}>
            <div style={{display:"flex",borderBottom:"1.5px solid "+GRAY_LT}}>
              {[["prefs","Preferences"],["activity","Activity"]].map(([t,l])=>(
                <button key={t} onClick={()=>setProfTab(t)} style={{flex:1,padding:"12px 8px",background:"none",border:"none",color:profTab===t?TEAL:GRAY,borderBottom:"2.5px solid "+(profTab===t?TEAL:"transparent"),cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{l}</button>
              ))}
            </div>
            {profTab==="prefs"&&(
              <div style={{padding:16}}>
                <div style={{background:(locSt==="ok"||locSt==="cached")?TEAL+"18":GRAY+"18",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:18}}>{"📍"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:INK}}>{locSt==="ok"?"GPS active":locSt==="cached"?"Using saved location":locSt==="locating"?"Locating…":locSt==="denied"?"Permission denied":locSt==="timeout"?"GPS timed out":"Using LES default"}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc?(loc[0].toFixed(4)+", "+loc[1].toFixed(4)):"Tap retry to grant location"}</div>
                  </div>
                  <button onClick={retryGPS} disabled={locSt==="locating"} style={{padding:"6px 10px",background:TEAL,color:WHITE,border:"none",borderRadius:8,fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,cursor:locSt==="locating"?"not-allowed":"pointer",opacity:locSt==="locating"?0.6:1,flexShrink:0}}>↻ Retry</button>
                </div>
                <div style={{background:notifEnabled?TEAL+"18":GRAY+"18",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:18}}>🔔</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:INK}}>{notifEnabled?"Notifications enabled":"Notifications off"}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY,lineHeight:1.4}}>{notifEnabled?"Alerts for top picks starting in next 4 hours":"Get notified about top picks near you"}</div>
                  </div>
                  <button onClick={notifEnabled?disableNotif:requestNotifPermission} style={{padding:"6px 10px",background:notifEnabled?CORAL:TEAL,color:WHITE,border:"none",borderRadius:8,fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>{notifEnabled?"Off":"On"}</button>
                </div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}}>Categories</div>
                {Object.entries(prof.categories).map(([cat,val])=>{
                  const cfg=CATS[cat]||CATS.Other;
                  const subs=cfg.sub||[];
                  const expanded=!!expandedCats[cat];
                  return (
                    <div key={cat} style={{marginBottom:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:INK}}>{cfg.emoji+" "+cat}</span>
                          {subs.length>0&&(
                            <button onClick={()=>toggleCatExpand(cat)} style={{background:"none",border:"1px solid "+GRAY_LT,borderRadius:6,padding:"1px 6px",cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:9,color:expanded?cfg.color:GRAY,fontWeight:600}}>
                              {expanded?"▲ less":"▼ subs"}
                            </button>
                          )}
                        </div>
                        <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:cfg.color||GRAY}}>{val+"%"}</span>
                      </div>
                      <Slider value={val} onChange={v=>updProf({...prof,categories:{...prof.categories,[cat]:v}})} color={cfg.color||TEAL}/>
                      {expanded&&subs.length>0&&(
                        <div style={{marginTop:8,paddingLeft:12,borderLeft:"2px solid "+cfg.color+"44"}}>
                          {subs.map(sub=>{
                            const sk=cat+"::"+sub;
                            const sv=prof.subcategories?.[sk]??DEFAULT_SUBS[sk]??50;
                            return (
                              <div key={sub} style={{marginBottom:9}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                  <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:GRAY}}>{sub}</span>
                                  <span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,color:cfg.color||TEAL}}>{sv+"%"}</span>
                                </div>
                                <Slider value={sv} onChange={v=>updProf({...prof,subcategories:{...(prof.subcategories||{}),[sk]:v}})} color={cfg.color||TEAL}/>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginTop:16,marginBottom:10}}>Vibes</div>
                {VIBES.map(v=>{
                  const val=prof.vibes?.[v.key]??50;
                  return (
                    <div key={v.key} style={{marginBottom:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:INK}}>{v.emoji+" "+v.label}</span>
                        <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:TEAL}}>{val+"%"}</span>
                      </div>
                      <Slider value={val} onChange={nv=>updProf({...prof,vibes:{...(prof.vibes||{}),[v.key]:nv}})}/>
                    </div>
                  );
                })}
              </div>
            )}
            {profTab==="activity"&&(
              <div style={{padding:16}}>
                {[["Browsed",beh.viewedCats,"views"],["Saved",beh.savedCats,"saves"],["Calendar",beh.calCats,"adds"]].map(([title,data,unit])=>(
                  <div key={title} style={{marginBottom:20}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:GRAY,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>{title}</div>
                    {!Object.keys(data||{}).length
                      ?<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:GRAY}}>No activity yet.</div>
                      :Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([cat,cnt])=>(
                        <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+GRAY_LT}}>
                          <span style={{fontFamily:"'Sora',sans-serif",fontSize:13,color:INK}}>{(CATS[cat]?.emoji||"✨")+" "+cat}</span>
                          <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:CATS[cat]?.color||GRAY}}>{cnt+" "+unit}</span>
                        </div>
                      ))
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      {modal&&<Modal ev={modal} isFav={!!favs[modal.id]} onClose={()=>setModal(null)} onFav={toggleFav} onCal={addCal} onShare={share} today={TODAY} tomorrow={TOMORROW}/>}
    </div>
  );
}
