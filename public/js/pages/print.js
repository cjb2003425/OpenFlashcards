'use strict';

let _printQuizIds = [];

async function renderPrintQuiz(el) {
  const lang = currentLang();
  if (!lang) {
    el.innerHTML = '<div class="empty-state"><p>请先在设置中选择学习语言。</p></div>';
    return;
  }
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>正在生成测验纸…</p></div>';
  try {
    const data = await api('GET', '/api/print-quiz?lang=' + encodeURIComponent(lang) + '&count=30');
    _printQuizIds = data.items.map(item => item.id);
    el.innerHTML = `
      <div class="print-toolbar">
        <div>
          <div class="page-title">🖨️ A4 单词测验</div>
          <p class="print-summary">本次 ${data.items.length} 词 · 未打印 ${data.remaining} 词 · 已打印 ${data.printed} 词</p>
        </div>
        <div class="print-actions">
          <button class="btn btn-secondary" onclick="resetPrintHistory()">重置打印标记</button>
          <button class="btn btn-primary" ${data.items.length ? '' : 'disabled'} onclick="printCurrentQuiz()">打印这一组</button>
        </div>
      </div>
      ${data.items.length ? buildPrintSheet(data.items) : `
        <div class="card empty-state">
          <h2>没有待打印单词</h2>
          <p>所有单词都已打印过。可以重置标记后重新生成。</p>
        </div>`}`;
  } catch (err) {
    el.innerHTML = '<div class="alert alert-danger">' + esc(err.error || '测验纸生成失败') + '</div>';
  }
}

function buildPrintSheet(items) {
  const rows = items.map((item, index) => `
    <div class="print-question">
      <span class="print-number">${index + 1}.</span>
      <span class="print-meaning">${esc(item.translation)}</span>
      <span class="print-answer-line"></span>
    </div>`).join('');
  return `
    <section class="quiz-sheet" id="quizSheet">
      <header class="quiz-sheet-header">
        <h1>英语单词测验</h1>
        <div>姓名：<span class="meta-line"></span> 日期：<span class="meta-line"></span> 得分：<span class="meta-line short"></span></div>
      </header>
      <p class="quiz-instruction">请根据中文释义写出对应的英文单词。</p>
      <div class="print-question-grid">${rows}</div>
    </section>`;
}

window.printCurrentQuiz = async function () {
  if (!_printQuizIds.length) return;
  const button = document.querySelector('.print-actions .btn-primary');
  if (button) button.disabled = true;
  try {
    await api('POST', '/api/print-quiz/mark', { lang: currentLang(), ids: _printQuizIds });
    window.print();
  } catch (err) {
    alert(err.error || '标记打印状态失败');
    if (button) button.disabled = false;
  }
};

window.resetPrintHistory = async function () {
  if (!confirm('确定要清除全部“已打印”标记吗？')) return;
  try {
    await api('POST', '/api/print-quiz/reset', { lang: currentLang() });
    renderPrintQuiz(document.getElementById('pageContent'));
  } catch (err) {
    alert(err.error || '重置失败');
  }
};
