/* ============================================================
   CHARTS — Lightweight Chart.js helpers
   ============================================================ */

const Charts = {
  charts: {},

  init() {
    this.createHeiGauge();
    this.createForecastChart();
    this.drawSunCanvas();
    this.drawSciCanvas();
  },

  createHeiGauge() {
    const ctx = document.getElementById('dashHeiGauge');
    if (!ctx) return;
    const hei = ShadowCalc.getHeatExposureIndex();
    const cat = ShadowCalc.getHeiCategory(hei);
    this.charts.heiGauge = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [hei, 100 - hei],
          backgroundColor: [cat.color, 'rgba(255,255,255,0.04)'],
          borderColor: [cat.color + '80', 'transparent'],
          borderWidth: 2, spacing: 2
        }]
      },
      options: {
        cutout: '78%', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        animation: { duration: 600 }
      }
    });
    document.getElementById('dashHeiValue') && (document.getElementById('dashHeiValue').textContent = hei);
  },

  createForecastChart() {
    const ctx = document.getElementById('dashForecast');
    if (!ctx) return;
    const now = new Date();
    const hours = []; const shadeData = []; const tempData = [];
    for (let i = 0; i < 6; i++) {
      const h = (now.getHours() + i) % 24;
      hours.push(h + ':00');
      const sf = Math.max(0, Math.sin((h - 6) / 14 * Math.PI));
      shadeData.push(Math.round((1 - sf * 0.6) * 80));
      tempData.push(Math.round(28 + sf * 10));
    }
    this.charts.forecast = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          { label: 'Shade %', data: shadeData, borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#06B6D4', yAxisID: 'y' },
          { label: 'Temp °C', data: tempData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#EF4444', yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#64748B', font: { size: 10 }, usePointStyle: true, padding: 12, boxWidth: 6 } },
          tooltip: { backgroundColor: 'rgba(15,23,42,.95)', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, titleColor: '#F8FAFC', bodyColor: '#94A3B8', padding: 10, cornerRadius: 6 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } },
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748B', font: { size: 9 } }, title: { display: true, text: 'Shade %', color: '#64748B', font: { size: 9 } } },
          y1: { position: 'right', beginAtZero: true, max: 45, grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } }, title: { display: true, text: '°C', color: '#64748B', font: { size: 9 } } }
        }
      }
    });
  },

  drawSunCanvas() {
    const canvas = document.getElementById('dashSunCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.35;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const d = new Date();
      if (window.App && App.timeValue) d.setHours(Math.floor(App.timeValue), (App.timeValue % 1) * 60);
      const pos = SolarCalc.getSunPosition(d);
      const elevRad = SolarCalc.degToRad(Math.max(0, pos.elevation));
      const azRad = SolarCalc.degToRad(pos.azimuth);
      const sx = cx + Math.sin(azRad) * r * 0.6;
      const sy = cy - Math.cos(elevRad) * r * 0.9;

      // arc
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, Math.PI + 0.15, Math.PI * 2 - 0.15);
      ctx.strokeStyle = 'rgba(6,182,212,.12)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);

      // glow
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22);
      g.addColorStop(0, 'rgba(245,158,11,.35)'); g.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

      // sun
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
      sg.addColorStop(0, '#FEF3C7'); sg.addColorStop(.5, '#F59E0B'); sg.addColorStop(1, '#D97706');
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245,158,11,.4)'; ctx.lineWidth = 1.5; ctx.stroke();

      // rays
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Date.now() * 0.0004;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12);
        ctx.lineTo(sx + Math.cos(a) * (16 + Math.sin(Date.now() * 0.002 + i) * 2), sy + Math.sin(a) * (16 + Math.sin(Date.now() * 0.002 + i) * 2));
        ctx.strokeStyle = `rgba(245,158,11,${.15 + Math.sin(Date.now() * 0.002 + i) * .08})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
      requestAnimationFrame(draw);
    };
    draw();
  },

  drawSciCanvas() {
    const canvas = document.getElementById('sciSolarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    const w = rect.width, h = rect.height;
    const gx = w / 2, gy = h * 0.7;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(15, gy); ctx.lineTo(w - 15, gy); ctx.stroke();
    const bw = 20, bh = 30;
    ctx.fillStyle = '#334155'; ctx.fillRect(gx - bw / 2, gy - bh, bw, bh);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.strokeRect(gx - bw / 2, gy - bh, bw, bh);
    const elev = 55, eRad = SolarCalc.degToRad(elev);
    ctx.strokeStyle = 'rgba(6,182,212,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(eRad) * 55, gy - Math.sin(eRad) * 55); ctx.stroke();
    const sx = gx + Math.cos(eRad) * 55, sy = gy - Math.sin(eRad) * 55;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
    sg.addColorStop(0, 'rgba(245,158,11,.6)'); sg.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fillStyle = '#F59E0B'; ctx.fill();
    ctx.fillStyle = 'rgba(99,102,241,.25)';
    ctx.beginPath(); ctx.moveTo(gx - bw / 2, gy); ctx.lineTo(gx + bw / 2, gy);
    ctx.lineTo(gx + bw / 2 + 35, gy); ctx.lineTo(gx - bw / 2 + 35, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#64748B'; ctx.font = '9px Inter,sans-serif';
    ctx.fillText('Building', gx - 16, gy - bh - 4);
    ctx.fillText('Shadow', gx + 10, gy + 12);
    ctx.fillStyle = 'rgba(245,158,11,.5)'; ctx.fillText('α=55°', gx + 14, gy - 35);
  },

  updateHei(value) {
    if (!this.charts.heiGauge) return;
    const cat = ShadowCalc.getHeiCategory(value);
    this.charts.heiGauge.data.datasets[0].data = [value, 100 - value];
    this.charts.heiGauge.data.datasets[0].backgroundColor = [cat.color, 'rgba(255,255,255,0.04)'];
    this.charts.heiGauge.update('none');
  }
};
