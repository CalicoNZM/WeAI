/* ============================================================
   APP — Main Application Controller (NoiseDNA Layout Continuity)
   ============================================================ */

;(function() {
'use strict';

const App = {
  state: {
    currentSection: 'dashboard',
    timeValue: 14.5,
    sliderActive: false,
    navMode: 'scroll',
    sliderIndex: 0,
    routingMode: false,
    routeStart: null,
    routeEnd: null,
    planningMode: null,
    cityCoords: { lat: 40.7128, lng: -74.006, name: 'New York City' },
    sections: ['dashboard', 'map', 'routes', 'planning', 'science']
  },

  init() {
    SolarCalc.init(40.7128, -74.006);
    ShadowCalc.init();
    this._setupNavigation();
    this._setupNavModes();
    this._setupMobileMenu();
    this._initMap();
    this._setupTimeSlider();
    this._setupRouteUI();
    this._setupPlanningUI();
    this._setupCitySearch();
    this._setupLocate();

    setTimeout(() => {
      Charts.init();
      this._updateDashboard();
    }, 300);

    this._startClock();
    setInterval(() => this._updateDashboard(), 4000);
  },

  // =========== NAVIGATION ===========
  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this._goToSection(item.dataset.section);
      });
    });

    // Hub cards
    document.querySelectorAll('.hub-card').forEach(card => {
      card.addEventListener('click', () => {
        this._goToSection(card.dataset.section);
        this._closeHubOverlay();
        if (this.state.navMode === 'hub') this._setNavMode('scroll');
      });
    });
  },

  _goToSection(id) {
    this.state.currentSection = id;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${id}"]`)?.classList.add('active');

    if (this.state.navMode === 'scroll') {
      const el = document.getElementById('page-' + id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (this.state.navMode === 'slider') {
      this._sliderGoTo(this.state.sections.indexOf(id));
    } else {
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('hub-section-visible'));
      document.getElementById('page-' + id)?.classList.add('hub-section-visible');
    }

    // Reset routing/planning modes when navigating away
    if (id !== 'map') { this._exitRoutingMode(); }
    if (id !== 'planning') { this._exitPlanningMode(); }

    // Refresh map when showing map section
    if (id === 'map' && MapRenderer.map) {
      setTimeout(() => MapRenderer.map.invalidateSize(), 200);
    }
  },

  // =========== NAV MODES ===========
  _setupNavModes() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._setNavMode(btn.dataset.mode);
      });
    });
    this._setNavMode('scroll');
  },

  _setNavMode(mode) {
    this.state.navMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');
    document.body.className = 'mode-' + mode;

    if (mode === 'scroll') {
      this._showSectionInScroll();
    } else if (mode === 'slider') {
      this._initSliderMode();
    } else if (mode === 'hub') {
      this._initHubMode();
    }
  },

  _showSectionInScroll() {
    const id = this.state.currentSection;
    const el = document.getElementById('page-' + id);
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  },

  // Slider Mode
  _initSliderMode() {
    const sections = this.state.sections;
    const idx = sections.indexOf(this.state.currentSection);

    document.querySelectorAll('.page-section').forEach(s => {
      s.classList.remove('slider-active', 'slider-exit-left', 'slider-exit-right', 'slider-enter-left', 'slider-enter-right');
    });

    document.getElementById('page-' + sections[idx])?.classList.add('slider-active');
    this.state.sliderIndex = idx;
    this._updateSliderUI();

    document.getElementById('sliderPrev').onclick = () => this._sliderGoTo(this.state.sliderIndex - 1);
    document.getElementById('sliderNext').onclick = () => this._sliderGoTo(this.state.sliderIndex + 1);

    document.addEventListener('keydown', this._sliderKeyHandler = (e) => {
      if (this.state.navMode !== 'slider') return;
      if (e.key === 'ArrowLeft') this._sliderGoTo(this.state.sliderIndex - 1);
      if (e.key === 'ArrowRight') this._sliderGoTo(this.state.sliderIndex + 1);
    });
  },

  _sliderGoTo(idx) {
    const sections = this.state.sections;
    if (idx < 0 || idx >= sections.length) return;
    const from = this.state.sliderIndex;
    const goingForward = idx > from;

    const current = document.getElementById('page-' + sections[from]);
    const next = document.getElementById('page-' + sections[idx]);

    if (current) {
      current.classList.remove('slider-active');
      current.classList.add(goingForward ? 'slider-exit-left' : 'slider-exit-right');
      setTimeout(() => current.classList.remove('slider-exit-left', 'slider-exit-right'), 400);
    }

    if (next) {
      next.classList.remove('slider-exit-left', 'slider-exit-right');
      next.classList.add('slider-active');
    }

    this.state.sliderIndex = idx;
    this.state.currentSection = sections[idx];
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${sections[idx]}"]`)?.classList.add('active');

    this._updateSliderUI();

    if (sections[idx] === 'map' && MapRenderer.map) {
      setTimeout(() => MapRenderer.map.invalidateSize(), 300);
    }
  },

  _updateSliderUI() {
    const total = this.state.sections.length;
    const idx = this.state.sliderIndex;
    document.getElementById('sliderPage').textContent = `${idx + 1} / ${total}`;
    document.getElementById('sliderPrev').disabled = idx === 0;
    document.getElementById('sliderNext').disabled = idx === total - 1;

    const dots = document.getElementById('sliderDots');
    dots.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'slider-dot' + (i === idx ? ' active' : '');
      dot.addEventListener('click', () => this._sliderGoTo(i));
      dots.appendChild(dot);
    }
  },

  // Hub Mode
  _initHubMode() {
    const overlay = document.getElementById('hubOverlay');
    const body = document.getElementById('hubOverlayBody');

    body.innerHTML = '<div class="hub-page">' +
      this.state.sections.map(s => {
        const names = { dashboard: 'Dashboard', map: 'Live Map', routes: 'Shade Routes', planning: 'Urban Planning', science: 'Science Fair' };
        const icons = { dashboard: 'fa-gauge-high', map: 'fa-map-location-dot', routes: 'fa-route', planning: 'fa-city', science: 'fa-flask' };
        return `<div class="hub-card" data-section="${s}">
          <div class="hub-card-icon"><i class="fas ${icons[s]}"></i></div>
          <h3>${names[s]}</h3>
          <p>${s === 'dashboard' ? 'Heat & shade overview' : s === 'map' ? 'Interactive shadow map' : s === 'routes' ? 'Route comparison' : s === 'planning' ? 'Urban simulation' : 'Solar science'}</p>
        </div>`;
      }).join('') +
    '</div>';

    body.querySelectorAll('.hub-card').forEach(card => {
      card.addEventListener('click', () => {
        this._goToSection(card.dataset.section);
        this._closeHubOverlay();
        this._setNavMode('scroll');
      });
    });

    document.getElementById('hubCloseBtn').onclick = () => {
      this._closeHubOverlay();
      this._setNavMode('scroll');
    };

    document.addEventListener('keydown', this._hubKeyHandler = (e) => {
      if (this.state.navMode !== 'hub') return;
      if (e.key === 'Escape') { this._closeHubOverlay(); this._setNavMode('scroll'); }
    });

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  _closeHubOverlay() {
    document.getElementById('hubOverlay').classList.remove('open');
    document.body.style.overflow = '';
  },

  // =========== MOBILE ===========
  _setupMobileMenu() {
    document.getElementById('mobileToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          document.getElementById('sidebar').classList.remove('open');
        }
      });
    });
  },

  // =========== MAP ===========
  _initMap() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.state.cityCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'My Location' };
          this._createMap();
        },
        () => this._createMap(),
        { timeout: 5000 }
      );
    } else {
      this._createMap();
    }
  },

  _createMap() {
    const c = this.state.cityCoords;
    MapRenderer.init('map', [c.lat, c.lng], 14);
    MapRenderer.onMapClick = (e) => this._handleMapClick(e);
    this._updateMapStatus();
  },

  _handleMapClick(e) {
    if (this.state.planningMode) {
      this._placeObject(e.latlng);
      return;
    }
    if (this.state.routingMode) {
      if (!this.state.routeStart) {
        this.state.routeStart = e.latlng;
        MapRenderer.addRouteMarker(e.latlng, 'start');
        document.getElementById('routeStartLabel').textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
      } else if (!this.state.routeEnd) {
        this.state.routeEnd = e.latlng;
        MapRenderer.addRouteMarker(e.latlng, 'end');
        document.getElementById('routeEndLabel').textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
        this._generateRoutes();
      }
    }
  },

  _updateMapStatus() {
    const c = this.state.cityCoords;
    document.getElementById('mapCityName').textContent = c.name;
  },

  // =========== ROUTING ===========
  _setupRouteUI() {
    document.getElementById('startRouteMode').addEventListener('click', () => {
      this.state.routingMode = !this.state.routingMode;
      if (this.state.routingMode) {
        this._clearRoutes();
        document.querySelector('.route-indicators').style.display = 'flex';
        document.getElementById('startRouteMode').innerHTML = '<i class="fas fa-xmark"></i> Exit Route Mode';
        document.getElementById('startRouteMode').className = 'route-action-btn ghost';
        this.toast('Click the map to set start & destination');
      } else {
        this._exitRoutingMode();
      }
    });

    document.getElementById('clearRoutesBtn').addEventListener('click', () => {
      this._clearRoutes();
      this._exitRoutingMode();
    });

    document.querySelectorAll('.route-select').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.route-card-item').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.route-select').forEach(b => { b.textContent = 'Select'; b.className = 'route-select ghost'; });
        btn.closest('.route-card-item').classList.add('active');
        btn.textContent = 'Selected';
        btn.className = 'route-select primary';
      });
    });
  },

  _generateRoutes() {
    MapRenderer.clearRoutes();
    const s = this.state.routeStart;
    const e = this.state.routeEnd;
    if (!s || !e) return;
    const dx = e.lng - s.lng;
    const dy = e.lat - s.lat;

    MapRenderer.drawRoute([[s.lat, s.lng], [s.lat + dy * 0.5, s.lng + dx * 0.5], [e.lat, e.lng]], '#6366F1', null, 'Fastest');
    MapRenderer.drawRoute([[s.lat, s.lng], [s.lat + dy * 0.2 + 0.002, s.lng + dx * 0.2 + 0.003], [s.lat + dy * 0.6 + 0.001, s.lng + dx * 0.6 - 0.002], [e.lat, e.lng]], '#06B6D4', null, 'Shaded ✓');
    MapRenderer.drawRoute([[s.lat, s.lng], [s.lat + dy * 0.4 + 0.001, s.lng + dx * 0.4 + 0.001], [e.lat, e.lng]], '#10B981', '8,8', 'Comfort');
  },

  _clearRoutes() {
    MapRenderer.clearRoutes();
    this.state.routeStart = null;
    this.state.routeEnd = null;
  },

  _exitRoutingMode() {
    this.state.routingMode = false;
    document.querySelector('.route-indicators').style.display = 'none';
    const btn = document.getElementById('startRouteMode');
    if (btn) { btn.innerHTML = '<i class="fas fa-route"></i> Start Route Mode'; btn.className = 'route-action-btn primary'; }
  },

  // =========== PLANNING ===========
  _setupPlanningUI() {
    document.querySelectorAll('.plan-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.ptool;
        if (this.state.planningMode === tool) { this._exitPlanningMode(); return; }
        document.querySelectorAll('.plan-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.planningMode = tool;

        const names = { building: 'Building', tree: 'Tree', greenroof: 'Green Roof', shade: 'Shade Structure' };
        if (tool === 'tree') {
          document.getElementById('planHeight').max = 20; document.getElementById('planHeight').value = 10;
          document.getElementById('planHeightVal').textContent = '10m';
          document.querySelector('.plan-width').style.display = 'none';
        } else {
          document.getElementById('planHeight').max = 120; document.getElementById('planHeight').value = 30;
          document.getElementById('planHeightVal').textContent = '30m';
          document.querySelector('.plan-width').style.display = 'block';
        }
        this.toast('Click the map to place ' + names[tool]);
      });
    });

    document.getElementById('planHeight').addEventListener('input', function() {
      document.getElementById('planHeightVal').textContent = this.value + 'm';
    });
    document.getElementById('planWidth').addEventListener('input', function() {
      document.getElementById('planWidthVal').textContent = this.value + 'm';
    });

    document.getElementById('planResetBtn').addEventListener('click', () => {
      MapRenderer.clearPlanningObjects();
      this._resetPlanCompare();
      this.toast('Planning objects cleared');
    });
  },

  _placeObject(latlng) {
    const h = parseFloat(document.getElementById('planHeight').value);
    const w = parseFloat(document.getElementById('planWidth').value);
    if (this.state.planningMode === 'tree') {
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

    document.getElementById('planBShade').textContent = bShade + '%';
    document.getElementById('planBTemp').textContent = bTemp + '°C';
    document.getElementById('planBHei').textContent = bHEI;
    document.getElementById('planAShade').textContent = aShade + '%';
    document.getElementById('planATemp').textContent = aTemp + '°C';
    document.getElementById('planAHei').textContent = aHEI;
    document.getElementById('planImpact').style.display = 'flex';
    document.getElementById('planImprove').textContent = aShade - bShade;
    this.toast(`${this.state.planningMode === 'tree' ? 'Tree' : 'Structure'} placed! Shade +${aShade - bShade}%`);
  },

  _exitPlanningMode() {
    this.state.planningMode = null;
    document.querySelectorAll('.plan-tool').forEach(b => b.classList.remove('active'));
  },

  _resetPlanCompare() {
    ['planBShade','planBTemp','planBHei','planAShade','planATemp','planAHei'].forEach(id => {
      document.getElementById(id).textContent = id.startsWith('planA') ? '\u2014' : (id === 'planBShade' ? '42%' : id === 'planBTemp' ? '31°C' : '52');
    });
    document.getElementById('planImpact').style.display = 'none';
  },

  // =========== CITY SEARCH ===========
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
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
      { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
      { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    ];

    document.getElementById('mapCityBtn').addEventListener('click', () => {
      document.getElementById('cityOverlay').style.display = 'flex';
      document.getElementById('citySearchInput').focus();
    });
    document.getElementById('cityOverlayClose').addEventListener('click', () => {
      document.getElementById('cityOverlay').style.display = 'none';
    });
    document.getElementById('cityOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('cityOverlay').style.display = 'none';
    });

    const input = document.getElementById('citySearchInput');
    const suggestions = document.getElementById('citySuggestions');

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      suggestions.innerHTML = '';
      if (q.length < 1) return;
      cities.filter(c => c.name.toLowerCase().includes(q)).forEach(c => {
        const div = document.createElement('div');
        div.className = 'city-suggestion';
        div.innerHTML = `<i class="fas fa-city"></i> ${c.name}`;
        div.addEventListener('click', () => {
          this._switchCity(c.lat, c.lng, c.name);
          document.getElementById('cityOverlay').style.display = 'none';
          input.value = ''; suggestions.innerHTML = '';
        });
        suggestions.appendChild(div);
      });
    });
  },

  _switchCity(lat, lng, name) {
    this.state.cityCoords = { lat, lng, name };
    SolarCalc.init(lat, lng);
    this._exitRoutingMode();
    this._exitPlanningMode();
    MapRenderer.clearPlanningObjects();
    this._resetPlanCompare();
    MapRenderer.setCenter(lat, lng, 14, name);
    this._updateMapStatus();
    MapRenderer.updateShadows();
    this._updateDashboard();
    this.toast('Switched to ' + name);
  },

  _setupLocate() {
    document.getElementById('mapLocateBtn').addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this._switchCity(pos.coords.latitude, pos.coords.longitude, 'My Location'),
          () => this.toast('Could not get location')
        );
      }
    });
  },

  // =========== TIME ===========
  _setupTimeSlider() {
    const slider = document.getElementById('dashTimeSlider');
    slider.addEventListener('input', () => {
      this.state.sliderActive = true;
      this.state.timeValue = parseFloat(slider.value);
      this._updateTimeDisplay();
      this._updateDashboard();
      MapRenderer.updateShadows();
    });
  },

  _startClock() {
    const update = () => {
      const now = new Date();
      if (!this.state.sliderActive) this.state.timeValue = now.getHours() + now.getMinutes() / 60;
      this._updateTimeDisplay();
      document.getElementById('dashTimeSlider').value = this.state.timeValue;
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      document.getElementById('dashDate').textContent = `${mon[now.getMonth()]} ${now.getDate()}`;
    };
    update();
    setInterval(update, 10000);
  },

  _updateTimeDisplay() {
    const h = Math.floor(this.state.timeValue);
    const m = Math.round((this.state.timeValue - h) * 60);
    document.getElementById('dashTime').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const badge = document.getElementById('dashLiveBadge');
    if (this.state.sliderActive) {
      badge.innerHTML = '<i class="fas fa-clock" style="font-size:8px"></i> SIM';
      badge.style.background = 'rgba(245,158,11,0.15)';
      badge.style.color = '#F59E0B';
    } else {
      badge.innerHTML = '<span class="live-dot"></span> LIVE';
      badge.style.background = 'rgba(239,68,68,0.15)';
      badge.style.color = '#EF4444';
    }
  },

  // =========== DASHBOARD ===========
  _updateDashboard() {
    const now = new Date();
    now.setHours(Math.floor(this.state.timeValue), (this.state.timeValue % 1) * 60);
    const pos = SolarCalc.getSunPosition(now);
    const temp = Math.round(28 + Math.max(0, Math.sin((this.state.timeValue - 6) / 14 * Math.PI)) * 10);
    const feels = temp + Math.round(Math.random() * 3 + 2);
    const shade = ShadowCalc.getShadeCoverage();
    const hei = ShadowCalc.getHeatExposureIndex(this.state.timeValue);
    const cat = ShadowCalc.getHeiCategory(hei);
    const comfort = ShadowCalc.calculateComfortScore();

    document.getElementById('dashTemp').innerHTML = `${temp}<small>°C</small>`;
    document.getElementById('dashFeels').innerHTML = `${feels}<small>°C</small>`;
    document.getElementById('dashMax').innerHTML = `${temp + 7}<small>°C</small>`;
    document.getElementById('dashHumidity').innerHTML = `${Math.round(40 + Math.random() * 25)}<small>%</small>`;
    document.getElementById('dashHeatBar').style.width = `${hei}%`;

    document.getElementById('dashShadeBadge').textContent = shade + '%';
    document.getElementById('dashShadedPct').textContent = Math.round(shade);
    document.getElementById('dashPartialPct').textContent = Math.round((100 - shade) * 0.55);
    document.getElementById('dashExposedPct').textContent = Math.round((100 - shade) * 0.45);

    document.getElementById('dashAzimuth').textContent = pos.azimuth + '°';
    document.getElementById('dashElevation').textContent = pos.elevation + '°';
    document.getElementById('dashIntensity').textContent = pos.intensity + ' W/m²';
    document.getElementById('dashSunset').textContent = SolarCalc.getTimeUntilSunset(now);

    const phase = pos.elevation >= 45 ? 'Peak' : pos.elevation >= 15 ? 'Afternoon' : pos.elevation > 0 ? 'Low' : 'Night';
    document.getElementById('dashSunPhase').textContent = phase;

    document.getElementById('dashHeiBadge').textContent = cat.label;
    document.getElementById('dashHeiBadge').className = `badge ${cat.label === 'Dangerous' ? 'live-badge' : cat.label === 'Hot' ? 'warning-badge' : cat.label === 'Warm' ? 'warning-badge' : cat.label === 'Comfortable' ? '' : 'green-badge'}`;
    document.getElementById('dashHeiValue').textContent = hei;
    const heiColors = { Cool:'#10B981', Comfortable:'#06B6D4', Warm:'#F59E0B', Hot:'#EF4444', Dangerous:'#7F1D1D' };
    document.getElementById('dashHeiValue').style.color = heiColors[cat.label] || '#F59E0B';

    document.getElementById('dashStatShade').textContent = shade;
    document.getElementById('dashStatComfort').textContent = comfort;
    document.getElementById('dashStatHei').textContent = hei;

    document.getElementById('mapTempVal').textContent = temp;
    document.getElementById('mapShadeVal').textContent = shade;
    document.getElementById('mapSunElev').textContent = pos.elevation;

    Charts.updateHei(hei);
  },

  // =========== TOAST ===========
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

})();
