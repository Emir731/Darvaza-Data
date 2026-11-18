import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8000/";

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 900, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    if (baseUrl.startsWith("http://127.0.0.1")) {
      await page.route("**/manifest.json", async route => {
        const live = await page.request.get("https://emir731.github.io/Darvaza-Data/manifest.json");
        if (!live.ok()) {
          await route.fulfill({ status: live.status(), body: await live.text() });
          return;
        }
        const manifest = await live.json();
        for (const observation of manifest.observations || []) {
          for (const asset of observation.assets || []) {
            if (typeof asset.href === "string" && asset.href.startsWith("assets/")) {
              asset.href = "https://emir731.github.io/Darvaza-Data/" + asset.href;
            }
          }
        }
        for (const pair of manifest.change_products || manifest.before_after_pairs || []) {
          for (const [key, href] of Object.entries(pair.assets || {})) {
            if (typeof href === "string" && href.startsWith("assets/")) {
              pair.assets[key] = "https://emir731.github.io/Darvaza-Data/" + href;
            }
          }
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(manifest),
        });
      });
    }
    const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    if (!response || response.status() !== 200) failures.push(`${viewport.name}: page did not return HTTP 200`);
    await page.waitForSelector("#map", { timeout: 10000 });
    await page.waitForFunction(() => window.L && document.querySelector("#crater-satellite.leaflet-container"), null, { timeout: 20000 }).catch(() => {
      failures.push(`${viewport.name}: Leaflet map did not initialize`);
    });
    await page.waitForFunction(() => {
      const tiles = [...document.querySelectorAll("#crater-satellite img.leaflet-tile")];
      return tiles.some(tile => tile.complete && tile.naturalWidth > 0);
    }, null, { timeout: 30000 }).catch(() => {
      failures.push(`${viewport.name}: no satellite or fallback map tile loaded`);
    });
    await page.waitForFunction(() => document.documentElement.dataset.dataStatus === "live", null, { timeout: 20000 }).catch(() => {
      failures.push(`${viewport.name}: public manifest did not load`);
    });
    // The UI intentionally lazy-loads previews; make them eager in the test so every published URL is checked.
    await page.evaluate(() => {
      for (const img of document.querySelectorAll(".raster-scene-card .raster-preview-link img")) {
        img.loading = "eager";
      }
    });
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")];
      const loaded = images.filter(img => img.complete && img.naturalWidth > 0).length;
      return images.length >= 20 && loaded >= Math.ceil(images.length * 0.95);
    }, null, { timeout: 30000 }).catch(async () => {
      await page.evaluate(() => {
        for (const img of document.querySelectorAll(".raster-scene-card .raster-preview-link img")) {
          if (!img.complete || !img.naturalWidth) {
            img.loading = "eager";
            const url = img.src;
            img.src = "";
            img.src = url;
          }
        }
      });
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")];
        const loaded = images.filter(img => img.complete && img.naturalWidth > 0).length;
        return images.length >= 20 && loaded >= Math.ceil(images.length * 0.95);
      }, null, { timeout: 20000 }).catch(() => {
        failures.push(`${viewport.name}: fewer than 95% of published raster previews loaded`);
      });
    });
    await page.waitForFunction(() => ["#change-before-image", "#change-after-image", "#change-delta-image"].every(sel => { const img = document.querySelector(sel); return img && img.complete && img.naturalWidth > 0; }), null, { timeout: 30000 }).catch(() => { failures.push(`${viewport.name}: comparison raster previews did not load`); });
    const expected = await page.evaluate(async () => {
      const m = await (await fetch("./manifest.json", { cache: "no-store" })).json();
      const processed = (m.observations || []).filter(x => x.processed_at && String(x.processing_version || "").startsWith("landsat-environmental/"));
      const pairs = m.change_products || m.before_after_pairs || [];
      const pairAssets = pairs.flatMap(p => Object.values(p.assets || {})).filter(v => typeof v === "string");
      const sceneAssets = processed.reduce((n, x) => n + (x.assets || []).filter(a => a.role === "preview" || a.role === "cog").length, 0);
      return { observations: (m.observations || []).length, processed: processed.length, rasterAssets: sceneAssets + pairAssets.length, pairCount: pairs.length };
    });
    const state = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      mapWidth: document.querySelector("#map")?.getBoundingClientRect().width || 0,
      mapHeight: document.querySelector("#map")?.getBoundingClientRect().height || 0,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      leaflet: !!document.querySelector("#crater-satellite.leaflet-container"),
      mapLocked: document.querySelector("#crater-satellite")?.dataset.mapLocked === "true",
      globeRoot: !!document.querySelector("#earth-globe"),
      globeLocked: document.querySelector("#earth-globe")?.dataset.controlsLocked === "true",
      globeLat: Number(document.querySelector("#earth-globe")?.dataset.centerLat),
      globeLon: Number(document.querySelector("#earth-globe")?.dataset.centerLon),
      mapTilesLoaded: [...document.querySelectorAll("#crater-satellite img.leaflet-tile")].filter(tile => tile.complete && tile.naturalWidth > 0).length,
      rasterRoot: !!document.querySelector("#raster-products"),
      catalogueCount: Number(document.querySelector("#metric-observations")?.textContent),
      processedCount: Number(document.querySelector("#metric-processed")?.textContent),
      rasterAssetCount: Number(document.querySelector("#metric-products")?.textContent),
      analysisStatus: document.querySelector("#analysis-status")?.textContent || "",
      rasterScenes: document.querySelectorAll(".raster-scene-card").length,
      rasterPreviews: document.querySelectorAll(".raster-scene-card .raster-preview-link img").length,
      rasterLoaded: [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")].filter(img => img.complete && img.naturalWidth > 0).length,
      rasterMissing: [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")].filter(img => !img.complete || !img.naturalWidth).map(img => img.getAttribute("src")),
      dataStatus: document.documentElement.dataset.dataStatus || "",
      mobileButtonVisible: !!document.querySelector("#mobile-menu-toggle") && getComputedStyle(document.querySelector("#mobile-menu-toggle")).display !== "none",
      changeViewerVisible: !!document.querySelector("#change-viewer") && !document.querySelector("#change-viewer").hidden,
      changeEmptyVisible: !!document.querySelector("#change-empty") && !document.querySelector("#change-empty").hidden,
      changePairOptions: document.querySelectorAll("#change-pair-select option").length,
      changeImagesLoaded: ["#change-before-image", "#change-after-image", "#change-delta-image"].filter(sel => { const img = document.querySelector(sel); return img && img.complete && img.naturalWidth > 0; }).length,
    }));
    if (!state.title.includes("Darvaza Watch")) failures.push(`${viewport.name}: unexpected document title`);
    if (!state.h1) failures.push(`${viewport.name}: main heading missing`);
    if (state.mapWidth < 250 || state.mapHeight < 100) failures.push(`${viewport.name}: map container has invalid dimensions`);
    if (state.documentWidth > state.viewportWidth + 2) failures.push(`${viewport.name}: horizontal page overflow (${state.documentWidth}px > ${state.viewportWidth}px)`);
    if (!state.leaflet) failures.push(`${viewport.name}: Leaflet map root missing`);
    if (state.mapTilesLoaded < 1) failures.push(`${viewport.name}: no map tiles loaded`);
    if (!state.mapLocked) failures.push(`${viewport.name}: satellite map interaction lock is not active`);
    if (!state.globeRoot || !state.rasterRoot) failures.push(`${viewport.name}: expected observatory components missing`);
    if (!state.globeLocked) failures.push(`${viewport.name}: 3D globe controls are not locked`);
    if (Math.abs(state.globeLat - 40.25258) > 0.0001 || Math.abs(state.globeLon - 58.43933) > 0.0001) failures.push(`${viewport.name}: globe is not centered on Darvaza`);
    if (state.catalogueCount !== 154) failures.push(`${viewport.name}: expected 154 live catalogue observations, found ${state.catalogueCount}`);
    if (state.processedCount !== 5) failures.push(`${viewport.name}: expected five processed Landsat scenes, found ${state.processedCount}`);
    if (state.rasterAssetCount !== expected.rasterAssets) failures.push(`${viewport.name}: expected ${expected.rasterAssets} published raster assets, found ${state.rasterAssetCount}`);
    if (state.rasterScenes !== 5) failures.push(`${viewport.name}: expected five processed scene cards, found ${state.rasterScenes}`);
    if (state.rasterPreviews !== 20) failures.push(`${viewport.name}: expected twenty raster previews, found ${state.rasterPreviews}`);
    if (state.rasterLoaded !== 20) failures.push(`${viewport.name}: all 20 raster previews must load (${state.rasterLoaded}/20)`);
    if (!state.analysisStatus.includes("EXPLORATORY RASTERS PUBLISHED")) failures.push(`${viewport.name}: analysis status still reports no raster products`);
    if (expected.pairCount < 1) failures.push(`${viewport.name}: no published before/after pairs are available`);
    if (!state.changeViewerVisible || state.changeEmptyVisible) failures.push(`${viewport.name}: before/after viewer did not activate from published pairs`);
    if (state.changePairOptions !== expected.pairCount) failures.push(`${viewport.name}: expected ${expected.pairCount} date-pair options, found ${state.changePairOptions}`);
    if (state.changeImagesLoaded !== 3) failures.push(`${viewport.name}: comparison images failed to load (${state.changeImagesLoaded}/3)`);
    if (state.dataStatus !== "live") failures.push(`${viewport.name}: manifest state is ${state.dataStatus}`);
    if (viewport.name === "mobile" && !state.mobileButtonVisible) failures.push("mobile: navigation toggle is not visible");
    if (pageErrors.length) failures.push(`${viewport.name}: runtime errors: ${pageErrors.join("; ")}`);
    if (state.changeViewerVisible && state.changeImagesLoaded === 3) {
      await page.locator("#change-divider").evaluate(el => { el.value = "35"; el.dispatchEvent(new Event("input", { bubbles: true })); });
      const clip = await page.locator("#change-after-image").evaluate(el => el.style.clipPath);
      if (!clip.includes("35%")) failures.push(`${viewport.name}: comparison divider did not update`);
      await page.locator("#change-delta-toggle").click();
      if (!(await page.locator("#change-delta-panel").isVisible())) failures.push(`${viewport.name}: difference layer did not open`);
    }

    if (viewport.name === "mobile" && state.mobileButtonVisible) {
      await page.locator("#mobile-menu-toggle").click();
      const opened = await page.locator("body").evaluate(el => el.classList.contains("nav-open"));
      if (!opened) failures.push("mobile: navigation did not open");
      await page.locator('.nav-link[href="#observations"]').click();
      const closed = await page.locator("body").evaluate(el => !el.classList.contains("nav-open"));
      if (!closed) failures.push("mobile: navigation did not close after selection");
    }
    console.log(`PASS-CHECK ${viewport.name}: ${JSON.stringify(state)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error("SITE SMOKE TEST FAILURES:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}
console.log("PASS: desktop, tablet, and mobile browser smoke checks");
