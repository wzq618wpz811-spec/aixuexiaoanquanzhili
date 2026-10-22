import {chromium} from 'playwright';
import {createApp} from '../../server.mjs';
import {existsSync,mkdtempSync,mkdirSync,copyFileSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=mkdtempSync(path.join(tmpdir(),'zhian-type-browser-')),out=path.join(root,'artifacts/business-type-screenshots');mkdirSync(out,{recursive:true});
copyFileSync(path.join(root,'data/business-type-samples.json'),path.join(dir,'business-type-samples.json'));
const manifest=JSON.parse(readFileSync(path.join(dir,'business-type-samples.json'),'utf8'));
assert.equal(manifest.samples.length,8);
const majorBank={majors:()=>[{name:'工商管理',scenario:'公共机房'}],major:n=>n==='工商管理'?{name:n}:null};
const app=createApp({dataDir:dir,majorBank});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/student');await page.locator('#major').selectOption('工商管理');
 assert.equal((await page.locator('#major').textContent()).includes('公共机房'),false);
 await page.locator('#password').fill('123456');await page.locator('#login-form [type=submit]').click();await page.locator('#app').waitFor();
 assert.equal(await page.locator('[data-action=start]').isDisabled(),true);
 assert.ok((await page.locator('#app').textContent()).includes('题库暂未开放'));
 assert.equal((await page.locator('#app').textContent()).includes('待核对'),false);
 assert.equal(await page.locator('[data-action=prepare]').count(),0);
 const denied=await page.evaluate(async()=> (await fetch('/api/student/type-samples')).status);assert.equal(denied,404);
 await page.goto(base+'/teacher');await page.locator('#password').fill('123456');await page.locator('#login-form [type=submit]').click();await page.locator('#app').waitFor();
 await page.goto(base+'/business-review.html');await page.locator('#routes button').first().waitFor();
 assert.equal(await page.locator('#routes button').count(),8);
 const publicData=await page.evaluate(async()=>await (await fetch('/api/teacher/type-samples')).json());
 assert.ok(publicData.samples.every(s=>!('answer' in s)&&!('plan' in s)&&s.options.every(o=>!('stepId' in o))));
 for(const sample of manifest.samples){
  await page.locator(`[data-route=${sample.id}]`).click();await page.locator('h2').waitFor();
  await page.evaluate(async()=>await Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),sample.id+' overflow');
  if(sample.id==='R1'||sample.id==='R6'){assert.equal(await page.locator('.choices img,.choices .crop').count(),0);assert.equal(await page.locator('.scene img').count(),1);}
  if(sample.id==='R3')assert.equal(await page.locator('.book-title').count(),4);
  if(sample.id==='R4'){assert.equal(await page.locator('.record').count(),4);assert.equal(await page.locator('.blank-field').count(),4);}
  if(sample.id==='R6')assert.ok((await page.locator('.dialogue').textContent()).includes('不明网站'));
  if(sample.id==='R8'){
   assert.equal(await page.locator('[data-action=check]').isDisabled(),true);
   for(const i of sample.candidate.answer)await page.locator(`[data-choice="${i}"]`).click();
   assert.equal(await page.locator('[data-action=check]').isDisabled(),false);
   await page.locator('[data-action=undo]').click();assert.equal(await page.locator('[data-action=check]').isDisabled(),true);
   await page.locator(`[data-choice="${sample.candidate.answer.at(-1)}"]`).click();
  }else await page.locator(`[data-choice="${sample.candidate.answer}"]`).click();
  await page.locator('[data-action=check]').click();await page.locator('.feedback').waitFor();
  assert.ok((await page.locator('.feedback strong').textContent()).includes('与参考答案一致'));
  await page.screenshot({path:path.join(out,sample.id+'-desktop.png'),fullPage:true});
 }
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  for(const id of ['R1','R2','R3','R4','R6','R8']){
   await page.locator(`[data-route=${id}]`).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' mobile overflow '+width);
   if(width===390)await page.screenshot({path:path.join(out,id+'-mobile.png'),fullPage:true});
  }
 }
 await page.locator('[data-review=fix]').click();await page.locator('#review-note').fill('自动化测试：这条仅保存在临时浏览器。');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhian-business-type-review-v1')).R8.status),'fix');
 assert.deepEqual(errors,[]);console.log('PASS: eight routes, hidden answers, R1/R6 text options, R4 records, R8 click sequence, desktop and mobile.');
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.db.close();rmSync(dir,{recursive:true,force:true});}
