import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {QwenImageService,DeepSeekPlanner,imagePrompt} from '../../src/visual-pipeline.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),file=path.join(root,'data/business-type-samples.json');
const data=JSON.parse(readFileSync(file,'utf8'));
const planner=new DeepSeekPlanner(),service=new QwenImageService({assetsDir:path.join(root,'web/assets/generated'),referencePath:path.join(root,'web/assets/character-atlas.png')});
const a=data.samples.find(x=>x.id==='R2');
const description='近距离俯拍浅木色电脑桌上的两个完整白色插线板。第一块插线板在左侧，电源线沿桌边连接墙壁插座；第二块在右侧，第二块自身的黑色电源线必须能够从其外壳左端连续清楚地追踪到插在第一块插线板插孔中的三脚插头。第二块再接电脑的黑色电源插头。这是两块独立插线板首尾串接，禁止将它们画成一块。人物仅露一只蓝色公仔手指向两块插排之间的连接插头。不要人物面部，不要任何文字。';
const prompt=imagePrompt(a.source,{sceneDescription:'公共机房电脑桌，浅木色桌面，柔和自然光。',stepContext:'同一道插线板题的接线近景，保持哑光3D材质与浅木色桌面。'},{singleScene:description});
console.log('R2 A repairing');
const result=await service.generate(prompt),check=await planner.audit(result.bytes,{route:'R1',expectedLayout:'single',sceneDescription:description});
a.candidate.options[0]={...a.candidate.options[0],image:result.relative};delete a.candidate.options[0].crop;
a.candidate.issues=['原始题库没有可核查的依据链接',...(!check.pass?check.issues:[])];
a.reviewNotes=['初版A未画出串接关系，已单独重做接线近景。','部分人物仍继承参考形象的护目镜，作为后续风格调整项。'];
writeFileSync(path.join(root,'artifacts/business-type-samples/R2.json'),JSON.stringify(a,null,2));
for(const id of ['R5','R6','R7']){
 const q=data.samples.find(x=>x.id===id);
 q.reviewNotes=['采用实际API生成；人物仍继承参考形象的护目镜，后续需统一日常穿着。'];
 if(id==='R5')q.reviewNotes.push('B图的总开关位置与器材形态仍需安全教师确认，当前仅供检查样题。');
 if(id==='R7')q.reviewNotes.push('第三图铲子旁可见部分电池，需检查在手机上是否足够醒目。');
 if(id==='R6'){
  const audit=await planner.audit(readFileSync(path.join(root,'web',q.candidate.visual.image)),q.candidate.plan);
  q.candidate.issues=['原始题库没有可核查的依据链接',...(!audit.pass?audit.issues:[])];
 }
 writeFileSync(path.join(root,'artifacts/business-type-samples',id+'.json'),JSON.stringify(q,null,2));
}
writeFileSync(file,JSON.stringify(data,null,2));
console.log(JSON.stringify({id:'R2-A',image:result.relative,audit:check}));
