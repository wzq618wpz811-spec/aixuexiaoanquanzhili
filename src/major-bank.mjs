import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import path from 'node:path';

const excludedIds=new Set(['QS04986','QS05034','QS04206']);
const clean=s=>String(s??'').trim();

export class MajorBank {
 constructor(file){
  this.file=file;
  this.db=existsSync(file)?new DatabaseSync(file,{readOnly:true}):null;
 }
 available(){return !!this.db;}
 majors(){if(!this.db)return [];
  return this.db.prepare('SELECT major_name AS name, major_category AS category, major_group AS majorGroup, scenario_type AS scenario FROM major_scenarios ORDER BY id').all();
 }
 major(name){return this.majors().find(x=>x.name===name)||null;}
 candidates(majorName){
  const major=this.major(majorName);if(!major)throw new Error('请选择题库中已有的专业');
  const rows=this.db.prepare("SELECT question_id AS sourceQuestionId, item_id AS knowledgePointId, template AS sourceTemplate, stem, option_a AS a, option_b AS b, option_c AS c, option_d AS d, correct_answer AS answer, lab_type AS labType, category, safety_scenario AS topic, regulation_basis AS sourceTitle, major_tags AS majorTags, question_type AS sourceType FROM question_bank WHERE status='启用'").all();
  return rows.filter(r=>{
   if(excludedIds.has(r.sourceQuestionId)||r.labType!==major.scenario)return false;
   const options=[r.a,r.b,r.c,r.d].map(clean);
   if(new Set(options).size!==4||!['A','B','C','D'].includes(r.answer))return false;
   let tags=[];try{tags=JSON.parse(r.majorTags||'[]')}catch{}
   return tags.includes('全专业')||tags.includes(major.name)||tags.includes(major.majorGroup)||tags.includes(major.category);
  }).map(r=>({
   sourceQuestionId:r.sourceQuestionId,knowledgePointId:r.knowledgePointId,sourceTemplate:r.sourceTemplate,stem:r.stem,options:[r.a,r.b,r.c,r.d],answer:r.answer.charCodeAt(0)-65,
   topic:r.topic||r.category,sourceTitle:r.sourceTitle||'原始题库',sourceUrl:'',sourceType:r.sourceType,
   majorName:major.name,majorTags:[major.name],majorScenario:major.scenario,labType:r.labType,
   explanation:'原始题库答案；具体依据和改编画面须复核。'
  }));
 }
 pick(majorName,count=10,excludeIds=[]){
  const excluded=new Set(excludeIds),rows=this.candidates(majorName).filter(x=>!excluded.has(x.sourceQuestionId));
  for(let i=rows.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]]}
  const points=new Set();return rows.filter(q=>{const key=q.knowledgePointId||q.sourceQuestionId;if(points.has(key))return false;points.add(key);return true;}).slice(0,Math.max(0,Math.min(count,20)));
 }
 close(){this.db?.close()}
}
export const defaultBankPath=root=>path.join(root,'data','question-bank.sqlite');
