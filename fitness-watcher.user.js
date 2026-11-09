// ==UserScript==
// @name         HKU Fitness Watcher 健身房蹲位
// @namespace    hku-toys
// @version      0.3.1
// @description  场次余位监测、声音提醒及一键预填；人工验证和提交
// @match        https://fcbooking.cse.hku.hk/Form/Signup*
// @match        https://fcbooking.cse.hku.hk/Form/SignUp*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @run-at       document-idle
// @inject-into  content
// @noframes
// ==/UserScript==

(async () => {
  'use strict';
  const dateKey = value => {
    const s = String(value || '');
    const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const uk = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return uk ? `${uk[3]}-${uk[2]}-${uk[1]}` : s;
  };
  const timeKey = value => String(value || '').replace(/\D/g, '').padStart(4, '0');
  const timeLabel = value => { const key=timeKey(value); return `${key.slice(0,2)}:${key.slice(2,4)}`; };
  const hkToday = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dateLabel = value => {
    const key=dateKey(value), day=new Date(`${key}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(day.getTime())) return key;
    const weekday=day.getUTCDay();
    return `${day.getUTCMonth()+1}.${day.getUTCDate()} ${['SUN','MON','TUE','WED','THU','FRI','SAT'][weekday]} 星期${['日','一','二','三','四','五','六'][weekday]}`;
  };
  const available = s => Number(s.spaceRemaining) > 0 && Number(s.spaceRemaining) !== 99999 && String(s.sessionStatus) !== '20';
  const matches = (s, target) => dateKey(s.sessionDate) === target.date && (!target.time || timeKey(s.startTime) === timeKey(target.time));
  const nextDelay = (seconds, errors = 0) => Math.min(300000, Math.max(10, Number(seconds) || 30) * 1000 * 2 ** Math.min(errors, 5));
  function createStorage({modern, legacy, demoStorage} = {}) {
    const valid = api => api && ['getValue','setValue','deleteValue'].every(k=>typeof api[k]==='function');
    const memory=new Map();
    const api=valid(modern)?modern:valid(legacy)?legacy:demoStorage?{
      getValue:(k,d)=>JSON.parse(demoStorage.getItem(k) || 'null') ?? d,
      setValue:(k,v)=>demoStorage.setItem(k,JSON.stringify(v)),deleteValue:k=>demoStorage.removeItem(k)
    }:{getValue:(k,d)=>memory.get(k) ?? d,setValue:(k,v)=>memory.set(k,v),deleteValue:k=>memory.delete(k)};
    let pending=Promise.resolve();
    const enqueue=operation=>{const next=pending.then(operation);pending=next.catch(()=>{});return next;};
    return {
      persistent:!!(valid(modern)||valid(legacy)||demoStorage),
      get:async k=>{await pending;return api.getValue(k,null);},
      put:(k,v)=>enqueue(()=>api.setValue(k,v)),erase:k=>enqueue(()=>api.deleteValue(k))
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { dateKey, dateLabel, timeKey, available, matches, nextDelay, createStorage };
  if (typeof document === 'undefined') return;
  if (!document.querySelector('#CenterID') || document.querySelector('#fitness-watcher')) return;

  const demo = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const storage=createStorage({modern:typeof GM==='undefined'?null:GM,legacy:{
    getValue:typeof GM_getValue==='function'?GM_getValue:null,
    setValue:typeof GM_setValue==='function'?GM_setValue:null,
    deleteValue:typeof GM_deleteValue==='function'?GM_deleteValue:null
  },demoStorage:demo?localStorage:null});
  const {get,put,erase}=storage;
  let storageWarning='';
  const load=async key=>{try{return await get(key);}catch{storageWarning='读取已存资料失败；可手动填写并重试';return null;}};
  const [savedConfig,profile]=await Promise.all([load('fitness:target'),load('fitness:profile')]);
  if(document.querySelector('#fitness-watcher'))return;
  const host = document.createElement('div'); host.id = 'fitness-watcher'; document.body.append(host);
  const root = host.attachShadow({mode: 'open'});
  root.innerHTML = `<style>
    :host{position:fixed;right:18px;top:18px;z-index:2147483646;font:14px/1.5 system-ui,sans-serif;color:#e5ecf5}
    *{box-sizing:border-box} details{width:350px;max-width:calc(100vw - 36px);background:#142331;border:1px solid #3a5061;border-radius:16px;box-shadow:0 12px 40px #0005}
    summary{padding:16px;cursor:pointer;font-weight:700;list-style:none}summary span{color:#6ee7bc;font-size:12px;float:right}main{padding:0 16px 16px;max-height:calc(100vh - 95px);max-height:calc(var(--fw-height,100dvh) - 95px);overflow:auto;overscroll-behavior:contain}
    label{display:block;margin:9px 0 4px;color:#b8c9d9;font-size:12px}input,select,button{font:inherit;border-radius:7px;padding:8px;width:100%;border:1px solid #415668;background:#203344;color:#fff}
    button{cursor:pointer;margin-top:9px}button:hover{background:#354f62}button:disabled{opacity:.5;cursor:default}.primary{background:#12664f;border-color:#318c70}.row{display:flex;gap:8px}.row>*{min-width:0;flex:1}
    p{margin:8px 0;font-size:12px;color:#b8c9d9}output{display:block;padding:10px;background:#0b1721;border-radius:8px;margin-top:12px;white-space:pre-wrap;font-size:13px}.hit{color:#6ee7bc}#slots{white-space:pre-line;font-size:12px;margin-top:8px}input[type=checkbox]{width:auto}a{color:#6ee7bc}
    #choices,#dates{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#choices button,#dates button{margin:0;text-align:left;white-space:pre-line}#choices .chosen,#dates .chosen{outline:2px solid #6ee7bc}#alert{border:2px solid #6ee7bc;border-radius:9px;padding:12px;margin:10px 0;background:#103e33}#alert[hidden]{display:none}#alert-text{font-weight:bold;color:#fff}
    @media(pointer:coarse){input,select{font-size:16px}button,summary{min-height:44px}main{padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}.row{flex-wrap:wrap}}
    </style><details id="panel" open><summary>HKU Fitness Watcher <span>v0.3.1 · 本机辅助</span></summary><main>
    <div class="row"><button id="fill" class="primary">填写资料</button><button id="collapse">收起助手</button></div>
    <details id="profile" style="width:100%;margin-top:10px;box-shadow:none"><summary>编辑 / 保存资料</summary><main>
    <label>邮箱<input id="email" type="email" autocomplete="email"></label>
    <label>姓名（与卡面一致）<input id="name" autocomplete="name"></label>
    <label>学号 / 员工号<input id="member" autocomplete="off"></label>
    <label><input id="remember" type="checkbox"> 将资料保存在油猴脚本存储（明文）</label>
    <button id="forget">清除已存资料</button>
    </main></details>
    <p>资料单独填写；点场次只选场，满位自动蹲。</p>
    <label>场馆<select id="center"><option value="10002">HKU B-Active</option><option value="10001">CSE Active</option></select></label>
    <label>目标日期（蹲位期间也可切换）</label><div id="dates"></div>
    <label>其他日期<input id="date" type="date"></label><p id="date-label"></p>
    <div class="row"><button id="check" class="primary">查场次</button><button id="stop">停止蹲位</button></div>
    <div id="choices"></div><button id="any" hidden>蹲当天任意场次</button>
    <div id="alert" role="alert" hidden><div id="alert-text"></div><button id="dismiss">知道了，去验证</button></div>
    <output id="status" role="status" aria-live="polite">点击「查场次」</output><div id="slots" hidden></div>
    <input id="time" type="hidden">
    <details style="width:100%;margin-top:12px;box-shadow:none"><summary>蹲位设置 / 通知</summary><main>
    <label>检查间隔（秒，最少 10）<input id="interval" type="number" min="10" max="300" value="30"></label>
    <label><input id="noon" type="checkbox"> 等到下一个香港时间 12:00 开始</label>
    <button id="start">按当前目标开始蹲位</button><button id="notify">启用桌面通知 / 测试声音</button>
    </main></details><p>保持本页前台、电脑不休眠。手机切后台或锁屏可能暂停蹲位；返回后重新查场次。可收起助手操作原表单。</p>
    </main></details>`;
  const $ = id => root.getElementById(id);
  const status = text => { $('status').textContent = text; };
  const config = savedConfig || {};
  if(storageWarning)status(storageWarning);
  if(!storage.persistent){$('remember').disabled=true;status('当前脚本管理器不支持保存，资料仅保留在本页');}
  const rememberTarget=t=>{put('fitness:target',t).catch(()=>status('目标保存失败，当前页面仍可使用'));};
  $('collapse').onclick=()=>{$('panel').open=false;};
  const resizePanel=()=>{
    if(window.visualViewport && host.style) {
      host.style.setProperty('--fw-height',`${window.visualViewport.height}px`);
      host.style.top=`${window.visualViewport.offsetTop+18}px`;
    }
  };
  window.visualViewport?.addEventListener('resize',resizePanel);
  window.visualViewport?.addEventListener('scroll',resizePanel);
  resizePanel();
  // Migrate v0.1's arbitrary clock input to "any session"; never restore an accidental time such as 15:49.
  $('center').value = config.schema === 2 && config.center ? config.center : '10002';
  for (const k of ['date','interval']) if (config[k]) $(k).value = config[k];
  function sessionChoices(data, date, selected = '') {
    $('choices').replaceChildren();
    const seen = new Set();
    for (const s of data.filter(s => dateKey(s.sessionDate) === date)) {
      const key = timeKey(s.startTime);
      if (seen.has(key)) continue;
      seen.add(key);
      const button = document.createElement('button');
      button.textContent = `${timeLabel(s.startTime)}–${timeLabel(s.endTime)}\n${available(s) ? `余 ${s.spaceRemaining} · 选场次` : Number(s.spaceRemaining) === 99999 ? 'Walk In' : String(s.sessionStatus) === '20' ? '未开放预约' : '满位 · 点此蹲位'}`;
      button.className = `${available(s) ? 'primary' : ''} ${selected && timeKey(selected) === key ? 'chosen' : ''}`;
      button.disabled = Number(s.spaceRemaining) === 99999 || String(s.sessionStatus) === '20';
      button.onclick = () => {
        stop(); $('time').value = key; hit = available(s) ? s : null;
        rememberTarget(target());
        if (hit && snapshotCenter === $('center').value) return prepare();
        else $('start').onclick();
      };
      $('choices').append(button);
    }
    $('time').value = selected;
  }
  sessionChoices([], $('date').value, config.schema === 2 ? config.time || '' : '');
  if (!$('date').value) $('date').value = hkToday();
  if (profile) { for (const k of ['email','name','member']) $(k).value = profile[k] || ''; $('remember').checked = true; }
  // Reuse information already entered in the original form, without requiring a second entry.
  for(const [id,k] of [['Email','email'],['FirstName','name'],['MemberID','member']]) if(!$(k).value) $(k).value = document.getElementById(id)?.value || '';
  let running = false, timer, controller, preparation, generation = 0, errors = 0, rows = [], snapshotCenter = '', hit = null, audio;
  function dateChoices() {
    const days=new Set([$('date').value]);
    const today=new Date(`${hkToday()}T00:00:00Z`);
    for(let i=0;i<4;i++) days.add(new Date(today.getTime()+i*86400000).toISOString().slice(0,10));
    for(const s of rows) days.add(dateKey(s.sessionDate));
    $('dates').replaceChildren();
    for(const day of [...days].filter(Boolean).sort()) {
      const button=document.createElement('button');
      button.textContent=dateLabel(day);button.className=day===$('date').value?'chosen':'';
      button.onclick=()=>{if(day===$('date').value)return; $('date').value=day;return $('date').onchange();};
      $('dates').append(button);
    }
    $('date-label').textContent=dateLabel($('date').value);
  }
  dateChoices();
  const title = document.title;
  let desktopNotice;
  const alertText = (t, s) => `${dateLabel(t.date)} ${timeLabel(s.startTime)}–${timeLabel(s.endTime)} ${t.center === '10002' ? 'B-Active' : 'CSE Active'} 有空位！`;
  function dismissAlert() { $('alert').hidden = true; desktopNotice?.close(); desktopNotice = null; document.title = title; }
  function notifyHit(t,s) {
    const text=alertText(t,s);
    $('alert-text').textContent=text; $('alert').hidden=false;
    document.title=text; sound();
    if(typeof Notification!=='undefined' && Notification.permission==='granted') {
      try {
        desktopNotice?.close();
        desktopNotice=new Notification(text,{tag:'hku-fitness-slot',requireInteraction:true});
        desktopNotice.onclick=()=>{window.focus(); dismissAlert(); document.getElementById('gCaptcha')?.scrollIntoView({behavior:'smooth',block:'center'});};
      } catch {}
    }
  }
  $('dismiss').onclick=()=>{dismissAlert();document.getElementById('gCaptcha')?.scrollIntoView({behavior:'smooth',block:'center'});};
  function sound() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      for(let i=0;i<3;i++) { const osc=audio.createOscillator(), gain=audio.createGain(); osc.connect(gain);gain.connect(audio.destination);gain.gain.value=.12;osc.frequency.value=880;osc.start(audio.currentTime+i*.3);osc.stop(audio.currentTime+i*.3+.18); }
    } catch { /* Sound is optional. */ }
  }
  function stop(message) {
    running=false; generation++; clearTimeout(timer); controller?.abort(); controller=null;
    preparation?.abort(); preparation=null;
    $('start').disabled=false; $('check').disabled=false;
    for (const k of ['center','date','time','interval','noon']) $(k).disabled=false;
    if(message) status(message);
  }
  function target() {
    if (!$('date').value) throw new Error('请选择目标日期');
    return {schema:2,center:$('center').value,date:$('date').value,time:$('time').value,interval:Math.max(10,Number($('interval').value)||30)};
  }
  async function query(t, token) {
    controller = new AbortController(); const request=controller;
    const timeout=setTimeout(()=>request.abort(),15000);
    try {
      const response=await fetch(`/Form/GetTrainingSessionsAsync2?CenterID=${encodeURIComponent(t.center)}`, {signal:request.signal,cache:'no-store',credentials:'same-origin'});
      if (!response.ok) { const e=new Error(`接口 HTTP ${response.status}`); e.fatal=[401,403,429].includes(response.status); throw e; }
      const data=await response.json();
      if(!Array.isArray(data) || data.some(s=>!s || typeof s!=='object' || !['sessionDate','sessionHourID','spaceRemaining','capacity','startTime','endTime'].every(k=>k in s) || !Number.isFinite(Number(s.spaceRemaining)))) throw new Error('接口数据格式变化，请停止使用并检查');
      if(token!==generation) return;
      rows=data; snapshotCenter=t.center; errors=0;
      dateChoices();
      sessionChoices(rows, t.date, t.time);
      const dayRows = rows.filter(s => dateKey(s.sessionDate) === t.date);
      const filtered=rows.filter(s=>matches(s,t));
      // Show all sessions on the date, even when a specific target does not match.
      $('slots').textContent=dayRows.map(s=>`${s.startTime}–${s.endTime}  ${Number(s.spaceRemaining)===99999?'Walk In':`${s.spaceRemaining}/${s.capacity} 剩余`}${available(s)?' · 可选':' · 不可选'}`).join('\n') || '该日期尚未发布场次';
      hit=filtered.find(available) || null;
      const result = hit ? '有空位，点时间按钮选场次；资料使用顶部独立按钮填写。' : !dayRows.length ? '该日期尚未发布场次，继续蹲位。' : !filtered.length ? `没有 ${t.time} 开始的场次；请选择上方时间按钮。` : '暂无空位，正在蹲位；可点满位按钮锁定时间。';
      status(`${new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Hong_Kong'})} 香港时间 · ${result}`);
      if(hit && running) {
        const found=hit; stop(); const result=await prepare();
        if(result!=='cancelled' && $('center').value === t.center && $('date').value === t.date) notifyHit(t,found);
      }
    } finally {clearTimeout(timeout); if(controller===request) controller=null;}
  }
  async function tick(t, token) {
    try {await query(t,token);} catch(e) {
      if(token!==generation) return;
      errors++; status(`查询失败：${e.message}。${e.fatal?'已停止，请稍后手动重试。':'将退避重试。'}`);
      if(e.fatal || errors>=5) {stop();status(`已停止：${e.message}。检查网络或接口后再启动。`);return;}
    }
    if(running && token===generation) timer=setTimeout(()=>tick(t,token),nextDelay(t.interval,errors));
  }
  $('start').onclick=()=>{
    try {
      const t=target(); stop(); dismissAlert(); running=true; errors=0; hit=null; $('status').classList.remove('hit'); document.title=title; rememberTarget(t); sound();
      $('start').disabled=true; $('check').disabled=true;
      for(const k of ['time','interval','noon']) $(k).disabled=true;
      const token=generation;
      if($('noon').checked) {
        const now=Date.now(), hk=new Date(now+8*3600000);
        let noon=Date.UTC(hk.getUTCFullYear(),hk.getUTCMonth(),hk.getUTCDate(),4);
        if(noon<=now) noon+=86400000;
        status(`等待 ${new Date(noon).toLocaleString('zh-CN',{timeZone:'Asia/Hong_Kong'})} 香港时间开始`);
        timer=setTimeout(()=>tick(t,token),noon-now);
      } else tick(t,token);
    } catch(e) {stop(e.message);}
  };
  $('stop').onclick=()=>{stop('已停止监测'); document.title=title;};
  $('check').onclick=async()=>{
    stop(); dismissAlert(); hit=null; $('time').value=''; $('check').disabled=true; sound();
    const token=generation;
    try {
      const t=target(); await query(t,token);
      if(token!==generation)return;
      $('any').hidden=false;
      if(!hit) { running=true; errors=0; rememberTarget(t); sound(); timer=setTimeout(()=>tick(t,token),nextDelay(t.interval)); }
    }catch(e){if(token===generation)status(`查询失败：${e.message}`);}finally{if(token===generation)$('check').disabled=false;}
  };
  $('any').onclick=()=>{$('time').value='';$('start').onclick();};
  $('notify').onclick=async()=>{
    sound();
    if(typeof Notification==='undefined' || typeof Notification.requestPermission!=='function') {status('此浏览器不支持系统通知，将使用页内提醒；已请求测试声音');return;}
    try{const p=await Notification.requestPermission();status(p==='granted'?'系统通知权限已允许；若系统不支持弹出，将使用页内提醒':p==='denied'?'系统通知已被拒绝，将使用页内提醒':'未开启系统通知，将使用页内提醒');}
    catch{status('系统通知不可用，将使用页内提醒');}
  };
  function setField(id,value) {const el=document.getElementById(id);if(!el)throw new Error(`原表单缺少 ${id}`);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  async function fillProfile() {
      for(const [id,k] of [['Email','email'],['FirstName','name'],['MemberID','member']]) if(!$(k).value.trim()) $(k).value = document.getElementById(id)?.value || '';
      const p={email:$('email').value.trim(),name:$('name').value.trim(),member:$('member').value.trim()};
      if(!p.email || !p.name || !p.member || !$('email').checkValidity()) throw new Error('请填写有效邮箱、姓名和学号 / 员工号');
      for(const [id,k] of [['Email','email'],['FirstName','name'],['MemberID','member']]) setField(id,p[k]);
      try {if($('remember').checked) await put('fitness:profile',p); else await erase('fitness:profile');}
      catch {throw new Error('资料已填入原表单，但保存 / 删除失败，请重试');}
  }
  $('fill').onclick=async()=>{try{await fillProfile();status('资料已填写；可继续选场次或蹲位');}catch(e){$('profile').open=true;status(e.message);}};
  $('remember').onchange=async()=>{if(!$('remember').checked)try{await erase('fitness:profile');}catch{status('删除已存资料失败，请重试');}};
  $('forget').onclick=async()=>{try{await erase('fitness:profile');for(const k of ['email','name','member'])$(k).value='';$('remember').checked=false;status('已清除脚本保存的资料；原表单内容未清除');}catch{status('删除已存资料失败，请重试');}};
  for(const k of ['center','date','time']) $(k).onchange=()=>{
    stop(); dismissAlert(); hit=null;
    if(k !== 'time') {rows=[];sessionChoices([], $('date').value);}
    $('slots').textContent='';$('any').hidden=true;status('目标已更改，请重新查询');
    dateChoices();
    if(k !== 'time') return $('check').onclick();
  };
  function refreshNativeSessions(center, signal) {
    return new Promise((resolve,reject)=>{
      const all=document.getElementById('AllSessions');
      if(!all) {reject(new Error('原表单缺少场次列表，请刷新页面'));return;}
      let observer, timeout;
      const cleanup=()=>{observer?.disconnect();clearTimeout(timeout);signal.removeEventListener('abort',cancel);};
      const cancel=()=>{cleanup();reject(new Error('已取消场次选择'));};
      observer=new MutationObserver(()=>{
        // The site's centre onchange handler owns the options, labels and availability rules.
        cleanup();resolve();
      });
      observer.observe(all,{childList:true,subtree:true});
      signal.addEventListener('abort',cancel,{once:true});
      timeout=setTimeout(()=>{cleanup();reject(new Error('原网页加载场次超时，请重试'));},15000);
      try {setField('CenterID',center);} catch(e) {cleanup();reject(e);}
    });
  }
  async function prepare() {
    let attempt;
    try {
      const t=target();
      if(!hit || snapshotCenter!==t.center || !matches(hit,t))throw new Error('请先查询并找到符合目标的可订场次');
      const selected={...hit};
      stop();
      preparation=new AbortController();attempt=preparation;
      status('正在通过原网页选择场次…');
      await refreshNativeSessions(t.center,attempt.signal);
      if(attempt.signal.aborted)return 'cancelled';
      const dates=document.getElementById('DateList'), times=document.getElementById('SessionTime');
      if(document.getElementById('CenterID').value!==t.center)throw new Error('原网页场馆已更改，请重新选场次');
      const dateOption=Array.from(dates.options).find(o=>dateKey(o.value)===t.date && !o.disabled);
      if(!dateOption)throw new Error('原网页尚未提供该日期，请重新查询');
      setField('DateList',dateOption.value);
      const timeOption=Array.from(times.options).find(o=>o.value===String(selected.sessionHourID) && !o.disabled);
      if(!timeOption)throw new Error('原网页显示该场次已不可订，请重新查询');
      setField('SessionTime',timeOption.value);
      status(`场次已选入：${dateLabel(t.date)}。资料请点顶部「填写资料」，然后完成声明和验证码。`);
      sessionChoices(rows,t.date,t.time || timeKey(selected.startTime));
      (document.getElementById('gCaptcha') || document.getElementById('SessionTime')).scrollIntoView({behavior:'smooth',block:'center'});
      return true;
    }catch(e){if(!attempt?.signal.aborted)status(e.message);return attempt?.signal.aborted?'cancelled':false;}
    finally{if(preparation===attempt)preparation=null;}
  }
  document.querySelector('#sbmtBtn')?.addEventListener('click',()=>stop('已停止监测；预约结果以原网站返回页面为准'),{capture:true});
  window.addEventListener('pagehide',()=>stop());
})().catch(error=>console.error('HKU Fitness Watcher 初始化失败',error));
