import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {MajorBank} from '../../src/major-bank.mjs';
import {Store} from '../../src/store.mjs';
import {VisualProvider,DeepSeekPlanner,QwenImageService} from '../../src/visual-pipeline.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const clean=value=>{let s=String(value);for(const key of [process.env.DASHSCOPE_API_KEY,process.env.DEEPSEEK_API_KEY])if(key)s=s.split(key).join('[REDACTED]');return s};
const bank=new MajorBank(path.join(root,'data/question-bank.sqlite'));
const store=new Store(path.join(root,'data'));
try{
 const source=bank.candidates('工商管理').find(q=>q.sourceQuestionId==='QS05622');
 if(!source)throw new Error('试跑题目不存在');
 let q=store.all().find(q=>q.source.sourceQuestionId===source.sourceQuestionId&&q.source.majorName===source.majorName);
 if(q?.candidate?.visual){console.log(JSON.stringify({status:'reused',questionId:q.id,image:q.candidate.visual.image}));}
 else{
  if(!q){const result=store.import(JSON.stringify([source]));q=store.get(result.ids[0]);}
  const provider=new VisualProvider({planner:new DeepSeekPlanner(),imageService:new QwenImageService({assetsDir:path.join(root,'web/assets/generated'),referencePath:path.join(root,'web/assets/character-atlas.png')})});
  console.log(JSON.stringify({stage:'starting',sourceQuestionId:source.sourceQuestionId,model:provider.imageService.model}));
  const candidate=await provider.generate(source);
  store.applyCandidate(q.id,candidate);
  const out=path.join(root,'artifacts/live-trial');mkdirSync(out,{recursive:true});
  writeFileSync(path.join(out,'result.json'),JSON.stringify({questionId:q.id,source,candidate},null,2));
  console.log(clean(JSON.stringify({stage:'finished',questionId:q.id,route:candidate.route,image:candidate.visual?.image||null,issues:candidate.issues,report:path.join(out,'result.json')})));
  if(!candidate.visual)process.exitCode=1;
 }
}catch(error){console.error(clean(error.message));process.exitCode=1;}
finally{bank.close();store.db.close();}
