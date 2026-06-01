/* ============================================================
   MAP RENDERER — Leaflet Interactive Map Integration
   ============================================================ */

const MapRenderer = {
  map: null,
  mainMap: null,
  planningMap: null,
  shadowLayers: [],
  buildingLayers: [],
  treeLayers: [],
  routeLayers: [],
  heatLayer: null,
  currentLayer: 'shade',
  center: [40.7128, -74.006],

  init(containerId, center, zoom) {
    this.center = center || [40.7128, -74.006];
    this.mainMap = L.map(containerId, {
      center: this.center,
      zoom: zoom || 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.mainMap);

    L.control.zoom({ position: 'bottomright' }).addTo(this.mainMap);

    this._addMockData();
    this._setupLayerControls();
    return this.mainMap;
  },

  initPlanning(containerId) {
    this.planningMap = L.map(containerId, {
      center: this.center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.planningMap);

    this._addPlanningData();
    return this.planningMap;
  },

  _addMockData() {
    this._drawBuildings();
    this._drawTrees();
    this._drawShadows();
  },

  _drawBuildings() {
    for (const b of ShadowCalc.buildings) {
      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(b.lat));
      const w = b.width * lngPerM;
      const d = b.depth * latPerM;
      const bounds = [
        [b.lat - d, b.lng - w],
        [b.lat - d, b.lng + w],
        [b.lat + d, b.lng + w],
        [b.lat + d, b.lng - w]
      ];

      const building = L.polygon(bounds, {
        color: b.color,
        fillColor: '#334155',
        fillOpacity: 0.85,
        weight: 1,
        opacity: 0.6
      }).addTo(this.mainMap);

      const heightLabel = L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          className: 'building-height-label',
          html: `<span style="color:#94A3B8;font-size:10px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,0.8)">${b.height}m</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        })
      }).addTo(this.mainMap);

      this.buildingLayers.push(building, heightLabel);
    }
  },

  _drawTrees() {
    for (const t of ShadowCalc.trees) {
      const tree = L.circleMarker([t.lat, t.lng], {
        radius: t.canopy * 0.8,
        color: '#065F46',
        fillColor: '#10B981',
        fillOpacity: 0.5,
        weight: 1,
        opacity: 0.6
      }).addTo(this.mainMap);

      this.treeLayers.push(tree);
    }
  },

  _drawShadows() {
    const sunPos = SolarCalc.getSunPosition(new Date());
    const shadows = ShadowCalc.calculateShadows(sunPos);

    this._clearShadows();

    for (const s of shadows) {
      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(s.startLat));

      if (s.type === 'building') {
        const w = s.width * lngPerM;
        const d = s.depth * latPerM;
        const dx = s.endLng - s.startLng;
        const dy = s.endLat - s.startLat;

        const corners = [
          [s.startLat - d, s.startLng - w],
          [s.startLat - d, s.startLng + w],
          [s.startLat + d, s.startLng + w],
          [s.startLat + d, s.startLng - w]
        ];

        const shadowCorners = corners.map(c => [c[0] + dy, c[1] + dx]);
        const allPoints = [...corners, ...shadowCorners.reverse()];
        const centerX = corners.reduce((a, c) => a + c[1], 0) / corners.length;
        const centerY = corners.reduce((a, c) => a + c[0], 0) / corners.length;
        const sorted = allPoints.sort((a, b) => Math.atan2(a[0] - centerY, a[1] - centerX) - Math.atan2(b[0] - centerY, b[1] - centerX));

        const shadow = L.polygon(sorted, {
          color: s.color,
          fillColor: s.color,
          fillOpacity: s.opacity,
          weight: 1,
          opacity: s.opacity * 0.8,
          className: 'building-shadow'
        }).addTo(this.mainMap);

        this.shadowLayers.push(shadow);
      } else {
        const dx = s.endLng - s.startLng;
        const dy = s.endLat - s.startLat;

        const shadow = L.circle([s.startLat + dy * 0.3, s.startLng + dx * 0.3], {
          radius: s.canopy * 3,
          color: s.color,
          fillColor: s.color,
          fillOpacity: s.opacity,
          weight: 0.5,
          opacity: s.opacity * 0.6
        }).addTo(this.mainMap);

        this.shadowLayers.push(shadow);
      }
    }
  },

  updateShadows() {
    this._drawShadows();
  },

  _clearShadows() {
    for (const l of this.shadowLayers) {
      this.mainMap.removeLayer(l);
    }
    this.shadowLayers = [];
  },

  clearRoutes() {
    for (const l of this.routeLayers) {
      this.mainMap.removeLayer(l);
    }
    this.routeLayers = [];
  },

  drawRoute(points, color, dash) {
    const polyline = L.polyline(points, {
      color: color || '#06B6D4',
      weight: 4,
      opacity: 0.7,
      dashArray: dash || null
    }).addTo(this.mainMap);
    this.routeLayers.push(polyline);
    return polyline;
  },

  drawMockRoutes() {
    this.clearRoutes();
    const center = this.center;

    this.drawRoute(
      [center, [center[0] + 0.003, center[1] + 0.005], [center[0] + 0.006, center[1] + 0.003]],
      '#6366F1'
    );

    this.drawRoute(
      [center, [center[0] + 0.001, center[1] + 0.003], [center[0] + 0.003, center[1] + 0.006], [center[0] + 0.006, center[1] + 0.003]],
      '#06B6D4'
    );

    this.drawRoute(
      [center, [center[0] + 0.004, center[1] + 0.002], [center[0] + 0.006, center[1] + 0.003]],
      '#10B981', '8, 8'
    );
  },

  switchLayer(layer) {
    this.currentLayer = layer;
    const mapEl = this.mainMap.getContainer();
    if (layer === 'heat') {
      mapEl.style.filter = 'hue-rotate(20deg) saturate(1.2)';
    } else {
      mapEl.style.filter = '';
    }
  },

  _setupLayerControls() {
    document.querySelectorAll('.map-control-btn[data-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-control-btn[data-layer]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchLayer(btn.dataset.layer);
      });
    });
  },

  flyTo(lat, lng, zoom) {
    this.mainMap.flyTo([lat, lng], zoom || 16, { duration: 1.5 });
  },

  addPlanningBuilding(lat, lng, height, width) {
    const latPerM = 0.00000899;
    const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(lat));
    const w = width * lngPerM;
    const d = (height * 0.4) * latPerM;
    const bounds = [
      [lat - d, lng - w],
      [lat - d, lng + w],
      [lat + d, lng + w],
      [lat + d, lng - w]
    ];

    const building = L.polygon(bounds, {
      color: '#06B6D4',
      fillColor: '#0891B2',
      fillOpacity: 0.6,
      weight: 2,
      opacity: 0.8,
      dashArray: '4, 4'
    }).addTo(this.planningMap);

    const sunPos = SolarCalc.getSunPosition(new Date());
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
      color: '#6366F1',
      fillColor: '#6366F1',
      fillOpacity: 0.25,
      weight: 1,
      opacity: 0.3
    }).addTo(this.planningMap);

    return { building, shadow };
  },

  addPlanningTree(lat, lng, height) {
    const tree = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#065F46',
      fillColor: '#10B981',
      fillOpacity: 0.7,
      weight: 2,
      opacity: 0.8,
      dashArray: '3, 3'
    }).addTo(this.planningMap);

    const sunPos = SolarCalc.getSunPosition(new Date());
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
      radius: 10,
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.2,
      weight: 1,
      opacity: 0.3
    }).addTo(this.planningMap);

    return { tree, shadow };
  },

  _addPlanningData() {
    for (const b of ShadowCalc.buildings.slice(0, 5)) {
      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(b.lat));
      const w = b.width * lngPerM;
      const d = b.depth * latPerM;
      const bounds = [
        [b.lat - d, b.lng - w],
        [b.lat - d, b.lng + w],
        [b.lat + d, b.lng + w],
        [b.lat + d, b.lng - w]
      ];

      L.polygon(bounds, {
        color: '#334155',
        fillColor: '#334155',
        fillOpacity: 0.7,
        weight: 1,
        opacity: 0.5
      }).addTo(this.planningMap);
    }
  }
};
