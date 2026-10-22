import {createHash} from 'node:crypto';
import {offlineRows as taskRows} from './professional-curriculum.mjs';
import {concepts} from './foundation-bank.mjs';
import {commonTopicCases,topicPacks,topicPackFor,topicReferences,supplementaryKnowledgeAliases} from '../config/diverse-topic-cases.mjs';
import {extraOriginalTopics,originalKnowledgeAliases} from '../config/original-topic-expansion.mjs';
import {topicScene} from '../config/topic-scene-bindings.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const shuffle=(a,key)=>a.map((v,i)=>({v,key:hash(key+'|'+i)})).sort((a,b)=>a.key.localeCompare(b.key)).map(x=>x.v);
const references={management:'https://www.moe.gov.cn/srcsite/A16/s3336/201905/t20190531_383962.html',electrical:'https://ce.sysu.edu.cn/zh-hans/article/630',general:'https://www.htu.edu.cn/smkxsfzx/2020/0107/c12754a161810/page.psp',mechanical:'https://lab.hubu.edu.cn/info/1037/1919.htm',campus:'https://www.ynufe.edu.cn/sysysyjxglzx/info/1372/3662.htm'};
const laboratoryMajor=/化学|化工|材料|冶金|机械|过程装备|车辆|能源|电气|智能电网|自动化|机器人|电子信息|通信工程|微电子|光电|集成电路|土木|给排水|道路桥梁|安全工程|采矿|矿物|地质|资源勘查|航空|飞行器|武器|核工程|纺织|轻化|包装|印刷|食品|生物|环境工程|环境科学|基础医学|医学检验|药物制剂|中药学|农学|园艺|植物保护|动物科学|林学|物理/;
export function suitableOriginal(q,major){const proposition=q.options[q.answer];
 if(/化学|试剂|有机溶剂|腐蚀|浓硫酸|强酸|强碱|废液|氧化剂|还原剂|通风橱/.test(proposition)&&!/化学|化工|材料|环境|生物|医学|农学/.test(major.scenario))return false;
 if(/生物安全|培养物|菌种|毒种|病原|消毒/.test(proposition)&&!/生物|医学|农学/.test(major.scenario))return false;
 if(/机床|车床|砂轮|钻床|切屑|卡盘|皮带传动|冲压/.test(proposition)&&!/机械|材料|物理/.test(major.scenario))return false;
 return true;
}
const replace=(s,p,major)=>s.replaceAll('{task}',p.task).replaceAll('{item}',p.item).replaceAll('{major}',major);
export function offlineRows(bank,{assetsRoot,exists}){
 const old=taskRows(bank,{assetsRoot,exists}),rows=[],profiles=[],rules=[...old.rules];
 for(const major of bank.majors()){
  const p=old.profiles.find(p=>p.major===major.name),seed=old.rows.filter(q=>q.source.majorName===major.name),id=hash(major.name).slice(0,10),pool=[];
  // Only a small optional part of a round may concern the old single task.
  for(const q of seed.filter(q=>['R2','R3','R4','R5','R7','R8'].includes(q.candidate.route))){
   if(q.source.sourceQuestionId.endsWith('R4B'))continue;
   const c=structuredClone(q.candidate),flow=['R2','R5','R8'].includes(c.route),key=flow?'course-flow':c.route==='R3'?'document-version':c.route==='R4'?'handoff-proof':'archive-routing';
   c.knowledgePointId=key;c.knowledgeDomain='课程材料流程';c.provenance.contentKind='course-task';c.provenance.taskCluster='course-materials';pool.push({source:q.source,candidate:c});
  }
  // Use the actual laboratory mapping as well as the name; 制药工程 was previously
  // missed by the name regex and incorrectly received business-only cases.
  const rawEligible=(laboratoryMajor.test(major.name)||/实验室/.test(major.scenario))&&!/公共机房|公共阅览室|计算机实验室/.test(major.scenario),seen=new Set();
  if(rawEligible){
   const raw=bank.candidates(major.name).filter(q=>q.sourceTemplate==='T1'&&/下列说法正确/.test(q.stem)&&suitableOriginal(q,major));
   for(const concept of shuffle(concepts,major.name+'original')){
    const q=raw.find(q=>concept[1].test(q.options[q.answer]));if(!q?.knowledgePointId||seen.has(originalKnowledgeAliases.get(q.knowledgePointId)||q.knowledgePointId))continue;seen.add(originalKnowledgeAliases.get(q.knowledgePointId)||q.knowledgePointId);
    const image='assets/offline/'+concept[2]+'.png';if(!exists(assetsRoot+'/'+image))throw new Error('缺少原题考点场景图：'+image);
    const dialogue=parseInt(hash(major.name+q.knowledgePointId).slice(0,2),16)%3===0;
    const c={provider:'gpt-pregenerated-v1',route:dialogue?'R6':'R1',type:'illustrated',knowledgePointId:q.knowledgePointId,knowledgeDomain:q.topic,stem:q.stem.replace(/（[　 ]*）/g,''),conditions:[],options:q.options.map(text=>({text})),answer:q.answer,explanation:concept[4],sourceUrl:references[concept[5]],issues:[],visual:{kind:'generated',image,labels:concept[3]},provenance:{mode:'pregenerated',liveApiCalled:false,contentKind:'original-bank',originalQuestionId:q.sourceQuestionId,originalKnowledgePointId:q.knowledgePointId,relevance:p.relevance}};
    if(dialogue){c.stem='在'+major.scenario+'，交小安提出图中的建议。下列哪项说法符合'+q.topic+'要求？';c.visual.overlay={type:'dialogue',speaker:'交小安',text:q.options[(q.answer+1)%4]};}
    if(concept[0]==='shards'){
     c.route='R7';c.type='image_choice';c.stem='在'+major.scenario+'清理碎玻璃，哪幅图中的做法符合收集要求？';c.visual={kind:'generated',image:'assets/offline/glass-options.png'};
     c.options=q.options.map(text=>{const crop=/专用容器/.test(text)?1:/直接用手/.test(text)?2:/扫帚/.test(text)?0:3;return {text,image:c.visual.image,crop,caption:['扫入普通垃圾桶','放入硬质专用容器','徒手捡拾','混入普通垃圾'][crop]};});
    }
    c.knowledgePointId=originalKnowledgeAliases.get(q.knowledgePointId)||q.knowledgePointId;pool.push({source:q,candidate:c});
   }
   for(const q of raw){const binding=extraOriginalTopics.get(q.knowledgePointId),point=originalKnowledgeAliases.get(q.knowledgePointId)||q.knowledgePointId;if(!binding||seen.has(point))continue;seen.add(point);if(!exists(assetsRoot+'/'+binding.image))throw new Error('缺少新增考点场景图：'+binding.image);
    const dialogue=parseInt(hash(major.name+point).slice(0,2),16)%4===0,correct=q.options[q.answer];
    const candidate={provider:'gpt-pregenerated-v1',route:dialogue?'R6':'R1',type:'illustrated',knowledgePointId:point,knowledgeDomain:q.topic,stem:q.stem.replace(/（[　 ]*）/g,''),conditions:[],options:q.options.map(text=>({text})),answer:q.answer,explanation:correct+'。'+binding.reason,sourceUrl:binding.reference,issues:[],visual:{kind:'generated',image:binding.image,labels:[major.scenario]},provenance:{mode:'pregenerated',liveApiCalled:false,contentKind:'original-bank',originalQuestionId:q.sourceQuestionId,originalKnowledgePointId:q.knowledgePointId,relevance:p.relevance}};
    if(binding.crop!==null)candidate.visual.crop=binding.crop;if(dialogue){candidate.stem='在'+major.scenario+'，交小安提出图中的建议。下列哪项说法符合'+q.topic+'要求？';candidate.visual.overlay={type:'dialogue',speaker:'交小安',text:q.options[(q.answer+1)%4]};}
    if(q.knowledgePointId==='KN-078'){
     const crops=q.options.map(text=>/专用推车/.test(text)?2:/瓶阀/.test(text)?0:/肩/.test(text)?1:/滚动/.test(text)?3:-1);
     if(new Set(crops).size===4&&!crops.includes(-1)){const image='assets/curriculum/cylinder-transport-options.png';candidate.route='R2';candidate.type='image_choice';candidate.stem='在'+major.scenario+'需要搬运气瓶，哪幅图中的做法符合搬运要求？';candidate.visual={kind:'generated',image};candidate.options=q.options.map((text,i)=>({text,image,crop:crops[i],caption:['抓住瓶阀提起','扛在肩上','用专用推车搬运','放在地面滚动'][crops[i]]}));}
    }
    pool.push({source:q,candidate});
   }
   const incidentImage='assets/generated/53f0538ab2c1cb038d070b50.png',incidentOptions=['用水浇冒烟插座','从已确认安全的位置切断电源','用湿布覆盖冒烟插座','只打电话、不先采取可安全完成的断电措施'];
   if(exists(assetsRoot+'/'+incidentImage)){
    const stem='在'+major.scenario+'发现设备插座冒烟，已确认可以从远离冒烟处的位置安全切断该设备电源。此时首先应选择哪幅图中的行动？',sourceUrl='https://ce.sysu.edu.cn/zh-hans/article/630';
    pool.push({source:{sourceQuestionId:'SUP7-'+id+'-smoke',knowledgePointId:'KN-006',stem,options:incidentOptions,answer:1,topic:'电气异常处置',sourceTitle:'有明确安全前提的补充情境题',sourceType:'补充异常处置情境',sourceUrl,majorName:major.name,majorScenario:major.scenario,majorTags:[major.name]},candidate:{provider:'gpt-pregenerated-v1',route:'R5',type:'image_choice',stem,conditions:[],knowledgePointId:'KN-006',knowledgeDomain:'应急处理与急救',options:incidentOptions.map((text,crop)=>({text,image:incidentImage,crop,caption:['泼水','安全位置断电','湿布覆盖','仅打电话'][crop]})),answer:1,explanation:'题干已确认可以在远离冒烟处安全切断电源，先选择该安全措施；不能向可能带电的插座泼水或覆盖湿布。若无法安全断电，应远离危险并按现场规定报警、疏散和报告，不冒险靠近。',sourceUrl,issues:[],visual:{kind:'generated',image:incidentImage},provenance:{mode:'pregenerated',liveApiCalled:false,contentKind:'supplementary-topic',specificTopic:true,relevance:p.relevance,topicCase:'electrical-response'}}});
   }
  }
  const pack=topicPackFor(major.name,p.family),core=rawEligible?[]:topicPacks[pack].filter(q=>!(pack==='media'&&/音乐|日语/.test(major.name)&&/location|gear/.test(q.id)));
  const common=shuffle(commonTopicCases,major.name+'common').slice(0,rawEligible?6:10);
  for(const topic of [...core,...common]){
   const key=id+'-'+topic.id,dialogue=parseInt(hash(key).slice(0,2),16)%3===0,ref=topicReferences[topic.reference],ruleId='case-'+key;
   const sourceUrl=ref.url||'http://127.0.0.1:4186/task-rules.html#'+ruleId;
   const originalStem='在'+major.name+'课程实训中，'+replace(topic.stem,p,major.name),choices=shuffle([{text:replace(topic.correct,p,major.name),correct:true},...topic.wrong.map(text=>({text:replace(text,p,major.name)}))],key);
   const binding=topicScene(topic.id),image=binding.image,route=dialogue?'R6':'R1',stem=dialogue?originalStem+' 请结合图中交小安的建议选择合适做法。':originalStem;
   if(!exists(assetsRoot+'/'+image))throw new Error('缺少考点对应场景图：'+topic.id+' / '+image);
   const candidate={provider:'gpt-pregenerated-v1',route,type:'illustrated',knowledgePointId:topic.id,knowledgeDomain:topic.reference==='integrity'?'研究诚信':topic.reference==='privacy'?'个人信息保护':topic.domain,stem,conditions:[],options:choices.map(({correct,...o})=>o),answer:choices.findIndex(o=>o.correct),explanation:'本题考查“'+topic.title+'”。'+replace(topic.correct,p,major.name)+'。判断应结合题干的授权、事实与课程任务范围。',sourceUrl,issues:[],visual:{kind:'generated',image,crop:binding.crop,sceneId:binding.sceneId,labels:[]},provenance:{mode:'pregenerated',liveApiCalled:false,contentKind:'supplementary-topic',specificTopic:!topic.id.startsWith('common-'),topicPack:pack,topicCase:topic.id,relevance:p.relevance,referenceTitle:ref.title,sceneDescription:binding.description}};
   if(dialogue)candidate.visual.overlay={type:'dialogue',speaker:'交小安',text:'我打算这样做：'+replace(topic.wrong[0],p,major.name)+'。'};
   const source={sourceQuestionId:'MIX7-'+key,knowledgePointId:topic.id,stem:originalStem,options:candidate.options.map(o=>o.text),answer:candidate.answer,topic:topic.title,sourceTitle:ref.title,sourceType:'补充多主题课程情境题',sourceUrl,majorName:major.name,majorScenario:p.scenario,majorTags:[major.name],explanation:candidate.explanation};
   candidate.knowledgePointId=supplementaryKnowledgeAliases.get(topic.id)||topic.id;source.knowledgePointId=candidate.knowledgePointId;
   pool.push({source,candidate});rules.push({id:ruleId,major:major.name,task:topic.title,item:originalStem,code:'课程情境',steps:[],recordFields:[],policy:'按题干给定条件作答；不替代真实业务授权或实际操作规程。'});
  }
  const points=new Set(pool.map(q=>q.candidate.knowledgePointId));if(points.size<14)throw new Error('独立考点不足，不能用同题换问法补齐：'+major.name);
  const originals=pool.filter(q=>q.candidate.provenance.contentKind==='original-bank').length;
  profiles.push({...p,count:pool.length,perRound:10,independentKnowledgePoints:points.size,originalQuestions:originals,supplementaryQuestions:pool.length-originals,routes:[...new Set(pool.map(q=>q.candidate.route))],questions:pool.map(q=>q.source.sourceQuestionId)});rows.push(...pool);
 }
 return {rows,profiles,rules};
}
