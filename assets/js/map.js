/* =============================================================================
   Mesa Zoning Modernization — Interactive map (Leaflet)
   The centerpiece. Loads the real Mesa zoning polygons and recolors them by
   whether the selected use is allowed today vs. under the proposed amendments.
   ========================================================================== */

const MesaMap = (function () {
  let map, geoLayer, geojsonData = null;
  let baseStreet, baseSatellite;
  let mesaLabels = null, officialZoning = null;
  let councilLayer = null, councilLoaded = false;
  let loaded = false, loading = false;

  // City of Mesa GIS services (authoritative)
  const SVC = {
    labels: 'https://gis.mesaaz.gov/mesaaz/rest/services/Planning/PlanningLabels/MapServer',   // layer 1 = Zoning Labels
    zoning: 'https://gis.mesaaz.gov/mesaaz/rest/services/Planning/ZoningOverlay/MapServer',     // layer 1 = Zoning
  };

  let state = {
    use: 'light_fleet',
    scenario: 'proposed', // 'current' | 'proposed' | 'changes'
    basemap: 'street',
    labels: true,    // Mesa's authoritative zoning labels
    council: false,
    official: false, // Mesa's official zoning rendering (verification reference)
  };

  /* ---- base layers ------------------------------------------------------- */
  function buildBaseLayers() {
    baseStreet = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    );

    const imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }
    );
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, opacity: 0.9 }
    );
    baseSatellite = L.layerGroup([imagery, labels]);
  }

  /* ---- styling ----------------------------------------------------------- */
  function styleFor(code) {
    if (state.scenario === 'changes') {
      const c = getChange(state.use, code);
      switch (c.key) {
        case 'ADDED':     return poly(c.color, 0.8, 0.6, '#ffffff');
        case 'ACCESSORY': return poly(c.color, 0.78, 0.6, '#ffffff');
        case 'REMOVED':   return poly(c.color, 0.8, 0.7, '#ffffff');
        case 'SAME_YES':  return poly(c.color, 0.45, 0.3, '#ffffff');
        default:          return poly(c.color, 0.10, 0.15, '#b8c1cc');
      }
    }
    const s = getStatus(state.use, state.scenario, code);
    switch (s.key) {
      case 'P': return poly(s.color, 0.72, 0.5, '#ffffff');
      case 'A': return poly(s.color, 0.68, 0.5, '#ffffff');
      case 'NA': return poly(s.color, 0.07, 0.1, '#c4ccd6');
      default:  return poly(s.color, 0.12, 0.2, '#aab4bf');
    }
  }

  function poly(fill, fillOpacity, weight, stroke) {
    // stroke:true / fill:true must be explicit — otherwise, after the highlight
    // mode sets them false on a hidden polygon, setStyle merges would keep the
    // polygon invisible when it later becomes visible again.
    return { fill: true, fillColor: fill, fillOpacity, stroke: true, weight, color: stroke, opacity: 0.9 };
  }

  /* Highlight style used when "Official Mesa zoning" is on: translucent fill +
     bold same-color outline so Mesa's official rendering reads underneath while
     the proposed permissions / pending changes still stand out on top. Areas
     that are not relevant (or unchanged, in Changes view) are drawn invisibly so
     Mesa's official map shows through cleanly. */
  function highlightFor(code) {
    const hidden = { stroke: false, fill: false };
    if (state.scenario === 'changes') {
      const c = getChange(state.use, code);
      if (c.key === 'ADDED' || c.key === 'ACCESSORY' || c.key === 'REMOVED') {
        return { stroke: true, color: c.color, weight: 2.6, opacity: 1, fill: true, fillColor: c.color, fillOpacity: 0.25 };
      }
      return hidden; // unchanged → let official zoning show through
    }
    const s = getStatus(state.use, state.scenario, code);
    if (s.key === 'P' || s.key === 'A') {
      return { stroke: true, color: s.color, weight: 2.2, opacity: 1, fill: true, fillColor: s.color, fillOpacity: 0.22 };
    }
    return hidden; // not permitted → show official zoning underneath
  }

  function restyle() {
    if (!geoLayer) return;
    geoLayer.setStyle(function (f) {
      const code = f.properties.Zoning;
      return state.official ? highlightFor(code) : styleFor(code);
    });
    buildLegend();
    updateStats();
  }

  /* ---- popups ------------------------------------------------------------ */
  function popupHtml(code, descr) {
    const d = DISTRICTS[code];
    const name = d ? d.name : (descr || 'Other district');
    const group = d ? d.group : '—';
    const cur = getStatus(state.use, 'current', code);
    const pro = getStatus(state.use, 'proposed', code);
    const useLabel = USES[state.use].label;
    const chip = (s) =>
      `<span class="pp-chip" style="background:${s.color}">${s.key === 'NA' ? 'n/a' : s.key}</span> ${s.label}`;
    return `
      <div class="pp">
        <div class="pp-code">${code}</div>
        <div class="pp-name">${name}</div>
        <div class="pp-group">${group} district</div>
        <hr/>
        <div class="pp-use">${useLabel}</div>
        <div class="pp-row"><span>Today</span> ${chip(cur)}</div>
        <div class="pp-row"><span>Proposed</span> ${chip(pro)}</div>
      </div>`;
  }

  function onEachFeature(feature, layer) {
    layer.on('click', function () {
      const code = feature.properties.Zoning;
      layer
        .bindPopup(popupHtml(code, feature.properties.Description), { maxWidth: 280 })
        .openPopup();
    });
  }

  /* ---- legend & stats ---------------------------------------------------- */
  /* The legend is built from what is ACTUALLY painted on the map for the current
     use + view — never a static list. So a color a user can't find on the map
     (e.g. the amber "accessory" swatch for a use that has no accessory areas, or
     "No longer allowed" for a brand-new use that never existed) simply doesn't
     appear. Each category is tagged foreground ("active" — a permission/change
     the user is meant to spot) or background ("bg" — quiet not-allowed / no-change
     context) so the not-permitted state reads in a calm, non-overwhelming way. */
  function legendCandidates() {
    if (state.scenario === 'changes') {
      return [
        { item: CHANGE.ADDED,     bg: false },
        { item: CHANGE.ACCESSORY, bg: false },
        { item: CHANGE.REMOVED,   bg: false },
        { item: CHANGE.SAME_YES,  bg: true  },
        { item: CHANGE.SAME_NO,   bg: true  },
      ];
    }
    return [
      { item: STATUS.P,  bg: false },
      { item: STATUS.A,  bg: false },
      { item: STATUS.NA, bg: true  },
      { item: STATUS.N,  bg: true  },
    ];
  }

  /* Set of category keys genuinely drawn on the map right now (null = data not
     loaded yet, so the caller falls back to the full candidate list). */
  function presentLegendKeys() {
    if (!geojsonData) return null;
    const present = new Set();
    geojsonData.features.forEach((f) => {
      const code = f.properties.Zoning;
      const key = state.scenario === 'changes'
        ? getChange(state.use, code).key
        : getStatus(state.use, state.scenario, code).key;
      present.add(key);
    });
    return present;
  }

  /* Short plain-language line shown when there is nothing positive on the map —
     so "Heavy Fleet today" (a use that doesn't exist yet) or a use that's allowed
     nowhere reads intentionally, not broken. */
  function emptyLegendNote() {
    const label = USES[state.use].label;
    if (state.scenario === 'current') {
      return USES[state.use].isNew
        ? `<strong>${label}</strong> isn’t defined in Mesa’s code today. There’s nothing to map yet. Switch to <em>Proposed</em> to see where it would be allowed.`
        : `<strong>${label}</strong> isn’t permitted in any district today.`;
    }
    if (state.scenario === 'proposed') {
      return `<strong>${label}</strong> wouldn’t be permitted in any district.`;
    }
    return `No districts change for <strong>${label}</strong>.`;
  }

  function buildLegend() {
    const el = document.getElementById('map-legend');
    if (!el) return;
    const present = presentLegendKeys();
    const rows = present
      ? legendCandidates().filter((c) => present.has(c.item.key))
      : legendCandidates(); // still loading → placeholder until data arrives

    const hasActive = rows.some((r) => !r.bg);
    const swatches = rows
      .map((r) =>
        `<div class="lg-row${r.bg ? ' lg-row--bg' : ''}">` +
        `<span class="lg-sw" style="background:${r.item.color}"></span>${r.item.label}</div>`)
      .join('');

    const note = (!hasActive && present)
      ? `<p class="lg-empty">${emptyLegendNote()}</p>`
      : '';
    el.innerHTML = note + swatches;
  }

  function updateStats() {
    const el = document.getElementById('map-stats');
    if (!el || !geojsonData) return;
    let aAc = 0, aN = 0, rAc = 0, rN = 0, addAc = 0, addN = 0, remAc = 0, remN = 0;
    geojsonData.features.forEach((f) => {
      const code = f.properties.Zoning;
      if (!DISTRICTS[code]) return;
      const ac = f.properties.Acres || 0;
      if (state.scenario === 'changes') {
        const c = getChange(state.use, code).key;
        if (c === 'ADDED' || c === 'ACCESSORY') { addAc += ac; addN++; }
        if (c === 'REMOVED') { remAc += ac; remN++; }
      } else {
        const k = getStatus(state.use, state.scenario, code).key;
        if (k === 'P' || k === 'A') { aAc += ac; aN++; }
      }
    });
    const ac = (n) => Math.round(n).toLocaleString();
    if (state.scenario === 'changes') {
      el.innerHTML =
        `<span class="stat-up">▲ ${ac(addAc)} acres</span> newly allowed ` +
        `<span class="stat-sub">(${addN} zoning areas)</span><br>` +
        (remN
          ? `<span class="stat-down">▼ ${ac(remAc)} acres</span> no longer allowed <span class="stat-sub">(${remN} areas)</span>`
          : `<span class="stat-sub">No areas lose this use.</span>`);
    } else {
      const word = state.scenario === 'current' ? 'allow this use today' : 'would allow this use';
      el.innerHTML =
        `<strong>~${ac(aAc)} acres</strong> ${word}<br>` +
        `<span class="stat-sub">across ${aN.toLocaleString()} mapped zoning areas</span>`;
    }
  }

  /* ---- data load --------------------------------------------------------- */
  function loadData() {
    if (loaded || loading) return Promise.resolve();
    loading = true;
    const status = document.getElementById('map-loading');
    if (status) status.classList.remove('hidden');
    return fetch(MAP_CONFIG.geojsonUrl)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        geojsonData = data;
        geoLayer = L.geoJSON(data, {
          style: (f) => styleFor(f.properties.Zoning),
          onEachFeature,
        }).addTo(map);
        loaded = true;
        loading = false;
        if (status) status.classList.add('hidden');
        buildLegend();
        updateStats();
      })
      .catch((err) => {
        loading = false;
        if (status) {
          status.innerHTML =
            '⚠️ Could not load zoning data. Make sure the site is served over http (not opened as a file). <br><small>' +
            err.message +
            '</small>';
        }
      });
  }

  /* ---- authoritative City of Mesa zoning labels ------------------------- */
  /* We overlay Mesa's OWN "Zoning Labels" layer (PlanningLabels, sublayer 1)
     instead of hand-placing labels. This guarantees every district is labeled
     exactly where — and only at the zoom scales — Mesa shows it, so the labels
     always align with the shaded districts. f:'image' loads the export tile
     directly as an <img> (no cross-origin XHR needed).                       */
  function buildMesaLayers() {
    mesaLabels = L.esri.dynamicMapLayer({
      url: SVC.labels, layers: [1], f: 'image', format: 'png32',
      transparent: true, opacity: 1, pane: 'mlabels', attribution: 'Zoning labels &copy; City of Mesa',
    });
    officialZoning = L.esri.dynamicMapLayer({
      url: SVC.zoning, layers: [1], f: 'image', format: 'png32',
      transparent: true, opacity: 0.55, pane: 'official', attribution: 'Zoning &copy; City of Mesa',
    });
  }

  function applyMesaLabels() {
    if (!mesaLabels) return;
    if (state.labels) mesaLabels.addTo(map);
    else if (map.hasLayer(mesaLabels)) map.removeLayer(mesaLabels);
  }

  /* ---- council districts (toggle) --------------------------------------- */
  function loadCouncil() {
    if (councilLoaded) return Promise.resolve();
    return fetch('data/council_districts.geojson')
      .then((r) => r.json())
      .then((data) => {
        councilLayer = L.geoJSON(data, {
          pane: 'council',
          style: {
            color: '#0071B9', weight: 1.5, opacity: 0.5,
            fillColor: '#0071B9', fillOpacity: 0.025, dashArray: '2 5', lineCap: 'round',
          },
        });
        // district number labels
        data.features.forEach((f) => {
          const num = f.properties.DISTRICT;
          const c = L.geoJSON(f).getBounds().getCenter();
          L.marker(c, {
            icon: L.divIcon({ className: 'dlabel', html: 'District ' + num, iconSize: null }),
            interactive: false, keyboard: false, pane: 'council',
          }).addTo(councilLayer);
        });
        councilLoaded = true;
      })
      .catch(() => {});
  }

  function setCouncil(on) {
    state.council = on;
    if (!map) return;
    Promise.resolve(loadCouncil()).then(() => {
      if (!councilLayer) return;
      if (on) councilLayer.addTo(map);
      else map.removeLayer(councilLayer);
    });
  }

  function setLabels(on) {
    state.labels = on;
    if (map) applyMesaLabels();
  }

  function setOfficial(on) {
    state.official = on;
    if (!map || !officialZoning) return;
    if (on) officialZoning.addTo(map);
    else if (map.hasLayer(officialZoning)) map.removeLayer(officialZoning);
    restyle(); // switches our layer between solid fills and translucent highlights
  }

  /* ---- public API -------------------------------------------------------- */
  function init() {
    if (map) return;
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    const bounds = L.latLngBounds(MAP_CONFIG.bounds).pad(0.05);
    map = L.map('map', {
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      preferCanvas: true,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 19,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9, // keep the view pinned to Mesa
    });
    // panes (bottom→top): official zoning sits BELOW our shading so that, when on,
    // our translucent permission/changes highlights read on top of it; council
    // outlines and Mesa's labels sit above everything.
    map.createPane('official'); map.getPane('official').style.zIndex = 350;
    map.getPane('official').style.pointerEvents = 'none';
    map.createPane('council'); map.getPane('council').style.zIndex = 630;
    map.createPane('mlabels'); map.getPane('mlabels').style.zIndex = 660;
    map.getPane('mlabels').style.pointerEvents = 'none';

    buildBaseLayers();
    baseStreet.addTo(map);
    buildMesaLayers();
    applyMesaLabels();
    map.fitBounds(MAP_CONFIG.bounds);
    setTimeout(() => map.invalidateSize(), 200);
    loadData();
  }

  function setUse(useKey) {
    if (!USES[useKey]) return;
    state.use = useKey;
    // a brand-new use has nothing to show in the "current" scenario; nudge UI
    restyle();
  }

  function setScenario(sc) {
    state.scenario = sc;
    restyle();
  }

  function setBasemap(kind) {
    state.basemap = kind;
    if (!map) return;
    if (kind === 'satellite') {
      map.removeLayer(baseStreet);
      baseSatellite.addTo(map);
    } else {
      map.removeLayer(baseSatellite);
      baseStreet.addTo(map);
    }
    if (geoLayer) geoLayer.bringToFront();
    if (councilLayer && state.council) councilLayer.bringToFront();
  }

  function getState() { return Object.assign({}, state); }
  function refreshSize() { if (map) map.invalidateSize(); }

  return { init, setUse, setScenario, setBasemap, setLabels, setCouncil, setOfficial, getState, refreshSize };
})();
