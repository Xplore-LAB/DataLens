(() => {
  'use strict';
  const el = id => document.getElementById(id), app = window.DataLensApp;
  let connection, status = { available: false, configured: false }, busy = false;
  let epoch = 0, controller, turns = [], lastEventId;
  const mode = () => el('experienceMode').value;
  const controls = () => {
    const live = mode() === 'live', ready = app.isReady();
    el('askButton').disabled = busy || !ready || (live && (!status.available || !(connection || status.configured)));
    el('askButton').textContent = busy ? '正在分析…' : live ? '发送给 Agent' : '运行示例检查';
    el('agentQuestion').disabled = busy || !ready;
    el('cancelAgent').hidden = !busy;
    document.querySelectorAll('[data-question]').forEach(b => { b.disabled = busy || !ready || el('askButton').disabled; });
    el('taskHint').textContent = !ready ? '请展开条件，确认字段与阈值后运行分析。' : busy ? '正在执行；完成后显示实际工具记录。' : live ? '发送后由模型选择并调用分析工具。' : '规则示例支持下方三个追问；自由提问需连接模型。';
    el('agentStatus').classList.toggle('live', live);
    el('agentStatus').textContent = live
      ? !status.available ? '本页未连接本地 Agent 服务。请运行 node server/server.cjs，再打开 http://127.0.0.1:8767/review/。'
        : !(connection || status.configured) ? '实时 Agent 尚未连接模型。点击「连接模型」填写服务地址、模型名称和密钥。'
          : `已配置 ${connection?.model || status.model}，待实际请求验证。任务、对话和工具读取的数据将发送至${connection ? new URL(connection.baseUrl).host : '本地服务配置的模型提供商'}；可能产生调用费用。`
      : '免配置示例：本地规则读取当前数据并展示证据，不调用模型。实时 Agent 会由模型自主选择工具，并根据结果继续分析。';
  };
  function reset() {
    epoch++; controller?.abort(); controller = undefined; busy = false; turns = []; lastEventId = undefined;
    el('assistantFeed').replaceChildren(); el('agentError').hidden = true; controls();
    window.dispatchEvent(new Event('datalens:assistant-reset'));
  }
  function showWorkspace() {
    el('welcome').hidden = true; el('analysisWorkspace').hidden = false;
    el('helpStart').hidden = false; el('export').hidden = false; el('welcomeContinue').hidden = false;
    controls();
  }
  function renderAnswer(container, text, allowed) {
    const parts = String(text).split(/(\[E\d+\])/g);
    for (const part of parts) {
      const id = part.slice(1, -1);
      if (/^\[E\d+\]$/.test(part) && allowed.has(id)) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'evidence-link';
        button.textContent = `${id} ↗`; button.title = '查看曲线与原始记录';
        button.onclick = () => { lastEventId = id; app.selectEvent(id); };
        container.append(button);
      } else container.append(document.createTextNode(part));
    }
  }
  function download(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'DataLens-复盘摘要.md'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function showTurn(question, response) {
    const article = document.createElement('article'); article.className = 'turn';
    const title = document.createElement('p'); title.className = 'turn-question'; title.textContent = question;
    const provenance = document.createElement('div'); provenance.className = 'turn-provenance';
    provenance.textContent = response.mode === 'live' ? `实时 Agent · ${response.model} · ${response.trace.length} 次已执行工具调用` : '示例讲解 · 本地规则运行 · 未调用模型';
    const answer = document.createElement('div'); answer.className = 'turn-answer';
    const valid = new Set(app.snapshot().result.events.map(e => e.id));
    const allowed = new Set(response.eventIds.filter(id => valid.has(id)));
    renderAnswer(answer, response.answer, allowed); article.append(title, provenance, answer);
    if (response.trace.length) {
      const details = document.createElement('details'); details.className = 'tool-trace';
      const summary = document.createElement('summary'); summary.textContent = `${response.mode === 'live' ? 'Agent 工具执行记录' : '本地规则执行记录'} · ${response.trace.length} 步`;
      const list = document.createElement('ol');
      response.trace.forEach(item => {
        const li = document.createElement('li'), label = document.createElement('strong'), note = document.createElement('small');
        label.textContent = item.label; note.textContent = `${item.tool}(${JSON.stringify(item.args)})\n${item.summary}`;
        li.append(label, note); list.append(li);
      });
      details.append(summary, list); article.append(details);
    }
    if (response.report) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'report-download'; button.textContent = '下载复盘摘要 ↓';
      button.onclick = () => download(response.report); article.append(button);
    }
    el('assistantFeed').append(article); el('assistantFeed').scrollTop = el('assistantFeed').scrollHeight;
  }
  async function ask(question, followup = false) {
    if (busy || !app.isReady() || !question.trim()) return;
    if (mode() === 'live' && (!status.available || !(connection || status.configured))) { controls(); return; }
    const token = epoch, currentMode = mode(), snapshot = app.snapshot();
    const context = { table: snapshot.table, mapping: snapshot.mapping, settings: snapshot.settings, dataset: snapshot.dataset };
    const selected = followup ? lastEventId || snapshot.selectedEventId : undefined;
    busy = true; controller = new AbortController(); el('agentError').hidden = true; controls();
    try {
      let response;
      if (currentMode === 'demo') response = window.DataLensDemo.explain(context, question, selected);
      else {
        const history = turns.flatMap(t => [{ role: 'user', content: t.question.slice(0, 8000) }, { role: 'assistant', content: t.response.answer.slice(0, 8000) }]).slice(-8);
        const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ message: selected ? `${question}\n当前选中的片段：${selected}，请重新读取其证据。` : question, history, context, ...(connection ? { connection } : {}) }) });
        response = await res.json(); if (!res.ok) throw Error(response.error || '分析失败，请检查模型连接。');
      }
      if (token !== epoch) return;
      turns.push({ question, response }); lastEventId = response.eventIds[0] || lastEventId;
      showTurn(question, response); el('agentQuestion').value = '';
      window.dispatchEvent(new CustomEvent('datalens:assistant-result', { detail: { mode: response.mode, model: response.model, trace: response.trace } }));
    } catch (error) {
      if (token !== epoch) return;
      el('agentError').textContent = error.name === 'AbortError' ? '已停止本次分析，未生成新结论。' : error.message === 'Failed to fetch' ? '无法连接本地服务，请确认服务仍在运行。' : error.message;
      el('agentError').hidden = false;
    } finally { if (token === epoch) { busy = false; controller = undefined; controls(); } }
  }
  el('startDemo').onclick = () => {
    if (app.sample('emission') === false) return; el('experienceMode').value = 'demo'; reset(); showWorkspace(); el('dataSettings').open = false;
    window.dispatchEvent(new Event('datalens:investigate'));
  };
  el('startUpload').onclick = () => { showWorkspace(); el('dataSettings').open = true; el('file').click(); };
  el('helpStart').onclick = () => { el('welcome').hidden = false; el('analysisWorkspace').hidden = true; el('export').hidden = true; };
  el('welcomeContinue').onclick = showWorkspace;
  el('agentForm').onsubmit = event => { event.preventDefault(); ask(el('agentQuestion').value, turns.length > 0); };
  document.querySelectorAll('[data-question]').forEach(button => { button.onclick = () => ask(button.dataset.question, true); });
  el('cancelAgent').onclick = () => controller?.abort();
  el('experienceMode').onchange = reset;
  el('configureModel').onclick = () => { el('modelError').hidden = true; el('modelDialog').showModal(); };
  el('closeModel').onclick = () => el('modelDialog').close();
  el('modelForm').onsubmit = event => {
    event.preventDefault();
    try {
      const baseUrl = el('modelUrl').value.trim(), model = el('modelName').value.trim(), apiKey = el('modelKey').value.trim();
      const url = new URL(baseUrl), local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (!(url.protocol === 'https:' || url.protocol === 'http:' && local) || url.username || url.password || url.search || url.hash) throw Error('请输入 HTTPS 服务地址或本机 HTTP 地址，地址中不能包含密钥、查询参数或片段。');
      if (!model) throw Error('请填写模型名称。');
      connection = { baseUrl, model, apiKey }; el('modelKey').value = ''; el('experienceMode').value = 'live'; reset(); el('modelDialog').close();
    } catch (error) { el('modelError').textContent = error.message; el('modelError').hidden = false; }
  };
  el('clearModel').onclick = () => { connection = undefined; el('modelForm').reset(); el('experienceMode').value = 'demo'; reset(); el('modelDialog').close(); };
  window.addEventListener('datalens:selected', e => { lastEventId = e.detail; });
  window.addEventListener('datalens:change', reset);
  window.addEventListener('datalens:ready', () => { reset(); el('settingsCaption').textContent = app.snapshot().example ? '示例已配置，可展开修改' : '已按当前字段与阈值计算'; });
  window.addEventListener('datalens:imported', () => { showWorkspace(); el('dataSettings').open = true; el('settingsCaption').textContent = '请确认字段与阈值，再运行分析'; });
  window.DataLensAssistant = {
    askAbout: id => { lastEventId = id; return ask('为什么要关注这个时段？请对比前后记录。', true); },
    scan: () => ask('检查这段数据，告诉我应该先核查哪个时段。'),
    exportText: () => turns.length ? '\n## 复盘助手记录\n\n' + turns.map(t => `### ${t.question}\n\n模式：${t.response.mode === 'live' ? '实时 Agent / ' + t.response.model : '规则示例 / 未调用模型'}\n\n${t.response.answer}\n\n执行记录：\n${t.response.trace.map(x => '- ' + x.label + '：' + x.summary).join('\n')}`).join('\n\n') : ''
  };
  controls();
  fetch('/api/status').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(s => { status = s; controls(); }).catch(() => controls());
})();
