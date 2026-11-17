const { test, expect } = require("@playwright/test");

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

for (const viewport of viewports) {
  for (let pass = 1; pass <= 5; pass += 1) {
    test(`dashboard ${viewport.name} pass ${pass}/5`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "domcontentloaded" });
      await expect(page.locator("#overview")).toBeVisible();
      await expect(page.locator("#map")).toBeAttached();
      for (const id of ["observations","sources","fire-watch","products","change-analysis","quality","guide","method"]) {
        await expect(page.locator("#" + id)).toBeAttached();
      }
      await expect(page.locator("#metric-observations")).not.toHaveText("—", { timeout: 20000 });
      await page.locator("#map-satellite").click();
      await expect(page.locator("#map-satellite")).toHaveClass(/active/);
      await page.locator("#map-street").click();
      await expect(page.locator("#map-street")).toHaveClass(/active/);
      if (viewport.name === "mobile") {
        const widths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth
        }));
        expect(widths.content).toBeLessThanOrEqual(widths.viewport + 2);
      }
      expect(pageErrors).toEqual([]);
    });

    test(`Planet View ${viewport.name} pass ${pass}/5`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.goto("http://127.0.0.1:4173/globe.html", { waitUntil: "domcontentloaded" });
      await expect.poll(() => page.evaluate(() => Boolean(window.__darvazaGlobeControls)), { timeout: 30000 }).toBe(true);
      const flags = await page.evaluate(() => ({
        rotate: window.__darvazaGlobeControls.enableRotate,
        pan: window.__darvazaGlobeControls.enablePan,
        zoom: window.__darvazaGlobeControls.enableZoom,
        autoRotate: window.__darvazaGlobeControls.autoRotate
      }));
      expect(flags).toEqual({ rotate: false, pan: false, zoom: true, autoRotate: false });
      const before = await page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude);
      await page.locator("#globe-zoom-in").click();
      await expect.poll(() => page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude)).toBeLessThan(before);
      const zoomed = await page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude);
      await page.locator("#globe-zoom-out").click();
      await expect.poll(() => page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude)).toBeGreaterThan(zoomed);
      const centerBefore = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      const canvas = page.locator("#globe canvas");
      const bounds = await canvas.boundingBox();
      if (bounds) {
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 90, bounds.y + bounds.height / 2 + 45);
        await page.mouse.up();
      }
      const centerAfter = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      expect(Math.abs(centerAfter.lat - centerBefore.lat)).toBeLessThan(0.001);
      expect(Math.abs(centerAfter.lng - centerBefore.lng)).toBeLessThan(0.001);
      await expect(page.locator("#date-select")).toBeAttached();
      await expect(page.locator("#product-select")).toBeAttached();
      if (viewport.name === "mobile") {
        const widths = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth
        }));
        expect(widths.content).toBeLessThanOrEqual(widths.viewport + 2);
      }
      expect(pageErrors).toEqual([]);
    });
  }
}
