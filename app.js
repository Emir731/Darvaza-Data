const AOI = { lat: 40.252, lon: 58.439 };
const MANIFEST_URL = new URL("./manifest.json", window.location.href).toString();
const SNAPSHOT = { observations: 154, processed: 0, products: 0, activeSources: 3, runs: 5, generatedAt: "2026-11-17T15:20:23.835338Z" };
const fmt = value => new Intl.NumberFormat("en-US").format(Number(value) || 0);
const dateFmt = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
};
const safeText = (value, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;

function initGlobe() {
  const root = document.getElementById("map");
  if (window.Globe) {
    root.innerHTML = "";
    const globe = Globe()(root)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor("#9cbd9b")
      .atmosphereAltitude(0.13)
      .pointsData([{ lat: AOI.lat, lng: AOI.lon, size: 0.55, color: "#e3ad4d" }])
      .pointAltitude(0.018)
      .pointRadius("size")
      .pointColor("color")
      .pointLabel(() => "Darvaza gas crater · Turkmenistan")
      .ringsData([{ lat: AOI.lat, lng: AOI.lon, maxR: 2.2, propagationSpeed: 0, repeatPeriod: 0 }])
      .ringColor(() => "#e3ad4d")
      .ringMaxRadius("maxR")
      .ringPropagationSpeed(0)
      .ringRepeatPeriod(0);
    const resize = () => globe.width(root.clientWidth).height(root.clientHeight);
    resize();
    window.addEventListener("resize", resize, { passive: true });
    globe.pointOfView({ lat: AOI.lat, lng: AOI.lon, altitude: 0.72 }, 0);
    const controls = globe.controls();
    controls.enabled = false;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    root.dataset.view = "globe";
    return;
  }
  initMapFallback();
}

function initMapFallback() {
  if (!window.L) {
    document.getElementById("map").innerHTML = '<div class="globe-loading">EARTH VIEW UNAVAILABLE · CHECK NETWORK</div>';
    return;
  }
  const map = L.map("map", { zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false }).setView([AOI.lat, AOI.lon], 13);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18,
    attribution: "Tiles © Esri"
  }).addTo(map);
  L.circle([AOI.lat, AOI.lon], { radius: 1800, color: "#e3ad4d", weight: 1, fillColor: "#e3ad4d", fillOpacity: .08 }).addTo(map);
  L.circleMarker([AOI.lat, AOI.lon], { radius: 5, color: "#111916", weight: 2, fillColor: "#e3ad4d", fillOpacity: 1 }).addTo(map).bindPopup("<strong>Darvaza gas crater</strong><br>Approximate area of interest");
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function renderLatest(observations) {
  const root = document.getElementById("latest-list");
  const items = [...observations].sort((a,b) => new Date(b.acquired_at) - new Date(a.acquired_at)).slice(0, 5);
  if (!items.length) {
    root.innerHTML = '<div class="empty-state"><i class="ph ph-radar"></i><strong>No observations published</strong><p>The catalogue is empty. The next successful pipeline publication will appear here.</p></div>';
    return;
  }
  root.innerHTML = items.map(item => {
    const source = safeText(item.source_id, "Unknown source").replaceAll("-", " ").toUpperCase();
    return '<div class="activity-item"><div class="activity-title">' + source + '</div><div class="activity-meta">' + dateFmt(item.acquired_at) + ' · ' + safeText(item.scene_id) + '</div></div>';
  }).join("");
}

function renderObservations(observations) {
  const body = document.getElementById("observations-body");
  const rows = [...observations].sort((a,b) => new Date(b.acquired_at) - new Date(a.acquired_at)).slice(0, 12);
  setText("table-count", fmt(observations.length) + " RECORDS");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5"><div class="table-empty">No published observation records yet.</div></td></tr>';
    return;
  }
  body.innerHTML = rows.map(item => {
    const cloud = item.cloud_cover_pct == null || item.cloud_cover_pct === "" ? "—" : Math.round(Number(item.cloud_cover_pct)) + "%";
    const isProcessed = Boolean(item.processed_at);
    return '<tr><td>' + dateFmt(item.acquired_at) + '</td><td>' + safeText(item.source_id).toUpperCase() + '</td><td>' + safeText(item.scene_id) + '</td><td>' + cloud + '</td><td><span class="pill ' + (isProcessed ? "" : "pending") + '">' + (isProcessed ? "PROCESSED" : "DISCOVERY ONLY") + '</span></td></tr>';
  }).join("");
}

function renderSources(sources) {
  const root = document.getElementById("source-grid");
  if (!Array.isArray(sources) || !sources.length) {
    root.innerHTML = '<div class="source-empty">No source metadata in the published manifest.</div>';
    return;
  }
  root.innerHTML = sources.map(source => {
    const count = source.scene_count == null ? "Count not reported" : fmt(source.scene_count) + " catalogue items";
    const state = safeText(source.status, "unknown").replaceAll("_", " ").toUpperCase();
    return '<article class="source-card"><div class="source-card-top"><strong>' + safeText(source.name, source.id) + '</strong><i class="ph ph-database" aria-hidden="true"></i></div><p>' + safeText(source.provider) + ' · ' + safeText(source.instrument) + '</p><div class="source-status">' + state + ' / ' + count + '</div></article>';
  }).join("");
}

function renderRuns(runs) {
  const successful = Array.isArray(runs) ? runs.filter(run => run.status === "success").length : 0;
  setText("metric-runs", fmt(successful));
}

function applySnapshot() {
  setText("metric-observations", fmt(SNAPSHOT.observations));
  setText("metric-processed", fmt(SNAPSHOT.processed));
  setText("metric-products", fmt(SNAPSHOT.products));
  setText("metric-sources", fmt(SNAPSHOT.activeSources));
  setText("metric-runs", fmt(SNAPSHOT.runs));
  setText("metric-observations-note", "Last published snapshot · " + dateFmt(SNAPSHOT.generatedAt));
  setText("last-updated", "SNAPSHOT · " + dateFmt(SNAPSHOT.generatedAt).toUpperCase());
}

async function loadManifest() {
  applySnapshot();
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest request returned " + response.status);
    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.observations) || !Array.isArray(manifest.sources)) throw new Error("Manifest schema is not recognized");
    const observations = manifest.observations;
    const processed = observations.filter(item => Boolean(item.processed_at)).length;
    const products = Array.isArray(manifest.change_products) ? manifest.change_products.length : 0;
    const activeSources = manifest.sources.filter(source => Number(source.scene_count) > 0).length;
    setText("metric-observations", fmt(observations.length));
    setText("metric-processed", fmt(processed));
    setText("metric-products", fmt(products));
    setText("metric-sources", fmt(activeSources));
    setText("metric-observations-note", "Catalogue records · " + (manifest.is_sample ? "sample data" : "pipeline manifest"));
    setText("last-updated", manifest.generated_at ? "UPDATED " + dateFmt(manifest.generated_at).toUpperCase() : "UPDATE TIME UNKNOWN");
    renderLatest(observations);
    renderObservations(observations);
    renderSources(manifest.sources);
    renderRuns(manifest.pipeline_runs);
    document.documentElement.dataset.dataStatus = "live";
  } catch (error) {
    setText("metric-observations-note", "Showing last published snapshot · feed unavailable");
    setText("last-updated", "SNAPSHOT · " + dateFmt(SNAPSHOT.generatedAt).toUpperCase());
    document.documentElement.dataset.dataStatus = "snapshot";
    console.warn("Darvaza Watch data feed:", error.message);
  }
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getUTCFullYear();
initGlobe();
loadManifest();
