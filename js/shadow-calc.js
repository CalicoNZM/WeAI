/* ============================================================
   SHADOW CALCULATOR — Building & Tree Shadow Projection Engine
   ============================================================ */

const ShadowCalc = {
  buildings: [],
  trees: [],
  shadows: [],

  init() {
    this._generateMockCityData();
  },

  _generateMockCityData() {
    const centerLat = 40.7128;
    const centerLng = -74.006;

    const buildingData = [
      { lat: centerLat + 0.003, lng: centerLng + 0.002, height: 45, width: 30, depth: 20, color: '#1E293B' },
      { lat: centerLat + 0, lng: centerLng + 0.004, height: 60, width: 25, depth: 18, color: '#1E293B' },
      { lat: centerLat - 0.002, lng: centerLng + 0.001, height: 35, width: 40, depth: 25, color: '#1E293B' },
      { lat: centerLat + 0.004, lng: centerLng - 0.002, height: 50, width: 20, depth: 15, color: '#1E293B' },
      { lat: centerLat - 0.001, lng: centerLng - 0.003, height: 70, width: 35, depth: 22, color: '#1E293B' },
      { lat: centerLat + 0.005, lng: centerLng + 0.005, height: 25, width: 50, depth: 30, color: '#1E293B' },
      { lat: centerLat - 0.003, lng: centerLng + 0.003, height: 40, width: 28, depth: 20, color: '#1E293B' },
      { lat: centerLat + 0.002, lng: centerLng - 0.004, height: 55, width: 32, depth: 24, color: '#1E293B' },
      { lat: centerLat + 0.001, lng: centerLng - 0.001, height: 30, width: 22, depth: 16, color: '#1E293B' },
      { lat: centerLat - 0.004, lng: centerLng - 0.002, height: 80, width: 45, depth: 28, color: '#1E293B' },
    ];

    const treeData = [
      { lat: centerLat + 0.002, lng: centerLng + 0.001, height: 12, canopy: 8 },
      { lat: centerLat - 0.001, lng: centerLng + 0.003, height: 10, canopy: 6 },
      { lat: centerLat + 0.004, lng: centerLng - 0.001, height: 15, canopy: 10 },
      { lat: centerLat - 0.002, lng: centerLng - 0.002, height: 8, canopy: 5 },
      { lat: centerLat + 0.003, lng: centerLng + 0.004, height: 14, canopy: 9 },
      { lat: centerLat + 0.001, lng: centerLng - 0.003, height: 11, canopy: 7 },
      { lat: centerLat - 0.003, lng: centerLng + 0.002, height: 9, canopy: 6 },
      { lat: centerLat + 0.005, lng: centerLng + 0.001, height: 13, canopy: 8 },
    ];

    this.buildings = buildingData;
    this.trees = treeData;
  },

  calculateShadows(sunPos, date) {
    const elevation = sunPos.elevation;
    const azimuth = sunPos.azimuth;
    this.shadows = [];

    if (elevation <= 0) {
      return this.shadows;
    }

    const azimuthRad = SolarCalc.degToRad(azimuth);
    const elevRad = SolarCalc.degToRad(elevation);
    const tanElev = Math.tan(elevRad);
    const shadowLen = tanElev > 0.01 ? 1 / tanElev : 20;

    for (const b of this.buildings) {
      const shadowAz = (azimuth + 180) % 360;
      const shadowAzRad = SolarCalc.degToRad(shadowAz);

      const dx = Math.sin(shadowAzRad) * b.height * shadowLen;
      const dy = Math.cos(shadowAzRad) * b.height * shadowLen;

      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(b.lat));

      this.shadows.push({
        type: 'building',
        sourceLat: b.lat,
        sourceLng: b.lng,
        startLat: b.lat,
        startLng: b.lng,
        endLat: b.lat + dy * latPerM * 0.5,
        endLng: b.lng + dx * lngPerM * 0.5,
        height: b.height,
        width: b.width,
        depth: b.depth,
        opacity: Math.max(0.15, Math.min(0.5, (90 - elevation) / 90 * 0.6)),
        color: '#6366F1'
      });
    }

    for (const t of this.trees) {
      const shadowAz = (azimuth + 180) % 360;
      const shadowAzRad = SolarCalc.degToRad(shadowAz);

      const dx = Math.sin(shadowAzRad) * t.height * shadowLen;
      const dy = Math.cos(shadowAzRad) * t.height * shadowLen;

      const latPerM = 0.00000899;
      const lngPerM = 0.0000113 / Math.cos(SolarCalc.degToRad(t.lat));

      this.shadows.push({
        type: 'tree',
        sourceLat: t.lat,
        sourceLng: t.lng,
        startLat: t.lat,
        startLng: t.lng,
        endLat: t.lat + dy * latPerM * 0.3,
        endLng: t.lng + dx * lngPerM * 0.3,
        canopy: t.canopy,
        height: t.height,
        opacity: Math.max(0.1, Math.min(0.35, (90 - elevation) / 90 * 0.4)),
        color: '#10B981'
      });
    }

    return this.shadows;
  },

  getShadeCoverage() {
    const total = this.buildings.length + this.trees.length;
    if (total === 0) return 42;
    const base = 42;
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const peak = 13;
    const variation = Math.sin((hour - 6) / 14 * Math.PI) * 25;
    return Math.round(Math.max(15, Math.min(85, base + variation * 0.3)));
  },

  getHeatExposureIndex(time) {
    const hour = time || new Date().getHours() + new Date().getMinutes() / 60;
    const sunHeight = Math.max(0, Math.sin((hour - 6) / 14 * Math.PI));
    const baseHEI = sunHeight * 60 + 15;
    const noise = Math.sin(hour * 0.5) * 5;
    return Math.round(Math.max(5, Math.min(95, baseHEI + noise)));
  },

  calculateComfortScore() {
    const hei = this.getHeatExposureIndex();
    const shade = this.getShadeCoverage();
    const score = Math.max(0, Math.min(100, 100 - hei * 0.6 + shade * 0.4));
    return Math.round(score);
  },

  getHeiCategory(hei) {
    if (hei <= 20) return { label: 'Cool', color: '#10B981', badge: 'success' };
    if (hei <= 40) return { label: 'Comfortable', color: '#06B6D4', badge: 'accent' };
    if (hei <= 60) return { label: 'Warm', color: '#F59E0B', badge: 'warning' };
    if (hei <= 80) return { label: 'Hot', color: '#EF4444', badge: 'danger' };
    return { label: 'Dangerous', color: '#7F1D1D', badge: 'danger' };
  }
};
