/* ============================================================
   CHARTS — Chart.js Data Visualizations
   ============================================================ */

const Charts = {
  charts: {},

  ChartJS: window.Chart,

  init() {
    this._setupGlobalDefaults();
    this.createShadeDonut();
    this.createPredictionGauge();
    this.createHeiGauge();
    this.createForecastChart();
    this.createSunPathChart();
    this.createComfortGauge();
    this.drawSunCanvas();
    this.drawSolarDiagram();
  },

  _setupGlobalDefaults() {
    if (!this.ChartJS) return;
    this.ChartJS.defaults.color = '#94A3B8';
    this.ChartJS.defaults.borderColor = 'rgba(255,255,255,0.05)';
    this.ChartJS.defaults.font.family = "'Inter', sans-serif";
    this.ChartJS.defaults.plugins.legend.display = false;
  },

  createShadeDonut() {
    const ctx = document.getElementById('shadeDonut');
    if (!ctx) return;
    this.charts.shadeDonut = new this.ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Shaded', 'Partial', 'Exposed'],
        datasets: [{
          data: [42, 28, 30],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderColor: ['rgba(16,185,129,0.5)', 'rgba(245,158,11,0.5)', 'rgba(239,68,68,0.5)'],
          borderWidth: 2,
          spacing: 4
        }]
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  createPredictionGauge() {
    const ctx = document.getElementById('predictionGauge');
    if (!ctx) return;
    this.charts.predictionGauge = new this.ChartJS(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [94, 6],
          backgroundColor: ['#10B981', 'rgba(255,255,255,0.05)'],
          borderColor: ['rgba(16,185,129,0.5)', 'transparent'],
          borderWidth: 2,
          spacing: 2
        }]
      },
      options: {
        cutout: '82%',
        responsive: true,
        maintainAspectRatio: false,
        rotation: 225,
        circumference: 270,
        plugins: { legend: { display: false } }
      }
    });
  },

  createHeiGauge() {
    const ctx = document.getElementById('heiGauge');
    if (!ctx) return;
    const hei = ShadowCalc.getHeatExposureIndex();
    const cat = ShadowCalc.getHeiCategory(hei);

    this.charts.heiGauge = new this.ChartJS(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [hei, 100 - hei],
          backgroundColor: [cat.color, 'rgba(255,255,255,0.05)'],
          borderColor: [cat.color + '80', 'transparent'],
          borderWidth: 2,
          spacing: 2
        }]
      },
      options: {
        cutout: '78%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        animation: { duration: 800 }
      }
    });

    document.getElementById('heiValue').textContent = hei;
  },

  createForecastChart() {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;
    const hours = [];
    const shadeData = [];
    const tempData = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const h = (now.getHours() + i) % 24;
      hours.push(`${h}:00`);
      const sunFactor = Math.max(0, Math.sin((h - 6) / 14 * Math.PI));
      shadeData.push(Math.round((1 - sunFactor * 0.6) * 80));
      tempData.push(Math.round(28 + sunFactor * 10));
    }

    this.charts.forecastChart = new this.ChartJS(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Shade %',
            data: shadeData,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6,182,212,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#06B6D4',
            pointBorderColor: '#0F172A',
            pointBorderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Temp °C',
            data: tempData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#EF4444',
            pointBorderColor: '#0F172A',
            pointBorderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94A3B8',
              font: { size: 11 },
              usePointStyle: true,
              padding: 16,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', display: false },
            ticks: { color: '#64748B', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748B', font: { size: 10 } },
            title: { display: true, text: 'Shade %', color: '#64748B', font: { size: 10 } }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 45,
            grid: { display: false },
            ticks: { color: '#64748B', font: { size: 10 } },
            title: { display: true, text: 'Temp °C', color: '#64748B', font: { size: 10 } }
          }
        }
      }
    });
  },

  createSunPathChart() {
    const ctx = document.getElementById('sunPathChart');
    if (!ctx) return;
    const hours = [];
    const elevations = [];
    for (let h = 6; h <= 20; h += 0.5) {
      const d = new Date();
      d.setHours(Math.floor(h), (h % 1) * 60);
      const pos = SolarCalc.getSunPosition(d);
      hours.push(`${Math.floor(h)}:${(h % 1) * 60 === 0 ? '00' : '30'}`);
      elevations.push(Math.max(0, pos.elevation));
    }

    this.charts.sunPathChart = new this.ChartJS(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: 'Solar Elevation',
          data: elevations,
          borderColor: '#F59E0B',
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, 'rgba(245,158,11,0.3)');
            g.addColorStop(1, 'rgba(245,158,11,0)');
            return g;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Elevation: ${ctx.parsed.y}°`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', display: false },
            ticks: {
              color: '#64748B',
              font: { size: 9 },
              maxTicksLimit: 8,
              callback: (v, i) => i % 4 === 0 ? hours[v] : ''
            }
          },
          y: {
            beginAtZero: true,
            max: 90,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748B', font: { size: 10 } },
            title: { display: true, text: 'Elevation °', color: '#64748B', font: { size: 10 } }
          }
        }
      }
    });
  },

  createComfortGauge() {
    const ctx = document.getElementById('comfortGauge');
    if (!ctx) return;
    const score = ShadowCalc.calculateComfortScore();

    this.charts.comfortGauge = new this.ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: ['Thermal', 'Shade', 'Distance', 'Humidity', 'Overall'],
        datasets: [{
          data: [
            Math.round(score * 0.85),
            Math.round(score * 1.1),
            Math.round(score * 0.9),
            Math.round(score * 0.75),
            score
          ],
          backgroundColor: [
            'rgba(245,158,11,0.6)',
            'rgba(6,182,212,0.6)',
            'rgba(99,102,241,0.6)',
            'rgba(16,185,129,0.6)',
            'rgba(6,182,212,0.8)'
          ],
          borderColor: [
            '#F59E0B',
            '#06B6D4',
            '#6366F1',
            '#10B981',
            '#06B6D4'
          ],
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748B', font: { size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11, weight: '500' } }
          }
        }
      }
    });
  },

  drawSunCanvas() {
    const canvas = document.getElementById('sunCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;

    const animate = () => {
      const now = new Date();
      const pos = SolarCalc.getSunPosition(now);
      const elevRad = SolarCalc.degToRad(pos.elevation);
      const azRad = SolarCalc.degToRad(pos.azimuth);

      const sunX = cx + Math.sin(azRad) * r * 0.6;
      const sunY = cy - Math.cos(elevRad) * r * 0.9;

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(6,182,212,0.05)');
      grad.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      const arcGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      arcGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
      arcGrad.addColorStop(1, 'rgba(6,182,212,0.05)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.8, 0.1, Math.PI - 0.1);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.8, Math.PI + 0.1, Math.PI * 2 - 0.1);
      ctx.strokeStyle = 'rgba(6,182,212,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 30);
      glow.addColorStop(0, 'rgba(245,158,11,0.4)');
      glow.addColorStop(0.5, 'rgba(245,158,11,0.1)');
      glow.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.beginPath();
      ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 14);
      sunGrad.addColorStop(0, '#FEF3C7');
      sunGrad.addColorStop(0.5, '#F59E0B');
      sunGrad.addColorStop(1, '#D97706');
      ctx.beginPath();
      ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + Date.now() * 0.0005;
        const r1 = 17;
        const r2 = 22 + Math.sin(Date.now() * 0.002 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * r1, sunY + Math.sin(angle) * r1);
        ctx.lineTo(sunX + Math.cos(angle) * r2, sunY + Math.sin(angle) * r2);
        ctx.strokeStyle = `rgba(245,158,11,${0.2 + Math.sin(Date.now() * 0.003 + i) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      requestAnimationFrame(animate);
    };

    animate();
  },

  drawSolarDiagram() {
    const canvas = document.getElementById('solarDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const w = rect.width;
    const h = rect.height;
    const gx = w / 2;
    const gy = h * 0.75;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, gy);
      ctx.lineTo(w - 20, gy);
      ctx.stroke();

      const bH = 40;
      const bW = 30;
      ctx.fillStyle = '#334155';
      ctx.fillRect(gx - bW / 2, gy - bH, bW, bH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx - bW / 2, gy - bH, bW, bH);

      const sunAngle = 55;
      const sunRad = SolarCalc.degToRad(sunAngle);
      const len = 100;

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(245,158,11,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(sunRad) * len * 1.2, gy - Math.sin(sunRad) * len * 1.2);
      ctx.stroke();
      ctx.setLineDash([]);

      const elevAngle = 58;
      const elevRad = SolarCalc.degToRad(elevAngle);
      const sLen = 80;

      ctx.strokeStyle = 'rgba(6,182,212,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(elevRad) * sLen, gy - Math.sin(elevRad) * sLen);
      ctx.stroke();

      const sx = gx + Math.cos(elevRad) * sLen;
      const sy = gy - Math.sin(elevRad) * sLen;
      const sunGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16);
      sunGrad.addColorStop(0, 'rgba(245,158,11,0.8)');
      sunGrad.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();

      const shLen = 50;
      ctx.fillStyle = 'rgba(99,102,241,0.3)';
      ctx.beginPath();
      ctx.moveTo(gx - bW / 2, gy);
      ctx.lineTo(gx + bW / 2, gy);
      ctx.lineTo(gx + bW / 2 + shLen, gy);
      ctx.lineTo(gx - bW / 2 + shLen, gy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Building', gx - 20, gy - bH - 6);
      ctx.fillText('Shadow', gx + shLen / 2 - 18, gy + 14);
      ctx.fillStyle = 'rgba(245,158,11,0.6)';
      ctx.fillText('α = 58°', gx + 20, gy - 50);
    };

    draw();
  },

  updateAll() {
    const hei = ShadowCalc.getHeatExposureIndex();
    const cat = ShadowCalc.getHeiCategory(hei);

    if (this.charts.heiGauge) {
      this.charts.heiGauge.data.datasets[0].data = [hei, 100 - hei];
      this.charts.heiGauge.data.datasets[0].backgroundColor = [cat.color, 'rgba(255,255,255,0.05)'];
      this.charts.heiGauge.update();
    }
    document.getElementById('heiValue').textContent = hei;

    if (this.charts.comfortGauge) {
      const score = ShadowCalc.calculateComfortScore();
      this.charts.comfortGauge.data.datasets[0].data = [
        Math.round(score * 0.85),
        Math.round(score * 1.1),
        Math.round(score * 0.9),
        Math.round(score * 0.75),
        score
      ];
      this.charts.comfortGauge.update();
    }

    if (this.charts.shadeDonut) {
      const s = ShadowCalc.getShadeCoverage();
      this.charts.shadeDonut.data.datasets[0].data = [s, Math.round((100 - s) * 0.6), Math.round((100 - s) * 0.4)];
      this.charts.shadeDonut.update();
    }

  }
};
