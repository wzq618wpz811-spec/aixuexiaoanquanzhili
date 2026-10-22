import {createApp} from '../../server.mjs';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const dir=mkdtempSync(path.join(tmpdir(),'zhian-small-course-'));
const app=createApp({dataDir:dir,generationEnabled:true});
const major='新专业演示';
const {ids}=app.store.import(JSON.stringify([0,1].map(i=>({stem:'新专业演示题 '+i,options:['做法甲','做法乙'],answer:0,explanation:'演示解析',majorName:major}))));
for(const id of ids){const q=app.store.get(id);app.store.applyCandidate(id,{provider:'visual-pipeline-v1',stem:q.source.stem,options:q.source.options.map(text=>({text})),answer:0,explanation:'演示解析',type:'illustrated',route:'R1',issues:[],visual:{kind:'generated',image:'assets/lab-scene.png'}});}
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
try{
 const tc=await browser.newContext(),t=await tc.newPage(),sc=await browser.newContext(),s=await sc.newPage();
 await t.goto(base+'/teacher');await t.locator('#password').fill('123456');await t.locator('#login-form [type=submit]').click();await t.locator('#app').waitFor();
 await s.goto(base+'/student');await s.locator('#major').selectOption(major);await s.locator('#password').fill('123456');await s.locator('#login-form [type=submit]').click();await s.locator('#app').waitFor();assert.equal(await s.locator('[data-action=start]').isEnabled(),false);
 for(let i=0;i<ids.length;i++){
  await t.bringToFront();
  await t.locator('nav [data-page=review]').click();await t.locator('[data-detail="'+ids[i]+'"]').click();
  assert.equal(await t.locator('#review-form [name=note]').getAttribute('required'),null);
  assert.equal(await t.locator('#review-form [name=note]').inputValue(),'');
  await t.locator('#review-form [type=submit]').click();await t.locator('#detail-dialog').waitFor({state:'hidden'});
  assert.equal(app.store.get(ids[i]).status,'published');
  await s.bringToFront();await s.evaluate(()=>window.dispatchEvent(new Event('focus')));await s.waitForFunction(n=>document.querySelector('[data-action=start]')?.textContent.includes('开始'+n+'题'),i+1,{timeout:5000});
  assert.equal(await s.locator('[data-action=start]').isEnabled(),true);
  assert.ok((await s.locator('[data-action=start]').innerText()).includes('开始'+(i+1)+'题'));
  await s.locator('[data-action=start]').click();await s.locator('.quiz-card').waitFor();
  assert.equal(await s.locator('.question-dots button').count(),i+1);
  await s.locator('[data-action=leave-run]').click();await s.locator('[data-action=start]').waitFor();
 }
 console.log('PASS: 教师不填处理意见直接发布；同一新专业发布1题立即练1题，发布2题立即练2题（共用配图亦可）。');
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
