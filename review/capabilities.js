(() => {
  'use strict';
  const $ = id => document.getElementById(id), app = window.DataLensApp;
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'capabilities.css'; document.head.append(style);
  const entry = document.createElement('button'); entry.id = 'openCapabilities'; entry.textContent = '产品能力';
  document.querySelector('.head-actions').prepend(entry);
  const dialog = document.createElement('dialog'); dialog.id = 'capabilityDialog'; dialog.setAttribute('aria-labelledby', 'capabilityTitle');
  dialog.innerHTML = `
    <div class="capability-head"><div><span>DATALENS / CAPABILITY WORKBENCH</span><h2 id="capabilityTitle">可解释的时序分析工作台</h2></div><button id="closeCapabilities" aria-label="关闭产品能力">×</button></div>
    <p class="capability-intro">从 CSV 到连续片段，再到可追溯的结果。查看当前数据的处理链路，改变参数，验证分析结果如何产生。</p>
    <div class="capability-tabs" role="tablist" aria-label="产品能力视图">
      <button id="cap-tab-engine" role="tab" aria-selected="true" aria-controls="cap-engine" data-cap="engine">数据与分析引擎</button>
      <button id="cap-tab-lab" role="tab" aria-selected="false" aria-controls="cap-lab" data-cap="lab">参数试算</button>
      <button id="cap-tab-agent" role="tab" aria-selected="false" aria-controls="cap-agent" data-cap="agent">Agent 与架构</button>
    </div>
    <p id="capStale" role="status" hidden>当前数据或条件已修改。请先运行分析，再查看能力演示。</p>
    <section id="cap-engine" role="tabpanel" aria-labelledby="cap-tab-engine">
      <h3>当前数据的处理链路</h3><p id="capDataset"></p><ol id="enginePipeline" class="engine-pipeline"></ol>
      <div class="cap-facts"><h3>结果如何保持可核查</h3><dl>
        <dt>上下限语义</dt><dd>同一引擎支持排放上限与纯度下限；等于约束线不计越界。</dd>
        <dt>时间处理</dt><dd>按时间排序，以相邻样本左值保持累计时长；不跨缺失或大间隔累计，末点不外推。</dd>
        <dt>证据关联</dt><dd>片段保留原始行号。趋势、游标、记录与助手引用关联同一数据快照。</dd>
        <dt>失效处理</dt><dd>数据或口径修改后，暂停旧结果导出、清空旧对话，避免混用依据。</dd>
      </dl></div><div class="cap-buttons"><button id="capOpenData">查看数据明细</button><button id="capOpenConditions">查看字段与判定条件</button></div>
    </section>
    <section id="cap-lab" role="tabpanel" aria-labelledby="cap-tab-lab" hidden>
      <h3>改变一个参数，观察分析结果</h3><p>比较原约束线与试算约束线。在当前数据上实际重算，不覆盖复盘记录。</p>
      <form id="labForm"><label id="labLimitLabel" for="labLimit">试算约束线</label><input id="labLimit" type="number" step="any" required><button class="primary" type="submit">运行试算</button><button id="labReset" type="button">恢复原值</button></form>
      <p id="labError" role="alert" hidden></p><div id="labOutput" hidden><table><thead><tr><th>比较项</th><th>当前口径</th><th>试算口径</th><th>变化</th></tr></thead><tbody id="labComparison"></tbody></table><p id="labConclusion" role="status"></p></div>
      <p class="cap-boundary">规则敏感性分析：改变约束线会改变检出结果，不代表工况改善，也不证明生产约束可以调整。</p>
    </section>
    <section id="cap-agent" role="tabpanel" aria-labelledby="cap-tab-agent" hidden>
      <h3>确定性计算 + 模型工具调用</h3><ol class="architecture">
        <li><strong>浏览器</strong><span>CSV 解析、字段映射、时序计算、趋势与证据交互</span></li>
        <li><strong>本地 Node.js 服务</strong><span>重新计算数据，运行只读分析工具，校验引用</span></li>
        <li><strong>配置的模型服务</strong><span>根据任务选择工具，读取反馈，再决定下一步</span></li>
      </ol><p>规则示例仅在浏览器运行。实时 Agent 启用后，问题、对话和工具读取的数据会发送至配置的模型服务。</p>
      <details class="cap-toolkit"><summary>5 个工具与调用边界</summary><dl>
        <dt>inspect_dataset</dt><dd>数据质量、字段与口径</dd><dt>list_events</dt><dd>片段索引、时间与类型</dd><dt>inspect_event</dt><dd>片段统计与原始记录</dd><dt>compare_event_windows</dt><dd>前后样本的描述性对比</dd><dt>build_report</dt><dd>根据已读取证据整理报告</dd>
      </dl><p>最多 6 轮模型请求、16 次工具调用。未检查数据或引用本轮未读取的片段时拦截回答。工具不控制设备，密钥不写磁盘或日志。</p></details>
      <h3>最近一次执行记录</h3><p id="capAgentMode">尚未运行。不会以预设流程冒充执行记录。</p><ol id="capAgentTrace"></ol>
      <div class="cap-buttons"><button id="capRunDemo">运行本地规则示例</button><button id="capOpenAgent">打开 Agent 配置</button></div>
      <p class="cap-boundary">已实现：确定性引擎、工具循环、引用校验。待验证：真实模型效果、用户效率增益。模拟模型测试不等于真实模型验证。</p>
    </section>`;
  document.body.append(dialog);
  let baseline;
  function clearLab() { $('labOutput').hidden = true; $('labError').hidden = true; }
  function refresh() {
    clearLab(); const ready = app.isReady(); $('capStale').hidden = ready;
    $('labLimit').disabled = $('labReset').disabled = $('capRunDemo').disabled = !ready;
    $('labForm').querySelector('[type=submit]').disabled = !ready;
    $('enginePipeline').replaceChildren(); $('capDataset').textContent = '';
    if (!ready) { baseline = undefined; return; }
    baseline = app.snapshot(); const r = baseline.result;
    $('capDataset').textContent = baseline.dataset;
    $('labLimit').value = baseline.settings.limit;
    $('labLimitLabel').textContent = `试算${baseline.settings.direction === 'upper' ? '上限' : '下限'}`;
    const rows = [
      ['01 / 导入与映射', `${r.total} 条原始记录 · ${baseline.table.headers.length} 列`, '支持 UTF-8 CSV、引号字段和列映射；最多 5 MB / 20,000 条。'],
      ['02 / 校验与排序', `${r.data.length} 条有效 · 无效 ${r.invalid.length} · 重复 ${r.duplicates.length}`, `无效逻辑行：${r.invalid.slice(0,30).join(', ') || '无'}；重复行：${r.duplicates.slice(0,30).join(', ') || '无'}。行号最多展示 30 个。`],
      ['03 / 连续性检查', `代表间隔 ${r.intervalMinutes} 分钟 · 间断 ${r.gaps} 处`, `时间跨度 ${r.durationMinutes} 分钟，可累计观察 ${r.observedMinutes.toFixed(1)} 分钟；发现 ${r.reordered} 次时间倒序。`],
      ['04 / 分类与聚合', `${r.events.length} 个连续片段 · 越界 ${r.riskPoints} 点`, `${r.events.filter(e=>e.kind==='risk').length} 个越界片段，${r.events.filter(e=>e.kind==='review').length} 个裕量复核片段；片段类型变化或时间间断时分段。`],
      ['05 / 证据与导出', '片段 ID → 时间 → 原始行', '输出口径、记录、人工补充与助手执行记录；数值由确定性函数计算。']
    ];
    rows.forEach(([title, value, note]) => { const li = document.createElement('li'); const a = document.createElement('strong'), b = document.createElement('span'), c = document.createElement('small'); a.textContent = title; b.textContent = value; c.textContent = note; li.append(a,b,c); $('enginePipeline').append(li); });
  }
  function runTrial() {
    if (!baseline || !app.isReady()) return;
    clearLab();
    try {
      if (!$('labLimit').value.trim()) throw Error('请填写试算约束线。');
      const limit = Number($('labLimit').value);
      const trial = DataLensReview.analyze(baseline.table, baseline.mapping, { ...baseline.settings, limit });
      const original = baseline.result;
      const riskEvents = r => r.events.filter(e=>e.kind==='risk').length;
      const riskMinutes = r => r.events.filter(e=>e.kind==='risk').reduce((n,e)=>n+e.minutes,0);
      const comparisons = [['约束线', baseline.settings.limit, limit], ['越界采样点', original.riskPoints, trial.riskPoints], ['越界连续片段', riskEvents(original), riskEvents(trial)], ['越界估计时长 / min', riskMinutes(original), riskMinutes(trial)], ['裕量复核采样点', original.reviewPoints, trial.reviewPoints]];
      $('labComparison').replaceChildren();
      comparisons.forEach(([name,before,after]) => { const row = document.createElement('tr'); const diff = +(after-before).toFixed(3); [name, before, after, diff > 0 ? '+'+diff : diff].forEach(value => { const td=document.createElement('td'); td.textContent=typeof value==='number' ? String(+value.toFixed(3)) : value; row.append(td); }); $('labComparison').append(row); });
      $('labConclusion').textContent = `同一份 ${original.data.length} 条有效记录：越界点 ${original.riskPoints} → ${trial.riskPoints}。仅试算约束线发生变化，当前复盘口径未修改。`;
      $('labOutput').hidden = false;
    } catch(error) { $('labError').textContent = error.message; $('labError').hidden = false; }
  }
  entry.onclick = () => { refresh(); dialog.showModal(); };
  $('closeCapabilities').onclick = () => dialog.close();
  document.querySelectorAll('[data-cap]').forEach(button => { button.onclick = () => { document.querySelectorAll('[data-cap]').forEach(b=>b.setAttribute('aria-selected',String(b===button))); ['engine','lab','agent'].forEach(id=>{ $('cap-'+id).hidden = id!==button.dataset.cap; }); }; });
  $('labForm').onsubmit = e => { e.preventDefault(); runTrial(); };
  $('labLimit').oninput = clearLab;
  $('labReset').onclick = () => { if (baseline) { $('labLimit').value = baseline.settings.limit; runTrial(); } };
  $('capOpenData').onclick = () => { dialog.close(); $('tab-data').click(); $('results').scrollIntoView({block:'start'}); };
  $('capOpenConditions').onclick = () => { dialog.close(); $('dataSettings').open = true; $('dataSettings').scrollIntoView({block:'start'}); };
  $('capOpenAgent').onclick = () => { dialog.close(); $('openAgent').click(); $('experienceMode').value='live'; $('experienceMode').dispatchEvent(new Event('change')); $('configureModel').click(); };
  $('capRunDemo').onclick = async () => { $('experienceMode').value='demo'; $('experienceMode').dispatchEvent(new Event('change')); await window.DataLensAssistant.scan(); };
  window.addEventListener('datalens:assistant-reset', () => { $('capAgentTrace').replaceChildren(); $('capAgentMode').textContent='执行记录已清空，请基于当前数据重新运行。'; });
  window.addEventListener('datalens:assistant-result', e => {
    const { mode, model, trace }=e.detail;
    $('capAgentMode').textContent=mode==='live' ? `实时 Agent / ${model} · ${trace.length} 次实际工具调用` : `本地规则示例 · ${trace.length} 个执行步骤 · 未调用模型`;
    $('capAgentTrace').replaceChildren();
    trace.forEach(t=>{const li=document.createElement('li'), strong=document.createElement('strong'), note=document.createElement('span');strong.textContent=t.tool;note.textContent=`${JSON.stringify(t.args)} → ${t.summary}`;li.append(strong,note);$('capAgentTrace').append(li);});
  });
  window.addEventListener('datalens:change',refresh); window.addEventListener('datalens:ready',refresh);
})();
