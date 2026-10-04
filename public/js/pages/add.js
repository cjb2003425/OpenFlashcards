// pages/add.js
'use strict';

function _okMessage(el, text) {
  el.innerHTML = phIcon('check') + ' ' + String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderAdd(el) {
  const ic = window.phIcon;
  window._addWordType = 'noun';
  window._wordTypeManual = false;
  window._batchRows = [];
  window._batchKnownWords = new Set();
  const lang = currentLang();
  if (!lang) { navigate('settings'); return; }

  // Block writes when offline
  if (window.App && App.config && App.config.offlineMode && !navigator.onLine) {
    el.innerHTML = `<div class="page-title">${ic('plus')} ${t('nav_add')}</div>
      <div class="card" style="text-align:center;padding:32px 20px">
        <div style="font-size:3rem;margin-bottom:12px">${ic('wifi-slash')}</div>
        <h3 style="margin-bottom:8px">${t('offline_no_connection')}</h3>
        <p style="color:var(--text-muted)">${t('offline_readonly')}</p>
      </div>`;
    return;
  }

  const langData = currentLangData();
  const pronouns = (langData && langData.pronouns) ? langData.pronouns : ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
  const declensions = (langData && langData.declensions) ? langData.declensions : [];
  const tenses = (langData && langData.tenses && langData.tenses.length) ? langData.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
  const verbGroups = (langData && langData.verbGroups) ? langData.verbGroups : [];

  const vgOptions = verbGroups.length
    ? `<div class="field-group" id="verbGroupField">
        <label>${t('add_verb_group')} <span class="optional">${t('vocab_optional')}</span></label>
        <select id="wVerbGroup" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
          <option value="">—</option>
          ${verbGroups.map(g => `<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('')}
        </select>
      </div>`
    : '';

  el.innerHTML = `
    <div class="page-title">${ic('plus')} ${t('add_title')}</div>
    <div class="add-tabs">
      <button class="add-tab active" data-tab="word"   onclick="switchAddTab('word',this)">${ic('lego')} ${t('add_tab_word')}</button>
      <button class="add-tab"        data-tab="phrase" onclick="switchAddTab('phrase',this)">${ic('chat-circle')} ${t('add_tab_phrase')}</button>
      <button class="add-tab"        data-tab="batch"  onclick="switchAddTab('batch',this)">${ic('list-checks')} ${t('add_tab_batch')}</button>
    </div>

    <!-- WORD FORM -->
    <div id="tabWord">
      <div class="type-selector" id="wordTypeSelector">
<button class="type-btn active" data-type="noun"      onclick="selectWordType('noun',this)">${ic('package')} ${t('add_type_noun')}</button>
      <button class="type-btn"        data-type="verb"       onclick="selectWordType('verb',this)">${ic('lightning')} ${t('add_type_verb')}</button>
      <button class="type-btn"        data-type="adjective"  onclick="selectWordType('adjective',this)">${ic('palette')} ${t('add_type_adj')}</button>
      <button class="type-btn"        data-type="adverb"     onclick="selectWordType('adverb',this)">${ic('wind')} ${t('add_type_adv')}</button>
      <button class="type-btn"        data-type="other"     onclick="selectWordType('other',this)">${ic('puzzle-piece')} ${t('add_type_other')}</button>
      </div>

      <div class="card">
        <div id="nounExtras" class="field-group">
          <label>${t('add_article')} <span class="optional">${t('vocab_optional')}</span></label>
          <input type="text" id="wArticle" placeholder="${t('add_article_ph')}" autocomplete="off">
        </div>

        <div class="field-group">
          <label><span id="wTypeLabel">${t('add_word_label')}</span> <strong>${langData ? (langData.flag || '') + ' ' + langData.name : lang}</strong> <span class="required">*</span></label>
          <input type="text" id="wLiteral" autocomplete="off" placeholder="${t('add_word_ph')}">
          <small style="color:var(--text-faint);font-size:.8rem">${t('add_nominative_hint')}</small>
        </div>

        <div class="field-group">
          <label>${t('add_translation')} <span class="required">*</span></label>
          <input type="text" id="wTranslation" autocomplete="off" placeholder="${t('add_translation_ph')}">
        </div>

        <div id="verbExtras" class="hidden">
          ${vgOptions}
          <div id="tenseConjSections">
            ${tenses.map((tense, ti) => `
            <details style="margin-bottom:12px" class="tense-conj-detail">
              <summary style="cursor:pointer;font-weight:600;font-size:.9rem;color:var(--text-muted);margin-bottom:6px">
                ${esc(tense.targetName || tense.nativeName)} <span style="color:var(--text-faint);font-weight:400;font-size:.8rem">/ ${esc(tense.nativeName)}</span> <span class="optional">${t('vocab_optional')}</span>
              </summary>
              <div style="font-size:.75rem;color:var(--text-faint);margin-bottom:4px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:0 2px">
                <span style="font-weight:600">${t('add_conj_pronoun')}</span>
                <span>${t('add_conj_form')}</span>
                <span>${t('add_conj_translation_ph')}</span>
              </div>
              <div class="conjugation-grid" id="conjGrid_${ti}"></div>
            </details>
            `).join('')}
          </div>
        </div>

        ${declensions.length ? `
        <details id="declensionsSection" style="margin-bottom:16px">
          <summary style="cursor:pointer;font-weight:600;font-size:.9rem;color:var(--text-muted);margin-bottom:8px">
            ${ic('arrows-split')} ${t('add_declensions')} <span class="optional">${t('vocab_optional')}</span>
          </summary>
          <div id="declGrid"></div>
        </details>` : ''}

        <div class="field-group">
          <label>${t('add_definition')} <span class="optional">${t('vocab_optional')}</span></label>
          <input type="text" id="wDefinition" autocomplete="off" placeholder="${t('add_definition_ph')}">
        </div>
        <div id="wordLabelPickerContainer"></div>
        <div id="wordAddErr" class="alert alert-danger hidden"></div>
        <div id="wordAddOk"  class="alert alert-success hidden"></div>
        <button class="btn btn-primary btn-full" id="addWordBtn" onclick="submitWord()">${ic('plus')} ${t('add_btn_word')}</button>
      </div>
    </div>

    <!-- PHRASE FORM -->
    <div id="tabPhrase" class="hidden">
      <div class="card">
        <div class="field-group">
          <label>${t('add_phrase_label')} <strong>${langData ? (langData.flag || '') + ' ' + langData.name : lang}</strong> <span class="required">*</span></label>
          <textarea id="pText" placeholder="${t('add_phrase_ph')}" rows="3"></textarea>
        </div>
        <div class="field-group">
          <label>${t('add_translation')} <span class="required">*</span></label>
          <input type="text" id="pTranslation" autocomplete="off" placeholder="${t('add_translation_ph')}">
        </div>
        <div class="field-group">
          <label>${t('add_phrase_note')} <span class="optional">${t('vocab_optional')}</span></label>
          <input type="text" id="pNote" autocomplete="off" placeholder="${t('add_phrase_note_ph')}">
        </div>
        <div id="phraseLabelPickerContainer"></div>
        <div id="phraseAddErr" class="alert alert-danger hidden"></div>
        <div id="phraseAddOk"  class="alert alert-success hidden"></div>
        <button class="btn btn-primary btn-full" id="addPhraseBtn" onclick="submitPhrase()">${ic('plus')} ${t('add_btn_phrase')}</button>
      </div>
    </div>

    <!-- BATCH WORD FORM -->
    <div id="tabBatch" class="hidden">
      <div class="card batch-add-card">
        <div class="field-group">
          <label>${t('batch_words_label')} <span class="required">*</span></label>
          <textarea id="batchInput" rows="10" placeholder="${t('batch_words_ph')}"></textarea>
          <small class="batch-help">${t('batch_words_help')}</small>
        </div>
        <div id="batchAddErr" class="alert alert-danger hidden"></div>
        <div id="batchAddOk" class="alert alert-success hidden"></div>
        <div id="batchProgress" class="batch-progress hidden"></div>
        <button class="btn btn-primary btn-full" id="batchGenerateBtn" onclick="generateBatchPreview()">${ic('translate')} ${t('batch_generate')}</button>
      </div>
      <div id="batchPreview"></div>
    </div>


    <div class="toggle-row" id="autoTranslateRow">
      <div class="toggle-group">
        <label class="toggle-switch">
          <input type="checkbox" id="autoTranslateToggle">
          <span class="toggle-slider"></span>
        </label>
        <span>${t('add_auto_translate')}</span>
      </div>
      
      <div class="toggle-group">
        <label class="toggle-switch">
          <input type="checkbox" id="suggestionsToggle">
          <span class="toggle-slider"></span>
        </label>
        <span>${t('add_suggestions')}</span>
      </div>
    </div>`;

  // ── Label pickers ──────────────────────────────────────────────────────────
  // Inject the label picker widget into both the word and phrase containers.
  // buildLabelPicker / toggleLabelPick / showCreateLabelInline /
  // confirmCreateLabelInline are all defined in vocabulary.js which loads first.
  const wordLabelContainer = document.getElementById('wordLabelPickerContainer');
  if (wordLabelContainer && typeof buildLabelPicker === 'function') {
    wordLabelContainer.innerHTML = buildLabelPicker([], 'wordLabelPickerContainer');
  }

  const phraseLabelContainer = document.getElementById('phraseLabelPickerContainer');
  if (phraseLabelContainer && typeof buildLabelPicker === 'function') {
    phraseLabelContainer.innerHTML = buildLabelPicker([], 'phraseLabelPickerContainer');
  }

  // Expose getters used by submitWord / submitPhrase
  window.getAddPageSelectedLabels = function () {
    const chips = document.getElementById('wordLabelPickerContainer-chips');
    if (!chips) return [];
    return [...chips.querySelectorAll('.label-pick-btn.active')].map(b => b.dataset.lid).filter(Boolean);
  };
  window.getAddPagePhraseSelectedLabels = function () {
    const chips = document.getElementById('phraseLabelPickerContainer-chips');
    if (!chips) return [];
    return [...chips.querySelectorAll('.label-pick-btn.active')].map(b => b.dataset.lid).filter(Boolean);
  };

  // Build conjugation grids per tense
  tenses.forEach((tense, ti) => {
    const conjGrid = document.getElementById(`conjGrid_${ti}`);
    if (conjGrid) {
      pronouns.forEach((p, pi) => {
        conjGrid.innerHTML += `
          <div class="conj-item field-group">
            <label style="font-size:.82rem;font-weight:600">${esc(p)}</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="text" id="conj_${ti}_${pi}" autocomplete="off" placeholder="…" style="flex:1">
              <input type="text" id="conjtr_${ti}_${pi}" autocomplete="off" placeholder="${t('add_conj_translation_ph')}" style="flex:1;font-size:.85rem;color:var(--text-muted)">
            </div>
          </div>`;
      });
    }
  });

  // Build declensions grid
  const declGrid = document.getElementById('declGrid');
  if (declGrid && declensions.length) {
    declensions.forEach((d, i) => {
      declGrid.innerHTML += `
        <div class="field-group" style="margin-bottom:10px">
          <label style="font-size:.85rem">${esc(d.nativeName)}${d.targetName ? ' <span style="color:var(--text-faint)">/ ' + esc(d.targetName) + '</span>' : ''}</label>
          <input type="text" id="decl_${i}" autocomplete="off" placeholder="…">
        </div>`;
    });
  }


  ['wLiteral', 'wTranslation', 'wDefinition', 'wArticle'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitWord(); } });
  });
  ['pTranslation', 'pNote'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitPhrase(); } });
  });

  // ── Auto-translate toggle ──────────────────────────────────────────────────
  const autoToggle = document.getElementById('autoTranslateToggle');
  if (autoToggle) {
    const saved = App.config && App.config.autoTranslate !== undefined
      ? App.config.autoTranslate
      : localStorage.getItem('add_auto_translate') === 'true';
    autoToggle.checked = saved;
    window._addAutoTranslate = saved;
    autoToggle.addEventListener('change', () => {
      window._addAutoTranslate = autoToggle.checked;
      localStorage.setItem('add_auto_translate', autoToggle.checked);
      if (App.config) App.config.autoTranslate = autoToggle.checked;
      try { saveConfig({ autoTranslate: autoToggle.checked }); } catch {}
      if (autoToggle.checked) {
        _triggerAutoTranslate();
      } else {
        _purgeAutoOverlays();
      }
    });
  }

  // ── Suggestions toggle ─────────────────────────────────────────────────────
  const sugToggle = document.getElementById('suggestionsToggle');
  if (sugToggle) {
    const saved = App.config && App.config.suggestions !== undefined
      ? App.config.suggestions
      : localStorage.getItem('add_suggestions') === 'true';
    sugToggle.checked = saved;
    window._addSuggestions = saved;
    sugToggle.addEventListener('change', () => {
      window._addSuggestions = sugToggle.checked;
      localStorage.setItem('add_suggestions', sugToggle.checked);
      if (App.config) App.config.suggestions = sugToggle.checked;
      try { saveConfig({ suggestions: sugToggle.checked }); } catch {}
      if (sugToggle.checked) {
        _triggerAutoTranslate();
      } else {
        _purgeSuggestionOverlays();
      }
    });
  }

  // ── Auto-translate input handlers (word fields) ────────────────────────────
  ['wLiteral', 'wTranslation'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.addEventListener('input', () => {
      if (id === 'wTranslation') delete el2.dataset.autoTranslation;
      if (id === 'wLiteral') window._wordTypeManual = false;
      _lastEditedField = id;
      _scheduleWordTranslate();
    });
  });

  // ── Auto-translate input handlers (phrase fields) ──────────────────────────
  ['pText', 'pTranslation'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.addEventListener('input', () => {
      _lastEditedField = id;
      _schedulePhraseTranslate();
    });
  });
}

// ── Auto-translate helpers ────────────────────────────────────────────────────
if (!window._autoTranslateTimers) window._autoTranslateTimers = {};
if (!window._autoTranslateVersions) window._autoTranslateVersions = {};
let _lastEditedField = null;

function _getTranslateLangs() {
  const uiLang = (App.config && App.config.uiLang) || 'en';
  const targetLang = currentLang();
  return { uiLang, targetLang };
}

async function _translateGoogle(text, src, tgt) {
  if (!text.trim()) return { main: '', alternatives: [] };
  try {
    if (src === 'en' && (tgt === 'zh' || tgt === 'zh-cn')) {
      const localRes = await fetch('/api/translate?word=' + encodeURIComponent(text));
      if (!localRes.ok) return { main: '', alternatives: [] };
      const localData = await localRes.json();
      return {
        main: localData.meaning || '',
        alternatives: [],
        wordType: localData.type || 'other',
        wordTypes: localData.types || []
      };
    }
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', src);
    url.searchParams.set('tl', tgt);
    url.searchParams.append('dt', 't');
    url.searchParams.append('dt', 'at');
    url.searchParams.set('q', text);
    const res = await fetch(url);
    if (!res.ok) return { main: '', alternatives: [] };
    const data = await res.json();
    const segs = data[0];
    const main = segs ? segs.map(s => s[0]).join('') : '';
    const alternatives = _extractAltsGoogle(data, main);
    return { main, alternatives };
  } catch { return { main: '', alternatives: [] }; }
}

function _langToCountry(lang) {
  const map = {
    af:'za', sq:'al', am:'et', ar:'sa', hy:'am', az:'az', eu:'es',
    be:'by', bn:'bd', bs:'ba', bg:'bg', ca:'es', ceb:'ph',
    zh:'cn', 'zh-tw':'tw', co:'fr', hr:'hr', cs:'cz', da:'dk',
    nl:'nl', en:'gb', eo:'eo', et:'ee', fi:'fi', fr:'fr',
    fy:'nl', gl:'es', ka:'ge', de:'de', el:'gr', gu:'in',
    ht:'ht', ha:'ng', haw:'us', he:'il', hi:'in', hmn:'la',
    hu:'hu', is:'is', ig:'ng', id:'id', ga:'ie', it:'it',
    ja:'jp', jv:'id', kn:'in', kk:'kz', km:'kh', rw:'rw',
    ko:'kr', ku:'iq', ky:'kg', lo:'la', la:'va', lv:'lv',
    lt:'lt', lb:'lu', mk:'mk', mg:'mg', ms:'my', ml:'in',
    mt:'mt', mi:'nz', mr:'in', mn:'mn', my:'mm', ne:'np',
    no:'no', ny:'mw', or:'in', ps:'af', fa:'ir', pl:'pl',
    pt:'pt', pa:'in', ro:'ro', ru:'ru', sm:'ws', gd:'gb',
    sr:'rs', st:'ls', sn:'zw', sd:'pk', si:'lk', sk:'sk',
    sl:'si', so:'so', es:'es', su:'id', sw:'tz', sv:'se',
    tl:'ph', tg:'tj', ta:'in', tt:'ru', te:'in', th:'th',
    tr:'tr', tk:'tm', uk:'ua', ur:'pk', ug:'cn', uz:'uz',
    vi:'vn', cy:'gb', xh:'za', yi:'il', yo:'ng', zu:'za'
  };
  return map[lang] || lang;
}

let _atsCounter = 0;
function _fetchSuggestions(text, lang) {
  if (!text.trim() || text.split(/\s+/).length < 2) return Promise.resolve([]);
  const country = _langToCountry(lang);
  return new Promise(resolve => {
    const callbackName = '_atsCb' + (++_atsCounter) + '_' + Date.now();
    const script = document.createElement('script');
    script.src = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=' +
      encodeURIComponent(lang || 'en') + '&gl=' + encodeURIComponent(country) + '&q=' +
      encodeURIComponent(text) + '&callback=' + callbackName;
    let settled = false;
    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve([]);
    }, 4000);
    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve([]);
    };
    window[callbackName] = function (data) {
      if (settled) return;
      settled = true;
      cleanup();
      if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
        const filtered = data[1].filter(s => typeof s === 'string' && s.length > text.length && _sameLanguage(s, text)).slice(0, 6);
        resolve(filtered);
      } else {
        resolve([]);
      }
    };
    document.head.appendChild(script);
  });
}

function _sameLanguage(suggestion, source) {
  const srcNonAscii = [...source].filter(c => c > '\x7f').length;
  if (srcNonAscii === 0) return true;
  const sugNonAscii = [...suggestion].filter(c => c > '\x7f').length;
  return sugNonAscii > 0;
}

function _extractAltsGoogle(data, main) {
  const seen = new Set();
  function _validAlt(v) {
    if (!v || v === main || v.length <= 1 || v.length > 40) return false;
    if (/[#_/\\[\]{}()<>|]/.test(v)) return false;
    return true;
  }
  try {
    const d5 = data[5];
    if (Array.isArray(d5)) {
      for (const entry of d5) {
        if (Array.isArray(entry) && Array.isArray(entry[2])) {
          for (const variant of entry[2]) {
            if (Array.isArray(variant) && typeof variant[0] === 'string') seen.add(variant[0]);
          }
        }
      }
    }
  } catch (e) { }
  try {
    const f7 = data[7];
    if (Array.isArray(f7) && typeof f7[0] === 'string' && f7.length <= 15) {
      f7.forEach(v => seen.add(v));
    }
  } catch (e) { }
  return [...seen].filter(v => _validAlt(v)).slice(0, 10);
}

function _scheduleWordTranslate() {
  if (!window._addAutoTranslate && !window._addSuggestions) return;
  const id = 'word';
  if (window._autoTranslateTimers[id]) clearTimeout(window._autoTranslateTimers[id]);
  if (!window._autoTranslateVersions[id]) window._autoTranslateVersions[id] = 0;
  window._autoTranslateVersions[id]++;
  const ver = window._autoTranslateVersions[id];

  window._autoTranslateTimers[id] = setTimeout(async () => {
    try {
      const { uiLang, targetLang } = _getTranslateLangs();
      let sourceText, srcLang, tgtLang, targetId;
      if (_lastEditedField === 'wTranslation') {
        sourceText = document.getElementById('wTranslation')?.value.trim();
        srcLang = uiLang; tgtLang = targetLang; targetId = 'wLiteral';
      } else if (_lastEditedField === 'wLiteral') {
        sourceText = document.getElementById('wLiteral')?.value.trim();
        srcLang = targetLang; tgtLang = uiLang; targetId = 'wTranslation';
      } else {
        return;
      }
      if (!sourceText) return;

      _clearOverlays(targetId);
      _clearOverlays(_lastEditedField);
      const translatePromise = window._addAutoTranslate ? _translateGoogle(sourceText, srcLang, tgtLang) : Promise.resolve(null);
      const suggestionsPromise = window._addSuggestions ? _fetchSuggestions(sourceText, srcLang) : Promise.resolve([]);
      const [result, suggestions] = await Promise.all([translatePromise, suggestionsPromise]);
      if (ver !== window._autoTranslateVersions[id]) return;
      if (result && result.main) {
        _applyTranslation(targetId, result.main, result.alternatives);
        if (_lastEditedField === 'wLiteral' && result.wordType && !window._wordTypeManual) {
          const currentLiteral = document.getElementById('wLiteral')?.value.trim().toLowerCase();
          if (currentLiteral === sourceText.toLowerCase()) {
            const typeBtn = document.querySelector(`#wordTypeSelector [data-type="${result.wordType}"]`);
            if (typeBtn) selectWordType(result.wordType, typeBtn, true);
          }
        }
      }
      if (suggestions.length) {
        _showSuggestions(_lastEditedField, suggestions, sourceText);
      }
    } catch {}
  }, 700);
}

function _schedulePhraseTranslate() {
  if (!window._addAutoTranslate && !window._addSuggestions) return;
  const id = 'phrase';
  if (window._autoTranslateTimers[id]) clearTimeout(window._autoTranslateTimers[id]);
  if (!window._autoTranslateVersions[id]) window._autoTranslateVersions[id] = 0;
  window._autoTranslateVersions[id]++;
  const ver = window._autoTranslateVersions[id];

  window._autoTranslateTimers[id] = setTimeout(async () => {
    try {
      const { uiLang, targetLang } = _getTranslateLangs();
      let sourceText, srcLang, tgtLang, targetId;
      if (_lastEditedField === 'pTranslation') {
        sourceText = document.getElementById('pTranslation')?.value.trim();
        srcLang = uiLang; tgtLang = targetLang; targetId = 'pText';
      } else if (_lastEditedField === 'pText') {
        sourceText = document.getElementById('pText')?.value.trim();
        srcLang = targetLang; tgtLang = uiLang; targetId = 'pTranslation';
      } else {
        return;
      }
      if (!sourceText) return;

      _clearOverlays(targetId);
      _clearOverlays(_lastEditedField);
      const translatePromise = window._addAutoTranslate ? _translateGoogle(sourceText, srcLang, tgtLang) : Promise.resolve(null);
      const suggestionsPromise = window._addSuggestions ? _fetchSuggestions(sourceText, srcLang) : Promise.resolve([]);
      const [result, suggestions] = await Promise.all([translatePromise, suggestionsPromise]);
      if (ver !== window._autoTranslateVersions[id]) return;
      if (result && result.main) {
        _applyPhraseTranslation(targetId, result.main, result.alternatives);
      }
      if (suggestions.length) {
        _showSuggestions(_lastEditedField, suggestions, sourceText);
      }
    } catch {}
  }, 500);
}

function _clearOverlays(fieldId) {
  if (!fieldId) return;
  const old = document.getElementById(fieldId + '_variants');
  if (old) old.remove();
  const oldSug = document.getElementById(fieldId + '_suggestions');
  if (oldSug) oldSug.remove();
}

function _purgeAutoOverlays() {
  ['wLiteral', 'wTranslation', 'pText', 'pTranslation'].forEach(_clearOverlays);
}

function _purgeSuggestionOverlays() {
  ['wLiteral', 'wTranslation', 'pText', 'pTranslation'].forEach(id => {
    const el = document.getElementById(id + '_suggestions');
    if (el) el.remove();
  });
}

function _triggerAutoTranslate() {
  const wordTab = document.getElementById('tabWord');
  const phraseTab = document.getElementById('tabPhrase');
  if (wordTab && !wordTab.classList.contains('hidden')) {
    const lit = document.getElementById('wLiteral');
    const tran = document.getElementById('wTranslation');
    if (lit && lit.value.trim()) {
      _lastEditedField = 'wLiteral';
      _scheduleWordTranslate();
    } else if (tran && tran.value.trim()) {
      _lastEditedField = 'wTranslation';
      _scheduleWordTranslate();
    }
  }
  if (phraseTab && !phraseTab.classList.contains('hidden')) {
    const txt = document.getElementById('pText');
    const tran = document.getElementById('pTranslation');
    if (txt && txt.value.trim()) {
      _lastEditedField = 'pText';
      _schedulePhraseTranslate();
    } else if (tran && tran.value.trim()) {
      _lastEditedField = 'pTranslation';
      _schedulePhraseTranslate();
    }
  }
}

function _showSuggestions(fieldId, suggestions, srcText) {
  const el = document.getElementById(fieldId);
  if (!el || !suggestions.length) return;

  const old = document.getElementById(fieldId + '_suggestions');
  if (old) old.remove();

  const container = document.createElement('div');
  container.id = fieldId + '_suggestions';
  container.className = 'auto-translate-suggestions';
  container.innerHTML = suggestions.map(s => {
    return '<span class="ats-word" data-word="' + esc(s) + '" data-field="' + fieldId + '">' + _highlightMatch(s, srcText) + '</span>';
  }).join('');

  el.parentNode.insertBefore(container, el.nextSibling);

  container.querySelectorAll('.ats-word').forEach(span => {
    span.addEventListener('click', function () {
      const field = document.getElementById(this.dataset.field);
      if (!field) return;
      field.value = this.dataset.word;
      _clearOverlays(this.dataset.field);
      field.focus();
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

function _highlightMatch(text, query) {
  if (!query) return esc(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return esc(text);
  return esc(text.slice(0, idx)) + '<strong>' + esc(text.slice(idx, idx + query.length)) + '</strong>' + esc(text.slice(idx + query.length));
}

function _applyTranslation(targetId, main, alternatives) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (el.value.trim() && el.dataset.autoTranslation !== el.value) return;
  el.value = main;
  el.dataset.autoTranslation = main;

  // Remove old variant container
  const old = document.getElementById(targetId + '_variants');
  if (old) old.remove();

  if (!alternatives.length) return;

  const container = document.createElement('div');
  container.id = targetId + '_variants';
  container.className = 'auto-translate-variants';
  container.innerHTML = alternatives.map((w, i) => {
    return (i === 0 ? '' : '<span class="atv-sep"> | </span>') +
      '<span class="atv-word" data-word="' + esc(w) + '" data-target="' + targetId + '">' + esc(w) + '</span>';
  }).join('');

  el.parentNode.insertBefore(container, el.nextSibling);

  container.querySelectorAll('.atv-word').forEach(span => {
    span.addEventListener('click', function () {
      const target = document.getElementById(this.dataset.target);
      if (target) {
        target.value = this.dataset.word;
      }
      this.closest('.auto-translate-variants')?.remove();
    });
  });
}

function _applyPhraseTranslation(targetId, main, alternatives) {
  // Same as _applyTranslation but for textarea
  const el = document.getElementById(targetId);
  if (!el) return;
  el.value = main;

  const old = document.getElementById(targetId + '_variants');
  if (old) old.remove();

  if (!alternatives.length) return;

  const container = document.createElement('div');
  container.id = targetId + '_variants';
  container.className = 'auto-translate-variants';
  container.innerHTML = alternatives.map((w, i) => {
    return (i === 0 ? '' : '<span class="atv-sep"> | </span>') +
      '<span class="atv-word" data-word="' + esc(w) + '" data-target="' + targetId + '">' + esc(w) + '</span>';
  }).join('');

  el.parentNode.insertBefore(container, el.nextSibling);

  container.querySelectorAll('.atv-word').forEach(span => {
    span.addEventListener('click', function () {
      const target = document.getElementById(this.dataset.target);
      if (target) {
        target.value = this.dataset.word;
      }
      this.closest('.auto-translate-variants')?.remove();
    });
  });
}

window._addWordType = 'noun';

window.selectWordType = function (type, btn, automatic = false) {
  window._addWordType = type;
  if (!automatic) window._wordTypeManual = true;
  document.querySelectorAll('#wordTypeSelector .type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('nounExtras').classList.toggle('hidden', type !== 'noun');
  document.getElementById('verbExtras').classList.toggle('hidden', type !== 'verb');
  const declSect = document.getElementById('declensionsSection');
  if (declSect) declSect.style.display = type === 'verb' ? 'none' : '';
  const labelSpan = document.getElementById('wTypeLabel');
  if (labelSpan) labelSpan.textContent = type === 'verb' ? (t('add_infinitive_label') || 'Infinitive in') : (t('add_word_label') || 'Word in');
};

window.switchAddTab = function (tab, btn) {
  document.querySelectorAll('.add-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tabWord').classList.toggle('hidden', tab !== 'word');
  document.getElementById('tabPhrase').classList.toggle('hidden', tab !== 'phrase');
  document.getElementById('tabBatch').classList.toggle('hidden', tab !== 'batch');
  const toggles = document.getElementById('autoTranslateRow');
  if (toggles) toggles.classList.toggle('hidden', tab === 'batch');
  _lastEditedField = null;
};

function _batchStatusLabel(row) {
  const labels = {
    ready: t('batch_status_ready'),
    failed: t('batch_status_failed'),
    translating: t('batch_status_translating'),
    duplicate: t('batch_status_duplicate'),
    existing: t('batch_status_existing'),
    invalid: t('batch_status_invalid')
  };
  return labels[row.status] || row.status;
}

function _batchCanInclude(row) {
  return !['duplicate', 'existing', 'invalid', 'translating'].includes(row.status);
}

function _batchTypeOptions(selected) {
  const options = [
    ['noun', t('add_type_noun')],
    ['verb', t('add_type_verb')],
    ['adjective', t('add_type_adj')],
    ['adverb', t('add_type_adv')],
    ['other', t('add_type_other')]
  ];
  return options.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
}

function _renderBatchPreview() {
  const container = document.getElementById('batchPreview');
  if (!container) return;
  if (!window._batchRows.length) { container.innerHTML = ''; return; }

  const rows = window._batchRows.map((row, index) => {
    const canInclude = _batchCanInclude(row);
    const checked = row.include && canInclude ? 'checked' : '';
    const disabled = canInclude ? '' : 'disabled';
    return `<div class="batch-row batch-status-${row.status}" data-batch-row="${index}">
      <label class="batch-include" title="${t('batch_include')}">
        <input type="checkbox" ${checked} ${disabled} onchange="toggleBatchRow(${index},this.checked)">
      </label>
      <span class="batch-index">${index + 1}</span>
      <input class="batch-literal" value="${esc(row.literal)}" aria-label="${t('add_tab_word')}" onchange="editBatchLiteral(${index},this.value)">
      <input class="batch-translation" value="${esc(row.translation)}" aria-label="${t('add_translation')}" placeholder="${t('batch_manual_translation')}" oninput="editBatchTranslation(${index},this.value)">
      <select class="batch-type" aria-label="${t('add_type')}" onchange="editBatchType(${index},this.value)">${_batchTypeOptions(row.type)}</select>
      <span class="batch-status">${esc(_batchStatusLabel(row))}</span>
      <span class="batch-action">${row.status === 'failed' ? `<button class="btn btn-sm btn-secondary" onclick="retryBatchRow(${index})">${t('batch_retry')}</button>` : ''}</span>
    </div>`;
  }).join('');

  const includable = window._batchRows.filter(r => r.include && _batchCanInclude(r)).length;
  container.innerHTML = `<div class="card batch-preview-card">
    <div class="batch-preview-header">
      <div><h2>${t('batch_preview_title')}</h2><p>${t('batch_preview_summary').replace('{n}', window._batchRows.length)}</p></div>
      <button class="btn btn-primary" id="batchSaveBtn" ${includable ? '' : 'disabled'} onclick="saveBatchWords()">${t('batch_save').replace('{n}', includable)}</button>
    </div>
    <div class="batch-table-head"><span></span><span>#</span><span>${t('add_tab_word')}</span><span>${t('add_translation')}</span><span>${t('add_type')}</span><span>${t('batch_status')}</span><span></span></div>
    <div class="batch-rows">${rows}</div>
  </div>`;
}

function _normalizeBatchRows(raw, knownWords) {
  const seen = new Set();
  return raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(literal => {
    const key = literal.toLowerCase();
    let status = 'translating';
    let include = true;
    if (!/^[A-Za-z][A-Za-z' -]{0,79}$/.test(literal)) { status = 'invalid'; include = false; }
    else if (seen.has(key)) { status = 'duplicate'; include = false; }
    else if (knownWords.has(key)) { status = 'existing'; include = false; }
    seen.add(key);
    return { literal, translation: '', type: 'other', typeManual: false, status, include };
  });
}

window.generateBatchPreview = async function () {
  const raw = document.getElementById('batchInput')?.value || '';
  const errorEl = document.getElementById('batchAddErr');
  const okEl = document.getElementById('batchAddOk');
  const progressEl = document.getElementById('batchProgress');
  const button = document.getElementById('batchGenerateBtn');
  errorEl.classList.add('hidden'); okEl.classList.add('hidden');
  const entries = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!entries.length) {
    errorEl.textContent = t('batch_error_empty'); errorEl.classList.remove('hidden'); return;
  }
  const uniqueValid = new Set(entries.filter(v => /^[A-Za-z][A-Za-z' -]{0,79}$/.test(v)).map(v => v.toLowerCase()));
  if (uniqueValid.size > 100) {
    errorEl.textContent = t('batch_error_limit'); errorEl.classList.remove('hidden'); return;
  }

  button.disabled = true;
  progressEl.classList.remove('hidden');
  progressEl.textContent = t('batch_loading_library');
  try {
    const existing = await api('GET', '/api/words?lang=' + encodeURIComponent(currentLang()));
    window._batchKnownWords = new Set(existing.map(w => String(w.literal || '').trim().toLowerCase()).filter(Boolean));
    window._batchRows = _normalizeBatchRows(raw, window._batchKnownWords);
    const pending = window._batchRows.map((row, index) => ({ row, index })).filter(x => x.row.status === 'translating');
    let cursor = 0;
    let completed = 0;
    const updateProgress = () => {
      progressEl.textContent = t('batch_progress').replace('{done}', completed).replace('{total}', pending.length);
    };
    updateProgress();
    async function worker() {
      while (cursor < pending.length) {
        const task = pending[cursor++];
        try {
          const result = await api('GET', '/api/translate?word=' + encodeURIComponent(task.row.literal));
          task.row.translation = result.meaning || '';
          if (!task.row.typeManual) task.row.type = result.type || 'other';
          task.row.status = task.row.translation ? 'ready' : 'failed';
        } catch {
          task.row.status = 'failed';
        }
        completed++;
        updateProgress();
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
    _renderBatchPreview();
  } catch (err) {
    errorEl.textContent = err.error || t('common_error'); errorEl.classList.remove('hidden');
  } finally {
    button.disabled = false;
    progressEl.classList.add('hidden');
  }
};

window.toggleBatchRow = function (index, checked) {
  const row = window._batchRows[index];
  if (row && _batchCanInclude(row)) row.include = checked;
  _renderBatchPreview();
};

window.editBatchTranslation = function (index, value) {
  const row = window._batchRows[index];
  if (!row) return;
  row.translation = value.trim();
  if (row.status === 'failed' || row.status === 'ready') row.status = row.translation ? 'ready' : 'failed';
  row.include = _batchCanInclude(row) && row.include;
  const rowEl = document.querySelector(`[data-batch-row="${index}"]`);
  if (rowEl) rowEl.className = `batch-row batch-status-${row.status}`;
  const status = rowEl?.querySelector('.batch-status');
  if (status) status.textContent = _batchStatusLabel(row);
  const action = rowEl?.querySelector('.batch-action');
  if (action) action.innerHTML = row.status === 'failed'
    ? `<button class="btn btn-sm btn-secondary" onclick="retryBatchRow(${index})">${t('batch_retry')}</button>`
    : '';
  const saveBtn = document.getElementById('batchSaveBtn');
  const count = window._batchRows.filter(r => r.include && _batchCanInclude(r)).length;
  if (saveBtn) { saveBtn.textContent = t('batch_save').replace('{n}', count); saveBtn.disabled = !count; }
};

window.editBatchType = function (index, value) {
  const row = window._batchRows[index];
  if (!row || !['noun', 'verb', 'adjective', 'adverb', 'other'].includes(value)) return;
  row.type = value;
  row.typeManual = true;
};

window.editBatchLiteral = function (index, value) {
  const row = window._batchRows[index];
  if (!row) return;
  const literal = value.trim();
  row.literal = literal;
  row.translation = '';
  row.type = 'other';
  row.typeManual = false;
  const key = literal.toLowerCase();
  const another = window._batchRows.some((r, i) => i !== index && r.literal.trim().toLowerCase() === key);
  if (!/^[A-Za-z][A-Za-z' -]{0,79}$/.test(literal)) row.status = 'invalid';
  else if (another) row.status = 'duplicate';
  else if (window._batchKnownWords.has(key)) row.status = 'existing';
  else row.status = 'failed';
  row.include = _batchCanInclude(row);
  _renderBatchPreview();
};

window.retryBatchRow = async function (index) {
  const row = window._batchRows[index];
  if (!row || !/^[A-Za-z][A-Za-z' -]{0,79}$/.test(row.literal)) return;
  row.status = 'translating'; _renderBatchPreview();
  try {
    const result = await api('GET', '/api/translate?word=' + encodeURIComponent(row.literal));
    row.translation = result.meaning || '';
    if (!row.typeManual) row.type = result.type || 'other';
    row.status = row.translation ? 'ready' : 'failed';
  } catch { row.status = 'failed'; }
  row.include = _batchCanInclude(row);
  _renderBatchPreview();
};

window.saveBatchWords = async function () {
  const selectedRows = window._batchRows.map((row, rowIndex) => ({ ...row, rowIndex })).filter(r => r.include && _batchCanInclude(r));
  const errorEl = document.getElementById('batchAddErr');
  const okEl = document.getElementById('batchAddOk');
  errorEl.classList.add('hidden'); okEl.classList.add('hidden');
  if (!selectedRows.length) {
    errorEl.textContent = t('batch_error_none'); errorEl.classList.remove('hidden'); return;
  }
  if (selectedRows.some(r => !r.literal.trim() || !r.translation.trim())) {
    errorEl.textContent = t('batch_error_incomplete'); errorEl.classList.remove('hidden'); return;
  }
  const button = document.getElementById('batchSaveBtn');
  button.disabled = true;
  try {
    const result = await api('POST', '/api/words/batch', {
      lang: currentLang(),
      items: selectedRows.map(r => ({ literal: r.literal, translation: r.translation, type: r.type || 'other' }))
    });
    const savedRowIndexes = new Set(result.saved.map(x => selectedRows[x.index]?.rowIndex).filter(i => i !== undefined));
    result.duplicates.forEach(x => {
      const row = window._batchRows[selectedRows[x.index]?.rowIndex];
      if (row) { row.status = 'existing'; row.include = false; }
    });
    result.errors.forEach(x => {
      const row = window._batchRows[selectedRows[x.index]?.rowIndex];
      if (row) row.status = 'failed';
    });
    window._batchRows = window._batchRows.filter((_, index) => !savedRowIndexes.has(index));
    result.saved.forEach(x => window._batchKnownWords.add(x.word.literal.toLowerCase()));
    okEl.textContent = t('batch_saved_result').replace('{saved}', result.saved.length).replace('{skipped}', result.duplicates.length + result.errors.length);
    okEl.classList.remove('hidden');
    _renderBatchPreview();
  } catch (err) {
    errorEl.textContent = err.error || t('common_error'); errorEl.classList.remove('hidden');
  } finally {
    if (button && document.body.contains(button)) button.disabled = false;
  }
};

window.submitWord = async function () {
  const lang = currentLang();
  const langData = currentLangData();
  const type = window._addWordType;
  const literal = document.getElementById('wLiteral')?.value.trim();
  const translation = document.getElementById('wTranslation')?.value.trim();
  const definition = document.getElementById('wDefinition')?.value.trim();
  const errEl = document.getElementById('wordAddErr');
  const okEl = document.getElementById('wordAddOk');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!literal || !translation) {
    errEl.textContent = t('add_err_word'); errEl.classList.remove('hidden'); return;
  }

  const body = { lang, type, literal, translation, definition };
  if (type === 'noun') body.article = document.getElementById('wArticle')?.value.trim() || '';
  if (type === 'verb') {
    body.verbGroup = document.getElementById('wVerbGroup')?.value || '';
    const tenses = (langData && langData.tenses && langData.tenses.length) ? langData.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
    const pronouns = (langData && langData.pronouns) ? langData.pronouns : ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
    const conj = {};
    tenses.forEach((tense, ti) => {
      const tenseConj = {};
      pronouns.forEach((p, pi) => {
        const form = document.getElementById(`conj_${ti}_${pi}`)?.value.trim();
        const tr = document.getElementById(`conjtr_${ti}_${pi}`)?.value.trim();
        if (form || tr) tenseConj[p] = { form: form || '', translation: tr || '' };
      });
      if (Object.keys(tenseConj).length) conj[String(ti)] = tenseConj;
    });
    body.conjugation = conj;
  }

  const declensions = (langData && langData.declensions) ? langData.declensions : [];
  if (declensions.length) {
    const declObj = {};
    declensions.forEach((d, i) => {
      const val = document.getElementById(`decl_${i}`)?.value.trim();
      if (val) declObj[i] = { nativeName: d.nativeName, targetName: d.targetName, value: val };
    });
    if (Object.keys(declObj).length) body.declensions = declObj;
  }

  body.labels = (window.getAddPageSelectedLabels ? window.getAddPageSelectedLabels() : []);

  const btn = document.getElementById('addWordBtn');
  btn.disabled = true;
  try {
    await api('POST', '/api/words', body);
    _okMessage(okEl, `${t('add_ok_word')} "${literal}"`);
    okEl.classList.remove('hidden');

    ['wLiteral', 'wTranslation', 'wDefinition', 'wArticle'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('[id^="conj_"],[id^="conjtr_"]').forEach(el => { if (el) el.value = ''; });
    document.querySelectorAll('[id^="decl_"]').forEach(el => el.value = '');
    const vgEl = document.getElementById('wVerbGroup');
    if (vgEl) vgEl.value = '';
    document.getElementById('wLiteral')?.focus();
    _purgeAutoOverlays();
    _lastEditedField = null;
    window._wordTypeManual = false;
    document.querySelectorAll('#wordLabelPickerContainer-chips .label-pick-btn').forEach(b => { b.classList.remove('active'); b.style.background = 'transparent'; b.style.color = b.dataset.color; });
    setTimeout(() => okEl.classList.add('hidden'), 8000);
  } catch (e) {
    errEl.textContent = e.error || t('common_error'); errEl.classList.remove('hidden');
  }
  btn.disabled = false;
};

window.submitPhrase = async function () {
  const lang = currentLang();
  const text = document.getElementById('pText')?.value.trim();
  const translation = document.getElementById('pTranslation')?.value.trim();
  const helpNote = document.getElementById('pNote')?.value.trim();
  const errEl = document.getElementById('phraseAddErr');
  const okEl = document.getElementById('phraseAddOk');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!text || !translation) {
    errEl.textContent = t('add_err_phrase'); errEl.classList.remove('hidden'); return;
  }

  const phraseLabels = (window.getAddPagePhraseSelectedLabels ? window.getAddPagePhraseSelectedLabels() : []);

  const btn = document.getElementById('addPhraseBtn');
  btn.disabled = true;
  try {
    await api('POST', '/api/phrases', { lang, text, translation, helpNote, labels: phraseLabels });
    _okMessage(okEl, t('add_ok_phrase'));
    okEl.classList.remove('hidden');
    document.getElementById('pText').value = '';
    document.getElementById('pTranslation').value = '';
    document.getElementById('pNote').value = '';
    document.getElementById('pText').focus();
    document.querySelectorAll('#phraseLabelPickerContainer-chips .label-pick-btn').forEach(b => { b.classList.remove('active'); b.style.background = 'transparent'; b.style.color = b.dataset.color; });
    setTimeout(() => okEl.classList.add('hidden'), 8000);
  } catch (e) {
    errEl.textContent = e.error || t('common_error'); errEl.classList.remove('hidden');
  }
  btn.disabled = false;
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
