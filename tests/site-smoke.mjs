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
    await page.waitForFunction(() => document.documentElement.dataset.dataStatus === "live", null, { timeout: 20000 }).catch(() => {
      failures.push(`${viewport.name}: public manifest did not load`);
    });
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")];
      return images.length >= 20 && images.every(img => img.complete && img.naturalWidth > 0);
    }, null, { timeout: 30000 }).catch(() => {
      failures.push(`${viewport.name}: published raster preview images did not all load`);
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
      rasterRoot: !!document.querySelector("#raster-products"),
      rasterScenes: document.querySelectorAll(".raster-scene-card").length,
      rasterPreviews: document.querySelectorAll(".raster-scene-card .raster-preview-link img").length,
      rasterLoaded: [...document.querySelectorAll(".raster-scene-card .raster-preview-link img")].filter(img => img.complete && img.naturalWidth > 0).length,
      dataStatus: document.documentElement.dataset.dataStatus || "",
      mobileButtonVisible: !!document.querySelector("#mobile-menu-toggle") && getComputedStyle(document.querySelector("#mobile-menu-toggle")).display !== "none",
    }));
    if (!state.title.includes("Darvaza Watch")) failures.push(`${viewport.name}: unexpected document title`);
    if (!state.h1) failures.push(`${viewport.name}: main heading missing`);
    if (state.mapWidth < 250 || state.mapHeight < 100) failures.push(`${viewport.name}: map container has invalid dimensions`);
    if (state.documentWidth > state.viewportWidth + 2) failures.push(`${viewport.name}: horizontal page overflow (${state.documentWidth}px > ${state.viewportWidth}px)`);
    if (!state.leaflet) failures.push(`${viewport.name}: Leaflet map root missing`);
    if (!state.mapLocked) failures.push(`${viewport.name}: satellite map interaction lock is not active`);
    if (!state.globeRoot || !state.rasterRoot) failures.push(`${viewport.name}: expected observatory components missing`);
    if (state.rasterScenes < 5) failures.push(`${viewport.name}: expected at least five processed scene cards, found ${state.rasterScenes}`);
    if (state.rasterPreviews < 20) failures.push(`${viewport.name}: expected at least twenty raster previews, found ${state.rasterPreviews}`);
    if (state.rasterLoaded < 20) failures.push(`${viewport.name}: raster preview assets did not all load (${state.rasterLoaded}/20)`);
    if (state.dataStatus !== "live") failures.push(`${viewport.name}: manifest state is ${state.dataStatus}`);
    if (viewport.name === "mobile" && !state.mobileButtonVisible) failures.push("mobile: navigation toggle is not visible");
    if (pageErrors.length) failures.push(`${viewport.name}: runtime errors: ${pageErrors.join("; ")}`);

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
