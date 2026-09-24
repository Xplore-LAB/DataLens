const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('./engine.js');
const map = { time: 0, value: 1, control: 2 };
const cfg = { direction: 'upper', limit: 50, trigger: 40, active: 2 };
const csv = rows => E.parseCSV('时间,指标,控制量\n' + rows.join('\n'));
test('quoted CSV, BOM, strict numeric cells and invalid calendar dates', () => {
  const t = E.parseCSV('\uFEFF"时间","指标,浓度",控制量\n2025-01-01 00:00,30,5\n2025-01-01 00:01,,4\n2025-02-30 00:02,20,3\n2025-01-01 00:03,20ppm,3\n2025-01-01 00:04,51,3');
  assert.equal(t.headers[1], '指标,浓度');
  const r = E.analyze(t, map, cfg); assert.deepEqual(r.invalid, [3, 4, 5]); assert.equal(r.data.length, 2); assert.equal(r.observedMinutes, 0);
});
test('upper and lower bounds have opposite semantics; equality is not a breach', () => {
  const t = csv(['2025-01-01 00:00,99.4,45','2025-01-01 00:01,99.5,45','2025-01-01 00:02,99.8,45']);
  const r = E.analyze(t, map, { direction: 'lower', limit: 99.5, trigger: 99.6, active: .5 });
  assert.deepEqual(r.data.map(x => x.kind), ['risk','normal','review']);
});
test('durations use elapsed time, exclude gaps and do not extend final sample', () => {
  const t = csv(['2025-01-01 00:00,30,5','2025-01-01 00:02,30,5','2025-01-01 00:04,30,5','2025-01-01 01:00,30,5']);
  const r = E.analyze(t, map, cfg); assert.equal(r.observedMinutes, 4); assert.equal(r.events.length, 2); assert.equal(r.events[1].minutes, 0); assert.equal(r.gaps, 1);
});
test('duplicate and reordered samples are disclosed, duplicate boundary not integrated', () => {
  const t = csv(['2025-01-01 00:02,30,5','2025-01-01 00:00,30,5','2025-01-01 00:00,99,5','2025-01-01 00:01,30,5']);
  const r = E.analyze(t, map, cfg); assert.deepEqual(r.duplicates, [4]); assert.equal(r.reordered, 1); assert.equal(r.observedMinutes, 0);
});
test('reject ambiguous column mapping and inverted trigger', () => {
  const t = csv(['2025-01-01 00:00,30,5','2025-01-01 00:01,30,5']);
  assert.throws(() => E.analyze(t, { time: 0, value: 1, control: 1 }, cfg));
  assert.throws(() => E.analyze(t, map, { ...cfg, trigger: 60 }));
});
test('repository samples load; air separation sample is below its lower bound', () => {
  for (const name of ['emission-control', 'air-separation']) {
    const t = E.parseCSV(fs.readFileSync(`${__dirname}/../examples/${name}/data.csv`, 'utf8'));
    const c = name === 'air-separation' ? { direction: 'lower', limit: 99.5, trigger: 99.6, active: .5 } : cfg;
    const r = E.analyze(t, map, c); assert.equal(r.invalid.length, 0); assert.equal(r.duplicates.length, 0);
    if (name === 'air-separation') assert.equal(r.riskPoints, 11);
  }
});
