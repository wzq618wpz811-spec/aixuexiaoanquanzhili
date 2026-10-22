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
test('学生仅抽10道正式题；未审题不能凑数；刷新和作答不调用AI',async()=>{
 let generated=0;const x=await setup({generate:async q=>{generated++;return candidate(q)}},(_major,count)=>{assert.equal(count,10);return Array.from({length:10},(_,i)=>fixture(i))});
 try{
  assert.equal((await x.request('student','prepare',{})).status,403);
  assert.equal((await x.request('student','type-samples')).status,404);
  const batch=await x.call('teacher','prepare-major',{major:'工商管理'});await x.finish();assert.equal(batch.total,10);assert.equal(generated,10);
  assert.equal(x.app.store.stats().published,0);
  assert.equal((await x.request('student','runs',{preview:true})).status,409);
  for(const q of x.app.store.all().slice(0,9))x.approve(q);
  assert.equal((await x.request('student','runs',{})).status,409);
  x.approve(x.app.store.all().find(q=>q.status==='review'));
  const run=await x.call('student','runs',{preview:true,ids:['unapproved']});assert.equal(run.cards.length,10);assert.equal(run.settings.batchSize,10);assert.ok(!('preview'in run));assert.ok(run.cards.every(c=>!('reviewIssues'in c)&&!('answer'in c)));
  for(const q of run.cards)await x.call('student','runs/'+run.id+'/selection',{questionId:q.id,selection:0});
  await x.call('student','runs/'+run.id+'/submit',{});assert.equal(x.app.store.stats().attempts,10);
  for(let i=0;i<3;i++)await x.call('student','home');assert.equal(generated,10);
  const reused=await x.call('teacher','prepare-major',{major:'工商管理',retryBatchId:batch.id});assert.equal(reused.reused,10);assert.equal(generated,10);
  x.app.store.withdraw(run.cards[0].id);assert.equal((await x.request('student','runs',{})).status,409);
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
