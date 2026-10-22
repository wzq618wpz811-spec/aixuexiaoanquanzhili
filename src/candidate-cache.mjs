import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
export class CandidateCache {
 constructor(dir,assetsRoot){this.dir=dir;this.assetsRoot=assetsRoot;}
 key(source,{model,planner,version,reference,reviewedPlan}){const {stem,options,answer,topic,sourceUrl,sourceQuestionId,sourceType}=source;return createHash('sha256').update(JSON.stringify({stem,options,answer,topic,sourceUrl,sourceQuestionId,sourceType,model,planner,version,reference,reviewedPlan})).digest('hex');}
 valid(candidate){
  if(!candidate?.visual?.image)return false;
  if(candidate.type==='order'&&candidate.options.some(o=>!o.image))return false;
  const paths=[candidate.visual.image,...candidate.options.flatMap(o=>[o.image,o.carrier].filter(Boolean))];
  return paths.every(p=>{const file=path.resolve(this.assetsRoot,p);return file.startsWith(path.resolve(this.assetsRoot)+path.sep)&&existsSync(file)});
 }
 get(key){try{const c=JSON.parse(readFileSync(path.join(this.dir,key+'.json'),'utf8'));return this.valid(c)?structuredClone(c):null;}catch{return null;}}
 put(key,candidate){if(!this.valid(candidate))return false;mkdirSync(this.dir,{recursive:true});const dest=path.join(this.dir,key+'.json');writeFileSync(dest,JSON.stringify(candidate));return true;}
}
