/* =============================================================
   main.js — Shared app behavior
   Runs on every page (loaded from base.html)

   Contains:
   - Theme (light/dark) toggle + localStorage persistence
   - Sidebar collapse/expand + mobile drawer
   - Sliding "active nav" indicator pill
   - Toast notification system  (window.showToast)
   - Modal open/close helpers   (window.openModal / closeModal)
   - Button loading-state helper (window.setBtnLoading)
   - Global search shortcut (Ctrl+K) — placeholder until Phase-16 search
   ============================================================= */

// -------------------------------------------------------------
// THEME
// -------------------------------------------------------------
(function initTheme() {
  const saved = localStorage.getItem('lms-theme');
  const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', preferred);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lms-theme', next);
}

// -------------------------------------------------------------
// SIDEBAR — collapse (desktop) + drawer (mobile) + active pill
// -------------------------------------------------------------
function positionNavIndicator() {
  const sidebar = document.querySelector('.sidebar');
  const indicator = document.querySelector('.nav-indicator');
  const active = document.querySelector('.nav-item.active');
  if (!indicator || !active) {
    if (indicator) indicator.style.opacity = '0';
    return;
  }
  const navRect = active.parentElement.getBoundingClientRect(); // .nav-list
  const itemRect = active.getBoundingClientRect();
  indicator.style.opacity = '1';
  indicator.style.transform = `translateY(${itemRect.top - navRect.top}px)`;
  indicator.style.height = itemRect.height + 'px';
}

function toggleSidebarCollapse() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('lms-sidebar-collapsed', sidebar.classList.contains('collapsed'));
  // Wait for width transition before repositioning the pill
  setTimeout(positionNavIndicator, 260);
}

function toggleMobileSidebar(forceClose) {
  const sidebar = document.querySelector('.sidebar');
  const scrim = document.querySelector('.mobile-nav-scrim');
  if (forceClose === true) {
    sidebar.classList.remove('mobile-open');
    scrim.classList.remove('open');
    return;
  }
  sidebar.classList.toggle('mobile-open');
  scrim.classList.toggle('open');
}

(function initSidebarState() {
  document.addEventListener('DOMContentLoaded', () => {
    const collapsed = localStorage.getItem('lms-sidebar-collapsed') === 'true';
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && collapsed && window.innerWidth > 900) {
      sidebar.classList.add('collapsed');
    }
    positionNavIndicator();
    window.addEventListener('resize', positionNavIndicator);

    // Animate sidebar icons slightly on hover (icon "movement" requirement)
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('active')) return;
      });
    });
  });
})();

// -------------------------------------------------------------
// TOASTS
// -------------------------------------------------------------
function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

const TOAST_ICONS = {
  success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

/**
 * Show a toast notification.
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title
 * @param {string} message
 */
function showToast(type, title, message = '') {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <div>
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;
  stack.appendChild(toast);

  const remove = () => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  };
  setTimeout(remove, 4000);
  toast.addEventListener('click', remove);
}
window.showToast = showToast;

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
window.openModal = openModal;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', () => {
  // Close modal when clicking the overlay background (not the modal itself)
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach((o) => closeModal(o.id));
    }
  });
});

// -------------------------------------------------------------
// BUTTON LOADING STATE
// -------------------------------------------------------------
function setBtnLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('is-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
}
window.setBtnLoading = setBtnLoading;

// -------------------------------------------------------------
// STAGGERED ENTRANCE HELPER
// Adds --i custom property to each matched element so animations.css
// can apply an incremental delay (staggered card/row entrance).
// -------------------------------------------------------------
function applyStagger(selector) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.style.setProperty('--i', i);
  });
}
window.applyStagger = applyStagger;

// -------------------------------------------------------------
// GLOBAL SEARCH SHORTCUT (Ctrl+K / Cmd+K)
// Full implementation arrives in the Smart Search phase.
// For now: focuses the search bar if present.
// -------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const search = document.querySelector('.topbar-search');
    if (search) search.click();
  }
});

// -------------------------------------------------------------
// PROFILE DROPDOWN (simple show/hide)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('.profile-menu-trigger');
  const menu = document.querySelector('.profile-dropdown');
  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));
  }
});

// Re-init Lucide icons after any dynamic DOM change (call after AJAX table updates)
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
window.refreshIcons = refreshIcons;
