import http from 'node:http';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {Store,parseInput} from './src/store.mjs';
import {Learning,validSelection} from './src/learning.mjs';
import {DemoProvider} from './src/provider.mjs';
import {MajorBank,defaultBankPath} from './src/major-bank.mjs';
import {VisualProvider,DeepSeekPlanner,QwenImageService} from './src/visual-pipeline.mjs';
import {TypeSamples} from './src/type-samples.mjs';
import {taskProfiles} from './config/major-tasks.mjs';
import {majorRelevance} from './config/major-relevance.mjs';
import {privateJson} from './src/private-data.mjs';
import {sampleText,cases} from './src/catalog.mjs';
import {pilotPreview,pilotSource,evaluatePilotResponses,compiledPilotRequest} from './src/visual-pilot.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const digest=s=>createHash('sha256').update(String(s)).digest();
const same=(a,b)=>timingSafeEqual(digest(a),digest(b));
export function createApp({dataDir=path.join(root,'data'),provider=new DemoProvider(),majorBank=null,jobDelay=200,generationEnabled=true,teacherPin=process.env.TEACHER_PIN||'123456',studentPin=process.env.STUDENT_PIN||'123456'}={}){
 const store=new Store(dataDir),learning=new Learning(store),auth=new Map(),typeSamples=new TypeSamples(path.join(dataDir,'business-type-samples.json'));let busy=false;
 const teacherMajors=()=>{const list=[...(majorBank?.majors()||[])];for(const q of store.all())if(q.source.majorName&&!list.some(m=>m.name===q.source.majorName))list.push({name:q.source.majorName});return list;};
 // A course appears as soon as the teacher imports it; only published cards
 // are readable by students. An empty course cannot start an exercise.
 const studentMajors=()=>teacherMajors();
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(privateJson(value));};
 const usable=q=>!!(q?.candidate?.visual?.image&&existsSync(path.join(root,'web',q.candidate.visual.image))&&validSelection(q.candidate,q.candidate.answer)&&(q.candidate.type!=='order'||q.candidate.options.every(o=>o.image&&existsSync(path.join(root,'web',o.image)))));
 const batchView=j=>{const qs=(j.allIds||j.ids).map(id=>store.get(id));return {id:j.id,status:j.status,total:qs.length,ready:qs.filter(usable).length,reused:j.reused||0,generated:j.completed||0,needsReview:qs.filter(q=>q?.status==='review').length,quotaBlocked:!!j.quotaBlocked,error:j.error||'',failed:j.errors?.length||0};};
 async function body(req){let str='';for await(const c of req){str+=c;if(Buffer.byteLength(str)>6000000)throw new Error('文件过大');}try{return str?JSON.parse(str):{};}catch{throw new Error('请求格式无效');}}
 async function runJob(job){busy=true;job.status='running';store.saveJob(job);
  try{
   for(const id of job.ids){
    const q=store.get(id);if(!q)continue;const revision=job.kind==='revision',priorStatus=q.status;
    q.status='generating';q.error='';store.save(q);
    try{
     await new Promise(r=>setTimeout(r,jobDelay));
     const source=revision?{...q.source,stem:q.candidate.stem,options:q.candidate.options.map(o=>o.text),answer:q.candidate.answer,explanation:q.candidate.explanation,sourceUrl:q.candidate.sourceUrl||q.source.sourceUrl}:q.source;
     const candidate=await provider.generate(source,revision?{feedback:job.feedback,previous:q.candidate}:{});
     if(revision&&!usable({candidate}))throw new Error(candidate.issues?.join('；')||'修订图像生成失败，上一版已保留');
     const saved=store.applyCandidate(id,candidate);
     if(revision){saved.status='review';saved.history.push({at:new Date().toISOString(),event:'AI按审核意见修订，等待再次审核',note:job.feedback,baseVersion:job.baseVersion,version:saved.version});store.save(saved);store.snapshot(saved);}
     if(!usable(saved)){
      const message=candidate.issues?.join('；')||'图片尚未生成';job.errors.push({id,message});job.error=message;
      if(/quota|FreeTier|余额|额度|insufficient|payment/i.test(message)){job.quotaBlocked=true;break;}
     }else{job.completed++;if(candidate.cacheHit)job.reused=(job.reused||0)+1;}
    }catch(e){
     const current=store.get(id);current.status=revision?priorStatus:(current.candidate?'review':'imported');current.error=e.message;
     current.history.push({at:new Date().toISOString(),event:revision?'AI修订失败，保留上一版':'生成失败',note:e.message,version:current.version});store.save(current);
     job.errors.push({id,message:e.message});job.error=e.message;
     if(/quota|FreeTier|余额|额度|insufficient|payment/i.test(e.message)){job.quotaBlocked=true;break;}
    }
    store.saveJob(job);
   }
   job.status=job.errors.length?'partial':'completed';
  }catch(e){job.status='failed';job.error=e.message;}finally{busy=false;store.saveJob(job);}
 }
 const cookieName=role=>'zhian_'+role;
 const sessions=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(x=>x.length===2));
 const server=http.createServer(async(req,res)=>{
  try{const u=new URL(req.url,'http://localhost'),p=u.pathname;
   if(p.startsWith('/api/')){
    if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return json(res,403,{error:'不允许跨站请求'});
    if(!['GET','HEAD'].includes(req.method)&&!String(req.headers['content-type']||'').includes('application/json'))return json(res,415,{error:'仅接受 JSON 请求'});
    const match=p.match(/^\/api\/(teacher|student)(\/.*)$/);if(!match)return json(res,404,{error:'接口不存在'});
    const role=match[1],route=match[2],tokens=sessions(req),token=tokens[cookieName(role)];
    if(role==='student'&&route==='/majors'&&req.method==='GET')return json(res,200,{majors:studentMajors()});
    if(route==='/login'&&req.method==='POST'){
     const b=await body(req);const username=role==='teacher'?'teacher':String(b.username||'');
     if((role==='student'&&!/^student0[1-5]$/.test(username))||!same(b.password,role==='teacher'?teacherPin:studentPin))return json(res,401,{error:'账号或密码不正确'});
     const major=role==='student'?studentMajors().find(m=>m.name===String(b.major||'')):null;
     if(role==='student'&&(majorBank||studentMajors().length)&&!major)return json(res,400,{error:'请先选择题库中已有的专业'});
     if(token)auth.delete(token);const next=randomBytes(32).toString('hex');auth.set(next,{role,username,major:major?.name||'',expires:Date.now()+8*3600000});
     res.setHeader('Set-Cookie',cookieName(role)+'='+next+'; HttpOnly; SameSite=Strict; Path=/api/'+role+'; Max-Age=28800');
     return json(res,200,{role,username,major:major?.name||''});
    }
    const user=auth.get(token);if(!user||user.role!==role||user.expires<Date.now())return json(res,401,{error:'请先登录'});
    if(route==='/logout'&&req.method==='POST'){auth.delete(token);res.setHeader('Set-Cookie',cookieName(role)+'=; HttpOnly; SameSite=Strict; Path=/api/'+role+'; Max-Age=0');return json(res,200,{ok:true});}
    if(route==='/me')return json(res,200,{role,username:user.username,major:user.major||''});
    if(role==='teacher'){
     if(!generationEnabled&&req.method==='POST'&&['/prepare-major','/generate'].includes(route))return json(res,409,{error:'当前使用本地题库，在线生成已暂停；需要扩展新题时，可在服务端启用在线接口'});
     if(route==='/prepare-major'&&req.method==='POST'){
      const request=await body(req),targetMajor=String(request.major||'').trim();
      if(!majorBank?.major(targetMajor))throw new Error('请选择现有题库中的专业；新专业请先上传题库');
      if(busy)return json(res,409,{error:'已有生成任务，请稍后刷新'});
      const existing=store.all().filter(q=>q.source.majorName===targetMajor);let allIds=[];
      if(request.retryBatchId){const old=store.jobs().find(j=>j.id===request.retryBatchId&&j.owner===user.username&&j.major===targetMajor);if(!old)throw new Error('这组题不存在');allIds=old.allIds||old.ids;}
      else{
       const excluded=existing.filter(q=>['archived','rejected'].includes(q.status)||q.candidate?.issues?.includes('已撤回，等待重新检查')).map(q=>q.source.sourceQuestionId);
       const rows=majorBank.pick(targetMajor,10,excluded);if(!rows.length)throw new Error('这个专业尚无匹配题目');
       for(const source of rows){let found=existing.find(q=>q.source.sourceQuestionId===source.sourceQuestionId&&q.source.stem===source.stem&&JSON.stringify(q.source.options)===JSON.stringify(source.options)&&q.source.answer===source.answer&&!['archived','rejected'].includes(q.status));if(!found){const result=store.import(JSON.stringify([source]));found=store.get(result.ids[0])||store.all().find(q=>q.source.sourceQuestionId===source.sourceQuestionId&&q.source.majorName===targetMajor);}if(found&&!allIds.includes(found.id))allIds.push(found.id);}
      }
      const ids=allIds.filter(id=>!usable(store.get(id))),reused=allIds.length-ids.length;
      const job=store.saveJob({id:randomUUID(),kind:'student-batch',status:ids.length?'queued':'completed',ids,allIds,total:ids.length,reused,completed:0,errors:[],createdAt:new Date().toISOString(),provider:provider.constructor.name,major:targetMajor,owner:user.username});if(ids.length)void runJob(job);return json(res,202,batchView(job));
     }
     if(route.startsWith('/type-samples')){
      if(route==='/type-samples'&&req.method==='GET')return json(res,200,{major:'工商管理',samples:typeSamples.publicRows()});
      const sampleAnswer=route.match(/^\/type-samples\/(R[1-8])\/answer$/);
      if(sampleAnswer&&req.method==='POST')return json(res,200,typeSamples.answer(sampleAnswer[1],(await body(req)).selection));
     }
     if(route==='/visual-pilot'&&req.method==='GET')return json(res,200,pilotPreview());
     if(route==='/visual-pilot/evaluate'&&req.method==='POST')return json(res,200,evaluatePilotResponses(await body(req)));
     const pilotSourceRoute=route.match(/^\/visual-pilot\/([^/]+)\/source$/),pilotPromptRoute=route.match(/^\/visual-pilot\/([^/]+)\/prompt$/);
     if(pilotSourceRoute&&req.method==='GET')return json(res,200,pilotSource(pilotSourceRoute[1]));
     if(pilotPromptRoute&&req.method==='GET')return json(res,200,compiledPilotRequest(pilotPromptRoute[1]));
     if(route==='/state'&&req.method==='GET')return json(res,200,{questions:store.all().filter(q=>q.status!=='archived'),jobs:store.jobs(),stats:store.stats(),settings:learning.settings(),characters:learning.characters(),majors:teacherMajors(),generationEnabled,cases});
     if(route==='/sample'&&req.method==='GET')return json(res,200,{text:sampleText});
     if(route==='/import'&&req.method==='POST'){
      const b=await body(req);if(Buffer.byteLength(String(b.text||''))>512000)throw new Error('题库超过 500 KB');
      const normalize=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/g,' '),known=new Map(teacherMajors().map(m=>[normalize(m.name),m.name]));
      const rows=parseInput(b.text).map(q=>{const name=normalize(b.major||q.majorName);return {...q,majorName:known.get(name)||name};});
      return json(res,201,store.import(JSON.stringify(rows)));
     }
     if(route==='/generate'&&req.method==='POST'){
      if(busy)return json(res,409,{error:'已有生成任务'});
      const b=await body(req);const ids=store.all().filter(q=>(['imported','rejected'].includes(q.status)||(q.status==='review'&&!q.candidate?.visual))&&(!Array.isArray(b.ids)||b.ids.includes(q.id))).map(q=>q.id);
      if(!ids.length)throw new Error('没有待生成题目');
      const job=store.saveJob({id:randomUUID(),status:'queued',ids,total:ids.length,completed:0,errors:[],createdAt:new Date().toISOString(),provider:provider.constructor.name});void runJob(job);return json(res,202,job);
     }
     const draft=route.match(/^\/questions\/([^/]+)\/draft$/),revise=route.match(/^\/questions\/([^/]+)\/revise$/);
     if(draft&&req.method==='POST')return json(res,200,store.saveDraft(draft[1],await body(req)));
     if(revise&&req.method==='POST'){
      if(!generationEnabled)return json(res,409,{error:'在线生成未启用'});
      if(busy)return json(res,409,{error:'已有生成任务，请稍后重试'});
      const b=await body(req),q=store.get(revise[1]),feedback=String(b.feedback||'').trim();
      if(!q?.candidate||!['review','rejected'].includes(q.status))throw new Error('请先撤回已发布题目，再进行修订');
      if(b.version!==q.version)throw new Error('题目版本已变化，请刷新后重试');
      if(!feedback||feedback.length>3000)throw new Error('请填写1—3000字的具体审核意见');
      const job=store.saveJob({id:randomUUID(),kind:'revision',status:'queued',ids:[q.id],total:1,completed:0,errors:[],createdAt:new Date().toISOString(),feedback,baseVersion:q.version});
      void runJob(job);return json(res,202,job);
     }
     const review=route.match(/^\/questions\/([^/]+)\/review$/),withdraw=route.match(/^\/questions\/([^/]+)\/withdraw$/);
     if(review&&req.method==='POST')return json(res,200,store.review(review[1],await body(req)));
     if(withdraw&&req.method==='POST')return json(res,200,store.withdraw(withdraw[1]));
     if(route==='/settings'&&req.method==='POST')return json(res,200,learning.updateSettings(await body(req)));
     if(route==='/characters'&&req.method==='GET')return json(res,200,{characters:learning.characters()});
     if(route==='/characters'&&req.method==='POST'){
      const b=await body(req);if(!String(b.name||'').trim())throw new Error('请填写形象名称');
      const data=String(b.image||'').match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);if(!data)throw new Error('请上传 PNG 或 JPEG');
      const raw=Buffer.from(data[2],'base64');if(raw.length>4000000)throw new Error('图片超过 4 MB');
      if(data[1]==='png'?!raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):raw[0]!==255||raw[1]!==216)throw new Error('图片格式不正确');
      const id=randomUUID();const name=id+'.'+(data[1]==='png'?'png':'jpg');const dir=path.join(root,'web/assets/uploads');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,name),raw);
      return json(res,201,learning.addCharacter({id,name:String(b.name).slice(0,60),reference:'assets/uploads/'+name,version:1,views:[],status:'reference-only'}));
     }
     if(route==='/characters/views'&&req.method==='POST')return json(res,200,await provider.characterViews((await body(req)).characterId));
     if(route==='/characters/replace'&&req.method==='POST')return json(res,200,await provider.replaceActor(await body(req)));
    }else{
     if(route==='/home'&&req.method==='GET'){const cards=learning.cards(user.major).filter(q=>!user.major||usable(q)),profile=taskProfiles.get(user.major),relevance=majorRelevance.get(user.major);return json(res,200,{available:cards.length,coverage:new Set(cards.map(q=>q.candidate.route).filter(Boolean)).size,curriculum:profile&&relevance?{...profile,family:relevance.family}:null,settings:{...learning.settings(),...(user.major?{batchSize:10}:{})},character:learning.characters().find(c=>c.id===learning.settings().characterId),runs:learning.summary(user.username,user.major),username:user.username,major:user.major||''});}
     if(route==='/prepare'&&req.method==='POST')return json(res,403,{error:'学生端不生成或审核新题，请从已开放的正式题库开始练习'});
     if(route==='/runs'&&req.method==='POST'){const b=await body(req);
      const cards=learning.cards(user.major).filter(q=>!user.major||usable(q));
      if(user.major&&!b.wrongOnly&&cards.length<10)return json(res,409,{error:'本专业正式题库暂未准备好，满10道可用题后即可开始练习'});
      return json(res,201,learning.start(user.username,{wrongOnly:!!b.wrongOnly,ids:cards.map(q=>q.id),major:user.major||''}));}
     const run=route.match(/^\/runs\/([^/]+)$/),selection=route.match(/^\/runs\/([^/]+)\/selection$/),submit=route.match(/^\/runs\/([^/]+)\/submit$/);
     if((run||selection||submit)&&user.major){const existing=learning.get((run||selection||submit)[1],user.username);if(existing.cards.some(q=>q.source.majorName!==user.major))return json(res,403,{error:'此记录不属于当前选择的专业，请切换专业后查看'});}
     if(run&&req.method==='GET')return json(res,200,learning.view(learning.get(run[1],user.username)));
     if(selection&&req.method==='POST')return json(res,200,learning.select(selection[1],user.username,await body(req)));
     if(submit&&req.method==='POST')return json(res,200,learning.submit(submit[1],user.username));
    }
    return json(res,404,{error:'接口不存在'});
   }
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed'});
   const publicRoot=path.join(root,'web');const resource=['/','/teacher','/student'].includes(p)?'/index.html':decodeURIComponent(p);
   const file=path.resolve(publicRoot,'.'+resource);if(!file.startsWith(publicRoot+path.sep)||!existsSync(file))return json(res,404,{error:'文件不存在'});
   const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)];
   if(!mime)return json(res,404,{error:'文件不可访问'});
   res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
  }catch(e){json(res,400,{error:e.message});}
 });
 return {server,store,learning};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4186),assetsDir=path.join(root,'web','assets','generated');
 const provider=new VisualProvider({planner:new DeepSeekPlanner(),imageService:new QwenImageService({assetsDir,referencePath:path.join(root,'web','assets','offline','wet-hands.png')}),cacheDir:path.join(root,'data','visual-cache'),assetsRoot:path.join(root,'web')});
 createApp({provider,generationEnabled:process.env.ENABLE_LIVE_GENERATION==='1',majorBank:new MajorBank(defaultBankPath(root))}).server.listen(port,'127.0.0.1',()=>console.log('知安 http://127.0.0.1:'+port));
}

