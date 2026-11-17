const { test, expect } = require('@playwright/test');

const sizes = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
];

for (const size of sizes) {
  for (let pass = 1; pass <= 5; pass += 1) {
    test(`dashboard ${size.name} pass ${pass}/5`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });

      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('#overview')).toBeVisible();
      await expect(page.locator('#map')).toBeAttached();

      for (const id of [
        'observations',
        'sources',
        'fire-watch',
        'products',
        'change-analysis',
        'quality',
        'guide',
        'method'
      ]) {
        await expect(page.locator('#' + id)).toBeAttached();
      }

      await expect(page.locator('#metric-observations')).not.toHaveText('—', {
        timeout: 20000
      });

      await page.locator('#map-satellite').click();
      await expect(page.locator('#map-satellite')).toHaveClass(/active/);
      await page.locator('#map-street').click();
      await expect(page.locator('#map-street')).toHaveClass(/active/);

      if (size.name === 'mobile') {
        const widths = await page.evaluate(() => ({
          view: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth
        }));
        expect(widths.page).toBeLessThanOrEqual(widths.view + 2);
      }

      expect(errors).toEqual([]);
    });

    test(`Planet View ${size.name} pass ${pass}/5`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });

      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/globe.html', { waitUntil: 'domcontentloaded' });

      await expect.poll(
        () => page.evaluate(() => Boolean(window.__darvazaGlobeControls)),
        { timeout: 30000 }
      ).toBe(true);

      const flags = await page.evaluate(() => ({
        rotate: window.__darvazaGlobeControls.enableRotate,
        pan: window.__darvazaGlobeControls.enablePan,
        zoom: window.__darvazaGlobeControls.enableZoom,
        auto: window.__darvazaGlobeControls.autoRotate
      }));
      expect(flags).toEqual({
        rotate: false,
        pan: false,
        zoom: true,
        auto: false
      });

      await expect(page.locator('#globe canvas')).toBeVisible();
      await expect(page.locator('#date-select')).toBeAttached();
      await expect(page.locator('#product-select')).toBeAttached();

      const before = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      await page.locator('#globe-zoom-in').click();
      await expect.poll(
        () => page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude)
      ).toBeLessThan(before.altitude);

      const zoomed = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      await page.locator('#globe-zoom-out').click();
      await expect.poll(
        () => page.evaluate(() => window.__darvazaGlobe.pointOfView().altitude)
      ).toBeGreaterThan(zoomed.altitude);

      const center = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      const canvas = page.locator('#globe canvas');
      const bounds = await canvas.boundingBox();

      if (bounds) {
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(
          bounds.x + bounds.width / 2 + 90,
          bounds.y + bounds.height / 2 + 45
        );
        await page.mouse.up();
      }

      const after = await page.evaluate(() => window.__darvazaGlobe.pointOfView());
      expect(Math.abs(after.lat - center.lat)).toBeLessThan(0.001);
      expect(Math.abs(after.lng - center.lng)).toBeLessThan(0.001);

      if (size.name === 'mobile') {
        const widths = await page.evaluate(() => ({
          view: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth
        }));
        expect(widths.page).toBeLessThanOrEqual(widths.view + 2);
        await expect(page.locator('#globe')).toHaveCSS('touch-action', 'none');
      }

      expect(errors).toEqual([]);
    });
  }
}
