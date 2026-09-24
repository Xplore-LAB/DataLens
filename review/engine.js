(function (root) {
  'use strict';
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw Error('CSV 引号未闭合，请检查文件。');
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
    if (rows.length < 3) throw Error('至少需要表头和两条数据。');
    if (rows.length > 20001) throw Error('当前版本最多支持 20,000 条记录，请先截取复盘时段。');
    const headers = rows.shift();
    if (headers.length < 3) throw Error('至少需要时间、监测指标和控制量三列。');
    return { headers, rows };
  }
  function timestamp(value) {
    const m = String(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return NaN;
    const [y, mo, d, h, mi, se] = m.slice(1).map(x => Number(x || 0));
    const t = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d && t.getUTCHours() === h && t.getUTCMinutes() === mi && t.getUTCSeconds() === se ? +t : NaN;
  }
  function analyze(table, mapping, config) {
    const { time, value, control } = mapping;
    if (new Set([time, value, control]).size !== 3) throw Error('时间、监测指标和控制量需要选择不同列。');
    if (![time, value, control].every(i => Number.isInteger(i) && i >= 0 && i < table.headers.length)) throw Error('请选择有效列。');
    if (!['upper', 'lower'].includes(config.direction) || ![config.limit, config.trigger, config.active].every(Number.isFinite) || config.active < 0) throw Error('请输入有效的阈值与约束方向。');
    if (config.direction === 'upper' ? config.trigger >= config.limit : config.trigger <= config.limit) throw Error('关注线应在约束线的正常一侧：上限场景低于上限，下限场景高于下限。');
    const invalid = [], duplicates = [], data = [], seen = new Set(); let reordered = 0, previous = -Infinity;
    table.rows.forEach((r, i) => {
      const t = timestamp(r[time]), v = r[value]?.trim() === '' ? NaN : Number(r[value]), u = r[control]?.trim() === '' ? NaN : Number(r[control]);
      if (![t, v, u].every(Number.isFinite)) { invalid.push(i + 2); return; }
      if (seen.has(t)) { duplicates.push(i + 2); return; }
      if (t < previous) reordered++;
      previous = t; seen.add(t); data.push({ t, label: r[time], value: v, control: u, row: i + 2 });
    });
    if (data.length < 2) throw Error('有效且时间不重复的记录少于两条，无法复盘。');
    data.sort((a, b) => a.t - b.t);
    const deltas = data.slice(1).map((r, i) => r.t - data[i].t).sort((a, b) => a - b);
    const interval = deltas[Math.floor(deltas.length / 2)]; let gaps = 0;
    data.forEach((r, i) => {
      r.kind = (config.direction === 'upper' ? r.value > config.limit : r.value < config.limit) ? 'risk' :
        ((config.direction === 'upper' ? r.value < config.trigger : r.value > config.trigger) && r.control > config.active) ? 'review' : 'normal';
      const next = data[i + 1], dt = next ? next.t - r.t : 0;
      const contiguous = next && dt <= interval * 1.5 && next.row === r.row + 1;
      r.minutes = contiguous ? dt / 60000 : 0;
      if (next && !contiguous) gaps++;
    });
    const events = []; let current = null;
    data.forEach((r, i) => {
      if (r.kind === 'normal') { current = null; return; }
      if (!current || current.kind !== r.kind || !data[i - 1]?.minutes) {
        current = { id: 'E' + String(events.length + 1).padStart(2, '0'), kind: r.kind, records: [], minutes: 0 }; events.push(current);
      }
      current.records.push(r); current.minutes += r.minutes;
    });
    return { data, events, invalid, duplicates, reordered, gaps, intervalMinutes: interval / 60000,
      total: table.rows.length, durationMinutes: (data.at(-1).t - data[0].t) / 60000,
      observedMinutes: data.reduce((s, r) => s + r.minutes, 0),
      riskPoints: data.filter(r => r.kind === 'risk').length,
      reviewPoints: data.filter(r => r.kind === 'review').length };
  }
  const api = { parseCSV, timestamp, analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DataLensReview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
