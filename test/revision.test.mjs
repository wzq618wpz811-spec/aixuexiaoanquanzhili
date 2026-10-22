import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
import {DeepSeekPlanner} from '../src/visual-pipeline.mjs';

test('已有专业归并、同名去重、新课程导入即登记且未审核题不向学生泄露',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-import-course-'));
 const app=createApp({dataDir:dir,majorBank:{majors:()=>[{name:'工商管理'}],major:n=>n==='工商管理'?{name:n}:null}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
 async function api(role,route,body){const r=await fetch(base+'/api/'+role+'/'+route,{...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}),headers:{'Content-Type':'application/json',Cookie:cookie}});if(route==='login')cookie=r.headers.get('set-cookie')?.split(';')[0]||'';return {status:r.status,data:await r.json()};}
 try{
  await api('teacher','login',{password:'123456'});assert.equal((await api('teacher','state')).data.stats.review,0);
  const source={stem:'专业导入测试',options:['甲','乙'],answer:0};
  const known=await api('teacher','import',{major:'　工商管理　',text:JSON.stringify([source])});assert.equal(known.data.added,1);assert.equal(app.store.get(known.data.ids[0]).source.majorName,'工商管理');
  const fresh=await api('teacher','import',{major:'新增课程',text:JSON.stringify([source])});assert.equal(fresh.data.added,1);
  assert.equal((await api('teacher','import',{major:' 新增课程 ',text:JSON.stringify([source])})).data.duplicates,1);
  const list=(await api('student','majors')).data.majors;assert.equal(list.filter(m=>m.name==='工商管理').length,1);assert.equal(list.filter(m=>m.name==='新增课程').length,1);
  assert.equal((await api('student','login',{username:'student01',password:'123456',major:'新增课程'})).status,200);assert.equal((await api('student','home')).data.available,0);assert.equal((await api('student','runs',{})).status,409);
 }finally{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
});

test('教师修订闭环：保存选项、意见传入AI、失败保留、版本保护、再次审核发布',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-revision-'));let fail=false,received;
 const provider={generate:async(source,options)=>{received={source,options};if(fail)throw Error('服务不可用');return {provider:'visual-pipeline-v1',stem:source.stem,options:source.options.map(text=>({text})),answer:source.answer,explanation:source.explanation,sourceUrl:source.sourceUrl,type:'illustrated',route:'R1',visual:{kind:'generated',image:'assets/offline/wet-hands.png'},issues:[],plan:{revisionSummary:'手机移至画面中央'}};}};
 const app=createApp({dataDir:dir,provider,jobDelay:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let cookie;
 async function api(route,body){const r=await fetch(base+'/api/teacher/'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie||''},body:JSON.stringify(body)});if(route==='login')cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 async function finish(){for(let i=0;i<200;i++){if(!['queued','running'].includes(app.store.jobs()[0]?.status))return;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');}
 try{
  await api('login',{password:'123456'});
  const source={stem:'演示题',options:['做法甲','做法乙'],answer:0,explanation:'演示解析',sourceUrl:'https://example.org/demo',majorName:'演示课程'};
  const imported=await api('import',{text:JSON.stringify([source]),major:'演示课程'}),id=imported.data.ids[0];
  await api('generate',{ids:[id]});await finish();let q=app.store.get(id);assert.equal(q.status,'review');
  const saved=await api('questions/'+id+'/draft',{version:q.version,stem:'修改后的演示题',options:['修改甲','做法乙'],answer:'0',explanation:'修改解析',sourceUrl:source.sourceUrl,note:'手动修订'});assert.equal(saved.status,200);q=saved.data;
  assert.equal(q.source.stem,'演示题');assert.equal(q.candidate.options[0].text,'修改甲');
  assert.equal((await api('questions/'+id+'/revise',{version:q.version-1,feedback:'手机移至中央'})).status,400);
  await api('questions/'+id+'/revise',{version:q.version,feedback:'手机移至中央'});await finish();
  assert.equal(received.options.feedback,'手机移至中央');assert.equal(received.source.options[0],'修改甲');assert.ok(received.options.previous);
  q=app.store.get(id);assert.equal(q.status,'review');const version=q.version,prior=q.candidate;
  fail=true;await api('questions/'+id+'/revise',{version,feedback:'进一步调整'});await finish();q=app.store.get(id);assert.equal(q.version,version);assert.deepEqual(q.candidate,prior);assert.equal(q.status,'review');assert.match(q.error,/服务不可用/);
  const approved=await api('questions/'+id+'/review',{action:'approve',stem:q.candidate.stem,answer:'0',explanation:'审核解析',sourceUrl:source.sourceUrl,note:'演示审核通过'});assert.equal(approved.data.status,'published');
  assert.equal((await api('questions/'+id+'/revise',{version:approved.data.version,feedback:'绕过撤回'})).status,400);
 }finally{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
});

test('规划请求真实包含教师意见与上一版方案',async()=>{
 const savedFetch=globalThis.fetch;let payload;
 globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({route:'R1',sceneDescription:'手机中央特写',revisionSummary:'已放大手机'})}}]})};};
 try{const planner=new DeepSeekPlanner({apiKey:'test',endpoint:'https://example.org'});await planner.plan({stem:'题',options:['甲','乙'],answer:0},{feedback:'放大手机',previous:{plan:{sceneDescription:'原图'}}});const request=JSON.parse(payload.messages[1].content);assert.equal(request.teacherFeedback,'放大手机');assert.equal(request.previousPlan.sceneDescription,'原图');}finally{globalThis.fetch=savedFetch;}
});
