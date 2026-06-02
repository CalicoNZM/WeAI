/* ============================================================
   MAP RENDERER — Leaflet interactive map with click support
   ============================================================ */

const MapRenderer = {
  map: null,
  planningMap: null,
  shadowLayers: [],
  buildingLayers: [],
  treeLayers: [],
  routeLayers: [],
  routeMarkers: [],   // start/end markers
  placedObjects: [],  // planning objects
  currentLayer: 'shade',
  center: [40.7128, -74.006],
  cityName: 'New York City',

  // Callbacks (set by app)
  onMapClick: null,

  init(containerId, center, zoom) {
    this.center = center || [40.7128, -74.006];
    this.map = L.map(containerId, {
      center: this.center,
      zoom: zoom || 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.map.on('click', (e) => {
      if (this.onMapClick) this.onMapClick(e);
    });

    this._addMockData();
    this._setupLayerControls();
    return this.map;
  },

  setCenter(lat, lng, zoom, cityName) {
    this.center = [lat, lng];
    this.cityName = cityName || 'Unknown';
    this.map.setView([lat, lng], zoom || 14);
    this._clearAllData();
    this._addMockData();
    this._drawShadows();
  },

  flyTo(lat, lng, zoom) {
    this.center = [lat, lng];
    this.map.flyTo([lat, lng], zoom || 15, { duration: 1.2 });
    setTimeout(() => {
      this._clearAllData();
      this._addMockData();
      this._drawShadows();
    }, 1500);
  },

  _addMockData() {
    if (!this.map) return;
    this._drawBuildings();
    this._drawTrees();
    this._drawShadows();
  },

  _clearAllData() {
    [...this.shadowLayers, ...this.buildingLayers, ...this.treeLayers, ...this.routeLayers, ...this.routeMarkers].forEach(l => {
      if (this.map) this.map.removeLayer(l);
    });
    this.shadowLayers = [];
    this.buildingLayers = [];
    this.treeLayers = [];
    this.routeLayers = [];
    this.routeMarkers = [];
  },

  _drawBuildings() {
    const center = this.center;
    const buildingData = [
      { lat: center[0] + 0.003, lng: center[1] + 0.002, height: 45, width: 30, depth: 20 },
      { lat: center[0] + 0,    lng: center[1] + 0.004, height: 60, width: 25, depth: 18 },
      { lat: center[0] - 0.002,lng: center[1] + 0.001, height: 35, width: 40, depth: 25 },
      { lat: center[0] + 0.004,lng: center[1] - 0.002, height: 50, width: 20, depth: 15 },
      { lat: center[0] - 0.001,lng: center[1] - 0.003, height: 70, width: 35, depth: 22 },
      { lat: center[0] + 0.005,lng: center[1] + 0.005, height: 25, width: 50, depth: 30 },
      { lat: center[0] - 0.003,lng: center[1] + 0.003, height: 40, width: 28, depth: 20 },
      { lat: center[0] + 0.002,lng: center[1] - 0.004, height: 55, width: 32, depth: 24 },
      { lat: center[0] + 0.001,lng: center[1] - 0.001, height: 30, width: 22, depth: 16 },
      { lat: center[0] - 0.004,lng: center[1] - 0.002, height: 80, width: 45, depth: 28 },
    ];

    for (const b of buildingData) {
      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(b.lat));
      const w = b.width * lngPerM;
      const d = b.depth * latPerM;
      const bounds = [[b.lat - d, b.lng - w], [b.lat - d, b.lng + w], [b.lat + d, b.lng + w], [b.lat + d, b.lng - w]];
      const building = L.polygon(bounds, {
        color: '#1E293B', fillColor: '#334155', fillOpacity: 0.85, weight: 1, opacity: 0.6
      }).addTo(this.map);
      this.buildingLayers.push(building);
    }
  },

  _drawTrees() {
    const center = this.center;
    const treeData = [
      { lat: center[0] + 0.002, lng: center[1] + 0.001, canopy: 8 },
      { lat: center[0] - 0.001, lng: center[1] + 0.003, canopy: 6 },
      { lat: center[0] + 0.004, lng: center[1] - 0.001, canopy: 10 },
      { lat: center[0] - 0.002, lng: center[1] - 0.002, canopy: 5 },
      { lat: center[0] + 0.003, lng: center[1] + 0.004, canopy: 9 },
      { lat: center[0] + 0.001, lng: center[1] - 0.003, canopy: 7 },
      { lat: center[0] - 0.003, lng: center[1] + 0.002, canopy: 6 },
      { lat: center[0] + 0.005, lng: center[1] + 0.001, canopy: 8 },
    ];
    for (const t of treeData) {
      const tree = L.circleMarker([t.lat, t.lng], {
        radius: t.canopy * 0.8, color: '#065F46', fillColor: '#10B981', fillOpacity: 0.5, weight: 1, opacity: 0.6
      }).addTo(this.map);
      this.treeLayers.push(tree);
    }
  },

  clearRoutes() {
    this.routeLayers.forEach(l => this.map.removeLayer(l));
    this.routeMarkers.forEach(l => this.map.removeLayer(l));
    this.routeLayers = [];
    this.routeMarkers = [];
  },

  drawRoute(points, color, dash, label) {
    const poly = L.polyline(points, {
      color: color || '#06B6D4', weight: 4, opacity: 0.7, dashArray: dash || null
    }).addTo(this.map);
    this.routeLayers.push(poly);
    if (label && points.length > 0) {
      const mid = points[Math.floor(points.length / 2)];
      const marker = L.marker(mid, {
        icon: L.divIcon({
          className: '', html: `<span style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap">${label}</span>`,
          iconSize: [0, 0], iconAnchor: [0, 0]
        })
      }).addTo(this.map);
      this.routeLayers.push(marker);
    }
    return poly;
  },

  drawMockRoutes() {
    this.clearRoutes();
    const c = this.center;

    const rA = [[c[0], c[1]], [c[0] + 0.003, c[1] + 0.005], [c[0] + 0.006, c[1] + 0.003]];
    const rB = [[c[0], c[1]], [c[0] + 0.001, c[1] + 0.003], [c[0] + 0.003, c[1] + 0.006], [c[0] + 0.006, c[1] + 0.003]];
    const rC = [[c[0], c[1]], [c[0] + 0.004, c[1] + 0.002], [c[0] + 0.006, c[1] + 0.003]];

    this.drawRoute(rA, '#6366F1', null, 'Fastest');
    this.drawRoute(rB, '#06B6D4', null, 'Shaded ✓');
    this.drawRoute(rC, '#10B981', '8,8', 'Comfort');
  },

  addRouteMarker(latlng, type) {
    const color = type === 'start' ? '#10B981' : '#EF4444';
    const icon = type === 'start' ? 'circle-dot' : 'location-dot';
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${color};border-radius:50%;border:3px solid #0F172A;box-shadow:0 2px 12px rgba(0,0,0,.5)"><i class="fas fa-${icon}" style="color:#fff;font-size:14px"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(this.map);
    this.routeMarkers.push(marker);
    return marker;
  },

  // === PLANNING MODE ===
  addPlanningBuilding(latlng, height, width, isTemp) {
    const latPerM = 0.00000899;
    const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(latlng.lat || latlng[0]));
    const lat = latlng.lat || latlng[0];
    const lng = latlng.lng || latlng[1];
    const w = width * lngPerM;
    const d = (height * 0.4) * latPerM;
    const bounds = [[lat - d, lng - w], [lat - d, lng + w], [lat + d, lng + w], [lat + d, lng - w]];

    const opts = isTemp ? {
      color: '#06B6D4', fillColor: '#0891B2', fillOpacity: 0.5, weight: 2, opacity: 0.8, dashArray: '4,4'
    } : {
      color: '#06B6D4', fillColor: '#0891B2', fillOpacity: 0.6, weight: 1, opacity: 0.8
    };

    const building = L.polygon(bounds, opts).addTo(this.map);

    const sunPos = SolarCalc.getSunPosition(this._getTimeObj());
    const elevRad = SolarCalc.degToRad(sunPos.elevation);
    const tanElev = Math.tan(elevRad);
    const shadowLen = tanElev > 0.01 ? 1 / tanElev : 20;
    const shadowAz = (sunPos.azimuth + 180) % 360;
    const shadowAzRad = SolarCalc.degToRad(shadowAz);
    const dx = Math.sin(shadowAzRad) * height * shadowLen * 0.5;
    const dy = Math.cos(shadowAzRad) * height * shadowLen * 0.5;
    const sdx = dx * lngPerM * 0.3;
    const sdy = dy * latPerM * 0.3;
    const shadowBounds = bounds.map(c => [c[0] + sdy, c[1] + sdx]);
    const allPts = [...bounds, ...shadowBounds.reverse()];
    const cx = bounds.reduce((a, c) => a + c[1], 0) / bounds.length;
    const cy = bounds.reduce((a, c) => a + c[0], 0) / bounds.length;
    const sorted = allPts.sort((a, b) => Math.atan2(a[0] - cy, a[1] - cx) - Math.atan2(b[0] - cy, b[1] - cx));

    const shadow = L.polygon(sorted, {
      color: '#6366F1', fillColor: '#6366F1', fillOpacity: 0.2, weight: 1, opacity: 0.3
    }).addTo(this.map);

    this.placedObjects.push({ building, shadow });
    return { building, shadow };
  },

  addPlanningTree(latlng, height) {
    const lat = latlng.lat || latlng[0];
    const lng = latlng.lng || latlng[1];
    const tree = L.circleMarker([lat, lng], {
      radius: 8, color: '#065F46', fillColor: '#10B981', fillOpacity: 0.7, weight: 2, opacity: 0.8, dashArray: '3,3'
    }).addTo(this.map);

    const sunPos = SolarCalc.getSunPosition(this._getTimeObj());
    const elevRad = SolarCalc.degToRad(sunPos.elevation);
    const tanElev = Math.tan(elevRad);
    const shadowLen = tanElev > 0.01 ? 1 / tanElev : 20;
    const shadowAz = (sunPos.azimuth + 180) % 360;
    const shadowAzRad = SolarCalc.degToRad(shadowAz);
    const latPerM = 0.00000899;
    const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(lat));
    const dx = Math.sin(shadowAzRad) * height * shadowLen * lngPerM * 0.2;
    const dy = Math.cos(shadowAzRad) * height * shadowLen * latPerM * 0.2;

    const shadow = L.circle([lat + dy * 0.3, lng + dx * 0.3], {
      radius: 10, color: '#10B981', fillColor: '#10B981', fillOpacity: 0.2, weight: 1, opacity: 0.3
    }).addTo(this.map);

    this.placedObjects.push({ tree, shadow });
    return { tree, shadow };
  },

  clearPlanningObjects() {
    this.placedObjects.forEach(obj => {
      Object.values(obj).forEach(l => this.map.removeLayer(l));
    });
    this.placedObjects = [];
  },

  _getTimeObj() {
    const d = new Date();
    if (window.App && App.timeValue) {
      d.setHours(Math.floor(App.timeValue), (App.timeValue % 1) * 60);
    }
    return d;
  },

  updateShadows() {
    this._clearShadows();
    this._drawShadows();
  },

  _drawShadows() {
    const sunPos = SolarCalc.getSunPosition(this._getTimeObj());
    const elevation = sunPos.elevation;
    const azimuth = sunPos.azimuth;
    if (elevation <= 0) return;

    const azimuthRad = SolarCalc.degToRad(azimuth);
    const elevRad = SolarCalc.degToRad(elevation);
    const tanElev = Math.tan(elevRad);
    const shadowLen = tanElev > 0.01 ? 1 / tanElev : 20;
    const shadowAz = (azimuth + 180) % 360;
    const shadowAzRad = SolarCalc.degToRad(shadowAz);

    const buildingData = this._getBuildingData();

    for (const b of buildingData) {
      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(b.lat));
      const w = b.width * lngPerM;
      const d = b.depth * latPerM;
      const dx = Math.sin(shadowAzRad) * b.height * shadowLen * 0.5;
      const dy = Math.cos(shadowAzRad) * b.height * shadowLen * 0.5;
      const sdx = dx * lngPerM;
      const sdy = dy * latPerM;

      const corners = [[b.lat - d, b.lng - w], [b.lat - d, b.lng + w], [b.lat + d, b.lng + w], [b.lat + d, b.lng - w]];
      const shadCorners = corners.map(c => [c[0] + sdy * 0.5, c[1] + sdx * 0.5]);
      const allPts = [...corners, ...shadCorners.reverse()];
      const cx = corners.reduce((a, c) => a + c[1], 0) / corners.length;
      const cy = corners.reduce((a, c) => a + c[0], 0) / corners.length;
      const sorted = allPts.sort((a, b) => Math.atan2(a[0] - cy, a[1] - cx) - Math.atan2(b[0] - cy, b[1] - cx));

      const opacity = Math.max(0.12, Math.min(0.45, (90 - elevation) / 90 * 0.5));
      const shadow = L.polygon(sorted, {
        color: '#6366F1', fillColor: '#6366F1', fillOpacity: opacity, weight: 1, opacity: opacity * 0.7
      }).addTo(this.map);
      this.shadowLayers.push(shadow);
    }
  },

  _getBuildingData() {
    const center = this.center;
    return [
      { lat: center[0] + 0.003, lng: center[1] + 0.002, height: 45, width: 30, depth: 20 },
      { lat: center[0] + 0,    lng: center[1] + 0.004, height: 60, width: 25, depth: 18 },
      { lat: center[0] - 0.002,lng: center[1] + 0.001, height: 35, width: 40, depth: 25 },
      { lat: center[0] + 0.004,lng: center[1] - 0.002, height: 50, width: 20, depth: 15 },
      { lat: center[0] - 0.001,lng: center[1] - 0.003, height: 70, width: 35, depth: 22 },
      { lat: center[0] + 0.005,lng: center[1] + 0.005, height: 25, width: 50, depth: 30 },
      { lat: center[0] - 0.003,lng: center[1] + 0.003, height: 40, width: 28, depth: 20 },
      { lat: center[0] + 0.002,lng: center[1] - 0.004, height: 55, width: 32, depth: 24 },
      { lat: center[0] + 0.001,lng: center[1] - 0.001, height: 30, width: 22, depth: 16 },
      { lat: center[0] - 0.004,lng: center[1] - 0.002, height: 80, width: 45, depth: 28 },
    ];
  },

  _clearShadows() {
    this.shadowLayers.forEach(l => this.map.removeLayer(l));
    this.shadowLayers = [];
  },

  switchLayer(layer) {
    this.currentLayer = layer;
    const el = this.map.getContainer();
    if (layer === 'heat') el.style.filter = 'hue-rotate(20deg) saturate(1.2)';
    else el.style.filter = '';
  },

  _setupLayerControls() {
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchLayer(btn.dataset.layer);
      });
    });
  }
};
