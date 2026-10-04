// pages/settings.js
'use strict';

async function renderSettings(el) {
  const cfg = App.config;
  const ic = window.phIcon;

  el.innerHTML = `
    <div class="page-title">${ic('gear')} ${t('settings_title')}</div>

    <div class="card settings-section">
      <h2>${ic('globe')} ${t('settings_languages')}</h2>
      <div id="langChips" class="lang-chips"></div>
      <div class="field-group" style="margin-top:12px">
        <label>${t('settings_add_lang')}</label>
        <input type="text" id="settingsLangSearch" placeholder="${t('settings_add_lang_ph')}" autocomplete="off">
        <div id="settingsLangResults" class="lang-results" style="display:none"></div>
      </div>
      <button class="btn btn-primary btn-sm" id="addLangBtn" disabled onclick="addLangFromSettings()">${t('settings_add_btn')} →</button>
    </div>

    <div class="card settings-section">
      <h2>${ic('translate')} ${t('settings_ui_lang')}</h2>
      <div class="field-group">
        <div class="combobox-wrap">
          <input type="text" id="uiLangSearch" placeholder="${t('settings_ui_lang_ph')}" autocomplete="off" value="${getUiLangName()}">
          <span class="combobox-arrow" id="uiLangArrow">▼</span>
        </div>
        <div id="uiLangResults" class="lang-results" style="display:none"></div>
      </div>
    </div>

    <div class="card settings-section">
      <h2>${ic('palette')} ${t('settings_appearance')}</h2>
      <div class="toggle-row">
      <label class="toggle-switch">
          <input type="checkbox" id="darkModeToggle" ${cfg.darkMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span>${t('settings_dark')}</span>
      </div>
      <div class="toggle-row">
        <label class="toggle-switch">
          <input type="checkbox" id="hideZeroStatsToggle" ${cfg.hideZeroStats ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span>${t('settings_hide_zero_stats')}</span>
      </div>
      <div class="accent-field">
        <label>${t('settings_main_color')}</label>
        <div class="accent-row">
          <input type="color" id="accentColorInput" value="${cfg.accentColor || '#439b00'}" title="${t('settings_main_color_custom')}">
          <span id="accentColorHex" class="accent-hex">${(cfg.accentColor || '#439b00').toUpperCase()}</span>
        </div>
        <div id="accentSwatches" class="color-swatches"></div>
      </div>
      <div class="field-group" style="margin-top:14px">
        <label>${t('settings_icon_style')}</label>
        <div class="seg-row" id="settingsIconStyleSeg" role="group" aria-label="${t('settings_icon_style')}">
          <button type="button" class="seg-btn ${cfg.iconStyle === 'emoji' ? 'active' : ''}" data-style="emoji">${phIcon('cards', 'emoji')} ${t('settings_icon_emoji')}</button>
          <button type="button" class="seg-btn ${cfg.iconStyle === 'icons' ? 'active' : ''}" data-style="icons"><span id="settingsPvIcons">${phIcon('cards', 'icons', cfg.iconWeight)}</span> ${t('settings_icon_icons')}</button>
          <button type="button" class="seg-btn ${cfg.iconStyle === 'none' ? 'active' : ''}" data-style="none" id="settingsIconNoneBtn">${t('settings_icon_none')}</button>
        </div>
      </div>
      <div class="field-group" id="settingsIconWeightGroup" style="margin-top:8px;display:${cfg.iconStyle === 'icons' ? '' : 'none'}">
        <label>${t('settings_icon_weight')}</label>
        <div class="seg-row" id="settingsIconWeightSeg" role="group" aria-label="${t('settings_icon_weight')}">
          <button type="button" class="seg-btn ${(cfg.iconWeight || 'regular') === 'regular' ? 'active' : ''}" data-weight="regular" id="settingsWReg">${t('settings_icon_weight_regular')}</button>
          <button type="button" class="seg-btn ${(cfg.iconWeight || 'regular') === 'bold' ? 'active' : ''}" data-weight="bold" id="settingsWBold">${t('settings_icon_weight_bold')}</button>
          <button type="button" class="seg-btn ${(cfg.iconWeight || 'regular') === 'fill' ? 'active' : ''}" data-weight="fill" id="settingsWFill">${t('settings_icon_weight_fill')}</button>
        </div>
      </div>
      <div class="field-group" id="settingsIconColorGroup" style="margin-top:8px;display:${cfg.iconStyle === 'icons' ? '' : 'none'}">
        <label>${t('settings_icon_color')}</label>
        <div class="seg-row" id="settingsIconColorSeg" role="group" aria-label="${t('settings_icon_color')}">
          <button type="button" class="seg-btn ${(cfg.iconColor || 'text') === 'accent' ? 'active' : ''}" data-color="accent" id="settingsColorAccent">${phIcon('cards', 'icons', cfg.iconWeight)} ${t('settings_icon_color_accent')}</button>
          <button type="button" class="seg-btn ${(cfg.iconColor || 'text') === 'text' ? 'active' : ''}" data-color="text" id="settingsColorText">${phIcon('cards', 'icons', cfg.iconWeight)} ${t('settings_icon_color_text')}</button>
        </div>
      </div>
    </div>

    <div class="card settings-section">
      <h2>${ic('calendar-dots')} ${t('settings_date_format')}</h2>
      <p style="color:var(--text-muted);margin-bottom:12px;font-size:.9rem">${t('settings_date_format_desc')}</p>
      <div class="field-group">
        <select id="dateFormatSelect" style="padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text);font-size:.9rem;width:100%">
          ${['DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'D-M-YYYY', 'DD.MM.YYYY', 'D.M.YYYY', 'MM/DD/YYYY', 'M/D/YYYY', 'MM-DD-YYYY', 'M-D-YYYY', 'MM.DD.YYYY', 'M.D.YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYYMMDD'].map(fmt =>
    `<option value="${fmt}" ${(cfg.dateFormat || 'DD/MM/YYYY') === fmt ? 'selected' : ''}>${fmt}</option>`
  ).join('')}
        </select>
        <p id="dateFormatPreview" style="margin-top:8px;font-size:.85rem;color:var(--text-faint);text-align:center"></p>
      </div>
    </div>

    <div class="card settings-section" id="offlineSection">
      <h2>${ic('wifi-slash')} ${t('offline_title')}</h2>
      <p style="color:var(--text-muted);margin-bottom:12px;font-size:.9rem">${t('offline_desc')}</p>
      <div class="toggle-row" style="margin-bottom:16px">        
        <label class="toggle-switch">
          <input type="checkbox" id="offlineModeToggle" ${cfg.offlineMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span>${t('offline_enable')}</span>
      </div>

      <div id="offlineControls" style="display:${cfg.offlineMode ? '' : 'none'}">
        <div id="offlineStatus" class="offline-status-box" style="margin-bottom:14px"></div>
        <div id="offlineSyncProgress" style="display:none;margin-top:12px">
          <div class="offline-progress-bar-wrap">
            <div class="offline-progress-bar" id="offlineProgressBar" style="width:0%"></div>
          </div>
          <p id="offlineProgressText" style="font-size:.82rem;color:var(--text-muted);margin-top:6px"></p>
        </div>
      </div>

      <div id="offlineActionRow" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
        <button class="btn btn-primary btn-sm" id="offlineSyncNowBtn" style="display:${cfg.offlineMode ? '' : 'none'}" onclick="window._triggerOfflineSync && window._triggerOfflineSync()">
          ${phIcon('arrows-clockwise')} ${t('offline_sync_now')}
        </button>
        <button class="btn btn-secondary btn-sm" id="offlineClearBtn" style="display:none">
          ${phIcon('trash')} ${t('offline_clear')}
        </button>
      </div>
    </div>`;

  renderLangChips();

  // Dark mode
  document.getElementById('darkModeToggle').addEventListener('change', async function () {
    await saveConfig({ darkMode: this.checked });
    updateDarkToggle();
  });

  // ── Icon style / weight ─────────────────────────────────────────────────────
  const iconStyleSeg = document.getElementById('settingsIconStyleSeg');
  const iconWeightSeg = document.getElementById('settingsIconWeightSeg');
  // After a live style/weight change, re-apply chrome/nav and re-render this page
  // so no already-rendered <i> keeps the previous weight's class (which the old
  // swapped-out stylesheet would otherwise leave unstyled → blank icons).
  const reapplyIconPresentation = () => {
    setAppIconStyles();
    applyNavLabels();
    applyChromeIcons();
    renderSettings(document.getElementById('pageContent'));
  };
  if (iconStyleSeg) {
    iconStyleSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', async () => {
        const style = b.dataset.style;
        await saveConfig({ iconStyle: style });
        reapplyIconPresentation();
        toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
      });
    });
  }
  if (iconWeightSeg) {
    iconWeightSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', async () => {
        const weight = b.dataset.weight;
        await saveConfig({ iconWeight: weight });
        reapplyIconPresentation();
        toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
      });
    });
  }
  const iconColorSeg = document.getElementById('settingsIconColorSeg');
  if (iconColorSeg) {
    iconColorSeg.querySelectorAll('.seg-btn').forEach(b => {
      b.addEventListener('click', async () => {
        const color = b.dataset.color;
        await saveConfig({ iconColor: color });
        applyNavLabels();
        applyChromeIcons();
        setAppIconStyles();
        renderSettings(document.getElementById('pageContent'));
        toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
      });
    });
  }

  // Hide zero stats on home page
  document.getElementById('hideZeroStatsToggle').addEventListener('change', async function () {
    await saveConfig({ hideZeroStats: this.checked });
    toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
  });

  // ── Main (accent) color ────────────────────────────────────────────────────
  const ACCENT_COLORS = window.ACCENT_COLORS || ['#439b00', '#0ea5e9', '#e11d48', '#7c3aed', '#eab308', '#ea580c', '#0d9488', '#f43f5e'];
  const accentInput = document.getElementById('accentColorInput');
  const accentHex = document.getElementById('accentColorHex');
  const accentSwatches = document.getElementById('accentSwatches');
  if (accentSwatches) {
    accentSwatches.innerHTML = ACCENT_COLORS.map(c =>
      `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}" title="${c.toUpperCase()}"></button>`
    ).join('');
    accentSwatches.querySelectorAll('.color-swatch').forEach(sw => {
      if (sw.dataset.color.toLowerCase() === (cfg.accentColor || '#439b00').toLowerCase()) sw.classList.add('active');
      sw.addEventListener('click', async () => {
        setAccentColor(sw.dataset.color);
        accentSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        await saveConfig({ accentColor: sw.dataset.color });
        toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
      });
    });
  }
  function setAccentColor(hex) {
    const c = hex || '#439b00';
    if (accentInput) accentInput.value = c;
    if (accentHex) accentHex.textContent = c.toUpperCase();
    if (window.applyAccentColor) window.applyAccentColor(c);
  }
  if (accentInput) {
    accentInput.addEventListener('input', () => {
      setAccentColor(accentInput.value);
      if (accentSwatches) accentSwatches.querySelectorAll('.color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color.toLowerCase() === accentInput.value.toLowerCase()));
    });
    accentInput.addEventListener('change', async () => {
      await saveConfig({ accentColor: accentInput.value });
      toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
    });
  }

  // ── Date format ────────────────────────────────────────────────────────────
  function _fmtDatePreview(fmt) {
    const d = new Date();
    let sep = '';
    if (fmt.includes('/')) sep = '/';
    else if (fmt.includes('-')) sep = '-';
    else if (fmt.includes('.')) sep = '.';
    const parts = sep ? fmt.split(sep) : ['YYYY', 'MM', 'DD'];
    const order = parts.map(p => p.includes('Y') ? 'year' : p.includes('M') ? 'month' : 'day');
    const padded = parts.map(p => p.length > 1);
    const vals = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    return order.map((key, i) => {
      const isPadded = key === 'year' ? true : padded[i];
      return isPadded ? String(vals[key]).padStart(key === 'year' ? 4 : 2, '0') : String(vals[key]);
    }).join(sep);
  }

  function _updateDatePreview() {
    const preview = document.getElementById('dateFormatPreview');
    if (!preview) return;
    const fmt = document.getElementById('dateFormatSelect')?.value || 'DD/MM/YYYY';
    preview.textContent = t('settings_date_format_example') + ' ' + _fmtDatePreview(fmt);
  }

  const dateFormatSelect = document.getElementById('dateFormatSelect');
  if (dateFormatSelect) {
    dateFormatSelect.addEventListener('change', async function () {
      await saveConfig({ dateFormat: this.value });
      _updateDatePreview();
      toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
    });
    _updateDatePreview();
  }

  // ── Offline mode toggle ────────────────────────────────────────────────────
  const offlineToggle = document.getElementById('offlineModeToggle');
  const offlineControls = document.getElementById('offlineControls');
  const offlineStatus = document.getElementById('offlineStatus');

  async function refreshOfflineStatus() {
    if (!offlineStatus) return;
    const meta = await OfflineDB.getBundleMeta();
    const ttsCount = await OfflineDB.countTTS();
    const queue = await OfflineDB.getProgressQueue();
    const pending = queue.reduce((sum, e) => sum + Math.abs(e.delta), 0);

    let pendingHtml = '';
    if (pending > 0) {
      const label = window.t ? t('offline_pending_sync') : 'answer(s) pending sync';
      pendingHtml = `<br><span style="color:var(--warning,#ff9800);font-weight:600">${window.phIcon('hourglass')} ${pending} ${label}</span>`;
    }

    if (!meta) {
      offlineStatus.innerHTML = `<span style="color:var(--text-muted)">${window.phIcon('warning')} ${t('offline_not_synced')}</span>${pendingHtml}`;
    } else {
      const d = new Date(meta.syncedAt);
      const fmt = d.toLocaleString();
      offlineStatus.innerHTML =
        `<span style="color:var(--success,#4caf50)">${window.phIcon('check')} ${t('offline_last_sync')}: <strong>${fmt}</strong></span><br>` +
        `<small style="color:var(--text-muted)">${t('offline_langs')}: ${(meta.langs || []).join(', ')} · ${t('offline_tts_files')}: ${ttsCount}</small>` +
        pendingHtml;
    }

    // Show clear button only when there's offline data
    const clearBtn = document.getElementById('offlineClearBtn');
    if (clearBtn) {
      clearBtn.style.display = meta ? '' : 'none';
    }
  }

  offlineToggle.addEventListener('change', async function () {
    const enabled = this.checked;
    if (enabled) {
      await saveConfig({ offlineMode: true });
      offlineControls.style.display = '';
      const syncBtn = document.getElementById('offlineSyncNowBtn');
      if (syncBtn) syncBtn.style.display = '';
      await refreshOfflineStatus();
      toast(t('offline_enabled_toast'));
    } else {
      const choice = await confirmModal(t('offline_disable_prompt'), {
        confirmLabel: t('offline_clear'),
        cancelLabel: t('offline_keep_data'),
        extraButton: t('common_cancel')
      });
      if (choice === -1) {
        // Cancel deactivation: revert checkbox
        this.checked = true;
        return;
      }
      await saveConfig({ offlineMode: false });
      offlineControls.style.display = 'none';
      const syncBtn = document.getElementById('offlineSyncNowBtn');
      if (syncBtn) syncBtn.style.display = 'none';
      if (choice === true) {
        await OfflineDB.clearAll();
        const clearBtn = document.getElementById('offlineClearBtn');
        if (clearBtn) clearBtn.style.display = 'none';
        toast(t('offline_cleared'));
      } else {
        toast(t('offline_disabled_toast'));
      }
    }
  });

  refreshOfflineStatus(); // updates status & clear button visibility

  // Clear offline data
  document.getElementById('offlineClearBtn') && document.getElementById('offlineClearBtn').addEventListener('click', async () => {
    if (!await confirmModal(t('offline_clear_confirm'), { confirmLabel: t('offline_clear') })) return;
    await OfflineDB.clearAll();
    await refreshOfflineStatus();
    toast(t('offline_cleared'));
  });

  // Hook sync progress into the in-page progress bar
  const _origSync = window._triggerOfflineSync;
  window._triggerOfflineSync = async function () {
    const btn = document.getElementById('syncOfflineBtn');
    const syncNowBtn = document.getElementById('offlineSyncNowBtn');
    const progressWrap = document.getElementById('offlineSyncProgress');
    const progressBar = document.getElementById('offlineProgressBar');
    const progressText = document.getElementById('offlineProgressText');

    if (!navigator.onLine) {
      toast(t('offline_no_connection'), 'danger'); return;
    }

    if (btn) { btn.innerHTML = window.phIcon('hourglass'); btn.disabled = true; }
    if (syncNowBtn) { syncNowBtn.disabled = true; }
    if (progressWrap) { progressWrap.style.display = ''; }

    function setProgress(pct, label) {
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.innerHTML = label;
    }

    try {
      const targetLangs = App.config && App.config.targetLangs || [];
      const langs = targetLangs.map(l => l.isoCode);
      // Build speed lookup { isoCode: { ttsSpeedNormal, ttsSpeedSlow } }
      const configByLang = {};
      targetLangs.forEach(l => { configByLang[l.isoCode] = l; });

      // Each lang takes roughly equal share of the 30–100% range.
      // Structure per lang: 50% gen, 50% download
      const langShare = langs.length > 0 ? 70 / langs.length : 70;

      await OfflineSync.fullSync(langs, configByLang, prog => {
        if (prog.phase === 'data') {
          setProgress(Math.round(prog.pct * 0.3), t('offline_progress_data'));
          if (btn) btn.innerHTML = window.phIcon('package');

        } else if (prog.phase === 'tts_gen') {
          const langIdx = langs.indexOf(prog.lang);
          const base = 30 + langIdx * langShare;
          const pct = Math.round(base + (prog.pct / 100) * langShare * 0.5);
          const label = prog.total > 0
            ? `${window.phIcon('microphone')} ${t('offline_progress_tts_gen')} ${prog.lang.toUpperCase()} (${prog.done}/${prog.total})`
            : `${window.phIcon('microphone')} ${t('offline_progress_tts_gen')} ${prog.lang.toUpperCase()}…`;
          setProgress(pct, label);
          if (btn) btn.innerHTML = window.phIcon('microphone');

        } else if (prog.phase === 'tts_dl') {
          const langIdx = langs.indexOf(prog.lang);
          const base = 30 + langIdx * langShare + langShare * 0.5;
          const pct = Math.round(base + (prog.pct / 100) * langShare * 0.5);
          const label = prog.total > 0
            ? `${window.phIcon('cloud-arrow-down')} ${t('offline_progress_tts_dl')} ${prog.lang.toUpperCase()} (${prog.done || 0}/${prog.total})`
            : `${window.phIcon('cloud-arrow-down')} ${t('offline_progress_tts_dl')} ${prog.lang.toUpperCase()}…`;
          setProgress(pct, label);
          if (btn) btn.innerHTML = window.phIcon('cloud-arrow-down');
        }
      });
      setProgress(100, t('offline_sync_done'));
      toast(t('offline_sync_done'));
      await refreshOfflineStatus();
      if (btn) { btn.innerHTML = window.phIcon('check'); setTimeout(() => { btn.innerHTML = window.phIcon('arrows-clockwise'); btn.disabled = false; }, 2000); }
      if (syncNowBtn) { syncNowBtn.disabled = false; }
      setTimeout(() => { if (progressWrap) progressWrap.style.display = 'none'; }, 3000);
    } catch (err) {
      console.error('[offline sync]', err);
      toast(t('offline_sync_error'), 'danger');
      if (btn) { btn.innerHTML = window.phIcon('x-red'); setTimeout(() => { btn.innerHTML = window.phIcon('arrows-clockwise'); btn.disabled = false; }, 2000); }
      if (syncNowBtn) syncNowBtn.disabled = false;
    }
  };

  // Add language
  let selectedNewLang = null;
  const searchEl = document.getElementById('settingsLangSearch');
  const resultsEl = document.getElementById('settingsLangResults');
  const addBtn = document.getElementById('addLangBtn');

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) { resultsEl.style.display = 'none'; return; }
    const list = (window.WORLD_LANGUAGES || []).filter(l =>
      l.name.toLowerCase().includes(q) || (l.native || '').toLowerCase().includes(q) || l.code.includes(q)
    ).slice(0, 40);
    resultsEl.style.display = list.length ? '' : 'none';
    resultsEl.innerHTML = list.map(l =>
      `<div class="lang-result-item" data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag || '🌐'}" data-native="${l.native || l.name}">
        <span>${l.flag || '🌐'}</span><span>${l.name}</span><small style="color:var(--text-faint)">${l.code}</small>
      </div>`
    ).join('');
    resultsEl.querySelectorAll('.lang-result-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedNewLang = { isoCode: item.dataset.code, name: item.dataset.name, flag: item.dataset.flag, nativeName: item.dataset.native };
        searchEl.value = item.dataset.name;
        resultsEl.style.display = 'none';
        addBtn.disabled = false;
      });
    });
  });

  window.addLangFromSettings = async function () {
    const lang = selectedNewLang;
    if (!lang) return;
    addBtn.disabled = true;
    try {
      await api('POST', '/api/languages', lang);
      await loadConfig();
      renderLangChips();
      searchEl.value = '';
      selectedNewLang = null;
      toast(window.phIcon('check') + ' ' + t('settings_lang_added'), 'success', true);
    } catch (e) {
      toast(e.error || t('common_error'), 'danger');
      addBtn.disabled = false;
    }
  };

  // UI language picker (combobox)
  const uiSearchEl = document.getElementById('uiLangSearch');
  const uiResultsEl = document.getElementById('uiLangResults');
  const uiArrow = document.getElementById('uiLangArrow');
  let uiHighlightIdx = -1;

  function uiRenderResults(list) {
    uiResultsEl.innerHTML = list.map((l, i) =>
      `<div class="lang-result-item ${i === uiHighlightIdx ? 'highlighted' : ''}" data-index="${i}" data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag || '🌐'}">
        <span>${l.flag || '🌐'}</span><span>${l.name}</span><small style="color:var(--text-faint)">${l.code}</small>
      </div>`
    ).join('');
    uiResultsEl.style.display = list.length ? '' : 'none';
  }

  function uiGetFiltered(q) {
    if (!q) return (window.WORLD_LANGUAGES || []).slice(0, 40);
    return (window.WORLD_LANGUAGES || []).filter(l =>
      l.name.toLowerCase().includes(q) || (l.native || '').toLowerCase().includes(q) || l.code.includes(q)
    ).slice(0, 40);
  }

  function uiOpen() {
    const list = uiGetFiltered(uiSearchEl.value.trim().toLowerCase());
    uiHighlightIdx = -1;
    uiRenderResults(list);
    if (uiArrow) uiArrow.classList.add('open');
  }

  function uiClose() {
    uiResultsEl.style.display = 'none';
    uiHighlightIdx = -1;
    if (uiArrow) uiArrow.classList.remove('open');
  }

  function uiSelectItem(item) {
    uiClose();
    uiSearchEl.value = item.dataset.flag + ' ' + item.dataset.name;
    const code = item.dataset.code;
    selectUiLang(code);
  }

  async function selectUiLang(code) {
    await window.setUiLang(code);
    await saveConfig({ uiLang: code });
    App.config.uiLang = code;
    toast(window.phIcon('check') + ' ' + t('settings_ui_lang_saved'), 'success', true);
    applyNavLabels();
    navigate('settings');
  }

  uiSearchEl.addEventListener('focus', () => {
    uiSearchEl.select();
    uiHighlightIdx = -1;
    uiRenderResults((window.WORLD_LANGUAGES || []).slice(0, 40));
    if (uiArrow) uiArrow.classList.add('open');
  });

  uiSearchEl.addEventListener('blur', () => {
    setTimeout(uiClose, 180);
  });

  uiSearchEl.addEventListener('input', () => {
    uiOpen();
  });

  uiSearchEl.addEventListener('keydown', (e) => {
    const items = uiResultsEl.querySelectorAll('.lang-result-item');
    if (!items.length && e.key !== 'Escape') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      uiHighlightIdx = Math.min(uiHighlightIdx + 1, items.length - 1);
      uiRenderResults(uiGetFiltered(uiSearchEl.value.trim().toLowerCase()));
      items[uiHighlightIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      uiHighlightIdx = Math.max(uiHighlightIdx - 1, 0);
      uiRenderResults(uiGetFiltered(uiSearchEl.value.trim().toLowerCase()));
      items[uiHighlightIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && uiHighlightIdx >= 0 && items[uiHighlightIdx]) {
      e.preventDefault();
      uiSelectItem(items[uiHighlightIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      uiClose();
    }
  });

  uiResultsEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.lang-result-item');
    if (item) uiSelectItem(item);
  });
}

function getUiLangName() {
  const code = (App.config && App.config.uiLang) || 'en';
  const lang = (window.WORLD_LANGUAGES || []).find(l => l.code === code);
  return lang ? (lang.flag || '') + ' ' + lang.name : code.toUpperCase();
}

function renderLangChips() {
  const el = document.getElementById('langChips');
  if (!el) return;
  const langs = App.config.targetLangs || [];
  if (!langs.length) {
    el.innerHTML = `<p style="color:var(--text-faint);font-size:.88rem">${t('settings_no_langs')}</p>`;
    return;
  }
  el.innerHTML = langs.map(l =>
    `<div class="lang-chip">
      ${l.flag || '🌐'} ${l.name}
      <button class="btn btn-sm btn-secondary" style="margin-left:6px;padding:2px 8px;font-size:.78rem" onclick="openLangConfig('${l.isoCode}')">${window.phIcon('gear')} ${t('settings_configure')}</button>
      <span class="remove-lang" onclick="removeLang('${l.isoCode}')" title="${t('common_delete')}">${window.phIcon('x')}</span>
    </div>`
  ).join('');
}

window.removeLang = async function (code) {
  if (!await confirmModal(t('settings_remove_confirm'), { confirmLabel: t('common_delete') })) return;
  try {
    await api('DELETE', '/api/languages/' + encodeURIComponent(code));
    await loadConfig();
    updateNavLangBadge();
    renderLangChips();
    toast(t('settings_lang_removed'));
  } catch (e) { toast(e.error || t('common_error'), 'danger'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE CONFIG MODAL (declensions + verb groups + labels)
// ─────────────────────────────────────────────────────────────────────────────

window.openLangConfig = function (isoCode) {
  const lang = (App.config.targetLangs || []).find(l => l.isoCode === isoCode);
  if (!lang) return;

  let declensions = (lang.declensions || []).map(d => ({ ...d }));
  let tenses = (lang.tenses && lang.tenses.length) ? lang.tenses.map(t => ({ ...t })) : [{ nativeName: 'Present', targetName: 'Present' }];
  let verbGroups = (lang.verbGroups || []).map(g => ({ ...g }));
  let labels = (lang.labels || []).map(lb => ({ ...lb }));
  let ttsSpeedNormal = lang.ttsSpeedNormal != null ? lang.ttsSpeedNormal : 1.0;
  let ttsSpeedSlow = lang.ttsSpeedSlow != null ? lang.ttsSpeedSlow : 0.24;
  let ttsCacheEnabled = lang.ttsCache !== false; // default true if not set

  const LABEL_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e63', '#607d8b', '#795548'];

  function renderDeclensionRows() {
    const container = document.getElementById('declContainer');
    if (!container) return;
    if (!declensions.length) {
      container.innerHTML = `<p style="color:var(--text-faint);font-size:.85rem;margin:4px 0">${t('settings_decl_empty')}</p>`;
      return;
    }
    container.innerHTML = declensions.map((d, i) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input type="text" class="decl-native" data-i="${i}" value="${esc(d.nativeName)}" placeholder="${t('settings_decl_ph_native')}"
          style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <input type="text" class="decl-target" data-i="${i}" value="${esc(d.targetName)}" placeholder="${t('settings_decl_ph_target')}"
          style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <button onclick="removeDeclension(${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--danger);padding:4px">${window.phIcon('x')}</button>
      </div>`).join('');
    container.querySelectorAll('.decl-native').forEach(inp =>
      inp.addEventListener('input', () => { declensions[+inp.dataset.i].nativeName = inp.value; }));
    container.querySelectorAll('.decl-target').forEach(inp =>
      inp.addEventListener('input', () => { declensions[+inp.dataset.i].targetName = inp.value; }));
  }

  function renderTenseRows() {
    const container = document.getElementById('tenseContainer');
    if (!container) return;
    if (!tenses.length) {
      container.innerHTML = `<p style="color:var(--text-faint);font-size:.85rem;margin:4px 0">${t('settings_tenses_empty')}</p>`;
      return;
    }
    container.innerHTML = tenses.map((d, i) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input type="text" class="tense-native" data-i="${i}" value="${esc(d.nativeName)}" placeholder="${t('settings_tenses_ph_native')}"
          style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <input type="text" class="tense-target" data-i="${i}" value="${esc(d.targetName)}" placeholder="${t('settings_tenses_ph_target')}"
          style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <button onclick="removeTense(${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--danger);padding:4px">${window.phIcon('x')}</button>
      </div>`).join('');
    container.querySelectorAll('.tense-native').forEach(inp =>
      inp.addEventListener('input', () => { tenses[+inp.dataset.i].nativeName = inp.value; }));
    container.querySelectorAll('.tense-target').forEach(inp =>
      inp.addEventListener('input', () => { tenses[+inp.dataset.i].targetName = inp.value; }));
  }

  function renderVerbGroupRows() {
    const container = document.getElementById('vgContainer');
    if (!container) return;
    if (!verbGroups.length) {
      container.innerHTML = `<p style="color:var(--text-faint);font-size:.85rem;margin:4px 0">${t('settings_vg_empty')}</p>`;
      return;
    }
    container.innerHTML = verbGroups.map((g, i) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input type="text" class="vg-name" data-i="${i}" value="${esc(g.name)}" placeholder="${t('settings_vg_ph')}"
          style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <button onclick="removeVerbGroup(${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--danger);padding:4px">${window.phIcon('x')}</button>
      </div>`).join('');
    container.querySelectorAll('.vg-name').forEach(inp =>
      inp.addEventListener('input', () => { verbGroups[+inp.dataset.i].name = inp.value; }));
  }

  function renderLabelRows() {
    const container = document.getElementById('labelsContainer');
    if (!container) return;
    if (!labels.length) {
      container.innerHTML = `<p style="color:var(--text-faint);font-size:.85rem;margin:4px 0">${t('labels_empty')}</p>`;
      return;
    }
    container.innerHTML = labels.map((lb, i) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span class="lb-dot" data-i="${i}" style="width:22px;height:22px;border-radius:50%;background:${esc(lb.color)};display:inline-block;flex-shrink:0;border:2px solid var(--border)"></span>
          <input type="text" class="lb-name" data-i="${i}" value="${esc(lb.name)}" placeholder="${t('labels_name')}"
            style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
          <button onclick="removeLabelCfg(${i})" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--danger);padding:4px">${window.phIcon('x')}</button>
        </div>
        <div class="lb-swatches" data-i="${i}" style="display:flex;flex-wrap:wrap;gap:6px;padding-left:30px;align-items:center">
          ${LABEL_COLORS.map(c => `
            <button type="button" data-color="${c}" data-i="${i}"
              style="width:28px;height:28px;border-radius:50%;background:${c};border:${lb.color === c ? '3px solid var(--text)' : '2px solid transparent'};cursor:pointer;padding:0;outline:${lb.color === c ? '2px solid var(--surface-1)' : 'none'};outline-offset:1px;transition:transform .1s"
              title="${c}"
              onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            </button>`).join('')}
          <label class="lb-custom-wrap" data-i="${i}" title="Couleur personnalisée"
            style="width:28px;height:28px;border-radius:50%;border:2px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:transform .1s;background:${!LABEL_COLORS.includes(lb.color) ? lb.color : 'transparent'};position:relative"
            onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            <input type="color" class="lb-custom-color" data-i="${i}" value="${lb.color}"
              style="opacity:0;position:absolute;width:100%;height:100%;cursor:pointer;border:none;padding:0">
            <span style="pointer-events:none;color:${!LABEL_COLORS.includes(lb.color) ? 'transparent' : 'var(--text-muted)'}">＋</span>
          </label>
        </div>
      </div>`).join('');
    container.querySelectorAll('.lb-name').forEach(inp =>
      inp.addEventListener('input', () => { labels[+inp.dataset.i].name = inp.value; }));

    function applyColor(i, color) {
      labels[i].color = color;
      const dot = container.querySelector(`.lb-dot[data-i="${i}"]`);
      if (dot) dot.style.background = color;
      // Update preset swatch borders
      container.querySelectorAll(`.lb-swatches[data-i="${i}"] button`).forEach(b => {
        const selected = b.dataset.color === color;
        b.style.border = selected ? '3px solid var(--text)' : '2px solid transparent';
        b.style.outline = selected ? '2px solid var(--surface-1)' : 'none';
      });
      // Update custom picker appearance
      const wrap = container.querySelector(`.lb-custom-wrap[data-i="${i}"]`);
      const inp = container.querySelector(`.lb-custom-color[data-i="${i}"]`);
      if (wrap && inp) {
        inp.value = color;
        const isCustom = !LABEL_COLORS.includes(color);
        wrap.style.background = isCustom ? color : 'transparent';
        const plus = wrap.querySelector('span');
        if (plus) plus.style.color = isCustom ? 'transparent' : 'var(--text-muted)';
      }
    }

    container.querySelectorAll('.lb-swatches button[data-color]').forEach(btn => {
      btn.addEventListener('click', () => applyColor(+btn.dataset.i, btn.dataset.color));
    });
    container.querySelectorAll('.lb-custom-color').forEach(inp => {
      inp.addEventListener('input', () => applyColor(+inp.dataset.i, inp.value));
    });
  }

  openModal(`${t('settings_lang_config_title')}: ${lang.flag || '🌐'} ${lang.name}`, `
    <div style="margin-bottom:20px">
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('arrows-split')} ${t('settings_declensions_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:10px">${t('settings_declensions_desc')}</p>
      <div id="declContainer"></div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addDeclension()">${t('settings_decl_add')}</button>
    </div>
    <div style="margin-bottom:20px">
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('hourglass')} ${t('settings_tenses_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:10px">${t('settings_tenses_desc')}</p>
      <div id="tenseContainer"></div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addTense()">${t('settings_tenses_add')}</button>
    </div>
    <div style="margin-bottom:20px">
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('books')} ${t('settings_vg_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:10px">${t('settings_vg_desc')}</p>
      <div id="vgContainer"></div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addVerbGroup()">${t('settings_vg_add')}</button>
    </div>
    <div>
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('tag')} ${t('labels_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:10px">${t('labels_manage')}</p>
      <div id="labelsContainer"></div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addLabelCfg()">${window.phIcon('plus')} ${t('labels_add_btn')}</button>
    </div>
    <div style="margin-top:20px">
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('speaker-high')} ${t('settings_tts_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:12px">${t('settings_tts_desc')}</p>
      <div style="margin-bottom:12px">
        <label style="display:flex;justify-content:space-between;align-items:center;font-size:.9rem;margin-bottom:6px">
          <span>${t('settings_tts_normal')}</span>
          <span id="ttsNormalVal" style="font-weight:600;min-width:2.5rem;text-align:right">${(ttsSpeedNormal * 100).toFixed(0)}%</span>
        </label>
        <input type="range" id="ttsNormalSlider" min="0.5" max="2" step="0.01" value="${ttsSpeedNormal}"
          style="width:100%;accent-color:var(--primary)">
        <button type="button" id="ttsNormalTest" class="btn btn-secondary btn-sm" style="margin-top:8px">
          ${window.phIcon('speaker-high')} ${t('settings_tts_test')}
        </button>
      </div>
      <div style="margin-top:12px">
        <label style="display:flex;justify-content:space-between;align-items:center;font-size:.9rem;margin-bottom:6px">
          <span>${t('settings_tts_slow')}</span>
          <span id="ttsSlowVal" style="font-weight:600;min-width:2.5rem;text-align:right">${(ttsSpeedSlow * 100).toFixed(0)}%</span>
        </label>
        <input type="range" id="ttsSlowSlider" min="0.1" max="0.8" step="0.01" value="${ttsSpeedSlow}"
          style="width:100%;accent-color:var(--primary)">
        <button type="button" id="ttsSlowTest" class="btn btn-secondary btn-sm" style="margin-top:8px">
          ${window.phIcon('spinner-gap')} ${t('settings_tts_test')}
        </button>
      </div>
    </div>
    <div style="margin-top:20px">
      <h3 style="font-size:1rem;margin-bottom:4px">${window.phIcon('waveform')} ${t('settings_tts_cache_title')}</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:10px">${t('settings_tts_cache_desc')}</p>
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;user-select:none">
        <div class="toggle-switch ${ttsCacheEnabled ? 'active' : ''}" id="ttsCacheToggle" style="
          position:relative;width:40px;height:22px;border-radius:11px;
          background:${ttsCacheEnabled ? 'var(--primary)' : 'var(--border)'};
          transition:background .2s;flex-shrink:0;cursor:pointer">
          <div style="
            position:absolute;top:3px;left:${ttsCacheEnabled ? '21px' : '3px'};
            width:16px;height:16px;border-radius:50%;background:#fff;
            transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)" id="ttsCacheKnob"></div>
        </div>
        <span style="font-size:.9rem">${t('settings_tts_cache_enable')}</span>
      </label>
      <div id="ttsCacheSection" style="${ttsCacheEnabled ? '' : 'opacity:.45;pointer-events:none'}">
        <div id="ttsCacheInfo" style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px">…</div>
        <div id="ttsCacheGenProgress" style="display:none;margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span id="ttsCacheGenLabel" style="font-size:.83rem;color:var(--text-muted)"></span>
            <button type="button" id="ttsCacheGenCancelBtn" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.82rem;padding:0">${t('common_cancel')}</button>
          </div>
          <div style="background:var(--surface-2);border-radius:6px;height:8px;overflow:hidden">
            <div id="ttsCacheGenBar" style="height:100%;background:var(--primary);width:0%;transition:width .2s;border-radius:6px"></div>
          </div>
          <div id="ttsCacheGenCount" style="font-size:.78rem;color:var(--text-faint);margin-top:4px;text-align:right"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px">
        <button type="button" id="ttsCacheGenBtn" class="btn btn-secondary btn-sm" style="${ttsCacheEnabled ? '' : 'display:none'}">
          ${window.phIcon('lightning')} ${t('settings_tts_cache_generate')}
        </button>
        <button type="button" id="ttsCachePurgeBtn" class="btn btn-danger btn-sm" style="display:none">
          ${window.phIcon('trash')} ${t('settings_tts_cache_purge')}
        </button>
      </div>
    </div>
    <div id="lcErr" class="alert alert-danger hidden" style="margin-top:12px"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${t('common_cancel')}</button>
     <button class="btn btn-primary" onclick="saveLangConfig('${isoCode}')">${t('common_save')}</button>`
  );

  renderDeclensionRows();
  renderTenseRows();
  renderVerbGroupRows();
  renderLabelRows();

  // TTS speed sliders
  const normalSlider = document.getElementById('ttsNormalSlider');
  const slowSlider = document.getElementById('ttsSlowSlider');
  if (normalSlider) {
    normalSlider.addEventListener('input', () => {
      ttsSpeedNormal = parseFloat(normalSlider.value);
      const el = document.getElementById('ttsNormalVal');
      if (el) el.textContent = Math.round(ttsSpeedNormal * 100) + '%';
    });
  }
  if (slowSlider) {
    slowSlider.addEventListener('input', () => {
      ttsSpeedSlow = parseFloat(slowSlider.value);
      const el = document.getElementById('ttsSlowVal');
      if (el) el.textContent = Math.round(ttsSpeedSlow * 100) + '%';
    });
  }

  // TTS test buttons — use the UI language and a sample sentence from that locale
  const ttsTestNormal = document.getElementById('ttsNormalTest');
  const ttsTestSlow = document.getElementById('ttsSlowTest');
  function ttsTestSpeak(mode) {
    // The sample phrase is in the UI language → use _uiLang for the TTS lang param
    // so the voice matches the text being read.
    // nocache=1 → server skips cache read AND write; test audio is never stored on disk.
    const uiLang = window._uiLang || 'en';
    const sample = t('settings_tts_sample');
    const speed = mode === 'slow' ? ttsSpeedSlow : ttsSpeedNormal;
    const url = '/api/tts?lang=' + encodeURIComponent(uiLang) +
      '&q=' + encodeURIComponent(sample) +
      '&speed=' + speed.toFixed(2) +
      '&nocache=1';
    const audio = new Audio(url);
    audio.volume = 1;
    audio.play().catch(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(sample);
      utt.lang = uiLang;
      utt.rate = speed;
      window.speechSynthesis.speak(utt);
    });
  }
  if (ttsTestNormal) ttsTestNormal.addEventListener('click', () => ttsTestSpeak('normal'));
  if (ttsTestSlow) ttsTestSlow.addEventListener('click', () => ttsTestSpeak('slow'));

  // ── TTS speed change tracking: remember original speeds to detect changes ──
  const _origSpeedNormal = ttsSpeedNormal;
  const _origSpeedSlow = ttsSpeedSlow;

  // ── TTS cache toggle ──────────────────────────────────────────────────────
  const cacheToggle = document.getElementById('ttsCacheToggle');
  if (cacheToggle) {
    cacheToggle.addEventListener('click', async () => {
      const wasEnabled = ttsCacheEnabled;
      const willBeEnabled = !wasEnabled;
      // Prompt first when disabling, before changing UI
      if (wasEnabled && !willBeEnabled) {
        const choice = await confirmModal(t('settings_tts_cache_disable_prompt'), {
          confirmLabel: t('settings_tts_cache_purge'),
          cancelLabel: t('settings_tts_cache_keep_files'),
          extraButton: t('common_cancel')
        });
        if (choice === -1) return; // Don't change anything
        // Proceed with disabling — get fresh DOM refs after modal restore
        ttsCacheEnabled = false;
        const freshToggle = document.getElementById('ttsCacheToggle');
        if (freshToggle) freshToggle.style.background = 'var(--border)';
        const freshKnob = document.getElementById('ttsCacheKnob');
        if (freshKnob) freshKnob.style.left = '3px';
        const freshSection = document.getElementById('ttsCacheSection');
        if (freshSection) { freshSection.style.opacity = '0.45'; freshSection.style.pointerEvents = 'none'; }
        const freshGenBtn = document.getElementById('ttsCacheGenBtn');
        if (freshGenBtn) freshGenBtn.style.display = 'none';
        if (choice === true) {
          const result = await TTS.purgeCache(isoCode);
          const infoEl = document.getElementById('ttsCacheInfo');
          if (result && result.ok) {
            if (infoEl) infoEl.textContent = t('settings_tts_cache_empty');
toast(window.phIcon('trash') + ' ' + t('settings_tts_cache_purged').replace('{n}', result.deleted), 'success', true);
            const freshPurgeBtn = document.getElementById('ttsCachePurgeBtn');
            if (freshPurgeBtn) freshPurgeBtn.style.display = 'none';
          } else {
            toast(t('common_error'), 'danger');
          }
        }
      } else {
        // Enabling
        ttsCacheEnabled = true;
        cacheToggle.style.background = 'var(--primary)';
        const knob = document.getElementById('ttsCacheKnob');
        if (knob) knob.style.left = '21px';
        const section = document.getElementById('ttsCacheSection');
        if (section) { section.style.opacity = '1'; section.style.pointerEvents = ''; }
        const genBtn2 = document.getElementById('ttsCacheGenBtn');
        if (genBtn2) genBtn2.style.display = '';
      }
    });
  }

  // ── TTS cache: load stats on open ─────────────────────────────────────────
  (async () => {
    const infoEl = document.getElementById('ttsCacheInfo');
    if (!infoEl) return;
    const stats = await TTS.getCacheStats(isoCode);
    const purgeBtn = document.getElementById('ttsCachePurgeBtn');
    if (stats.files === 0) {
      infoEl.textContent = t('settings_tts_cache_empty');
      if (purgeBtn) purgeBtn.style.display = 'none';
    } else {
      const kb = (stats.sizeBytes / 1024).toFixed(1);
      infoEl.textContent = t('settings_tts_cache_info')
        .replace('{files}', stats.files)
        .replace('{size}', kb);
      if (purgeBtn) purgeBtn.style.display = '';
    }
  })();

  const purgeBtn = document.getElementById('ttsCachePurgeBtn');
  if (purgeBtn) {
    purgeBtn.addEventListener('click', async () => {
      if (!await confirmModal(t('settings_tts_cache_confirm'), { confirmLabel: t('settings_tts_cache_purge') })) return;
      const freshPurgeBtn = document.getElementById('ttsCachePurgeBtn');
      if (freshPurgeBtn) freshPurgeBtn.disabled = true;
      const result = await TTS.purgeCache(isoCode);
      const infoEl = document.getElementById('ttsCacheInfo');
      if (result && result.ok) {
        if (infoEl) infoEl.textContent = t('settings_tts_cache_empty');
        toast(window.phIcon('trash') + ' ' + t('settings_tts_cache_purged').replace('{n}', result.deleted), 'success', true);
        if (freshPurgeBtn) freshPurgeBtn.style.display = 'none';
      } else {
        toast(t('common_error'), 'danger');
      }
      if (freshPurgeBtn) freshPurgeBtn.disabled = false;
    });
  }

  // ── TTS cache: generate all ───────────────────────────────────────────────
  const genBtn = document.getElementById('ttsCacheGenBtn');
  if (genBtn) {
    genBtn.addEventListener('click', () => _startTTSGeneration(isoCode));
  }

  async function _startTTSGeneration(langCode) {
    const genBtn = document.getElementById('ttsCacheGenBtn');
    const purgeBtn2 = document.getElementById('ttsCachePurgeBtn');
    const progressEl = document.getElementById('ttsCacheGenProgress');
    const barEl = document.getElementById('ttsCacheGenBar');
    const labelEl = document.getElementById('ttsCacheGenLabel');
    const countEl = document.getElementById('ttsCacheGenCount');
    const cancelBtn = document.getElementById('ttsCacheGenCancelBtn');
    if (!genBtn || !progressEl) return;

    // Lock UI
    genBtn.disabled = true;
    purgeBtn2.disabled = true;
    progressEl.style.display = '';
    barEl.style.width = '0%';
    labelEl.textContent = t('settings_tts_cache_gen_running');
    countEl.textContent = '…';

    // The server drives the entire generation loop via SSE.
    // We pass current speeds + previous speeds so it can skip unchanged cached items
    // and lazily delete stale files for speed-changed items.
    const body = JSON.stringify({
      lang: langCode,
      speedNormal: ttsSpeedNormal,
      speedSlow: ttsSpeedSlow,
      prevSpeedNormal: _origSpeedNormal,
      prevSpeedSlow: _origSpeedSlow
    });

    let abortCtrl = new AbortController();
    cancelBtn.disabled = false;
    cancelBtn.onclick = () => {
      abortCtrl.abort();
      cancelBtn.disabled = true;
    };

    let done = 0, total = 0, wasCancelled = false;

    try {
      const resp = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortCtrl.signal
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      // Read the SSE stream line by line
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete last line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === 'progress') {
            done = evt.done;
            total = evt.total;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            barEl.style.width = pct + '%';
            countEl.textContent = done + ' / ' + total;
            const icon = evt.mode === 'slow' ? window.phIcon('spinner-gap') : window.phIcon('speaker-high');
            const label = evt.text || '';
            labelEl.innerHTML = icon + ' ' + esc(label.slice(0, 38)) + (label.length > 38 ? '…' : '');
          } else if (evt.type === 'done') {
            done = evt.done;
            total = evt.total;
            barEl.style.width = '100%';
            countEl.textContent = done + ' / ' + total;
          } else if (evt.type === 'error') {
            toast(evt.message || t('common_error'), 'danger');
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        wasCancelled = true;
      } else {
        toast(t('common_error'), 'danger');
        console.error('[TTS generate]', err);
      }
    }

    // Restore UI
    genBtn.disabled = false;
    purgeBtn2.disabled = false;
    progressEl.style.display = 'none';

    if (wasCancelled) {
      toast(t('settings_tts_cache_gen_cancelled').replace('{n}', done));
    } else if (total > 0) {
      toast(window.phIcon('check') + ' ' + t('settings_tts_cache_gen_done').replace('{n}', done), 'success', true);
    } else {
      toast(t('settings_tts_cache_gen_empty'));
    }

    // Refresh stats display
    const infoEl2 = document.getElementById('ttsCacheInfo');
    if (infoEl2) {
      const stats2 = await TTS.getCacheStats(langCode);
      if (stats2.files === 0) {
        infoEl2.textContent = t('settings_tts_cache_empty');
        if (purgeBtn2) purgeBtn2.style.display = 'none';
      } else {
        const kb2 = (stats2.sizeBytes / 1024).toFixed(1);
        infoEl2.textContent = t('settings_tts_cache_info')
          .replace('{files}', stats2.files)
          .replace('{size}', kb2);
        if (purgeBtn2) purgeBtn2.style.display = '';
      }
    }
  }

  let colorIdx = 0;
  window.addDeclension = () => { declensions.push({ nativeName: '', targetName: '' }); renderDeclensionRows(); };
  window.removeDeclension = (i) => { declensions.splice(i, 1); renderDeclensionRows(); };
  window.addTense = () => { tenses.push({ nativeName: '', targetName: '' }); renderTenseRows(); };
  window.removeTense = (i) => { tenses.splice(i, 1); renderTenseRows(); };
  window.addVerbGroup = () => { verbGroups.push({ name: '' }); renderVerbGroupRows(); };
  window.removeVerbGroup = (i) => { verbGroups.splice(i, 1); renderVerbGroupRows(); };
  window.addLabelCfg = () => {
    const color = LABEL_COLORS[colorIdx % LABEL_COLORS.length];
    colorIdx++;
    labels.push({ id: crypto.randomUUID(), name: '', color });
    renderLabelRows();
  };
  window.removeLabelCfg = (i) => { labels.splice(i, 1); renderLabelRows(); };

  window.saveLangConfig = async function (code) {
    const errEl = document.getElementById('lcErr');
    errEl.classList.add('hidden');
    if (declensions.some(d => !d.nativeName.trim())) {
      errEl.textContent = t('settings_decl_err_empty'); errEl.classList.remove('hidden'); return;
    }
    if (tenses.some(t => !t.nativeName.trim() || !t.targetName.trim())) {
      errEl.textContent = t('settings_tenses_err_empty'); errEl.classList.remove('hidden'); return;
    }
    if (verbGroups.some(g => !g.name.trim())) {
      errEl.textContent = t('settings_vg_err_empty'); errEl.classList.remove('hidden'); return;
    }
    if (labels.some(lb => !lb.name.trim())) {
      errEl.textContent = t('labels_add_ph'); errEl.classList.remove('hidden'); return;
    }
    try {
      await api('PUT', '/api/languages/' + encodeURIComponent(code), { declensions, tenses, verbGroups, labels, ttsSpeedNormal, ttsSpeedSlow, ttsCache: ttsCacheEnabled });
      await loadConfig();

      // Purge ONLY the speed bucket(s) that actually changed, leave the other intact.
      // We purge the OLD speed value so newly-generated files (at new speed) are unaffected.
      const normalChanged = Math.abs(ttsSpeedNormal - _origSpeedNormal) > 0.001;
      const slowChanged = Math.abs(ttsSpeedSlow - _origSpeedSlow) > 0.001;
      let totalPurged = 0;
      if (normalChanged) {
        const r = await TTS.purgeCache(code, _origSpeedNormal);
        if (r && r.ok) totalPurged += r.deleted;
      }
      if (slowChanged) {
        const r = await TTS.purgeCache(code, _origSpeedSlow);
        if (r && r.ok) totalPurged += r.deleted;
      }
      if (totalPurged > 0) {
        toast(window.phIcon('trash') + ' ' + t('settings_tts_cache_speed_purged').replace('{n}', totalPurged), 'success', true);
      }

      closeModal();
      renderLangChips();
      toast(window.phIcon('check') + ' ' + t('settings_saved'), 'success', true);
    } catch (e) {
      errEl.textContent = e.error || t('common_error');
      errEl.classList.remove('hidden');
    }
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

window.showChangePassword = function () {
  openModal(t('settings_change_pw'), `
    <div class="field-group">
      <label>${t('settings_pw_current')}</label>
      <input type="password" id="cpCurrent" autocomplete="current-password">
    </div>
    <div class="field-group">
      <label>${t('settings_pw_new')}</label>
      <input type="password" id="cpNew" autocomplete="new-password">
    </div>
    <div class="field-group">
      <label>${t('settings_pw_confirm')}</label>
      <input type="password" id="cpConfirm" autocomplete="new-password">
    </div>
    <div id="cpErr" class="alert alert-danger hidden"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">${t('common_cancel')}</button>
     <button class="btn btn-primary" onclick="submitChangePassword()">${t('common_save')}</button>`
  );
};

window.submitChangePassword = async function () {
  const current = document.getElementById('cpCurrent').value;
  const newPass = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;
  const errEl = document.getElementById('cpErr');
  errEl.classList.add('hidden');
  if (!current || !newPass || !confirm) {
    errEl.textContent = t('vocab_required'); errEl.classList.remove('hidden'); return;
  }
  if (newPass !== confirm) {
    errEl.textContent = t('settings_pw_mismatch'); errEl.classList.remove('hidden'); return;
  }
  if (newPass.length < 4) {
    errEl.textContent = t('settings_pw_tooshort'); errEl.classList.remove('hidden'); return;
  }
  try {
    await api('POST', '/auth/change-password', { currentPassword: current, newPassword: newPass });
    closeModal();
    toast(window.phIcon('check') + ' ' + t('settings_pw_ok'), 'success', true);
  } catch (e) {
    errEl.textContent = e.error || t('common_error');
    errEl.classList.remove('hidden');
  }
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window._applySettingsLang = function () {
  if (App.config && App.config.uiLang) {
    window.setUiLang(App.config.uiLang);
  } else if (App.config && App.config.nativeLang) {
    window.setUiLang(App.config.nativeLang);
  }
};
