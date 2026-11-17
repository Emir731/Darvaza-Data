# Darvaza Watch

A static, GitHub Pages-hosted observatory dashboard for satellite catalogue observations around the Darvaza gas crater, Turkmenistan.

## Website

The site is plain HTML, CSS and JavaScript. It does not require a paid builder, Node.js build step, backend server, or client-side API keys.

- `index.html`: dashboard structure
- `styles.css`: responsive design system
- `app.js`: map, manifest loading and data rendering
- `manifest.json`: published automatically by Darvaza-Pipeline

The dashboard reads `manifest.json` from this repository. Until the first manifest is published, it displays an explicit empty state rather than invented measurements.

## Enable GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The `Deploy Darvaza Watch` workflow deploys on pushes to `main`.

After the first successful deployment, the site is available at:

`https://emir731.github.io/Darvaza-Data/`

## Connect the automated data pipeline

In the private `Emir731/Darvaza-Pipeline` repository, open **Settings → Secrets and variables → Actions** and add:

- Repository variable: `DATA_REPOSITORY` = `Emir731/Darvaza-Data`
- Repository secret: `DATA_REPO_TOKEN` = a fine-grained token scoped only to this repository, with **Contents: Read and write**.

Keep the token in GitHub Secrets. Never paste it into source files, issues, or chat.

The pipeline also uses the optional `FIRMS_MAP_KEY` secret for NASA FIRMS hotspot detections.

## Current scientific scope

The pipeline currently discovers catalogue metadata for Landsat 8/9, Sentinel-1 and Sentinel-2, and optionally retrieves FIRMS point detections. The dashboard labels catalogue-only observations as **DISCOVERY ONLY**.

No calibrated raster processing, co-registration, cloud/shadow masking, validated change products, or time series are claimed yet. FIRMS detections are not crater-temperature measurements. The dashboard will show processed-scene and change-product counts as zero until those products are actually generated and validated.

## Design

The interface uses a restrained dark observatory palette, one amber accent, consistent corner radius, no gradients, no drop shadows, no hover-dependent behavior, no scroll-triggered animations, and responsive layouts. Satellite thumbnails are only shown when real preview assets are present in the manifest.
