/* =============================================================
   dashboard.js — Loads /api/stats and builds:
   - animated stat cards (count-up effect)
   - recent activity timeline
   Charts are handled separately in charts.js (uses same stats payload).
   ============================================================= */

const STAT_DEFS = [
  { key: 'total_books', label: 'Total Books', icon: 'book-open', grad: 'var(--grad-primary)' },
  { key: 'available_books', label: 'Available Books', icon: 'check-circle-2', grad: 'var(--grad-mint)' },
  { key: 'issued_books', label: 'Issued Books', icon: 'book-marked', grad: 'var(--grad-sky)' },
  { key: 'total_students', label: 'Total Students', icon: 'graduation-cap', grad: 'var(--grad-primary)' },
  { key: 'overdue_books', label: 'Overdue Books', icon: 'clock-alert', grad: 'var(--grad-amber)' },
  { key: 'total_fine', label: 'Total Fine', icon: 'indian-rupee', grad: 'var(--grad-coral)', prefix: '₹' },
];

const ICON_SVGS = {
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'check-circle-2': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  'book-marked': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M10 2v8l2.5-1.5L15 10V2"/>',
  'graduation-cap': '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  'clock-alert': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l3 2"/>',
  'indian-rupee': '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4.5 4.5 0 0 0 0-9"/>',
};

function animateCount(el, target, isCurrency) {
  const duration = 900;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(from + (target - from) * eased);
    el.textContent = (isCurrency ? '₹' : '') + value.toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderStatCards(stats) {
  const container = document.getElementById('stat-cards');
  if (!container) return;

  container.innerHTML = STAT_DEFS.map((def, i) => `
    <div class="card card-hover stagger-in" style="--i:${i};padding:22px;position:relative;overflow:hidden;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
        <div style="width:44px;height:44px;border-radius:12px;background:${def.grad};display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:var(--shadow-sm);">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">${ICON_SVGS[def.icon]}</svg>
        </div>
      </div>
      <div class="count-up" data-key="${def.key}" style="font-family:var(--font-display);font-size:26px;font-weight:700;line-height:1;">0</div>
      <div class="text-muted" style="font-size:13px;margin-top:6px;">${def.label}</div>
    </div>
  `).join('');

  STAT_DEFS.forEach((def) => {
    const el = container.querySelector(`[data-key="${def.key}"]`);
    if (el) animateCount(el, stats[def.key] || 0, def.key === 'total_fine');
  });
}

const ACTIVITY_ICONS = {
  issue: { svg: '<path d="M12 19V5M5 12l7-7 7 7"/>', color: 'var(--indigo)' },
  return: { svg: '<path d="M12 5v14M5 12l7 7 7-7"/>', color: 'var(--mint)' },
  student: { svg: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>', color: 'var(--sky)' },
};

function timeAgo(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderActivity(activity) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  if (!activity.length) {
    feed.innerHTML = `
      <div class="empty-state" style="padding:30px 10px;">
        <div class="empty-state-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <h3>No activity yet</h3>
        <p>Issue or return a book to see it show up here.</p>
      </div>`;
    return;
  }

  feed.innerHTML = activity.map((a, i) => {
    const meta = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.issue;
    return `
      <div class="row-in" style="--i:${i};display:flex;align-items:flex-start;gap:12px;padding:10px 6px;border-radius:10px;transition:background 150ms;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='transparent'">
        <div style="width:34px;height:34px;border-radius:10px;background:${meta.color}18;color:${meta.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${meta.svg}</svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;line-height:1.4;">${a.text}</div>
          <div class="text-muted" style="font-size:11.5px;margin-top:2px;">${timeAgo(a.date)}</div>
        </div>
      </div>`;
  }).join('');
}

function loadDashboard() {
  fetch('/api/stats')
    .then((r) => r.json())
    .then((stats) => {
      renderStatCards(stats);
      renderActivity(stats.activity || []);
      // Hand off to charts.js
      if (window.renderDashboardCharts) window.renderDashboardCharts(stats);
    })
    .catch(() => {
      if (window.showToast) showToast('error', 'Could not load dashboard', 'Please refresh the page.');
    });
}

document.addEventListener('DOMContentLoaded', loadDashboard);
