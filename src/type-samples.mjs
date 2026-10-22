import {readFileSync,existsSync} from 'node:fs';
import {grade,validSelection} from './learning.mjs';

export class TypeSamples {
 constructor(file){this.file=file;}
 rows(){return existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')).samples||[]:[];}
 publicRows(){return this.rows().map(s=>{
  const c=structuredClone(s.candidate);
  // Keep archived source, answer and review evidence intact; update the trial presentation.
  if(s.id==='R2'){c.stem='在课程实训机房，插线板额定最大允许负荷为2500W。哪幅图中的插线板使用方式符合要求？';c.options[1].caption='单一插排 · 设备合计800W';}
  if(s.id==='R7')c.stem='交小平更换无线鼠标的充电电池后，应将废旧充电电池交至图中的哪一处？';
  return {id:s.id,title:s.title,route:c.route,stem:c.stem,type:c.type,interaction:c.interaction,conditions:[],visual:c.visual,options:c.options.map(({stepId,...o})=>o),origin:s.origin,inspectionWarning:s.inspectionWarning||'',sourceQuestionId:s.source.sourceQuestionId,sourceStem:s.original?.stem||s.source.stem,sourceOptions:s.original?.options||s.source.options,conversionNotes:s.conversionNotes,reviewNotes:s.reviewNotes||[],issues:c.issues,generatedAt:c.generatedAt};
 });}
 answer(id,selection){const row=this.rows().find(s=>s.id===id);if(!row)throw new Error('样题不存在');if(!validSelection(row.candidate,selection))throw new Error('请先完成选择；排序题需点击全部步骤');return {correct:grade(row.candidate,selection),answer:row.candidate.answer,explanation:row.candidate.explanation,referenceStatus:row.origin.includes('补充')?'补充测试题参考答案':'原题库答案／改编版参考答案，供检查',sourceUrl:row.candidate.sourceUrl||''};}
}
