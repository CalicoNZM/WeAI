/* ============================================================
   APP — Map-first interaction controller
   ============================================================ */

const App = {
  timeValue: 14.5,
  sliderActive: false,
  currentPanel: null,         // 'dashboard' | 'routes' | 'planning' | 'science' | null
  routingMode: false,         // true when user is placing route points
  routeStart: null,
  routeEnd: null,
  planningMode: null,         // 'building' | 'tree' | 'greenroof' | 'shade' | null
  cityCoords: { lat: 40.7128, lng: -74.006, name: 'New York City' },

  async init() {
    SolarCalc.init(40.7128, -74.006);
    ShadowCalc.init();
    this._setupUI();
    this._initMap();
    this._setupTimeSlider();
    this._setupPanelToggle();
    this._setupCitySearch();
    this._setupPlanningUI();
    this._setupRouteUI();
    this._setupLocate();

    setTimeout(() => {
      Charts.init();
      this._updateDashboard();
    }, 200);

    setInterval(() => this._updateDashboard(), 4000);
    this._startClock();
  },

  _setupUI() {
    // Close panels with chevron
    document.querySelectorAll('.close-panel').forEach(btn => {
      btn.addEventListener('click', () => this._closeAllPanels());
    });

    // Reset time
    document.getElementById('resetTimeBtn').addEventListener('click', () => {
      this.sliderActive = false;
      const now = new Date();
      this.timeValue = now.getHours() + now.getMinutes() / 60;
      document.getElementById('mainTimeSlider').value = this.timeValue;
      this._updateDashboard();
      MapRenderer.updateShadows();
    });
  },

  _initMap() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.cityCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'My Location' };
          MapRenderer.init('map', [pos.coords.latitude, pos.coords.longitude], 15);
          MapRenderer.onMapClick = (e) => this._handleMapClick(e);
          this._updateMapStatus();
        },
        () => {
          this._initDefaultMap();
        },
        { timeout: 5000 }
      );
    } else {
      this._initDefaultMap();
    }
  },

  _initDefaultMap() {
    MapRenderer.init('map', [this.cityCoords.lat, this.cityCoords.lng], 15);
    MapRenderer.onMapClick = (e) => this._handleMapClick(e);
    this._updateMapStatus();
  },

  _handleMapClick(e) {
    const latlng = e.latlng;

    if (this.planningMode) {
      this._placeObject(latlng);
      return;
    }

    if (this.routingMode) {
      if (!this.routeStart) {
        this.routeStart = latlng;
        MapRenderer.addRouteMarker(latlng, 'start');
        document.getElementById('routeStartLabel').textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        document.getElementById('routeStartIndicator').style.borderColor = 'rgba(16,185,129,.4)';
      } else if (!this.routeEnd) {
        this.routeEnd = latlng;
        MapRenderer.addRouteMarker(latlng, 'end');
        document.getElementById('routeEndLabel').textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        document.getElementById('routeEndIndicator').style.borderColor = 'rgba(239,68,68,.4)';
        this._generateRoutes();
      }
    }
  },

  // === ROUTING ===
  _setupRouteUI() {
    document.getElementById('startRouteMode').addEventListener('click', () => {
      this._exitPlanningMode();
      this.routingMode = !this.routingMode;
      if (this.routingMode) {
        this._clearRoutes();
        document.getElementById('routeIndicators').style.display = 'flex';
        document.getElementById('startRouteMode').innerHTML = '<i class="fas fa-xmark"></i> Exit Route Mode';
        document.getElementById('startRouteMode').classList.add('ghost');
        document.getElementById('startRouteMode').classList.remove('primary');
        App.toast('Click the map to set start point, then destination');
      } else {
        this._exitRoutingMode();
      }
    });

    document.getElementById('clearRoutesBtn').addEventListener('click', () => {
      this._clearRoutes();
      this._exitRoutingMode();
    });

    document.getElementById('clearStartBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.routeStart = null;
      MapRenderer.routeMarkers.forEach(m => MapRenderer.map.removeLayer(m));
      MapRenderer.routeMarkers = [];
      document.getElementById('routeStartLabel').textContent = 'Click start on map';
      document.getElementById('routeStartIndicator').style.borderColor = 'transparent';
      MapRenderer.clearRoutes();
    });

    document.getElementById('clearEndBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.routeEnd = null;
      if (MapRenderer.routeMarkers.length > 1) {
        MapRenderer.map.removeLayer(MapRenderer.routeMarkers.pop());
      }
      document.getElementById('routeEndLabel').textContent = 'Click destination on map';
      document.getElementById('routeEndIndicator').style.borderColor = 'transparent';
      MapRenderer.clearRoutes();
    });

    // Select route buttons
    document.querySelectorAll('.select-route-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.route-ow-card').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.select-route-btn').forEach(b => {
          b.textContent = 'Select';
          b.className = 'ow-btn ghost small select-route-btn';
        });
        btn.closest('.route-ow-card').classList.add('active');
        btn.textContent = 'Selected';
        btn.className = 'ow-btn primary small select-route-btn';
        App.toast(`Route ${btn.dataset.route} selected`);
      });
    });
  },

  _generateRoutes() {
    MapRenderer.clearRoutes();
    const s = this.routeStart;
    const e = this.routeEnd;
    if (!s || !e) return;

    const dx = e.lng - s.lng;
    const dy = e.lat - s.lat;

    MapRenderer.drawRoute(
      [[s.lat, s.lng], [s.lat + dy * 0.5, s.lng + dx * 0.5], [e.lat, e.lng]],
      '#6366F1', null, 'Fastest'
    );
    MapRenderer.drawRoute(
      [[s.lat, s.lng], [s.lat + dy * 0.2 + 0.002, s.lng + dx * 0.2 + 0.003], [s.lat + dy * 0.6 + 0.001, s.lng + dx * 0.6 - 0.002], [e.lat, e.lng]],
      '#06B6D4', null, 'Shaded ✓'
    );
    MapRenderer.drawRoute(
      [[s.lat, s.lng], [s.lat + dy * 0.4 + 0.001, s.lng + dx * 0.4 + 0.001], [e.lat, e.lng]],
      '#10B981', '8,8', 'Comfort'
    );

    document.querySelectorAll('.route-ow-card').forEach(c => c.style.display = 'block');
  },

  _clearRoutes() {
    MapRenderer.clearRoutes();
    this.routeStart = null;
    this.routeEnd = null;
  },

  _exitRoutingMode() {
    this.routingMode = false;
    document.getElementById('routeIndicators').style.display = 'none';
    document.getElementById('startRouteMode').innerHTML = '<i class="fas fa-route"></i> Start Route Mode';
    document.getElementById('startRouteMode').classList.remove('ghost');
    document.getElementById('startRouteMode').classList.add('primary');
  },

  // === PLANNING ===
  _setupPlanningUI() {
    document.querySelectorAll('.ow-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        this._exitRoutingMode();
        const tool = btn.dataset.ptool;
        if (this.planningMode === tool) {
          this._exitPlanningMode();
          return;
        }
        document.querySelectorAll('.ow-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.planningMode = tool;

        document.getElementById('placementIndicator').style.display = 'flex';
        const names = { building: 'Building', tree: 'Tree', greenroof: 'Green Roof', shade: 'Shade Structure' };
        document.getElementById('placementName').textContent = names[tool] || 'object';

        if (tool === 'tree') {
          document.getElementById('planHeight').max = 20; document.getElementById('planHeight').value = 10;
          document.getElementById('planHeightVal').textContent = '10m';
          document.getElementById('planWidth').closest('.ow-prop').style.display = 'none';
        } else {
          document.getElementById('planHeight').max = 120; document.getElementById('planHeight').value = 30;
          document.getElementById('planHeightVal').textContent = '30m';
          document.getElementById('planWidth').closest('.ow-prop').style.display = 'block';
        }

        App.toast(`Click on the map to place a ${names[tool]}`);
      });
    });

    document.getElementById('planHeight').addEventListener('input', function() {
      document.getElementById('planHeightVal').textContent = this.value + 'm';
    });
    document.getElementById('planWidth').addEventListener('input', function() {
      document.getElementById('planWidthVal').textContent = this.value + 'm';
    });

    document.getElementById('cancelPlacementBtn').addEventListener('click', () => {
      this._exitPlanningMode();
    });

    document.getElementById('planResetBtn').addEventListener('click', () => {
      MapRenderer.clearPlanningObjects();
      this._resetCompare();
      App.toast('Planning objects cleared');
    });
  },

  _placeObject(latlng) {
    const h = parseFloat(document.getElementById('planHeight').value);
    const w = parseFloat(document.getElementById('planWidth').value);

    if (this.planningMode === 'tree') {
      MapRenderer.addPlanningTree(latlng, h);
    } else {
      MapRenderer.addPlanningBuilding(latlng, h, w, true);
    }

    const bShade = ShadowCalc.getShadeCoverage();
    const bTemp = 28 + Math.round(Math.random() * 5);
    const bHEI = ShadowCalc.getHeatExposureIndex();
    const aShade = Math.min(92, bShade + Math.round(Math.random() * 12 + 4));
    const aTemp = Math.max(18, bTemp - Math.round(Math.random() * 3 + 1));
    const aHEI = Math.max(5, bHEI - Math.round(Math.random() * 10 + 2));

    document.getElementById('planBeforeShade').textContent = bShade + '%';
    document.getElementById('planBeforeTemp').textContent = bTemp + '°C';
    document.getElementById('planBeforeHEI').textContent = bHEI;
    document.getElementById('planAfterShade').textContent = aShade + '%';
    document.getElementById('planAfterTemp').textContent = aTemp + '°C';
    document.getElementById('planAfterHEI').textContent = aHEI;
    document.getElementById('planImpact').style.display = 'flex';
    document.getElementById('planImprove').textContent = aShade - bShade;
    App.toast(`${this.planningMode === 'tree' ? 'Tree' : 'Building'} placed! Shade +${aShade - bShade}%`);
  },

  _exitPlanningMode() {
    this.planningMode = null;
    document.querySelectorAll('.ow-tool').forEach(b => b.classList.remove('active'));
    document.getElementById('placementIndicator').style.display = 'none';
  },

  _resetCompare() {
    document.getElementById('planBeforeShade').textContent = '42%';
    document.getElementById('planBeforeTemp').textContent = '31°C';
    document.getElementById('planBeforeHEI').textContent = '52';
    document.getElementById('planAfterShade').textContent = '—';
    document.getElementById('planAfterTemp').textContent = '—';
    document.getElementById('planAfterHEI').textContent = '—';
    document.getElementById('planImpact').style.display = 'none';
  },

  // === PANEL TOGGLE ===
  _setupPanelToggle() {
    document.querySelectorAll('.side-btn[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        if (this.currentPanel === panel) {
          this._closeAllPanels();
          return;
        }
        this._openPanel(panel);
      });
    });
  },

  _openPanel(name) {
    this._closeAllPanels();
    this.currentPanel = name;
    document.querySelectorAll('.side-btn[data-panel]').forEach(b => b.classList.remove('active'));
    document.querySelector(`.side-btn[data-panel="${name}"]`)?.classList.add('active');
    document.getElementById(`panel-${name}`)?.classList.add('open');
  },

  _closeAllPanels() {
    this.currentPanel = null;
    document.querySelectorAll('.side-btn[data-panel]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.overlay-panel').forEach(p => p.classList.remove('open'));
  },

  // === CITY SEARCH ===
  _setupCitySearch() {
    const cities = [
      { name: 'New York City', lat: 40.7128, lng: -74.006 },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
      { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
      { name: 'Miami', lat: 25.7617, lng: -80.1918 },
      { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
      { name: 'London', lat: 51.5074, lng: -0.1278 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
      { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
      { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
      { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
      { name: 'Paris', lat: 48.8566, lng: 2.3522 },
      { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
    ];

    document.getElementById('citySearchBtn').addEventListener('click', () => {
      document.getElementById('citySearchOverlay').style.display = 'block';
      document.getElementById('citySearchInput').focus();
    });
    document.getElementById('citySearchClose').addEventListener('click', () => {
      document.getElementById('citySearchOverlay').style.display = 'none';
    });

    const input = document.getElementById('citySearchInput');
    const suggestions = document.getElementById('citySuggestions');

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      suggestions.innerHTML = '';
      if (q.length < 1) return;
      const matches = cities.filter(c => c.name.toLowerCase().includes(q));
      matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'city-suggestion';
        div.innerHTML = `<i class="fas fa-city"></i> ${c.name}`;
        div.addEventListener('click', () => {
          this._switchCity(c.lat, c.lng, c.name);
          document.getElementById('citySearchOverlay').style.display = 'none';
          input.value = '';
          suggestions.innerHTML = '';
        });
        suggestions.appendChild(div);
      });
    });
  },

  _switchCity(lat, lng, name) {
    this.cityCoords = { lat, lng, name };
    SolarCalc.init(lat, lng);
    this._exitRoutingMode();
    this._exitPlanningMode();
    MapRenderer.clearPlanningObjects();
    this._resetCompare();
    MapRenderer.setCenter(lat, lng, 14, name);
    this._updateMapStatus();
    MapRenderer.updateShadows();
    this._updateDashboard();
    App.toast(`Switched to ${name}`);
  },

  _setupLocate() {
    document.getElementById('locateBtn').addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this._switchCity(pos.coords.latitude, pos.coords.longitude, 'My Location');
          },
          () => App.toast('Could not get location. Using current city.')
        );
      }
    });
  },

  // === TIME SLIDER ===
  _setupTimeSlider() {
    const slider = document.getElementById('mainTimeSlider');
    slider.addEventListener('input', () => {
      this.sliderActive = true;
      this.timeValue = parseFloat(slider.value);
      this._updateTimeDisplay();
      this._updateDashboard();
      MapRenderer.updateShadows();
    });
  },

  _startClock() {
    const update = () => {
      const now = new Date();
      if (!this.sliderActive) this.timeValue = now.getHours() + now.getMinutes() / 60;
      this._updateTimeDisplay();
      document.getElementById('mainTimeSlider').value = this.timeValue;
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      document.getElementById('bottomDate').textContent = `${mon[now.getMonth()]} ${now.getDate()}`;
    };
    update();
    setInterval(update, 10000);
  },

  _updateTimeDisplay() {
    const h = Math.floor(this.timeValue);
    const m = Math.round((this.timeValue - h) * 60);
    document.getElementById('bottomTime').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    if (this.sliderActive) {
      document.getElementById('bottomLiveBadge').innerHTML = '<i class="fas fa-clock" style="color:#F59E0B;font-size:8px"></i> SIM';
    } else {
      document.getElementById('bottomLiveBadge').innerHTML = '<i class="fas fa-circle" style="color:#10B981;font-size:8px"></i> LIVE';
    }
  },

  // === DASHBOARD UPDATE ===
  _updateDashboard() {
    const now = new Date();
    now.setHours(Math.floor(this.timeValue), (this.timeValue % 1) * 60);
    const pos = SolarCalc.getSunPosition(now);
    const temp = Math.round(28 + Math.max(0, Math.sin((this.timeValue - 6) / 14 * Math.PI)) * 10);
    const feels = temp + Math.round(Math.random() * 3 + 2);
    const shade = ShadowCalc.getShadeCoverage();
    const hei = ShadowCalc.getHeatExposureIndex(this.timeValue);
    const cat = ShadowCalc.getHeiCategory(hei);
    const comfort = ShadowCalc.calculateComfortScore();

    // Map status bar
    document.getElementById('mapTempVal').textContent = temp;
    document.getElementById('mapShadeVal').textContent = shade;

    // Dashboard panel
    document.getElementById('dashTemp').innerHTML = `${temp}<span class="unit">°C</span>`;
    document.getElementById('dashFeels').innerHTML = `${feels}<span class="unit">°C</span>`;
    document.getElementById('dashMax').innerHTML = `${temp + 7}<span class="unit">°C</span>`;
    document.getElementById('dashHumidity').innerHTML = `${Math.round(40 + Math.random() * 25)}<span class="unit">%</span>`;
    document.getElementById('dashHeatBadge').textContent = cat.label;
    document.getElementById('dashHeatBadge').className = `badge ${cat.badge}`;
    document.getElementById('dashHeatBar').style.width = `${hei}%`;

    document.getElementById('dashAzimuth').textContent = `${pos.azimuth}°`;
    document.getElementById('dashElevation').textContent = `${pos.elevation}°`;
    document.getElementById('dashIntensity').textContent = `${pos.intensity} W/m²`;
    document.getElementById('dashSunset').textContent = SolarCalc.getTimeUntilSunset(now);
    const phase = pos.elevation >= 45 ? 'Peak' : pos.elevation >= 15 ? 'Afternoon' : pos.elevation > 0 ? 'Low' : 'Night';
    document.getElementById('dashSunPhase').textContent = phase;

    document.getElementById('dashHeiValue').textContent = hei;
    const heiColors = { Cool:'#10B981', Comfortable:'#06B6D4', Warm:'#F59E0B', Hot:'#EF4444', Dangerous:'#7F1D1D' };
    document.getElementById('dashHeiValue').style.color = heiColors[cat.label] || '#F59E0B';
    document.getElementById('dashHeiBadge').textContent = cat.label;
    document.getElementById('dashHeiBadge').className = `badge ${cat.badge}`;

    document.getElementById('dashShadePct').textContent = shade;
    document.getElementById('dashComfort').textContent = comfort;
    document.getElementById('dashHeatRisk').textContent = hei;
    document.getElementById('dashDataPts').textContent = (12 + Math.floor(Math.random() * 2)) + '.8K';

    Charts.updateHei(hei);
  },

  _updateMapStatus() {
    document.getElementById('mapCity').innerHTML = `<i class="fas fa-map-pin"></i> ${this.cityCoords.name}`;
    document.getElementById('mapCoords').innerHTML = `<i class="fas fa-location-dot"></i> ${this.cityCoords.lat.toFixed(2)}, ${this.cityCoords.lng.toFixed(2)}`;
  },

  // === TOAST ===
  toast(msg) {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<i class="fas fa-circle-info"></i> ${msg}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
