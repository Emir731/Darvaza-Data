(() => {
  'use strict';

  const aoi = { lat: 40.252, lng: 58.439 };
  const manifestUrl = new URL('./manifest.json', location.href).toString();
  const $ = id => document.getElementById(id);
  let data = [];
  let globe = null;
  let altitude = 0.32;

  const fmtDate = value => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeZone: 'UTC'
    }).format(date);
  };

  function setZoom(value) {
    if (!globe) return;
    altitude = Math.max(0.18, Math.min(1.25, value));
    globe.pointOfView({
      lat: aoi.lat,
      lng: aoi.lng,
      altitude
    }, 260);
  }

  function initGlobe() {
    const host = $('globe');
    if (!window.Globe || !host) {
      $('globe-status').textContent = 'GLOBE LIBRARY UNAVAILABLE';
      return;
    }

    globe = Globe()(host)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('#080d12')
      .showAtmosphere(true)
      .atmosphereColor('#4a9fc4')
      .atmosphereAltitude(0.18)
      .pointsData([{
        lat: aoi.lat,
        lng: aoi.lng,
        color: '#d9a441',
        name: 'Darvaza gas crater'
      }])
      .pointAltitude(0.006)
      .pointRadius(0.12)
      .pointColor('color')
      .pointLabel(point => point.name)
      .ringsData([{
        lat: aoi.lat,
        lng: aoi.lng,
        maxR: 1.8,
        speed: 0.7,
        repeat: 1800
      }])
      .ringColor(() => time => `rgba(217,164,65,${1 - time})`)
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('speed')
      .ringRepeatPeriod('repeat');

    window.__darvazaGlobe = globe;
    globe.pointOfView({ ...aoi, altitude }, 0);

    const controls = globe.controls();
    window.__darvazaGlobeControls = controls;
    controls.autoRotate = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 1.18;
    controls.maxDistance = 2.25;
    controls.zoomSpeed = 0.7;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    $('globe-zoom-in').addEventListener('click', () => setZoom(altitude * 0.78));
    $('globe-zoom-out').addEventListener('click', () => setZoom(altitude / 0.78));
    $('globe-status').textContent = 'DARVAZA LOCKED · ZOOM ENABLED';

    const resize = () => {
      globe.width(host.clientWidth);
      globe.height(Math.max(300, host.clientHeight));
    };

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(host);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();
  }

  function showPreview(item, name) {
    const root = $('scene-preview');
    if (!root) return;
    root.replaceChildren();

    const assets = Array.isArray(item.assets) ? item.assets : [];
    const slug = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const previews = assets.filter(asset => asset.role === 'preview' && asset.href);
    const preview = previews.find(asset => asset.href.toLowerCase().includes('_' + slug + '.png'))
      || previews.find(asset => String(asset.title || '').toLowerCase().includes(String(name || '').toLowerCase()))
      || previews[0];

    if (!preview) {
      const note = document.createElement('p');
      note.className = 'preview-empty';
      note.textContent = 'No processed raster preview is published for this catalogue record.';
      root.append(note);
      return;
    }

    const url = new URL(preview.href, manifestUrl).toString();
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${name || item.source_id} preview from ${fmtDate(item.acquired_at)}`;
    img.loading = 'lazy';

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'OPEN PREVIEW ↗';
    root.append(img, link);

    const product = (item.products || []).find(row => row.product === name);
    if (product) {
      const info = document.createElement('small');
      info.className = 'preview-quality';
      info.textContent = `${product.product} · ${product.units} · ${product.valid_pixel_pct}% valid AOI pixels · ${product.resolution_m} m`;
      root.append(info);
    }

    const cog = assets.find(asset => asset.role === 'cog' && asset.href && asset.href.toLowerCase().includes('_' + slug + '.tif'));
    if (cog) {
      const download = document.createElement('a');
      download.href = new URL(cog.href, manifestUrl).toString();
      download.target = '_blank';
      download.rel = 'noreferrer';
      download.textContent = 'OPEN CLOUD-OPTIMIZED GEOTIFF ↗';
      root.append(download);
    }
  }

  function selectObservation(index) {
    const item = data[index];
    if (!item) return;

    $('selected-date').textContent = fmtDate(item.acquired_at);
    const processed = Boolean(item.processed_at);
    const products = Array.isArray(item.products) ? item.products : [];

    $('date-state').textContent = processed
      ? 'PROCESSED RASTER OBSERVATION'
      : 'CATALOGUE RECORD · NOT PROCESSED';
    $('sensor').textContent = item.source_id || '—';
    $('scene').textContent = item.scene_id || '—';
    $('processing').textContent = processed
      ? products.map(row => row.product).join(', ') || item.processing_version || 'Processed'
      : 'Discovery only';
    $('cloud').textContent = item.cloud_cover_pct == null ? 'Not reported' : `${item.cloud_cover_pct}%`;

    const select = $('product-select');
    select.replaceChildren();

    if (!products.length) {
      select.add(new Option('No processed product', ''));
      select.disabled = true;
      showPreview(item, null);
      return;
    }

    products.forEach(row => {
      select.add(new Option(`${row.product} · ${row.units} · ${row.valid_pixel_pct}% valid`, row.product));
    });
    select.disabled = false;
    select.onchange = () => showPreview(item, select.value);
    showPreview(item, products[0].product);
  }

  async function loadData() {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Manifest not published');

    const manifest = await response.json();
    data = Array.isArray(manifest.observations) ? manifest.observations : [];
    window.__darvazaAoi = manifest.aoi || null;
    window.__darvazaProducts = Array.isArray(manifest.change_products) ? manifest.change_products : [];

    if (globe && manifest.aoi && manifest.aoi.geometry) {
      const feature = {
        type: 'Feature',
        properties: { name: manifest.aoi.name || 'Darvaza Gas Crater' },
        geometry: manifest.aoi.geometry
      };
      globe.polygonsData([feature])
        .polygonGeoJsonGeometry(row => row.geometry)
        .polygonAltitude(0.008)
        .polygonCapColor(() => 'rgba(217,164,65,0.16)')
        .polygonSideColor(() => 'rgba(217,164,65,0.04)')
        .polygonStrokeColor(() => '#d9a441')
        .polygonLabel(row => row.properties.name);
    }

    data.sort((a, b) => new Date(b.acquired_at) - new Date(a.acquired_at));
    const select = $('date-select');
    select.replaceChildren();

    if (!data.length) {
      select.add(new Option('No catalogue observations available', ''));
      $('date-state').textContent = 'NO OBSERVATIONS PUBLISHED';
    } else {
      data.forEach((item, index) => {
        select.add(new Option(`${fmtDate(item.acquired_at)} · ${item.source_id}`, String(index)));
      });
      select.addEventListener('change', () => selectObservation(Number(select.value)));
      selectObservation(0);
    }

    const processed = data.filter(item => Boolean(item.processed_at)).length;
    const count = data.reduce((sum, item) => sum + (Array.isArray(item.products) ? item.products.length : 0), 0);
    const changes = window.__darvazaProducts;
    $('product-state').textContent = `${processed} processed observation(s); ${count} raster product(s); ${changes.length} experimental change product(s).`;

    const root = $('product-list');
    root.replaceChildren();
    changes.forEach(item => {
      const card = document.createElement('article');
      card.className = 'product-card';

      const title = document.createElement('strong');
      title.textContent = `${item.source_id} · ${item.product}`;

      const dates = document.createElement('p');
      dates.textContent = `${fmtDate(item.from_date)} → ${fmtDate(item.to_date)}`;

      const note = document.createElement('small');
      note.textContent = item.caveat || 'Experimental pixel-value difference; interpret with care.';
      card.append(title, dates, note);

      const preview = (item.assets || []).find(asset => asset.role === 'preview');
      if (preview) {
        const link = document.createElement('a');
        link.href = new URL(preview.href, manifestUrl).toString();
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'OPEN CHANGE PREVIEW ↗';
        card.append(link);
      }
      root.append(card);
    });

    if (!changes.length) {
      root.textContent = 'No valid same-sensor before/after pair is available yet.';
    }
  }

  initGlobe();
  loadData().catch(() => {
    $('date-state').textContent = 'DATA FEED UNAVAILABLE';
  });
})();
