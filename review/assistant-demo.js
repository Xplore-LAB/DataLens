(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.DataLensReview;
  function explain(context, message, selectedId) {
    const { table, mapping, settings } = context;
    const r = engine.analyze(table, mapping, settings);
    const ranked = [...r.events].sort((a, b) => (a.kind === 'risk' ? 0 : 1) - (b.kind === 'risk' ? 0 : 1) || b.records.length - a.records.length);
    const event = r.events.find(e => e.id === selectedId) || ranked[0];
    const scan = /检查|分析|优先|哪里|问题|开始/.test(message);
    const why = /为什么|为何|解释|依据|对比/.test(message);
    const missing = /补充|还需|证据|负荷|入口|滞后|原因/.test(message);
    const report = /报告|摘要|整理|总结/.test(message);
    if (!(scan || why || missing || report)) return { mode: 'demo', eventIds: [], trace: [], answer: '当前是规则示例讲解，不会调用模型。可以体验“检查这段数据”“为什么关注这个时段”“还需要补什么证据”“整理成复盘摘要”。自由问题和结合新信息继续分析，请切换到实时 Agent。' };
    const trace = [{ tool: 'inspect_dataset', label: '检查数据质量', args: {}, summary: `读取 ${r.total} 条记录；采用 ${r.data.length} 条，无效 ${r.invalid.length} 条，重复 ${r.duplicates.length} 条。`, eventIds: [] },
      { tool: 'list_events', label: '按当前口径定位片段', args: { direction: settings.direction, limit: settings.limit }, summary: `${r.riskPoints} 个采样点位于约束线外，${r.events.length} 个待复核片段。`, eventIds: [] }];
    const intro = `这份数据有 ${r.data.length} 条有效记录，覆盖 ${r.durationMinutes} 分钟。按${settings.direction === 'upper' ? '上限' : '下限'} ${settings.limit} 检查，发现 ${r.riskPoints} 个约束线外采样点。`;
    if (!event) {
      const answer = intro + '\n当前规则下没有需要突出显示的片段。没有命中规则不代表设备已通过健康或合规评估。';
      if (report) trace.push({ tool: 'build_report', label: '整理复盘摘要', args: {}, summary: '记录当前口径下未命中片段，不形成健康或合规结论。', eventIds: [] });
      return { mode: 'demo', answer, trace, eventIds: [], ...(report ? { report: '# DataLens 复盘摘要\n\n模式：规则示例，未调用模型。\n\n' + answer } : {}) };
    }
    const values = event.records.map(x => x.value), control = event.records.map(x => x.control);
    const first = event.records[0], last = event.records.at(-1);
    const evidence = `[${event.id}] ${first.label} 至 ${last.label}，${event.records.length} 个采样点。${table.headers[mapping.value]}为 ${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)}，${table.headers[mapping.control]}为 ${Math.min(...control).toFixed(2)}–${Math.max(...control).toFixed(2)}；原始第 ${first.row}–${last.row} 行。`;
    trace.push({ tool: 'inspect_event', label: '读取片段的原始记录', args: { eventId: event.id }, summary: evidence, eventIds: [event.id] });
    const before = r.data.filter(x => x.t < first.t).slice(-3), after = r.data.filter(x => x.t > last.t).slice(0, 3);
    const mean = xs => (xs.reduce((s, x) => s + x.value, 0) / xs.length).toFixed(2);
    let comparison = '';
    if (why) {
      comparison = `前方最多 3 个有效样本的均值：${before.length ? mean(before) : '缺少样本'}；后方最多 3 个有效样本的均值：${after.length ? mean(after) : '缺少样本'}。这是相邻样本对比，时间间隔可能不同，不证明故障原因。`;
      trace.push({ tool: 'compare_event_windows', label: '比较前后样本', args: { eventId: event.id, samples: 3 }, summary: comparison, eventIds: [event.id] });
    }
    const reason = event.kind === 'risk' ? `这些采样值超出了当前设置的${settings.direction === 'upper' ? '上限' : '下限'}，所以应先核查仪表和工况。` : '这里同时出现指标裕量与活跃控制量，值得复核，但维持裕量本身也可能需要控制。';
    const next = '下一步需要：同一时段的负荷、入口指标、仪表状态及操作记录。现有数据不能证明控制浪费，也不能直接推导减量或节约收益。';
    let answer = [intro, `${scan && !selectedId ? '优先查看连续采样点较多的片段：' : '当前查看的片段：'}${evidence}`, reason, comparison, next].filter(Boolean).join('\n\n');
    if (missing) answer = `${evidence}\n\n${next}\n\n你在问题里补充的信息尚未由数据验证。此模式只能列出核查方向；实时 Agent 可以结合补充信息继续选择分析工具。`;
    const out = { mode: 'demo', answer, trace, eventIds: [event.id] };
    if (report) {
      out.report = `# DataLens 复盘摘要\n\n模式：免配置规则示例，未调用模型。\n\n${answer}\n\n## 口径\n方向 ${settings.direction}；约束线 ${settings.limit}；关注线 ${settings.trigger}；控制量活跃阈值 ${settings.active}。\n\n本摘要基于当前数据计算，不是生产验证结果。`;
      out.answer = '已基于当前数据生成复盘摘要。可下载摘要，或点击证据片段核对。\n\n' + answer;
      out.trace.push({ tool: 'build_report', label: '整理复盘摘要', args: {}, summary: '已整理观测值、依据与待补充证据，未计算节约收益。', eventIds: [event.id] });
    }
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { explain };
  else root.DataLensDemo = { explain };
})(typeof globalThis !== 'undefined' ? globalThis : this);
