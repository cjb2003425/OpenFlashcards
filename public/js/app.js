// app.js – Core SPA: auth, router, state, API helpers
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
window.App = {
  user: null,   // { id, username, role }
  config: null,   // user config from server
  currentPage: null
};

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────────────────────
window.api = async function (method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
async function checkAuth() {
  const offline = window._isReallyOffline ? window._isReallyOffline() : !navigator.onLine;
  console.log('[auth] checkAuth — offline:', offline, '| api patched:', window.api !== window._realApi && !!window._realApi);
  try {
    App.user = await api('GET', '/auth/me');
    console.log('[auth] /auth/me success:', App.user && App.user.username);
    // If offline and config not yet loaded, restore it from IDB bundle
    const isOfflineNow = window._isReallyOffline ? window._isReallyOffline() : !navigator.onLine;
    if (isOfflineNow && !App.config && window.OfflineDB) {
      const bundle = await OfflineDB.getBundle().catch(() => null);
      if (bundle && bundle.config) App.config = bundle.config;
    }
    // Persist for offline refresh (only when online)
    if (!isOfflineNow && window.OfflineSession && App.config) OfflineSession.save(App.user, App.config);
    return true;
  } catch (e) {
    console.warn('[auth] /auth/me failed:', e);
    // The interceptor already handled the offline /auth/me case and returned the
    // user if a session was saved. If we still got an error, no session is available.
    return false;
  }
}

async function doLogin(username, password) {
  const data = await api('POST', '/auth/login', { username, password });
  App.user = data.user;
}

async function doLogout() {
  if (navigator.onLine) await api('POST', '/auth/logout').catch(() => { });
  App.user = null;
  App.config = null;
  if (window.OfflineSession) OfflineSession.clear();
  history.replaceState(null, '', '#');
  showLoginScreen();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
async function loadConfig() {
  // If offline boot already loaded config from IDB bundle, skip network fetch
  const isOffline = window._isReallyOffline ? window._isReallyOffline() : !navigator.onLine;
  if (App.config && isOffline) {
    applyTheme();
    updateOfflineSyncBtn();
    return;
  }
  App.config = await api('GET', '/api/config');
  applyTheme();
  updateOfflineSyncBtn();
  // Persist session for offline refresh
  const isOfflineNow = window._isReallyOffline ? window._isReallyOffline() : !navigator.onLine;
  if (!isOfflineNow && window.OfflineSession && App.user) OfflineSession.save(App.user, App.config);
}

async function saveConfig(patch) {
  App.config = (await api('PUT', '/api/config', patch)).config;
  applyTheme();
  updateNavLangBadge();
  updateOfflineSyncBtn();
  if (window.OfflineSession && App.user) OfflineSession.save(App.user, App.config);
}

function updateOfflineSyncBtn() {
  const btn = document.getElementById('syncOfflineBtn');
  if (!btn) return;
  const enabled = App.config && App.config.offlineMode;
  btn.style.display = enabled ? '' : 'none';
  if (enabled && window.OfflineMode) {
    btn.classList.toggle('sync-btn-offline', !OfflineMode.isOnline);
    btn.title = window.t ? t(OfflineMode.isOnline ? 'offline_sync_now' : 'offline_no_connection') : 'Sync';
  }
  // Show/hide offline banner
  _updateOfflineBanner(enabled && window.OfflineMode && !OfflineMode.isOnline);

  // Pending-sync badge
  if (enabled && window.OfflineDB) {
    OfflineDB.getProgressQueue().then(queue => {
      let badge = document.getElementById('syncPendingBadge');
      const count = queue.length;
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.id = 'syncPendingBadge';
          badge.style.cssText =
            'position:absolute;top:-5px;right:-5px;background:var(--warning,#ff9800);' +
            'color:#fff;border-radius:99px;font-size:.65rem;font-weight:700;' +
            'min-width:16px;height:16px;line-height:16px;text-align:center;padding:0 3px;pointer-events:none';
          btn.style.position = 'relative';
          btn.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = '';
      } else if (badge) {
        badge.style.display = 'none';
      }
    }).catch(() => { });
  }
}

function _updateOfflineBanner(show) {
  let banner = document.getElementById('offlineBanner');
  if (show) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offlineBanner';
      banner.className = 'offline-banner';

      const msg = document.createElement('span');
      msg.innerHTML = phIcon('wifi-slash') + ' ' + (window.t ? t('offline_no_connection') : 'You are offline') + ' – ' + (window.t ? t('offline_readonly') : 'read-only mode');

      const closeBtn = document.createElement('button');
      closeBtn.className = 'offline-banner-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.textContent = 'X';
      closeBtn.addEventListener('click', () => {
        banner.remove();
        if (banner._autoTimer) clearTimeout(banner._autoTimer);
      });

      banner.appendChild(msg);
      banner.appendChild(closeBtn);
      document.body.appendChild(banner);

      // Auto-dismiss after 30 seconds
      banner._autoTimer = setTimeout(() => {
        if (document.getElementById('offlineBanner')) {
          banner.classList.add('offline-banner-hiding');
          banner.addEventListener('animationend', () => banner.remove(), { once: true });
        }
      }, 30000);
    }
  } else {
    if (banner) {
      if (banner._autoTimer) clearTimeout(banner._autoTimer);
      banner.remove();
    }
  }
}

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  const to2 = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function mixColor(hex, target, t) {
  const c = hexToRgb(hex);
  const tg = hexToRgb(target);
  if (!c || !tg) return hex;
  return rgbToHex(c.r + (tg.r - c.r) * t, c.g + (tg.g - c.g) * t, c.b + (tg.b - c.b) * t);
}

function relativeLuminance(hex) {
  const c = hexToRgb(hex);
  if (!c) return 0;
  const ln = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * ln(c.r) + 0.7152 * ln(c.g) + 0.0722 * ln(c.b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgba(hex, alpha) {
  const c = hexToRgb(hex);
  if (!c) return 'rgba(0,0,0,0)';
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

function darkenHex(hex, factor) {
  const c = hexToRgb(hex);
  if (!c) return hex || '#439b00';
  return rgbToHex(c.r * factor, c.g * factor, c.b * factor);
}

window.ACCENT_COLORS = ['#439b00', '#0ea5e9', '#e11d48', '#7c3aed', '#eab308', '#ea580c', '#0d9488', '#f43f5e', '#2563eb', '#65a30d'];

// Make the accent legible against the app background in the active theme.
// Mid-tone colors are used as-is; only colors too close to the background
// (e.g. black in dark mode, white in light mode) are shifted toward the
// opposite end until they reach the minimum contrast.
function ensureVisibleAccent(hex, dark) {
  const bg = dark ? '#121212' : '#ffffff';
  if (contrastRatio(hex, bg) >= 2.5) return hex;
  const target = dark ? '#ffffff' : '#000000';
  let lo = 0, hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixColor(hex, target, mid), bg) >= 2.5) hi = mid; else lo = mid;
  }
  return mixColor(hex, target, hi);
}

function applyAccentColor(color) {
  const root = document.documentElement;
  const dark = root.getAttribute('data-theme') === 'dark';
  const base = color || '#439b00';
  const effective = ensureVisibleAccent(base, dark);
  let onAccent;
  if (effective !== base) {
    // Edge-adjusted color: pick the most readable text ourselves.
    const cW = contrastRatio(effective, '#ffffff');
    const cD = contrastRatio(effective, '#1c1c1c');
    onAccent = cD > cW ? '#1c1c1c' : '#ffffff';
  } else {
    // Standard accent: keep white text except on genuinely light colors.
    onAccent = relativeLuminance(base) > 0.45 ? '#1c1c1c' : '#ffffff';
  }
  root.style.setProperty('--primary', effective);
  root.style.setProperty('--primary-bg', effective);
  root.style.setProperty('--primary-dk', onAccent);
  root.style.setProperty('--primary-hvr', darkenHex(effective, 0.74));
  root.style.setProperty('--primary-bg-correct', hexToRgba(effective, 0.48));
}

function applyTheme() {
  const dark = App.config ? App.config.darkMode : true;
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const accent = App.config && App.config.accentColor;
  if (accent) applyAccentColor(accent);
  updateDarkToggle();
  setAppIconStyles();
  applyChromeIcons();
}

function updateDarkToggle() {
  const dark = App.config ? App.config.darkMode : true;
  const btn = document.getElementById('darkToggle');
  if (btn) btn.innerHTML = phIcon(dark ? 'sun' : 'moon');
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON STYLE SYSTEM (emoji / phosphor icons / none)
// PH_ICONS rows: [key, phosphorGlyph, emoji, essential, cssClass?]
// essential → still rendered as a Phosphor icon even in "none" mode, for bare
// icon-only buttons where text alone cannot convey the action.
// cssClass → extra class for semantic coloring (ph-ok / ph-bad / ph-warn).
// ─────────────────────────────────────────────────────────────────────────────
window.PH_ICONS = [
  // chrome / nav
  ['hamburger', 'list', '☰', true],
  ['sun', 'sun', '☀️', true],
  ['moon', 'moon', '🌙', true],
  ['house', 'house', '🏠', false],
  ['books', 'books', '📚', false],
  ['target', 'target', '🎯', false],
  ['plus', 'plus', '➕', true],
  ['book-bookmark', 'book-bookmark', '📓', false],
  ['gear', 'gear', '⚙️', false],
  ['password', 'password', '🔑', false],
  ['sign-out', 'sign-out', '🚪', true],
  ['arrows-clockwise', 'arrows-clockwise', '🔄', true],
  ['x', 'x', '✕', true],
  ['magnifying-glass', 'magnifying-glass', '🔍', true],
  ['pencil-simple', 'pencil-simple', '✏️', true],
  ['trash', 'trash', '🗑️', true],
  ['link', 'link', '🔗', true],
  ['export', 'export', '📄', true],
  ['files', 'files', '📋', true],
  ['tray-arrow-up', 'tray-arrow-up', '📤', true],
  ['arrow-up', 'arrow-up', '⬆️', true],
  ['arrow-down', 'arrow-down', '⬇️', true],
  ['arrow-right', 'arrow-right', '→', false],
  ['arrow-counter-clockwise', 'arrow-counter-clockwise', '↺', true],
  ['caret-left', 'caret-left', '◀', true],
  ['caret-right', 'caret-right', '▶', true],
  ['caret-down', 'caret-down', '▾', true],
  // vocab types
  ['package', 'package', '📦', false],
  ['lightning', 'lightning', '⚡', false],
  ['palette', 'palette', '🎨', false],
  ['wind', 'wind', '💨', false],
  ['puzzle-piece', 'puzzle-piece', '🧩', false],
  ['chat-circle', 'chat-circle', '💬', false],
  ['lego', 'lego', '📝', false],
  ['book-open', 'book-open', '📖', false],
  ['cards', 'stack', '🃏', false],
  // status feedback
  ['check', 'check', '✅', true, 'ph-ok'],
  ['x-red', 'x', '❌', true, 'ph-bad'],
  ['check-simple', 'check', '✓', false],
  ['x-simple', 'x', '✗', false],
  ['fire', 'fire', '🔥', false, 'ph-warn'],
  // train modes / controls / tts
  ['shuffle', 'shuffle', '🎲', false],
  ['shuffle-rand', 'shuffle', '🔀', false],
  ['pen-nib', 'pen-nib', '✍️', false],
  ['speaker-high', 'speaker-high', '🔊', true],
  ['spinner-gap', 'spinner-gap', '🐌', true],
  ['speaker-slash', 'speaker-slash', '🔇', false],
  ['calendar-dots', 'calendar-dots', '📅', false],
  ['pause', 'pause', '⏸', true],
  ['play', 'play', '▶', true],
  ['hourglass', 'hourglass', '⏳', true],
  ['microphone', 'microphone', '🎙️', false],
  ['cloud-arrow-down', 'cloud-arrow-down', '📥', false],
  ['cloud', 'cloud', '☁️', false],
  ['wifi-slash', 'wifi-slash', '📴', false],
  ['translate', 'translate', '🌐', false],
  ['globe', 'globe', '🌍', false],
  ['arrows-split', 'arrows-split', '📐', false],
  ['user-circle-check', 'user-circle-check', '🔐', false],
  ['tag', 'tag', '🏷️', false],
  ['warning', 'warning', '⚠️', true],
  ['users', 'users', '👥', false],
  ['waveform', 'waveform', '🗄️', false],
  ['image-square', 'image-square', '🖼️', true],
  ['list-checks', 'list-checks', '☑', true],
  ['mailbox', 'mailbox', '📭', false],
  ['confetti', 'confetti', '🎉', false],
  ['repeat', 'repeat', '🔁', false],
  ['printer', 'printer', '🖨️', false],
  ['quotes', 'quotes', '💬', false]
];

window.phIcon = function (key, style, weight) {
  const rec = window.PH_ICONS.find(r => r[0] === key);
  if (!rec) return '';
  const s = style || (App.config && App.config.iconStyle) || 'emoji';
  const w = weight || (App.config && App.config.iconWeight) || 'regular';
  if (s === 'emoji') return rec[2];
  if (s === 'none' && !rec[3]) return '';
  const cls = w === 'bold' ? 'ph-bold' : w === 'fill' ? 'ph-fill' : 'ph';
  const extra = rec[4] ? ' ' + rec[4] : '';
  return '<i class="' + cls + ' ph-' + rec[1] + extra + '"></i>';
};

// Inject the stylesheet for the active font weight (no-op when emoji mode).
window.ensurePhFont = function (weight) {
  let link = document.getElementById('ph-font-css');
  if (!link) {
    link = document.createElement('link');
    link.id = 'ph-font-css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = '/vendor/phosphor/' + (weight || 'regular') + '/style.css';
};

window.setAppIconStyles = function (style, weight, color) {
  const s = style || (App.config && App.config.iconStyle) || 'emoji';
  const w = weight || (App.config && App.config.iconWeight) || 'regular';
  const c = color || (App.config && App.config.iconColor) || 'text';
  ['icon-emoji', 'icon-icons', 'icon-none'].forEach(x => document.body.classList.remove(x));
  document.body.classList.add('icon-' + s);
  ['icon-color-accent', 'icon-color-text'].forEach(x => document.body.classList.remove(x));
  document.body.classList.add('icon-color-' + c);
  // Load the Phosphor stylesheet in every mode. The icon-selector preview and
  // essential icons in "no icons" mode always need the glyph, so the @font-face
  // must stay available; the browser only downloads the woff2 when a glyph
  // element is actually rendered, not just because the CSS is linked.
  ensurePhFont(w);
};

// Static chrome icons in the navbar (dark toggle is handled in updateDarkToggle).
function applyChromeIcons() {
  const set = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = phIcon(key);
  };
  set('hamburger', 'hamburger');
  set('syncOfflineBtn', 'arrows-clockwise');
  set('logoutBtn', 'sign-out');
  set('modalClose', 'x');
}

function currentLang() {
  return App.config && App.config.currentLang ? App.config.currentLang : null;
}

function currentLangData() {
  if (!App.config || !App.config.currentLang) return null;
  const base = (App.config.targetLangs || []).find(l => l.isoCode === App.config.currentLang) || null;
  if (!base) return null;
  // Enrich with pronouns
  const pronouns = (window.LANG_PRONOUNS && window.LANG_PRONOUNS[base.isoCode]) || null;
  return pronouns ? { ...base, pronouns } : base;
}

function updateNavLangBadge() {
  const badge = document.getElementById('navLangBadge');
  if (!badge) return;
  const ld = currentLangData();
  badge.textContent = ld ? (ld.flag || '') + ' ' + ld.isoCode.toUpperCase() : '';
  badge.style.display = ld ? '' : 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
}

function showAppShell() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────
window.navigate = function (page, params, _fromPopState) {
  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');

  App.currentPage = page;

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Push page to browser history so back/forward buttons work
  if (!_fromPopState) {
    let hash = '#/' + page;
    if (params && Object.keys(params).length) {
      hash += '?' + Object.entries(params).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    }
    if (window.location.hash !== hash) {
      history.pushState({ page, params }, '', hash);
    }
  }

  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>' + t('app_loading') + '</p></div>';

  const renderers = {
    home: renderHome,
    vocabulary: renderVocabulary,
    add: renderAdd,
    train: renderTrain,
    settings: renderSettings,
    admin: renderAdmin,
    notebook: renderNotebook,
    print: renderPrintQuiz
  };

  (renderers[page] || renderHome)(content, params || {});
};

// Handle browser back/forward buttons and manual hash changes
window.addEventListener('popstate', function (e) {
  if (!App.user) return;
  const page = (e.state && e.state.page) || getPageFromHash();
  if (page) {
    navigate(page, (e.state && e.state.params) || getParamsFromHash(), true);
  }
});

window.addEventListener('hashchange', function () {
  if (!App.user) return;
  const page = getPageFromHash();
  const params = getParamsFromHash();
  if (page && page !== App.currentPage) {
    navigate(page, params, true);
  }
});

function getPageFromHash() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#/')) {
    const [pathPart, queryPart] = hash.slice(2).split('?');
    const page = pathPart.split('/')[0];
    if (['home', 'vocabulary', 'add', 'train', 'settings', 'admin', 'notebook', 'print'].includes(page)) {
      return page;
    }
  }
  return null;
}

function getParamsFromHash() {
  const hash = window.location.hash;
  const params = {};
  if (hash && hash.includes('?')) {
    const qs = hash.split('?')[1];
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=').map(s => decodeURIComponent(s));
      if (k) params[k] = v;
    });
  }
  return params;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
window.openModal = function (title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('modal').classList.remove('hidden');
};

window.closeModal = function () {
  document.getElementById('modal').classList.add('hidden');
};

// Close on backdrop click
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

window.confirmModal = function (message, opts = {}) {
  return new Promise(resolve => {
    const okId = 'cmOk';
    const cancelId = 'cmCancel';
    const extraId = 'cmExtra';
    let finished = false;
    const modal = document.getElementById('modal');
    const wasHidden = modal.classList.contains('hidden');
    const prevTitle = document.getElementById('modalTitle').textContent;
    const prevBody = document.getElementById('modalBody').innerHTML;
    const prevFooter = document.getElementById('modalFooter').innerHTML;

    function finish(val) {
      if (finished) return;
      finished = true;
      if (wasHidden) {
        closeModal();
      } else {
        openModal(prevTitle, prevBody, prevFooter);
      }
      resolve(val);
    }

    const extraHtml = opts.extraButton
      ? `<button class="btn ${opts.extraButtonClass || 'btn-secondary'}" id="${extraId}">${opts.extraButton}</button>`
      : '';

    openModal(
      opts.title || t('common_confirm') || 'Confirm',
      `<p style="margin:0;line-height:1.5">${message}</p>`,
      `${extraHtml}
       <button class="btn btn-secondary" id="${cancelId}">${opts.cancelLabel || t('common_cancel')}</button>
       <button class="btn ${opts.confirmBtnClass || 'btn-danger'}" id="${okId}">${opts.confirmLabel || t('common_delete') || 'Delete'}</button>`
    );

    document.getElementById(okId).addEventListener('click', () => finish(true));
    document.getElementById(cancelId).addEventListener('click', () => finish(false));
    if (opts.extraButton) {
      document.getElementById(extraId).addEventListener('click', () => finish(-1));
    }

    const observer = new MutationObserver(() => {
      if (modal.classList.contains('hidden')) {
        observer.disconnect();
        finish(false);
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
};

window.promptModal = function (message, opts = {}) {
  return new Promise(resolve => {
    const inputId = 'pmInput';
    const okId = 'pmOk';
    const cancelId = 'pmCancel';
    const modal = document.getElementById('modal');
    const wasHidden = modal.classList.contains('hidden');
    const prevTitle = document.getElementById('modalTitle').textContent;
    const prevBody = document.getElementById('modalBody').innerHTML;
    const prevFooter = document.getElementById('modalFooter').innerHTML;

    function finish(val) {
      if (wasHidden) {
        closeModal();
      } else {
        openModal(prevTitle, prevBody, prevFooter);
      }
      resolve(val);
    }

    const defaultValue = opts.default || '';
    const placeholder = opts.placeholder || '';

    openModal(
      opts.title || message,
      `<input type="text" id="${inputId}" class="search-input" style="width:100%;box-sizing:border-box" value="${defaultValue.replace(/"/g, '&quot;')}" placeholder="${placeholder.replace(/"/g, '&quot;')}" autofocus>
       <p id="pmError" class="alert alert-danger hidden" style="margin-top:8px"></p>`,
      `<button class="btn btn-secondary" id="${cancelId}">${opts.cancelLabel || t('common_cancel')}</button>
       <button class="btn btn-primary" id="${okId}">${opts.confirmLabel || t('common_confirm') || 'OK'}</button>`
    );

    const input = document.getElementById(inputId);
    input.focus();
    input.select();

    function getValue() {
      const val = input.value.trim();
      if (opts.required && !val) {
        const err = document.getElementById('pmError');
        err.textContent = opts.requiredMessage || 'This field is required';
        err.classList.remove('hidden');
        return null;
      }
      return val;
    }

    document.getElementById(okId).addEventListener('click', () => {
      const val = getValue();
      if (val !== null) finish(val);
    });
    document.getElementById(cancelId).addEventListener('click', () => finish(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = getValue();
        if (val !== null) finish(val);
      }
      if (e.key === 'Escape') finish(null);
    });

    const observer = new MutationObserver(() => {
      if (modal.classList.contains('hidden')) {
        observer.disconnect();
        finish(null);
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
window.toast = function (msg, type = 'success', html = false) {
  const el = document.createElement('div');
  el.className = `alert alert-${type}`;
  el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:320px;box-shadow:0 4px 16px rgba(0,0,0,.2);animation:fadeIn .2s';
  el[html ? 'innerHTML' : 'textContent'] = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for English locale to be ready before anything renders.
  // offline-db.js may still be populating _offlineLocaleBundle from IDB,
  // so we give it a short extra tick before resolving i18nReady.
  await window._i18nReady;

  // If offline and locale strings are still empty, try loading from IDB bundle directly
  if (!navigator.onLine && Object.keys(window._i18nStrings || {}).length < 5) {
    try {
      const bundle = window._offlineLocaleBundle ||
        (window.OfflineDB ? (await OfflineDB.getBundle().catch(() => null) || {}).locales : null);
      if (bundle) {
        const code = (navigator.language || 'en').split('-')[0].toLowerCase();
        const locale = bundle[code] || bundle['en'];
        if (locale) { window._i18nStrings = locale; window._uiLang = code; window._i18nCache = window._i18nCache || {}; window._i18nCache[code] = locale; }
      }
    } catch { }
  }

  // Detect browser language for login screen before user logs in
  const browserLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  await window.setUiLang(browserLang);
  applyLoginLabels();

  // Login form
  const loginBtn = document.getElementById('loginBtn');
  const loginUser = document.getElementById('loginUsername');
  const loginPass = document.getElementById('loginPassword');
  const loginErr = document.getElementById('loginError');

  async function attemptLogin() {
    loginErr.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = t('app_signing_in');
    try {
      await doLogin(loginUser.value.trim(), loginPass.value);
      await bootApp(true);
    } catch (e) {
      var errorLabel
      if (e.error === "Invalid credentials.") {
        errorLabel = t('login_error')
      } else if (e.error === "Username and password required.") {
        errorLabel = t('login_error_empty')
      } else {
        errorLabel = e.error
      }

      loginErr.textContent = errorLabel;
      loginErr.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.textContent = t('login_btn') + " →";
    }
  }

  loginBtn.addEventListener('click', attemptLogin);
  loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
  loginUser.addEventListener('keydown', e => { if (e.key === 'Enter') loginPass.focus(); });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', doLogout);

  // Dark mode toggle
  document.getElementById('darkToggle').addEventListener('click', async () => {
    const dark = !(App.config && App.config.darkMode);
    await saveConfig({ darkMode: dark });
    updateDarkToggle();
  });

  // Hamburger menu
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // Nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.page);
    });
  });

  // Check existing session
  const authed = await checkAuth();
  if (authed) {
    // If we have config already (offline restore), apply the user's language
    // immediately so the UI renders in the right language from the start
    if (App.config) {
      const uiLang = App.config.uiLang || App.config.nativeLang;
      if (uiLang) await window.setUiLang(uiLang);
    }
    await bootApp();
  } else {
    showLoginScreen();
    loginUser.focus();
  }
});

// ── Offline sync trigger (called by navbar sync button) ───────────────────────
window._triggerOfflineSync = async function () {
  const btn = document.getElementById('syncOfflineBtn');
  if (!btn) return;
  if (!navigator.onLine) {
    toast(window.t ? t('offline_no_connection') : 'No connection', 'danger');
    return;
  }
  btn.innerHTML = phIcon('hourglass');
  btn.disabled = true;
  try {
    const targetLangs = (App.config && App.config.targetLangs) || [];
    const langs = targetLangs.map(l => l.isoCode);
    const configByLang = {};
    targetLangs.forEach(l => { configByLang[l.isoCode] = l; });

    await OfflineSync.fullSync(langs, configByLang, progress => {
      if (progress.phase === 'data') btn.innerHTML = phIcon('package');
      else if (progress.phase === 'tts_gen') btn.innerHTML = phIcon('microphone');
      else if (progress.phase === 'tts_dl') btn.innerHTML = phIcon('cloud-arrow-down');
    });
    btn.innerHTML = phIcon('check');
    toast(window.t ? t('offline_sync_done') : 'Sync complete ✓');
    setTimeout(() => { btn.innerHTML = phIcon('arrows-clockwise'); btn.disabled = false; }, 2000);
  } catch (err) {
    console.error('[offline sync]', err);
    btn.innerHTML = phIcon('x-red');
    toast(window.t ? t('offline_sync_error') : 'Sync failed', 'danger');
    setTimeout(() => { btn.innerHTML = phIcon('arrows-clockwise'); btn.disabled = false; }, 2000);
  }
};



// ─────────────────────────────────────────────────────────────────────────────
// I18N HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function applyNavLabels() {
  const items = {
    navHome: ['nav_home', 'house'],
    navVocab: ['nav_vocabulary', 'books'],
    navTrain: ['nav_train', 'target'],
    navAdd: ['nav_add', 'plus'],
    navNotebook: ['nav_notebook', 'book-bookmark'],
    navPrint: ['nav_print', 'printer'],
    navSettings: ['nav_settings', 'gear'],
    adminLink: ['nav_admin', 'password']
  };

  const style = (App.config && App.config.iconStyle) || 'emoji';

  Object.entries(items).forEach(([id, [key, iconKey]]) => {
    const el = document.getElementById(id);
    if (!el) return;

    const label = t(key);
    if (style === 'emoji' || style === 'icons') {
      el.innerHTML = phIcon(iconKey) + ' ' + label;
    } else {
      el.textContent = label;
    }
  });

  // Admin link: only visible to admins. Always enforce this after any textContent reset.
  const al = document.getElementById('adminLink');
  if (al) al.style.display = (App.user && App.user.role === 'admin') ? '' : 'none';

  // Language tools: hidden for admin users (admins only manage users)
  const isAdmin = App.user && App.user.role === 'admin';
  ['navHome', 'navVocab', 'navAdd', 'navTrain', 'navNotebook', 'navPrint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'none' : '';
  });
  // Settings also hidden for admin (no languages to configure)
  const navSettings = document.getElementById('navSettings');
  if (navSettings) navSettings.style.display = isAdmin ? 'none' : '';
}

function applyLoginLabels() {
  const sub = document.getElementById('loginSub');
  const ul = document.getElementById('loginUserLabel');
  const pl = document.getElementById('loginPassLabel');
  const btn = document.getElementById('loginBtn');
  if (sub) sub.textContent = t('login_title');
  if (ul) ul.textContent = t('login_username');
  if (pl) pl.textContent = t('login_password');
  if (btn) btn.textContent = t('login_btn') + " →";
}

async function bootApp(fromLogin) {
  await loadConfig();
  // Apply the user's preferred UI language (uiLang takes precedence over nativeLang)
  const preferredUiLang = (App.config && App.config.uiLang) || (App.config && App.config.nativeLang);
  if (preferredUiLang) {
    await window.setUiLang(preferredUiLang);
  }
  applyNavLabels();
  showAppShell();

  // Admin → direct to admin panel, no language tools
  if (App.user.role === 'admin') {
    document.getElementById('appShell').querySelector('.navbar').style.display = '';
    history.replaceState({ page: 'admin' }, '', '#/admin');
    navigate('admin', {}, true);
    return;
  }

  // Regular user: onboarding if no languages configured yet
  if (!App.config.targetLangs || !App.config.targetLangs.length) {
    renderOnboarding(document.getElementById('pageContent'));
    document.getElementById('appShell').querySelector('.navbar').style.display = 'none';
  } else {
    document.getElementById('appShell').querySelector('.navbar').style.display = '';
    updateNavLangBadge();
    const targetPage = fromLogin ? 'home' : (getPageFromHash() || 'home');
    const hashParams = fromLogin ? {} : getParamsFromHash();
    history.replaceState({ page: targetPage, params: hashParams }, '', fromLogin ? '#/home' : window.location.hash || '#/' + targetPage);
    navigate(targetPage, hashParams, true);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────
function renderOnboarding(el) {
  el.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div id="onbWelcomeIcon" style="font-size:2.5rem;margin-bottom:8px">${phIcon('cards')}</div>
        <h2>${t('onb_welcome')}</h2>
        <p>${t('onb_native_q')}</p>

        <div class="field-group your-language">
          <label>${t('onb_your_language')}</label>
          <input type="text" id="onbNativeSearch" placeholder="${t('onb_search')}" autocomplete="off">
          <div id="onbNativeResults" class="lang-results" style="display:none"></div>
          <div id="onbNativeChip" style="margin-top:8px"></div>
        </div>

        <p style="margin-top:8px">${t('onb_learn_q')}</p>
        <div class="field-group languages-to-learn">
          <label>${t('onb_language_to_learn')}</label>
          <input type="text" id="onbLearnSearch" placeholder="${t('onb_search')}" autocomplete="off">
          <div id="onbLearnResults" class="lang-results" style="display:none"></div>
          <div id="onbLearnChips" class="selected-chips"></div>
        </div>

        <div class="field-group" style="margin-top:16px" id="onbColorGroup">
          <label>${t('onb_color')}</label>
          <div class="accent-row">
            <input type="color" id="onbAccentInput" value="#439b00" title="${t('onb_color_custom')}">
            <span id="onbAccentHex" class="accent-hex">#439B00</span>
          </div>
          <div id="onbAccentSwatches" class="color-swatches"></div>
        </div>

        <div class="field-group" style="margin-top:16px" id="onbIconGroup">
          <label>${t('onb_icon_style')}</label>
          <div class="seg-row" id="onbIconStyleSeg" role="group" aria-label="${t('onb_icon_style')}">
            <button type="button" class="seg-btn active" data-style="emoji">${phIcon('cards', 'emoji')} ${t('onb_icon_emoji')}</button>
            <button type="button" class="seg-btn" data-style="icons"><span id="onbPvIcons">${phIcon('cards', 'icons', 'regular')}</span> ${t('onb_icon_icons')}</button>
            <button type="button" class="seg-btn" data-style="none" id="onbIconNoneBtn">${t('onb_icon_none')}</button>
          </div>
        </div>

        <div class="field-group" id="onbIconWeightGroup" style="margin-top:8px;display:none">
          <label>${t('onb_icon_weight')}</label>
          <div class="seg-row" id="onbIconWeightSeg" role="group" aria-label="${t('onb_icon_weight')}">
            <button type="button" class="seg-btn active" data-weight="regular" id="onbWReg">${t('onb_icon_weight_regular')}</button>
            <button type="button" class="seg-btn" data-weight="bold" id="onbWBold">${t('onb_icon_weight_bold')}</button>
            <button type="button" class="seg-btn" data-weight="fill" id="onbWFill">${t('onb_icon_weight_fill')}</button>
          </div>
        </div>

        <div class="field-group" id="onbIconColorGroup" style="margin-top:8px;display:none">
          <label>${t('onb_icon_color')}</label>
          <div class="seg-row" id="onbIconColorSeg" role="group" aria-label="${t('onb_icon_color')}">
            <button type="button" class="seg-btn" data-color="accent">${phIcon('cards', 'icons', 'regular')} ${t('onb_icon_color_accent')}</button>
            <button type="button" class="seg-btn active" data-color="text">${phIcon('cards', 'icons', 'regular')} ${t('onb_icon_color_text')}</button>
          </div>
        </div>

        <div id="onbError" class="alert alert-danger hidden"></div>
        <button class="btn btn-primary btn-full" id="onbStartBtn">${t('onb_start')} →</button>
      </div>
    </div>`;

  let nativeLang = null;
  let accentColor = '#439b00';
  const learnLangs = {};
  let iconStyle = 'emoji';
  let iconWeight = 'regular';
  let iconColor = 'text';

  // Icon style / weight selection (live preview)
  ensurePhFont('regular');
  const onbStyleSeg = document.getElementById('onbIconStyleSeg');
  const onbWeightGroup = document.getElementById('onbIconWeightGroup');
  const onbWeightSeg = document.getElementById('onbIconWeightSeg');
  const onbColorGroup = document.getElementById('onbIconColorGroup');
  const onbColorSeg = document.getElementById('onbIconColorSeg');
  const updateOnbWelcomeIcon = () => {
    const w = document.getElementById('onbWelcomeIcon');
    if (w) w.innerHTML = phIcon('cards', iconStyle, iconWeight);
  };
  const updateOnbPvIcons = () => {
    const pv = document.getElementById('onbPvIcons');
    if (pv) pv.innerHTML = phIcon('cards', 'icons', iconWeight);
  };
  if (onbStyleSeg) {
    onbStyleSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', () => {
        iconStyle = b.dataset.style;
        onbStyleSeg.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
        if (onbWeightGroup) onbWeightGroup.style.display = iconStyle === 'icons' ? '' : 'none';
        if (onbColorGroup) onbColorGroup.style.display = iconStyle === 'icons' ? '' : 'none';
        setAppIconStyles(iconStyle, iconWeight, iconColor);
        updateOnbWelcomeIcon();
      });
    });
  }
  if (onbWeightSeg) {
    onbWeightSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', () => {
        iconWeight = b.dataset.weight;
        onbWeightSeg.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
        updateOnbPvIcons();
        setAppIconStyles(iconStyle, iconWeight, iconColor);
        updateOnbWelcomeIcon();
      });
    });
  }
  if (onbColorSeg) {
    onbColorSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', () => {
        iconColor = b.dataset.color;
        onbColorSeg.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
        setAppIconStyles(iconStyle, iconWeight, iconColor);
        updateOnbWelcomeIcon();
      });
    });
  }

  // Main (accent) color selection
  const onbAccentInput = document.getElementById('onbAccentInput');
  const onbAccentHex = document.getElementById('onbAccentHex');
  const onbAccentSwatches = document.getElementById('onbAccentSwatches');
  const ACCENT_COLORS = window.ACCENT_COLORS || ['#439b00', '#0ea5e9', '#e11d48', '#7c3aed', '#eab308', '#ea580c', '#0d9488', '#f43f5e'];
  if (onbAccentSwatches) {
    onbAccentSwatches.innerHTML = ACCENT_COLORS.map(c =>
      `<button type="button" class="color-swatch${c.toLowerCase() === '#439b00' ? ' active' : ''}" data-color="${c}" style="background:${c}" title="${c.toUpperCase()}"></button>`
    ).join('');
    onbAccentSwatches.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        accentColor = sw.dataset.color;
        onbAccentInput.value = accentColor;
        if (onbAccentHex) onbAccentHex.textContent = accentColor.toUpperCase();
        onbAccentSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        if (window.applyAccentColor) window.applyAccentColor(accentColor);
      });
    });
  }
  if (onbAccentInput) {
    onbAccentInput.addEventListener('input', () => {
      accentColor = onbAccentInput.value;
      if (onbAccentHex) onbAccentHex.textContent = accentColor.toUpperCase();
      if (onbAccentSwatches) onbAccentSwatches.querySelectorAll('.color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color.toLowerCase() === accentColor.toLowerCase()));
      if (window.applyAccentColor) window.applyAccentColor(accentColor);
    });
  }

  // Native search
  const nSearch = document.getElementById('onbNativeSearch');
  const nResults = document.getElementById('onbNativeResults');
  const nChip = document.getElementById('onbNativeChip');

  nSearch.addEventListener('input', () => {
    const q = nSearch.value.trim().toLowerCase();
    const list = (window.WORLD_LANGUAGES || []).filter(l =>
      l.name.toLowerCase().includes(q) || (l.native || '').toLowerCase().includes(q) || l.code.includes(q)
    ).slice(0, 40);
    nResults.style.display = list.length ? '' : 'none';
    nResults.innerHTML = list.map(l =>
      `<div class="lang-result-item" data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag || '🌐'}" data-native="${l.native || l.name}">
        <span>${l.flag || '🌐'}</span><span>${l.name}</span><small style="color:var(--text-faint)">${l.code}</small>
      </div>`
    ).join('');
    nResults.querySelectorAll('.lang-result-item').forEach(item => {
      item.addEventListener('click', () => {
        nativeLang = { code: item.dataset.code, name: item.dataset.name, flag: item.dataset.flag, native: item.dataset.native };
        nSearch.value = nativeLang.name;
        nResults.style.display = 'none';
        nChip.innerHTML = `<span class="selected-chip">${nativeLang.flag} ${nativeLang.name}</span>`;
        // Switch UI language immediately (async — re-render after load)
        window.setUiLang(nativeLang.code).then(() => {
          applyLoginLabels();
          // Re-render onboarding texts in the new language
          document.querySelector('.onboarding-card h2').textContent = t('onb_welcome');
          document.querySelector('.onboarding-card > p').textContent = t('onb_native_q');
          document.querySelector('.your-language > label').textContent = t('onb_your_language');
          document.querySelector('.languages-to-learn > label').textContent = t('onb_language_to_learn');
          document.querySelector('.languages-to-learn > input').placeholder = t('onb_search');
          const learnP = document.querySelector('.onboarding-card p[style]');
          if (learnP) learnP.textContent = t('onb_learn_q');
          const onbColorLabel = document.querySelector('#onbColorGroup > label');
          if (onbColorLabel) onbColorLabel.textContent = t('onb_color');
          const onbIconLabel = document.querySelector('#onbIconGroup > label');
          if (onbIconLabel) onbIconLabel.textContent = t('onb_icon_style');
          const onbWeightLabel = document.querySelector('#onbIconWeightGroup > label');
          if (onbWeightLabel) onbWeightLabel.textContent = t('onb_icon_weight');
          const onbIconNoneBtn = document.getElementById('onbIconNoneBtn');
          if (onbIconNoneBtn) onbIconNoneBtn.textContent = t('onb_icon_none');
          for (const [id, key] of [['onbWReg', 'onb_icon_weight_regular'], ['onbWBold', 'onb_icon_weight_bold'], ['onbWFill', 'onb_icon_weight_fill']]) {
            const b = document.getElementById(id);
            if (b) b.textContent = t(key);
          }
          const startBtn = document.getElementById('onbStartBtn');
          if (startBtn) startBtn.textContent = `${t('onb_start')} →`;
        });
      });
    });

    // Learn search
    const lSearch = document.getElementById('onbLearnSearch');
    const lResults = document.getElementById('onbLearnResults');
    const lChips = document.getElementById('onbLearnChips');

    lSearch.addEventListener('input', () => {
      const q = lSearch.value.trim().toLowerCase();
      const list = (window.WORLD_LANGUAGES || []).filter(l =>
        l.name.toLowerCase().includes(q) || (l.native || '').toLowerCase().includes(q) || l.code.includes(q)
      ).slice(0, 40);
      lResults.style.display = list.length ? '' : 'none';
      lResults.innerHTML = list.map(l =>
        `<div class="lang-result-item" data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag || '🌐'}" data-native="${l.native || l.name}">
        <span>${l.flag || '🌐'}</span><span>${l.name}</span><small style="color:var(--text-faint)">${l.code}</small>
      </div>`
      ).join('');
      lResults.querySelectorAll('.lang-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const code = item.dataset.code;
          if (learnLangs[code]) return;
          learnLangs[code] = { isoCode: code, name: item.dataset.name, flag: item.dataset.flag, nativeName: item.dataset.native };
          lSearch.value = '';
          lResults.style.display = 'none';
          renderLearnChips();
        });
      });
    });

    function renderLearnChips() {
      lChips.innerHTML = Object.values(learnLangs).map(l =>
        `<span class="selected-chip" data-code="${l.isoCode}" title="Click to remove">${l.flag} ${l.name}</span>`
      ).join('');
      lChips.querySelectorAll('.selected-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          delete learnLangs[chip.dataset.code];
          renderLearnChips();
        });
      });
    }

    document.getElementById('onbStartBtn').addEventListener('click', async () => {
      const errEl = document.getElementById('onbError');
      if (!nativeLang) { errEl.textContent = t('onb_error_native'); errEl.classList.remove('hidden'); return; }
      if (!Object.keys(learnLangs).length) { errEl.textContent = t('onb_error_learn'); errEl.classList.remove('hidden'); return; }

      try {
        await saveConfig({ nativeLang: nativeLang.code, uiLang: nativeLang.code, accentColor, iconStyle, iconWeight, iconColor });
        for (const l of Object.values(learnLangs)) {
          await api('POST', '/api/languages', l);
        }
        await loadConfig();
        await window.setUiLang(nativeLang.code);
        applyNavLabels();
        document.getElementById('appShell').querySelector('.navbar').style.display = '';
        updateNavLangBadge();
        history.replaceState({ page: 'home' }, '', '#/home');
        navigate('home', {}, true);
      } catch (e) {
        errEl.textContent = e.error || t('app_setup_failed');
        errEl.classList.remove('hidden');
      }
    });
  });
}
