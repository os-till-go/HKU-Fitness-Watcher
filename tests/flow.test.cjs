const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
// Lightweight browser adapter: exercise request cancellation and form writes without real bookings.
function harness(fetcher, savedTarget, nativeSettings={}) {
  const elements=new Map(), timers=new Map(), storage=new Map(), notices=[];let serial=0;
  const observers=new Set(), nativeQueue=[];let nativeData=[], lastRequest=0;
  class MutationObserver {
    constructor(callback){this.callback=callback;}
    observe(){observers.add(this);}
    disconnect(){observers.delete(this);}
  }
  const key=value=>value.replaceAll('/','-');
  function nativeTimes() {
    const times=elements.get('SessionTime');times.replaceChildren();
    for(const s of nativeData.filter(s=>s.sessionDate===elements.get('DateList').value)) {
      const option={value:String(s.sessionHourID),text:`${s.startTime} - ${s.endTime}`,disabled:(nativeSettings.remaining ?? s.spaceRemaining)<=0};
      times.add(option);
    }
  }
  function nativeRefresh() {
    const dates=elements.get('DateList'), all=elements.get('AllSessions');dates.replaceChildren();all.replaceChildren();
    for(const s of nativeData) {
      if(!dates.children.some(o=>o.value===s.sessionDate)) {
        const weekday=new Date(key(s.sessionDate)+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'});
        dates.add({value:s.sessionDate,text:`${s.date || key(s.sessionDate)} ${weekday}`,disabled:false});
      }
      all.add({value:`${s.sessionDate}:${s.sessionHourID}`,text:'Native session'});
    }
    dates.value=dates.children[0]?.value || '';nativeTimes();
    const notify=()=>{for(const observer of [...observers])observer.callback();};
    if(nativeSettings.defer)nativeQueue.push(notify);else queueMicrotask(notify);
  }
  if(savedTarget) storage.set('fitness:target',JSON.stringify(savedTarget));
  function element(id='') {
    return {id,value:'',checked:false,disabled:false,textContent:'',children:[],
      get options(){return this.children;},
      classList:{add(){},remove(){}}, addEventListener(){},dispatchEvent(event){if(event.type==='change'){if(id==='CenterID')nativeRefresh();if(id==='DateList')nativeTimes();}},scrollIntoView(){},checkValidity(){return true;},
      replaceChildren(...children){this.children=children;},add(option){this.children.push(option);},append(...children){this.children.push(...children);},
      attachShadow(){return {set innerHTML(html){for(const match of html.matchAll(/id="([^"]+)"/g))elements.set(match[1],element(match[1]));},getElementById(id){return elements.get(id);}};}};
  }
  for(const id of ['CenterID','DateList','SessionTime','AllSessions','Email','FirstName','MemberID','sbmtBtn','stuStfOnly'])elements.set(id,element(id));
  const document={title:'Booking',body:element(),querySelector:s=>elements.get(s.slice(1)),getElementById:id=>elements.get(id),createElement:()=>element()};
  class Notification {
    static permission='granted';
    constructor(title,options){this.title=title;this.options=options;this.closed=false;notices.push(this);}
    close(){this.closed=true;}
  }
  const context={document,location:{hostname:'localhost'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    window:{addEventListener(){},focus(){}},Notification,Intl,Date,Event:class {constructor(type){this.type=type;}},Option:class {constructor(text,value){this.text=text;this.value=value;}},MutationObserver,
    AbortController,fetch:async(...args)=>{const request=++lastRequest;const response=await fetcher(...args);return {...response,json:async()=>{const data=await response.json();if(request===lastRequest)nativeData=data;return data;}};}, setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync(require.resolve('../fitness-watcher.user.js'),'utf8'),context);
  const defaults={center:elements.get('center').value,time:elements.get('time').value};
  elements.get('center').value='10001';elements.get('date').value='2026-11-09';elements.get('time').value='17:00';elements.get('interval').value='10';
  return {elements,timers,storage,document,defaults,notices,flushNative:()=>{for(const fn of nativeQueue.splice(0))fn();}};
}
const session=remaining=>({sessionDate:'2026/11/09',date:'09/11/2026',sessionHourID:10143,startTime:'1700',endTime:'1830',spaceRemaining:remaining,capacity:60,sessionStatus:'10'});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('full → release stops polling, applies exact slot, never accepts declaration or submits', async()=>{
  let calls=0;
  const h=harness(async()=>({ok:true,json:async()=>[session(++calls===1?0:1)]}));
  h.elements.get('start').onclick();await settle();
  assert.equal(calls,1);assert.equal(h.timers.size,1);
  const [id,timer]=[...h.timers][0];h.timers.delete(id);timer.fn();await settle();
  assert.equal(calls,2);assert.equal(h.timers.size,0);
  assert.match(h.elements.get('status').textContent,/场次已选入/);
  assert.equal(h.elements.get('DateList').value,'2026/11/09');
  assert.equal(h.elements.get('SessionTime').value,'10143');
  assert.equal(h.elements.get('CenterID').value,'10001');
  assert.equal(h.elements.get('alert').hidden,false);
  assert.equal(h.elements.get('alert-text').textContent,'11.9 MON 星期一 17:00–18:30 CSE Active 有空位！');
});
test('stop prevents a late response from alerting or replacing last result',async()=>{
  let release;
  const h=harness(()=>new Promise(resolve=>{release=resolve;}));
  h.elements.get('start').onclick();h.elements.get('stop').onclick();
  release({ok:true,json:async()=>[session(1)]});await settle();
  assert.equal(h.elements.get('status').textContent,'已停止监测');assert.equal(h.timers.size,0);
});
test('429 stops instead of retrying',async()=>{
  const h=harness(async()=>({ok:false,status:429}));
  h.elements.get('start').onclick();await settle();
  assert.equal(h.timers.size,0);assert.match(h.elements.get('status').textContent,/已停止.*429/);
});
test('profile storage is opt-in and clears when unchecked',()=>{
  const h=harness(()=>{});
  for(const [id,value] of [['email','demo@example.com'],['name','Demo'],['member','1234567890']])h.elements.get(id).value=value;
  h.elements.get('fill').onclick();assert.equal(h.storage.has('fitness:profile'),false);
  assert.equal(h.elements.get('MemberID').value,'1234567890');
  h.elements.get('remember').checked=true;h.elements.get('fill').onclick();assert.equal(h.storage.has('fitness:profile'),true);
  h.elements.get('remember').checked=false;h.elements.get('remember').onchange();assert.equal(h.storage.has('fitness:profile'),false);
});
test('default B-Active, any session; migrate accidental legacy clock input',()=>{
  for(const saved of [undefined,{center:'10001',time:'15:49',date:'2026-11-09'}]) {
    const h=harness(()=>{},saved);
    assert.equal(h.defaults.center,'10002');
    assert.equal(h.defaults.time,'');
  }
});
test('any session finds 17:00 availability and loads actual choices',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(4)]}));
  h.elements.get('time').value='';
  await h.elements.get('check').onclick();
  assert.match(h.elements.get('status').textContent,/有空位/);
  assert.equal(h.elements.get('choices').children.length,1);
  assert.match(h.elements.get('choices').children[0].textContent,/17:00.*18:30/);
});
test('query resets obsolete clock filter and exposes actual available session buttons',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(4)]}));
  h.elements.get('time').value='15:49';
  await h.elements.get('check').onclick();
  assert.match(h.elements.get('status').textContent,/有空位/);
  assert.match(h.elements.get('slots').textContent,/1700.*4\/60.*可选/);
});
function profile(h) {
  for(const [id,value] of [['email','demo@example.com'],['name','Demo'],['member','1234567890']])h.elements.get(id).value=value;
}
test('slot selection and the top profile button operate independently',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(4)]})); profile(h);
  await h.elements.get('check').onclick();
  await h.elements.get('choices').children[0].onclick();
  assert.equal(h.elements.get('SessionTime').value,'10143');
  assert.equal(h.elements.get('MemberID').value,'');
  assert.match(h.elements.get('status').textContent,/场次已选入/);
  h.elements.get('fill').onclick();
  assert.equal(h.elements.get('MemberID').value,'1234567890');
  assert.match(h.elements.get('status').textContent,/资料已填写/);
  assert.equal(h.timers.size,0);
});
test('release selects slot without filling profile; alert remains until dismissed',async()=>{
  let calls=0;
  const h=harness(async()=>({ok:true,json:async()=>[session(++calls===1?0:1)]})); profile(h);
  await h.elements.get('check').onclick();
  assert.equal(h.timers.size,1);
  const [id,timer]=[...h.timers][0];h.timers.delete(id);timer.fn();await settle();
  assert.equal(h.elements.get('SessionTime').value,'10143');
  assert.equal(h.elements.get('Email').value,'');
  assert.equal(h.timers.size,0);
  assert.equal(h.elements.get('alert').hidden,false);
  assert.equal(h.notices.length,1);
  assert.equal(h.notices[0].title,'11.9 MON 星期一 17:00–18:30 CSE Active 有空位！');
  assert.equal(h.notices[0].options.requireInteraction,true);
  assert.equal(h.notices[0].closed,false);
  h.elements.get('dismiss').onclick();assert.equal(h.elements.get('alert').hidden,true);
  assert.equal(h.notices[0].closed,true);
});
test('clicking a full time button locks monitoring to that session',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(0),{...session(3),startTime:'1845',sessionHourID:10144}]})); profile(h);
  await h.elements.get('check').onclick();
  h.elements.get('choices').children[0].onclick();await settle();
  assert.equal(h.elements.get('SessionTime').value,'');
  assert.equal(h.timers.size,1);
  assert.equal(JSON.parse(h.storage.get('fitness:target')).time,'1700');
});
test('date remains editable during monitoring; day button switches and queries automatically',async()=>{
  const data=[session(0),{...session(3),sessionDate:'2026/11/10',date:'10/11/2026'}];
  let calls=0;
  const h=harness(async()=>{calls++;return {ok:true,json:async()=>data};});
  h.elements.get('start').onclick();await settle();
  assert.equal(h.elements.get('date').disabled,false);
  assert.equal(h.elements.get('center').disabled,false);
  assert.equal(h.timers.size,1);
  const nextDay=h.elements.get('dates').children.find(b=>b.textContent==='11.10 TUE 星期二');
  assert.ok(nextDay);
  await nextDay.onclick();
  assert.equal(h.elements.get('date').value,'2026-11-10');
  assert.equal(calls,2);
  assert.equal(h.timers.size,0);
  assert.equal(h.elements.get('date-label').textContent,'11.10 TUE 星期二');
  assert.match(h.elements.get('status').textContent,/有空位/);
});
test('changing date ignores late response from previous date and cancels old monitoring',async()=>{
  let resolveOld, calls=0;
  const h=harness(()=>{
    if(++calls===1)return new Promise(resolve=>{resolveOld=resolve;});
    return Promise.resolve({ok:true,json:async()=>[{...session(3),sessionDate:'2026/11/10'}]});
  });
  h.elements.get('start').onclick();
  h.elements.get('date').value='2026-11-10';await h.elements.get('date').onchange();
  resolveOld({ok:true,json:async()=>[session(4)]});await settle();
  assert.equal(h.notices.length,0);
  assert.equal(h.elements.get('date-label').textContent,'11.10 TUE 星期二');
  await h.elements.get('choices').children[0].onclick();
  assert.equal(h.elements.get('DateList').value,'2026/11/10');
  assert.equal(h.timers.size,0);
});
test('top fill button works before any session query and leaves slot selection unchanged',()=>{
  const h=harness(()=>{throw new Error('should not query');});profile(h);
  h.elements.get('fill').onclick();
  assert.equal(h.elements.get('Email').value,'demo@example.com');
  assert.equal(h.elements.get('SessionTime').value,'');
});
test('native date labels and native option structure survive selection',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(3)]}));
  await h.elements.get('check').onclick();
  await h.elements.get('choices').children[0].onclick();
  assert.equal(h.elements.get('DateList').options[0].text,'09/11/2026 Monday');
  assert.equal(h.elements.get('AllSessions').options[0].text,'Native session');
  h.elements.get('DateList').dispatchEvent({type:'change'});
  assert.equal(h.elements.get('SessionTime').options[0].value,'10143');
});
test('native site availability wins over older watcher availability',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(3)]}),undefined,{remaining:0});
  await h.elements.get('check').onclick();
  await h.elements.get('choices').children[0].onclick();
  assert.match(h.elements.get('status').textContent,/原网页显示该场次已不可订/);
  assert.notEqual(h.elements.get('SessionTime').value,'10143');
});
test('stop cancels in-progress native selection and ignores delayed option notifications',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>[session(3)]}),undefined,{defer:true});
  await h.elements.get('check').onclick();
  const preparing=h.elements.get('choices').children[0].onclick();
  h.elements.get('stop').onclick();h.flushNative();await preparing;
  assert.equal(h.elements.get('status').textContent,'已停止监测');
  assert.equal(h.elements.get('SessionTime').value,'');
  assert.equal(h.timers.size,0);
});
