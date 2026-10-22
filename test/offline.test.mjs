import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {MajorBank} from '../src/major-bank.mjs';
import {offlineRows} from '../src/offline-bank.mjs';
import {createApp} from '../server.mjs';
import {diverseSample,knowledgeKey} from '../src/diverse-sampling.mjs';
import {suitableOriginal} from '../src/diverse-curriculum.mjs';
import {visualKeys,hasRepeatedVisual} from '../src/visual-identity.mjs';
import {topicScene} from '../config/topic-scene-bindings.mjs';

test('同图改标题/对话/查询参数不算新配图；四格完整图与其任一局部互斥',()=>{
 const card=(image,crop)=>({candidate:{type:'illustrated',visual:{kind:'generated',image,...(crop===undefined?{}:{crop})}}});
 const a=card('assets/curriculum/common.png',0),b=card('/assets/curriculum/common.png?different=1',0);
 b.candidate.visual.overlay={type:'dialogue',text:'另一个说法'};b.candidate.stem='另一道题';assert.deepEqual(visualKeys(a),visualKeys(b));assert.equal(hasRepeatedVisual([a,b]),true);
 assert.equal(hasRepeatedVisual([a,card('assets/curriculum/common.png',1)]),false);
 assert.equal(hasRepeatedVisual([a,{candidate:{type:'image_choice',options:[0,1,2,3].map(crop=>({image:'assets/curriculum/common.png',crop}))}}]),true);
 const bound=['common-account','business-contract','business-pressure'].map(id=>topicScene(id));assert.equal(new Set(bound.map(s=>s.image+'#'+s.crop)).size,3);assert.ok(bound.every(s=>!s.image.endsWith('-workflow.png')));
});

test('跨专业共享考点参与近期避重，同时保持学习记录按专业显示',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-cross-topic-')),app=createApp({dataDir:dir,generationEnabled:false});
 try{
  const sources=['专业甲','专业乙'].flatMap(major=>Array.from({length:20},(_,i)=>({sourceQuestionId:major+'-'+i,majorName:major,stem:major+'测试情境 '+i,options:['甲','乙','丙','丁'],answer:0,topic:'测试情境',sourceUrl:'https://example.org/test'})));
  app.store.import(JSON.stringify(sources));for(const q of app.store.all().filter(q=>q.source.majorName?.startsWith('专业'))){const i=Number(q.source.sourceQuestionId.split('-').at(-1));q.status='published';q.candidate={provider:'test',type:'illustrated',route:'R1',stem:q.source.stem,options:q.source.options.map(text=>({text})),answer:0,visual:{kind:'generated',image:'assets/fixture-scene-'+i+'.png'},knowledgePointId:'shared-'+i,knowledgeDomain:'domain-'+i%10,issues:[]};app.store.save(q);}
  const a=app.learning.start('cross-user',{major:'专业甲'}),aPoints=app.learning.get(a.id,'cross-user').cards.map(knowledgeKey),b=app.learning.start('cross-user',{major:'专业乙'}),bPoints=app.learning.get(b.id,'cross-user').cards.map(knowledgeKey);
  assert.equal(bPoints.filter(p=>aPoints.includes(p)).length,0,'条件允许时应避开同一用户在另一专业刚看过的公共考点');
  assert.deepEqual(app.learning.summary('cross-user','专业乙').map(r=>r.id),[b.id]);assert.equal(app.learning.summary('another-user','专业乙').length,0);
 }finally{app.store.close();rmSync(dir,{recursive:true,force:true});}
});

test('全专业多主题题池；每轮10个不同考点、旧任务最多2题、保留原题和排序依据',()=>{
 const bank=new MajorBank('data/question-bank.sqlite');
 try{const {rows,profiles,rules}=offlineRows(bank,{assetsRoot:path.resolve('web'),exists:existsSync});assert.equal(profiles.length,128);assert.equal(rows.length,profiles.reduce((n,p)=>n+p.count,0));assert.ok(rows.length>3000);assert.equal(new Set(profiles.map(p=>p.task)).size,128);assert.equal(new Set(profiles.map(p=>p.item)).size,128);assert.ok(rules.length>128);
 for(const p of profiles){const qs=rows.filter(q=>q.source.majorName===p.major);assert.equal(qs.length,p.count);assert.ok(p.count>=24);assert.ok(p.independentKnowledgePoints>=20);assert.deepEqual([...new Set(qs.map(q=>q.candidate.route))].sort(),['R1','R2','R3','R4','R5','R6','R7','R8']);assert.equal(new Set(qs.map(q=>q.source.sourceQuestionId)).size,p.count);
 let randomState=1234;const random=()=>((randomState=(randomState*1664525+1013904223)>>>0)/4294967296);let recent=[];
 for(let round=0;round<10;round++){const sample=diverseSample(qs,10,{recent,random});assert.equal(new Set(sample.map(knowledgeKey)).size,10);assert.equal(hasRepeatedVisual(sample),false,'同一专业同一轮不得重复实际配图');assert.ok(sample.filter(q=>q.candidate.provenance.contentKind==='course-task').length<=2);assert.ok(new Set(sample.map(q=>q.candidate.route)).size>=3);recent=sample.map(knowledgeKey);}
 for(const {source,candidate:c} of qs){assert.ok(existsSync(path.join('web',c.visual.image)));assert.equal(c.provenance.liveApiCalled,false);
 if(c.route==='R8'){assert.ok(c.sequenceEvidence.approved&&c.sequenceEvidence.precedenceVerified);assert.deepEqual(c.answer.map(i=>c.options[i].text),source.options);assert.equal(new Set(c.options.map(o=>o.crop)).size,4);}
 else{assert.equal(c.answer,source.answer);assert.deepEqual(c.options.map(o=>o.text),source.options);}
 if(['R1','R6'].includes(c.route))assert.ok(c.options.every(o=>!o.image));if(c.route==='R4')assert.ok(c.options.every(o=>o.record.fields.length===4));
 if(c.provenance.contentKind==='supplementary-topic'&&!source.sourceQuestionId.startsWith('SUP7-')){const binding=topicScene(c.provenance.topicCase);assert.equal(c.visual.image,binding.image);assert.equal(c.visual.crop,binding.crop);assert.ok(!c.visual.image.endsWith('-workflow.png'));}if(c.provenance.contentKind==='original-bank'){assert.ok(source.knowledgePointId.startsWith('KN-'));assert.equal(source.sourceTemplate,'T1');assert.equal(source.majorScenario,bank.major(p.major).scenario);assert.ok(suitableOriginal(source,bank.major(p.major)));assert.equal(c.provenance.originalQuestionId,source.sourceQuestionId);}
 else assert.ok(/^(CUR6-|MIX7-|SUP7-)/.test(source.sourceQuestionId));
 assert.deepEqual(c.conditions,[],'不能把答案映射表或流程顺序作为作答提示');
 assert.equal(c.provenance.relevance.major,p.major);assert.equal(c.provenance.relevance.task,p.task);
 if(c.provenance.contentKind==='course-task')assert.ok(c.stem.includes(p.task)||c.stem.includes(p.item));
 else if(c.provenance.contentKind==='supplementary-topic'&&!source.sourceQuestionId.startsWith('SUP7-'))assert.ok(c.stem.includes(p.major),'补充案例应处于相应专业课程情境中');
 if(p.major==='法学')assert.ok(!/公共机房|实验项目|试剂|机床|实验室通用管理/.test(JSON.stringify(c)),'法学不得出现通用实验室题');
 if(c.route==='R5'){assert.ok(!/但尚未|本次环节依次/.test(c.stem));assert.ok(!c.stem.includes(c.options[c.answer].text),'下一步的完整操作不能直接写在题干中');}
 }
 }
 assert.ok(rows.filter(q=>q.source.majorName==='法学').every(q=>q.candidate.provenance.contentKind!=='original-bank'),'法学不能继续使用被映射到公共机房的实验题');
 const pharmaceutical=rows.filter(q=>q.source.majorName==='制药工程');assert.ok(pharmaceutical.some(q=>q.candidate.provenance.contentKind==='original-bank'));assert.ok(pharmaceutical.every(q=>!q.candidate.provenance.topicCase?.startsWith('business-')),'制药工程不应因专业名称漏匹配而混入经营调研/合同题'); const chemical=rows.filter(q=>q.source.majorName==='应用化学');assert.ok(chemical.filter(q=>q.candidate.provenance.contentKind==='original-bank').length>=40);assert.ok(new Set(chemical.map(knowledgeKey)).size>=40);
 }finally{bank.close();}
});

test('本地题包端到端：全专业可开始、判分/错题/跨专业隔离、收费入口关闭',async()=>{
 const bank=new MajorBank('data/question-bank.sqlite'),dir=mkdtempSync(path.join(tmpdir(),'zhian-offline-'));let calls=0;
 const app=createApp({dataDir:dir,majorBank:bank,generationEnabled:false,provider:{generate:async()=>{calls++;throw new Error('不应调用外部模型');}}});
 try{
  const {rows,profiles}=offlineRows(bank,{assetsRoot:path.resolve('web'),exists:existsSync});
  for(let i=0;i<rows.length;i+=100)app.store.import(JSON.stringify(rows.slice(i,i+100).map(r=>r.source)));
  const byKey=new Map(app.store.all().map(q=>[q.source.majorName+'|'+q.source.sourceQuestionId,q]));
  app.store.db.exec('BEGIN');for(const {source,candidate} of rows){const q=byKey.get(source.majorName+'|'+source.sourceQuestionId);q.candidate=candidate;q.status='published';q.version=1;app.store.save(q);}app.store.db.exec('COMMIT');
  for(const p of profiles){const owner='coverage-'+p.major,run=app.learning.start(owner,{major:p.major});assert.equal(run.cards.length,10);const first=app.learning.get(run.id,owner).cards;assert.ok(first.every(q=>q.source.majorName===p.major));assert.equal(new Set(first.map(knowledgeKey)).size,10);assert.equal(hasRepeatedVisual(first),false);const next=app.learning.start(owner,{major:p.major}),second=app.learning.get(next.id,owner).cards;assert.notDeepEqual([...new Set(first.map(knowledgeKey))].sort(),[...new Set(second.map(knowledgeKey))].sort(),'未提交的上一轮也应参与避重，不能重新开始仍是完全相同10个考点');}
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
  async function api(role,route,body){const res=await fetch(base+'/api/'+role+'/'+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(route==='login')cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,data:await res.json()};}
  await api('student','login',{username:'student01',password:'123456',major:'工商管理'});const run=(await api('student','runs',{})).data;assert.equal(run.cards.length,10);assert.ok(run.cards.every(q=>!('answer' in q)&&!('provenance' in q)&&!('reviewIssues' in q)));assert.ok(run.cards.every(q=>q.conditions.length===0),'学生练习不下发提示表');
  let wrongId;for(const [i,q] of run.cards.entries()){const answer=app.learning.get(run.id,'student01').cards.find(c=>c.id===q.id).candidate.answer;const selection=i===0?(Array.isArray(answer)?[answer[1],answer[0],...answer.slice(2)]:(answer+1)%q.options.length):answer;if(i===0)wrongId=q.id;assert.equal((await api('student','runs/'+run.id+'/selection',{questionId:q.id,selection})).status,200);}
  const result=(await api('student','runs/'+run.id+'/submit',{})).data;assert.equal(result.results.filter(r=>r.correct).length,9);const wrong=(await api('student','runs',{wrongOnly:true})).data;assert.deepEqual(wrong.cards.map(q=>q.id),[wrongId]);
  await api('student','runs/'+wrong.id+'/selection',{questionId:wrongId,selection:app.learning.get(wrong.id,'student01').cards[0].candidate.answer});await api('student','runs/'+wrong.id+'/submit',{});assert.equal((await api('student','runs',{wrongOnly:true})).status,400);
  await api('student','login',{username:'student01',password:'123456',major:'化学'});assert.equal((await api('student','runs/'+run.id)).status,403);assert.equal((await api('student','home')).data.runs.length,0);
  await api('teacher','login',{password:'123456'});assert.equal((await api('teacher','generate',{})).status,409);assert.equal((await api('teacher','prepare-major',{major:'工商管理'})).status,409);assert.equal(calls,0);
 }finally{if(app.server.listening)await new Promise(r=>app.server.close(r));app.store.close();bank.close();rmSync(dir,{recursive:true,force:true});}
});
