(() => {
"use strict";
const AOI={lat:40.252,lon:58.439},DATA_URL=new URL("./manifest.json?v=20261118-1",location.href).toString(),PAGE_SIZE=15;
let all=[],page=1,filters={search:"",source:"all",cloud:"all"};
const $=id=>document.getElementById(id),fmt=v=>new Intl.NumberFormat("en-US").format(Number(v)||0);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=v=>{if(!v)return"—";const d=new Date(v);return isNaN(d)? "—":new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(d)};
const safeUrl=v=>{try{const u=new URL(v);return["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}};const assetUrl=v=>{try{const u=new URL(v,DATA_URL);return["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}};
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
    detail.dataset.mapLocked=String(
      !map.dragging.enabled()&&!map.scrollWheelZoom.enabled()&&
      !map.doubleClickZoom.enabled()&&!map.touchZoom.enabled()&&
      !map.boxZoom.enabled()&&!map.keyboard.enabled()
    );
    let esriErrors=0,sentinelErrors=0,esriLoaded=false,sentinelLoaded=false;
    let baseLayer,fallbackTimer,osmTimer,fallbackUsed=false,osmUsed=false;
    const esri=L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{minZoom:3,maxZoom:17,maxNativeZoom:17,attribution:"Imagery © Esri, Maxar, Earthstar Geographics",crossOrigin:true,updateWhenIdle:true,keepBuffer:2});
    const sentinel=L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",{minZoom:3,maxZoom:17,maxNativeZoom:14,attribution:"Sentinel-2 cloudless mosaic © EOX / ESA",crossOrigin:true,updateWhenIdle:true,keepBuffer:2});
    const osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors",crossOrigin:true});
    const sourceNote=message=>{
      let note=detail.querySelector(".map-source-note");
      if(!note){note=document.createElement("div");note.className="map-source-note";detail.appendChild(note)}
      note.textContent=message;
    };
    const showOsm=()=>{
      if(osmUsed||sentinelLoaded)return;
      osmUsed=true;clearTimeout(osmTimer);clearTimeout(fallbackTimer);
      if(map.hasLayer(esri))map.removeLayer(esri);
      if(map.hasLayer(sentinel))map.removeLayer(sentinel);
      baseLayer=osm.addTo(map);
      detail.dataset.osmFallback="true";
      sourceNote("SATELLITE LAYERS UNAVAILABLE · OPEN MAP FALLBACK");
    };
    const showFallback=()=>{
      if(fallbackUsed||osmUsed||esriLoaded)return;
      fallbackUsed=true;clearTimeout(fallbackTimer);
      if(map.hasLayer(esri))map.removeLayer(esri);
      baseLayer=sentinel.addTo(map);
      detail.dataset.imageryFallback="true";
      sourceNote("SENTINEL-2 CLOUDLESS MOSAIC · FALLBACK");
      osmTimer=setTimeout(()=>{if(!sentinelLoaded)showOsm()},10000);
    };
    baseLayer=esri.addTo(map);
    esri.on("tileload",()=>{esriLoaded=true;clearTimeout(fallbackTimer)});
    esri.on("tileerror",()=>{esriErrors++;if(esriErrors>=3&&!esriLoaded)showFallback()});
    sentinel.on("tileload",()=>{sentinelLoaded=true;clearTimeout(osmTimer)});
    sentinel.on("tileerror",()=>{sentinelErrors++;if(sentinelErrors>=3&&!sentinelLoaded)showOsm()});
    fallbackTimer=setTimeout(()=>{if(!esriLoaded)showFallback()},12000);
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
      earth.dataset.controlsLocked=String(
        !controls.enabled&&!controls.enableZoom&&!controls.enableRotate&&!controls.enablePan
      );
      earth.dataset.centerLat=String(crater.lat);
      earth.dataset.centerLon=String(crater.lon);
    }catch(e){
      console.warn("3D globe unavailable; satellite view remains active:",e);
      earth.innerHTML='<div class="globe-loading">3D EARTH UNAVAILABLE · SATELLITE VIEW ACTIVE</div>';
    }
  }else{
    earth.innerHTML='<div class="globe-loading">3D EARTH UNAVAILABLE · SATELLITE VIEW ACTIVE</div>';
  }
}
function metrics(m){const obs=m.observations||[],sources=m.sources||[],runs=m.pipeline_runs||[],processed=obs.filter(x=>x.processed_at&&String(x.processing_version||"").startsWith("landsat-environmental/")),pairs=m.change_products||m.before_after_pairs||[],sceneAssets=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="preview"||a.role==="cog").length,0),scenePreviews=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="preview").length,0),sceneCogs=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="cog").length,0),pairAssetValues=pairs.flatMap(p=>Object.values(p.assets||{})).filter(v=>typeof v==="string"&&v.length),pairPreviews=pairAssetValues.filter(v=>v.toLowerCase().endsWith(".png")).length,pairCogs=pairAssetValues.filter(v=>/\.tiff?$ /i.test(v)).length,previews=scenePreviews+pairPreviews,cogs=sceneCogs+pairCogs,rasterAssets=previews+cogs;$("metric-observations").textContent=fmt(obs.length);$("metric-processed").textContent=fmt(processed.length);$("metric-products").textContent=fmt(rasterAssets);$("metric-sources").textContent=fmt(sources.filter(x=>Number(x.scene_count)>0).length);$("metric-runs").textContent=fmt(runs.filter(x=>x.status==="success").length);$("metric-observations-note").textContent="Catalogue records · "+(m.is_sample?"sample data":"published manifest");const productFoot=document.querySelector("#metric-products")?.parentElement?.querySelector(".metric-foot");if(productFoot)productFoot.textContent=fmt(previews)+" previews · "+fmt(cogs)+" Cloud Optimized GeoTIFFs";$("last-updated").textContent=m.generated_at?"UPDATED "+date(m.generated_at).toUpperCase():"UPDATE TIME UNKNOWN"}
function renderRasterProducts(m){
 const root=$("raster-products"),status=$("analysis-status");
 if(!root)return;
 const scenes=(m.observations||[])
  .filter(x=>x.processed_at&&String(x.processing_version||"").startsWith("landsat-environmental/"))
  .map(observation=>({
   observation,
   previews:(observation.assets||[]).filter(a=>a.role==="preview"&&assetUrl(a.href)),
   cogs:(observation.assets||[]).filter(a=>a.role==="cog"&&assetUrl(a.href))
  }))
  .filter(x=>x.previews.length)
  .sort((a,b)=>new Date(b.observation.acquired_at)-new Date(a.observation.acquired_at));
 if(!scenes.length){
  root.innerHTML='<div class="raster-empty"><i class="ph ph-image"></i><div><strong>No processed raster products published</strong><p>Catalogue records are available, but no matching optical-index or land-surface-temperature rasters are linked to the public manifest yet.</p></div></div>';
  if(status)status.innerHTML='<span class="analysis-status-dot"></span><div><strong>CATALOGUE AVAILABLE · NO RASTER PRODUCTS PUBLISHED</strong><p>Scene metadata is available. No published raster products are currently linked to this website.</p></div>';
  return;
 }
 if(status)status.innerHTML='<span class="analysis-status-dot"></span><div><strong>EXPLORATORY RASTERS PUBLISHED · VALIDATION PENDING</strong><p>'+fmt(scenes.length)+' Landsat scenes have optical-index and/or land-surface-temperature products. They are exploratory and not validated crater measurements.</p></div>';
 const lstScenes=scenes.filter(x=>x.previews.some(a=>a.id.includes('-lst-preview'))).length;
 const thermalCard=document.querySelector(".analysis-card");
 if(thermalCard&&lstScenes){
  const empty=thermalCard.querySelector(".analysis-empty");
  const foot=thermalCard.querySelector(".analysis-foot");
  if(empty)empty.innerHTML='<i class="ph ph-thermometer"></i><strong>Exploratory land-surface temperature available</strong><p>Landsat ST_B10 products are shown below. They represent surface temperature on a 30 m grid, not flame or crater-core temperature. VIIRS/MODIS hotspot observations remain separate.</p>';
  if(foot)foot.textContent="LANDSAT ST_B10 · LAND-SURFACE TEMPERATURE";
 }
 root.innerHTML='<div class="raster-products-heading"><span>'+fmt(scenes.length)+' PROCESSED SCENES</span><span>LANDSAT C2 L2 · OPTICAL + THERMAL</span></div><div class="raster-scene-grid">'+scenes.map(({observation,previews,cogs})=>{
  const optical=observation.optical_valid_pixel_pct??observation.valid_pixel_pct;
  const thermal=observation.thermal_valid_pixel_pct;
  const metric='OPTICAL VALID: '+(optical==null?'—':Number(optical).toFixed(1)+'%')+' · THERMAL VALID: '+(thermal==null?'—':Number(thermal).toFixed(1)+'%');
  const previewCards=previews.map(preview=>{
   const cogId=preview.id.replace(/-preview$/,'-cog');
   const cog=cogs.find(a=>a.id===cogId);
   const href=assetUrl(preview.href),cogHref=cog?assetUrl(cog.href):null;
   const label=String(preview.title||preview.id).replace(/ preview.*$/i,'');
   return '<article class="raster-product-card"><a class="raster-preview-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(href)+'" loading="lazy" alt="'+esc(label)+' preview for '+esc(observation.scene_id)+'"></a><div class="raster-product-info"><strong>'+esc(label)+'</strong>'+(cogHref?'<a class="raster-cog-link" href="'+esc(cogHref)+'" target="_blank" rel="noopener noreferrer">OPEN COG <i class="ph ph-arrow-up-right"></i></a>':'')+'</div></article>';
  }).join("");
  return '<article class="raster-scene-card"><div class="raster-scene-heading"><div><div class="raster-product-date">'+esc(date(observation.acquired_at))+' · '+esc(metric)+'</div><strong>'+esc(observation.scene_id)+'</strong></div><span>EXPLORATORY</span></div><div class="raster-product-grid">'+previewCards+'</div></article>';
 }).join("")+'</div><p class="raster-disclaimer">NDVI and NDMI describe spectral vegetation/moisture context; MNDWI is a water index. Landsat ST_B10 is land-surface temperature, not flame or crater-core temperature. None of these products alone establishes crater-boundary change.</p>';
}
function latest(){const rows=[...all].sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at)).slice(0,6);$("latest-list").innerHTML=rows.length?rows.map(x=>'<div class="activity-item"><div class="activity-title">'+esc((x.source_id||"unknown").replaceAll("-"," ").toUpperCase())+'</div><div class="activity-meta">'+esc(date(x.acquired_at))+' · '+esc(x.scene_id)+'</div></div>').join(""):'<div class="empty-state"><i class="ph ph-radar"></i><strong>No observations published</strong><p>The catalogue currently contains no scene records.</p></div>'}
function filtered(){let q=filters.search.trim().toLowerCase();return all.filter(x=>(filters.source==="all"||x.source_id===filters.source)&&(!q||[x.scene_id,x.source_id,x.id].some(v=>String(v||"").toLowerCase().includes(q)))&&(filters.cloud==="all"||(x.cloud_cover_pct!=null&&Number(x.cloud_cover_pct)<=Number(filters.cloud)))).sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at))}
function table(){const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages);const slice=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);$("table-count").textContent=fmt(rows.length)+" / "+fmt(all.length)+" RECORDS";$("page-label").textContent="PAGE "+page+" / "+pages;$("page-prev").disabled=page<=1;$("page-next").disabled=page>=pages;if(!slice.length){$("observations-body").innerHTML='<tr><td colspan="6"><div class="table-empty">No scenes match these filters. Try a broader search.</div></td></tr>';return}$("observations-body").innerHTML=slice.map(x=>{let asset=Array.isArray(x.assets)?x.assets.find(a=>a.role==="thumbnail"&&safeUrl(a.href)):null,scene=esc(x.scene_id||"Unknown scene"),cloud=x.cloud_cover_pct==null?"—":Number(x.cloud_cover_pct).toFixed(1)+"%",resolution=x.resolution_m?esc(x.resolution_m)+" m":"—",link=asset?'<a class="scene-link" href="'+esc(safeUrl(asset.href))+'" target="_blank" rel="noopener noreferrer">'+scene+' ↗</a>':'<span class="scene-link">'+scene+'</span>';return '<tr><td>'+esc(date(x.acquired_at))+'</td><td>'+esc(String(x.source_id||"—").replaceAll("-"," ").toUpperCase())+'</td><td>'+link+'</td><td>'+cloud+'</td><td>'+resolution+'</td><td><span class="pill pending">'+(x.processed_at?"PROCESSED":"DISCOVERY ONLY")+'</span></td></tr>'}).join("")}
function sources(items){$("source-grid").innerHTML=items.map(x=>'<article class="source-card"><div class="source-card-top"><strong>'+esc(x.name)+'</strong><i class="ph ph-database"></i></div><p>'+esc(x.provider||"Provider not specified")+' · '+esc(x.instrument||"Sensor details unavailable")+'</p><div class="source-status"><span style="color:var(--green)">'+esc(x.status==="healthy"?"CATALOGUE ONLINE":String(x.status||"unknown").toUpperCase())+'</span> · '+fmt(x.scene_count)+' catalogue scenes · '+esc(x.native_resolution_m??"—")+' m</div></article>').join("");const select=$("source-filter"),old=select.value;select.innerHTML='<option value="all">All sources</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("");select.value=items.some(x=>x.id===old)?old:"all"}
function bind(){ $("scene-search").addEventListener("input",e=>{filters.search=e.target.value;page=1;table()});$("source-filter").addEventListener("change",e=>{filters.source=e.target.value;page=1;table()});$("cloud-filter").addEventListener("change",e=>{filters.cloud=e.target.value;page=1;table()});$("page-prev").addEventListener("click",()=>{page=Math.max(1,page-1);table()});$("page-next").addEventListener("click",()=>{page++;table()})}
async function load(){$("metric-observations").textContent="—";$("metric-processed").textContent="—";$("metric-products").textContent="—";$("metric-sources").textContent="—";$("metric-runs").textContent="—";$("metric-observations-note").textContent="Loading the latest published manifest…";$("last-updated").textContent="LOADING LIVE DATA";try{const r=await fetch(DATA_URL,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});if(!r.ok)throw Error("Manifest HTTP "+r.status);const m=await r.json();if(!Array.isArray(m.observations)||!Array.isArray(m.sources))throw Error("Manifest schema mismatch");all=m.observations;metrics(m);latest();sources(m.sources);table();renderRasterProducts(m);document.documentElement.dataset.dataStatus="live"}catch(e){console.error("Live manifest unavailable:",e);$("metric-observations-note").textContent="Live manifest unavailable · counts withheld";$("last-updated").textContent="LIVE DATA UNAVAILABLE";const status=$("analysis-status");if(status)status.innerHTML='<span class="analysis-status-dot"></span><div><strong>LIVE DATA COULD NOT BE LOADED</strong><p>The website could not retrieve its published manifest. Counts and raster products are withheld rather than replaced with stale zero values.</p></div>';const root=$("raster-products");if(root)root.innerHTML='<div class="raster-empty"><i class="ph ph-cloud-warning"></i><div><strong>Published data feed unavailable</strong><p>Refresh the page later. No claim is made that raster products are absent.</p></div></div>';document.documentElement.dataset.dataStatus="error"}}
const year=$("year");if(year)year.textContent=new Date().getUTCFullYear();nav();bind();globe();load();
})();