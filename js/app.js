/* ============================================================
   APP — Main Application Controller
   ============================================================ */

const App = {
  currentSection: 'dashboard',
  timeValue: 14.5,
  sliderActive: false,
  updateInterval: null,

  async init() {
    SolarCalc.init(40.7128, -74.006);
    ShadowCalc.init();
    this._setupNavigation();
    this._setupTimeSlider();
    this._setupRouteSearch();
    this._setupPlanningTools();
    this._setupMobileMenu();
    this._initMap();

    setTimeout(() => {
      Charts.init();
      this._updateDashboard();
    }, 200);

    this._startClock();
    this.updateInterval = setInterval(() => this._updateDashboard(), 4000);
  },

  _setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this._switchSection(link.dataset.section);
      });
    });
  },

  _switchSection(section) {
    this.currentSection = section;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-section="${section}"]`).forEach(l => l.classList.add('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    document.getElementById('mobileMenu').classList.remove('open');

    if (section === 'routes' && this._mapReady) {
      setTimeout(() => this.mainMap.invalidateSize(), 100);
      MapRenderer.drawMockRoutes();
    }
    if (section === 'planning' && !this._planningReady) {
      this._initPlanningMap();
    }
  },

  _startClock() {
    document.getElementById('timeDisplay').addEventListener('dblclick', () => {
      this.sliderActive = false;
      const now = new Date();
      this.timeValue = now.getHours() + now.getMinutes() / 60;
      this._updateDashboard();
      MapRenderer.updateShadows();
    });

    const update = () => {
      const now = new Date();
      if (!this.sliderActive) this.timeValue = now.getHours() + now.getMinutes() / 60;
      const h = Math.floor(this.timeValue);
      const m = Math.round((this.timeValue - h) * 60);
      document.getElementById('timeDisplay').textContent =
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      document.getElementById('timeSlider').value = this.timeValue;
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      document.getElementById('dateDisplay').textContent = `${mon[now.getMonth()]} ${now.getDate()}`;
    };
    update();
    setInterval(update, 10000);
  },

  _setupTimeSlider() {
    const slider = document.getElementById('timeSlider');
    slider.addEventListener('input', () => {
      this.sliderActive = true;
      this.timeValue = parseFloat(slider.value);
      const h = Math.floor(this.timeValue);
      const m = Math.round((this.timeValue - h) * 60);
      document.getElementById('timeDisplay').textContent =
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      this._updateDashboard();
      MapRenderer.updateShadows();
    });
  },

  _updateDashboard() {
    const now = new Date();
    now.setHours(Math.floor(this.timeValue), (this.timeValue % 1) * 60);
    const pos = SolarCalc.getSunPosition(now);

    const temp = Math.round(28 + Math.max(0, Math.sin((this.timeValue - 6) / 14 * Math.PI)) * 10);
    const feelsLike = temp + Math.round(Math.random() * 3 + 2);
    const shade = ShadowCalc.getShadeCoverage();
    const hei = ShadowCalc.getHeatExposureIndex(this.timeValue);
    const cat = ShadowCalc.getHeiCategory(hei);
    const comfort = ShadowCalc.calculateComfortScore();

    document.getElementById('heroTemp').textContent = temp;
    document.getElementById('heroShade').textContent = shade;
    document.getElementById('heroSunset').textContent = SolarCalc.getTimeUntilSunset(now);

    document.getElementById('currentTemp').innerHTML = `${temp}<span class="unit">°C</span>`;
    document.getElementById('feelsLike').innerHTML = `${feelsLike}<span class="unit">°C</span>`;
    document.getElementById('maxTemp').innerHTML = `${temp + 7}<span class="unit">°C</span>`;
    document.getElementById('humidityVal').innerHTML = `${Math.round(40 + Math.random() * 25)}<span class="unit">%</span>`;

    document.getElementById('heatBadge').textContent = cat.label;
    document.getElementById('heatBadge').className = `card-badge ${cat.badge}`;
    document.getElementById('heatProgressBar').style.width = `${hei}%`;

    document.getElementById('sunAzimuth').textContent = `${pos.azimuth}°`;
    document.getElementById('sunElevation').textContent = `${pos.elevation}°`;
    document.getElementById('sunIntensity').textContent = `${pos.intensity} W/m²`;

    const sunPhase = pos.elevation >= 45 ? 'Peak' : pos.elevation >= 15 ? 'Afternoon' : pos.elevation > 0 ? 'Low' : 'Night';
    document.getElementById('sunPhaseBadge').textContent = sunPhase;

    document.getElementById('shadeBadge').textContent = `${shade}%`;
    document.getElementById('shadedPct').textContent = Math.round(shade);
    document.getElementById('partialPct').textContent = Math.round((100 - shade) * 0.55);
    document.getElementById('exposedPct').textContent = Math.round((100 - shade) * 0.45);
    document.getElementById('lastPredictionTime').textContent = new Date().toLocaleTimeString();

    const heiColors = { Cool: '#10B981', Comfortable: '#06B6D4', Warm: '#F59E0B', Hot: '#EF4444', Dangerous: '#7F1D1D' };
    document.getElementById('heiValue').style.color = heiColors[cat.label] || '#F59E0B';

    if (Charts.charts.heiGauge) {
      Charts.charts.heiGauge.data.datasets[0].data = [hei, 100 - hei];
      Charts.charts.heiGauge.data.datasets[0].backgroundColor = [cat.color, 'rgba(255,255,255,0.05)'];
      Charts.charts.heiGauge.update('none');
    }
    if (Charts.charts.comfortGauge) {
      Charts.charts.comfortGauge.data.datasets[0].data = [
        Math.round(comfort * 0.85), Math.round(comfort * 1.1),
        Math.round(comfort * 0.9), Math.round(comfort * 0.75), comfort
      ];
      Charts.charts.comfortGauge.update('none');
    }
    if (Charts.charts.shadeDonut) {
      Charts.charts.shadeDonut.data.datasets[0].data = [
        Math.round(shade), Math.round((100 - shade) * 0.6), Math.round((100 - shade) * 0.4)
      ];
      Charts.charts.shadeDonut.update('none');
    }
  },

  _setupRouteSearch() {
    document.getElementById('findRoutesBtn').addEventListener('click', () => {
      MapRenderer.drawMockRoutes();
      this._switchSection('routes');
    });

    document.querySelectorAll('.route-select-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
        btn.closest('.route-card').classList.add('active');
        btn.closest('.route-card').querySelector('.btn-ghost')?.classList.replace('btn-ghost', 'btn-primary');
        document.querySelectorAll('.route-card .btn-primary').forEach(b => {
          if (b !== btn) b.classList.replace('btn-primary', 'btn-ghost');
        });
      });
    });

    document.querySelectorAll('.comparison-filters input').forEach(cb => {
      cb.addEventListener('change', () => {
        const filters = {
          routeAFilter: 0, routeBFilter: 1, routeCFilter: 2
        };
        document.querySelectorAll('.route-card').forEach((card, i) => {
          const key = Object.keys(filters)[i];
          card.style.display = document.getElementById(key)?.checked ? 'block' : 'none';
        });
      });
    });
  },

  _initMap() {
    this.mainMap = MapRenderer.init('map', [40.7128, -74.006], 15);
    this._mapReady = true;

    document.getElementById('mapLocateBtn').addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => MapRenderer.flyTo(pos.coords.latitude, pos.coords.longitude),
          () => MapRenderer.flyTo(40.7128, -74.006)
        );
      }
    });

    setTimeout(() => this.mainMap.invalidateSize(), 500);
  },

  _initPlanningMap() {
    this.planningMap = MapRenderer.initPlanning('planningMiniMap');
    this._planningReady = true;
    setTimeout(() => this.planningMap.invalidateSize(), 300);
  },

  _setupPlanningTools() {
    let activeTool = null;
    const placedObjects = [];

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTool = btn.dataset.tool;
        const props = document.getElementById('toolProperties');
        if (activeTool === 'tree') {
          props.querySelector('.prop-group:last-child').style.display = 'none';
          document.getElementById('propHeight').max = 20;
          document.getElementById('propHeight').value = 10;
          document.getElementById('propHeightVal').textContent = '10m';
        } else {
          props.querySelector('.prop-group:last-child').style.display = 'block';
          document.getElementById('propHeight').max = 120;
          document.getElementById('propHeight').value = 30;
          document.getElementById('propHeightVal').textContent = '30m';
        }
      });
    });

    document.getElementById('propHeight').addEventListener('input', function() {
      document.getElementById('propHeightVal').textContent = `${this.value}m`;
    });
    document.getElementById('propWidth').addEventListener('input', function() {
      document.getElementById('propWidthVal').textContent = `${this.value}m`;
    });

    document.getElementById('applyToolBtn').addEventListener('click', () => {
      if (!activeTool || !this._planningReady) return;
      const height = parseFloat(document.getElementById('propHeight').value);
      const width = parseFloat(document.getElementById('propWidth').value);
      const center = MapRenderer.planningMap.getCenter();
      const lat = center.lat + (Math.random() - 0.5) * 0.006;
      const lng = center.lng + (Math.random() - 0.5) * 0.006;

      let result;
      if (activeTool === 'building')
        result = MapRenderer.addPlanningBuilding(lat, lng, height, width);
      else if (activeTool === 'tree')
        result = MapRenderer.addPlanningTree(lat, lng, height);
      else
        result = MapRenderer.addPlanningBuilding(lat, lng, height * 0.5, width);

      placedObjects.push(result);

      const beforeShade = ShadowCalc.getShadeCoverage();
      const beforeTemp = Math.round(28 + Math.random() * 3);
      const beforeHEI = ShadowCalc.getHeatExposureIndex();
      const afterShade = Math.min(95, beforeShade + Math.round(Math.random() * 15 + 5));
      const afterTemp = Math.max(18, beforeTemp - Math.round(Math.random() * 4 + 1));
      const afterHEI = Math.max(5, beforeHEI - Math.round(Math.random() * 12 + 3));

      document.getElementById('beforeShade').textContent = `${beforeShade}%`;
      document.getElementById('beforeTemp').textContent = `${beforeTemp}°C`;
      document.getElementById('beforeHEI').textContent = beforeHEI;
      document.getElementById('afterShade').textContent = `${afterShade}%`;
      document.getElementById('afterTemp').textContent = `${afterTemp}°C`;
      document.getElementById('afterHEI').textContent = afterHEI;
      document.getElementById('shadeImprovement').textContent = `${afterShade - beforeShade}%`;
    });

    document.getElementById('resetPlanningBtn').addEventListener('click', () => {
      for (const obj of placedObjects) {
        Object.values(obj).forEach(l => MapRenderer.planningMap.removeLayer(l));
      }
      placedObjects.length = 0;
      ['beforeShade','beforeTemp','beforeHEI','afterShade','afterTemp','afterHEI'].forEach(id => {
        document.getElementById(id).textContent = id.startsWith('before') ? (id === 'beforeShade' ? '42%' : id === 'beforeTemp' ? '31°C' : '52') : '\u2014';
      });
      document.getElementById('shadeImprovement').textContent = '\u2014';
    });
  },

  _setupMobileMenu() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('mobileMenu').classList.toggle('open');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
