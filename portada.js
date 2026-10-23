/* Portada pública de la Copa Logística Valencia.
   Lee en tiempo real los datos públicos de Firestore (publico/torneo y jugadas). No necesita cuenta. */
"use strict";
const DATA={torneo:null,jugadas:[],loaded:false,error:false};
const TITLE="Copa Logística Valencia";

const ui={round:null};

/* ---------- utilidades ---------- */
function h(tag,attrs,...kids){const el=document.createElement(tag);
  if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;
    if(k==="class")el.className=v;else if(k==="text")el.textContent=v;else if(k.startsWith("on"))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v===true?"":v);}
  for(const c of kids.flat()){if(c==null||c===false)continue;el.append(c instanceof Node?c:document.createTextNode(String(c)));}return el;}
function svg(markup,cls){const t=document.createElement("template");t.innerHTML=markup.trim();const s=t.content.firstElementChild;if(cls)s.setAttribute("class",cls);return s;}
const ic=p=>svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`);
const I={cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  field:'<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.6"/>',team:'<path d="M12 3 20 5.5V12c0 4.6-3.4 7.8-8 9-4.6-1.2-8-4.4-8-9V5.5z"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',form:'<path d="M8 4h8l3 3v13H5V4z"/><path d="M9 11h6M9 15h6"/>',trophy:'<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8l-1-4H9z"/>',
  shake:'<path d="M3 12l4-4 4 2 3-3 7 7-4 4-3-2-2 2-3-3-2 2z"/>',route:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',play:'<path d="M8 5v14l11-7z"/>'};
function hue(s){let x=7;for(const c of String(s))x=(x*31+c.charCodeAt(0))>>>0;return x%360;}
function initials(s){const w=String(s||"?").replace(/[^\p{L}\p{N} ]/gu," ").split(/\s+/).filter(Boolean);return((w[0]||"?")[0]+(w[1]?w[1][0]:((w[0]||"")[1]||""))).toUpperCase();}
function crest(name,size){if(!name)return h("span",{class:"crest ghost "+(size||""),"aria-hidden":"true"});const hh=hue(name);
  return h("span",{class:"crest "+(size||""),style:`background:linear-gradient(160deg,hsl(${hh} 45% 42%),hsl(${(hh+24)%360} 50% 26%))`,"aria-hidden":"true",text:initials(name)});}
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
function fmtFecha(f,o){if(!f)return null;const d=new Date(f+"T12:00:00");if(isNaN(d))return f;return d.toLocaleDateString("es-ES",o||{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function diasHasta(f){if(!f)return null;const d=new Date(f+"T00:00:00"),n=new Date();n.setHours(0,0,0,0);return isNaN(d)?null:Math.round((d-n)/864e5);}
const fmtDT=ms=>new Date(ms).toLocaleString("es-ES",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});
let toastT;function toast(msg,bad){const t=document.getElementById("toast");t.textContent=msg;t.className="toast"+(bad?" bad":"");t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200);}
const COLORES={"Blanco":"#FFFFFF","Negro":"#111827","Gris":"#9CA3AF","Rojo":"#D62828","Granate":"#7F1D1D","Naranja":"#F97316","Amarillo":"#FACC15","Verde":"#16A34A","Azul celeste":"#60A5FA","Azul marino":"#1E3A8A","Morado":"#7C3AED","Rosa":"#EC4899"};
const FEM={"Blanco":"blanca","Negro":"negra","Rojo":"roja","Amarillo":"amarilla","Morado":"morada"};const camiseta=n=>"Camiseta "+(FEM[n]||String(n).toLowerCase());
const STATUS={esperando:["Por decidir","muted"],pase:["Pase directo","teal"],pendiente:["Pendiente","muted"],en_juego:["En juego","teal live"],finalizado:["Finalizado","ok"]};
const statusPill=s=>{const x=STATUS[s]||STATUS.pendiente;return h("span",{class:"pill "+x[1],text:x[0]});};
function safeUrl(u){try{const x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"?x.href:null;}catch(e){return null;}}
function safeMail(m){return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(m||""))?String(m):null;}

/* ---------- estado derivado ---------- */
function derive(P){const plazas=(P&&P.plazas)||8;const equipos=(P&&P.equipos)||[];const n=equipos.length;
  const cierre=P&&typeof P.cierre==="number"?P.cierre:null;const now=Date.now();
  const insc=n>=plazas?{k:"completo",t:"Completas",s:"Las 8 plazas están ocupadas",cls:"gold"}:cierre==null?{k:"sinfecha",t:"Por abrir",s:"Fecha de cierre por confirmar",cls:"teal"}:now>cierre?{k:"cerrado",t:"Cerradas",s:"Plazo cerrado el "+fmtDT(cierre),cls:"warn"}:{k:"abierto",t:"Abiertas",s:"Hasta el "+fmtDT(cierre),cls:"ok"};
  const partidos=(P&&P.partidos)||[];
  const live=partidos.filter(p=>p.estado==="en_juego"),next=partidos.filter(p=>p.estado==="pendiente"&&p.a&&p.b),done=partidos.filter(p=>p.estado==="finalizado");
  const est={preparacion:["En preparación","muted"],en_curso:["En curso","teal"],finalizado:["Finalizado","gold"]}[(P&&P.estado)||"preparacion"]||["En preparación","muted"];
  const champ=((P&&P.posiciones)||[]).find(x=>x.puesto==="1.º");
  const form=P&&safeUrl(P.formUrl);
  return{plazas,equipos,n,libres:Math.max(0,plazas-n),cierre,insc,partidos,live,next,done,est,champ,form,canJoin:insc.k==="abierto"&&!!form};}

/* ---------- ilustración de cabecera (provisional: se sustituye por la foto subida) ---------- */
function heroArt(){
  const cont=[];const cols=["#2E5E8C","#8C3A35","#B8913F","#2F7A78","#46566E","#6B3F6E"];let seed=3;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  for(let s=0;s<22;s++){const x=520+s*42;const levels=2+Math.floor(rnd()*3);for(let l=0;l<levels;l++){const c=cols[Math.floor(rnd()*cols.length)];const y=520-(l+1)*24;
    cont.push(`<rect x="${x}" y="${y}" width="40" height="22" fill="${c}" opacity=".9"/><path d="M${x+5} ${y+3}v16M${x+12} ${y+3}v16M${x+19} ${y+3}v16M${x+26} ${y+3}v16M${x+33} ${y+3}v16" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`);}}
  const crane=(x,s,boom)=>`<g transform="translate(${x} 0) scale(${s})" fill="none" stroke="#0A1A31" stroke-width="7" stroke-linejoin="round">
    <path d="M0 520V250M70 520V250M0 250h70M0 330h70M0 250l70 80M70 250L0 330M0 410h70M0 410l70 110M70 410L0 520"/>
    <path d="M-60 250H${boom}M-40 250l75-90 75 90" /><path d="M35 160v-30"/><path d="M-60 250l20 20h${boom+40}" stroke-width="5"/>
    <rect x="${boom*0.55}" y="255" width="34" height="22" fill="#0A1A31"/><path d="M${boom*0.55+17} 277v60" stroke-width="2.5"/><rect x="${boom*0.55}" y="337" width="34" height="8" fill="#0A1A31"/></g>`;
  return svg(`<svg class="art" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081428"/><stop offset=".45" stop-color="#14305A"/><stop offset=".78" stop-color="#3D5A80"/><stop offset="1" stop-color="#C9A45C"/></linearGradient>
    <radialGradient id="sun" cx="0.72" cy="0.8" r="0.35"><stop offset="0" stop-color="#F3D58E" stop-opacity=".85"/><stop offset=".35" stop-color="#E0B866" stop-opacity=".35"/><stop offset="1" stop-color="#E0B866" stop-opacity="0"/></radialGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20406A"/><stop offset="1" stop-color="#081428"/></linearGradient>
  </defs>
  <rect width="1440" height="640" fill="url(#sky)"/><rect width="1440" height="640" fill="url(#sun)"/>
  <g fill="#0D2242" opacity=".55"><path d="M0 520h1440v-30l-90-10-60 12-110-18-140 14-120-16-170 20-130-12-160 16-120-10-150 14-110-8L0 498z"/></g>
  ${crane(560,1,250)}${crane(820,.86,230)}${crane(1080,1.08,260)}${crane(1300,.8,210)}
  ${cont.join("")}
  <rect y="520" width="1440" height="120" fill="url(#sea)"/>
  <g stroke="#E2C27A" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"><path d="M980 548h120M1040 566h90M900 584h70M1150 560h60M1010 602h110"/></g>
  <g stroke="#fff" stroke-opacity=".08" stroke-width="2" fill="none"><path d="M60 640V560h460v80M290 560v80"/><circle cx="290" cy="640" r="46"/></g>
</svg>`);}
function trophySvg(){return svg(`<svg viewBox="0 0 260 340" aria-hidden="true">
  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C6A28"/><stop offset=".35" stop-color="#F1D594"/><stop offset=".55" stop-color="#D4AE5C"/><stop offset="1" stop-color="#7A5A1F"/></linearGradient>
  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9CB82"/><stop offset="1" stop-color="#8C6A28"/></linearGradient></defs>
  <path d="M60 30h140v70c0 48-31 86-70 86s-70-38-70-86z" fill="url(#g1)"/>
  <path d="M60 50H28c0 46 20 72 46 80M200 50h32c0 46-20 72-46 80" fill="none" stroke="url(#g2)" stroke-width="12" stroke-linecap="round"/>
  <path d="M80 42c0 50 12 98 50 128" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
  <path d="M130 70l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z" fill="#fff" fill-opacity=".75"/>
  <path d="M116 184h28v40h-28z" fill="url(#g1)"/><path d="M92 224h76l10 30H82z" fill="url(#g1)"/>
  <rect x="64" y="254" width="132" height="52" rx="6" fill="#0E1D36" stroke="url(#g2)" stroke-width="4"/>
  <rect x="88" y="270" width="84" height="20" rx="3" fill="url(#g1)" opacity=".9"/>
</svg>`);}
function emblem(){return svg(`<svg viewBox="0 0 38 42" aria-hidden="true"><defs><linearGradient id="em" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2C27A"/><stop offset="1" stop-color="#9C7A35"/></linearGradient></defs>
  <path d="M19 1 37 6v15c0 10-8 17-18 20C9 38 1 31 1 21V6z" fill="url(#em)"/><path d="M19 4.5 34 8.7v12.1c0 8.1-6.4 13.9-15 16.6-8.6-2.7-15-8.5-15-16.6V8.7z" fill="#0B1F3A"/>
  <circle cx="19" cy="19" r="7.5" fill="none" stroke="#E2C27A" stroke-width="2"/><path d="M19 14.8l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="#E2C27A"/><path d="M9 31h20" stroke="#E2C27A" stroke-width="2" stroke-linecap="round"/></svg>`);}

/* ---------- secciones ---------- */
function vNav(D){return h("header",{class:"nav"},h("div",{class:"wrap"},h("a",{class:"emblem",href:"#inicio","aria-label":TITLE},emblem(),h("span",null,h("b",{text:TITLE}),h("small",{text:"Fútbol 7 · Empresas"}))),
  h("nav",{class:"links","aria-label":"Secciones"},[["#partidos","Partidos"],["#cuadro","Cuadro"],["#calendario","Calendario"],["#clasificacion","Clasificación"],["#equipos","Equipos"],DATA.jugadas.length?["#jugadas","Jugadas"]:null,["#empresas","Para empresas"]].filter(Boolean).map(([u,t])=>h("a",{href:u,text:t}))),
  D.canJoin?h("a",{class:"btn gold sm cta-mini",href:D.form,target:"_blank",rel:"noopener noreferrer"},"Inscribirse"):h("a",{class:"btn outline-light sm cta-mini",href:"#calendario"},"Calendario"),
  h("button",{type:"button",class:"btn outline-light sm acceso","aria-label":window.COPA_SESSION&&window.COPA_SESSION.admin?"Abrir el panel de gestión":"Acceso organización",onclick:()=>window.copaAcceso&&window.copaAcceso()},ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),h("span",{text:window.COPA_SESSION&&window.COPA_SESSION.admin?"Panel":"Acceso"}))));}

function vHero(P,D){const portada="img/portada.jpg";
  const fecha=P&&P.fecha?cap(fmtFecha(P.fecha)):null;
  const photo=portada?h("img",{class:"photo",src:portada,alt:"",fetchpriority:"high",onerror:ev=>{const s=ev.target.closest(".hero");if(s)s.classList.remove("has-photo");ev.target.replaceWith(heroArt());}}):null;
  const fact=(i,t,tbd)=>h("li",null,ic(i),h("span",{class:tbd?"tbd":null,text:t}));
  return h("section",{class:"hero"+(photo?" has-photo":""),id:"inicio","aria-label":"Portada"},photo||heroArt(),
    h("div",{class:"wrap"},
      h("div",null,h("span",{class:"eyebrow",text:"Torneo de fútbol 7 · Sector logístico"}),
        h("h1",null,"Copa Logística",h("span",{text:"Valencia"})),
        h("p",{class:"claim",text:"La logística también se juega en equipo."}),
        h("ul",{class:"facts"},fact(I.cal,fecha||"Fecha por confirmar",!fecha),fact(I.pin,(P&&P.sede)||"Sede por confirmar",!(P&&P.sede)),fact(I.field,`${(P&&P.campos)||2} campos`),fact(I.team,`${D.n} de ${D.plazas} equipos`)),
        h("div",{class:"actions"},D.canJoin?h("a",{class:"btn gold",href:D.form,target:"_blank",rel:"noopener noreferrer"},ic(I.form),"Inscribir a mi empresa"):null,
          h("a",{class:D.canJoin?"btn light":"btn gold",href:"#calendario"},ic(I.cal),"Ver calendario"),h("a",{class:"btn outline-light",href:"#equipos"},"Ver equipos",ic(I.arrow)))),
      h("div",{class:"trophy"},trophySvg())));}

function vStats(P,D){const nx=D.live[0]||D.next[0];const dias=diasHasta(P&&P.fecha);
  const st=(k,v,s,cls,extra)=>h("div",{class:"stat"},h("span",{class:"k",text:k}),h("span",{class:"v "+(cls||""),text:v}),extra||null,s?h("span",{class:"s",text:s}):null);
  return h("section",{class:"stats wrap","aria-label":"Datos del torneo"},h("div",{class:"grid"},
    st("Equipos",`${D.n}/${D.plazas}`,null,null,h("div",{class:"meter"},h("i",{class:D.n>=D.plazas?"full":null,style:`width:${Math.round(100*D.n/D.plazas)}%`}))),
    st("Plazas libres",String(D.libres),D.libres?(D.insc.k==="abierto"?"Puedes inscribirte":"Por confirmar"):"Cuadro completo",D.libres?null:"gold"),
    st("Inscripciones",D.insc.t,D.insc.s,D.insc.cls),
    st("Próximo partido",nx?`${nx.a} – ${nx.b}`:"Por definir",nx?`${nx.hora} · Campo ${nx.campo}`:"Tras el sorteo","sm"),
    st("Fecha",P&&P.fecha?cap(fmtFecha(P.fecha,{day:"numeric",month:"short"})):"Por confirmar",dias!=null?(dias>1?`Faltan ${dias} días`:dias===1?"Mañana":dias===0?"Hoy":"Celebrado"):null,P&&P.fecha?null:"sm"),
    st("Competición",D.champ?"Finalizada":D.est[0],D.champ?`Campeón: ${D.champ.equipo}`:null,D.champ?"gold":D.est[1]==="teal"?"teal":null)));}

function mcard(p){const sc=p.estado==="finalizado";const wa=p.ganador==="a",wb=p.ganador==="b";
  return h("article",{class:"card mcard"+(p.estado==="en_juego"?" live":"")+(p.id==="F"?" final":""),"aria-label":p.nombre},
    h("div",{class:"top"},h("span",null,h("b",{text:p.hora})," · Campo ",p.campo," · ",p.nombre),statusPill(p.estado)),
    h("div",{class:"vs"},h("div",{class:"t"+(p.a?"":" tbd")+(sc&&wb?" lose":"")},crest(p.a,"lg"),h("b",{text:p.a||"Por decidir"})),
      h("div",{class:"score"+(sc?"":" pend"),text:sc?`${p.ga} – ${p.gb}`:"VS"}),
      h("div",{class:"t"+(p.b?"":" tbd")+(sc&&wa?" lose":"")},crest(p.b,"lg"),h("b",{text:p.b||"Por decidir"}))),
    sc&&p.ga===p.gb?h("p",{class:"pen",text:`Penaltis: ${p.pa} – ${p.pb}`}):null);}

function vPartidos(P,D){const list=[...D.live,...D.next].slice(0,4);const recent=D.done.slice(-4).reverse();
  return h("section",{class:"sec wrap",id:"partidos"},
    h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:D.live.length?"En directo":"Agenda"}),h("h2",{text:D.live.length?"Partidos en juego y próximos":"Próximos partidos"}),
      h("p",{text:"Eliminatoria directa a un partido: quien gana, avanza. En caso de empate, penaltis."})),h("a",{class:"btn ghost sm",href:"#calendario"},"Calendario completo",ic(I.arrow))),
    list.length?h("div",{class:"matches"},list.map(mcard)):h("div",{class:"empty"},h("b",{text:D.partidos.some(p=>p.a)?"No quedan partidos pendientes":"Los cruces se conocerán tras el sorteo"}),h("span",{text:D.partidos.some(p=>p.a)?"Consulta los resultados más abajo.":"Cuando estén los 8 equipos, se sortean los cuartos de final y aparecerán aquí."})),
    recent.length?h("div",{class:"sec",style:"gap:14px"},h("h3",{style:"font-size:20px",text:"Últimos resultados"}),h("div",{class:"matches"},recent.map(mcard))):null);}

function vCuadro(P,D){const byId=Object.fromEntries(D.partidos.map(p=>[p.id,p]));
  const rounds=[["cuartos","Cuartos de final",[["C1","C2"],["C3","C4"]]],["semis","Semifinales",[["S1","S2"]]],["finales","Final y 3.er puesto",[["F"],["T"]]]];
  if(!ui.round){const k=byId.F&&byId.F.a&&byId.F.b?"finales":byId.S1&&(byId.S1.a||byId.S2&&byId.S2.a)?"semis":"cuartos";ui.round=k;}
  const pm=id=>{const p=byId[id];if(!p)return null;const sc=p.estado==="finalizado";
    const side=(n,g,pp,k)=>h("div",{class:"side"+(p.ganador?(p.ganador===k?" win":" lose"):"")},crest(n,"sm"),h("span",{class:"n"+(n?"":" tbd"),text:n||"Por decidir"}),h("span",{class:"g"},sc?String(g):"",sc&&p.ga===p.gb?h("small",{text:`(${pp})`}):null));
    return h("article",{class:"match"+(id==="F"?" final":"")+(p.estado==="en_juego"?" live":""),"aria-label":p.nombre},h("div",{class:"mh"},h("b",{text:id==="F"?"Final":p.nombre}),h("span",{text:`${p.hora} · Campo ${p.campo}`})),side(p.a,p.ga,p.pa,"a"),side(p.b,p.gb,p.pb,"b"),h("div",{class:"mf"},statusPill(p.estado)));};
  const tabs=h("div",{class:"rtabs",role:"group","aria-label":"Ronda"},rounds.map(([k,t])=>h("button",{type:"button","aria-pressed":ui.round===k?"true":"false",onclick:()=>{ui.round=k;render();document.getElementById("cuadro").scrollIntoView({block:"start"});}},t.replace(" y 3.er puesto",""))));
  return h("section",{class:"sec wrap",id:"cuadro"},
    h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:"Competición"}),h("h2",{text:"Cuadro del torneo"}),h("p",{text:"Cuartos, semifinales, final y partido por el tercer puesto."}))),
    D.champ?h("div",{class:"champ"},trophySvg(),h("div",null,h("small",{text:"Campeón"}),h("b",{text:D.champ.equipo}))):null,
    D.partidos.length?[tabs,h("div",{class:"bracket"},rounds.map(([k,t,pairs])=>h("div",{class:"round"+(ui.round===k?" on":"")},h("h3",{text:t}),h("div",{class:"col"},pairs.map(pr=>pr.length>1?h("div",{class:"pair"},pr.map(pm)):pm(pr[0]))))))]
      :h("div",{class:"empty"},h("b",{text:"El cuadro se publicará tras el sorteo"})));}

function vCalendario(P,D){const rows=[];if(P&&P.llegada)rows.push({t:P.llegada,note:"Llegada y entrega de acreditaciones conmemorativas"});
  D.partidos.forEach(p=>rows.push({t:p.hora,p}));if(P&&P.trofeos)rows.push({t:P.trofeos,note:"Entrega de trofeos y picoteo"});
  const teams=p=>`${p.a||"Por decidir"} ${p.estado==="finalizado"?`${p.ga}–${p.gb}`:"vs"} ${p.b||"Por decidir"}`;
  return h("section",{class:"sec wrap",id:"calendario"},
    h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:"Horario"}),h("h2",{text:"Calendario"}),h("p",{text:P&&P.fecha?`${cap(fmtFecha(P.fecha))}${P.sede?` · ${P.sede}`:""}. Partidos de ${P.minutosParte||25} minutos por parte.`:"Fecha y sede por confirmar. El horario es orientativo hasta entonces."}))),
    rows.length?h("div",{class:"card"},
      h("div",{class:"tablewrap cal-table"},h("table",null,h("thead",null,h("tr",null,h("th",{text:"Hora"}),h("th",{text:"Campo"}),h("th",{text:"Partido"}),h("th",{text:"Equipos"}),h("th",{text:"Estado"}))),
        h("tbody",null,rows.map(r=>r.p?h("tr",null,h("td",{class:"time",text:r.t}),h("td",null,h("span",{class:"field",text:r.p.campo})),h("td",{text:r.p.nombre}),h("td",{text:teams(r.p)}),h("td",null,statusPill(r.p.estado))):h("tr",{class:"note"},h("td",{class:"time",text:r.t}),h("td",{text:"—"}),h("td",{colspan:"3",text:r.note})))))),
      h("div",{class:"cal-cards"},rows.map(r=>h("div",{class:"ci"},h("span",{class:"time",text:r.t}),r.p?h("div",{class:"what"},h("b",{text:teams(r.p)}),h("small",{text:`${r.p.nombre} · Campo ${r.p.campo}`}),statusPill(r.p.estado)):h("div",{class:"what"},h("span",{class:"muted",text:r.note}))))))
      :h("div",{class:"empty"},h("b",{text:"Horario pendiente de publicar"})));}

function vClasif(P,D){const pos=(P&&P.posiciones)||[],gl=(P&&P.goleadores)||[];if(!pos.length&&!gl.length&&!D.done.length)return null;
  return h("section",{class:"sec wrap",id:"clasificacion"},
    h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:"Ranking"}),h("h2",{text:"Clasificación y pichichi"}))),
    h("div",{class:"two"},
      h("div",{class:"card"},h("div",{class:"rank-title"},h("h3",{text:"Clasificación final"})),pos.length?h("ol",{class:"rank"},pos.map(x=>h("li",{class:x.puesto==="1.º"?"first":null},h("span",{class:"pos",text:x.puesto}),crest(x.equipo,"sm"),h("span",{class:"who"},h("b",{text:x.equipo})),h("span")))):h("p",{class:"muted small",style:"padding:18px",text:"Se completará a medida que terminen las eliminatorias."})),
      h("div",{class:"card"},h("div",{class:"rank-title"},h("h3",{text:"Pichichi"}),h("span",{class:"pill gold",text:"Máximos goleadores"})),gl.length?h("ol",{class:"rank"},gl.map(g=>h("li",{class:g.puesto===1?"first":null},h("span",{class:"pos",text:g.puesto+".º"}),crest(g.equipo,"sm"),h("span",{class:"who"},h("b",{text:g.jugador}),h("small",{text:g.equipo})),h("span",{class:"num"},String(g.goles),h("small",{text:g.goles===1?"gol":"goles"}))))):h("p",{class:"muted small",style:"padding:18px",text:"Todavía no hay goles registrados."}))));}

function vEquipos(P,D){const slots=[];for(let i=D.n;i<D.plazas;i++)slots.push(i);
  return h("section",{class:"sec wrap",id:"equipos"},
    h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:"Participantes"}),h("h2",{text:"Equipos"}),h("p",{text:`${D.n} de ${D.plazas} plazas ocupadas.`})),D.canJoin?h("a",{class:"btn gold sm",href:D.form,target:"_blank",rel:"noopener noreferrer"},"Inscribir a mi empresa"):null),
    h("div",{class:"teams"},D.equipos.map(n=>{const col=(((P&&P.equiposColor)||[]).find(x=>x.nombre===n)||{}).color;const hx=COLORES[col];
      return h("div",{class:"card team"},crest(n),h("div",{style:"min-width:0"},h("b",{text:n}),hx?h("small",{class:"shirt"},h("i",{style:`background:${hx}`}),camiseta(col)):h("small",{text:"Inscrito"})));}),
      slots.map(()=>h("div",{class:"card team slot"},crest(null),h("div",null,h("b",{text:D.insc.k==="abierto"?"Plaza disponible":"Por confirmar"}))))));}

function vEmpresas(P,D){const it=(i,t,s)=>h("li",null,ic(i),h("b",{text:t}),h("span",{text:s}));
  const bg="img/campo.jpg";
  return h("section",{class:"wrap",id:"empresas"},h("div",{class:"corp"+(bg?" has-bg":""),style:`--corp-bg:url("${bg}")`},
    h("div",{style:"position:relative;z-index:1"},h("div",{class:"kick",text:"Para empresas"}),h("h2",{text:"Una jornada para el sector fuera de la oficina"}),
      h("p",{class:"lead",text:`${D.plazas} empresas, ${(P&&P.campos)||2} campos y una jornada de competición. Una forma distinta de reforzar el equipo y conocer a otros profesionales de la logística de Valencia.`}),
      h("div",{class:"incl"},h("h3",{text:"Incluido para cada equipo"}),h("ul",null,["Acreditación conmemorativa para cada jugador, con el logo de su empresa","Color de camiseta asignado por la organización","Agua para todos los equipos durante la jornada","Entrega de trofeos y picoteo al terminar"].map(t=>h("li",{text:t})))),
      D.canJoin?h("div",{class:"row",style:"margin-top:22px"},h("a",{class:"btn gold",href:D.form,target:"_blank",rel:"noopener noreferrer"},"Inscribir a mi empresa")):null),
    h("ul",null,it(I.trophy,"Competición","Eliminatoria directa a un partido: cada encuentro cuenta."),it(I.shake,"Networking","Contacto directo con otras empresas del sector en un ambiente distendido."),
      it(I.route,"Sector logístico","Pensado para transitarios, operadores, transportistas y almacenes del entorno de Valencia."),it(I.people,"Equipo","Compañeros de distintos departamentos jugando juntos con un objetivo común."))));}

function vFooter(P,D){const mail=safeMail(P&&P.contacto);const y=(P&&P.fecha&&P.fecha.slice(0,4))||String(new Date().getFullYear());
  return h("footer",null,h("div",{class:"wrap"},
    h("div",null,h("a",{class:"emblem",href:"#inicio"},emblem(),h("span",null,h("b",{text:TITLE}),h("small",{text:"Fútbol 7 · Empresas"}))),h("p",{class:"claim",text:"La logística también se juega en equipo."})),
    h("div",null,h("h4",{text:"Torneo"}),h("ul",null,[["#partidos","Partidos"],["#cuadro","Cuadro"],["#calendario","Calendario"],["#equipos","Equipos"]].map(([u,t])=>h("li",null,h("a",{href:u,text:t}))))),
    h("div",null,h("h4",{text:"Contacto"}),h("ul",null,mail?h("li",null,h("a",{href:"mailto:"+mail,text:mail})):h("li",{text:"Datos de contacto próximamente"}),D.canJoin?h("li",null,h("a",{href:D.form,target:"_blank",rel:"noopener noreferrer",text:"Formulario de inscripción"})):null)),
    h("div",{class:"legal"},h("span",{text:`© ${y} ${TITLE}`}),h("span",{class:"row",style:"gap:16px"},h("span",{text:P&&P.actualizado?`Datos actualizados el ${fmtDT(P.actualizado)}`:"Página informativa del torneo"}),h("a",{href:"#panel",onclick:ev=>{ev.preventDefault();window.copaAcceso&&window.copaAcceso();},text:"Acceso organización"})))));}

/* ---------- jugadas (enlaces de YouTube, Instagram o TikTok gestionados desde el panel) ---------- */
function ytId(u){try{const x=new URL(u);if(/(^|\.)youtu\.be$/.test(x.hostname))return x.pathname.slice(1).split("/")[0]||null;
  if(/(^|\.)youtube\.com$/.test(x.hostname)){if(x.searchParams.get("v"))return x.searchParams.get("v");const m=/^\/(shorts|embed|live)\/([\w-]{6,})/.exec(x.pathname);return m?m[2]:null;}}catch(e){}return null;}
function media(j){const u=safeUrl(j.url);const id=u&&ytId(u);
  if(id&&/^[\w-]{6,20}$/.test(id))return h("iframe",{src:`https://www.youtube-nocookie.com/embed/${id}`,title:j.titulo||"Jugada",loading:"lazy",allow:"accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen",allowfullscreen:true,referrerpolicy:"strict-origin-when-cross-origin"});
  let host="";try{host=new URL(u).hostname.replace(/^www\./,"");}catch(e){}
  return h("a",{class:"jlink",href:u||"#",target:"_blank",rel:"noopener noreferrer"},svg(`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`),h("span",null,h("b",{text:"Ver la jugada"}),h("small",{text:host})));}
function vJugadas(){const list=DATA.jugadas;if(!list.length)return null;
  return h("section",{class:"sec wrap",id:"jugadas"},h("div",{class:"sechead"},h("div",null,h("div",{class:"kick",text:"Vídeo"}),h("h2",{text:"Mejores jugadas"}))),
    h("div",{class:"jgrid"},list.map(j=>h("article",{class:"card jug"},h("div",{class:"jmedia"},media(j)),h("div",{class:"jbody"},h("b",{text:j.titulo||"Jugada"}),h("span",{class:"small muted",text:[j.equipo,j.partido].filter(Boolean).join(" · ")||" "}))))));}

/* ---------- render ---------- */
function vLoading(){return h("section",{class:"sec wrap"},h("div",{class:"empty"},h("b",{text:DATA.error?"No se pueden cargar los datos ahora mismo":"Cargando el torneo…"}),DATA.error?h("span",{text:"Vuelve a intentarlo en unos minutos."}):null));}
function render(){const P=DATA.torneo||null;const D=derive(P);const root=document.getElementById("root");const y=window.scrollY;
  root.replaceChildren(vNav(D),vHero(P,D),DATA.loaded?vStats(P,D):"",
    h("main",null,DATA.loaded?[vPartidos(P,D),vCuadro(P,D),vCalendario(P,D),vClasif(P,D)||"",vJugadas()||"",vEquipos(P,D),vEmpresas(P,D)]:[vLoading(),vEmpresas(P,D)]),vFooter(P,D));
  window.scrollTo(0,y);}
let rT=null;const later=()=>{clearTimeout(rT);rT=setTimeout(render,60);};
render();
try{
  firebase.initializeApp(window.COPA_FIREBASE);const fs=firebase.firestore();
  fs.doc("publico/torneo").onSnapshot(s=>{DATA.torneo=s.exists?s.data():null;DATA.loaded=true;DATA.error=false;later();},e=>{console.error("[copa]",e&&e.code);DATA.error=true;later();});
  fs.collection("jugadas").orderBy("creado","desc").onSnapshot(q=>{DATA.jugadas=q.docs.map(d=>({id:d.id,...d.data()}));later();},e=>console.error("[copa] jugadas",e&&e.code));
}catch(e){console.error(e);DATA.error=true;render();}
