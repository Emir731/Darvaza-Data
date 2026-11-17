(() => {
"use strict";
const AOI={lat:40.252,lon:58.439},DATA_URL=new URL("./manifest.json",location.href).toString(),PAGE_SIZE=15;
const SNAPSHOT={observations:154,processed:0,products:0,activeSources:3,runs:5,generatedAt:"2026-11-17T15:20:23.835338Z"};
let all=[],page=1,filters={search:"",source:"all",cloud:"all"};
const $=id=>document.getElementById(id),fmt=v=>new Intl.NumberFormat("en-US").format(Number(v)||0);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=v=>{if(!v)return"—";const d=new Date(v);return isNaN(d)? "—":new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(d)};
const safeUrl=v=>{try{const u=new URL(v);return["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}};
function nav(){const b=$("mobile-menu-toggle");b?.addEventListener("click",()=>{let open=document.body.classList.toggle("nav-open");b.setAttribute("aria-expanded",String(open));b.innerHTML=open?'<i class="ph ph-x"></i>':'<i class="ph ph-list"></i>'});document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>{document.body.classList.remove("nav-open");b?.setAttribute("aria-expanded","false");if(b)b.innerHTML='<i class="ph ph-list"></i>';document.querySelectorAll(".nav-link").forEach(n=>n.classList.toggle("active",n===a))}));}
function globe(){
  const root=$("map");
  if(!root)return;
  // Verified crater location (not the nearby village or camera viewpoint).
  const crater={lat:40.25258,lon:58.43933};
  root.innerHTML=
    '<div class="map-visual map-detail"><div id="crater-satellite" aria-label="Satellite imagery centred on the Darvaza gas crater"></div><div class="satellite-tag"><span class="satellite-live-dot"></span> DARVAZA · SATELLITE VIEW <span>40.25258 N / 58.43933 E</span></div></div>'+
    '<div class="map-visual map-globe"><div id="earth-globe" aria-label="3D Earth context view focused on Darvaza"></div><div class="globe-tag">3D EARTH · LOCKED TO DARVAZA</div></div>'+
    '<figure class="map-visual crater-photo"><img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Darvaza_Gas_Crater_%2842435082502%29.jpg/1280px-Darvaza_Gas_Crater_%2842435082502%29.jpg" alt="Darvaza gas crater burning at night, photographed in 2018" loading="lazy" referrerpolicy="no-referrer"><figcaption>CRATER REFERENCE · FIELD PHOTOGRAPH · 2018 <a href="https://commons.wikimedia.org/wiki/File:Darvaza_Gas_Crater_(42435082502).jpg" target="_blank" rel="noopener noreferrer">John Pavelka · CC BY 2.0</a></figcaption></figure>';
  root.dataset.view="darvaza-locked";
  const detail=$("crater-satellite");
  if(window.L){
    // Zoom 18 frequently returns provider "not available" placeholder tiles in this
    // remote desert AOI. Start at a native imagery zoom instead of magnifying blanks.
    const map=L.map(detail,{zoomControl:false,scrollWheelZoom:false,dragging:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,keyboard:false,attributionControl:true,preferCanvas:true}).setView([crater.lat,crater.lon],15);
    let tileErrors=0,baseLayer,fallbackTimer,osmTimer,fallbackUsed=false,osmUsed=false;
    const esri=L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{minZoom:3,maxZoom:17,maxNativeZoom:17,attribution:"Imagery © Esri, Maxar, Earthstar Geographics",crossOrigin:true,updateWhenIdle:true,keepBuffer:2});
    const sentinel=L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{x}/{y}.jpg",{minZoom:3,maxZoom:17,maxNativeZoom:14,attribution:"Sentinel-2 cloudless mosaic © EOX / ESA",crossOrigin:true,updateWhenIdle:true,keepBuffer:2});
    const osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors",crossOrigin:true});
    const showOsm=()=>{
      if(osmUsed)return;
      osmUsed=true;clearTimeout(osmTimer);
      if(map.hasLayer(esri))map.removeLayer(esri);
      if(map.hasLayer(sentinel))map.removeLayer(sentinel);
      baseLayer=osm.addTo(map);
      detail.dataset.osmFallback="true";
      let note=detail.querySelector(".map-source-note");
      if(!note){note=document.createElement("div");note.className="map-source-note";detail.appendChild(note)}
      note.textContent="SATELLITE TILES UNAVAILABLE · OPEN MAP FALLBACK";
    };
    const showFallback=()=>{
      if(fallbackUsed||osmUsed)return;
      fallbackUsed=true;clearTimeout(fallbackTimer);
      if(map.hasLayer(esri))map.removeLayer(esri);
      baseLayer=sentinel.addTo(map);
      detail.dataset.imageryFallback="true";
      // Do not trust HTTP 200 alone: some tile providers return a blank placeholder.
      osmTimer=setTimeout(showOsm,5500);
    };
    baseLayer=esri.addTo(map);
    esri.on("tileerror",()=>{tileErrors++;if(tileErrors>=2)showFallback()});
    fallbackTimer=setTimeout(showFallback,5000);
    L.circle([crater.lat,crater.lon],{radius:45,color:"#f2bd56",weight:2,fillColor:"#f2bd56",fillOpacity:.10}).addTo(map);
    L.circleMarker([crater.lat,crater.lon],{radius:5,color:"#101713",weight:2,fillColor:"#f2bd56",fillOpacity:1}).addTo(map).bindTooltip("DARVAZA GAS CRATER",{permanent:true,direction:"top",offset:[0,-8],className:"crater-tooltip"});
    const refresh=()=>{map.invalidateSize({pan:false});if(map.getZoom()>17)map.setZoom(17,{animate:false})};
    requestAnimationFrame(refresh);
    setTimeout(refresh,250);
    setTimeout(refresh,900);
    setTimeout(refresh,1800);
    if(typeof ResizeObserver!=="undefined"){const ro=new ResizeObserver(refresh);ro.observe(root);ro.observe(detail)}
    addEventListener("resize",refresh,{passive:true});
    addEventListener("orientationchange",()=>setTimeout(refresh,250),{passive:true});
  }else{
    detail.innerHTML='<div class="globe-loading">SATELLITE MAP LIBRARY UNAVAILABLE · SEE CRATER PHOTO BELOW</div>';
  }
  const earth=$("earth-globe");
  if(typeof window.Globe==="function"){
    try{
      const g=window.Globe()(earth)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true).atmosphereColor("#9cbd9b").atmosphereAltitude(.13)
        .pointsData([{lat:crater.lat,lng:crater.lon,size:.42,color:"#f2bd56"}])
        .pointAltitude(.012).pointRadius("size").pointColor("color")
        .pointLabel(()=>"Darvaza gas crater · Turkmenistan")
        .ringsData([{lat:crater.lat,lng:crater.lon,maxR:1.5}])
        .ringColor(() =>"#f2bd56").ringMaxRadius("maxR").ringPropagationSpeed(0).ringRepeatPeriod(0);
      const resize=()=>g.width(earth.clientWidth).height(earth.clientHeight);
      resize();addEventListener("resize",resize,{passive:true});
      g.pointOfView({lat:crater.lat,lng:crater.lon,altitude:1.8},0);
      g.pointOfView({lat:crater.lat,lng:crater.lon,altitude:.38},2200);
      const controls=g.controls();
      controls.enabled=false;controls.enableZoom=false;controls.enableRotate=false;controls.enablePan=false;
    }catch(e){
      console.warn("3D globe unavailable; satellite view remains active:",e);
      earth.innerHTML='<div class="globe-loading">3D EARTH UNAVAILABLE · SATELLITE VIEW ACTIVE</div>';
    }
  }else{
    earth.innerHTML='<div class="globe-loading">3D EARTH UNAVAILABLE · SATELLITE VIEW ACTIVE</div>';
  }
}
function metrics(m){const obs=m.observations||[],sources=m.sources||[],runs=m.pipeline_runs||[];$("metric-observations").textContent=fmt(obs.length);$("metric-processed").textContent=fmt(obs.filter(x=>x.processed_at).length);$("metric-products").textContent=fmt((m.change_products||[]).length);$("metric-sources").textContent=fmt(sources.filter(x=>Number(x.scene_count)>0).length);$("metric-runs").textContent=fmt(runs.filter(x=>x.status==="success").length);$("metric-observations-note").textContent="Catalogue records · "+(m.is_sample?"sample data":"published manifest");$("last-updated").textContent=m.generated_at?"UPDATED "+date(m.generated_at).toUpperCase():"UPDATE TIME UNKNOWN"}
function latest(){const rows=[...all].sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at)).slice(0,6);$("latest-list").innerHTML=rows.length?rows.map(x=>'<div class="activity-item"><div class="activity-title">'+esc((x.source_id||"unknown").replaceAll("-"," ").toUpperCase())+'</div><div class="activity-meta">'+esc(date(x.acquired_at))+' · '+esc(x.scene_id)+'</div></div>').join(""):'<div class="empty-state"><i class="ph ph-radar"></i><strong>No observations published</strong><p>The catalogue currently contains no scene records.</p></div>'}
function filtered(){let q=filters.search.trim().toLowerCase();return all.filter(x=>(filters.source==="all"||x.source_id===filters.source)&&(!q||[x.scene_id,x.source_id,x.id].some(v=>String(v||"").toLowerCase().includes(q)))&&(filters.cloud==="all"||(x.cloud_cover_pct!=null&&Number(x.cloud_cover_pct)<=Number(filters.cloud)))).sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at))}
function table(){const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages);const slice=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);$("table-count").textContent=fmt(rows.length)+" / "+fmt(all.length)+" RECORDS";$("page-label").textContent="PAGE "+page+" / "+pages;$("page-prev").disabled=page<=1;$("page-next").disabled=page>=pages;if(!slice.length){$("observations-body").innerHTML='<tr><td colspan="6"><div class="table-empty">No scenes match these filters. Try a broader search.</div></td></tr>';return}$("observations-body").innerHTML=slice.map(x=>{let asset=Array.isArray(x.assets)?x.assets.find(a=>a.role==="thumbnail"&&safeUrl(a.href)):null,scene=esc(x.scene_id||"Unknown scene"),cloud=x.cloud_cover_pct==null?"—":Number(x.cloud_cover_pct).toFixed(1)+"%",resolution=x.resolution_m?esc(x.resolution_m)+" m":"—",link=asset?'<a class="scene-link" href="'+esc(safeUrl(asset.href))+'" target="_blank" rel="noopener noreferrer">'+scene+' ↗</a>':'<span class="scene-link">'+scene+'</span>';return '<tr><td>'+esc(date(x.acquired_at))+'</td><td>'+esc(String(x.source_id||"—").replaceAll("-"," ").toUpperCase())+'</td><td>'+link+'</td><td>'+cloud+'</td><td>'+resolution+'</td><td><span class="pill pending">'+(x.processed_at?"PROCESSED":"DISCOVERY ONLY")+'</span></td></tr>'}).join("")}
function sources(items){$("source-grid").innerHTML=items.map(x=>'<article class="source-card"><div class="source-card-top"><strong>'+esc(x.name)+'</strong><i class="ph ph-database"></i></div><p>'+esc(x.provider||"Provider not specified")+' · '+esc(x.instrument||"Sensor details unavailable")+'</p><div class="source-status"><span style="color:var(--green)">'+esc(x.status==="healthy"?"CATALOGUE ONLINE":String(x.status||"unknown").toUpperCase())+'</span> · '+fmt(x.scene_count)+' catalogue scenes · '+esc(x.native_resolution_m??"—")+' m</div></article>').join("");const select=$("source-filter"),old=select.value;select.innerHTML='<option value="all">All sources</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("");select.value=items.some(x=>x.id===old)?old:"all"}
function bind(){ $("scene-search").addEventListener("input",e=>{filters.search=e.target.value;page=1;table()});$("source-filter").addEventListener("change",e=>{filters.source=e.target.value;page=1;table()});$("cloud-filter").addEventListener("change",e=>{filters.cloud=e.target.value;page=1;table()});$("page-prev").addEventListener("click",()=>{page=Math.max(1,page-1);table()});$("page-next").addEventListener("click",()=>{page++;table()})}
async function load(){$("metric-observations").textContent=fmt(SNAPSHOT.observations);$("metric-processed").textContent="0";$("metric-products").textContent="0";$("metric-sources").textContent=fmt(SNAPSHOT.activeSources);$("metric-runs").textContent=fmt(SNAPSHOT.runs);$("metric-observations-note").textContent="Last published snapshot · "+date(SNAPSHOT.generatedAt);$("last-updated").textContent="SNAPSHOT · "+date(SNAPSHOT.generatedAt).toUpperCase();try{const r=await fetch(DATA_URL,{cache:"no-store"});if(!r.ok)throw Error("Manifest HTTP "+r.status);const m=await r.json();if(!Array.isArray(m.observations)||!Array.isArray(m.sources))throw Error("Manifest schema mismatch");all=m.observations;metrics(m);latest();sources(m.sources);table();document.documentElement.dataset.dataStatus="live"}catch(e){console.warn("Manifest fallback:",e);$("metric-observations-note").textContent="Showing last published snapshot · feed unavailable";document.documentElement.dataset.dataStatus="snapshot"}}
const year=$("year");if(year)year.textContent=new Date().getUTCFullYear();nav();bind();globe();load();
})();