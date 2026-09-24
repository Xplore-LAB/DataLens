'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let table, result, current, settings, mapping, dataset = '', example = true, notes = {};
function definition() {
  $('definition').textContent = $('direction').value === 'upper'
    ? '上限场景：指标高于约束线记为越界；指标低于关注线且控制量活跃记为复核线索。'
    : '下限场景：指标低于约束线记为越界；指标高于关注线且控制量活跃记为复核线索。';
}
function stale() {
  definition(); $('dirty').hidden = false; $('results').classList.add('stale'); $('export').disabled = true;
  window.dispatchEvent(new Event('datalens:change'));
}
function load(text, name, isExample) {
  const parsed = DataLensReview.parseCSV(text);
  table = parsed; dataset = name; example = isExample; notes = {}; current = null;
  ['time', 'value', 'control'].forEach((id, n) => {
    $(id).replaceChildren(...table.headers.map((h, i) => new Option(h, i))); $(id).value = n;
  });
  $('sourceName').textContent = dataset;
  $('sourceBadge').textContent = example ? '仓库示例 · 非生产验证' : '用户导入 · 本地处理';
  $('sourceDetail').textContent = example ? '未验证真实工况与经济收益' : '阈值和字段仍需人工确认';
  $('error').hidden = true; stale();
}
function sample(kind) {
  if (Object.values(notes).some(n => n.note || n.status !== '待复核') && !confirm('切换数据会清空本次复核记录。请确认已导出需要保留的内容。')) return false;
  const air = kind === 'air';
  $('direction').value = air ? 'lower' : 'upper';
  $('limit').value = air ? 99.5 : 50; $('trigger').value = air ? 99.6 : 40; $('active').value = air ? 0.5 : 2;
  $('emission').classList.toggle('selected', !air); $('air').classList.toggle('selected', air);
  load(DataLensExamples[kind], air ? '空分氧纯度 · 11 条模拟记录' : '脱硝运行 · 仓库示例', true); run(); return true;
}
function run() {
  try {
    const config = { direction: $('direction').value, limit: +$('limit').value, trigger: +$('trigger').value, active: +$('active').value };
    if (['limit', 'trigger', 'active'].some(id => $(id).value.trim() === '')) throw Error('请填写所有阈值。');
    const map = Object.fromEntries(['time', 'value', 'control'].map(id => [id, +$(id).value]));
    const next = DataLensReview.analyze(table, map, config);
    if (result && JSON.stringify({ config, map }) !== JSON.stringify({ config: settings, map: mapping })) {
      if (Object.values(notes).some(n => n.note || n.status !== '待复核') && !confirm('重新分析将清空旧口径下的复核记录。取消后可恢复原口径并导出，是否继续？')) return;
      notes = {};
    }
    result = next; settings = config; mapping = map; current = result.events.find(e => e.kind === 'risk') || result.events[0];
    $('dirty').hidden = true; $('error').hidden = true; $('results').classList.remove('stale'); $('export').disabled = false;
    render();
    window.dispatchEvent(new Event('datalens:ready'));
  } catch (e) { $('error').textContent = e.message; $('error').hidden = false; stale(); }
}
function render() {
  $('valid').textContent = `${result.data.length} / ${result.total}`;
  $('quality').textContent = `无效 ${result.invalid.length} · 重复 ${result.duplicates.length} · 间断 ${result.gaps}`;
  $('risk').textContent = result.riskPoints;
  $('review').textContent = result.events.filter(e => e.kind === 'review').length;
  $('duration').textContent = `${result.durationMinutes.toFixed(0)} 分钟`;
  $('coverage').textContent = `可累计观察时长 ${result.observedMinutes.toFixed(1)} 分钟`;
  $('start').textContent = result.data[0].label; $('end').textContent = result.data.at(-1).label;
  $('chartLegend').textContent = `${table.headers[mapping.value]}`;
  $('caseCount').textContent = `${result.events.length} 个片段 · 越界优先`;
  $('trace').innerHTML = `<p>① 检查 ${result.total} 条原始记录；采用 ${result.data.length} 条。无效行：${result.invalid.join(', ') || '无'}；重复时间行：${result.duplicates.join(', ') || '无'}。行号按 CSV 逻辑记录计，表头为第 1 行。</p><p>② 按时间排序；发现 ${result.reordered} 次倒序。代表采样间隔 ${result.intervalMinutes} 分钟，不跨 ${result.gaps} 处间断累计。</p><p>③ 采用${settings.direction === 'upper' ? '上限' : '下限'} ${settings.limit}，关注线 ${settings.trigger}，控制量阈值 ${settings.active}。等于约束线不计越界。</p><p>④ 基础统计以确定性规则聚合片段。复盘助手的模式与工具执行记录单独标注；不生成控制指令或估算节约金额。</p>`;
  draw(); queue(); detail();
  $('dataCount').textContent = `有效记录 ${result.data.length} 条 · 显示前 ${Math.min(500, result.data.length)} 条`;
  $('rawTable').innerHTML = `<thead><tr><th>原始行</th><th>${esc(table.headers[mapping.time])}</th><th>${esc(table.headers[mapping.value])}</th><th>${esc(table.headers[mapping.control])}</th><th>分类</th></tr></thead><tbody>${result.data.slice(0, 500).map(r => `<tr><td>${r.row}</td><td>${esc(r.label)}</td><td>${r.value}</td><td>${r.control}</td><td>${r.kind === 'risk' ? '越界复核' : r.kind === 'review' ? '裕量复核' : '未命中规则'}</td></tr>`).join('')}</tbody>`;
}
function queue() {
  const sorted = [...result.events].sort((a, b) => (a.kind === 'risk' ? 0 : 1) - (b.kind === 'risk' ? 0 : 1));
  $('cases').replaceChildren();
  if (!sorted.length) { $('cases').innerHTML = '<p class="empty">当前口径下没有发现待复核片段。这不代表已完成设备健康或合规评估。</p>'; return; }
  sorted.forEach(e => {
    const b = document.createElement('button'); b.className = 'case' + (current?.id === e.id ? ' active' : '');
    b.setAttribute('aria-pressed', String(current?.id === e.id));
    b.innerHTML = `<span class="case-id">${e.id}</span><span>${esc(e.records[0].label.slice(11))} — ${esc(e.records.at(-1).label.slice(11))}<small>${e.records.length} 个点 · 估计 ${e.minutes.toFixed(1)} 分钟 · ${esc(notes[e.id]?.status || '待复核')}</small></span><span class="badge ${e.kind}">${e.kind === 'risk' ? '越界复核' : '裕量复核'}</span>`;
    b.onclick = () => { current = e; draw(); queue(); detail(); openDetail(true); window.dispatchEvent(new CustomEvent('datalens:selected', { detail: e.id })); }; $('cases').append(b);
  });
}
function questions() {
  if (!current) return [];
  if (current.kind === 'risk') return ['核对仪表状态、采样口径与适用约束，确认是否为真实异常。', '对照同一时段的负荷、上下游指标与操作记录，判断工况变化。', '按现场规程交由负责人复核；记录处置及后续观测，不自动下发操作。'];
  return ['补充入口指标与负荷，比较相近工况下的控制量。', '检查控制滞后、设定值与仪表质量，排除维持指标所需的正常控制。', '若仍值得优化，由工艺负责人制定验证方案，记录约束、对照与停止条件。'];
}
function detail() {
  $('note').disabled = $('status').disabled = !current;
  if (!current) { $('detail').innerHTML = '<p class="empty">当前没有片段可选。可以调整口径或导入其他班次的数据。</p>'; $('note').value = ''; $('status').value = '待复核'; return; }
  const values = current.records.map(r => r.value), controls = current.records.map(r => r.control);
  const saved = notes[current.id] || { status: '待复核', note: '' };
  $('status').value = saved.status; $('note').value = saved.note;
  $('detail').innerHTML = `<h3>${current.kind === 'risk' ? '先核查约束线外记录' : '有裕量时，控制量仍活跃'}</h3><div class="fact">${esc(table.headers[mapping.value])}：${Math.min(...values).toFixed(2)} ~ ${Math.max(...values).toFixed(2)}<br>${esc(table.headers[mapping.control])}：${Math.min(...controls).toFixed(2)} ~ ${Math.max(...controls).toFixed(2)}<br>记录范围：第 ${current.records[0].row} ~ ${current.records.at(-1).row} 行</div><h4>建议带着这 3 个问题核查</h4><ul>${questions().map(q => `<li>${q}</li>`).join('')}</ul><details><summary>查看原始记录（前 8 条）</summary><table><thead><tr><th>行</th><th>时间</th><th>指标</th><th>控制量</th></tr></thead><tbody>${current.records.slice(0, 8).map(r => `<tr><td>${r.row}</td><td>${esc(r.label.slice(11))}</td><td>${r.value}</td><td>${r.control}</td></tr>`).join('')}</tbody></table></details>`;
}
function draw() {
  const data = result.data, lo = Math.min(settings.limit, settings.trigger, ...data.map(r => r.value)), hi = Math.max(settings.limit, settings.trigger, ...data.map(r => r.value));
  const pad = Math.max((hi - lo) * .13, .05), lower = lo - pad, upper = hi + pad;
  const chartWidth = Math.max(320, Math.round($('chart').getBoundingClientRect().width || 900));
  $('chart').setAttribute('viewBox', `0 0 ${chartWidth} 230`);
  const x = t => 45 + (t - data[0].t) / (data.at(-1).t - data[0].t) * (chartWidth - 70);
  const y = v => 205 - (v - lower) / (upper - lower) * 180;
  let svg = '';
  for (let i = 0; i < 4; i++) { const v = lower + (upper - lower) * i / 3; svg += `<line x1="45" x2="${chartWidth - 25}" y1="${y(v)}" y2="${y(v)}" stroke="#edf1f4"/><text x="0" y="${y(v) + 4}" fill="#8192a3" font-size="11">${v.toFixed(1)}</text>`; }
  if (current) svg += `<rect x="${x(current.records[0].t)}" y="20" width="${Math.max(4, x(current.records.at(-1).t) - x(current.records[0].t))}" height="185" fill="${current.kind === 'risk' ? '#fff0e9' : '#e4f3ed'}"/>`;
  [settings.limit, settings.trigger].forEach((v, i) => { svg += `<line x1="45" x2="${chartWidth - 25}" y1="${y(v)}" y2="${y(v)}" stroke="${i ? '#a9bbb5' : '#c37c67'}" stroke-dasharray="5 5"/>`; });
  // Draw every point and break across excluded intervals; no interpolation over missing data.
  svg += `<path d="${data.map((r, i) => `${i && data[i - 1].minutes ? 'L' : 'M'}${x(r.t).toFixed(2)},${y(r.value).toFixed(2)}`).join(' ')}" fill="none" stroke="#509ee3" stroke-width="2.2"/>`;
  svg += data.filter(r => r.kind === 'risk').map(r => `<circle cx="${x(r.t)}" cy="${y(r.value)}" r="2.5" fill="#c37c67"/>`).join('');
  $('chart').innerHTML = svg;
  window.dispatchEvent(new Event('datalens:chart'));
}
function exportReport() {
  const lines = ['# DataLens 运行复盘记录', '', `生成时间：${new Date().toLocaleString('zh-CN')}`, `数据：${dataset.replace(/[\r\n]/g, ' ')}`, `来源：${example ? '仓库示例，未验证真实生产工况' : '用户导入，真实性与口径由用户确认'}`, '', '## 口径与数据质量', `方向：${settings.direction === 'upper' ? '上限' : '下限'}；约束线：${settings.limit}；关注线：${settings.trigger}；控制量活跃阈值：${settings.active}。`, `有效记录 ${result.data.length}/${result.total}；无效行 ${result.invalid.join(', ') || '无'}；重复行 ${result.duplicates.join(', ') || '无'}；间断 ${result.gaps} 处。`, `数据跨度 ${result.durationMinutes} 分钟，可累计观察 ${result.observedMinutes.toFixed(1)} 分钟。持续时间按相邻样本左值保持，不跨间断，末点不外推。`, '', '## 复核片段'];
  result.events.forEach(e => {
    const n = notes[e.id] || { status: '待复核', note: '' };
    const safe = text => String(text).replace(/[|\r\n]/g, ' ');
    lines.push(`### ${e.id} · ${e.kind === 'risk' ? '约束线外' : '裕量与控制量共现'}`, `${e.records[0].label} — ${e.records.at(-1).label}；${e.records.length} 个采样点；估计 ${e.minutes.toFixed(1)} 分钟。`, `原始逻辑行：${e.records.map(r => r.row).join(', ')}。`, `复核状态：${n.status}`, '现场记录（原文）：', ...String(n.note || '尚未补充').split('\n').map(x => '> ' + x), '', `| 行 | 时间 | ${safe(table.headers[mapping.value])} | ${safe(table.headers[mapping.control])} |`, '| --- | --- | --- | --- |', ...e.records.map(r => `| ${r.row} | ${r.label} | ${r.value} | ${r.control} |`), '');
  });
  lines.push('## 下一步核查', '- 补充负荷、入口指标、仪表状态、控制滞后与操作记录。', '- 由工艺负责人复核异常或优化假设，并设计对照验证。', '', '## 结论边界', '本报告的片段统计采用确定性规则。片段仅为调查线索；采样点越界不等于合规结论。未证明控制浪费、未计算已实现收益、不提供控制指令。', window.DataLensAssistant?.exportText() || '');
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'DataLens-运行复盘.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('emission').onclick = () => sample('emission'); $('air').onclick = () => sample('air'); $('run').onclick = run; $('export').onclick = exportReport;
['time', 'value', 'control', 'direction', 'limit', 'trigger', 'active'].forEach(id => $(id).addEventListener('input', stale));
['status', 'note'].forEach(id => $(id).addEventListener('input', () => { if (current) { notes[current.id] = { status: $('status').value, note: $('note').value }; queue(); } }));
$('file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    if (f.size > 5 * 1024 * 1024) throw Error('文件超过 5 MB，请截取复盘时段后导入。');
    if (Object.values(notes).some(n => n.note || n.status !== '待复核') && !confirm('导入数据会清空本次复核记录。请确认已导出需要保留的内容。')) return;
    load(await f.text(), f.name, false); $('emission').classList.remove('selected'); $('air').classList.remove('selected');
    window.dispatchEvent(new Event('datalens:imported'));
  } catch (err) { $('error').textContent = err.message; $('error').hidden = false; }
  finally { e.target.value = ''; }
};
sample('emission');
function openDetail(open) { $('inspector').hidden = !open; $('toggleDetail').setAttribute('aria-expanded', String(open)); }
$('toggleDetail').onclick = () => openDetail($('inspector').hidden);
$('closeDetail').onclick = () => openDetail(false);
document.querySelectorAll('[data-view]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    document.querySelectorAll('.result-view').forEach(panel => { panel.hidden = panel.id !== `view-${button.dataset.view}`; });
  };
});
document.querySelector('.upload').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } };
window.DataLensApp = {
  snapshot: () => structuredClone({ table, mapping, settings, dataset, result, example, selectedEventId: current?.id, notes }),
  isReady: () => Boolean(result) && $('dirty').hidden,
  sample,
  setReview(id, value) {
    if (!$('dirty').hidden || !result?.events.some(e => e.id === id)) return false;
    notes[id] = { status: value.status, note: value.note || '' }; queue(); detail();
    window.dispatchEvent(new CustomEvent('datalens:reviewed', { detail: id })); return true;
  },
  selectEvent(id, scroll = true, inspect = true) {
    const e = result?.events.find(item => item.id === id);
    if (!e || !$('dirty').hidden) return;
    current = e; draw(); queue(); detail(); openDetail(inspect);
    $('tab-trend').click(); if (scroll) $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.dispatchEvent(new CustomEvent('datalens:selected', { detail: id }));
  }
};

new ResizeObserver(entries => {
  const width = Math.round(entries[0].contentRect.width);
  if (width > 0 && result && Math.abs(width - $('chart').viewBox.baseVal.width) > 3) requestAnimationFrame(draw);
}).observe($('chart'));
