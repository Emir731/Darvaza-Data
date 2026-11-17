(() => {
  "use strict";
  const AOI = { lat: 40.252, lng: 58.439 };
  const manifestUrl = new URL("./manifest.json", location.href).toString();

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
  function renderSceneProduct(item, productName) {
    const previewRoot = $("scene-preview");
    if (!previewRoot) return;
    previewRoot.replaceChildren();
    const assets = Array.isArray(item.assets) ? item.assets : [];
    const slug = String(productName || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const previews = assets.filter(a => a.role === "preview" && a.href);
    const preview = previews.find(a => a.href.toLowerCase().includes("_" + slug + ".png"))
      || previews.find(a => String(a.title || "").toLowerCase().includes(String(productName || "").toLowerCase()))
      || (previews.length ? previews[0] : null);
    if (!preview) {
      const note = document.createElement("div");
      note.className = "preview-empty";
      note.textContent = "No processed raster preview is published for this catalogue record.";
      previewRoot.append(note);
      return;
    }
    const previewUrl = new URL(preview.href, manifestUrl).toString();
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = `${productName || item.source_id} raster preview from ${fmtDate(item.acquired_at)}`;
    image.loading = "lazy";
    const previewLink = document.createElement("a");
    previewLink.href = previewUrl;
    previewLink.target = "_blank";
    previewLink.rel = "noreferrer";
    previewLink.textContent = "OPEN PREVIEW ↗";
    previewRoot.append(image, previewLink);
    const product = (item.products || []).find(p => p.product === productName);
    if (product) {
      const quality = document.createElement("small");
      quality.className = "preview-quality";
      quality.textContent = `${product.product} · ${product.units} · ${product.valid_pixel_pct}% valid AOI pixels · ${product.resolution_m} m`;
      previewRoot.append(quality);
    }
    const cog = assets.find(a => a.role === "cog" && a.href
      && a.href.toLowerCase().includes("_" + slug + ".tif"));
    if (cog) {
      const download = document.createElement("a");
      download.href = new URL(cog.href, manifestUrl).toString();
      download.target = "_blank";
      download.rel = "noreferrer";
      download.textContent = "OPEN CLOUD-OPTIMIZED GEOTIFF ↗";
      previewRoot.append(download);
    }
  }

  function selectObservation(index) {
    const item = observations[index];
    if (!item) return;
    $("selected-date").textContent = fmtDate(item.acquired_at);
    const isProcessed = Boolean(item.processed_at);
    $("date-state").textContent = isProcessed ? "PROCESSED RASTER OBSERVATION" : "CATALOGUE RECORD · NOT PROCESSED";
    $("sensor").textContent = item.source_id || "—";
    $("scene").textContent = item.scene_id || "—";
    const productList = Array.isArray(item.products) ? item.products : [];
    $("processing").textContent = isProcessed
      ? productList.map(p => p.product).join(", ") || item.processing_version || "Processed"
      : "Discovery only";
    $("cloud").textContent = item.cloud_cover_pct == null ? "Not reported" : `${item.cloud_cover_pct}%`;
    const select = $("product-select");
    if (select) {
      select.replaceChildren();
      if (productList.length) {
        productList.forEach(p => select.add(new Option(
          `${p.product} · ${p.units} · ${p.valid_pixel_pct}% valid`, p.product
        )));
        select.disabled = false;
        select.onchange = () => renderSceneProduct(item, select.value);
        renderSceneProduct(item, productList[0].product);
      } else {
        select.add(new Option("No processed product", ""));
        select.disabled = true;
        renderSceneProduct(item, null);
      }
    }
  }
  async function loadData() {
    const manifestResult = await Promise.allSettled([fetch(manifestUrl)]).then(x => x[0]);
    if (manifestResult.status === "fulfilled" && manifestResult.value.ok) {
      const data = await manifestResult.value.json();
      observations = Array.isArray(data.observations) ? data.observations : [];
      window.__darvazaAoi = data.aoi || null;
      window.__darvazaProducts = Array.isArray(data.change_products) ? data.change_products : [];
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
    const products = Array.isArray(window.__darvazaProducts) ? window.__darvazaProducts : [];
    const processed = observations.filter(x => Boolean(x.processed_at)).length;
    const rasterProducts = observations.reduce((sum, x) => sum + (Array.isArray(x.products) ? x.products.length : 0), 0);
    $("product-state").textContent = `${processed} processed observation(s); ${rasterProducts} raster product(s); ${products.length} experimental change product(s).`;
    const productRoot = $("product-list");
    if (productRoot) {
      productRoot.replaceChildren();
      products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";
        const heading = document.createElement("strong");
        heading.textContent = `${product.source_id} · ${product.product}`;
        const dates = document.createElement("p");
        dates.textContent = `${fmtDate(product.from_date)} → ${fmtDate(product.to_date)}`;
        const caveat = document.createElement("small");
        caveat.textContent = product.caveat || "Experimental pixel-value difference; interpret with care.";
        card.append(heading, dates, caveat);
        const preview = (product.assets || []).find(a => a.role === "preview");
        if (preview) {
          const link = document.createElement("a");
          link.href = new URL(preview.href, manifestUrl).toString(); link.target = "_blank"; link.rel = "noreferrer";
          link.textContent = "OPEN CHANGE PREVIEW ↗";
          card.append(link);
        }
        productRoot.append(card);
      });
      if (!products.length) productRoot.textContent = "No valid same-sensor before/after pair is available yet.";
    }
  }
  initGlobe();
  loadData().catch(() => { $("date-state").textContent = "DATA FEED UNAVAILABLE"; });
})();
