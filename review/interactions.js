(() => {
  'use strict';
  const $ = id => document.getElementById(id), app = window.DataLensApp;
  const assistant = document.querySelector('.assistant');
  let snapshot, choice, candidates = [], inspected = false, undo, cursorIndex = 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = element => element.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
  function progress() {
    const saved = choice && snapshot.notes[choice.id]?.status === '已确认需跟进';
    $('stepChoose').classList.toggle('complete', Boolean(choice));
    $('stepInspect').classList.toggle('complete', inspected);
    $('stepSave').classList.toggle('complete', Boolean(saved));
    $('journeyStatus').textContent = saved ? '已标记需跟进，尚未闭环。补充现场记录后可导出交接材料。' : inspected ? '已打开片段数据。请核对仪表、工况与操作记录，再标记跟进状态。' : choice ? '当前片段已定位，待核对原始记录与工况。' : '选择待核查时段，核对数据后记录跟进状态。';
  }
  function resetInvestigation() {
    choice = undefined; candidates = []; inspected = false; undo = undefined;
    $('investigation').hidden = true; assistant.hidden = false; $('undoFollow').hidden = true; $('reviewFeedback').hidden = true;
  }
  function sparkline(event, data) {
    const start = data.indexOf(event.records[0]), end = data.indexOf(event.records.at(-1));
    const points = data.slice(Math.max(0, start - 4), Math.min(data.length, end + 5));
    const low = Math.min(snapshot.settings.limit, ...data.map(p => p.value));
    const high = Math.max(snapshot.settings.limit, ...data.map(p => p.value));
    const y = v => 58 - (v-low) / (high-low || 1) * 46;
    const x = t => 4 + (t-points[0].t) / (points.at(-1).t-points[0].t || 1) * 232;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox','0 0 240 68'); svg.setAttribute('aria-hidden','true');
    svg.innerHTML = `<rect x="${x(event.records[0].t)}" y="5" width="${Math.max(3, x(event.records.at(-1).t)-x(event.records[0].t))}" height="57" fill="#edf3f8"/><line x1="0" x2="240" y1="${y(snapshot.settings.limit)}" y2="${y(snapshot.settings.limit)}" stroke="#c08d79" stroke-dasharray="4 4"/><path d="${points.map((p,i)=>`${i && points[i-1].minutes ? 'L':'M'}${x(p.t)},${y(p.value)}`).join(' ')}" fill="none" stroke="#6597be" stroke-width="2"/>`;
    return svg;
  }
  function start() {
    resetInvestigation(); $('closeDetail').click(); snapshot = app.snapshot();
    const risks = snapshot.result.events.filter(e=>e.kind==='risk').sort((a,b)=>b.records.length-a.records.length);
    const reviews = snapshot.result.events.filter(e=>e.kind==='review').sort((a,b)=>b.records.length-a.records.length);
    candidates = [...risks, ...reviews];
    if (!candidates.length) return;
    $('investigation').hidden = false; assistant.hidden = true; $('discovery').hidden = true;
    $('candidateWindows').replaceChildren();
    $('reviewContext').textContent = `${snapshot.result.data[0].label} — ${snapshot.result.data.at(-1).label.slice(11)} · ${snapshot.result.data.length} 条有效记录 · ${snapshot.settings.direction === 'upper' ? '上限' : '下限'} ${snapshot.settings.limit}（当前设定） · 展示 ${candidates.length} / ${snapshot.result.events.length} 个片段`;
    candidates.forEach(event => {
      const button = document.createElement('button'); button.className = 'candidate'; button.setAttribute('aria-pressed','false');
      const title = document.createElement('strong'); title.textContent = `${event.id} · ${event.records[0].label.slice(11,16)}—${event.records.at(-1).label.slice(11,16)}`;
      const label = document.createElement('span'); label.className = 'window-facts'; label.textContent = `${event.records.length} 个点 · 估计 ${event.minutes.toFixed(1)} 分钟`;
      const type = document.createElement('span'); type.className = 'window-type ' + event.kind; type.textContent = event.kind === 'risk' ? '越界核查' : '裕量复核';
      button.append(title, type, sparkline(event, snapshot.result.data), label);
      button.onclick = () => {
        choice = event; inspected = false;
        [...$('candidateWindows').children].forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        $('discovery').hidden = false;
        const range = event.records.map(r=>r.value);
        const intro = `${event.id}：${snapshot.table.headers[snapshot.mapping.value]} ${Math.min(...range).toFixed(2)}–${Math.max(...range).toFixed(2)}，原始第 ${event.records[0].row}–${event.records.at(-1).row} 行。`;
        $('discoveryText').textContent = intro + (event.kind === 'risk' ? `采样值超出当前设定${snapshot.settings.direction === 'upper' ? '上限' : '下限'} ${snapshot.settings.limit}。核查仪表状态、适用判定口径及同期工况；采样点越界不直接等同于合规结论。` : '指标有裕量且控制量活跃。需结合负荷、入口指标和控制滞后复核，不据此直接判定控制浪费。');
        app.selectEvent(event.id, false, false); inspected = false;
        progress();
      };
      $('candidateWindows').append(button);
    });
    $('candidateWindows').firstElementChild?.click();
    progress();
  }
  function showAssistant(id) {
    assistant.hidden = false; $('closeDetail').click();
    if (id) window.DataLensAssistant.askAbout(id); else window.DataLensAssistant.scan();
    scrollTo(assistant);
  }
  $('skipInvestigation').onclick = () => { showAssistant(); };
  $('inspectChoice').onclick = () => { if (choice) { inspected = true; app.selectEvent(choice.id); progress(); } };
  $('askChoice').onclick = () => { if (choice) showAssistant(choice.id); };
  $('askCurrent').onclick = () => { if (app.isReady()) showAssistant(app.snapshot().selectedEventId); };
  $('followEvent').onclick = () => {
    const state = app.snapshot(), id = state.selectedEventId; if (!id || !app.isReady()) return;
    undo = { id, previous: state.notes[id] || { status: '待复核', note: '' } };
    app.setReview(id, { ...undo.previous, status: '已确认需跟进' });
    $('reviewFeedback').textContent = `${id} 已加入跟进，尚待现场核查。`; $('reviewFeedback').hidden = false; $('undoFollow').hidden = false;
  };
  $('undoFollow').onclick = () => {
    if (!undo) return; app.setReview(undo.id, undo.previous); undo = undefined;
    $('reviewFeedback').textContent = '已恢复原来的复核状态。'; $('undoFollow').hidden = true;
  };
  function navigate(delta) {
    const state=app.snapshot(), events=state.result.events, index=events.findIndex(e=>e.id===state.selectedEventId);
    if (events[index+delta]) app.selectEvent(events[index+delta].id,false);
  }
  $('previousEvent').onclick=()=>navigate(-1); $('nextEvent').onclick=()=>navigate(1);
  function updateSelection() {
    snapshot=app.snapshot(); const events=snapshot.result.events, index=events.findIndex(e=>e.id===snapshot.selectedEventId);
    $('selectedEventLabel').textContent=index<0?'没有待复核片段':`${snapshot.selectedEventId} · ${index+1} / ${events.length}`;
    $('previousEvent').disabled=index<=0; $('nextEvent').disabled=index<0||index===events.length-1;
    $('followEvent').disabled=index<0 || snapshot.notes[snapshot.selectedEventId]?.status==='已确认需跟进';
    $('followEvent').textContent=snapshot.notes[snapshot.selectedEventId]?.status==='已确认需跟进'?'已加入跟进 ✓':'加入跟进';
    $('askCurrent').disabled=index<0;
    [...$('chartEventButtons').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.event===snapshot.selectedEventId)));
    if (choice?.id===snapshot.selectedEventId && !$('inspector').hidden) inspected=true;
    progress();
  }
  function cursor(index) {
    if (!snapshot?.result || !app.isReady()) return;
    const data=snapshot.result.data; cursorIndex=Math.max(0,Math.min(index,data.length-1));
    const point=data[cursorIndex]; $('sampleCursor').value=cursorIndex;
    $('cursorReadout').textContent=`${point.label.slice(11)} · ${snapshot.table.headers[snapshot.mapping.value]} ${point.value} · ${snapshot.table.headers[snapshot.mapping.control]} ${point.control} · 原始行 ${point.row}`;
    const event=snapshot.result.events.find(e=>point.t>=e.records[0].t && point.t<=e.records.at(-1).t);
    $('inspectCursor').disabled=!event; $('inspectCursor').textContent=event?`打开 ${event.id} 证据 →`:'此处未命中规则';
    $('inspectCursor').onclick=()=>{ if(event)app.selectEvent(event.id,false); };
    const x=45+(point.t-data[0].t)/(data.at(-1).t-data[0].t)*($('chart').viewBox.baseVal.width-70);
    let line=$('chart').querySelector('.cursor-line');
    if(!line){line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('class','cursor-line');line.setAttribute('y1','20');line.setAttribute('y2','205');$('chart').append(line);}
    line.setAttribute('x1',x);line.setAttribute('x2',x);
    window.dispatchEvent(new CustomEvent('datalens:cursor', { detail: cursorIndex }));
  }
  function refreshChart() {
    snapshot=app.snapshot(); $('sampleCursor').max=snapshot.result.data.length-1;
    $('chartEventButtons').replaceChildren();
    snapshot.result.events.slice(0,100).forEach(event=>{
      const b=document.createElement('button');b.dataset.event=event.id;b.className=event.kind;
      b.textContent=event.id;b.title=`${event.records[0].label.slice(11)} · ${event.kind==='risk'?'越界复核':'裕量复核'}`;
      b.setAttribute('aria-label',`查看 ${event.id} 片段`);b.onclick=()=>app.selectEvent(event.id,false);$('chartEventButtons').append(b);
    });
    updateSelection();cursor(cursorIndex);
  }
  $('sampleCursor').oninput=e=>cursor(+e.target.value);
  function pointFromPointer(event) {
    if(!app.isReady())return;
    const matrix=$('chart').getScreenCTM(); if(!matrix)return;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const data=snapshot.result.data, time=data[0].t+(p.x-45)/($('chart').viewBox.baseVal.width-70)*(data.at(-1).t-data[0].t);
    let lo=0,hi=data.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(data[mid].t<time)lo=mid+1;else hi=mid;}
    cursor(lo>0&&Math.abs(data[lo-1].t-time)<Math.abs(data[lo].t-time)?lo-1:lo);
  }
  $('chart').addEventListener('pointermove',pointFromPointer);
  $('chart').addEventListener('click',event=>{pointFromPointer(event);if(!$('inspectCursor').disabled)$('inspectCursor').click();});
  window.addEventListener('datalens:investigate',start);
  window.addEventListener('datalens:change',resetInvestigation);
  window.addEventListener('datalens:ready',()=>{resetInvestigation();cursorIndex=0;refreshChart();});
  window.addEventListener('datalens:chart',refreshChart);
  window.addEventListener('datalens:selected',()=>{ $('reviewFeedback').hidden=true;$('undoFollow').hidden=true;undo=undefined;updateSelection(); const event=snapshot.result.events.find(e=>e.id===snapshot.selectedEventId); if(event) cursor(snapshot.result.data.findIndex(p=>p.row===event.records[0].row)); });
  window.addEventListener('datalens:reviewed',updateSelection);
  $('status').addEventListener('input',()=>{undo=undefined;$('undoFollow').hidden=true;updateSelection();});
  $('note').addEventListener('input',()=>{undo=undefined;$('undoFollow').hidden=true;});
  refreshChart();
})();
