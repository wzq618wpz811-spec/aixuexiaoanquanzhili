import {visualKeys} from './visual-identity.mjs';
export const knowledgeKey=q=>q.candidate.knowledgePointId||q.source.knowledgePointId||q.source.sourceQuestionId||q.id;
const domainKey=q=>q.candidate.knowledgeDomain||((q.candidate.knowledgePointId||q.source.knowledgePointId)?q.source.topic:knowledgeKey(q));
export function diverseSample(cards,count,{recent=[],random=Math.random,fillRemaining=false}={}){
 const history=new Map();for(const [index,key] of recent.entries())if(!history.has(key))history.set(key,index);
 const candidates=cards.map(q=>({q,key:knowledgeKey(q),visuals:visualKeys(q),tie:random()}));
 const selected=[],points=new Set(),images=new Set(),domains=new Map(),routes=new Set();
 const isTask=q=>q.candidate.provenance?.contentKind==='course-task';
 function take({originalOnly=false,specificOnly=false,maxDomain=2,preferRoutes=false}={}){
  const choices=candidates.filter(({q,key,visuals})=>!points.has(key)&&!visuals.some(key=>images.has(key))&&(!originalOnly||q.candidate.provenance?.contentKind==='original-bank')&&(!specificOnly||q.candidate.provenance?.specificTopic)&&(domains.get(domainKey(q))||0)<maxDomain&&(!isTask(q)||selected.filter(isTask).length<2));
  choices.sort((a,b)=>{
   const recentA=history.has(a.key),recentB=history.has(b.key);if(recentA!==recentB)return recentA?1:-1;
   if(preferRoutes){const aNew=!routes.has(a.q.candidate.route),bNew=!routes.has(b.q.candidate.route);if(aNew!==bNew)return aNew?-1:1;}
   const da=domains.get(domainKey(a.q))||0,db=domains.get(domainKey(b.q))||0;
   return da-db||(recentA&&recentB?history.get(b.key)-history.get(a.key):0)||a.tie-b.tie;
  });
  const chosen=choices[0];if(!chosen)return false;selected.push(chosen.q);points.add(chosen.key);for(const key of chosen.visuals)images.add(key);routes.add(chosen.q.candidate.route);const domain=domainKey(chosen.q);domains.set(domain,(domains.get(domain)||0)+1);return true;
 }
 const availableOriginals=new Set(cards.filter(q=>q.candidate.provenance?.contentKind==='original-bank').map(knowledgeKey)).size;
 const originalTarget=availableOriginals>=10?Math.min(8,count):availableOriginals>=6?Math.min(6,count):0;
 for(let i=0;i<originalTarget;i++)if(!take({originalOnly:true,maxDomain:2,preferRoutes:true}))break;
 if(!originalTarget&&cards.some(q=>q.candidate.provenance?.specificTopic))for(let i=0;i<Math.min(4,count);i++)if(!take({specificOnly:true,maxDomain:2,preferRoutes:true}))break;
 while(selected.length<count&&take({maxDomain:2,preferRoutes:true})){}
 // A domain can contain several genuinely different points; only relax its cap.
 // Never repeat a knowledge point or let the old single-task group exceed two.
 while(selected.length<count&&take({maxDomain:3,preferRoutes:true})){}
 // A demo pool can contain distinct questions sharing a concept or picture.
 // Practice still fills its requested size when the caller explicitly allows it.
 if(fillRemaining&&selected.length<count){const ids=new Set(selected.map(q=>q.id));for(const {q} of candidates){if(selected.length>=count)break;if(!ids.has(q.id)){selected.push(q);ids.add(q.id);}}}
 if(selected.length<count)throw new Error('本专业尚未备齐10道考点与配图均不重复的正式题，请教师补充对应素材后再开始');
 for(let i=selected.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
 return selected;
}
