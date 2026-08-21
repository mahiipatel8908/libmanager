/* =============================================================
   charts.js — Chart.js configurations for the dashboard
   Reuses the stats payload already fetched in dashboard.js
   ============================================================= */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderDashboardCharts(stats) {
  const textColor = cssVar('--text-secondary');
  const gridColor = cssVar('--border');

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = textColor;

  // ---------- Chart 1: Books Overview (doughnut) ----------
  const ctx1 = document.getElementById('chart-books-overview');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Issued'],
        datasets: [{
          data: [stats.books_overview.available, stats.books_overview.issued],
          backgroundColor: [cssVar('--mint'), cssVar('--indigo')],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { animateScale: true, duration: 900 },
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } },
        },
      },
    });
  }

  // ---------- Chart 2: Popular Categories (bar) ----------
  const ctx2 = document.getElementById('chart-categories');
  if (ctx2) {
    const cats = stats.categories;
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: cats.labels.length ? cats.labels : ['No data yet'],
        datasets: [{
          data: cats.counts.length ? cats.counts : [0],
          backgroundColor: cssVar('--violet'),
          borderRadius: 8,
          maxBarThickness: 34,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { precision: 0 } },
        },
      },
    });
  }

  // ---------- Chart 3: Monthly Transactions (line) ----------
  const ctx3 = document.getElementById('chart-monthly');
  if (ctx3) {
    const m = stats.monthly;
    const labels = m.labels.length ? m.labels.map(formatMonthLabel) : ['This month'];
    new Chart(ctx3, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Issued',
            data: m.issued.length ? m.issued : [0],
            borderColor: cssVar('--indigo'),
            backgroundColor: hexToRgba(cssVar('--indigo'), 0.12),
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: cssVar('--indigo'),
          },
          {
            label: 'Returned',
            data: m.returned.length ? m.returned : [0],
            borderColor: cssVar('--mint'),
            backgroundColor: hexToRgba(cssVar('--mint'), 0.12),
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: cssVar('--mint'),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, ticks: { precision: 0 } },
        },
      },
    });
  }
}
window.renderDashboardCharts = renderDashboardCharts;

function formatMonthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
