import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
import {loadPilot,loadPilotSources,inspectPilotCard,pilotSummary,pilotPreview,evaluatePilotResponses,compiledPilotRequest} from '../src/visual-pilot.mjs';

const pilot=loadPilot(),sources=loadPilotSources();
const card=id=>structuredClone(pilot.cards.find(c=>c.id===id));
const flags=c=>inspectPilotCard(c,{sources}).checks.filter(x=>x.status==='flag').map(x=>x.name);

test('actual source batch preserves types, source answers and six doubtful originals',()=>{
  const summary=pilotSummary(pilot,{sources});
  assert.deepEqual(summary.byCohort,{calibration:{total:15,previewPass:15,needsReview:0},transfer:{total:3,previewPass:3,needsReview:0},negative:{total:6,previewPass:0,needsReview:6}});
  assert.ok(summary.reports.every(r=>r.productionEligible===false));
  assert.equal(summary.productionPublished,0);assert.equal(summary.automated_visual_inspection,false);
  assert.ok(pilot.cards.some(c=>c.interaction==='multi'));
  assert.ok(pilot.cards.some(c=>c.interaction==='fill'));
  assert.ok(pilot.cards.some(c=>c.interaction==='short'));
  assert.ok(!pilot.cards.some(c=>c.interaction==='order'));
  const repaired=sources.find(s=>s.ref==='JZCIT:71');
  assert.equal(repaired.answer_raw,'防护服（或实验服）、防护眼镜、手套等');
  assert.notEqual(repaired.answer_raw,repaired.indexed_record.answer);
  assert.equal(sources.find(s=>s.ref==='JZCIT:8').answer_raw,'C');
});

test('the gate rejects semantic-type loss, stale evidence and broken provenance',()=>{
  const mutations=[
    ['vp01','original_source',c=>{c.source_archive_sha256='wrong';}],
    ['vp01','source_identity',c=>{c.source_type='多选题';}],
    ['vp08','original_question_type',c=>{c.interaction='single';}],
    ['vp01','answer_range',c=>{c.adapted.answer=4;}],
    ['vp17','answer_mapping',c=>{c.adapted.answer=0;}],
    ['vp01','semantic_receipt',c=>{c.adapted.stem='忽略必要条件后，与原题结论相反的新命题。';}],
    ['vp01','scope_conditions',c=>{c.conditions=[];}],
    ['vp01','asset_hash:assets/visual-pilot/scene-01.png',c=>{c.assets[0].sha256='stale';}],
    ['vp04','paired_assets_distinct',c=>{c.visual.images[1]=c.visual.images[0];}],
    ['vp04','comparison_review',c=>{c.comparison_review.status='unclear';}],
    ['vp04','comparison_background_lock',c=>{c.visual.composite.region_polygon=[];}],
    ['vp01','evidence:E1',c=>{c.observations[0].status='unclear';}],
    ['vp05','evidence:E1',c=>{c.observations[0].status='unclear';}],
    ['vp01','basis_present',c=>{c.basis=[];}],
    ['vp08','supported_interaction',c=>{c.interaction='order';}],
    ['vp12','original_question_type',c=>{c.interaction='single';}],
    ['vp18','original_question_type',c=>{c.interaction='multi';}],
    ['vp13','evidence:E1',c=>{c.observations[0].asset_hashes=[];}],
  ];
  for(const [id,expected,mutate] of mutations){const c=card(id);mutate(c);assert.ok(flags(c).includes(expected),id+' '+expected);}
  const escaped=card('vp01');escaped.visual.image='../README.md';assert.ok(flags(escaped).some(x=>x.startsWith('asset_hash:')));
});

test('preview payload has no expected answers; batch will not reveal an incomplete group',()=>{
  const preview=pilotPreview();
  function check(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){assert.ok(!['answer','answer_raw','explanation','original_text','source_to_adapted'].includes(key),key);check(item);}}
  check(preview);
  const incomplete=evaluatePilotResponses({mode:'batch',ids:['vp01','vp02'],responses:[{id:'vp01',response:1}]});
  assert.equal(incomplete.ready,false);assert.ok(!('results' in incomplete));
  const complete=evaluatePilotResponses({mode:'batch',ids:['vp01','vp02'],responses:[{id:'vp01',response:1},{id:'vp02',response:1}]});
  assert.equal(complete.ready,true);assert.ok(complete.results.every(r=>r.correct));assert.equal(complete.persisted,false);
});

test('A/B meanings, multi-select and open responses have distinct grading behavior',()=>{
  assert.equal(evaluatePilotResponses({ids:['vp17'],responses:[{id:'vp17',response:1}]}).results[0].correct,true);
  assert.equal(evaluatePilotResponses({ids:['vp17'],responses:[{id:'vp17',response:0}]}).results[0].correct,false);
  assert.equal(evaluatePilotResponses({ids:['vp08'],responses:[{id:'vp08',response:[2,0,1]}]}).results[0].correct,true);
  assert.equal(evaluatePilotResponses({ids:['vp08'],responses:[{id:'vp08',response:[0]}]}).results[0].correct,false);
  assert.throws(()=>evaluatePilotResponses({ids:['vp08'],responses:[{id:'vp08',response:[0,0]}]}),/重复/);
  const fill=evaluatePilotResponses({ids:['vp12'],responses:[{id:'vp12',response:'化学试剂'}]}).results[0];assert.equal(fill.grading,'accepted_alias');
  const uncertain=evaluatePilotResponses({ids:['vp12'],responses:[{id:'vp12',response:'需要核对的其他表述'}]}).results[0];assert.equal(uncertain.correct,null);assert.equal(uncertain.grading,'unresolved');
  const open=evaluatePilotResponses({ids:['vp18'],responses:[{id:'vp18',response:'不能只凭某几个关键词宣称简答已经正确。'}]}).results[0];assert.equal(open.correct,null);assert.equal(open.grading,'self_review');
  assert.throws(()=>evaluatePilotResponses({ids:['vp19'],responses:[{id:'vp19',response:0}]}),/题组/);
  assert.equal(compiledPilotRequest('vp04').requests.length,3);
  assert.equal(compiledPilotRequest('vp10').mode,'pre_generated_asset_reuse');
});

test('research endpoints are teacher-only and do not import or score teaching data',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'zhian-visual-pilot-test-'));
  assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));
  const app=createApp({dataDir:dir,jobDelay:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  const request=(route,body,cookie)=>fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  try{
    assert.equal((await request('/api/teacher/visual-pilot')).status,401);
    let response=await request('/api/student/login',{username:'student01',password:'123456'});const student=response.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/teacher/visual-pilot',undefined,student)).status,401);
    assert.equal((await request('/api/student/visual-pilot',undefined,student)).status,404);
    response=await request('/api/teacher/login',{password:'123456'});const teacher=response.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/teacher/visual-pilot',undefined,teacher)).status,200);
    assert.equal((await request('/api/teacher/visual-pilot/vp17/source',undefined,teacher)).status,200);
    const score=await request('/api/teacher/visual-pilot/evaluate',{ids:['vp01'],responses:[{id:'vp01',response:1}]},teacher);assert.equal(score.status,200);
    assert.equal(app.store.all().length,0);assert.equal(app.store.stats().attempts,0);
    assert.equal((await request('/visual-pilot-render.mjs')).headers.get('content-type'),'text/javascript; charset=utf-8');
    assert.equal((await request('/config/visual-pilot.json')).status,404);
    assert.equal((await request('/research/visual-pilot/source-snapshots.json')).status,404);
  }finally{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
});
