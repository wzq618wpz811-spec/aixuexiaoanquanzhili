import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
import {MajorBank} from '../src/major-bank.mjs';
import {VisualProvider,buildPlan,parseVerifiedSteps,QwenImageService,routeHeuristically} from '../src/visual-pipeline.mjs';

test('专业映射取到对应场景且过滤重复选项',()=>{
 const bank=new MajorBank(path.resolve('data/question-bank.sqlite'));
 assert.equal(bank.major('工商管理').scenario,'公共机房');
 const rows=bank.candidates('工商管理');
 assert.ok(rows.length>100);
 assert.ok(rows.every(q=>q.majorScenario==='公共机房'&&new Set(q.options).size===4));
 bank.close();
});

test('通用转换保留原题答案，排序仅生成独立步骤',()=>{
 const single={stem:'哪项说法正确',options:['甲','乙','丙','丁'],answer:2,sourceUrl:''};
 assert.equal(routeHeuristically(single),'R1','普通“说法正确”不能误当成对话题');
 assert.equal(routeHeuristically({...single,stem:'某同学说：不明网站随便访问没关系。对此如何判断？'}),'R6');
 const p=buildPlan(single,{route:'R2',adaptedStem:'下列哪幅图正确',sceneDescription:'校园场景',optionScenes:['动作甲','动作乙','动作丙','动作丁']});
 assert.equal(p.route,'R2');assert.equal(single.answer,2);
 const ordered={stem:'下列操作步骤的正确顺序是',options:['甲','乙','1. 断电 2. 检查 3. 登记','丁'],answer:2,sourceUrl:'https://example.org/procedure'};
 assert.deepEqual(parseVerifiedSteps(ordered),['断电','检查','登记']);
 const steps=buildPlan(ordered);assert.equal(steps.route,'R8');assert.equal(steps.renderSteps.length,3);
 assert.deepEqual(steps.renderSteps.map(s=>s.stepId).sort(),[0,1,2]);
});

test('学生选专业、生成、教师审核、再练习的接口闭环',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-local-product-'));
 const example={sourceQuestionId:'T001',stem:'在公共机房，湿手靠近电源插座时哪项做法正确？',options:['直接插拔电源','先擦干手再操作','用湿布擦插座','让设备持续通电'],answer:1,topic:'用电安全',sourceUrl:'',sourceTitle:'测试题',majorName:'工商管理',majorScenario:'公共机房',explanation:'先保证手部干燥。'};
 const majorBank={majors:()=>[{name:'工商管理',scenario:'公共机房'}],major:n=>n==='工商管理'?{name:n}:null,pick:()=>[example]};
 const planner={available:()=>true,plan:async()=>({route:'R1',adaptedStem:example.stem,sceneDescription:'交小平湿手站在插座前',optionScenes:[],labels:['湿手','电源插座'],issues:[]}),audit:async()=>({pass:true,issues:[]})};
 const png=readFileSync(path.resolve('web/assets/blank-book.png'));
 const imageService={available:()=>true,model:'mock-image',generate:async()=>({relative:'assets/blank-book.png',bytes:png})};
 const app=createApp({dataDir:dir,majorBank,provider:new VisualProvider({planner,imageService}),jobDelay:0});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(role,route,payload,cookie='')=>{const res=await fetch(base+'/api/'+role+'/'+route,{method:payload===undefined?'GET':'POST',headers:{...(payload===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});return {res,data:await res.json()}};
 try{
  assert.equal((await call('student','majors')).data.majors[0].name,'工商管理');
  assert.equal((await call('student','login',{username:'student01',password:'123456'})).res.status,400);
  const login=await call('student','login',{username:'student01',password:'123456',major:'工商管理'});
  assert.equal(login.res.status,200);const sc=login.res.headers.get('set-cookie').split(';')[0];
  const teacher=await call('teacher','login',{password:'123456'}),tc=teacher.res.headers.get('set-cookie').split(';')[0];
  const prep=await call('teacher','prepare-major',{major:'工商管理'},tc);assert.equal(prep.res.status,202);
  for(let i=0;i<30&&app.store.jobs()[0].status!=='completed';i++)await new Promise(r=>setTimeout(r,20));
  const q=app.store.all()[0];assert.equal(q.source.majorName,'工商管理');assert.equal(q.status,'review');assert.equal(q.candidate.route,'R1');
  assert.ok(q.candidate.visual.image);assert.deepEqual(q.candidate.options,example.options.map(text=>({text})),'R1 仅有题干情境图，选项保持原文且没有图片');
  const approved=await call('teacher','questions/'+q.id+'/review',{action:'approve',note:'已核对画面与依据',stem:q.candidate.stem,answer:'1',explanation:'湿手不得接触电源。',sourceUrl:'https://example.org/safety'},tc);
  assert.equal(approved.data.status,'published');
  const home=await call('student','home',undefined,sc);assert.equal(home.data.available,1);
  const run=await call('student','runs',{},sc);assert.equal(run.res.status,201);assert.equal(run.data.cards.length,1);assert.equal(run.data.cards[0].id,q.id);assert.equal(run.data.settings.batchSize,1);
 }finally{await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('生图适配器保存真实 PNG 返回并使用统一角色参考',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'zhian-image-adapter-'));
 const png=readFileSync(path.resolve('web/assets/blank-book.png'));
 const prior=globalThis.fetch;let request;
 globalThis.fetch=async(_url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({data:[{b64_json:png.toString('base64')}]}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{
  const service=new QwenImageService({apiKey:'test-key',endpoint:'https://example.org/images/generations',model:'qwen-image-3.0',assetsDir:dir,referencePath:path.resolve('web/assets/character-atlas.png')});
  const result=await service.generate('统一风格测试');
  assert.ok(request.image.startsWith('data:image/png;base64,'));assert.equal(request.size,'1536x1024');
  assert.deepEqual(result.bytes,png);assert.equal((await service.generate('统一风格测试')).cached,true);
 }finally{globalThis.fetch=prior;rmSync(dir,{recursive:true,force:true});}
});
