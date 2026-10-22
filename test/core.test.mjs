import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Store,parseInput} from '../src/store.mjs';
import {Learning,grade} from '../src/learning.mjs';
import {DemoProvider} from '../src/provider.mjs';
import {sampleText,samples} from '../src/catalog.mjs';
import {createApp} from '../server.mjs';
const temp=()=>mkdtempSync(path.join(tmpdir(),'zhian-v2-'));
async function seeded(){const dir=temp(),store=new Store(dir),learning=new Learning(store),p=new DemoProvider();const {ids}=store.import(sampleText);for(const id of ids)store.applyCandidate(id,await p.generate(store.get(id).source));return {dir,store,learning,close(){store.close();rmSync(dir,{recursive:true,force:true});}};}
test('import validation, dedupe and no text-only publishing',async()=>{const x=await seeded();try{
 assert.equal(x.store.stats().published,5);assert.equal(x.store.stats().review,2);assert.equal(x.store.import(sampleText).duplicates,7);
 const sequence=x.store.all().find(q=>q.candidate.type==='order');assert.equal(sequence.status,'review');
 assert.throws(()=>x.store.review(sequence.id,{action:'approve',note:'test',stem:sequence.candidate.stem,answer:'[1,2,0]',explanation:'test',sourceUrl:samples[0].sourceUrl}),/排序依据/);
 assert.throws(()=>x.store.import(JSON.stringify([samples[0],{stem:'bad',options:[]}])));assert.equal(x.store.all().length,7);
 assert.equal(parseInput('题目：情境题\nA. 是\nB. 否\n答案：B')[0].answer,1);
 const custom={...samples[0],stem:'新题',answer:0};const {ids}=x.store.import(JSON.stringify([custom]));x.store.applyCandidate(ids[0],await new DemoProvider().generate(x.store.get(ids[0]).source));
 assert.equal(x.store.get(ids[0]).status,'review');assert.throws(()=>x.store.review(ids[0],{action:'approve',note:'ok',stem:'新题',answer:0,explanation:'解析',sourceUrl:samples[0].sourceUrl}),/视觉/);
}finally{x.close();}});
test('batch feedback contains no answers until complete, supports changes and idempotent submit',async()=>{const x=await seeded();try{
 const r=x.learning.start('student01');assert.equal(r.settings.feedback,'batch');assert.ok(!('results'in r));assert.ok(r.cards.every(c=>!('answer'in c)&&!('explanation'in c)&&!('caseInfo'in c)));
 assert.throws(()=>x.learning.submit(r.id,'student01'),/全部/);
 for(const c of r.cards){const q=x.store.get(c.id);const save=x.learning.select(r.id,'student01',{questionId:c.id,selection:q.candidate.answer});assert.ok(!('feedback'in save));}
 const first=r.cards[0];x.learning.select(r.id,'student01',{questionId:first.id,selection:0});x.learning.select(r.id,'student01',{questionId:first.id,selection:1});
 assert.ok(!('results'in x.learning.view(x.learning.get(r.id,'student01'))));
 const done=x.learning.submit(r.id,'student01');assert.equal(done.results.length,5);assert.ok(done.results.every(a=>a.correct));assert.equal(x.store.stats().attempts,5);
 x.learning.submit(r.id,'student01');assert.equal(x.store.stats().attempts,5);
 assert.throws(()=>x.learning.get(r.id,'student02'),/不存在/);
}finally{x.close();}});
test('feedback mode snapshots, per-item locking, versions and persistence',async()=>{const x=await seeded();try{
 x.learning.updateSettings({feedback:'each',batchSize:6,characterId:'fox'});const r=x.learning.start('student01');x.learning.updateSettings({feedback:'batch',characterId:'xiaoping'});
 assert.equal(r.settings.feedback,'each');assert.equal(r.settings.characterId,'fox');
 const c=r.cards[0];const result=x.learning.select(r.id,'student01',{questionId:c.id,selection:x.store.get(c.id).candidate.answer});assert.equal(result.feedback.correct,true);
 assert.throws(()=>x.learning.select(r.id,'student01',{questionId:c.id,selection:0}),/不能修改/);
 const second=r.cards[1];x.store.withdraw(second.id);assert.throws(()=>x.learning.select(r.id,'student01',{questionId:second.id,selection:[0,1]}),/更新或撤回/);
 assert.equal(x.learning.view(x.learning.get(r.id,'student01')).results.length,1);
 const reopened=new Store(x.dir),learn2=new Learning(reopened);try{assert.equal(learn2.get(r.id,'student01').selections[c.id],1);}finally{reopened.close();}
}finally{x.close();}});
test('multiselect, hotspots, order, branch validation',async()=>{const x=await seeded();try{
 for(const q of x.store.all().filter(q=>q.status==='published')){assert.equal(grade(q.candidate,q.candidate.answer),true);assert.equal(grade(q.candidate,null),false);}
 const multi=x.store.all().find(q=>q.candidate.type==='multi').candidate;assert.equal(grade(multi,[1,0]),true);assert.equal(grade(multi,[0]),false);assert.equal(grade(multi,[0,0]),false);
 const order=x.store.all().find(q=>q.candidate.type==='order').candidate;assert.equal(grade(order,[0,1,2]),false);
 const branch=x.store.all().find(q=>q.candidate.type==='branch').candidate;assert.equal(grade(branch,[1,0]),false);
}finally{x.close();}});
test('separate role APIs and no legacy answer endpoint',async()=>{const dir=temp(),app=createApp({dataDir:dir,jobDelay:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const request=(p,b,cookie)=>fetch(base+p,{method:b===undefined?'GET':'POST',headers:{...(b===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:b===undefined?undefined:JSON.stringify(b)});
 try{
 let r=await request('/api/student/login',{username:'student01',password:'123456'});assert.equal(r.status,200);const studentCookie=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await request('/api/teacher/state',undefined,studentCookie)).status,401);
 assert.equal((await request('/api/state',undefined,studentCookie)).status,404);
 assert.equal((await request('/api/cards/whatever/answer',{choice:0},studentCookie)).status,404);
 r=await request('/api/teacher/login',{password:'123456'});const teacherCookie=r.headers.get('set-cookie').split(';')[0];assert.equal(r.status,200);
 assert.equal((await request('/api/teacher/settings',{feedback:'batch'},teacherCookie)).status,200);
 assert.equal((await request('/api/student/settings',{feedback:'each'},studentCookie)).status,404);
 assert.equal((await request('/api/teacher/import',{text:sampleText},teacherCookie)).status,201);
 assert.equal((await request('/api/teacher/generate',{},teacherCookie)).status,202);
 for(let i=0;i<100&&app.store.stats().published<5;i++)await new Promise(r=>setTimeout(r,10));
 const newRun=await (await request('/api/student/runs',{},studentCookie)).json();assert.ok(newRun.cards.length);assert.ok(!('results'in newRun));
 assert.equal((await request('/api/teacher/characters/replace',{mode:'layer',characterId:'fox'},teacherCookie)).status,200);
 assert.equal((await request('/api/teacher/characters/replace',{mode:'edit',characterId:'fox'},teacherCookie)).status,200);
 }finally{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
});


test('manual review can publish without URL or comments and preserves existing sources',async()=>{const x=await seeded();try{
 for(const keepSource of [true,false]){
  let q=x.store.all().find(q=>q.status==='published'&&q.candidate.type!=='order');
  const expected=keepSource?q.candidate.sourceUrl:'';
  if(!keepSource){q.source.sourceUrl='';q.candidate.sourceUrl='';x.store.save(q);}
  q=x.store.withdraw(q.id);
  const body={version:q.version,stem:q.candidate.stem,options:q.candidate.options.map(o=>o.text),answer:JSON.stringify(q.candidate.answer),explanation:q.candidate.explanation};
  q=x.store.saveDraft(q.id,body);assert.equal(q.candidate.sourceUrl,expected);
  q=x.store.review(q.id,{...body,action:'approve'});
  assert.equal(q.status,'published');assert.equal(q.candidate.sourceUrl,expected);assert.equal(q.history.at(-1).note,'');
 }
}finally{x.close();}});
