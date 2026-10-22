import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
import {VisualProvider} from '../src/visual-pipeline.mjs';
const fixture=i=>({sourceQuestionId:'BATCH-'+i,stem:'工商管理测试题 '+i,options:['做法甲','做法乙'],answer:0,majorName:'工商管理',topic:'测试',sourceUrl:'https://example.org/test',explanation:'测试参考解释'});
const candidate=(q,issues=[])=>({provider:'visual-pipeline-v1',route:'R1',stem:q.stem,options:q.options.map(text=>({text})),answer:q.answer,type:'illustrated',visual:{image:'assets/offline/'+['wet-hands','cable-check','evacuation','fire-equipment','first-aid','glass-waste','report','training','chemical-storage','computer-security'][Number(q.sourceQuestionId.split('-').at(-1))%10]+'.png',kind:'generated'},issues,explanation:q.explanation,checks:[]});
async function setup(provider,pick){const dir=mkdtempSync(path.join(tmpdir(),'zhian-batch-'));const app=createApp({dataDir:dir,majorBank:{majors:()=>[{name:'工商管理',scenario:'公共机房'}],major:n=>n==='工商管理'?{name:n}:null,pick},provider,jobDelay:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const cookies={};for(const role of ['student','teacher']){const login=await fetch(base+'/api/'+role+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(role==='student'?{username:'student01',password:'123456',major:'工商管理'}:{password:'123456'})});cookies[role]=login.headers.get('set-cookie').split(';')[0];}
 const request=async(role,route,body)=>{const res=await fetch(base+'/api/'+role+'/'+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookies[role],...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(route==='login'&&res.ok)cookies[role]=res.headers.get('set-cookie').split(';')[0];return {status:res.status,data:await res.json()};};
 const call=async(role,route,body)=>{const r=await request(role,route,body);assert.ok(r.status<300,r.data.error);return r.data;};
 const finish=async()=>{for(let i=0;i<200;i++){if(!['queued','running'].includes(app.store.jobs()[0]?.status))return;await new Promise(r=>setTimeout(r,10));}throw new Error('任务未完成');};
 const approve=q=>app.store.review(q.id,{action:'approve',note:'临时测试：已核对图像和答案',stem:q.candidate.stem,answer:'0',explanation:'测试解释',sourceUrl:'https://example.org/test'});
 return {app,request,call,finish,approve,close:async()=>{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}};
}
test('学生最多抽10道正式题，少于10道可练习，未审题不参与且学生不调用AI',async()=>{
 let generated=0;const x=await setup({generate:async q=>{generated++;return candidate(q)}},(_major,count)=>{assert.equal(count,10);return Array.from({length:10},(_,i)=>fixture(i))});
 try{
  assert.equal((await x.request('student','prepare',{})).status,403);
  assert.equal((await x.request('student','type-samples')).status,404);
  const batch=await x.call('teacher','prepare-major',{major:'工商管理'});await x.finish();assert.equal(batch.total,10);assert.equal(generated,10);
  assert.equal(x.app.store.stats().published,0);
  assert.equal((await x.request('student','runs',{preview:true})).status,409);
  for(const q of x.app.store.all().slice(0,9))x.approve(q);
  const small=await x.call('student','runs',{});assert.equal(small.cards.length,9);assert.equal(small.settings.batchSize,9);assert.ok(small.cards.every(c=>x.app.store.get(c.id).status==='published'));
  x.approve(x.app.store.all().find(q=>q.status==='review'));
  const run=await x.call('student','runs',{preview:true,ids:['unapproved']});assert.equal(run.cards.length,10);assert.equal(run.settings.batchSize,10);assert.ok(!('preview'in run));assert.ok(run.cards.every(c=>!('reviewIssues'in c)&&!('answer'in c)));
  for(const q of run.cards)await x.call('student','runs/'+run.id+'/selection',{questionId:q.id,selection:0});
  await x.call('student','runs/'+run.id+'/submit',{});assert.equal(x.app.store.stats().attempts,10);
  for(let i=0;i<3;i++)await x.call('student','home');assert.equal(generated,10);
  const reused=await x.call('teacher','prepare-major',{major:'工商管理',retryBatchId:batch.id});assert.equal(reused.reused,10);assert.equal(generated,10);
  x.app.store.withdraw(run.cards[0].id);const afterWithdraw=await x.call('student','runs',{});assert.equal(afterWithdraw.cards.length,9);assert.ok(afterWithdraw.cards.every(c=>c.id!==run.cards[0].id));
 }finally{await x.close();}
});
test('教师批次额度不足时只尝试一道便暂停，重试不重新抽题',async()=>{
 let generated=0,picked=0,blocked=true;const x=await setup({generate:async q=>{generated++;return blocked?{...candidate(q,['Free quota exhausted']),visual:null}:candidate(q)}},()=>{picked++;return Array.from({length:10},(_,i)=>fixture(i))});
 try{const batch=await x.call('teacher','prepare-major',{major:'工商管理'});await x.finish();assert.equal(generated,1);assert.equal(x.app.store.jobs()[0].quotaBlocked,true);blocked=false;await x.call('teacher','prepare-major',{major:'工商管理',retryBatchId:batch.id});await x.finish();assert.equal(generated,11);assert.equal(picked,1);assert.equal((await x.call('student','home')).available,0);}finally{await x.close();}
});
test('本地缓存跨生成器实例和专业复用，答案变化会失效',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-image-cache-')),assetsRoot=path.join(dir,'web');mkdirSync(path.join(assetsRoot,'assets'),{recursive:true});copyFileSync('web/assets/blank-book.png',path.join(assetsRoot,'assets/blank-book.png'));
 let plans=0,images=0;const planner={model:'test-planner',available:()=>true,plan:async()=>{plans++;return {route:'R1',sceneDescription:'共同场景',issues:[]}},audit:async()=>({pass:true,issues:[]})},imageService={model:'test-image',available:()=>true,generate:async()=>{images++;return {relative:'assets/blank-book.png',bytes:Buffer.from([])}}};
 const options={planner,imageService,cacheDir:path.join(dir,'cache'),assetsRoot};
 try{const source=fixture(0);await new VisualProvider(options).generate(source);const cached=await new VisualProvider(options).generate({...source,majorName:'会计学'});assert.equal(cached.cacheHit,true);assert.equal(images,1);assert.equal(plans,1);await new VisualProvider(options).generate({...source,answer:1});assert.equal(images,2);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('导入即登记新专业，只有审核发布的题可学，不能伪造专业绕过',async()=>{
 const x=await setup({generate:async q=>candidate(q)},()=>[]);
 try{
  await x.call('teacher','import',{major:'数字经济',text:JSON.stringify(Array.from({length:10},(_,i)=>fixture(i)))});
  const imported=x.app.store.all();assert.ok(imported.every(q=>q.source.majorName==='数字经济'));
  for(const q of imported)x.app.store.applyCandidate(q.id,candidate(q.source));
  assert.equal((await x.call('student','majors')).majors.some(m=>m.name==='数字经济'),true);
  assert.equal((await x.request('student','login',{username:'student01',password:'123456',major:'数字经济'})).status,200);assert.equal((await x.call('student','home')).available,0);assert.equal((await x.request('student','runs',{})).status,409);
  await x.call('student','login',{username:'student01',password:'123456',major:'工商管理'});
  for(const q of x.app.store.all())x.approve(q);
  assert.equal((await x.call('student','majors')).majors.some(m=>m.name==='数字经济'),true);
  assert.equal((await x.request('student','runs',{major:'数字经济'})).status,409);
  assert.equal((await x.request('student','login',{username:'student01',password:'123456',major:'数字经济'})).status,200);
  assert.equal(x.app.learning.start('digital-student',{major:'数字经济'}).cards.length,10);
 }finally{await x.close();}
});

test('新专业发布后立即可练习：1、2、9、10、11、12道分别抽1、2、9、10、10、10道，发布意见选填',async()=>{
 let generated=0;const x=await setup({generate:async q=>{generated++;const c=candidate(q);return q.majorName==='演示课程12'?{...c,knowledgePointId:'共享演示考点',visual:{kind:'generated',image:'assets/blank-book.png'}}:c}},()=>[]);
 try{
  for(const count of [1,2,9,10,11,12]){
   const major='演示课程'+count;
   const imported=await x.call('teacher','import',{major,text:JSON.stringify(Array.from({length:count},(_,i)=>({...fixture(i),stem:major+'第'+i+'题'})))});
   await x.call('teacher','generate',{ids:imported.ids});await x.finish();
   await x.call('student','login',{username:'student01',password:'123456',major});
   assert.equal((await x.call('student','home')).available,0);assert.equal((await x.request('student','runs',{})).status,409);
   for(const [i,id] of imported.ids.entries()){
    let q=x.app.store.get(id);
    if(i===0){const rejected=await x.request('teacher','questions/'+id+'/review',{action:'reject'});assert.ok(rejected.status>=400);assert.match(rejected.data.error,/处理说明/);}
    q=await x.call('teacher','questions/'+id+'/draft',{version:q.version,stem:q.candidate.stem,options:q.candidate.options.map(o=>o.text),answer:'0',explanation:'教师已核对解析'});
    const approved=await x.call('teacher','questions/'+id+'/review',{action:'approve',stem:q.candidate.stem,answer:'0',explanation:q.candidate.explanation});
    assert.equal(approved.status,'published');assert.equal(approved.history.at(-1).note,'');
    if(i===0){const immediate=await x.call('student','runs',{});assert.equal(immediate.cards.length,1);assert.equal(immediate.cards[0].id,id);}
   }
   const expected=Math.min(count,10),home=await x.call('student','home');assert.equal(home.available,count);assert.equal(home.settings.batchSize,expected);
   const run=await x.call('student','runs',{});assert.equal(run.cards.length,expected);assert.equal(run.settings.batchSize,expected);assert.equal(new Set(run.cards.map(q=>q.id)).size,expected);assert.ok(run.cards.every(q=>imported.ids.includes(q.id)));
   for(const q of run.cards)await x.call('student','runs/'+run.id+'/selection',{questionId:q.id,selection:0});
   const submitted=await x.call('student','runs/'+run.id+'/submit',{});assert.equal(submitted.results.length,expected);assert.ok(submitted.results.every(r=>r.correct));
  }
  assert.equal(generated,45,'学生练习不触发额外在线生成');
 }finally{await x.close();}
});
