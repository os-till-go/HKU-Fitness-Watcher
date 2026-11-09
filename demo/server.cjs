const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let count = 0;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>HKU Fitness Watcher 模拟试用</title>
<style>body{font:16px system-ui;background:#edf2f4;color:#203344;padding:40px;margin-right:390px}main{max-width:640px}label{display:block;margin:20px 0}input,select{display:block;padding:10px;width:100%;max-width:420px}button{padding:12px}aside{padding:16px;background:#fff0c8;border-radius:10px}</style>
<main><h1>Fitness Watcher · 模拟报名页</h1><aside>仅本地模拟，不连接 HKU，不产生预约。前三次查询满位，第四次放出一个名额。目标日期请选今天，时间 17:00；也可留空时间。</aside>
<form id="demo-form"><label>Email<input id="Email" type="email"></label><label>Name<input id="FirstName"></label><label>Member ID<input id="MemberID"></label>
<label>Centre<select id="CenterID"><option value="10001">CSE Active</option><option value="10002">HKU B-Active</option></select></label>
<label>Date<select id="DateList"><option value="0">请选择</option></select></label><label>Time<select id="SessionTime"><option value="0">请选择</option></select></label><select id="AllSessions" hidden></select>
<label><input id="dataCollection" type="checkbox" style="display:inline;width:auto"> 模拟声明（需自行勾选）</label><p>这里代表人工验证码区域，未提供自动验证。</p><button id="sbmtBtn" type="submit">模拟提交</button><p id="result"></p></form></main>
<script>
document.getElementById('demo-form').addEventListener('submit',e=>{e.preventDefault();document.getElementById('result').textContent='模拟提交完成，没有产生真实预约';});
let nativeRows=[];
const nativeDates=document.getElementById('DateList'), nativeTimes=document.getElementById('SessionTime'), nativeAll=document.getElementById('AllSessions');
function updateNativeTimes(){
  nativeTimes.replaceChildren();
  for(const s of nativeRows.filter(s=>s.sessionDate===nativeDates.value)){
    const op=new Option(s.startTime+' - '+s.endTime+' ('+s.spaceRemaining+'/'+s.capacity+')',s.sessionHourID);
    op.disabled=s.spaceRemaining<=0;nativeTimes.add(op);
  }
}
nativeDates.addEventListener('change',updateNativeTimes);
document.getElementById('CenterID').addEventListener('change',async e=>{
  try{
    const response=await fetch('/Form/GetTrainingSessionsAsync2?CenterID='+e.target.value);
    nativeRows=await response.json();nativeDates.replaceChildren();nativeAll.replaceChildren();
    for(const s of nativeRows){
      if(!Array.from(nativeDates.options).some(o=>o.value===s.sessionDate)){
        const day=new Date(s.sessionDate.replaceAll('/','-')+'T00:00:00Z');
        nativeDates.add(new Option(day.toLocaleDateString('en-GB',{timeZone:'UTC'})+' '+day.toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'}),s.sessionDate));
      }
      nativeAll.add(new Option(s.startTime+' - '+s.endTime,s.sessionDate+':'+s.sessionHourID));
    }
    updateNativeTimes();
  }catch{document.getElementById('result').textContent='模拟原表单加载失败';}
});
</script>
<script src="/fitness-watcher.user.js"></script></html>`;
http.createServer((req,res)=>{
  if(req.url==='/fitness-watcher.user.js') {res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(fs.readFileSync(path.join(__dirname,'../fitness-watcher.user.js')));}
  if(req.url.startsWith('/Form/GetTrainingSessionsAsync2?')) {
    count++;
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    return res.end(JSON.stringify([{sessionDate:today.replaceAll('-','/'),date:today,dayOfWeek:'',sessionHourID:10143,startTime:'1700',endTime:'1830',spaceRemaining:count>=4?1:0,capacity:60,sessionStatus:'10'}]));
  }
  if(req.url!=='/') {res.statusCode=404;return res.end('Not found');}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
}).listen(8765,'127.0.0.1',()=>console.log('Demo: http://localhost:8765 (simulation only)'));
