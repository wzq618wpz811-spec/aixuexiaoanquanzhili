import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const allowedInteractions = ['single','multi','judge','fill','short'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function loadPilot(){return JSON.parse(readFileSync(path.join(root,'config/visual-pilot.json'),'utf8'));}
export function loadPilotSources(){
  const filename=path.join(root,'research/visual-pilot/source-snapshots.json');
  return existsSync(filename)?JSON.parse(readFileSync(filename,'utf8')):[];
}
function sourceKind(s){return s.type==='简答题'?'short':s.type==='填空题'?'fill':s.type.includes('判断')?'judge':['多选','多选题'].includes(s.type)?'multi':'single';}
function validClosedAnswer(kind, answer, count){
  const index=n=>Number.isInteger(n)&&n>=0&&n<count;
  return kind==='multi'?Array.isArray(answer)&&answer.length>0&&new Set(answer).size===answer.length&&answer.every(index):index(answer);
}
export function pilotBlueprintFingerprint(card){
  return hash(JSON.stringify([card.source_ref,card.source_type,card.source_archive_sha256,card.template,card.interaction,card.adapted,card.answer_mapping,card.conditions,card.required_condition_ids,card.evidence,card.visual,card.basis,card.assets,card.critical_regions]));
}

export function inspectPilotCard(card,{sources=loadPilotSources(),assetRoot=path.join(root,'web')}={}){
  const checks=[];
  const check=(name,pass,detail='')=>checks.push({name,status:pass?'pass':'flag',detail});
  const source=sources.find(s=>s.ref===card.source_ref);
  check('original_source',!!(source?.stem&&source.original_text&&source.answer_raw&&source.url&&source.archive_sha256===card.source_archive_sha256),'必须有完整原题、源答案、定位和原始文件哈希');
  check('source_identity',!!source&&source.type===card.source_type&&source.locator===card.source_locator&&source.number===card.source_number,'原题型、编号与定位不得被改编字段覆盖');
  if(card.interaction==='blocked'){
    for(const issue of card.semantic_review.risks)check(issue.code,false,issue.message);
    return {id:card.id,status:'needs_review',productionEligible:false,checks};
  }
  check('supported_interaction',allowedInteractions.includes(card.interaction),'排序需要另行核验完整原题与先后依据，不从清单创建');
  check('original_question_type',!!source&&card.interaction===sourceKind(source),'填空和简答不得静默改为选择，多选不得改为单选');
  const options=card.adapted?.options;
  if(['single','multi','judge'].includes(card.interaction)){
    check('answer_range',Array.isArray(options)&&options.length>=2&&validClosedAnswer(card.interaction,card.adapted?.answer,options.length));
    const map=card.answer_mapping?.source_to_adapted;
    check('option_mapping_complete',!!source&&Array.isArray(map)&&map.length===source.options.length&&new Set(map).size===map.length&&map.every(n=>Number.isInteger(n)&&n>=0&&n<options?.length),'源选项到改编选项逐项对应');
    const mapped=source&&map?(Array.isArray(source.answer)?source.answer.map(n=>map[n]):map[source.answer]):null;
    check('answer_mapping',same(mapped,card.adapted?.answer),'包含A/B选项重排与命题方向反转');
  }else if(['fill','short'].includes(card.interaction)){
    check('open_answer_preserved',!!source&&typeof card.adapted?.answer==='string'&&card.adapted.answer===source.answer,'开放作答保留源答案，不用关键词计分冒充语义判分');
  }
  check('semantic_review',card.semantic_review?.status==='passed'&&card.semantic_review?.preserved_conditions===true,'这项来自内容设计审查，规则不能自行证明语义正确');
  check('semantic_receipt',card.semantic_review?.blueprint_fingerprint===pilotBlueprintFingerprint(card),'改题、条件、标签或图像依赖变化后，旧内容审查不可沿用');
  const conditionVisible=c=>c.placement==='stem'?!!c.student_text&&card.adapted.stem.includes(c.student_text):c.placement==='options'?!!c.student_text&&card.adapted.options.some(o=>o.includes(c.student_text)):c.placement==='hint'&&!!c.text;
  check('scope_conditions',(card.required_condition_ids||[]).every(id=>card.conditions.some(c=>c.id===id&&c.text&&c.provenance&&conditionVisible(c))),'关键前提须融入题干或选项并有出处，制作说明不充当学生可见证据');
  check('basis_present',Array.isArray(card.basis)&&card.basis.length>0&&card.basis.every(b=>/^https:\/\//.test(b.url)&&b.locator&&b.verification));
  const evidence=card.evidence||[];
  check('evidence_contract',evidence.length>0&&new Set(evidence.map(e=>e.id)).size===evidence.length&&evidence.every(e=>e.fact&&e.carrier),'视觉证据是明确事实，不是装饰素材存在即可');
  const visual=card.visual;
  check('visual_template',!!visual&&['image','paired'].includes(visual.kind),'题面必须使用实际生图素材，不以简笔示意或纯文字对话代替');
  if(visual?.kind==='chat')check('message_evidence',Array.isArray(visual.messages)&&visual.messages.length>=2&&visual.messages.every(m=>m.sender&&m.text),'身份声明、渠道与请求内容同时展示');
  if(visual?.kind==='paired'){
    check('paired_assets_distinct',visual.images?.length===options?.length&&new Set(visual.images).size===visual.images.length,'不能复用同一张图只改底部结论');
    check('comparison_review',card.comparison_review?.status==='passed'&&card.comparison_review?.scope==='method_only','对照组需要检查共同条件、允许动作变化与无关差异');
    const region=visual.composite?.region_polygon;
    check('comparison_background_lock',visual.composite?.base_image===visual.images?.[0]&&Array.isArray(region)&&region.length>=3&&region.every(point=>Array.isArray(point)&&point.length===2&&point.every(n=>typeof n==='number'&&n>=0&&n<=1)),'共同背景由程序固定，动作区使用明确的归一化几何区域');
  }
  const images=visual?.kind==='image'?[visual.image]:visual?.kind==='paired'?visual.images:[];
  for(const filename of images||[]){
    const full=path.resolve(assetRoot,filename);
    const inside=full.startsWith(path.resolve(assetRoot)+path.sep);
    const exists=inside&&existsSync(full);
    const actual=exists?hash(readFileSync(full)):null;
    const asset=card.assets?.find(a=>a.path===filename);
    check('asset_hash:'+filename,exists&&asset?.sha256===actual,'实际文件须匹配验收版本，不能替换图片后继续沿用报告');
  }
  for(const e of evidence.filter(e=>e.required)){
    let pass=false;
    if(e.carrier.startsWith('H'))pass=card.conditions.some(c=>c.id===e.carrier&&c.text&&c.provenance&&conditionVisible(c));
    else if(e.carrier.startsWith('message:')){
      const index=Number(e.carrier.slice(8));pass=!!visual?.messages?.[index]?.text;
    }else if(e.carrier==='diagram')pass=visual?.kind==='diagram'&&visual.evidence_ids?.includes(e.id);
    else{
      const obs=card.observations?.find(o=>o.evidence_id===e.id);
      const bound=obs?.asset_hashes?.every(a=>card.assets.some(x=>x.path===a.path&&x.sha256===a.sha256));
      pass=obs?.status==='observed'&&!!obs.description&&!!obs.method&&obs.asset_hashes?.length>0&&bound;
    }
    check('evidence:'+e.id,pass,e.fact);
  }
  check('research_boundary',card.publication==='research_only'&&card.online_generation===false,'本批为真实预生成素材，应用任意输入在线AI尚未接入');
  const pass=checks.every(c=>c.status==='pass');
  return {id:card.id,status:pass?'preview_pass':'needs_review',productionEligible:false,checks};
}

export function pilotSummary(pilot=loadPilot(),options={}){
  const reports=pilot.cards.map(c=>inspectPilotCard(c,options));
  const byCohort={};
  for(const cohort of ['calibration','transfer','negative']){
    const subset=reports.filter(r=>pilot.cards.find(c=>c.id===r.id).cohort===cohort);
    byCohort[cohort]={total:subset.length,previewPass:subset.filter(r=>r.status==='preview_pass').length,needsReview:subset.filter(r=>r.status==='needs_review').length};
  }
  return {batch:pilot.batch,production_status:pilot.production_status,byCohort,reports,productionPublished:0,online_calls_in_app:0,automated_visual_inspection:false};
}

export function publicPilotCard(card){
  return {id:card.id,title:card.title,cohort:card.cohort,source_ref:card.source_ref,source_type:card.source_type,source_locator:card.source_locator,source_number:card.source_number,source_url:card.source_url,template:card.template,interaction:card.interaction,stem:card.adapted.stem,options:card.adapted.options,visual:card.visual,conditions:card.conditions.filter(c=>c.placement==='hint').map(c=>({id:c.id,text:c.text})),critical_regions:card.critical_regions,production_status:'research_only'};
}
export function pilotPreview(){
  const p=loadPilot(),summary=pilotSummary(p);
  const manifest=JSON.parse(readFileSync(path.join(root,'docs/research/visual-pilot-generation.json'),'utf8'));
  return {summary:{...summary,realImagegenCalls:manifest.items.length},cards:p.cards.filter(c=>c.interaction!=='blocked').map(publicPilotCard),blocked:p.cards.filter(c=>c.interaction==='blocked').map(c=>({id:c.id,title:c.title,source_ref:c.source_ref,source_type:c.source_type,issues:c.semantic_review.risks}))};
}
export function pilotSource(id){
  const card=loadPilot().cards.find(c=>c.id===id);if(!card)throw new Error('研究题不存在');
  const source=loadPilotSources().find(s=>s.ref===card.source_ref);if(!source)throw new Error('本地原题档案不存在，请先运行构建脚本');
  return {source,basis:card.basis,answer_mapping:card.answer_mapping,semantic_review:card.semantic_review,design_notes:card.conditions.filter(c=>c.placement==='teacher_note')};
}

function evaluate(card,response){
  if(['single','judge','multi'].includes(card.interaction)){
    const n=card.adapted.options.length;
    if(!validClosedAnswer(card.interaction,response,n))throw new Error('请选择有效选项，多选不得重复或越界');
    return {grading:'exact',correct:card.interaction==='multi'?same([...response].sort((a,b)=>a-b),[...card.adapted.answer].sort((a,b)=>a-b)):same(response,card.adapted.answer),answer:card.adapted.answer,explanation:card.adapted.explanation};
  }
  if(typeof response!=='string'||!response.trim()||response.length>3000)throw new Error('请填写1—3000字的回答');
  if(card.interaction==='fill'){
    const normalized=response.trim().replace(/[。！!、\s]/g,'');
    const aliases=card.source_ref==='JZCIT:85'?['化学药品','化学试剂']:[];
    return {grading:aliases.includes(normalized)?'accepted_alias':'unresolved',correct:aliases.includes(normalized)?true:null,answer:card.adapted.answer,explanation:card.adapted.explanation};
  }
  return {grading:'self_review',correct:null,answer:card.adapted.answer,explanation:card.adapted.explanation};
}
export function evaluatePilotResponses({responses,mode='each',ids}={}){
  if(!['each','batch'].includes(mode)||!Array.isArray(responses)||!responses.length)throw new Error('试答参数无效');
  const p=loadPilot(),cards=p.cards.filter(c=>c.interaction!=='blocked');
  const chosen=Array.isArray(ids)?ids:cards.map(c=>c.id);
  if(new Set(chosen).size!==chosen.length||chosen.some(id=>!cards.some(c=>c.id===id)))throw new Error('题组参数无效');
  if(new Set(responses.map(r=>r.id)).size!==responses.length||responses.some(r=>!chosen.includes(r.id)))throw new Error('回答存在重复或不属于题组');
  if(mode==='batch'&&chosen.some(id=>!responses.some(r=>r.id===id)))return {saved:false,ready:false,answered:responses.length,total:chosen.length};
  const results=responses.map(r=>{const c=cards.find(c=>c.id===r.id);return {id:c.id,...evaluate(c,r.response)};});
  return {ready:true,results,persisted:false,productionPublished:0};
}

export function compiledPilotRequest(id){
  const card=loadPilot().cards.find(c=>c.id===id);if(!card||card.interaction==='blocked')throw new Error('此题不可制作');
  const manifest=JSON.parse(readFileSync(path.join(root,'docs/research/visual-pilot-generation.json'),'utf8'));
  const paths=card.visual.kind==='image'?[card.visual.image]:card.visual.kind==='paired'?card.visual.images:[];
  return {id,mode:paths.length?'pre_generated_asset_reuse':'programmatic_render',online:false,requests:manifest.items.filter(x=>paths.includes(x.path.replace(/^(?:prototype|web)\//,''))).map(x=>({path:x.path,prompt:x.prompt,kind:x.kind,reference_files:x.reference_files,tool:x.tool}))};
}
