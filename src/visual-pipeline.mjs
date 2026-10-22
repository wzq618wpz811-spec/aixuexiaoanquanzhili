import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {CandidateCache} from './candidate-cache.mjs';

const ROUTES=new Set(['R1','R2','R3','R4','R5','R6','R7','R8']);
const visibleAction=/操作|关闭|拔|按|报告|联系|等待|观察|拆|取|放|穿|戴|检查|打开|移动|泼|回收|扔|埋|焚烧|离开|擦干|登记/;
const fileName=/法|条例|规范|规程|标准|办法|指南|项目表|GB\s*\d|TSG\s*\d|文件/;
const style='1536×1024横幅。柔和哑光3D公仔式校园教学插画，深蓝色毛绒校园角色与参考图保持一致，奶油色额头条纹与口鼻、棕色眉眼、红鼻、蓝色毛绒爪，日常场景穿素色鼠尾草绿圆领上衣；橙色狐狸穿奶油色上衣。无帽子、制服、领带、肩章或胸牌；象牙白、鼠尾草绿、浅木色、中性灰，均匀自然柔光。器材和考点动作清楚，手机卡片裁切后仍能看懂。衣服和防护装备由当前任务决定。不要生成任何汉字、数字、姓名、书名、勾叉、正误标志、红绿答案编码、夸张事故后果。准确文字由页面叠加。';
const short=s=>String(s||'').replace(/（[　 ]*）|\([　 ]*\)/g,'').slice(0,220);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

export function routeHeuristically(q){
 if(q.options.every(o=>fileName.test(o))&&q.options.filter(o=>fileName.test(o)).length>=3)return 'R3';
 if(/某同学说|有人说|聊天|消息|通知|网页|对话|声称/.test(q.stem))return 'R6';
 if(/读数|刻度|标签|记录|台账|压力表|签字|液位|日期/.test(q.stem))return 'R4';
 const allActions=q.options.every(o=>visibleAction.test(o));
 if(allActions&&/废弃物|废电池|分类|回收|存放|投放|收集/.test(q.stem))return 'R7';
 if(allActions&&/如果|当|出现|发现|准备|结束后|异常|情况下/.test(q.stem))return 'R5';
 if(allActions)return 'R2';
 return 'R1';
}
export function parseVerifiedSteps(q){
 if(!Number.isInteger(q.answer)||!q.options[q.answer])return null;
 if(!/顺序|先后|步骤|流程/.test(q.stem))return null;
 const parts=[...q.options[q.answer].matchAll(/(?:^|\s)(\d)[.、．)）]\s*([^\d]+?)(?=\s+\d[.、．)）]|$)/g)].map(m=>m[2].trim());
 if(parts.length<3||parts.length>4||new Set(parts).size!==parts.length)return null;
 return parts;
}
function qualityIssues(q){const issues=[];
 if(q.answer===null||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)issues.push('缺少有效的原题答案');
 if(new Set(q.options.map(x=>x.trim())).size!==q.options.length)issues.push('原题有完全重复的选项');
 if(!q.sourceUrl)issues.push('原始题库没有可核查的依据链接');
 return issues;
}

export class DeepSeekPlanner {
 constructor({apiKey=process.env.DEEPSEEK_API_KEY,model=process.env.DEEPSEEK_MODEL||'deepseek-flash',endpoint=process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com'}={}){this.apiKey=apiKey;this.model=model;this.endpoint=endpoint.replace(/\/$/,'')}
 available(){return !!this.apiKey}
 async plan(q,{feedback='',previous=null}={}){
  if(!this.available())return null;
  const instruction='你是教育图片题改编策划。只输出JSON对象。根据文字题的可观察证据，在R1情境图+原文字选项、R2各选项不同行动图、R3文件/书名载体、R4读数标签记录证据图、R5共同条件+行动四图、R6对话/屏幕图、R7分类去向四图中选择一个。原题完整顺序由程序单独处理。保留原题的考查关系、条件、选项和答案，不新增资格、阈值、后果或外部事实。如果任一选项无法忠实画成行动，不选R2/R5/R7。字段：route, adaptedStem, sceneDescription, optionScenes(与选项等长，只有多图通道需要), labels(可观察事实标签数组), issues(疑点数组)。sceneDescription只写可见对象、动作、位置和状态；不能含正误或答案判断。';
  const response=await fetch(this.endpoint+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+this.apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,messages:[{role:'system',content:instruction+' 教师反馈是修订要求。修订时结合上一版方案逐项处理反馈，但不能改变原题答案或添加无依据事实。输出 revisionSummary 简述实际修改。'},{role:'user',content:JSON.stringify({stem:q.stem,options:q.options,answer:q.answer,topic:q.topic,sourceType:q.sourceType,teacherFeedback:feedback,previousPlan:previous?.plan||null})}],reasoning_effort:"none",response_format:{type:"json_object"},temperature:0.2,max_tokens:1800}),signal:AbortSignal.timeout(90000)});
  const raw=await response.json();if(!response.ok)throw new Error('DeepSeek 改编失败：'+(raw.error?.message||response.status));
  const content=String(raw.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim();
  let plan;try{plan=JSON.parse(content)}catch{throw new Error('DeepSeek 未返回可解析的题型规划 JSON')}
  return plan;
 }
 async audit(imageBytes,plan){
  if(!this.available())return {pass:false,issues:['未配置 DeepSeek 读图审核']};
  const response=await fetch(this.endpoint+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+this.apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,messages:[{role:'system',content:'检查教学图片是否忠实表现指定动作、是否出现额外文字、错误器材或答案颜色暗示。expectedLayout=single时只应有一幅画面，不要求四格；只有four-panels才逐格核对场景。角色的毛色不是衣服颜色，不要混淆。只报告画面中确实可见的问题，不臆测屏幕后方。只输出 JSON：{"pass":boolean,"issues":string[]}。核心动作看不清则 pass=false。'},{role:'user',content:[{type:'text',text:JSON.stringify({route:plan.route,expectedLayout:plan.expectedLayout||(['R2','R5','R7','R8'].includes(plan.route)?'four-panels':'single'),scene:plan.sceneDescription,optionScenes:plan.optionScenes,steps:plan.renderSteps||plan.steps})},{type:'image_url',image_url:{url:'data:image/png;base64,'+imageBytes.toString('base64')}}]}],reasoning_effort:"none",response_format:{type:"json_object"},temperature:0,max_tokens:900}),signal:AbortSignal.timeout(90000)});
  const raw=await response.json();if(!response.ok)return {pass:false,issues:['DeepSeek 读图审核失败：'+(raw.error?.message||response.status)]};
  try{return JSON.parse(String(raw.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*|\s*```$/g,'').trim())}catch{return {pass:false,issues:['DeepSeek 读图审核结果无法解析']}}
 }
}

export function buildPlan(q,modelPlan=null){
 const steps=parseVerifiedSteps(q),route=steps?'R8':ROUTES.has(modelPlan?.route)&&modelPlan.route!=='R8'?modelPlan.route:routeHeuristically(q);
 const multi=['R2','R5','R7'].includes(route);
 const reliableScenes=Array.isArray(modelPlan?.optionScenes)&&modelPlan.optionScenes.length===q.options.length&&modelPlan.optionScenes.every(x=>typeof x==='string'&&x.trim());
 const finalRoute=multi&&!reliableScenes&&!q.options.every(o=>visibleAction.test(o))?'R1':route;
 const plan={route:finalRoute,adaptedStem:short(modelPlan?.adaptedStem||q.stem),sceneDescription:short(modelPlan?.sceneDescription||q.stem),optionScenes:reliableScenes?modelPlan.optionScenes:q.options.map(short),labels:Array.isArray(modelPlan?.labels)?modelPlan.labels.filter(x=>typeof x==='string').slice(0,4):[],steps:steps||[],renderSteps:steps?shuffle(steps.map((text,stepId)=>({text,stepId}))):[],issues:[...qualityIssues(q),...(Array.isArray(modelPlan?.issues)?modelPlan.issues.filter(x=>typeof x==='string'):[])]};
 if(finalRoute==='R8'&&!q.sourceUrl)plan.issues.push('顺序题需要可核验的现行步骤依据');
 if(finalRoute==='R4'&&!modelPlan)plan.issues.push('记录或读数的视觉证据需人工确认');
 for(const key of ['conditions','overlay','optionOverlays','captions','optionPresentation','stepContext','stepScenes'])if(modelPlan?.[key]!==undefined)plan[key]=modelPlan[key];
 return plan;
}
export function imagePrompt(q,plan,{singleScene=null}={}){
 if(plan.route==='R3')return null;
 if(singleScene)return `${style}共同环境：${plan.stepContext||plan.sceneDescription}。本图唯一动作：${singleScene}。只生成单幅画面；不要拼图、不要分镜、不要序号、不要标题、不要解释文字。人物关注正在操作的对象。`;
 const context=`原题场景：${plan.sceneDescription}。知识主题：${q.topic||'校园学习'}。${plan.teacherFeedback?'教师修订要求（仅调整画面，不改变考点和答案）：'+plan.teacherFeedback+'。':''}`;
 if(plan.route==='R8')return `${style}${context}绘制严格的2×2四格分镜，格线清楚，四格同一角色、同一器材、同一场所和机位。四格依次只画这些独立步骤（位置顺序不代表操作顺序）：${plan.renderSteps.map((s,i)=>`${i+1}格${s.text}`).join('；')}。每一步只出现一次，不能把完整流程复制到每一格。`;
 if(['R2','R5','R7'].includes(plan.route))return `${style}${context}绘制严格的2×2四格对照图。四格共同起始条件相同，同角色、同场所、同设备、同光线；每格只改变该选项可见动作或位置。按左上、右上、左下、右下依次画：${plan.optionScenes.map((s,i)=>`${i+1}格：${short(s)}`).join('；')}。各格之间白色窄分隔，不写选项字母或说明。`;
 return `${style}${context}只画一幅能帮助观察的情境画面。可见事实：${plan.sceneDescription}。不要把任何选项完整句子画进图片；保留空白供程序叠加中性事实标签。`;
}

export class QwenImageService {
 constructor({apiKey=process.env.DASHSCOPE_API_KEY,endpoint=process.env.DASHSCOPE_IMAGE_URL,model=process.env.DASHSCOPE_IMAGE_MODEL||'qwen-image-2.1-turbo',assetsDir,referencePath}={}){
  this.apiKey=apiKey;this.endpoint=endpoint;this.model=model;this.assetsDir=assetsDir;this.referencePath=referencePath;
 }
 available(){return !!(this.apiKey&&this.endpoint&&this.assetsDir)}
 async generate(prompt){
  if(!this.available())throw new Error('未配置生图服务：需要 DASHSCOPE_API_KEY 和 DASHSCOPE_IMAGE_URL');
  const ref=existsSync(this.referencePath)?readFileSync(this.referencePath):null;
  const fingerprint=createHash('sha256').update(this.model+'\n'+prompt+'\n'+(ref?createHash('sha256').update(ref).digest('hex'):'')).digest('hex').slice(0,24);
  const relative='assets/generated/'+fingerprint+'.png',file=path.join(this.assetsDir,fingerprint+'.png');
  if(existsSync(file))return {relative,bytes:readFileSync(file),cached:true};
  const body={model:this.model,prompt,size:'1536x1024',n:1,watermark:false,prompt_extend:false};
  if(ref)body.image='data:image/png;base64,'+ref.toString('base64');
  const response=await fetch(this.endpoint,{method:'POST',headers:{Authorization:'Bearer '+this.apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(600000)});
  const data=await response.json();if(!response.ok)throw new Error('生图服务失败：'+(data.error?.message||response.status));
  let bytes;if(data.data?.[0]?.b64_json)bytes=Buffer.from(data.data[0].b64_json,'base64');
  else if(data.data?.[0]?.url){const u=new URL(data.data[0].url);if(u.protocol!=='https:'||!/(^|\.)aliyuncs\.com$/.test(u.hostname))throw new Error('生图服务返回了不受信任的图片地址');const image=await fetch(u,{signal:AbortSignal.timeout(90000)});if(!image.ok)throw new Error('下载生成图片失败');bytes=Buffer.from(await image.arrayBuffer())}
  if(!bytes?.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('生图服务未返回有效 PNG 图片');
  mkdirSync(this.assetsDir,{recursive:true});writeFileSync(file,bytes);return {relative,bytes,cached:false};
 }
}

export class VisualProvider {
 constructor({planner=new DeepSeekPlanner(),imageService,referenceImage='assets/blank-book.png',cacheDir,assetsRoot}={}){this.planner=planner;this.imageService=imageService;this.referenceImage=referenceImage;this.cache=cacheDir&&assetsRoot?new CandidateCache(cacheDir,assetsRoot):null;this.inFlight=new Map();}
 async generate(q,{reviewedPlan=null,feedback='',previous=null}={}){
  let reference='';if(this.imageService?.referencePath&&existsSync(this.imageService.referencePath))reference=createHash('sha256').update(readFileSync(this.imageService.referencePath)).digest('hex');
  const key=this.cache?.key(q,{model:this.imageService?.model,planner:this.planner.model,version:'visual-v4-feedback:'+style,reference,reviewedPlan:{reviewedPlan,feedback,previousPlan:previous?.plan,previousGeneratedAt:previous?.generatedAt}});
  if(key){const hit=this.cache.get(key);if(hit)return {...hit,cacheHit:true};if(this.inFlight.has(key))return structuredClone(await this.inFlight.get(key));}
  const task=this.generateUncached(q,{reviewedPlan,feedback,previous});if(key)this.inFlight.set(key,task);
  try{const result=await task;if(key)this.cache.put(key,result);return result;}finally{if(key)this.inFlight.delete(key);}
 }
 async generateUncached(q,{reviewedPlan=null,feedback='',previous=null}={}){
  let modelPlan=reviewedPlan,planningError=null;
  if(feedback&&!this.planner.available())throw new Error('未配置规划模型，无法按审核意见进行AI修订');
  if(!modelPlan&&this.planner.available())try{modelPlan=await this.planner.plan(q,{feedback,previous})}catch(e){if(feedback)throw e;planningError=e.message}
  const plan=buildPlan(q,modelPlan);if(planningError)plan.issues.push(planningError);
  if(feedback){plan.teacherFeedback=feedback;plan.revisionSummary=String(modelPlan?.revisionSummary||'已按审核意见重新规划，请人工对照核查');}
  let generated=null,audit=null,stepImages=[];
  if(plan.route!=='R3'&&this.imageService?.available())try{
   if(plan.route==='R8'){
    plan.imagePrompts=[];
    for(const step of plan.renderSteps){const description=plan.stepScenes?.[step.stepId]||step.text;const prompt=imagePrompt(q,plan,{singleScene:description});plan.imagePrompts.push(prompt);const result=await this.imageService.generate(prompt);stepImages.push(result);if(this.planner.available()){const check=await this.planner.audit(result.bytes,{expectedLayout:'single',sceneDescription:description,route:'R1'});if(!check.pass)plan.issues.push(...(check.issues||[]).map(x=>step.text+'：'+x));}}
    generated=stepImages[0]||null;
   }else{generated=await this.imageService.generate(imagePrompt(q,plan));if(this.planner.available())audit=await this.planner.audit(generated.bytes,plan)}
  }catch(e){plan.issues.push(e.message)}
  if(plan.route!=='R3'&&!generated)plan.issues.push('尚未生成实际图片');
  if(audit&&!audit.pass)plan.issues.push(...(audit.issues||['画面自动审核未通过']));
  if(!this.planner.available())plan.issues.push('未配置 DeepSeek，当前使用保守规则路由，需人工复核');
  const route=plan.route,options=q.options.map((text,i)=>({text,...(['R2','R5','R7'].includes(route)?{image:generated?.relative||null,crop:i}:{}),...(route==='R3'?{carrier:this.referenceImage}:{}),...(plan.optionPresentation==='records'?{image:generated?.relative||null,record:plan.optionOverlays?.[i]}:{}),...(plan.captions?.[i]?{caption:plan.captions[i]}:{})}));
  let answer=q.answer,type=['R2','R3','R5','R7'].includes(route)||plan.optionPresentation==='records'?'image_choice':route==='R8'?'order':'illustrated';
  if(route==='R8'){
   options.splice(0,options.length,...plan.renderSteps.map((s,i)=>({text:s.text,stepId:s.stepId,image:stepImages[i]?.relative||null})));
   answer=plan.steps.map((_,i)=>options.findIndex(x=>x.stepId===i));
  }
  return {stem:route==='R8'?'请按正确顺序依次点击步骤图片。':plan.adaptedStem,options,answer,explanation:q.explanation||'请结合原题依据与画面核对。',sourceUrl:q.sourceUrl,type,route,interaction:route==='R8'?'step-click':null,conditions:plan.conditions||[],visual:generated?{kind:'generated',image:generated.relative,labels:plan.labels,overlay:plan.overlay}:route==='R3'?{kind:'carrier',image:this.referenceImage}:null,plan:{...plan,imagePrompt:imagePrompt(q,plan),provider:this.imageService?.model||null},issues:[...new Set(plan.issues)],checks:[{name:'原题结构',status:qualityIssues(q).length?'flag':'pass'},{name:'真实生图',status:generated||route==='R3'?'pass':'flag'},{name:'图像复核',status:audit?.pass?'pass':'flag'}],provider:'visual-pipeline-v1',generatedAt:new Date().toISOString(),sequenceEvidence:route==='R8'?{originalQuestionRef:q.sourceQuestionId||q.stem,originalType:q.sourceType||'顺序单选改编',currentProcedureRef:q.sourceUrl||'',scope:q.topic,precedenceVerified:!!q.sourceUrl,approved:false}:undefined};
 }
}
