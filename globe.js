(() => {
  "use strict";
  const AOI = { lat: 40.252, lng: 58.439 };
  const manifestUrl = new URL("./manifest.json", location.href).toString();
  const nisarUrl = new URL("./regions/darvaza/nisar/index.json", location.href).toString();
  const $ = id => document.getElementById(id);
  let observations = [];
  const fmtDate = value => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB",{dateStyle:"long",timeZone:"UTC"}).format(d);
  };
  function initGlobe() {
    if (!window.Globe) { $("globe-status").textContent = "GLOBE LIBRARY UNAVAILABLE"; return; }
    const globe = Globe()(document.getElementById("globe"))
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("#080d12")
      .showAtmosphere(true).atmosphereColor("#4a9fc4").atmosphereAltitude(.18)
      .pointsData([{lat:AOI.lat,lng:AOI.lng,size:.5,color:"#ef765d",name:"Darvaza gas crater"}])
      .pointAltitude("size").pointRadius(.25).pointColor("color")
      .pointLabel(d => d.name)
      .ringsData([{lat:AOI.lat,lng:AOI.lng,maxR:3.2, propagationSpeed:.7, repeatPeriod:1800}])
      .ringColor(() => t => `rgba(239,118,93,${1-t})`).ringMaxRadius("maxR").ringPropagationSpeed("propagationSpeed").ringRepeatPeriod("repeatPeriod");
    globe.pointOfView({lat:AOI.lat,lng:AOI.lng,altitude:1.8},1200);
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = .28;
    $("globe-status").textContent = "EARTH MODEL READY";
    window.addEventListener("resize", () => globe.width(document.getElementById("globe").clientWidth));
  }
  function selectObservation(index) {
    const item = observations[index];
    if (!item) return;
    $("selected-date").textContent = fmtDate(item.acquired_at);
    $("date-state").textContent = item.quality_flags?.some(x => x.code === "DISCOVERY_ONLY") ? "CATALOGUE RECORD · NOT PROCESSED" : "OBSERVATION RECORD";
    $("sensor").textContent = item.source_id || "—";
    $("scene").textContent = item.scene_id || "—";
    $("processing").textContent = item.processed_at ? (item.processing_version || "Processed") : "Discovery only";
    $("cloud").textContent = item.cloud_cover_pct == null ? "Not reported" : `${item.cloud_cover_pct}%`;
  }
  async function loadData() {
    const [manifestResult, nisarResult] = await Promise.allSettled([fetch(manifestUrl),fetch(nisarUrl)]);
    if (manifestResult.status === "fulfilled" && manifestResult.value.ok) {
      const data = await manifestResult.value.json();
      observations = Array.isArray(data.observations) ? data.observations : [];
    }
    const select = $("date-select");
    select.replaceChildren();
    observations.sort((a,b) => new Date(b.acquired_at)-new Date(a.acquired_at));
    if (!observations.length) {
      select.add(new Option("No catalogue observations available",""));
      $("date-state").textContent = "NO OBSERVATIONS PUBLISHED";
    } else {
      observations.forEach((item,i) => select.add(new Option(`${fmtDate(item.acquired_at)} · ${item.source_id}`,String(i))));
      select.addEventListener("change", () => selectObservation(Number(select.value)));
      selectObservation(0);
    }
    if (nisarResult.status === "fulfilled" && nisarResult.value.ok) {
      const data = await nisarResult.value.json();
      const count = Array.isArray(data.pair_candidates) ? data.pair_candidates.length : 0;
      $("product-state").textContent = count ? `${count} NISAR repeat-pass catalogue candidate(s). Raster products are not yet processed.` : "NISAR catalogue report available; no compatible repeat-pass pairs were found.";
    } else {
      $("product-state").textContent = "NISAR catalogue report has not been published yet.";
    }
  }
  initGlobe();
  loadData().catch(() => { $("date-state").textContent = "DATA FEED UNAVAILABLE"; });
})();
