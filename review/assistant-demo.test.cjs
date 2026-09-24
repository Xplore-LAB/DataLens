const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV } = require('./engine.js');
const { explain } = require('./assistant-demo.js');
const context = values => ({ table: parseCSV('时间,浓度,控制量\n' + values.map((v,i)=>`2025-01-01 00:0${i},${v},5`).join('\n')), mapping:{time:0,value:1,control:2},settings:{direction:'upper',limit:50,trigger:40,active:2},dataset:'测试'});
test('demo conclusions recompute from data and thresholds rather than fixed output',()=>{
  const input=context([52,53,45]);
  assert.match(explain(input,'检查数据').answer,/2 个约束线外采样点/);
  input.settings.limit=60;
  const changed=explain(input,'检查数据');
  assert.match(changed.answer,/0 个约束线外采样点/);
  assert.deepEqual(changed.eventIds,[]);
  assert.match(explain(input,'整理摘要').report,/没有需要突出显示的片段/);
});
test('follow-up keeps selected evidence; report includes mode and actual record range',()=>{
  const input=context([52,45,30,31,45]);
  const out=explain(input,'为什么关注这个时段？整理成摘要','E02');
  assert.deepEqual(out.eventIds,['E02']);
  assert.match(out.answer,/原始第 4–5 行/);
  assert.match(out.report,/未调用模型/);
  assert.ok(out.trace.some(x=>x.tool==='compare_event_windows'));
});
test('unsupported free questions never impersonate model responses or tool execution',()=>{
  const out=explain(context([52,45]),'你好，帮我写一首诗');
  assert.deepEqual(out.trace,[]); assert.deepEqual(out.eventIds,[]);
  assert.match(out.answer,/不会调用模型/);
});
