const AOI = { lat: 40.252, lon: 58.439 };
const MANIFEST_URL = new URL("./manifest.json", window.location.href).toString();
const fmt = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);
const dateFmt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
};
const safeText = (value, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;

function initMap() {
  if (!window.L) return;
  const map = L.map("map", { scrollWheelZoom: false, zoomControl: true }).setView([AOI.lat, AOI.lon], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  L.circle([AOI.lat, AOI.lon], { radius: 2500, color: "#d9a441", weight: 1, fillColor: "#d9a441", fillOpacity: .08 }).addTo(map);
  L.circleMarker([AOI.lat, AOI.lon], { radius: 5, color: "#111916", weight: 2, fillColor: "#d9a441", fillOpacity: 1 }).addTo(map)
    .bindPopup("<strong>Darvaza gas crater</strong><br>Approximate area of interest");
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
    const cloud = Number.isFinite(Number(item.cloud_cover_pct)) ? Math.round(Number(item.cloud_cover_pct)) + "%" : "—";
    const isProcessed = Boolean(item.processed_at);
    return '<tr><td>' + dateFmt(item.acquired_at) + '</td><td>' + safeText(item.source_id).toUpperCase() + '</td><td>' + safeText(item.scene_id) + '</td><td>' + cloud + '</td><td><span class="pill ' + (isProcessed ? '' : 'pending') + '">' + (isProcessed ? 'PROCESSED' : 'DISCOVERY ONLY') + '</span></td></tr>';
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

async function loadManifest() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest not published");
    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.observations) || !Array.isArray(manifest.sources)) throw new Error("Manifest schema is not recognized");
    const observations = manifest.observations;
    const processed = observations.filter(x => Boolean(x.processed_at)).length;
    const products = Array.isArray(manifest.change_products) ? manifest.change_products.length : 0;
    const activeSources = manifest.sources.filter(x => Number(x.scene_count) > 0 || x.status === "connected").length;
    setText("metric-observations", fmt(observations.length));
    setText("metric-processed", fmt(processed));
    setText("metric-products", fmt(products));
    setText("metric-sources", fmt(activeSources));
    setText("metric-observations-note", "Catalogue records · " + (manifest.is_sample ? "sample data" : "pipeline manifest"));
    setText("last-updated", manifest.generated_at ? "UPDATED " + dateFmt(manifest.generated_at).toUpperCase() : "UPDATE TIME UNKNOWN");
    renderLatest(observations);
    renderObservations(observations);
    renderSources(manifest.sources);
  } catch (error) {
    setText("last-updated", "AWAITING MANIFEST");
    setText("metric-observations", "—");
    setText("metric-processed", "—");
    setText("metric-products", "—");
    setText("metric-sources", "—");
    console.info("Darvaza Watch data feed:", error.message);
  }
}

document.getElementById("year").textContent = new Date().getUTCFullYear();
initMap();
loadManifest();
