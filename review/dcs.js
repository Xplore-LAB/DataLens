(() => {
  const $ = id => document.getElementById(id), app = window.DataLensApp;
  let state, index = 0;
  const format = value => Number(value).toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false });
  function display() {
    if (!state?.result) return;
    const p = state.result.data[Math.min(index, state.result.data.length - 1)];
    $('dcsTime').textContent = p.label.slice(11); $('dcsDate').textContent = `${p.label.slice(0,10)} · 原始行 ${p.row}`;
    $('dcsPV').textContent = format(p.value); $('dcsCV').textContent = format(p.control);
    $('dcsPVState').textContent = p.kind === 'risk' ? '▲ 超出设定约束' : p.kind === 'review' ? '◇ 裕量复核线索' : '当前点未命中规则';
    $('dcsPVBox').classList.toggle('outside-limit', p.kind === 'risk');
  }
  function refresh() {
    state = app.snapshot();
    $('dcsDataset').textContent = state.dataset;
    $('consoleDataState').textContent = state.example ? '示例数据 / 未经生产验证' : '导入数据 / 本地文件';
    $('dcsPVTag').textContent = `${state.table.headers[state.mapping.value]} / 源列 ${state.mapping.value + 1}`;
    $('dcsCVTag').textContent = `${state.table.headers[state.mapping.control]} / 源列 ${state.mapping.control + 1}`;
    $('dcsLimit').textContent = format(state.settings.limit);
    $('dcsConstraint').textContent = `${state.settings.direction === 'upper' ? '上限' : '下限'} · 关注线 ${state.settings.trigger}`;
    $('dcsSummary').textContent = `有效 ${state.result.data.length} 条 | 越界 ${state.result.riskPoints} 点 | 待核查 ${state.result.events.length} 段`;
    $('dcsUnitNote').textContent = '位号、单位未单独配置；沿用源列名称';
    $('dcsSummary').classList.toggle('has-breach', state.result.riskPoints > 0);
    display();
  }
  window.addEventListener('datalens:ready', () => { index = 0; document.querySelector('.dcs-overview').classList.remove('pending'); refresh(); });
  window.addEventListener('datalens:change', () => { document.querySelector('.dcs-overview').classList.add('pending'); $('dcsSummary').textContent = '数据或条件已修改 · 等待重新分析'; });
  window.addEventListener('datalens:chart', refresh);
  window.addEventListener('datalens:cursor', event => { index = event.detail; if (app.isReady()) display(); });
  $('openAgent').onclick = () => {
    $('analysisWorkspace').hidden = false; $('welcome').hidden = true;
    const panel = document.querySelector('.assistant'); panel.hidden = false;
    panel.scrollIntoView({ behavior: 'auto', block: 'start' }); $('agentQuestion').focus();
  };
  window.addEventListener('datalens:change', () => { $('consolePending').textContent = '条件已修改 / 等待重新分析'; });
  window.addEventListener('datalens:ready', () => { $('consolePending').textContent = '记录保存在当前页面'; });
  refresh();
  $('startDemo').click();
  window.scrollTo({ top: 0, behavior: 'instant' });
})();
