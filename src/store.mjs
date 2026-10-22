import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import {visualTypes} from './provider.mjs';
import {validSelection} from './learning.mjs';
import {sequenceReady} from './sequence-policy.mjs';

export function parseInput(text) {
  if(typeof text!=='string'||!text.trim()) throw new Error('请先粘贴题库内容');
  let rows;
  if(text.trim().startsWith('[')) { try { rows=JSON.parse(text); } catch { throw new Error('JSON 格式不正确，请检查逗号、引号与括号'); } }
  else rows=text.trim().split(/\r?\n\s*\r?\n/).map(block=>{
    const lines=block.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const options=[];const obj={};
    for(const line of lines){
      const option=line.match(/^[A-H][.、．)）]\s*(.+)$/i);
      if(option){ options.push(option[1]);continue; }
      const m=line.match(/^(题目|答案|解析|主题|来源|来源名称)[：:]\s*(.*)$/);
      if(m){obj[m[1]]=m[2];}else obj['题目']=(obj['题目']?obj['题目']+' ':'')+line;
    }
    if(!options.length&&['正确','错误','对','错','√','×'].includes(obj['答案']))options.push('正确','错误');
    let answer=/^[A-H]$/i.test(obj['答案']??'')?obj['答案'].toUpperCase().charCodeAt(0)-65:null;
    if(['正确','对','√'].includes(obj['答案']))answer=0;
    if(['错误','错','×'].includes(obj['答案']))answer=1;
    return {stem:obj['题目'],options,answer,explanation:obj['解析'],topic:obj['主题'],sourceUrl:obj['来源'],sourceTitle:obj['来源名称']};
  });
  if(!Array.isArray(rows)||!rows.length||rows.length>100)throw new Error('每次请输入 1—100 道题');
  return rows.map((r,i)=>{
    if(!r||typeof r!=='object'||typeof r.stem!=='string'||!r.stem.trim()||r.stem.length>3000)throw new Error(`第 ${i+1} 题题干缺失或过长`);
    if(!Array.isArray(r.options)||r.options.length<2||r.options.length>8||r.options.some(x=>typeof x!=='string'||!x.trim()||x.length>1000))throw new Error(`第 ${i+1} 题需要 2—8 个非空选项`);
    let answer=r.answer??null;
    if(typeof answer==='string'&&/^[A-H]$/i.test(answer))answer=answer.toUpperCase().charCodeAt(0)-65;
    const validIndex=x=>Number.isInteger(x)&&x>=0&&x<r.options.length;
    if(answer!==null&&!(Array.isArray(answer)?answer.length>0&&answer.length<=r.options.length&&answer.every(validIndex):validIndex(answer)))throw new Error(`第 ${i+1} 题答案超出选项范围`);
    const sourceUrl=String(r.sourceUrl??'').trim();
    if(sourceUrl&&!/^https?:\/\//i.test(sourceUrl))throw new Error(`第 ${i+1} 题来源必须是 http(s) 链接`);
    return {stem:r.stem.trim(),options:r.options.map(x=>x.trim()),answer,explanation:String(r.explanation??'').slice(0,5000),topic:String(r.topic||'待分类').slice(0,200),sourceUrl,sourceTitle:String(r.sourceTitle||'导入资料').slice(0,300),sourceQuestionId:String(r.sourceQuestionId||'').slice(0,80),sourceType:String(r.sourceType||'').slice(0,80),majorName:String(r.majorName||'').slice(0,100),majorScenario:String(r.majorScenario||'').slice(0,100),majorTags:Array.isArray(r.majorTags)?r.majorTags.filter(x=>typeof x==='string').slice(0,20):[]};
  });
}

export class Store {
  constructor(dir) {
    mkdirSync(dir,{recursive:true}); this.db=new DatabaseSync(path.join(dir,'demo.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions(question_id TEXT, version INTEGER, body TEXT, PRIMARY KEY(question_id,version));
      CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, body TEXT NOT NULL);`);
    for(const job of this.jobs())if(['queued','running'].includes(job.status)){job.status='failed';job.error='服务重启，任务中断，可重试';this.saveJob(job);}
    for(const q of this.all())if(q.status==='generating'){q.status='imported';this.save(q);}
  }
  all(){return this.db.prepare('SELECT body FROM questions ORDER BY rowid DESC').all().map(r=>JSON.parse(r.body));}
  get(id){const r=this.db.prepare('SELECT body FROM questions WHERE id=?').get(id);return r?JSON.parse(r.body):null;}
  save(q){this.db.prepare('UPDATE questions SET body=? WHERE id=?').run(JSON.stringify(q),q.id);return q;}
  import(text){
    const rows=parseInput(text);let added=0,duplicates=0;const ids=[];
    this.db.exec('BEGIN');
    try{for(const source of rows){
      const fingerprint=createHash('sha256').update(JSON.stringify(source)).digest('hex');
      if(this.db.prepare('SELECT id FROM questions WHERE fingerprint=?').get(fingerprint)){duplicates++;continue;}
      const q={id:randomUUID(),source,status:'imported',version:0,candidate:null,history:[],createdAt:new Date().toISOString()};
      this.db.prepare('INSERT INTO questions VALUES(?,?,?)').run(q.id,fingerprint,JSON.stringify(q));ids.push(q.id);added++;
    }this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
    return {added,duplicates,ids};
  }
  applyCandidate(id,candidate){const q=this.get(id);if(!q)throw new Error('题目不存在');q.candidate=candidate;q.version++;
    if(!visualTypes.includes(candidate.type)||!candidate.visual)candidate.issues=[...candidate.issues,'缺少可发布的视觉卡片'];
    if(!sequenceReady(candidate))candidate.issues=[...candidate.issues,'排序需要完整原题及已核验的先后依据'];
    q.status=candidate.issues.length||candidate.provider==='visual-pipeline-v1'?'review':'published';
    q.history.push({at:new Date().toISOString(),event:q.status==='published'?'自动检查通过并发布（演示规则）':'发现疑问，转人工审核',version:q.version});
    this.save(q);this.snapshot(q);return q;
  }
  snapshot(q){this.db.prepare('INSERT OR REPLACE INTO revisions VALUES(?,?,?)').run(q.id,q.version,JSON.stringify(q));}
  saveDraft(id,body){
    const q=this.get(id);if(!q?.candidate||!['review','rejected'].includes(q.status))throw new Error('仅待审核或退回题目可以修改');
    if(body.version!==q.version)throw new Error('题目版本已变化，请刷新后重试');
    const c=structuredClone(q.candidate);
    if(!String(body.stem||'').trim()||!String(body.explanation||'').trim())throw new Error('请填写题干和解析');
    if(!Array.isArray(body.options)||body.options.length!==c.options.length||body.options.some(t=>typeof t!=='string'||!t.trim()||t.length>1000))throw new Error('选项数量必须保持不变，且内容不能为空');
    let answer;try{answer=typeof body.answer==='string'?JSON.parse(body.answer):body.answer;}catch{throw new Error('答案格式不正确');}
    if(!validSelection(c,answer))throw new Error('答案无效');
    c.stem=String(body.stem).slice(0,3000);c.explanation=String(body.explanation).slice(0,5000);c.sourceUrl=String(body.sourceUrl??c.sourceUrl??q.source.sourceUrl??'').slice(0,2000);c.answer=answer;
    c.options=c.options.map((o,i)=>({...o,text:body.options[i]}));
    if(c.type==='order')c.sequenceEvidence={...c.sequenceEvidence,approved:false};
    q.candidate=c;q.status='review';q.version++;q.history.push({at:new Date().toISOString(),event:'人工保存修改，待再次审核',note:String(body.note||'').slice(0,3000),version:q.version});this.save(q);this.snapshot(q);return q;
  }
  review(id,body){const q=this.get(id);if(!q?.candidate)throw new Error('题目尚未生成');
    if(!['review','rejected'].includes(q.status))throw new Error('当前题目不在待审核状态');
    if(!String(body.note??'').trim())throw new Error('请填写处理说明');
    if(body.action==='approve'){
      if(!visualTypes.includes(q.candidate.type)||!q.candidate.visual)throw new Error('请先补齐视觉卡片，纯文字题不可发布');
      if(q.candidate.type==='order'&&body.confirmSequence===true){
        q.candidate.sequenceEvidence={...q.candidate.sequenceEvidence,currentProcedureRef:String(body.sourceUrl||q.candidate.sequenceEvidence?.currentProcedureRef||q.candidate.sourceUrl||q.source.sourceUrl||''),precedenceVerified:true,approved:true};
      }
      if(!sequenceReady(q.candidate))throw new Error('排序依据尚未齐全：请逐步核对原题顺序与现行依据，再勾选确认');
      let answer;try{answer=typeof body.answer==='string'?JSON.parse(body.answer):body.answer;}catch{throw new Error('答案格式不正确');}
      if(!validSelection(q.candidate,answer))throw new Error('请选择有效答案');
      if(body.sourceUrl&&!/^https?:\/\//i.test(body.sourceUrl))throw new Error('来源链接格式不正确');
      if(!String(body.stem??'').trim()||!String(body.explanation??'').trim())throw new Error('请补充题干与解析');
      q.version++;q.candidate.stem=String(body.stem).slice(0,3000);q.candidate.answer=answer;q.candidate.explanation=String(body.explanation).slice(0,5000);
      q.candidate.sourceUrl=String(body.sourceUrl??q.candidate.sourceUrl??q.source.sourceUrl??'');q.candidate.issues=[];q.status='published';
      q.history.push({at:new Date().toISOString(),event:'人工修订后通过',note:String(body.note).slice(0,3000),version:q.version});
    }else if(body.action==='reject'){q.status='rejected';q.history.push({at:new Date().toISOString(),event:'退回',note:String(body.note).slice(0,3000),version:q.version});}
    else throw new Error('不支持的审核操作');
    this.save(q);this.snapshot(q);return q;
  }
  withdraw(id){const q=this.get(id);if(q?.status!=='published')throw new Error('只能撤回已发布题目');q.status='review';q.candidate.issues=['已撤回，等待重新检查'];q.history.push({at:new Date().toISOString(),event:'撤回发布',version:q.version});this.save(q);return q;}
  studentCards(){return this.all().filter(q=>q.status==='published').map(q=>({id:q.id,version:q.version,topic:q.source.topic,type:q.candidate.type,stem:q.candidate.stem,options:q.candidate.options,image:q.candidate.image}));}
  answer(id,{version,choice,clientId}){
    const q=this.get(id);if(!q||q.status!=='published'||q.version!==version)throw new Error('题目版本已变更或撤回，请刷新练习');
    if(!Number.isInteger(choice)||choice<0||choice>=q.candidate.options.length)throw new Error('请选择有效选项');
    const a={id:randomUUID(),questionId:id,version,choice,correct:choice===q.candidate.answer,topic:q.source.topic,clientId:String(clientId||'demo-student').slice(0,100),at:new Date().toISOString()};
    this.db.prepare('INSERT INTO attempts VALUES(?,?)').run(a.id,JSON.stringify(a));
    return {...a,answer:q.candidate.answer,explanation:q.candidate.explanation,sourceUrl:q.candidate.sourceUrl||q.source.sourceUrl};
  }
  attempts(){return this.db.prepare('SELECT body FROM attempts ORDER BY rowid DESC').all().map(r=>JSON.parse(r.body));}
  jobs(){return this.db.prepare('SELECT body FROM jobs ORDER BY rowid DESC').all().map(r=>JSON.parse(r.body));}
  saveJob(j){this.db.prepare('INSERT INTO jobs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(j.id,JSON.stringify(j));return j;}
  stats(){const qs=this.all().filter(q=>q.status!=='archived'),attempts=this.attempts();const topics=Object.create(null);for(const a of attempts){topics[a.topic]??={total:0,correct:0};topics[a.topic].total++;topics[a.topic].correct+=Number(a.correct);}
    return {total:qs.length,published:qs.filter(q=>q.status==='published').length,review:qs.filter(q=>q.status==='review').length,imported:qs.filter(q=>q.status==='imported').length,attempts:attempts.length,correct:attempts.filter(a=>a.correct).length,participants:new Set(attempts.map(a=>a.clientId)).size,topics};}
  close(){this.db.close();}
}
