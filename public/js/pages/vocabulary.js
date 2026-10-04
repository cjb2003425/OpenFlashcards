// Client-side max progress formula (mirrors server)
function phraseMaxProgressClient(text) {
  const minProgressValue = 50;
  const maxProgressValue = 200;
  const wordCountCoefficient = 10; // Increase to make longer words/phrases harder; decrease to flatten the curve
  const lengthCoefficient = 8; // Increase to make longer words/phrases harder; decrease to flatten the curve
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const avgWordLength = wordCount > 0 ? words.reduce((sum, word) => sum + word.length, 0) / wordCount : 0;

  const score = minProgressValue +
    wordCount * wordCountCoefficient +
    avgWordLength * lengthCoefficient;

  return Math.max(minProgressValue, Math.min(maxProgressValue, Math.round(score)));
}

function wordMaxProgressClient(literal, infinitive) {
  const minProgressValue = 50;
  const maxProgressValue = 200;
  const coefficient = 5; // Increase to make longer words/phrases harder; decrease to flatten the curve
  const str = (infinitive && infinitive && infinitive.trim()) ? infinitive.trim() : (literal || '');
  const n = str.length;
  return Math.max(minProgressValue, Math.min(maxProgressValue, Math.round(minProgressValue + Math.sqrt(n) * coefficient)));
}


// Normalize a conjugation entry: old string format → new object format
function normConj(entry) {
  if (!entry) return { form: '', translation: '' };
  if (typeof entry === 'string') return { form: entry, translation: '' };
  return { form: entry.form || '', translation: entry.translation || '' };
}

// pages/vocabulary.js
'use strict';

let _vocabWords = [];
let _vocabPhrases = [];
let _vocabFilter = '';
let _vocabSearch = '';
let _vocabLabel = '';   // filter by label id
let _vocabMastered = false; // filter only mastered items

// ── Duplicates mode ──────────────────────────────────────────────────────────
let _vocabDupMode = false;
let _vocabDupGroups = null; // { words: [[...], ...], phrases: [[...], ...] }
let _vocabDupFieldSel = {}; // { groupKey: { fieldName: sourceItemId } }
let _vocabDupLabelSel = {}; // { groupKey: [labelId, ...] }

async function renderVocabulary(el, params) {
  params = params || {};
  const lang = currentLang();
  if (!lang) { navigate('settings'); return; }

  // Determine initial filter from params
  const initFilter = (params.filter && params.filter !== 'mastered') ? params.filter : '';
  const initMastered = params.filter === 'mastered';
  const initSearch = params.search ? decodeURIComponent(params.search) : '';

  const ic = window.phIcon;
  el.innerHTML = `
    <div class="page-title">${ic('books')} ${t('vocab_title')}</div>
    <div class="vocab-controls">
      <input type="search" id="vocabSearch" class="search-input" placeholder="${t('vocab_search')}">
      <div class="type-filter" id="vocabFilter">
        <button class="type-btn ${!initFilter && !initMastered ? 'active' : ''}" data-type="">${t('vocab_all')}</button>
        <button class="type-btn ${initFilter === 'noun' ? 'active' : ''}" data-type="noun">${ic('package')} ${t('vocab_nouns')}</button>
        <button class="type-btn ${initFilter === 'verb' ? 'active' : ''}" data-type="verb">${ic('lightning')} ${t('vocab_verbs')}</button>
        <button class="type-btn ${initFilter === 'adjective' ? 'active' : ''}" data-type="adjective">${ic('palette')} ${t('vocab_adj')}</button>
        <button class="type-btn ${initFilter === 'adverb' ? 'active' : ''}" data-type="adverb">${ic('wind')} ${t('vocab_adv')}</button>
        <button class="type-btn ${initFilter === 'other' ? 'active' : ''}" data-type="other">${ic('puzzle-piece')} ${t('vocab_other')}</button>
        <button class="type-btn ${initFilter === 'phrase' ? 'active' : ''}" data-type="phrase">${ic('chat-circle')} ${t('vocab_phrases')}</button>
        <button class="type-btn ${initMastered ? 'active' : ''}" data-type="mastered">${ic('check')} ${t('vocab_mastered') || 'Maîtrisés'}</button>
      </div>
      <button class="btn btn-sm btn-secondary" id="dupFindBtn" style="margin-top:6px;font-size:.82rem" onclick="findDuplicates()">${ic('magnifying-glass')} ${t('vocab_find_duplicates')}</button>
      <div id="labelFilterRow" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"></div>
      <div id="dupToolbar" class="hidden" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 14px;background:var(--surface-2);border-radius:12px">
        <span id="dupCount" style="font-size:.85rem;font-weight:600;color:var(--text-muted)"></span>
        <span style="font-size:.75rem;color:var(--text-faint)">${t('vocab_dup_select_hint')}</span>
        <button class="btn btn-sm btn-primary" onclick="mergeDuplicates()" id="dupMergeBtn">${ic('link')} ${t('vocab_dup_merge')}</button>
        <button class="btn btn-sm btn-secondary" onclick="exitDuplicateMode()">${ic('x')} ${t('vocab_dup_exit')}</button>
      </div>
    </div>
    <div id="vocabGrid" class="word-grid"></div>
    <div id="vocabEmpty" class="hidden" style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <p style="font-size:2rem">${ic('mailbox')}</p>
      <p>${t('vocab_empty')}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('add')">${ic('plus')} ${t('vocab_add_first')}</button>
    </div>
    <div class="nb-modal-overlay hidden" id="vocabLinkModal">
      <div class="nb-modal-dialog" style="width:420px;max-width:90vw">
        <h3>${t('vocab_link_to_page')}</h3>
        <input type="text" id="vocabLinkSearch" placeholder="${t('notebook_search_placeholder')}" autocomplete="off">
        <div id="vocabLinkResults" style="max-height:320px;overflow-y:auto;margin-top:4px"></div>
        <div style="text-align:right;margin-top:10px">
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('vocabLinkModal').classList.add('hidden')">${t('common_close')}</button>
        </div>
      </div>
    </div>`;

  _vocabFilter = initFilter;
  _vocabSearch = initSearch ? initSearch.toLowerCase() : '';
  _vocabLabel = '';
  _vocabMastered = initMastered;

  if (initSearch) {
    const searchInput = document.getElementById('vocabSearch');
    if (searchInput) searchInput.value = initSearch;
  }

  document.getElementById('vocabFilter').querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#vocabFilter .type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.type === 'mastered') {
        _vocabFilter = '';
        _vocabMastered = true;
      } else {
        _vocabFilter = btn.dataset.type;
        _vocabMastered = false;
      }
      renderVocabGrid();
    });
  });

  document.getElementById('vocabSearch').addEventListener('input', e => {
    _vocabSearch = e.target.value.trim().toLowerCase();
    renderVocabGrid();
  });

  document.getElementById('vocabGrid').innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div></div>';
  try {
    [_vocabWords, _vocabPhrases] = await Promise.all([
      api('GET', '/api/words?lang=' + encodeURIComponent(lang)),
      api('GET', '/api/phrases?lang=' + encodeURIComponent(lang))
    ]);
    renderLabelFilterRow();
    renderVocabGrid();
  } catch {
    document.getElementById('vocabGrid').innerHTML = '<p style="color:var(--danger)">' + t('vocab_load_error') + '</p>';
  }
}

function textColorForBg(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1a1a' : '#ffffff';
}

function renderLabelFilterRow() {
  const lang = currentLang();
  const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  const labels = langData.labels || [];
  const row = document.getElementById('labelFilterRow');
  if (!row) return;
  if (!labels.length) { row.innerHTML = ''; return; }

  row.innerHTML =
    `<span style="font-size:.78rem;color:var(--text-faint)">${t('labels_filter')}:</span>` +
    `<button class="label-chip active" data-lid="" style="background:var(--surface-2)">${t('vocab_all')}</button>` +
    labels.map(lb =>
      `<button class="label-chip" data-lid="${esc(lb.id)}" data-color="${esc(lb.color)}" style="background:${esc(lb.color)}20;border-color:${esc(lb.color)};color:${esc(lb.color)}">${esc(lb.name)}</button>`
    ).join('');

  row.querySelectorAll('.label-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.label-chip').forEach(b => {
        b.classList.remove('active');
        const color = b.dataset.color;
        if (color) {
          b.style.background = color + '20';
          b.style.color = color;
          b.style.borderColor = color;
        } else {
          b.style.background = 'var(--surface-2)';
          b.style.color = '';
          b.style.borderColor = '';
        }
      });
      btn.classList.add('active');
      const color = btn.dataset.color;
      if (color) {
        btn.style.background = color;
        btn.style.color = textColorForBg(color);
        btn.style.borderColor = color;
      } else {
        btn.style.background = 'var(--surface-2)';
        btn.style.color = '';
        btn.style.borderColor = '';
      }
      _vocabLabel = btn.dataset.lid || '';
      renderVocabGrid();
    });
  });
}

function renderVocabGrid() {
  const grid = document.getElementById('vocabGrid');
  const empty = document.getElementById('vocabEmpty');
  if (!grid) return;

  const showPhrases = !_vocabFilter || _vocabFilter === 'phrase';
  const showWords = !_vocabFilter || _vocabFilter !== 'phrase';

  let items = [];
  if (showWords) {
    items = items.concat(_vocabWords.filter(w => {
      if (_vocabFilter === 'phrase' && w.type !== 'phrase') return false;
      if (_vocabFilter && _vocabFilter !== 'phrase' && w.type === 'phrase') return false;
      const matchType = !_vocabFilter || w.type === _vocabFilter;
      const searchText = (w.literal || w.text || '').toLowerCase();
      const matchSearch = !_vocabSearch ||
        searchText.includes(_vocabSearch) ||
        w.translation.toLowerCase().includes(_vocabSearch) ||
        (w.definition || '').toLowerCase().includes(_vocabSearch);
      const matchLabel = !_vocabLabel || (w.labels || []).includes(_vocabLabel);
      const maxProg = w.maxProgress || wordMaxProgressClient(w.literal, w.infinitive);
      const matchMastered = !_vocabMastered || (w.progress || 0) >= maxProg;
      return matchType && matchSearch && matchLabel && matchMastered;
    }).map(w => ({ ...w, _kind: 'word' })));
  }
  if (showPhrases) {
    items = items.concat(_vocabPhrases.filter(p => {
      const itemType = p.type || 'phrase';
      if (_vocabFilter === 'phrase' && itemType !== 'phrase') return false;
      if (_vocabFilter && _vocabFilter !== 'phrase' && itemType !== _vocabFilter) return false;
      const searchText = (p.text || p.literal || '').toLowerCase();
      const matchSearch = !_vocabSearch ||
        searchText.includes(_vocabSearch) ||
        p.translation.toLowerCase().includes(_vocabSearch) ||
        (p.definition || '').toLowerCase().includes(_vocabSearch);
      const matchLabel = !_vocabLabel || (p.labels || []).includes(_vocabLabel);
      const pMax = p.maxProgress || phraseMaxProgressClient(p.text || p.literal || '');
      const matchMastered = !_vocabMastered || (p.progress || 0) >= pMax;
      return matchSearch && matchLabel && matchMastered;
    }).map(p => ({ ...p, _kind: 'phrase' })));
  }

  if (!items.length) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');

    const hasAnyContent = _vocabWords.length > 0 || _vocabPhrases.length > 0;
    const isSearchOrFilter = _vocabSearch || _vocabFilter || _vocabLabel;

    if (hasAnyContent && isSearchOrFilter) {
      const searchTerm = _vocabSearch ? `"${_vocabSearch}"` : '';
      const isPhrase = _vocabFilter === 'phrase';
      const addLabel = isPhrase ? t('vocab_add_this_phrase') : t('vocab_add_this_word');
      const addHint = isPhrase ? t('vocab_no_phrase_found') : t('vocab_no_word_found');

      empty.innerHTML = `
      <p style="font-size:2rem">${ic('magnifying-glass')}</p>
      <p>${addHint}${searchTerm ? ' ' + searchTerm : ''}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('add')">${ic('plus')} ${addLabel}</button>
    `;
    } else {
      const isPhrase = _vocabFilter === 'phrase';
      const addLabel = isPhrase ? t('vocab_add_first_phrase') : t('vocab_add_first');
      empty.innerHTML = `
      <p style="font-size:2rem">${ic('mailbox')}</p>
      <p>${t('vocab_empty')}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('add')">${ic('plus')} ${addLabel}</button>
    `;
    }
    return;
  }
  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  // Build DOM directly to keep TTS buttons alive
  grid.innerHTML = '';
  items.forEach(item => {
    const isPhraseCard = item.type === 'phrase' || (!item.type && item._kind === 'phrase');
    const cardEl = isPhraseCard ? buildPhraseCard(item) : buildWordCard(item);
    grid.appendChild(cardEl);
  });
}

function getLabels() {
  const lang = currentLang();
  const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  return langData.labels || [];
}

function buildWordCard(w) {
  const ic = window.phIcon;
  const labels = { noun: `${ic('package')} ${t('vocab_noun')}`, verb: `${ic('lightning')} ${t('vocab_verb')}`, adjective: `${ic('palette')} ${t('vocab_adjective')}`, adverb: `${ic('wind')} ${t('vocab_adverb')}`, other: `${ic('puzzle-piece')} ${t('vocab_other')}`, phrase: `${ic('chat-circle')} ${t('vocab_phrase')}` };
  const isPhrase = w.type === 'phrase';
  const sep = w.article && (w.article.endsWith("'") || w.article.endsWith("\u2019")) ? '' : ' ';
  const display = isPhrase
    ? (w.text || w.literal || '')
    : (w.article ? w.article + sep : '') + (w.type === 'verb' && w.infinitive ? w.infinitive : w.literal);
  const progress = w.progress || 0;
  const maxProg = isPhrase
    ? (w.maxProgress || phraseMaxProgressClient(w.text || w.literal || ''))
    : (w.maxProgress || wordMaxProgressClient(w.literal, w.infinitive));
  const mastered = progress >= maxProg;
  const diffPct = Math.round((progress / maxProg) * 100);
  const allLabels = getLabels();
  const wordLabelIds = w.labels || [];
  const editFn = isPhrase ? 'editPhrase' : 'editWord';
  const deleteFn = isPhrase ? 'deletePhrase' : 'deleteWord';
  const linkFn = 'vocabLinkWord(\'' + w.id + '\',\'' + w.langCode + '\')';

  const div = document.createElement('div');
  div.className = 'word-card';
  div.id = 'wc-' + w.id;

  // Label chips
  const labelHtml = wordLabelIds.length
    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">' +
    wordLabelIds.map(lid => {
      const lb = allLabels.find(l => l.id === lid);
      return lb
        ? `<span style="font-size:.72rem;padding:2px 7px;border-radius:10px;background:${esc(lb.color)}20;border:1px solid ${esc(lb.color)};color:${esc(lb.color)}">${esc(lb.name)}</span>`
        : '';
    }).join('') +
    '</div>'
    : '';

  div.innerHTML =
    '<div class="word-card-header">' +
    '<div>' +
    '<span class="badge badge-' + (isPhrase ? 'phrase' : w.type) + '">' + (labels[w.type] || w.type) + '</span>' +
    (!isPhrase && w.printedAt ? ' <span class="badge printed-badge">已打印</span>' : '') +

    '</div>' +
    '<div class="word-actions">' +
    '<span id="tts-' + w.id + '"></span>' +
    '<button class="btn btn-sm btn-secondary" onclick="' + editFn + '(\'' + w.id + '\',\'' + w.langCode + '\')" title="' + t('vocab_edit') + '">' + ic('pencil-simple') + '</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="' + linkFn + '" title="' + t('vocab_link_notebook') + '">' + ic('link') + '</button>' +
    '<button class="btn btn-sm btn-danger"    onclick="' + deleteFn + '(\'' + w.id + '\',\'' + w.langCode + '\')" title="' + t('vocab_delete') + '">' + ic('trash') + '</button>' +
    '</div>' +
    '</div>' +
    '<div class="word-literal">' + esc(display) + '</div>' +
    '<div class="word-trans">' + esc(w.translation) + '</div>' +
    (w.definition ? '<div class="word-def">' + esc(w.definition) + '</div>' : '') +
    (mastered
      ? '<div class="mastered-badge">' + ic('check') + ' ' + t('vocab_mastered') + '</div>'
      : '<div class="progress-row" title="' + progress + ' / ' + maxProg + '">' +
      '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + diffPct + '%"></div></div>' +
      '<span class="progress-pct">' + diffPct + '%</span>' +
      '</div>') +
    (!isPhrase && w.verbGroup ? '<div style="font-size:.78rem;color:var(--text-faint);margin-top:4px">' + ic('books') + ' ' + esc(w.verbGroup) + '</div>' : '') +
    (!isPhrase && w.type !== 'verb' && w.declensions && Object.keys(w.declensions).length ? '<div style="font-size:.78rem;color:var(--text-faint);margin-top:2px">' + ic('arrows-split') + ' ' + t('vocab_decl_count').replace('{n}', Object.keys(w.declensions).length) + '</div>' : '') +
    labelHtml +
    buildNotebookLinksHtml(w.notebookLinks, w.id, 'word');

  // TTS button via DOM to avoid HTML injection issues
  const ttsSlot = div.querySelector('#tts-' + w.id);
  if (ttsSlot) {
    const normalBtn = TTS.button(display, w.langCode, null, w.id);
    const slowBtn = TTS.buttonSlow(display, w.langCode, null, w.id);
    ttsSlot.replaceWith(normalBtn);
    normalBtn.insertAdjacentElement('afterend', slowBtn);
  }

  // Verb conjugation section with per-row TTS
  if (!isPhrase && w.type === 'verb' && w.conjugation && Object.keys(w.conjugation).length) {
    const conj = w.conjugation;
    const conjValues = Object.values(conj);
    const isTenseKeyed = conjValues.length > 0 && conjValues.some(v => typeof v === 'object' && v !== null && !v.hasOwnProperty('form'));

    const langDataBase = (App.config.targetLangs || []).find(l => l.isoCode === w.langCode) || {};
    const tensesCfg = (langDataBase.tenses && langDataBase.tenses.length) ? langDataBase.tenses : [];

    const details = document.createElement('details');
    details.style.cssText = 'margin-top:8px;font-size:.82rem';

    const summary = document.createElement('summary');
    summary.style.cssText = 'cursor:pointer;color:var(--text-muted);font-weight:600;font-size:.8rem';
    summary.innerHTML = window.phIcon('lightning') + ' ' + esc(t('train_conjugation') + (w.infinitive ? ' — ' + w.infinitive : ''));
    details.appendChild(summary);

    const conjContent = document.createElement('div');
    conjContent.style.cssText = 'margin-top:6px;padding:8px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)';

    function _addVocabConjRow(container, pronoun, entry, tenseIdx) {
      const e = normConj(entry);
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:80px 1fr 1fr auto;gap:6px;font-size:.82rem;padding:2px 0;border-bottom:1px solid var(--border);align-items:center';
      row.innerHTML =
        '<span style="color:var(--text-muted)">' + esc(pronoun) + '</span>' +
        '<span style="font-weight:600">' + esc(e.form) + '</span>' +
        (e.translation ? '<span style="color:var(--text-faint);font-size:.78rem">' + esc(e.translation) + '</span>' : '<span></span>');
      const ttsWrap = document.createElement('span');
      ttsWrap.style.cssText = 'display:flex;gap:2px;justify-content:flex-end';
      const conjText = pronoun + ' ' + e.form;
      const conjId = w.id + '_conj_' + tenseIdx + '_' + encodeURIComponent(pronoun);
      ttsWrap.appendChild(TTS.button(conjText, w.langCode, 'padding:2px 5px;font-size:.72rem', conjId));
      ttsWrap.appendChild(TTS.buttonSlow(conjText, w.langCode, 'padding:2px 5px;font-size:.72rem', conjId));
      row.appendChild(ttsWrap);
      container.appendChild(row);
    }

    if (isTenseKeyed) {
      Object.keys(conj).forEach((tenseIdx, idx) => {
        const tenseData = conj[tenseIdx];
        if (!tenseData || typeof tenseData !== 'object') return;
        const tenseConfig = tensesCfg[parseInt(tenseIdx)] || null;
        const tenseLabel = tenseConfig
          ? esc(tenseConfig.targetName || tenseConfig.nativeName)
          : (t('train_conjugation') + ' ' + (parseInt(tenseIdx) + 1));

        const header = document.createElement('div');
        header.style.cssText = 'font-size:.75rem;font-weight:700;color:var(--text-faint);margin-bottom:2px;margin-top:' + (idx > 0 ? '8px' : '0') + ';text-transform:uppercase;letter-spacing:.05em';
        header.textContent = tenseLabel;
        conjContent.appendChild(header);

        Object.entries(tenseData).forEach(([pronoun, entry]) => {
          _addVocabConjRow(conjContent, pronoun, entry, tenseIdx);
        });
      });
    } else {
      Object.entries(conj).forEach(([pronoun, entry]) => {
        _addVocabConjRow(conjContent, pronoun, entry, '0');
      });
    }

    details.appendChild(conjContent);
    div.appendChild(details);
  }

  return div;
}

function buildPhraseCard(p) {
  const ic = window.phIcon;
  const allLabels = getLabels();
  const phraseLabelIds = p.labels || [];

  const div = document.createElement('div');
  div.className = 'word-card';
  div.id = 'pc-' + p.id;

  const labelHtml = phraseLabelIds.length
    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">' +
    phraseLabelIds.map(lid => {
      const lb = allLabels.find(l => l.id === lid);
      return lb
        ? `<span style="font-size:.72rem;padding:2px 7px;border-radius:10px;background:${esc(lb.color)}20;border:1px solid ${esc(lb.color)};color:${esc(lb.color)}">${esc(lb.name)}</span>`
        : '';
    }).join('') +
    '</div>'
    : '';

  const displayText = p.text || p.literal || '';

  div.innerHTML =
    '<div class="word-card-header">' +
    '<span class="badge badge-phrase">' + ic('chat-circle') + ' ' + t('vocab_phrase') + '</span>' +
    '<div class="word-actions">' +
    '<span id="ptts-' + p.id + '"></span>' +
    '<button class="btn btn-sm btn-secondary" onclick="editPhrase(\'' + p.id + '\',\'' + p.langCode + '\')" title="' + t('vocab_edit') + '">' + ic('pencil-simple') + '</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="vocabLinkPhrase(\'' + p.id + '\',\'' + p.langCode + '\')" title="' + t('vocab_link_notebook') + '">' + ic('link') + '</button>' +
    '<button class="btn btn-sm btn-danger"    onclick="deletePhrase(\'' + p.id + '\',\'' + p.langCode + '\')" title="' + t('vocab_delete') + '">' + ic('trash') + '</button>' +
    '</div>' +
    '</div>' +
    '<div class="word-literal" style="font-size:1rem">' + esc(displayText) + '</div>' +
    '<div class="word-trans">' + esc(p.translation) + '</div>' +
    (p.helpNote ? '<div class="word-def">' + esc(p.helpNote) + '</div>' : '') +
    ((() => {
      const pProg = p.progress || 0;
      const pMax = p.maxProgress || phraseMaxProgressClient(displayText);
      const pMast = pProg >= pMax;
      const pPct = Math.round((pProg / pMax) * 100);
      return pMast
        ? '<div class="mastered-badge">' + ic('check') + ' ' + t('vocab_mastered') + '</div>'
        : '<div class="progress-row" title="' + pProg + ' / ' + pMax + '">' +
        '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + pPct + '%"></div></div>' +
        '<span class="progress-pct">' + pPct + '%</span>' +
        '</div>';
    })()) +
    labelHtml +
    buildNotebookLinksHtml(p.notebookLinks, p.id, 'phrase');

  const ttsSlot = div.querySelector('#ptts-' + p.id);
  if (ttsSlot) {
    const normalBtn = TTS.button(displayText, p.langCode, null, p.id);
    const slowBtn = TTS.buttonSlow(displayText, p.langCode, null, p.id);
    ttsSlot.replaceWith(normalBtn);
    normalBtn.insertAdjacentElement('afterend', slowBtn);
  }

  return div;
}

// ── Label picker widget ────────────────────────────────────────────────────────
function buildLabelPicker(selectedIds, containerId) {
  const lang = currentLang();
  const allLabels = getLabels();

  return `<div id="${containerId}" style="margin-bottom:14px">
    <label style="font-size:.88rem;font-weight:600;color:var(--text-muted)">${t('labels_assign')} <span class="optional">${t('common_optional')}</span></label>
    <div id="${containerId}-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;min-height:28px">
      ${allLabels.map(lb => {
    const active = selectedIds.includes(lb.id);
    return `<button type="button" class="label-pick-btn ${active ? 'active' : ''}"
          data-lid="${esc(lb.id)}" data-color="${esc(lb.color)}"
          style="padding:3px 10px;border-radius:12px;font-size:.78rem;cursor:pointer;
            background:${active ? esc(lb.color) : 'transparent'};
            border:1.5px solid ${esc(lb.color)};color:${active ? textColorForBg(lb.color) : esc(lb.color)};transition:.15s"
          onclick="toggleLabelPick(this,'${containerId}-chips')">${esc(lb.name)}</button>`;
  }).join('')}
      <button type="button" class="btn btn-sm btn-secondary"
        style="padding:2px 8px;font-size:.75rem"
        onclick="showCreateLabelInline('${containerId}-chips','${lang}')">${window.phIcon('plus')} ${t('labels_create_new')}</button>
    </div>
  </div>`;
}

window.toggleLabelPick = function (btn, chipsId) {
  btn.classList.toggle('active');
  const origColor = btn.dataset.color;
  if (btn.classList.contains('active')) {
    btn.style.background = origColor;
    btn.style.color = textColorForBg(origColor);
  } else {
    btn.style.background = 'transparent';
    btn.style.color = origColor;
  }
};

window.showCreateLabelInline = function (chipsId, lang) {
  const chips = document.getElementById(chipsId);
  if (!chips) return;
  // Don't add duplicates
  if (chips.querySelector('.new-label-input')) return;

  const DEFAULT_COLOR = '#439b00';

  const wrapper = document.createElement('div');
  wrapper.className = 'new-label-input';
  wrapper.style.cssText = 'display:flex;gap:4px;align-items:center;margin-top:4px;width:100%';
  wrapper.innerHTML =
    `<input type="text" placeholder="${t('labels_add_ph')}" style="flex:1;padding:4px 8px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text);font-size:.82rem" id="newLabelNameInline">` +
    `<span style="position:relative;width:28px;height:28px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center" title="Pick color">` +
    `<span id="newLabelColorDot" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);background:${DEFAULT_COLOR};display:block;pointer-events:none"></span>` +
    `<input type="color" id="newLabelColorPicker" value="${DEFAULT_COLOR}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0">` +
    `</span>` +
    `<button type="button" class="btn btn-sm btn-primary" style="padding:3px 8px;font-size:.78rem" onclick="confirmCreateLabelInline('${chipsId}','${lang}')">${window.phIcon('check-simple')}</button>` +
    `<button type="button" class="btn btn-sm btn-secondary" style="padding:3px 8px;font-size:.78rem" onclick="this.closest('.new-label-input').remove()">${window.phIcon('x-simple')}</button>`;

  chips.appendChild(wrapper);

  const colorPicker = wrapper.querySelector('#newLabelColorPicker');
  const colorDot = wrapper.querySelector('#newLabelColorDot');
  colorPicker.addEventListener('input', () => {
    colorDot.style.background = colorPicker.value;
  });

  wrapper.querySelector('#newLabelNameInline').focus();
};

window.confirmCreateLabelInline = async function (chipsId, lang) {
  const chips = document.getElementById(chipsId);
  const wrapper = chips && chips.querySelector('.new-label-input');
  if (!wrapper) return;
  const nameEl = wrapper.querySelector('#newLabelNameInline');
  const colorPicker = wrapper.querySelector('#newLabelColorPicker');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) return;
  const color = colorPicker ? colorPicker.value : '#6c757d';
  try {
    const result = await api('POST', '/api/labels', { lang, name, color });
    await loadConfig();
    // Add button to chips
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'label-pick-btn active';
    btn.dataset.lid = result.label.id;
    btn.dataset.color = color;
    btn.style.cssText = `padding:3px 10px;border-radius:12px;font-size:.78rem;cursor:pointer;background:${color};border:1.5px solid ${color};color:${textColorForBg(color)};transition:.15s`;
    btn.textContent = name;
    btn.onclick = function () { window.toggleLabelPick(this, chipsId); };
    chips.insertBefore(btn, wrapper);
    wrapper.remove();
  } catch (e) {
    toast(e.error || t('common_error'), 'danger');
  }
};

function getSelectedLabels(chipsId) {
  const chips = document.getElementById(chipsId);
  if (!chips) return [];
  return [...chips.querySelectorAll('.label-pick-btn.active')].map(b => b.dataset.lid).filter(Boolean);
}

// ── Edit word ──────────────────────────────────────────────────────────────────
// State for temporary field preservation when changing word type during editing
let _editWordState = null;
let _editWordLangData = null;
let _editWordLangDataBase = null;

function _buildEditWordFields(state) {
  const isVerb = state.type === 'verb';
  const isNoun = state.type === 'noun';
  const isPhrase = state.type === 'phrase';
  const lang = state.lang;
  const langData = _editWordLangData || {};
  const langDataBase = _editWordLangDataBase || {};
  const declensions = langData.declensions || [];
  const tenses = (langData.tenses && langData.tenses.length) ? langData.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
  const verbGroups = langData.verbGroups || [];
  const existingDecl = state.declensions || {};
  const existingConj = state.conjugation || {};
  const configPronouns = langData.pronouns || [];

  function isTenseKeyedConj(conj) {
    const keys = Object.keys(conj || {});
    if (!keys.length) return false;
    return keys.some(k => {
      const v = conj[k];
      return v && typeof v === 'object' && !v.hasOwnProperty('form');
    });
  }
  const conjIsTenseKeyed = isTenseKeyedConj(existingConj);

  const vgHtml = (isVerb && verbGroups.length)
    ? `<div class="field-group">
        <label>${t('add_verb_group')} <span class="optional">${t('common_optional')}</span></label>
        <select id="meVerbGroup" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
          <option value="">— —</option>
          ${verbGroups.map(g => `<option value="${esc(g.name)}" ${(state.verbGroup || '') === (g.name) ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
        </select>
      </div>` : '';

  const conjHtml = isVerb
    ? tenses.map((tense, ti) => {
      let tenseConjData;
      if (conjIsTenseKeyed) {
        tenseConjData = existingConj[String(ti)] || {};
      } else if (ti === 0) {
        tenseConjData = existingConj;
      } else {
        tenseConjData = {};
      }
      const tenseKeys = Object.keys(tenseConjData);
      const pronounsForTense = tenseKeys.length ? tenseKeys : configPronouns;
      if (!pronounsForTense.length) return '';
      return `<details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-weight:600;font-size:.9rem;color:var(--text-muted);margin-bottom:6px">
            ${esc(tense.targetName || tense.nativeName)} <span style="color:var(--text-faint);font-weight:400;font-size:.8rem">/ ${esc(tense.nativeName)}</span> <span style="font-size:.8rem;font-weight:400">${t('common_optional')}</span>
          </summary>
          <div style="font-size:.75rem;color:var(--text-faint);margin-bottom:6px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:0 2px">
            <span style="font-weight:600">${t('add_conj_pronoun')}</span>
            <span>${t('add_conj_form')}</span>
            <span>${t('add_conj_translation_ph')}</span>
          </div>
          ${pronounsForTense.map(p => {
        const e = normConj(tenseConjData[p]);
        return `<div class="field-group" style="margin-bottom:6px">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:center">
                <label style="font-size:.82rem;font-weight:600;margin:0">${esc(p)}</label>
                <input type="text" id="meConj_${ti}_${esc(p)}" value="${esc(e.form)}" autocomplete="off" placeholder="…" style="padding:6px 8px">
                <input type="text" id="meCT_${ti}_${esc(p)}" value="${esc(e.translation)}" autocomplete="off" placeholder="${t('add_conj_translation_ph')}" style="padding:6px 8px;font-size:.82rem;color:var(--text-muted)">
              </div>
            </div>`;
      }).join('')}
        </details>`;
    }).join('')
    : '';

  const declHtml = !isVerb && declensions.length
    ? `<details style="margin-bottom:14px">
        <summary style="cursor:pointer;font-weight:600;font-size:.9rem;color:var(--text-muted);margin-bottom:8px">
          ${t('add_declensions')} <span style="font-size:.8rem;font-weight:400">${t('common_optional')}</span>
        </summary>
        ${declensions.map((d, i) => `
          <div class="field-group" style="margin-bottom:8px">
            <label style="font-size:.85rem">${esc(d.nativeName)}${d.targetName ? ' <span style="color:var(--text-faint)">/ ' + esc(d.targetName) + '</span>' : ''}</label>
            <input type="text" id="meDecl_${i}" value="${esc((existingDecl[i] || {}).value || '')}" autocomplete="off" placeholder="…">
          </div>`).join('')}
      </details>` : '';

  const labelPickerHtml = buildLabelPicker(state.labels || [], 'meLabelPicker');
  const literalFieldValue = isVerb ? (state.infinitive || state.literal) : state.literal;

  if (isPhrase) {
    return `
    <div class="field-group"><label>${t('vocab_phrase_target') || 'Phrase (target language)'} <span class="required">*</span></label>
      <textarea id="meLiteral">${esc(state.literal || state.text || '')}</textarea></div>
    <div class="field-group"><label>${t('vocab_translation')} <span class="required">*</span></label><input id="meTranslation" value="${esc(state.translation)}"></div>
    <div class="field-group"><label>${t('vocab_note')} <span class="optional">${t('common_optional')}</span></label>
      <input id="mePNote" value="${esc(state.helpNote || state.definition || '')}"></div>
    ${labelPickerHtml}
    <div id="meErr" class="alert alert-danger hidden"></div>`;
  }

  return `
    ${isNoun ? `<div class="field-group"><label>${t('vocab_article')}</label><input id="meArticle" value="${esc(state.article || '')}"></div>` : ''}
    <div class="field-group"><label>${isVerb ? t('add_infinitive_label') : t('add_word_label')} <strong style="font-weight:600">${langDataBase.flag ? langDataBase.flag + ' ' : ''}${langDataBase.name || lang}</strong> <span class="required">*</span></label><input id="meLiteral" value="${esc(literalFieldValue)}"></div>
    ${isVerb && state.infinitive && state.infinitive !== state.literal ? `<div class="field-group" style="opacity:.7"><label style="font-size:.82rem">${t('vocab_word')} (conjugated) <span style="font-weight:400;font-size:.78rem;color:var(--text-faint)">(kept for reference)</span></label><input id="meAltForm" value="${esc(state.literal)}" style="font-size:.85rem"></div>` : ''}
    <div class="field-group"><label>${t('vocab_translation')} <span class="required">*</span></label><input id="meTranslation" value="${esc(state.translation)}"></div>
    ${vgHtml}
    ${conjHtml}
    ${declHtml}
    <div class="field-group"><label>${t('vocab_definition')} <span class="optional">${t('common_optional')}</span></label><input id="meDefinition" value="${esc(state.definition || '')}"></div>
    ${labelPickerHtml}
    <div id="meErr" class="alert alert-danger hidden"></div>`;
}

window.onEditWordTypeChange = function () {
  const state = _editWordState;
  if (!state) return;
  const newType = document.getElementById('meType').value;

  state.literal = document.getElementById('meLiteral')?.value?.trim() || state.literal;
  state.translation = document.getElementById('meTranslation')?.value?.trim() || state.translation;

  // Save note/definition — merged single field across types
  if (state.type === 'phrase') {
    const noteEl = document.getElementById('mePNote');
    if (noteEl) state.helpNote = noteEl.value.trim();
    state.definition = state.helpNote;
  } else {
    const defEl = document.getElementById('meDefinition');
    if (defEl) state.definition = defEl.value.trim();
    state.helpNote = state.definition;
  }

  const artEl = document.getElementById('meArticle');
  if (artEl) state.article = artEl.value.trim();

  const vgEl = document.getElementById('meVerbGroup');
  if (vgEl) state.verbGroup = vgEl.value;

  if (state.type === 'verb') {
    const langData = _editWordLangData || {};
    const tenses = (langData.tenses && langData.tenses.length) ? langData.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
    const conj = {};
    const configPronouns = langData.pronouns || [];
    tenses.forEach((tense, ti) => {
      const tenseConj = {};
      const existingConj = state.conjugation || {};
      const existingKeys = Object.keys(existingConj);
      const conjIsTenseKeyed = existingKeys.some(k => {
        const v = existingConj[k];
        return v && typeof v === 'object' && !v.hasOwnProperty('form');
      });
      const existingTenseData = conjIsTenseKeyed ? (existingConj[String(ti)] || {}) : (ti === 0 ? existingConj : {});
      const pronounsForTense = Object.keys(existingTenseData).length ? Object.keys(existingTenseData) : configPronouns;
      pronounsForTense.forEach(p => {
        const formEl = document.getElementById('meConj_' + ti + '_' + p);
        const trEl = document.getElementById('meCT_' + ti + '_' + p);
        const form = formEl ? formEl.value.trim() : '';
        const tr = trEl ? trEl.value.trim() : '';
        if (form || tr) tenseConj[p] = { form, translation: tr };
      });
      if (Object.keys(tenseConj).length) conj[String(ti)] = tenseConj;
    });
    state.conjugation = conj;
  }

  if (state.type !== 'verb' && state.type !== 'phrase') {
    const langData = _editWordLangData || {};
    const declensions = langData.declensions || [];
    const declObj = {};
    declensions.forEach((d, i) => {
      const val = document.getElementById(`meDecl_${i}`)?.value?.trim();
      if (val) declObj[i] = { nativeName: d.nativeName, targetName: d.targetName, value: val };
    });
    state.declensions = declObj;
  }

  const labelsEl = document.getElementById('meLabelPicker-chips');
  if (labelsEl) state.labels = getSelectedLabels('meLabelPicker-chips');

  state.type = newType;

  // When switching to phrase, use literal as text
  if (newType === 'phrase' && !state.text) {
    state.text = state.literal;
  }

  document.getElementById('meTypeFields').innerHTML = _buildEditWordFields(state);
};

window.editWord = function (id, lang) {
  const w = _vocabWords.find(x => x.id === id);
  if (!w) return;

  const langDataBase = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  const langPronouns = (window.LANG_PRONOUNS && window.LANG_PRONOUNS[langDataBase.isoCode]) || langDataBase.pronouns || [];
  const langData = langPronouns.length ? { ...langDataBase, pronouns: langPronouns } : langDataBase;

  _editWordLangData = langData;
  _editWordLangDataBase = langDataBase;
  _editWordState = {
    id: w.id,
    type: w.type,
    literal: w.literal,
    translation: w.translation,
    definition: w.definition || '',
    article: w.article || '',
    verbGroup: w.verbGroup || '',
    conjugation: JSON.parse(JSON.stringify(w.conjugation || {})),
    declensions: JSON.parse(JSON.stringify(w.declensions || {})),
    infinitive: w.infinitive || '',
    labels: [...(w.labels || [])],
    lang: lang
  };

  openModal(t('vocab_edit_word'), `
    <div class="field-group">
      <label>${t('add_type')} <span class="required">*</span></label>
      <select id="meType" onchange="onEditWordTypeChange()" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <option value="noun" ${w.type === 'noun' ? 'selected' : ''}>${window.phIcon('package')} ${t('vocab_noun')}</option>
        <option value="verb" ${w.type === 'verb' ? 'selected' : ''}>${window.phIcon('lightning')} ${t('vocab_verb')}</option>
        <option value="adjective" ${w.type === 'adjective' ? 'selected' : ''}>${window.phIcon('palette')} ${t('vocab_adjective')}</option>
        <option value="adverb" ${w.type === 'adverb' ? 'selected' : ''}>${window.phIcon('wind')} ${t('vocab_adverb')}</option>
        <option value="other" ${w.type === 'other' ? 'selected' : ''}>${window.phIcon('puzzle-piece')} ${t('vocab_other')}</option>
        <option value="phrase" ${w.type === 'phrase' ? 'selected' : ''}>${window.phIcon('chat-circle')} ${t('vocab_phrase')}</option>
      </select>
    </div>
    <div id="meTypeFields">
      ${_buildEditWordFields(_editWordState)}
    </div>`,
    `<button class="btn btn-secondary btn-sm btn-reset-progress" style="color:var(--danger);border-color:var(--danger);margin-right:auto" onclick="confirmResetWordProgress('${id}','${lang}')">${window.phIcon('arrow-counter-clockwise')}<span class="btn-reset-text"> ${t('vocab_reset_progress')}</span></button>
     <button class="btn btn-secondary" onclick="closeModal()">${t('vocab_cancel')}</button>
     <button class="btn btn-primary" onclick="saveWordEdit('${id}','${lang}')">${t('vocab_save')}</button>`
  );
};

window.saveWordEdit = async function (id, lang) {
  const selectedType = document.getElementById('meType').value;

  if (selectedType === 'phrase') {
    const textEl = document.getElementById('meLiteral');
    const newText = textEl ? textEl.value.trim() : '';
    if (!newText) {
      document.getElementById('meErr').textContent = t('add_err_phrase');
      document.getElementById('meErr').classList.remove('hidden');
      return;
    }
    const helpNoteValue = document.getElementById('mePNote')?.value?.trim() || '';
    const body = {
      type: 'phrase',
      text: newText,
      translation: document.getElementById('meTranslation').value.trim(),
      helpNote: helpNoteValue,
      definition: helpNoteValue,
      labels: getSelectedLabels('meLabelPicker-chips')
    };
    if (!body.translation) {
      document.getElementById('meErr').textContent = t('add_err_phrase');
      document.getElementById('meErr').classList.remove('hidden');
      return;
    }
    try {
      await api('PUT', `/api/words/${id}?lang=${encodeURIComponent(lang)}`, body);
      if (window.OfflineDB) await OfflineDB.deleteTTS(lang, id);
      if (window.Offline) {
        const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
        const speedNormal = (langData.ttsSpeedNormal ?? 1.0).toFixed(2);
        const speedSlow = (langData.ttsSpeedSlow ?? 0.24).toFixed(2);
        await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedNormal * 100), id);
        await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedSlow * 100), id);
      }
      closeModal();
      toast(window.phIcon('check') + ' ' + t('vocab_updated'), 'success', true);
      const idx = _vocabWords.findIndex(x => x.id === id);
      if (idx !== -1) { _vocabWords[idx] = { ..._vocabWords[idx], ...body }; renderVocabGrid(); }
    } catch (e) {
      document.getElementById('meErr').textContent = e.error || t('vocab_save_error');
      document.getElementById('meErr').classList.remove('hidden');
    }
    return;
  }

  const literalEl = document.getElementById('meLiteral');
  const newLiteral = literalEl ? literalEl.value.trim() : null;
  if (!newLiteral) {
    document.getElementById('meErr').textContent = t('add_err_word');
    document.getElementById('meErr').classList.remove('hidden');
    return;
  }

  const body = {
    type: selectedType,
    literal: newLiteral,
    translation: document.getElementById('meTranslation').value.trim(),
    definition: document.getElementById('meDefinition')?.value?.trim() || '',
    labels: getSelectedLabels('meLabelPicker-chips')
  };

  if (selectedType === 'verb') {
    body.infinitive = newLiteral;
    const artEl = document.getElementById('meArticle');
    if (artEl) body.article = artEl.value.trim();
    const vgEl = document.getElementById('meVerbGroup');
    if (vgEl) body.verbGroup = vgEl.value;
  }
  if (selectedType === 'noun') {
    const artEl = document.getElementById('meArticle');
    if (artEl) body.article = artEl.value.trim();
  }

  // Collect conjugation edits (tense-keyed format)
  if (selectedType === 'verb') {
    const langDataSaveBase = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
    const langPronounsSave = (window.LANG_PRONOUNS && window.LANG_PRONOUNS[langDataSaveBase.isoCode]) || langDataSaveBase.pronouns || [];
    const langDataSave = langPronounsSave.length ? { ...langDataSaveBase, pronouns: langPronounsSave } : langDataSaveBase;
    const tenses = (langDataSave.tenses && langDataSave.tenses.length) ? langDataSave.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
    const configPronouns = langDataSave.pronouns || [];
    const conj = {};
    tenses.forEach((tense, ti) => {
      const tenseConj = {};
      const pronounsForTense = configPronouns;
      pronounsForTense.forEach(p => {
        const formEl = document.getElementById('meConj_' + ti + '_' + p);
        const trEl = document.getElementById('meCT_' + ti + '_' + p);
        const form = formEl ? formEl.value.trim() : '';
        const tr = trEl ? trEl.value.trim() : '';
        if (form || tr) tenseConj[p] = { form, translation: tr };
      });
      if (Object.keys(tenseConj).length) conj[String(ti)] = tenseConj;
    });
    body.conjugation = conj;
  } else {
    body.conjugation = {};
    body.verbGroup = '';
    body.infinitive = '';
  }

  // Collect declensions
  const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  const declensions = langData.declensions || [];
  if (declensions.length && selectedType !== 'verb') {
    const declObj = {};
    declensions.forEach((d, i) => {
      const val = document.getElementById(`meDecl_${i}`)?.value?.trim();
      if (val) declObj[i] = { nativeName: d.nativeName, targetName: d.targetName, value: val };
    });
    body.declensions = declObj;
  }

  if (!body.translation) {
    document.getElementById('meErr').textContent = t('add_err_word');
    document.getElementById('meErr').classList.remove('hidden');
    return;
  }
  try {
    await api('PUT', `/api/words/${id}?lang=${encodeURIComponent(lang)}`, body);
    if (window.OfflineDB) await OfflineDB.deleteTTS(lang, id);
    if (window.Offline) {
      const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
      const speedNormal = (langData.ttsSpeedNormal ?? 1.0).toFixed(2);
      const speedSlow = (langData.ttsSpeedSlow ?? 0.24).toFixed(2);
      await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedNormal * 100), id);
      await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedSlow * 100), id);
    }
    closeModal();
    toast(window.phIcon('check') + ' ' + t('vocab_updated'), 'success', true);
    const idx = _vocabWords.findIndex(x => x.id === id);
    if (idx !== -1) { _vocabWords[idx] = { ..._vocabWords[idx], ...body }; renderVocabGrid(); }
  } catch (e) {
    document.getElementById('meErr').textContent = e.error || t('vocab_save_error');
    document.getElementById('meErr').classList.remove('hidden');
  }
};


window.confirmResetWordProgress = function (id, lang) {
  openModal(
    t('vocab_reset_confirm_title'),
    `<p>${t('vocab_reset_confirm_body')}</p>`,
    `<button class="btn btn-secondary" onclick="editWord('${id}','${lang}')">${t('vocab_cancel')}</button>
     <button class="btn btn-danger" onclick="resetWordProgress('${id}','${lang}')">${window.phIcon('arrow-counter-clockwise')} ${t('vocab_reset_progress')}</button>`
  );
};

window.resetWordProgress = async function (id, lang) {
  try {
    await api('PUT', `/api/words/${id}?lang=${encodeURIComponent(lang)}`, { progress: 0 });
    closeModal();
    toast(t('vocab_progress_reset'));
    const idx = _vocabWords.findIndex(x => x.id === id);
    if (idx !== -1) { _vocabWords[idx].progress = 0; renderVocabGrid(); }
  } catch (e) { toast(e.error || t('common_error'), 'danger'); }
};

window.deleteWord = async function (id, lang) {
  if (!await confirmModal(t('vocab_delete_word_confirm'), { confirmLabel: t('common_delete') })) return;
  try {
    await api('DELETE', `/api/words/${id}?lang=${encodeURIComponent(lang)}`);
    _vocabWords = _vocabWords.filter(w => w.id !== id);
    renderVocabGrid();
    toast(window.phIcon('trash') + ' ' + t('vocab_deleted'), 'success', true);
  } catch (e) { toast(e.error || t('vocab_delete_error'), 'danger'); }
};

window.editPhrase = function (id, lang) {
  const p = _vocabPhrases.find(x => x.id === id);
  if (!p) return;

  const pType = p.type || 'phrase';

  const langDataBase = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  const langPronouns = (window.LANG_PRONOUNS && window.LANG_PRONOUNS[langDataBase.isoCode]) || langDataBase.pronouns || [];
  const langData = langPronouns.length ? { ...langDataBase, pronouns: langPronouns } : langDataBase;

  _editWordLangData = langData;
  _editWordLangDataBase = langDataBase;
  _editWordState = {
    id: p.id,
    type: pType,
    literal: p.text,
    text: p.text,
    translation: p.translation,
    definition: p.definition || '',
    helpNote: p.helpNote || '',
    article: p.article || '',
    verbGroup: p.verbGroup || '',
    conjugation: JSON.parse(JSON.stringify(p.conjugation || {})),
    declensions: JSON.parse(JSON.stringify(p.declensions || {})),
    infinitive: p.infinitive || '',
    labels: [...(p.labels || [])],
    lang: lang
  };

  openModal(t('vocab_edit_phrase'), `
    <div class="field-group">
      <label>${t('add_type')} <span class="required">*</span></label>
      <select id="meType" onchange="onEditWordTypeChange()" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text)">
        <option value="phrase" ${pType === 'phrase' ? 'selected' : ''}>${window.phIcon('chat-circle')} ${t('vocab_phrase')}</option>
        <option value="noun" ${pType === 'noun' ? 'selected' : ''}>${window.phIcon('package')} ${t('vocab_noun')}</option>
        <option value="verb" ${pType === 'verb' ? 'selected' : ''}>${window.phIcon('lightning')} ${t('vocab_verb')}</option>
        <option value="adjective" ${pType === 'adjective' ? 'selected' : ''}>${window.phIcon('palette')} ${t('vocab_adjective')}</option>
        <option value="adverb" ${pType === 'adverb' ? 'selected' : ''}>${window.phIcon('wind')} ${t('vocab_adverb')}</option>
        <option value="other" ${pType === 'other' ? 'selected' : ''}>${window.phIcon('puzzle-piece')} ${t('vocab_other')}</option>
      </select>
    </div>
    <div id="meTypeFields">
      ${_buildEditWordFields(_editWordState)}
    </div>`,
    `<button class="btn btn-secondary btn-sm btn-reset-progress" style="color:var(--danger);border-color:var(--danger);margin-right:auto" onclick="confirmResetPhraseProgress('${id}','${lang}')">${window.phIcon('arrow-counter-clockwise')}<span class="btn-reset-text"> ${t('vocab_reset_progress')}</span></button>
     <button class="btn btn-secondary" onclick="closeModal()">${t('vocab_cancel')}</button>
     <button class="btn btn-primary" onclick="savePhraseEdit('${id}','${lang}')">${t('vocab_save')}</button>`
  );
};

window.savePhraseEdit = async function (id, lang) {
  const selectedType = document.getElementById('meType').value;

  if (selectedType === 'phrase') {
    const textEl = document.getElementById('meLiteral');
    const newText = textEl ? textEl.value.trim() : '';
    if (!newText) {
      document.getElementById('meErr').textContent = t('add_err_phrase');
      document.getElementById('meErr').classList.remove('hidden');
      return;
    }
    const helpNoteValue = document.getElementById('mePNote')?.value?.trim() || '';
    const body = {
      type: 'phrase',
      text: newText,
      translation: document.getElementById('meTranslation').value.trim(),
      helpNote: helpNoteValue,
      definition: helpNoteValue,
      labels: getSelectedLabels('meLabelPicker-chips')
    };
    if (!body.translation) {
      document.getElementById('meErr').textContent = t('add_err_phrase');
      document.getElementById('meErr').classList.remove('hidden');
      return;
    }
    try {
      await api('PUT', `/api/phrases/${id}?lang=${encodeURIComponent(lang)}`, body);
      if (window.OfflineDB) await OfflineDB.deleteTTS(lang, id);
      if (window.Offline) {
        const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
        const speedNormal = (langData.ttsSpeedNormal ?? 1.0).toFixed(2);
        const speedSlow = (langData.ttsSpeedSlow ?? 0.24).toFixed(2);
        await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedNormal * 100), id);
        await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedSlow * 100), id);
      }
      closeModal();
      toast(window.phIcon('check') + ' ' + t('vocab_phrase_updated'), 'success', true);
      const idx = _vocabPhrases.findIndex(p => p.id === id);
      if (idx !== -1) { _vocabPhrases[idx] = { ..._vocabPhrases[idx], ...body }; renderVocabGrid(); }
    } catch (e) {
      document.getElementById('meErr').textContent = e.error || t('vocab_save_error');
      document.getElementById('meErr').classList.remove('hidden');
    }
    return;
  }

  const literalEl = document.getElementById('meLiteral');
  const newLiteral = literalEl ? literalEl.value.trim() : '';
  if (!newLiteral) {
    document.getElementById('meErr').textContent = t('add_err_word');
    document.getElementById('meErr').classList.remove('hidden');
    return;
  }

  const body = {
    type: selectedType,
    literal: newLiteral,
    text: newLiteral,
    translation: document.getElementById('meTranslation').value.trim(),
    definition: document.getElementById('meDefinition')?.value?.trim() || '',
    labels: getSelectedLabels('meLabelPicker-chips')
  };

  if (selectedType === 'verb') {
    body.infinitive = newLiteral;
    const artEl = document.getElementById('meArticle');
    if (artEl) body.article = artEl.value.trim();
    const vgEl = document.getElementById('meVerbGroup');
    if (vgEl) body.verbGroup = vgEl.value;
  }
  if (selectedType === 'noun') {
    const artEl = document.getElementById('meArticle');
    if (artEl) body.article = artEl.value.trim();
  }

  if (selectedType === 'verb') {
    const langDataSaveBase = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
    const langPronounsSave = (window.LANG_PRONOUNS && window.LANG_PRONOUNS[langDataSaveBase.isoCode]) || langDataSaveBase.pronouns || [];
    const langDataSave = langPronounsSave.length ? { ...langDataSaveBase, pronouns: langPronounsSave } : langDataSaveBase;
    const tenses = (langDataSave.tenses && langDataSave.tenses.length) ? langDataSave.tenses : [{ nativeName: 'Present', targetName: 'Present' }];
    const configPronouns = langDataSave.pronouns || [];
    const conj = {};
    tenses.forEach((tense, ti) => {
      const tenseConj = {};
      const pronounsForTense = configPronouns;
      pronounsForTense.forEach(p => {
        const formEl = document.getElementById('meConj_' + ti + '_' + p);
        const trEl = document.getElementById('meCT_' + ti + '_' + p);
        const form = formEl ? formEl.value.trim() : '';
        const tr = trEl ? trEl.value.trim() : '';
        if (form || tr) tenseConj[p] = { form, translation: tr };
      });
      if (Object.keys(tenseConj).length) conj[String(ti)] = tenseConj;
    });
    body.conjugation = conj;
  }

  const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
  const declensions = langData.declensions || [];
  if (declensions.length && selectedType !== 'verb') {
    const declObj = {};
    declensions.forEach((d, i) => {
      const val = document.getElementById(`meDecl_${i}`)?.value?.trim();
      if (val) declObj[i] = { nativeName: d.nativeName, targetName: d.targetName, value: val };
    });
    body.declensions = declObj;
  }

  if (!body.translation) {
    document.getElementById('meErr').textContent = t('add_err_word');
    document.getElementById('meErr').classList.remove('hidden');
    return;
  }
  try {
    await api('PUT', `/api/phrases/${id}?lang=${encodeURIComponent(lang)}`, body);
    if (window.OfflineDB) await OfflineDB.deleteTTS(lang, id);
    if (window.Offline) {
      const langData = (App.config.targetLangs || []).find(l => l.isoCode === lang) || {};
      const speedNormal = (langData.ttsSpeedNormal ?? 1.0).toFixed(2);
      const speedSlow = (langData.ttsSpeedSlow ?? 0.24).toFixed(2);
      await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedNormal * 100), id);
      await Offline.deleteTtsCacheEntry(lang, 'spd' + Math.round(speedSlow * 100), id);
    }
    closeModal();
    toast(window.phIcon('check') + ' ' + t('vocab_phrase_updated'), 'success', true);
    const idx = _vocabPhrases.findIndex(p => p.id === id);
    if (idx !== -1) { _vocabPhrases[idx] = { ..._vocabPhrases[idx], ...body }; renderVocabGrid(); }
  } catch (e) {
    document.getElementById('meErr').textContent = e.error || t('vocab_save_error');
    document.getElementById('meErr').classList.remove('hidden');
  }
};


window.confirmResetPhraseProgress = function (id, lang) {
  openModal(
    t('vocab_reset_confirm_title'),
    `<p>${t('vocab_reset_confirm_body')}</p>`,
    `<button class="btn btn-secondary" onclick="editPhrase('${id}','${lang}')">${t('vocab_cancel')}</button>
     <button class="btn btn-danger" onclick="resetPhraseProgress('${id}','${lang}')">${window.phIcon('arrow-counter-clockwise')} ${t('vocab_reset_progress')}</button>`
  );
};

window.resetPhraseProgress = async function (id, lang) {
  try {
    await api('PUT', `/api/phrases/${id}?lang=${encodeURIComponent(lang)}`, { progress: 0 });
    closeModal();
    toast(t('vocab_progress_reset'));
    const idx = _vocabPhrases.findIndex(x => x.id === id);
    if (idx !== -1) { _vocabPhrases[idx].progress = 0; renderVocabGrid(); }
  } catch (e) { toast(e.error || t('common_error'), 'danger'); }
};

window.deletePhrase = async function (id, lang) {
  if (!await confirmModal(t('vocab_delete_phrase_confirm'), { confirmLabel: t('common_delete') })) return;
  try {
    await api('DELETE', `/api/phrases/${id}?lang=${encodeURIComponent(lang)}`);
    _vocabPhrases = _vocabPhrases.filter(p => p.id !== id);
    renderVocabGrid();
    toast(window.phIcon('trash') + ' ' + t('vocab_deleted'), 'success', true);
  } catch (e) { toast(e.error || t('vocab_delete_error'), 'danger'); }
};

// ── Duplicates mode ──────────────────────────────────────────────────────────

window.findDuplicates = async function () {
  const lang = currentLang();
  if (!lang) return;
  try {
    const result = await api('POST', '/api/duplicates', { lang });
    const allGroups = (result.words || []).concat(result.phrases || []).concat(result.cross || []);
    if (!allGroups.length) {
      toast(window.phIcon('confetti') + ' ' + t('vocab_dup_none'), 'success', true);
      return;
    }
    _vocabDupGroups = result;
    _vocabDupFieldSel = {};
    _vocabDupLabelSel = {};
    _vocabDupMode = true;

    // Default: pick first item's values for all fields, union all labels
    const allGroupList = [];
    (result.words || []).forEach(g => allGroupList.push({ items: g }));
    (result.phrases || []).forEach(g => allGroupList.push({ items: g }));
    (result.cross || []).forEach(g => allGroupList.push({ items: g }));

    allGroupList.forEach((group, gi) => {
      const key = 'g' + gi;
      const fields = group.items[0];
      _vocabDupFieldSel[key] = {};
      // List of copyable fields (excluding labels, handled separately)
      const selFields = ['type', 'literal', 'translation', 'definition', 'helpNote', 'article', 'infinitive', 'conjugation', 'declensions', 'verbGroup'];
      selFields.forEach(f => {
        _vocabDupFieldSel[key][f] = group.items[0].id;
      });
      // Default labels: union of all labels from all items
      const allLids = new Set();
      group.items.forEach(item => (item.labels || []).forEach(lid => allLids.add(lid)));
      _vocabDupLabelSel[key] = [...allLids];
    });

    // Show duplicate toolbar, hide normal controls
    document.getElementById('dupFindBtn').classList.add('hidden');
    document.querySelectorAll('#vocabFilter .type-btn').forEach(b => b.classList.add('hidden'));
    document.getElementById('vocabSearch').classList.add('hidden');
    document.getElementById('labelFilterRow').classList.add('hidden');
    const tb = document.getElementById('dupToolbar');
    tb.classList.remove('hidden');
    const groupCount = allGroupList.length;
    const itemCount = allGroupList.reduce((s, g) => s + g.items.length, 0);
    document.getElementById('dupCount').textContent = t('vocab_dup_groups').replace('{n}', groupCount) + ' · ' + itemCount + ' ' + t('vocab_dup_items');

    renderDuplicates();

    history.pushState({ page: 'vocabulary' }, '', '#/vocabulary/duplicates');
  } catch (e) {
    toast(e.error || t('common_error'), 'danger');
  }
};

function renderDuplicates() {
  const grid = document.getElementById('vocabGrid');
  const empty = document.getElementById('vocabEmpty');
  if (!grid) return;
  grid.classList.remove('hidden');
  empty.classList.add('hidden');
  grid.innerHTML = '';

  const allGroups = [];
  if (_vocabDupGroups) {
    (_vocabDupGroups.words || []).forEach(g => allGroups.push({ items: g, kind: 'word' }));
    (_vocabDupGroups.phrases || []).forEach(g => allGroups.push({ items: g, kind: 'phrase' }));
    (_vocabDupGroups.cross || []).forEach(g => allGroups.push({ items: g, kind: 'cross' }));
  }
  if (!allGroups.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)"><p style="font-size:2rem">' + window.phIcon('confetti') + '</p><p>' + t('vocab_dup_none') + '</p></div>';
    return;
  }
  allGroups.forEach((group, gi) => {
    const key = 'g' + gi;
    const groupEl = buildDuplicateGroup(group.items, group.kind, key);
    grid.appendChild(groupEl);
  });
}

function dupVal(item, field) {
  if (field === 'literal') return item.literal || item.text || '';
  if (field === 'definition') return item.definition || item.helpNote || '';
  if (field === 'helpNote') return item.helpNote || item.definition || '';
  return item[field] !== undefined ? item[field] : '';
}

function dupDisplayVal(item, field) {
  if (field === 'conjugation') {
    const c = item.conjugation || {};
    const keys = Object.keys(c);
    if (!keys.length) return '\u2014';
    const count = keys.reduce((s, tk) => s + Object.keys(c[tk] || {}).length, 0);
    return count + ' ' + t('vocab_dup_forms');
  }
  if (field === 'declensions') {
    const d = item.declensions || {};
    const keys = Object.keys(d);
    return keys.length ? keys.length + ' ' + t('vocab_dup_cases') : '\u2014';
  }
  if (field === 'type') {
    const typeKeys = { noun: 'vocab_noun', verb: 'vocab_verb', adjective: 'vocab_adjective', adverb: 'vocab_adverb', other: 'vocab_other', phrase: 'vocab_phrase' };
    const tVal = item.type || 'phrase';
    return t(typeKeys[tVal] || tVal);
  }
  const v = dupVal(item, field);
  if (v === undefined || v === null || v === '') return '\u2014';
  if (typeof v === 'object') return JSON.stringify(v).substring(0, 30) + '\u2026';
  return String(v);
}

function dupFieldLabel(field) {
  const labels = {
    type: t('add_type') || 'Type',
    literal: t('vocab_word') || 'Word',
    translation: t('vocab_translation'),
    definition: t('vocab_definition') || 'Definition',
    helpNote: t('vocab_note') || 'Note',
    article: t('vocab_article') || 'Article',
    infinitive: t('add_infinitive_label') || 'Infinitive',
    conjugation: t('add_conjugation') || 'Conjugation',
    declensions: t('add_declensions') || 'Declensions',
    verbGroup: t('add_verb_group') || 'Verb group'
  };
  return labels[field] || field;
}

function buildDuplicateGroup(items, kind, groupKey) {
  const container = document.createElement('div');
  container.className = 'dup-group';
  container.style.cssText = 'margin-bottom:20px;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;background:var(--surface-1)';

  const firstItem = items[0];
  const dupText = firstItem.literal || firstItem.text || '';
  const header = document.createElement('div');
  header.style.cssText = 'font-size:.95rem;font-weight:700;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap';
  header.innerHTML = '<span>' + window.phIcon('repeat') + '</span><span>' + esc(dupText) + '</span><span style="font-size:.78rem;color:var(--text-faint);font-weight:400">(' + items.length + ' ' + t('vocab_dup_items') + ')</span>';
  container.appendChild(header);

  const fields = ['type', 'literal', 'translation', 'definition', 'article', 'conjugation', 'declensions', 'verbGroup'];

  // Helper: check if a field has a meaningful value across items
  function hasContent(items, field) {
    return items.some(item => {
      if (field === 'definition') return !!(item.definition || item.helpNote);
      if (field === 'article') return !!item.article;
      if (field === 'conjugation') return item.conjugation && Object.keys(item.conjugation).length > 0;
      if (field === 'declensions') return item.declensions && Object.keys(item.declensions).length > 0;
      if (field === 'verbGroup') return !!item.verbGroup;
      return true; // type, literal, translation always present
    });
  }

  const isPhraseOnly = items.every(i => i.type === 'phrase' || kind === 'phrase');

  // Only show fields that have content in at least one item
  const visibleFields = fields.filter(f => {
    if (f === 'conjugation' && !items.some(i => i.type === 'verb')) return false;
    if (f === 'declensions' && !items.some(i => i.type !== 'verb' && i.type !== 'phrase' && i.declensions && Object.keys(i.declensions).length)) return false;
    if (f === 'verbGroup' && !items.some(i => i.type === 'verb' && i.verbGroup)) return false;
    return hasContent(items, f);
  });

  const gridWrap = document.createElement('div');
  gridWrap.style.cssText = 'overflow-x:auto;margin-top:8px';
  const gridEl = document.createElement('div');
  gridEl.className = 'dup-grid';
  gridEl.style.cssText = '--dup-cols:' + items.length;

  // Build header row
  const fieldHeader = document.createElement('div');
  fieldHeader.style.cssText = 'font-weight:600;color:var(--text-muted);padding:4px 6px;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px';
  fieldHeader.textContent = t('vocab_dup_field') || 'Field';
  gridEl.appendChild(fieldHeader);

  items.forEach((item, ci) => {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-weight:600;font-size:.75rem;text-align:center;padding:4px 6px;border-radius:6px 6px 0 0';
    const tType = item.type || 'phrase';
    const typeLabels = { noun: t('vocab_noun'), verb: t('vocab_verb'), adjective: t('vocab_adjective'), adverb: t('vocab_adverb'), other: t('vocab_other'), phrase: t('vocab_phrase') };
    const typeKeys = { noun: 'package', verb: 'lightning', adjective: 'palette', adverb: 'wind', other: 'puzzle-piece', phrase: 'chat-circle' };
    const typeIcon = window.phIcon(typeKeys[tType] || 'lego');
    hdr.innerHTML = typeIcon + ' ' + (typeLabels[tType] || tType) + ' <span style="color:var(--text-muted)">#' + (ci + 1) + '</span>';
    gridEl.appendChild(hdr);
  });

  // Rows for each visible field
  visibleFields.forEach(field => {
    const label = document.createElement('div');
    label.style.cssText = 'padding:6px;font-weight:600;color:var(--text-muted);font-size:.78rem;display:flex;align-items:center;border-top:1px solid var(--border)';
    label.textContent = dupFieldLabel(field);
    gridEl.appendChild(label);

    items.forEach(item => {
      if (field === 'definition' && isPhraseOnly) {
        // Show helpNote as definition for phrase items
        const val = item.helpNote || item.definition || '';
        const cell = buildFieldRadioCell(item, field, val, items, groupKey);
        gridEl.appendChild(cell);
        return;
      }
      const val = dupDisplayVal(item, field);
      const cell = buildFieldRadioCell(item, field, val, items, groupKey);
      gridEl.appendChild(cell);
    });
  });

  // Labels row (special: uses checkboxes instead of radio buttons)
  const allLabels = getLabels();
  const allGroupLabelIds = new Set();
  items.forEach(item => (item.labels || []).forEach(lid => allGroupLabelIds.add(lid)));
  const groupLabels = [...allGroupLabelIds].map(lid => allLabels.find(l => l.id === lid)).filter(Boolean);

  if (groupLabels.length) {
    const labelRowLabel = document.createElement('div');
    labelRowLabel.style.cssText = 'padding:6px;font-weight:600;color:var(--text-muted);font-size:.78rem;display:flex;align-items:center;border-top:1px solid var(--border)';
    labelRowLabel.textContent = t('labels_assign') || 'Labels';
    gridEl.appendChild(labelRowLabel);

    // Span all item columns with a label picker
    const labelCell = document.createElement('div');
    labelCell.style.cssText = 'grid-column:2/-1;padding:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center';
    const selectedLids = _vocabDupLabelSel[groupKey] || [];
    groupLabels.forEach(lb => {
      const isChecked = selectedLids.includes(lb.id);
      const chip = document.createElement('span');
      chip.style.cssText = 'font-size:.72rem;padding:2px 9px;border-radius:10px;cursor:pointer;user-select:none;transition:.12s;border:1.5px solid ' + esc(lb.color) + ';background:' + (isChecked ? esc(lb.color) : esc(lb.color) + '20') + ';color:' + (isChecked ? textColorForBg(lb.color) : esc(lb.color));
      chip.textContent = lb.name;
      chip.dataset.lid = lb.id;
      chip.dataset.gk = groupKey;
      chip.onclick = function () {
        const gk = this.dataset.gk;
        const lid = this.dataset.lid;
        if (!_vocabDupLabelSel[gk]) _vocabDupLabelSel[gk] = [];
        const idx = _vocabDupLabelSel[gk].indexOf(lid);
        if (idx === -1) {
          _vocabDupLabelSel[gk].push(lid);
          this.style.background = esc(lb.color);
          this.style.color = textColorForBg(lb.color);
        } else {
          _vocabDupLabelSel[gk].splice(idx, 1);
          this.style.background = esc(lb.color) + '20';
          this.style.color = esc(lb.color);
        }
      };
      labelCell.appendChild(chip);
    });
    gridEl.appendChild(labelCell);
  }

  gridWrap.appendChild(gridEl);
  container.appendChild(gridWrap);

  // Per-group merge button
  const mergeBtn = document.createElement('button');
  mergeBtn.className = 'btn btn-sm btn-primary';
  mergeBtn.style.cssText = 'margin-top:12px';
  mergeBtn.innerHTML = window.phIcon('link') + ' ' + t('vocab_dup_merge_group');
  mergeBtn.onclick = function () { mergeGroup(groupKey, items, kind); };
  container.appendChild(mergeBtn);

  return container;
}

function buildFieldRadioCell(item, field, displayVal, allItems, groupKey) {
  const cell = document.createElement('div');
  const isSelected = _vocabDupFieldSel[groupKey] && _vocabDupFieldSel[groupKey][field] === item.id;
  cell.style.cssText = 'padding:6px 8px;border-radius:6px;border:1.5px solid ' + (isSelected ? 'var(--primary)' : 'transparent') + ';background:' + (isSelected ? 'var(--primary)10' : 'transparent') + ';cursor:pointer;transition:.1s;display:flex;align-items:center;gap:6px';

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'dup_' + groupKey + '_' + field;
  radio.checked = isSelected;
  radio.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--primary);flex-shrink:0';
  radio.dataset.field = field;
  radio.dataset.id = item.id;
  radio.dataset.gk = groupKey;
  radio.onchange = function () {
    if (!this.checked) return;
    const gk = this.dataset.gk;
    const fld = this.dataset.field;
    const id = this.dataset.id;
    if (!_vocabDupFieldSel[gk]) _vocabDupFieldSel[gk] = {};
    _vocabDupFieldSel[gk][fld] = id;
    renderDuplicates();
  };
  cell.appendChild(radio);

  const textSpan = document.createElement('span');
  textSpan.style.cssText = 'font-size:.78rem;word-break:break-word;color:' + (displayVal === '\u2014' ? 'var(--text-faint)' : 'var(--text)');
  textSpan.textContent = displayVal;
  cell.appendChild(textSpan);

  // Click on cell = click radio
  cell.onclick = function (e) {
    if (e.target === radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  };

  return cell;
}

window.mergeGroup = async function (groupKey, items, kind) {
  const lang = currentLang();
  if (!lang) return;

  const fieldMap = _vocabDupFieldSel[groupKey] || {};
  const labels = _vocabDupLabelSel[groupKey] || [];
  const deleteIds = items.map(i => i.id);

  // Determine keepId: the item most frequently selected across fields
  const freq = {};
  items.forEach(i => freq[i.id] = 0);
  Object.values(fieldMap).forEach(id => { if (freq[id] !== undefined) freq[id]++; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const keepId = sorted[0][0];

  if (!await confirmModal(t('vocab_dup_confirm_merge').replace('{n}', deleteIds.length - 1), { confirmLabel: t('vocab_dup_merge'), confirmBtnClass: 'btn-primary' })) return;

  try {
    const result = await api('POST', '/api/duplicates/merge', {
      lang,
      keepId,
      deleteIds,
      kind,
      fieldMap,
      labels
    });
    toast(window.phIcon('link') + ' ' + t('vocab_dup_merged').replace('{n}', result.deleted), 'success', true);
    await refreshDataAndExitDup();
  } catch (e) {
    toast(e.error || t('common_error'), 'danger');
  }
};

window.mergeDuplicates = async function () {
  const lang = currentLang();
  if (!lang) return;

  const allGroups = [];
  if (_vocabDupGroups) {
    (_vocabDupGroups.words || []).forEach(g => allGroups.push({ items: g, kind: 'word' }));
    (_vocabDupGroups.phrases || []).forEach(g => allGroups.push({ items: g, kind: 'phrase' }));
    (_vocabDupGroups.cross || []).forEach(g => allGroups.push({ items: g, kind: 'cross' }));
  }

  let totalDeleted = 0;
  for (let gi = 0; gi < allGroups.length; gi++) {
    const group = allGroups[gi];
    const gk = 'g' + gi;
    const fieldMap = _vocabDupFieldSel[gk] || {};
    const labels = _vocabDupLabelSel[gk] || [];
    const deleteIds = group.items.map(i => i.id);
    const freq = {};
    group.items.forEach(i => freq[i.id] = 0);
    Object.values(fieldMap).forEach(id => { if (freq[id] !== undefined) freq[id]++; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const keepId = sorted[0][0];
    const deleteCount = deleteIds.length - 1;
    if (!deleteCount) continue;

    try {
      const result = await api('POST', '/api/duplicates/merge', {
        lang, keepId, deleteIds, kind: group.kind, fieldMap, labels
      });
      totalDeleted += result.deleted;
    } catch (e) {
      toast(e.error || t('common_error'), 'danger');
    }
  }

  if (totalDeleted) {
    toast(window.phIcon('link') + ' ' + t('vocab_dup_merged').replace('{n}', totalDeleted), 'success', true);
    await refreshDataAndExitDup();
  } else {
    toast(t('vocab_dup_nothing_selected'), 'warning');
  }
};

async function refreshDataAndExitDup() {
  const lang = currentLang();
  try {
    [_vocabWords, _vocabPhrases] = await Promise.all([
      api('GET', '/api/words?lang=' + encodeURIComponent(lang)),
      api('GET', '/api/phrases?lang=' + encodeURIComponent(lang))
    ]);
  } catch {}
  exitDuplicateMode();
}

window.exitDuplicateMode = function () {
  _vocabDupMode = false;
  _vocabDupGroups = null;
  _vocabDupFieldSel = {};
  _vocabDupLabelSel = {};

  document.getElementById('dupFindBtn').classList.remove('hidden');
  document.querySelectorAll('#vocabFilter .type-btn').forEach(b => b.classList.remove('hidden'));
  document.getElementById('vocabSearch').classList.remove('hidden');
  document.getElementById('labelFilterRow').classList.remove('hidden');
  document.getElementById('dupToolbar').classList.add('hidden');

  renderVocabGrid();
  if (window.location.hash === '#/vocabulary/duplicates') {
    history.replaceState({ page: 'vocabulary' }, '', '#/vocabulary');
  }
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Notebook Linking ────────────────────────────────────────────

let _vocabLinkState = null; // { vocabId, vocabType, lang }

function buildNotebookLinksHtml(links, vocabId, vocabType) {
  if (!links || !links.length) return '';
  return '<div class="vocab-notebook-links">' +
    links.map(l =>
      '<span class="vocab-notebook-link" onclick="navigateToNotebookPage(\'' + esc(l.pageId) + '\')" title="' + esc(l.sectionName || '') + ' / ' + esc(l.pageName) + '">' +
      window.phIcon('files') + ' ' + esc(l.pageName) +
      '<span class="vocab-notebook-link-del" onclick="event.stopPropagation();unlinkVocabPage(\'' + esc(vocabId) + '\',\'' + esc(vocabType) + '\',\'' + esc(l.pageId) + '\')">' + window.phIcon('x') + '</span>' +
      '</span>'
    ).join('') +
    '</div>';
}

window.navigateToNotebookPage = function (pageId) {
  const l = window.currentLang();
  window.navigate('notebook', { lang: l, page: pageId });
};

window.vocabLinkWord = function (id, lang) {
  _vocabLinkState = { vocabId: id, vocabType: 'word', lang };
  showVocabLinkPicker();
};

window.vocabLinkPhrase = function (id, lang) {
  _vocabLinkState = { vocabId: id, vocabType: 'phrase', lang };
  showVocabLinkPicker();
};

async function showVocabLinkPicker() {
  const modal = document.getElementById('vocabLinkModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('vocabLinkSearch').value = '';
  document.getElementById('vocabLinkResults').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)"><div class="spinner"></div></div>';

  try {
    const notebook = await window.api('GET', '/api/notebook/' + _vocabLinkState.lang);
    window._vocabLinkNotebook = notebook;
    renderVocabLinkResults();
  } catch {
    document.getElementById('vocabLinkResults').innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger)">' + window.t('common_error') + '</div>';
  }

  document.getElementById('vocabLinkSearch').oninput = renderVocabLinkResults;
}

function renderVocabLinkResults() {
  const el = document.getElementById('vocabLinkResults');
  const q = (document.getElementById('vocabLinkSearch').value || '').toLowerCase().trim();
  const notebook = window._vocabLinkNotebook;
  if (!notebook || !notebook.sections) { el.innerHTML = ''; return; }

  const state = _vocabLinkState;
  if (!state) return;

  // Get linked page IDs for this vocab item
  let linkedPages = [];
  if (state.vocabType === 'word') {
    const w = (_vocabWords || []).find(x => x.id === state.vocabId);
    if (w && w.notebookLinks) linkedPages = w.notebookLinks.map(l => l.pageId);
  } else {
    const p = (_vocabPhrases || []).find(x => x.id === state.vocabId);
    if (p && p.notebookLinks) linkedPages = p.notebookLinks.map(l => l.pageId);
  }

  const allPages = [];
  for (const s of notebook.sections) {
    for (const p of s.pages) {
      if (!q || p.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
        allPages.push({ sectionId: s.id, sectionName: s.name, pageId: p.id, pageName: p.name, linked: linkedPages.includes(p.id) });
      }
    }
  }

  if (!allPages.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">' + window.t('notebook_no_pages_found') + '</div>';
    return;
  }

  el.innerHTML = allPages.map(item => `
    <div class="vocab-link-page-item ${item.linked ? 'linked' : ''}" data-page-id="${item.pageId}">
      <span class="vocab-link-page-check">${item.linked ? window.phIcon('check-simple') : ''}</span>
      <span class="vocab-link-page-section">${esc(item.sectionName)}</span>
      <span class="vocab-link-page-name">${esc(item.pageName)}</span>
    </div>
  `).join('');

  el.querySelectorAll('.vocab-link-page-item').forEach(item => {
    item.addEventListener('click', () => toggleVocabLink(item.dataset.pageId));
  });
}

async function toggleVocabLink(pageId) {
  const state = _vocabLinkState;
  if (!state) return;

  let isLinked = false;
  if (state.vocabType === 'word') {
    const w = (_vocabWords || []).find(x => x.id === state.vocabId);
    if (w && w.notebookLinks) isLinked = w.notebookLinks.some(l => l.pageId === pageId);
  } else {
    const p = (_vocabPhrases || []).find(x => x.id === state.vocabId);
    if (p && p.notebookLinks) isLinked = p.notebookLinks.some(l => l.pageId === pageId);
  }

  try {
    if (isLinked) {
      await window.api('DELETE', '/api/vocab-link', { lang: state.lang, vocabId: state.vocabId, vocabType: state.vocabType, pageId });
    } else {
      await window.api('POST', '/api/vocab-link', { lang: state.lang, vocabId: state.vocabId, vocabType: state.vocabType, pageId });
    }

    // Refresh data
    const lang = currentLang();
    const [newWords, newPhrases] = await Promise.all([
      window.api('GET', '/api/words?lang=' + encodeURIComponent(lang)),
      window.api('GET', '/api/phrases?lang=' + encodeURIComponent(lang))
    ]);
    _vocabWords = newWords;
    _vocabPhrases = newPhrases;

    renderVocabGrid();
    renderVocabLinkResults();
    window.toast(isLinked ? window.t('vocab_link_removed') : window.t('vocab_link_added'));
  } catch (e) {
    window.toast(e.error || window.t('common_error'), 'danger');
  }
}

window.unlinkVocabPage = async function (vocabId, vocabType, pageId) {
  const lang = currentLang();
  try {
    await window.api('DELETE', '/api/vocab-link', { lang, vocabId, vocabType, pageId });
    const [newWords, newPhrases] = await Promise.all([
      window.api('GET', '/api/words?lang=' + encodeURIComponent(lang)),
      window.api('GET', '/api/phrases?lang=' + encodeURIComponent(lang))
    ]);
    _vocabWords = newWords;
    _vocabPhrases = newPhrases;
    renderVocabGrid();
    window.toast(window.t('vocab_link_removed'));
  } catch (e) {
    window.toast(e.error || window.t('common_error'), 'danger');
  }
};
