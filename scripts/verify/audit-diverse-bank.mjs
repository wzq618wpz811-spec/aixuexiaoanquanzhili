import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {MajorBank,defaultBankPath} from '../../src/major-bank.mjs';
import {offlineRows} from '../../src/offline-bank.mjs';
import {diverseSample,knowledgeKey} from '../../src/diverse-sampling.mjs';
import {suitableOriginal} from '../../src/diverse-curriculum.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),bank=new MajorBank(defaultBankPath(root));
try{
 const {rows,profiles}=offlineRows(bank,{assetsRoot:path.join(root,'web'),exists:existsSync}),sections=[];
 for(const p of profiles){const questions=rows.filter(q=>q.source.majorName===p.major);assert.equal(questions.length,p.count);assert.ok(p.count>=24);assert.ok(new Set(questions.map(knowledgeKey)).size>=20);
  for(const {source,candidate:c} of questions){assert.equal(c.provenance.relevance.major,p.major);assert.equal(c.conditions.length,0);assert.ok(c.knowledgePointId);assert.ok(existsSync(path.join(root,'web',c.visual.image)));if(c.provenance.contentKind==='original-bank'){assert.equal(source.sourceTemplate,'T1');assert.ok(suitableOriginal(source,bank.major(p.major)));}if(p.major==='法学')assert.ok(!/公共机房|实验项目|试剂|机床|实验室通用管理/.test(JSON.stringify(c)));}
  let rng=2345;const random=()=>((rng=(rng*1664525+1013904223)>>>0)/4294967296);let recent=[];
  for(let i=0;i<10;i++){const chosen=diverseSample(questions,10,{recent,random});assert.equal(new Set(chosen.map(knowledgeKey)).size,10);assert.ok(chosen.filter(q=>q.candidate.provenance.contentKind==='course-task').length<=2);assert.ok(new Set(chosen.map(q=>q.candidate.route)).size>=3);recent=chosen.map(knowledgeKey);}
  const sample=diverseSample(questions,10,{random});
  const describe=q=>({id:q.source.sourceQuestionId,point:knowledgeKey(q),domain:q.candidate.knowledgeDomain,route:q.candidate.route,origin:q.candidate.provenance.contentKind,stem:q.candidate.stem,image:q.candidate.visual.image});
  sections.push({major:p.major,poolSize:p.count,independentPoints:p.independentKnowledgePoints,originalQuestions:p.originalQuestions,perRound:10,example:sample.map(describe),questions:questions.map(describe)});
 }
 const out=path.join(root,'artifacts');mkdirSync(out,{recursive:true});
 const report={createdAt:new Date().toISOString(),scope:'程序全量检查：原题知识点编号及同义归并、专业适用过滤、每轮独立考点、旧任务占比、图型与图片。不是学科专家审定记录。',totalMajors:profiles.length,totalPoolQuestions:rows.length,perRound:10,minPool:Math.min(...profiles.map(p=>p.count)),maxPool:Math.max(...profiles.map(p=>p.count)),sourceKnowledgePoints:bank.db.prepare('SELECT COUNT(DISTINCT item_id) n FROM question_bank').get().n,sections};
 writeFileSync(path.join(out,'professional-relevance-audit.json'),JSON.stringify(report,null,2));
 writeFileSync(path.join(out,'专业题目适配核查.md'),'# 多考点题池与抽样检查\n\n'+report.scope+'\n\n共'+profiles.length+'个专业，'+rows.length+'条专业题池记录；每次10题、10个不同考点。每专业题池至少'+report.minPool+'题，同一资料流程每轮最多2题，优先避开近期做过的考点。\n\n原库有'+report.sourceKnowledgePoints+'个item_id，不等于全部可直接发布。经筛选的理工科原题与补充课程情境题分开标识；法学不使用原库的公共机房映射。\n\n'+sections.map(s=>'## '+s.major+'\n\n题池：'+s.poolSize+'题；独立考点：'+s.independentPoints+'；原库题：'+s.originalQuestions+'。以下为可复现抽样示例。\n\n'+s.example.map((q,i)=>(i+1)+'. **'+q.route+' / '+q.point+' / '+q.domain+'** '+q.stem).join('\n\n')).join('\n\n'));
 console.log(JSON.stringify({majors:profiles.length,totalPool:rows.length,perRound:10,minPool:report.minPool,maxPool:report.maxPool,sourceKnowledgePoints:report.sourceKnowledgePoints,report:'artifacts/专业题目适配核查.md'}));
}finally{bank.close();}
