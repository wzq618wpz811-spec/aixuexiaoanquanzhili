import {randomUUID} from 'node:crypto';
import {characters,visualTypes} from './provider.mjs';
import {sequenceReady} from './sequence-policy.mjs';
import {diverseSample,knowledgeKey} from './diverse-sampling.mjs';

const isIndex=(v,n)=>Number.isInteger(v)&&v>=0&&v<n;
export function validSelection(c,v){
 if(['multi','hotspot'].includes(c.type))return Array.isArray(v)&&v.length>0&&new Set(v).size===v.length&&v.every(x=>isIndex(x,c.options.length));
 if(c.type==='order')return Array.isArray(v)&&v.length===c.options.length&&new Set(v).size===v.length&&v.every(x=>isIndex(x,c.options.length));
 if(c.type==='branch')return Array.isArray(v)&&v.length===2&&v.every(x=>isIndex(x,2));
 return isIndex(v,c.options.length);
}
export function grade(c,v){if(!validSelection(c,v))return false;if(['multi','hotspot'].includes(c.type))return [...v].sort().join(',')===[...c.answer].sort().join(',');return JSON.stringify(v)===JSON.stringify(c.answer);}
function publicCard(q){const c=q.candidate;const options=c.route==='R1'?c.options.map(o=>({text:o.text})):c.options.map(({stepId,...o})=>o);return {id:q.id,version:q.version,topic:q.source.topic,stem:c.stem,type:c.type,route:c.route||null,interaction:c.interaction||null,conditions:c.conditions||[],options,visual:c.visual,markers:c.markers||[],nodes:c.nodes||[],caseLabel:c.caseInfo?'案例改编':'情境练习'};}
export class Learning {
 constructor(store){this.store=store;this.db=store.db;this.db.exec(`CREATE TABLE IF NOT EXISTS learning_runs(id TEXT PRIMARY KEY,owner TEXT,body TEXT);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,body TEXT);
 CREATE TABLE IF NOT EXISTS character_profiles(id TEXT PRIMARY KEY,body TEXT);`);}
 settings(){const row=this.db.prepare('SELECT body FROM settings WHERE key=?').get('school');return row?JSON.parse(row.body):{feedback:'batch',characterId:'xiaoping',batchSize:5,version:1};}
 updateSettings(b){const s=this.settings();if(b.feedback!==undefined&&!['batch','each'].includes(b.feedback))throw new Error('反馈方式无效');
  if(b.characterId!==undefined&&!this.characters().some(c=>c.id===b.characterId&&c.views?.length))throw new Error('形象尚未生成可用视图');
  if(b.batchSize!==undefined&&(!Number.isInteger(b.batchSize)||b.batchSize<1||b.batchSize>20))throw new Error('每组题数应为 1—20');
  const v={feedback:b.feedback??s.feedback,characterId:b.characterId??s.characterId,batchSize:b.batchSize??s.batchSize,version:s.version+1};
  this.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').run('school',JSON.stringify(v));return v;
 }
 characters(){return [...characters,...this.db.prepare('SELECT body FROM character_profiles').all().map(r=>JSON.parse(r.body))];}
 addCharacter(c){this.db.prepare('INSERT INTO character_profiles VALUES(?,?)').run(c.id,JSON.stringify(c));return c;}
 cards(major=''){return this.store.all().filter(q=>q.status==='published'&&visualTypes.includes(q.candidate?.type)&&q.candidate?.visual&&q.candidate?.answer!==null&&sequenceReady(q.candidate)&&(!major||q.source.majorName===major));}
 get(id,owner){const row=this.db.prepare('SELECT body FROM learning_runs WHERE id=? AND owner=?').get(id,owner);if(!row)throw new Error('练习不存在');const r=JSON.parse(row.body);if(r.preview)throw new Error('历史检查记录仅供教师使用，学生端不提供试用题');return r;}
 save(r){this.db.prepare('INSERT INTO learning_runs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(r.id,r.owner,JSON.stringify(r));return r;}
 list(owner){return this.db.prepare('SELECT body FROM learning_runs WHERE owner=? ORDER BY rowid DESC').all(owner).map(r=>JSON.parse(r.body)).filter(r=>!r.preview);}
 summary(owner,major=''){return this.list(owner).filter(r=>(!major||r.cards.every(q=>q.source.majorName===major))&&(r.status!=='active'||r.cards.every(q=>{const current=this.store.get(q.id);return current?.status==='published'&&current.version===q.version;}))).map(r=>({id:r.id,status:r.status,total:r.cards.length,answered:Object.keys(r.selections).length,correct:r.status==='submitted'?r.results.filter(x=>x.correct).length:undefined,createdAt:r.createdAt,feedback:r.settings.feedback}));}
 view(r){const view={id:r.id,status:r.status,cards:r.cards.map(publicCard),selections:r.selections,settings:r.settings,character:this.characters().find(c=>c.id===r.settings.characterId),createdAt:r.createdAt};
  if(r.status==='submitted')view.results=r.results;
  else if(r.settings.feedback==='each')view.results=r.results;
  return view;
 }
 start(owner,{wrongOnly=false,ids,major=''}={}){
  const settings={...this.settings(),...(major?{batchSize:10}:{})};let cards=this.cards(major).reverse();
  if(wrongOnly){const last=new Map();for(const r of this.list(owner).filter(r=>r.status==='submitted'))for(const a of r.results)if(!last.has(a.questionId))last.set(a.questionId,a.correct);cards=cards.filter(q=>last.get(q.id)===false);}
  if(Array.isArray(ids))cards=cards.filter(q=>ids.includes(q.id));
  if(major)for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  if(major&&!wrongOnly&&cards.length<10)throw new Error('本专业正式题库暂未准备好，满10道可用题后即可开始练习');
  if(major&&!wrongOnly){const recent=this.list(owner).slice(0,2).flatMap(r=>r.cards.map(knowledgeKey));cards=diverseSample(cards,settings.batchSize,{recent});}
  else cards=cards.slice(0,settings.batchSize);if(!cards.length)throw new Error(wrongOnly?'暂无错题':'暂无可学习卡片');
  cards=structuredClone(cards);for(const q of cards)if(q.candidate.route==='R8'){const c=q.candidate,order=c.options.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}const old=c.options;c.options=order.map(i=>old[i]);c.answer=c.answer.map(i=>order.indexOf(i));}
  const r={id:randomUUID(),owner,status:'active',settings,cards,selections:{},results:[],createdAt:new Date().toISOString()};this.save(r);return this.view(r);
 }
 result(q,selection){return {questionId:q.id,version:q.version,selection,answer:q.candidate.answer,correct:grade(q.candidate,selection),explanation:q.candidate.explanation,sourceUrl:q.candidate.sourceUrl||q.source.sourceUrl,caseInfo:q.candidate.caseInfo};}
 checkCurrent(q){const current=this.store.get(q.id);if(!current||current.status!=='published'||current.version!==q.version||!sequenceReady(current.candidate))throw new Error('题目已更新或撤回，请重新开始本组');}
 select(id,owner,{questionId,selection}){const r=this.get(id,owner);if(r.status!=='active')throw new Error('本组已提交');const q=r.cards.find(q=>q.id===questionId);if(!q)throw new Error('题目不属于本组');this.checkCurrent(q);
  if(!validSelection(q.candidate,selection))throw new Error('请完成当前卡片');
  if(r.settings.feedback==='each'&&Object.hasOwn(r.selections,questionId))throw new Error('此题已揭晓，不能修改');
  r.selections[questionId]=selection;let feedback;
  if(r.settings.feedback==='each'){feedback=this.result(q,selection);r.results.push(feedback);}
  this.save(r);return {saved:true,answered:Object.keys(r.selections).length,...(feedback?{feedback}:{})};
 }
 submit(id,owner){const r=this.get(id,owner);if(r.status==='submitted')return this.view(r);
  for(const q of r.cards){this.checkCurrent(q);if(!Object.hasOwn(r.selections,q.id))throw new Error('请完成全部卡片后提交');}
  r.results=r.cards.map(q=>this.result(q,r.selections[q.id]));r.status='submitted';r.submittedAt=new Date().toISOString();
  this.db.exec('BEGIN');try{for(const result of r.results){const q=r.cards.find(q=>q.id===result.questionId);const a={id:randomUUID(),questionId:q.id,version:q.version,choice:result.selection,correct:result.correct,topic:q.source.topic,clientId:owner,runId:r.id,at:r.submittedAt};this.db.prepare('INSERT INTO attempts VALUES(?,?)').run(a.id,JSON.stringify(a));}this.save(r);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
  return this.view(r);
 }
}
