import {createHash} from 'node:crypto';
import {majorRelevance} from '../config/major-relevance.mjs';
import {families,taskProfiles} from '../config/major-tasks.mjs';
import {workflowOverrides} from '../config/major-workflows.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const number=s=>parseInt(hash(s).slice(0,7),16);
const shuffled=(a,key)=>a.map((v,i)=>({v,rank:hash(key+'|'+i)})).sort((a,b)=>a.rank.localeCompare(b.rank)).map(x=>x.v);
const cropFor=step=>[2,0,3,1].indexOf(step),provider='gpt-pregenerated-v1';
export function offlineRows(bank,{assetsRoot,exists}){
 const rows=[],profiles=[],rules=[],majors=bank.majors();
 for(const major of majors){
  const p=taskProfiles.get(major.name);if(!p)throw new Error('尚未编写专业任务：'+major.name);
  const relevance=majorRelevance.get(major.name);if(!relevance)throw new Error('缺少专业适配检查项：'+major.name);
  const familyId=relevance.family,configured=workflowOverrides.get(major.name),override=familyId==='business'&&/停机|载体|样片/.test(configured?.steps.join(' ')||'')?null:configured,f={...families[familyId],steps:override?.steps||families[familyId].steps},scope=override?.scope||'仅限“'+p.task+'”确认的本次范围',taskId=hash(major.name).slice(0,10),code='TK-'+taskId.slice(0,4).toUpperCase(),sourceUrl='http://127.0.0.1:4186/task-rules.html#'+taskId;
  const workflow='assets/curriculum/'+familyId+'-workflow.png',places='assets/curriculum/'+familyId+'-destinations.png',scene=workflow;
  for(const image of [workflow,places,scene,'assets/blank-book.png'])if(!exists(assetsRoot+'/'+image))throw new Error('缺少专业素材：'+image);
  const chosen=[],relevanceNote={major:major.name,task:p.task,item:p.item,...relevance},taskRule={id:taskId,major:major.name,task:p.task,item:p.item,code,steps:f.steps,recordFields:f.objects,kind:'课程自定义教学任务；先后关系由本任务给定'};
  const policies=[
   {rule:p.item+'仅可用于“'+p.task+'”，未经确认不对外发布。',claim:'把'+p.item+'直接发到公开群，大家帮忙更方便。',response:'先核实发布权限；当前限定用途不包括公开群。'},
   {rule:p.task+'的汇总必须保留材料出处和版本，不用来源不明内容补齐。',claim:'缺的数据从不明帖子抄进来就行，不必记出处。',response:'保留出处与版本；不把来源不明内容混入本次结果。'},
   {rule:p.item+'的访问名单只有交小平、交小安，新增人员须先确认。',claim:'再给一名不在名单上的同学查看'+p.item+'，都是同班的。',response:'先确认新增访问权限，不能因同班身份自动扩权。'},
   {rule:p.task+'本次仅提交材料编号和任务统计数，不上传无关姓名、电话。',claim:'把遇到的姓名和手机号一并上传，资料越全越保险。',response:'仅提交本次需要的字段，移除不相关身份和联系信息。'},
   {rule:p.item+'存在冲突时先保留原始记录并标记，交负责人核实。',claim:p.item+'两处编号不一致，我猜一个直接改掉原件。',response:'保留原始记录并标记冲突，核实后按程序处理。'}
  ],policy=policies[number(major.name+'policy')%5];taskRule.policy=policy.rule;rules.push(taskRule);
  function add(slot,candidate,original={}){
   candidate={provider,conditions:[],issues:[],checks:[],explanation:'按本次课程任务给定的条件判断。',sourceUrl,provenance:{mode:'pregenerated',liveApiCalled:false,taskId,family:familyId,contentOrigin:'GPT补充课程任务；未冒充原题库题目或真实API结果',relevance:relevanceNote},...candidate};
   candidate.sourcePresentationVersion=6;
   const source={sourceQuestionId:'CUR6-'+taskId+'-'+slot,stem:original.stem||candidate.stem,options:original.options||candidate.options.map(o=>o.text),answer:original.answer??candidate.answer,topic:candidate.topic||p.task,sourceTitle:p.task+' · 任务说明',sourceType:slot==='R8'?'课程原始排序任务':'补充课程任务',sourceUrl,majorName:major.name,majorScenario:f.title,majorTags:[major.name],explanation:candidate.explanation};chosen.push({source,candidate});
  }
  const intro=[
   {slot:'R1A',topic:'来源与可追溯性',stem:'在“'+p.task+'”课程任务中，交小平发现“'+p.item+'”的'+relevance.check+'与原始记录不一致。哪种处理方式合适？',choices:[{text:'保留原始记录，标记差异并核实'+relevance.check,correct:true},{text:'直接猜填一组'+relevance.check+'，使两份材料一致'},{text:'删除有差异的原始记录，只保留修改后的结果'},{text:'不核对差异，继续把本批材料作为已确认资料使用'}],explanation:'“'+p.item+'”须能够追溯到对应来源；发现'+relevance.check+'不一致，应保留原始记录、标记差异并核实，不能猜填或删改原件。'},
   {slot:'R1B',topic:'专业资料使用边界',stem:'“'+p.task+'”小组仅获准在本课程内使用“'+p.item+'”。准备制作公开展示材料时，原件中还含有'+relevance.restricted+'。下列做法合适的是？',choices:[{text:'另做展示副本，移除'+relevance.restricted+'并核实展示授权',correct:true},{text:'直接公开“'+p.item+'”原件，课内使用权限也覆盖公开展示'},{text:'仅更改文件名，保留'+relevance.restricted+'后公开'},{text:'把原件发至公开群，请陌生人代为处理后再补授权'}],explanation:'题干的使用范围限于课程内，不能直接推定公开展示也已获授权。应另制展示副本、处理'+relevance.restricted+'并核实展示范围，原始材料保留在限定范围内。'}
  ];
  for(const q of intro){const list=shuffled(q.choices,taskId+q.slot);add(q.slot,{route:'R1',type:'illustrated',topic:q.topic,stem:q.stem,options:list.map(({correct,...o})=>o),answer:list.findIndex(o=>o.correct),visual:{kind:'generated',image:scene,crop:cropFor(0),labels:[p.task,p.item]},explanation:q.explanation});}
  function actions(salt){const indices=shuffled([0,1,2,3],taskId+salt);return {indices,options:indices.map(step=>({text:f.steps[step],caption:f.steps[step],image:workflow,crop:cropFor(step)}))};}
  const r2=actions('R2');add('R2',{route:'R2',type:'image_choice',topic:'材料核验',stem:p.task+'：刚收到“'+p.item+'”。开始处理这批材料时，首先应做哪幅图中的事？',options:r2.options,answer:r2.indices.indexOf(0),visual:{kind:'generated',image:workflow},explanation:'此时应先'+f.steps[0]+'，核验的对象是'+p.item+'；其他图片属于后续环节。'});
  const documents=shuffled([
   {title:p.task+'材料核验清单',code,version:'本次版本',valid:true},{title:p.task+'材料核验清单',code,version:'上次版本'},
   {title:p.task+'成果展示说明',code:'DISPLAY',version:'本次版本'},{title:p.task+'资料借还指南',code:'LOAN',version:'常用版本'}
  ],taskId+'R3');
  add('R3',{route:'R3',type:'image_choice',topic:'资料适配',stem:'本次“'+p.task+'”的任务编号为'+code+'。核查“'+p.item+'”时，应使用哪份现行材料核验资料？',options:documents.map(d=>({text:d.title+'｜'+d.code+'｜'+d.version,carrier:'assets/blank-book.png'})),answer:documents.findIndex(d=>d.valid),visual:{kind:'carrier',image:'assets/blank-book.png'},explanation:'资料名称、任务编号'+code+'与版本都须匹配，不能只凭封面相似或沿用旧版。'});
  const recordFields=[{label:'任务编号',value:code},{label:f.objects[0],value:p.item},{label:f.objects[1],value:scope},{label:'接收人',value:'交小安'}];
  const records=(options,salt,title)=>shuffled(options.map((fields,i)=>({text:'记录卡',record:{title,fields},image:'assets/blank-book.png',correct:i===0})),taskId+salt);
  const r4=records([recordFields,recordFields.map((x,i)=>i===3?{...x,value:''}:x),recordFields.map((x,i)=>i===0?{...x,value:'其他任务'}:x),recordFields.map((x,i)=>i===2?{...x,value:'范围未确认'}:x)],'R4',p.task+' · 交接记录');
  add('R4',{route:'R4',type:'image_choice',topic:'交接证据',stem:'交小平要将“'+p.item+'”移交给交小安。本次任务编号为'+code+'，确认范围为“'+scope+'”。哪张交接记录完整且与本次任务相符？',options:r4.map(({correct,...o},i)=>({...o,text:'记录卡 '+String.fromCharCode(65+i)})),answer:r4.findIndex(o=>o.correct),visual:{kind:'carrier',image:'assets/blank-book.png'},explanation:'逐项检查编号、材料、范围和人员，不能把“未确认”或空白当作已落实。'});
  const next=1+number(taskId+'next')%3,r5=actions('R5');
  add('R5',{route:'R5',type:'image_choice',topic:'条件决策',stem:'“'+p.task+'”已经完成'+f.steps.slice(0,next).join('、')+'。接下来应选择哪幅图中的做法？',options:r5.options,answer:r5.indices.indexOf(next),visual:{kind:'generated',image:workflow},explanation:'当前应进入“'+f.steps[next]+'”；不能跳过未完成环节。'});
  const responses=shuffled([{text:policy.response,correct:true},{text:'可以，只要最后把“'+p.task+'”做完就行。'},{text:'可以，修改文件名后就不用遵守这项要求。'},{text:'先这样处理，等“'+p.item+'”被发现有问题再补手续。'}],taskId+'R6');
  add('R6',{route:'R6',type:'illustrated',topic:'信息与边界',stem:'交小平正在进行“'+p.task+'”。'+policy.rule+' 收到图中交小安的消息后，哪项回复合适？',options:responses.map(({correct,...o})=>o),answer:responses.findIndex(o=>o.correct),visual:{kind:'generated',image:scene,crop:cropFor(3),labels:[p.task],overlay:{type:'dialogue',speaker:'交小安',text:policy.claim}},explanation:policy.response+' 判断依据是题干明确的课程任务约定。'});
  const statuses=familyId==='clinical'?['已核对可用且完成归位手续','需要登记借还的教具','编号或完整性待检查的教具','需要向指定人员归还的教具箱']:familyId==='biological'?['保存方案已确认且允许入柜','仅供指定台面观察的封闭教学模型','编码或接收信息待核验','封闭载体等待指定接收人']:familyId==='chemical'?['收存条件及方案已确认','需要现场登记交接','来源或标签待鉴别','已安排专门接收，等待交接']:familyId==='engineering'?['已确认可用且完成归位手续','需要办理借还','状态异常，已停止使用待检修','需要交还专管钥匙']:familyId==='humanities'?['限制资料，仅由专管人员收存','仅限指定阅览桌使用','已结束借阅，等待归还','损坏待修复，暂停借用']:familyId==='media'?['使用范围受限的原始素材','已获得课程展示许可的成稿','素材来源或许可待核验','需要归还的拍摄器材']:familyId==='digital'?['仅限访问名单内使用的明细','已确认授权共享的工作副本','来源或授权尚未核验的介质','仍需按要求保留的备份']:['仅限课程小组访问的原始材料','已确认可在课程内共享的摘要','来源或状态待核验的材料','需要等待批准再处置的材料'];
  const target=number(taskId+'class')%(familyId==='media'?3:4),destOrder=shuffled([0,1,2,3],taskId+'R7');
  add('R7',{route:'R7',type:'image_choice',topic:'分类归位',stem:'“'+p.task+'”中，“'+p.item+'”的本次状态为“'+statuses[target]+'”。应将材料放在哪一处？',options:destOrder.map(i=>({text:f.destinations[i],caption:f.destinations[i],image:places,crop:i})),answer:destOrder.indexOf(target),visual:{kind:'generated',image:places},explanation:'根据材料状态和用途边界，归位到“'+f.destinations[target]+'”，不能只凭容器或位置外观猜测。'});
  const order=shuffled([0,1,2,3],taskId+'R8');
  add('R8',{route:'R8',type:'order',interaction:'step-click',topic:'任务流程',stem:'完成“'+p.task+'”：请按正确的操作顺序，依次点击四张步骤图。',options:order.map(i=>({text:f.steps[i],image:workflow,crop:cropFor(i)})),answer:[0,1,2,3].map(i=>order.indexOf(i)),visual:{kind:'generated',image:workflow},explanation:'本次任务依赖顺序为：'+f.steps.join(' → ')+'。这是本课程任务的流程，不替代实际设备或实验操作规程。',sequenceEvidence:{approved:true,originalQuestionRef:'CUR6-'+taskId+'-R8',originalType:'课程原始排序任务',currentProcedureRef:sourceUrl,scope:major.name+'：'+p.task,precedenceVerified:true}},{stem:p.task+'的原始排序任务。四步为'+f.steps.join('、')+'，按任务说明中的依赖关系排序。',options:f.steps,answer:[0,1,2,3]});
  const count=13+number(taskId+'count')%32,unit=override?.unit||({biological:'份编码记录',engineering:'项点检记录',chemical:'张物料卡',clinical:'项教具记录',humanities:'页资料',media:'份素材记录',digital:'条数据记录',business:'条材料记录'}[familyId]);
  const tally=(received,checked,task=code)=>[{label:'任务编号',value:task},{label:'应核对量',value:count+unit},{label:'实际接收量',value:received+unit},{label:'完成核对量',value:checked+unit}];
  const r4b=records([tally(count,count),tally(count,count-1),tally(count+1,count+1),tally(count,count,'其他任务')],'R4B',p.item+' · 核验统计');
  add('R4B',{route:'R4',type:'image_choice',topic:'数量核对',stem:'“'+p.task+'”本次任务编号为'+code+'，应核对'+count+unit+'。哪张统计卡能确认本次材料已全部核对？',options:r4b.map(({correct,...o},i)=>({...o,text:'统计卡 '+String.fromCharCode(65+i)})),answer:r4b.findIndex(o=>o.correct),visual:{kind:'carrier',image:'assets/blank-book.png'},explanation:'同时核对任务归属、应核对量、接收量和完成量，不能只看最后一个数字。'});
  if(chosen.length!==10||new Set(chosen.map(q=>q.candidate.route)).size!==8)throw new Error('专业题型覆盖不足：'+major.name);
  profiles.push({major:major.name,scenario:f.title,task:p.task,item:p.item,family:familyId,relevance:relevanceNote,count:10,routes:chosen.map(q=>q.candidate.route),questions:chosen.map(q=>q.source.sourceQuestionId)});rows.push(...chosen);
 }
 return {rows,profiles,rules};
}
