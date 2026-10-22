import {createApp} from '../../server.mjs';
import {knowledgeKey} from '../../src/diverse-sampling.mjs';
import {MajorBank} from '../../src/major-bank.mjs';
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=mkdtempSync(path.join(tmpdir(),'zhian-offline-ui-')),out=path.join(root,'artifacts/offline-product-screenshots');mkdirSync(out,{recursive:true});
const bank=new MajorBank(path.join(root,'data/question-bank.sqlite'));let calls=0;const app=createApp({dataDir:dir,majorBank:bank,generationEnabled:false,provider:{generate:async()=>{calls++;throw new Error('不应调用API');}}});
const db=new DatabaseSync(path.join(root,'data/demo.sqlite'),{readOnly:true});try{app.store.db.exec('BEGIN');for(const row of db.prepare('SELECT id,fingerprint,body FROM questions').all()){const q=JSON.parse(row.body);if(q.candidate?.provider==='gpt-pregenerated-v1'&&q.status==='published')app.store.db.prepare('INSERT INTO questions VALUES(?,?,?)').run(row.id,row.fingerprint,row.body);}app.store.db.exec('COMMIT');}finally{db.close();}
copyFileSync(path.join(root,'data/business-type-samples.json'),path.join(dir,'business-type-samples.json'));
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--disable-crashpad-for-testing']}),errors=[];
async function check(p){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'页面横向溢出');assert.ok(await p.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)),'图片未加载');}
async function login(p,role,major){await p.goto(base+'/'+role);if(major)await p.locator('#major').selectOption(major);await p.locator('#password').fill(role==='teacher'?'123456':'123456');await p.locator('#login-form [type=submit]').click();await p.locator('#app').waitFor();}
try{
 const sc=await browser.newContext({viewport:{width:1280,height:900}}),s=await sc.newPage();s.on('pageerror',e=>errors.push(e.message));await login(s,'student','工商管理');assert.equal(await s.locator('[data-action=start]:disabled').count(),0);await s.screenshot({path:path.join(out,'student-home.png'),fullPage:true});
 await s.locator('[data-action=start]').click();await s.locator('.quiz-card').waitFor();assert.equal(await s.locator('.question-dots button').count(),10);
 const runId=await s.evaluate(async()=>{const h=await fetch('/api/student/home').then(r=>r.json());return h.runs.find(r=>r.status==='active').id;});
 const serverRun=app.learning.get(runId,'student01');let wrongId;const covered=new Set();
 async function choose(candidate,answer){if(candidate.route==='R8'){for(const value of answer)await s.locator('[data-step="'+value+'"]').click();}else await s.locator('[data-choice="'+answer+'"]').click();}
 for(let i=0;i<10;i++){
  const q=serverRun.cards[i],c=q.candidate;await s.getByRole('heading',{name:c.stem,exact:true}).waitFor();await s.waitForFunction(()=>[...document.querySelectorAll('.quiz-card img')].every(i=>i.complete&&i.naturalWidth>0));await check(s);covered.add(c.route);
  if(['R1','R6'].includes(c.route))assert.equal(await s.locator('.choice img,.choice .option-crop').count(),0,'图文/对话题的选项须为文字');
  assert.equal(await s.locator('.quiz-card>.notice').count(),0,'作答时不显示答案提示表');
  if(c.route==='R6'){assert.equal(await s.locator('.scene .dialogue-overlay').count(),1);assert.equal(await s.locator('.dialogue-card').count(),0);assert.ok(await s.locator('.dialogue-scene').evaluate(el=>el.querySelector('.dialogue-overlay').getBoundingClientRect().bottom<=el.querySelector('.dialogue-picture').getBoundingClientRect().top),'对话不得遮挡图片与人物');}
  if(c.route==='R3'){assert.equal(await s.locator('.book-carrier').count(),4);assert.ok(await s.locator('.book-carrier').evaluateAll(books=>books.every(book=>{const r=book.getBoundingClientRect(),t=book.querySelector('span').getBoundingClientRect();return Math.abs((t.left+t.right)/2-(r.left+r.width*.545))<3&&Math.abs((t.top+t.bottom)/2-(r.top+r.height*.495))<3;})),'封面标题必须以正面封皮中心为基准');}
  if(c.route==='R4')assert.equal(await s.locator('.record-paper').count(),4);
  if(['R2','R5','R7','R8'].includes(c.route)){assert.equal(await s.locator('.choice .option-crop').count(),4);await s.evaluate(()=>Promise.all([...document.querySelectorAll('.option-crop')].map(el=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>reject(new Error('选项底图加载失败'));image.src=el.style.backgroundImage.slice(4,-1).replace(/^["']|["']$/g,'');}))));}
  await s.screenshot({path:path.join(out,'student-'+c.route+'-desktop.png'),fullPage:true});await s.setViewportSize({width:390,height:844});await check(s);await s.screenshot({path:path.join(out,'student-'+c.route+'-mobile.png'),fullPage:true});await s.setViewportSize({width:1280,height:900});
  if(c.route==='R8'){await s.locator('[data-step="0"]').click();await s.locator('[data-action=step-undo]').click();assert.equal(await s.locator('.step-card.selected').count(),0);}
  const answer=c.answer,value=i===0?(Array.isArray(answer)?[answer[1],answer[0],...answer.slice(2)]:(answer+1)%c.options.length):answer;if(i===0)wrongId=q.id;
  await choose(c,value);await s.locator('[data-action=save-next]').click();
 }
 assert.ok(covered.size>=3);assert.equal(new Set(serverRun.cards.map(knowledgeKey)).size,10);
 await s.locator('[data-action=submit-run]:not(:disabled)').waitFor();await s.locator('[data-action=submit-run]').click();await s.locator('.result-head').waitFor();assert.equal(await s.locator('.review-answer').count(),10);assert.ok((await s.locator('.result-head').innerText()).includes('9'));await s.screenshot({path:path.join(out,'student-results.png'),fullPage:true});
 await s.locator('[data-action=wrong]').click();await s.locator('.quiz-card').waitFor();assert.equal(await s.locator('.question-dots button').count(),1);const wrongRunId=await s.evaluate(async()=>{const h=await fetch('/api/student/home').then(r=>r.json());return h.runs.find(r=>r.status==='active').id;});const wrongCandidate=app.learning.get(wrongRunId,'student01').cards[0].candidate;await choose(wrongCandidate,wrongCandidate.answer);await s.locator('[data-action=save-next]').click();await s.locator('[data-action=submit-run]').click();await s.locator('.result-head').waitFor();
 await s.locator('[data-action=leave-run]').click();await s.locator('[data-page=history]').first().click();assert.equal(await s.locator('[data-resume]').count(),2);await s.reload();await s.locator('[data-page=history]').first().click();assert.equal(await s.locator('[data-resume]').count(),2);
 assert.equal(await s.evaluate(async()=>{const r=await fetch('/api/teacher/type-samples');return r.status;}),401);
 const tc=await browser.newContext({viewport:{width:1440,height:1000}}),t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));await login(t,'teacher');await t.locator('.library .card').first().waitFor();assert.equal(await t.locator('.library .card').count(),Math.min(60,app.learning.cards('工商管理').length));await t.locator('#major-filter').selectOption('化学');assert.equal(await t.locator('.library .card').count(),Math.min(60,app.learning.cards('化学').length));await t.locator('[data-page=review]').click();
 assert.equal(await t.locator('.review-row').count(),0,'正式题不应出现在待审核列表');await t.screenshot({path:path.join(out,'teacher-review-empty.png'),fullPage:true});await t.goto(base+'/business-review.html');const frame=t;await frame.locator('[data-route=R1]').waitFor();assert.equal(await frame.locator('[data-route]').count(),8);await frame.locator('[data-review=pass]').click();await frame.locator('#review-note').fill('本地试运行：检查意见保存');await frame.locator('[data-route=R8]').click();await frame.locator('[data-action=reset]').click();assert.equal(await frame.locator('.choice').count(),4);
 await t.screenshot({path:path.join(out,'teacher-review.png'),fullPage:true});await t.setViewportSize({width:390,height:844});await check(t);await t.screenshot({path:path.join(out,'teacher-review-mobile.png'),fullPage:true});assert.equal(calls,0);assert.deepEqual(errors,[]);
 console.log('PASS: 学生多考点抽样与多类题交互、排序撤销与判分、10题提交9/10、错题重练、记录持久化、教师复核、移动端、无模型调用');
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.close();bank.close();rmSync(dir,{recursive:true,force:true});}
