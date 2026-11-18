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
function metrics(m){const obs=m.observations||[],sources=m.sources||[],runs=m.pipeline_runs||[],processed=obs.filter(x=>x.processed_at&&String(x.processing_version||"").startsWith("landsat-environmental/")),pairs=(m.change_products&&m.change_products.length?m.change_products:m.before_after_pairs)||[],sceneAssets=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="preview"||a.role==="cog").length,0),scenePreviews=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="preview").length,0),sceneCogs=processed.reduce((n,x)=>n+(x.assets||[]).filter(a=>a.role==="cog").length,0),pairAssetValues=pairs.flatMap(p=>Object.values(p.assets||{})).filter(v=>typeof v==="string"&&v.length),pairPreviews=pairAssetValues.filter(v=>v.toLowerCase().endsWith(".png")).length,pairCogs=pairAssetValues.filter(v=>v.toLowerCase().endsWith(".tif")||v.toLowerCase().endsWith(".tiff")).length,previews=scenePreviews+pairPreviews,cogs=sceneCogs+pairCogs,rasterAssets=previews+cogs;$("metric-observations").textContent=fmt(obs.length);$("metric-processed").textContent=fmt(processed.length);$("metric-products").textContent=fmt(rasterAssets);$("metric-sources").textContent=fmt(sources.filter(x=>Number(x.scene_count)>0).length);$("metric-runs").textContent=fmt(runs.filter(x=>x.status==="success").length);$("metric-observations-note").textContent="Catalogue records · "+(m.is_sample?"sample data":"published manifest");const productFoot=document.querySelector("#metric-products")?.parentElement?.querySelector(".metric-foot");if(productFoot)productFoot.textContent=fmt(previews)+" previews · "+fmt(cogs)+" Cloud Optimized GeoTIFFs";$("last-updated").textContent=m.generated_at?"UPDATED "+date(m.generated_at).toUpperCase():"UPDATE TIME UNKNOWN"}
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
function renderChangePairs(m){
 const root=$("change-viewer"),empty=$("change-empty"),select=$("change-pair-select");
 if(!root||!empty||!select)return;
 const source=((m.change_products&&m.change_products.length)?m.change_products:m.before_after_pairs)||[];
 const previewAssets=p=>{
  const a=p.assets||{},layers=p.layer_previews||a.layer_previews||{};
  return {
   before:a.before_preview||layers.before||null,
   after:a.after_preview||layers.after||null,
   delta:a.delta_preview||layers.delta||null
  };
 };
 const pairs=source.map(p=>({...p,_previews:previewAssets(p)}))
  .filter(p=>p._previews.before&&p._previews.after&&p._previews.delta&&
   assetUrl(p._previews.before)&&assetUrl(p._previews.after)&&assetUrl(p._previews.delta))
  .sort((a,b)=>String(b.after_date||"").localeCompare(String(a.after_date||"")));
 if(!pairs.length){root.hidden=true;empty.hidden=false;return}
 empty.hidden=true;root.hidden=false;
 select.innerHTML=pairs.map((p,i)=>'<option value="'+i+'">'+esc(p.before_date)+' → '+esc(p.after_date)+' · '+esc(String(p.product||"").toUpperCase())+'</option>').join("");
 const before=$("change-before-image"),after=$("change-after-image"),delta=$("change-delta-image"),divider=$("change-divider"),deltaToggle=$("change-delta-toggle"),deltaPanel=$("change-delta-panel");
 const draw=()=>{
  const pair=pairs[Number(select.value)||0];
  if(!pair)return;
  before.src=assetUrl(pair._previews.before);
  after.src=assetUrl(pair._previews.after);
  delta.src=assetUrl(pair._previews.delta);
  after.style.clipPath="inset(0 0 0 "+Number(divider.value)+"%)";
  $("change-before-date").textContent="BEFORE · "+pair.before_date;
  $("change-after-date").textContent="AFTER · "+pair.after_date;
  $("change-metadata").textContent=pair.label+" · "+pair.temporal_gap_days+" DAYS · "+pair.common_valid_pixel_pct+"% COMMON VALID COVERAGE · "+pair.crs+" · "+pair.resolution_m+" M";
  deltaPanel.hidden=true;deltaToggle.setAttribute("aria-pressed","false");deltaToggle.textContent="SHOW DIFFERENCE";
 };
 select.onchange=draw;
 divider.oninput=()=>{after.style.clipPath="inset(0 0 0 "+Number(divider.value)+"%)"};
 deltaToggle.onclick=()=>{
  const open=deltaPanel.hidden;
  deltaPanel.hidden=!open;deltaToggle.setAttribute("aria-pressed",String(open));
  deltaToggle.textContent=open?"HIDE DIFFERENCE":"SHOW DIFFERENCE";
 };
 draw();
}
function renderAnalysisPanels(m){
 const observations=(m.observations||[]);
 const validationMatrix=(m.time_series||{}).scientific_validation;
 const validationStatus=$("analysis-status");
 if(validationStatus&&validationMatrix){
  const pending=(validationMatrix.products||[]).filter(p=>!p.independent_validation_complete).length;
  validationStatus.innerHTML='<span class="analysis-status-dot"></span><div><strong>SCIENTIFIC VALIDATION REGISTER · '+fmt((validationMatrix.products||[]).length)+' PRODUCT FAMILIES</strong><p>'+fmt(pending)+' product families still require independent reference evidence. Automated tests and raster QA are not independent scientific validation.</p></div>';
 }
 const processed=observations.filter(o=>o.processed_at&&String(o.processing_version||"").startsWith("landsat-environmental/"));
 const thermal=processed.map(o=>{
  const preview=(o.assets||[]).find(a=>a.role==="preview"&&(/(?:-|_)lst(?:-|_)preview/i.test(a.id||"")||/land.?surface temperature/i.test(a.title||"")));
  const cog=(o.assets||[]).find(a=>a.role==="cog"&&(/(?:-|_)lst(?:-|_)cog/i.test(a.id||"")||/land.?surface temperature/i.test(a.title||"")));
  return {o,preview,cog};
 }).filter(x=>x.preview&&assetUrl(x.preview.href)).sort((a,b)=>new Date(b.o.acquired_at)-new Date(a.o.acquired_at));
 const thermalRoot=$("thermal-panel");
 if(thermalRoot){
  if(!thermal.length){
   thermalRoot.innerHTML='<div class="analysis-empty"><i class="ph ph-thermometer"></i><strong>No ST_B10 raster linked</strong><p>The live manifest has no processed Landsat land-surface-temperature preview. This is a data-publication status, not a zero-temperature reading.</p></div>';
  }else{
   thermalRoot.innerHTML='<div class="analysis-data-summary"><strong>'+fmt(thermal.length)+' SCENES WITH ST_B10</strong><span>30 m · surface temperature · exploratory</span></div><div class="analysis-thumb-grid">'+thermal.slice(0,3).map(({o,preview,cog})=>{
    const url=assetUrl(preview.href),cogUrl=cog?assetUrl(cog.href):null;
    return '<article class="analysis-thumb"><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(url)+'" loading="eager" alt="Landsat ST_B10 surface temperature preview for '+esc(o.scene_id)+'"></a><div><strong>'+esc(date(o.acquired_at))+'</strong><span>'+esc(o.scene_id)+'</span>'+(cogUrl?'<a href="'+esc(cogUrl)+'" target="_blank" rel="noopener noreferrer">OPEN ST_B10 COG ↗</a>':'')+'</div></article>';
   }).join("")+'</div><p class="analysis-note">ST_B10 is retrieved land-surface temperature, not flame or crater-core temperature. Scene-time and atmospheric conditions affect values; VIIRS/MODIS detections are not merged into this raster.</p>';
  }
 }
 const footprintRoot=$("footprint-panel");
 if(footprintRoot){
  const segmentation=(m.time_series||{}).crater_segmentation;
  if(segmentation&&Array.isArray(segmentation.candidate_scenes)&&segmentation.candidate_scenes.length){
   const scenes=segmentation.candidate_scenes.slice().sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at));
   const latest=scenes[0],assets=latest.assets||[];
   const preview=assets.find(a=>String(a.href||"").endsWith("candidate-preview.png"));
   const geo=assets.find(a=>String(a.href||"").endsWith(".geojson"));
   const sensitivity=latest.candidate_area_sensitivity_m2||{};
   const validation=segmentation.independent_validation||{};
   const validated=validation.reference_validation_performed===true;
   const previewUrl=preview?assetUrl(preview.href):null;
   const geoUrl=geo?assetUrl(geo.href):null;
   const areaRange=[sensitivity.min,sensitivity.median,sensitivity.max].every(Number.isFinite)
    ?'<div class="analysis-data-summary"><strong>AREA SENSITIVITY · '+fmt(sensitivity.min)+'–'+fmt(sensitivity.max)+' m²</strong><span>Median candidate '+fmt(sensitivity.median)+' m² · '+fmt(latest.candidate_count)+' variants</span></div>':'<p class="analysis-note"><strong>AREA WITHHELD</strong> · '+(latest.candidate_quality_status==="unstable_segmentation_sensitivity_do_not_use_area"?"Candidate areas vary too widely across threshold variants; no area summary is published.":"Clear-pixel coverage is too low for an exploratory area summary.")+'</p>';
   const validationText=validated
    ?(validation.summary&&validation.summary.criteria_met?'Independent reference comparison completed; pre-registered metric thresholds met. Expert review and reference provenance remain essential.':'Independent reference comparison completed; one or more operational thresholds were not met.')
    :'Independent reference polygon and two-person annotation review are still missing. No validated boundary or true crater area is published.';
   footprintRoot.innerHTML='<div class="analysis-data-summary"><strong>'+fmt(scenes.length)+' SCENES SEGMENTED</strong><span>SENTINEL-2 CATALOGUE SCENES · L2A exploratory candidate polygons</span></div><div class="analysis-note"><strong>NOT AN INDEPENDENTLY VERIFIED CRATER RIM</strong><p>These are algorithmic candidates, not a confirmed crater boundary.</p></div>'+(previewUrl?'<a class="change-card-preview" href="'+esc(previewUrl)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(previewUrl)+'" loading="eager" alt="Exploratory Darvaza crater segmentation candidate consensus"></a>':'')+areaRange+'<div class="candidate-scenes"><div><span>'+esc(date(latest.acquired_at))+'</span><strong>'+esc(latest.scene_id)+'</strong><em>'+fmt(latest.candidate_count)+' candidate masks</em></div></div><p class="analysis-note">'+esc(validationText)+'</p>'+(geoUrl?'<a class="analysis-action" href="'+esc(geoUrl)+'" target="_blank" rel="noopener noreferrer">OPEN CANDIDATE BOUNDARIES GEOJSON <i class="ph ph-arrow-up-right"></i></a>':'')+'<p class="analysis-note">Area min/median/max describe sensitivity to algorithms and thresholds only. They are not a statistical confidence interval. Sentinel-2 B11/SCL inputs are natively 20 m and resampled to the 10 m output grid.</p>';
  }else{
   const candidates=observations.filter(o=>o.source_id==="sentinel-2-l2a"&&o.cloud_cover_pct!=null&&Number(o.cloud_cover_pct)<=30).sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at));
   const s2=observations.filter(o=>o.source_id==="sentinel-2-l2a");
   footprintRoot.innerHTML='<div class="analysis-data-summary"><strong>'+fmt(s2.length)+' SENTINEL-2 CATALOGUE SCENES</strong><span>10 m native multispectral input</span></div><div class="footprint-readiness"><div class="readiness-track"><span style="width:'+Math.min(100,s2.length?candidates.length/s2.length*100:0)+'%"></span></div><div><strong>'+fmt(candidates.length)+' scenes at ≤30% catalogue cloud</strong><span>Potential segmentation inputs · processing pending</span></div></div><p class="analysis-note">No candidate segmentation is published yet. Catalogue discovery alone does not establish a crater boundary or area.</p>'+(candidates.length?'<div class="candidate-scenes">'+candidates.slice(0,3).map(o=>'<div><span>'+esc(date(o.acquired_at))+'</span><strong>'+esc(o.scene_id)+'</strong><em>'+Number(o.cloud_cover_pct).toFixed(1)+'% catalogue cloud</em></div>').join("")+'</div>':'<div class="analysis-empty"><strong>No low-cloud Sentinel-2 candidates in this manifest</strong><p>Segmentation remains unpublished until suitable scenes are available and processed.</p></div>');
  }
 }
 const changeRoot=$("surface-change-panel");
 if(changeRoot){
  const pairs=(m.change_products&&m.change_products.length?m.change_products:m.before_after_pairs)||[];
  const valid=pairs.filter(p=>p.assets&&p.assets.preview&&assetUrl(p.assets.preview));
  const latestPair=[...valid].sort((a,b)=>String(b.after_date||"").localeCompare(String(a.after_date||"")))[0];
  if(!latestPair){
   changeRoot.innerHTML='<div class="analysis-empty"><i class="ph ph-chart-scatter"></i><strong>No published date-pair previews</strong><p>The public manifest currently has no usable co-registered comparison preview. No change claim is made.</p></div>';
  }else{
   const preview=assetUrl(latestPair.assets.preview);
   changeRoot.innerHTML='<div class="analysis-data-summary"><strong>'+fmt(valid.length)+' CO-REGISTERED PRODUCTS</strong><span>'+fmt(new Set(valid.map(p=>p.id)).size)+' date-pair/index records · exploratory</span></div><a class="change-card-preview" href="'+esc(preview)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(preview)+'" loading="eager" alt="Darvaza before and after comparison '+esc(latestPair.before_date)+' to '+esc(latestPair.after_date)+'"></a><div class="change-card-meta"><strong>'+esc(latestPair.before_date)+' → '+esc(latestPair.after_date)+'</strong><span>'+esc(String(latestPair.product||"").toUpperCase())+' · '+esc(latestPair.common_valid_pixel_pct)+'% common valid pixels · '+esc(latestPair.resolution_m)+' m</span></div><a class="analysis-action" href="#change-viewer">OPEN BEFORE / AFTER EXPLORER <i class="ph ph-arrow-up-right"></i></a><p class="analysis-note">Continuous index / LST differences are exploratory screening signals, not validated crater growth, fire intensity or causal environmental change.</p>';
  }
 }
}
function latest(){const rows=[...all].sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at)).slice(0,6);$("latest-list").innerHTML=rows.length?rows.map(x=>'<div class="activity-item"><div class="activity-title">'+esc((x.source_id||"unknown").replaceAll("-"," ").toUpperCase())+'</div><div class="activity-meta">'+esc(date(x.acquired_at))+' · '+esc(x.scene_id)+'</div></div>').join(""):'<div class="empty-state"><i class="ph ph-radar"></i><strong>No observations published</strong><p>The catalogue currently contains no scene records.</p></div>'}
function filtered(){let q=filters.search.trim().toLowerCase();return all.filter(x=>(filters.source==="all"||x.source_id===filters.source)&&(!q||[x.scene_id,x.source_id,x.id].some(v=>String(v||"").toLowerCase().includes(q)))&&(filters.cloud==="all"||(x.cloud_cover_pct!=null&&Number(x.cloud_cover_pct)<=Number(filters.cloud)))).sort((a,b)=>new Date(b.acquired_at)-new Date(a.acquired_at))}
function table(){const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages);const slice=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);$("table-count").textContent=fmt(rows.length)+" / "+fmt(all.length)+" RECORDS";$("page-label").textContent="PAGE "+page+" / "+pages;$("page-prev").disabled=page<=1;$("page-next").disabled=page>=pages;if(!slice.length){$("observations-body").innerHTML='<tr><td colspan="6"><div class="table-empty">No scenes match these filters. Try a broader search.</div></td></tr>';return}$("observations-body").innerHTML=slice.map(x=>{let asset=Array.isArray(x.assets)?x.assets.find(a=>a.role==="thumbnail"&&safeUrl(a.href)):null,scene=esc(x.scene_id||"Unknown scene"),cloud=x.cloud_cover_pct==null?"—":Number(x.cloud_cover_pct).toFixed(1)+"%",resolution=x.resolution_m?esc(x.resolution_m)+" m":"—",link=asset?'<a class="scene-link" href="'+esc(safeUrl(asset.href))+'" target="_blank" rel="noopener noreferrer">'+scene+' ↗</a>':'<span class="scene-link">'+scene+'</span>';return '<tr><td>'+esc(date(x.acquired_at))+'</td><td>'+esc(String(x.source_id||"—").replaceAll("-"," ").toUpperCase())+'</td><td>'+link+'</td><td>'+cloud+'</td><td>'+resolution+'</td><td><span class="pill pending">'+(x.processed_at?"PROCESSED":"DISCOVERY ONLY")+'</span></td></tr>'}).join("")}
function sources(items){$("source-grid").innerHTML=items.map(x=>'<article class="source-card"><div class="source-card-top"><strong>'+esc(x.name)+'</strong><i class="ph ph-database"></i></div><p>'+esc(x.provider||"Provider not specified")+' · '+esc(x.instrument||"Sensor details unavailable")+'</p><div class="source-status"><span style="color:var(--green)">'+esc(x.status==="healthy"?"CATALOGUE ONLINE":String(x.status||"unknown").toUpperCase())+'</span> · '+fmt(x.scene_count)+' catalogue scenes · '+esc(x.native_resolution_m??"—")+' m</div></article>').join("");const select=$("source-filter"),old=select.value;select.innerHTML='<option value="all">All sources</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("");select.value=items.some(x=>x.id===old)?old:"all"}
function bind(){ $("scene-search").addEventListener("input",e=>{filters.search=e.target.value;page=1;table()});$("source-filter").addEventListener("change",e=>{filters.source=e.target.value;page=1;table()});$("cloud-filter").addEventListener("change",e=>{filters.cloud=e.target.value;page=1;table()});$("page-prev").addEventListener("click",()=>{page=Math.max(1,page-1);table()});$("page-next").addEventListener("click",()=>{page++;table()})}
async function load(){$("metric-observations").textContent="—";$("metric-processed").textContent="—";$("metric-products").textContent="—";$("metric-sources").textContent="—";$("metric-runs").textContent="—";$("metric-observations-note").textContent="Loading the latest published manifest…";$("last-updated").textContent="LOADING LIVE DATA";try{const r=await fetch(DATA_URL,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});if(!r.ok)throw Error("Manifest HTTP "+r.status);const m=await r.json();if(!Array.isArray(m.observations)||!Array.isArray(m.sources))throw Error("Manifest schema mismatch");all=m.observations;metrics(m);latest();sources(m.sources);table();renderRasterProducts(m);renderChangePairs(m);renderAnalysisPanels(m);document.documentElement.dataset.dataStatus="live"}catch(e){console.error("Live manifest unavailable:",e);$("metric-observations-note").textContent="Live manifest unavailable · counts withheld";$("last-updated").textContent="LIVE DATA UNAVAILABLE";const status=$("analysis-status");if(status)status.innerHTML='<span class="analysis-status-dot"></span><div><strong>LIVE DATA COULD NOT BE LOADED</strong><p>The website could not retrieve its published manifest. Counts and raster products are withheld rather than replaced with stale zero values.</p></div>';const root=$("raster-products");if(root)root.innerHTML='<div class="raster-empty"><i class="ph ph-cloud-warning"></i><div><strong>Published data feed unavailable</strong><p>Refresh the page later. No claim is made that raster products are absent.</p></div></div>';document.documentElement.dataset.dataStatus="error"}}
const year=$("year");if(year)year.textContent=new Date().getUTCFullYear();nav();bind();globe();load();
})();