const AOI = { lat: 40.252, lon: 58.439 };
const MANIFEST_URL = new URL("./manifest.json", window.location.href).toString();
const fmt = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);
const dateFmt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
};
const safeText = (value, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

let map;
let aoiLayer;
let streetLayer;
let imageryLayer;

function initMap() {
  if (!window.L) return;
  map = L.map("map", { scrollWheelZoom: false, zoomControl: true }).setView([AOI.lat, AOI.lon], 16);
  streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  imageryLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, attribution: "Imagery &copy; Esri and its providers"
  });
  streetLayer.addTo(map);
  const streetButton = document.getElementById("map-street");
  const satelliteButton = document.getElementById("map-satellite");
  streetButton?.addEventListener("click", () => {
    if (map.hasLayer(imageryLayer)) map.removeLayer(imageryLayer);
    streetLayer.addTo(map);
    streetButton.classList.add("active"); satelliteButton?.classList.remove("active");
  });
  satelliteButton?.addEventListener("click", () => {
    if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
    imageryLayer.addTo(map);
    satelliteButton.classList.add("active"); streetButton?.classList.remove("active");
  });
  L.circleMarker([AOI.lat, AOI.lon], { radius: 5, color: "#111916", weight: 2, fillColor: "#d9a441", fillOpacity: 1 }).addTo(map)
    .bindPopup("<strong>Darvaza gas crater</strong><br>User-provided crater polygon");
}

function renderAoi(aoi) {
  if (!map || !window.L || !aoi || !aoi.geometry) return;
  if (aoiLayer) map.removeLayer(aoiLayer);
  aoiLayer = L.geoJSON(aoi.geometry, {
    style: { color: "#ef765d", weight: 2, fillColor: "#ef765d", fillOpacity: .16 }
  }).addTo(map);
  const bounds = aoiLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds.pad(1.8), { maxZoom: 17 });
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
    return '<div class="activity-item"><div class="activity-title">' + escapeHtml(source) + '</div><div class="activity-meta">' + dateFmt(item.acquired_at) + ' · ' + escapeHtml(safeText(item.scene_id)) + '</div></div>';
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
    const cloud = item.cloud_cover_pct != null && item.cloud_cover_pct !== "" && Number.isFinite(Number(item.cloud_cover_pct)) ? Math.round(Number(item.cloud_cover_pct)) + "%" : "—";
    const isProcessed = Boolean(item.processed_at);
    return '<tr><td>' + dateFmt(item.acquired_at) + '</td><td>' + escapeHtml(safeText(item.source_id).toUpperCase()) + '</td><td>' + escapeHtml(safeText(item.scene_id)) + '</td><td>' + cloud + '</td><td><span class="pill ' + (isProcessed ? '' : 'pending') + '">' + (isProcessed ? 'PROCESSED' : 'DISCOVERY ONLY') + '</span></td></tr>';
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
    return '<article class="source-card"><div class="source-card-top"><strong>' + escapeHtml(safeText(source.name, source.id)) + '</strong><i class="ph ph-database" aria-hidden="true"></i></div><p>' + escapeHtml(safeText(source.provider)) + ' · ' + escapeHtml(safeText(source.instrument)) + '</p><div class="source-status">' + escapeHtml(state) + ' / ' + count + '</div></article>';
  }).join("");
}

function renderFireStatus(manifest) {
  const root = document.getElementById("fire-summary");
  const summary = manifest.fire_detection_summary || {};
  const feeds = summary.feeds || {};
  const entries = Object.entries(feeds);
  if (!entries.length) {
    root.innerHTML = '<div class="source-empty">No recent fire-feed check is recorded. A blank result is not the same as zero detections.</div>';
  } else {
    root.innerHTML = entries.map(([feedId, feed]) => {
      const count = feed.status === "checked" ? Number(feed.detections || 0) : null;
      const title = feedId.replaceAll("_", " ");
      const message = feed.status === "checked"
        ? (count === 0 ? "Checked successfully. No hotspot pixels were reported inside the study boundary during this check." :
          "Hotspot records were reported. Check their time and confidence before interpreting them.")
        : feed.status === "not_configured" ? "Not checked: the FIRMS access key is not configured."
        : "Feed unavailable during this run. No zero-detection conclusion can be made.";
      return '<article class="status-card"><strong>' + escapeHtml(title) + '</strong>' +
        '<div class="status-value">' + (count === null ? "—" : fmt(count)) + '</div>' +
        '<p>' + escapeHtml(message) + '</p><p>Check: ' + escapeHtml(safeText(summary.checked_at, "—")) + '</p></article>';
    }).join("");
  }
  setText("fire-window", "Each check covers the latest 5 days. VIIRS pixels are about 375 m; MODIS pixels are about 1 km. A small or short-lived heat source can be missed.");
  const historyRoot = document.getElementById("fire-history");
  fetch(new URL("./fire-detection-history.json", window.location.href), {cache:"no-store"})
    .then(r => { if (!r.ok) throw new Error("history not published"); return r.json(); })
    .then(history => {
      const rows = Object.entries(history.feeds || {});
      if (!rows.length) { historyRoot.textContent = "No daily history has been saved yet."; return; }
      historyRoot.innerHTML = '<strong class="history-title">Daily detections saved over time</strong>' +
        rows.map(([feedId, values]) => {
          const recent = values.slice(-7).reverse();
          return '<div class="history-feed"><strong>' + escapeHtml(feedId.replaceAll("_", " ")) + '</strong>' +
            recent.map(item => '<span>' + escapeHtml(item.date) + ': <b>' + fmt(item.detections) + '</b></span>').join("") +
            '</div>';
        }).join("");
    })
    .catch(() => { historyRoot.textContent = "Daily history will appear after the next successful scheduled publication."; });
}

async function renderProducts() {
  const root = document.getElementById("product-grid");
  try {
    const response = await fetch(new URL("./products/index.json", window.location.href), {cache:"no-store"});
    if (!response.ok) throw new Error("Product index unavailable");
    const index = await response.json();
    const products = Array.isArray(index.products) ? index.products.slice(0, 12) : [];
    if (!products.length) { root.innerHTML = '<div class="source-empty">No usable satellite image products are available yet.</div>'; return; }
    root.innerHTML = products.map(product => {
      const preview = (product.assets || []).find(a => a.role === "preview");
      const raster = (product.assets || []).find(a => a.role === "cog");
      const previewUrl = preview ? new URL(preview.href, window.location.href).toString() : "";
      const rasterUrl = raster ? new URL(raster.href, window.location.href).toString() : "";
      const label = product.product === "MNDWI" ? "Water / surface index" :
        product.product === "SURFACE_TEMPERATURE" ? "Ground-surface temperature" :
        product.product === "VV_BACKSCATTER" ? "Radar reflection strength" : product.product;
      const detail = product.product === "SURFACE_TEMPERATURE"
        ? "Kelvin · roughly 100 m thermal detail · not flame temperature" +
          (product.quality && product.quality.st_qa_status === "not_available_from_catalogue" ? " · uncertainty band unavailable" : "")
        : escapeHtml(product.units || "—") + " · " + fmt(product.resolution_m) + " m pixels";
      return '<article class="product-card-ui"><strong>' + escapeHtml(label) + '</strong>' +
        (previewUrl ? '<img loading="lazy" src="' + escapeHtml(previewUrl) + '" alt="' + escapeHtml(label + " preview") + '">' : '') +
        '<p>' + escapeHtml(safeText(product.source_id)) + ' · ' + dateFmt(product.acquired_at) + '</p>' +
        '<p>' + detail + '</p><p>' + fmt(product.valid_pixel_pct) + '% of study-area pixels had usable data</p>' +
        (rasterUrl ? '<a href="' + escapeHtml(rasterUrl) + '" target="_blank" rel="noreferrer">Open data file ↗</a>' : '') +
        '</article>';
    }).join("");
  } catch (error) {
    root.innerHTML = '<div class="source-empty">Image products could not be loaded. The satellite catalogue is still available above.</div>';
  }
}

function renderChanges(manifest) {
  const root = document.getElementById("change-grid");
  const changes = Array.isArray(manifest.change_products) ? manifest.change_products : [];
  const skipped = Array.isArray(manifest.change_analysis_skips) ? manifest.change_analysis_skips : [];
  if (!changes.length) {
    root.innerHTML = '<div class="source-empty">No change map passed the minimum evidence checks in this run. The dashboard will not display a comparison based on too few usable pixels.</div>' +
      skipped.map(item => '<article class="warning-item"><strong>' + escapeHtml(safeText(item.source_id) + ' · ' + safeText(item.product)) + '</strong>' +
        escapeHtml(safeText(item.reason)) + '<br><span class="status-warn">Usable pixels: ' + fmt(item.valid_pixel_count) +
        ' / minimum required: ' + fmt(item.required_pixel_count) + '</span></article>').join("");
    return;
  }
  const cards = changes.map(change => {
    const preview = (change.assets || []).find(asset => asset.role === "preview");
    const previewUrl = preview ? new URL(preview.href, window.location.href).toString() : "";
    const stats = change.statistics || {};
    const unit = safeText(change.units, "product units");
    const statisticText = [
      "Median difference: " + safeText(stats.median, "—") + " " + unit,
      "Mean absolute difference: " + safeText(stats.mean_absolute_change, "—") + " " + unit,
      "95th percentile absolute difference: " + safeText(stats.p95_absolute_change, "—") + " " + unit
    ].join(" · ");
    return '<article class="product-card-ui"><strong>' + escapeHtml(safeText(change.product)) + ' · before / after</strong>' +
      (previewUrl ? '<img loading="lazy" src="' + escapeHtml(previewUrl) + '" alt="Exploratory change map for ' + escapeHtml(safeText(change.product)) + '">' : '') +
      '<p>' + escapeHtml(safeText(change.source_id)) + ' · ' + dateFmt(change.from_date) + ' → ' + dateFmt(change.to_date) + '</p>' +
      '<p>' + escapeHtml(statisticText) + '</p>' +
      '<p>Common valid pixels: ' + fmt(change.valid_pixel_pct) + '% (' + fmt(change.valid_pixel_count) + ' pixels; minimum ' + fmt(change.required_pixel_count) + ')</p>' +
      '<p class="status-warn">Exploratory only · co-registration and independent reference checks are not complete.</p>' +
      (previewUrl ? '<a href="' + escapeHtml(previewUrl) + '" target="_blank" rel="noreferrer">Open comparison image ↗</a>' : '') +
      '</article>';
  }).join("");
  const skippedNotes = skipped.map(item => '<article class="warning-item"><strong>' +
    escapeHtml(safeText(item.source_id) + ' · ' + safeText(item.product)) + '</strong>' +
    escapeHtml(safeText(item.reason)) + '<br><span class="status-warn">Usable pixels: ' +
    fmt(item.valid_pixel_count) + ' / minimum required: ' + fmt(item.required_pixel_count) + '</span></article>').join("");
  root.innerHTML = cards + skippedNotes;
}

function renderQuality(manifest) {
  const root = document.getElementById("quality-summary");
  const warningRoot = document.getElementById("warning-list");
  const products = manifest.change_products || [];
  const validation = manifest.scientific_validation || {};
  const temperatureStatus = validation.temperature && validation.temperature.status || "not_independently_validated";
  const boundaryStatus = validation.boundary && validation.boundary.status || "visual_review_only";
  const changeStatus = validation.change_detection && validation.change_detection.status || "exploratory_only";
  root.innerHTML = '<span class="quality-chip">Boundary: ' + escapeHtml(boundaryStatus.replaceAll("_", " ")) + '</span>' +
    '<span class="quality-chip">Temperature: ' + escapeHtml(temperatureStatus.replaceAll("_", " ")) + '</span>' +
    '<span class="quality-chip">Change analysis: ' + escapeHtml(changeStatus.replaceAll("_", " ")) + '</span>' +
    '<span class="quality-chip">' + fmt(products.length) + ' comparison maps published</span>';
  fetch(new URL("./products/index.json", window.location.href), {cache:"no-store"})
    .then(r => { if (!r.ok) throw new Error("index unavailable"); return r.json(); })
    .then(index => {
      const warnings = Array.isArray(index.warnings) ? index.warnings : [];
      const errors = Array.isArray(index.errors) ? index.errors : [];
      if (!warnings.length && !errors.length) {
        warningRoot.innerHTML = '<div class="warning-item"><strong>No processing warnings in the latest run</strong>This means the processing checks passed; it is not the same as independent scientific validation.</div>';
        return;
      }
      const explainWarning = warning => {
        const reason = safeText(warning.reason || warning.error).replace(/^ValueError:\\s*/, "");
        if (/clear-pixel coverage after (QA|SCL) mask=0\\.0%/i.test(reason)) {
          return "The satellite image covered the study area, but cloud, shadow or other quality checks left no usable pixels. The product was safely skipped.";
        }
        if (/ST_QA uncertainty band unavailable/i.test(reason)) {
          return "The temperature uncertainty layer was not available for this scene. The image is not treated as independently uncertainty-screened.";
        }
        return reason;
      };
      warningRoot.innerHTML = [...warnings.map(w => ({...w,kind:"Skipped product"})), ...errors.map(e => ({...e,kind:"Processing error"}))]
        .map(w => '<div class="warning-item"><strong>' + escapeHtml(w.kind + " · " + safeText(w.source_id) + " · " + safeText(w.product || w.scene_id)) +
          '</strong>' + escapeHtml(safeText(w.scene_id)) + '<br>' + escapeHtml(explainWarning(w)) +
          '<br><span class="status-warn">This scene was not used for that product; no missing values were invented.</span></div>').join("");
    })
    .catch(() => { warningRoot.innerHTML = '<div class="warning-item">The latest processing notes could not be loaded.</div>'; });
}

async function loadManifest() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest not published");
    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.observations) || !Array.isArray(manifest.sources)) throw new Error("Manifest schema is not recognized");
    renderAoi(manifest.aoi);
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
    renderFireStatus(manifest);
    renderChanges(manifest);
    await renderProducts();
    renderQuality(manifest);
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
