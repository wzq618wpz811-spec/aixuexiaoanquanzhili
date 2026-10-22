import {writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadPilot,pilotSummary} from '../../src/visual-pilot.mjs';
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const report=pilotSummary(),pilot=loadPilot(),manifest=JSON.parse(readFileSync(path.join(root,'docs/research/visual-pilot-generation.json'),'utf8'));
const result={...report,generatedAt:new Date().toISOString(),realImagegenCalls:manifest.items.length,artifacts:manifest.items.map(a=>({id:a.id,path:a.path,sha256:a.sha256,kind:a.kind,repeat_of:a.repeat_of})),answerForms:Object.fromEntries(['single','multi','judge','fill','short'].map(kind=>[kind,pilot.cards.filter(c=>c.interaction===kind).length])),measurementLimits:['规则通过不等于独立视觉验收；图像观察由同一Codex执行','6条源题问题由精读预先标注，不能当成自动语义检出率','迁移组仅3题人工适配，不是盲测自动泛化','7次生图含2次独立复产；不足以估计长期生成通过率','未做真实学生学习效果试验，未做安全专家全面审定','正式发布0题，应用在线生成0次，演示数据库未写入']};
const browserPath=path.join(root,'artifacts/visual-pilot/browser-results.json');
if(existsSync(browserPath)){
  const browser=JSON.parse(readFileSync(browserPath,'utf8'));
  result.browserVerification={checkedCards:browser.checkedCards,widths:browser.widths,layoutChecks:browser.layoutChecks,errors:browser.errors,demoDatabaseUnchanged:browser.demoDatabaseUnchanged,temporaryDatabaseUsed:browser.temporaryDatabaseUsed,compositionPixels:browser.compositionPixels,screenshots:browser.screenshots};
}
result.imageDifferences=JSON.parse(readFileSync(path.join(root,'docs/research/visual-pilot-image-differences.json'),'utf8'));
result.evidenceRequired=pilot.cards.reduce((n,c)=>n+c.evidence.filter(e=>e.required).length,0);
result.knownNegativeControls=pilot.cards.filter(c=>c.cohort==='negative').map(c=>({id:c.id,source_ref:c.source_ref,issues:c.semantic_review.risks}));
mkdirSync(path.join(root,'artifacts/visual-pilot'),{recursive:true});
writeFileSync(path.join(root,'artifacts/visual-pilot/current-evaluation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({byCohort:result.byCohort,realImagegenCalls:result.realImagegenCalls,answerForms:result.answerForms,productionPublished:0}));
