/* ============================================================
   SOLAR CALCULATOR — Solar Geometry Engine
   ============================================================ */

const SolarCalc = {
  latitude: 40.7128,
  longitude: -74.006,

  init(lat, lng) {
    this.latitude = lat || 40.7128;
    this.longitude = lng || -74.006;
  },

  degToRad(d) { return d * Math.PI / 180; },
  radToDeg(r) { return r * 180 / Math.PI; },

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  getSolarDeclination(dayOfYear) {
    return 23.45 * Math.sin(this.degToRad(360 / 365 * (284 + dayOfYear)));
  },

  getEquationOfTime(dayOfYear) {
    const B = 360 / 365 * (dayOfYear - 81);
    return 9.87 * Math.sin(this.degToRad(2 * B)) - 7.53 * Math.cos(this.degToRad(B)) - 1.5 * Math.sin(this.degToRad(B));
  },

  getSolarTime(date, longitude) {
    const stdMeridian = Math.round(longitude / 15) * 15;
    const dayOfYear = this.getDayOfYear(date);
    const eot = this.getEquationOfTime(dayOfYear);
    const timeOffset = (longitude - stdMeridian) * 4 + eot;
    const minutes = date.getHours() * 60 + date.getMinutes() + timeOffset;
    return minutes / 60;
  },

  getSunPosition(date, latitude, longitude) {
    const lat = latitude || this.latitude;
    const lng = longitude || this.longitude;
    const dayOfYear = this.getDayOfYear(date);
    const declination = this.getSolarDeclination(dayOfYear);
    const solarTime = this.getSolarTime(date, lng);
    const hourAngle = (solarTime - 12) * 15;

    const latRad = this.degToRad(lat);
    const decRad = this.degToRad(declination);
    const haRad = this.degToRad(hourAngle);

    const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = this.radToDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(this.degToRad(elevation)));
    let azimuth = this.radToDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (hourAngle > 0) azimuth = 360 - azimuth;

    const airMass = elevation > 0 ? 1 / Math.sin(this.degToRad(elevation)) : 0;
    const intensity = elevation > 0 ? 1361 * Math.pow(0.7, Math.pow(airMass, 0.678)) : 0;

    return {
      elevation: Math.round(elevation * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      declination: Math.round(declination * 10) / 10,
      hourAngle: Math.round(hourAngle * 10) / 10,
      solarTime: solarTime,
      intensity: Math.round(intensity),
      airMass: Math.round(airMass * 100) / 100
    };
  },

  getSunriseSunset(date, latitude, longitude) {
    const lat = latitude || this.latitude;
    const lng = longitude || this.longitude;
    const dayOfYear = this.getDayOfYear(date);
    const declination = this.getSolarDeclination(dayOfYear);
    const latRad = this.degToRad(lat);
    const decRad = this.degToRad(declination);

    const cosHA = -Math.tan(latRad) * Math.tan(decRad);
    if (cosHA < -1 || cosHA > 1) {
      return { sunrise: null, sunset: null, dayLength: cosHA < -1 ? 24 : 0 };
    }

    const ha = this.radToDeg(Math.acos(cosHA));
    const sunriseTime = 12 - ha / 15;
    const sunsetTime = 12 + ha / 15;

    const eot = this.getEquationOfTime(dayOfYear);
    const stdMeridian = Math.round(lng / 15) * 15;
    const timeCorrection = eot - (lng - stdMeridian) * 4;

    const sunriseLocal = sunriseTime + timeCorrection / 60;
    const sunsetLocal = sunsetTime + timeCorrection / 60;

    return {
      sunrise: this._hoursToTime(sunriseLocal),
      sunset: this._hoursToTime(sunsetLocal),
      sunriseHours: sunriseLocal,
      sunsetHours: sunsetLocal,
      dayLength: sunsetLocal - sunriseLocal
    };
  },

  _hoursToTime(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  getTimeUntilSunset(date, latitude, longitude) {
    const times = this.getSunriseSunset(date, latitude, longitude);
    if (!times.sunset) return 'N/A';
    const now = date.getHours() + date.getMinutes() / 60;
    const diff = times.sunsetHours - now;
    if (diff <= 0) return 'Sunset passed';
    const h = Math.floor(diff);
    const m = Math.floor((diff - h) * 60);
    return `${h}h ${m}m`;
  }
};
