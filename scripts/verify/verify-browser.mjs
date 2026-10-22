import {createApp} from '../../server.mjs';
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))),dir=mkdtempSync(path.join(tmpdir(),'zhian-v2-browser-')),out=path.join(root,'artifacts/screenshots-v2');
mkdirSync(out,{recursive:true});const app=createApp({dataDir:dir,jobDelay:5});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});const errors=[];
const snap=async(p,name)=>{await p.evaluate(()=>{const toast=document.querySelector('#toast');if(toast)toast.style.display='none';});await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
const check=async p=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
async function login(p,role){await p.goto(base+'/'+role);await p.locator('#password').fill(role==='teacher'?'123456':'123456');await p.locator('#login-form [type=submit]').click();await p.locator('#app').waitFor();}
try{
 const tc=await browser.newContext({viewport:{width:1440,height:1000}}),t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));
 await login(t,'teacher');await t.locator('nav [data-page=import]').click();await t.locator('[data-action=sample]').click();await t.waitForFunction(()=>document.querySelector('#bank').value.includes('干燥箱'));
 await t.locator('[data-action=import-generate]').click();await t.waitForFunction(()=>document.querySelector('.topbar>span')?.textContent==='审核发布');await t.locator('nav [data-page=cards]').click();await t.waitForFunction(()=>document.querySelectorAll('.library .card').length===7);
 await t.waitForFunction(()=>[...document.querySelectorAll('.library .badge')].filter(x=>x.textContent==='已发布').length===5);
 // Only the temporary test DB receives this neutral ordering fixture. No safety procedure is asserted.
 const sequence=app.store.all().find(q=>q.candidate.type==='order');
 app.store.applyCandidate(sequence.id,{...sequence.candidate,stem:'按甲、乙、丙排列中性步骤（自动化测试）',options:[{text:'中性步骤丙'},{text:'中性步骤甲'},{text:'中性步骤乙'}],answer:[1,2,0],explanation:'仅检验交互与判分',caseInfo:null,issues:[],sequenceEvidence:{approved:true,originalQuestionRef:'test:neutral',originalType:'test_fixture',currentProcedureRef:'test:alphabet',scope:'中性步骤测试，不是安全操作',precedenceVerified:true}});
 await t.locator('nav [data-page=cards]').click();await check(t);await snap(t,'teacher-cards');
 await t.locator('nav [data-page=settings]').click();await t.locator('[name=batchSize]').selectOption('6');await t.locator('#settings-form [type=submit]').click();await t.locator('#settings-form').waitFor();await snap(t,'teacher-settings');
 await t.locator('nav [data-page=characters]').click();await t.locator('[data-character=fox]').click();await t.locator('[data-action=replace]').click();await snap(t,'teacher-layer');
 await t.locator('[data-mode=edit]').click();await t.locator('[data-action=replace]').click();await snap(t,'teacher-edit');await check(t);
 await t.locator('[data-apply-character=fox]').click();await t.waitForFunction(()=>[...document.querySelectorAll('.character-tile.active h3')].some(x=>x.textContent.includes('交小安')));
 const sc=await browser.newContext({viewport:{width:1280,height:1000}}),s=await sc.newPage();s.on('pageerror',e=>errors.push(e.message));
 await login(s,'student');assert.equal(await s.locator('nav [data-page=cards]').count(),0);await snap(s,'student-home');
 const protectedStatus=await s.evaluate(async()=>{const r=await fetch('/api/teacher/state');return r.status;});assert.equal(protectedStatus,401);
 await s.locator('[data-action=start]').click();await s.locator('.question-area').waitFor();await snap(s,'student-choice');
 await s.locator('[data-choice="1"]').click();await s.locator('[data-action=save-next]').click();await s.getByRole('heading',{name:/最后离开前/}).waitFor();assert.equal(await s.locator('.feedback').count(),0);
 await s.locator('[data-choice="0"]').click();await s.locator('[data-choice="1"]').click();await s.locator('[data-action=save-next]').click();await s.locator('[data-hotspot="0"]').waitFor();await snap(s,'student-hotspot');
 await s.locator('[data-hotspot="0"]').click();await s.locator('[data-hotspot="1"]').click();await s.locator('[data-action=save-next]').click();await s.locator('.order-item').first().waitFor();await snap(s,'student-order');
 const firstHandle=await s.locator('[data-drag-handle]').first().boundingBox(),lastItem=await s.locator('[data-sort-value]').last().boundingBox();
 await s.mouse.move(firstHandle.x+20,firstHandle.y+20);await s.mouse.down();await s.mouse.move(firstHandle.x+20,lastItem.y+lastItem.height+8,{steps:10});await s.mouse.up();
 assert.deepEqual(await s.locator('[data-sort-value]').evaluateAll(es=>es.map(e=>Number(e.dataset.sortValue))),[1,2,0]);
 await s.locator('[data-drag-handle]').first().focus();await s.keyboard.press('ArrowDown');await s.keyboard.press('ArrowUp');
 assert.deepEqual(await s.locator('[data-sort-value]').evaluateAll(es=>es.map(e=>Number(e.dataset.sortValue))),[1,2,0]);
 await s.locator('[data-action=save-next]').click();await s.locator('[data-branch="0"]').waitFor();
 await s.locator('[data-branch="0"]').click();await s.locator('[data-action=branch-next]').click();await snap(s,'student-branch');await s.locator('[data-branch="1"]').click();await s.locator('[data-action=save-next]').click();
 await s.getByRole('heading',{name:/样品已经装好/}).waitFor();await s.locator('[data-choice="1"]').click();await s.locator('[data-action=save-next]').click();await s.waitForFunction(()=>!document.querySelector('[data-action=submit-run]').disabled);
 assert.equal(await s.locator('.feedback').count(),0);await s.locator('[data-action=submit-run]').click();await s.locator('.result-head').waitFor();assert.equal(await s.locator('.review-answer').count(),6);assert.equal(app.store.stats().correct,6);await snap(s,'student-results');
 await s.reload();await s.locator('nav [data-page=history]').click();await s.locator('[data-resume]').first().click();await s.locator('.result-head').waitFor();
 await t.locator('nav [data-page=settings]').click();await t.locator('[name=feedback][value=each]').check();await t.locator('#settings-form [type=submit]').click();await t.waitForFunction(()=>document.querySelector('[name=feedback][value=each]').checked);
 await s.locator('[data-page=home]').click();await s.locator('[data-action=start]').click();await s.locator('[data-choice="0"]').click();await s.locator('[data-action=save-next]').click();await s.locator('.feedback').waitFor();assert.equal(await s.locator('[data-choice]:disabled').count(),2);await snap(s,'student-each-feedback');
 for(const width of [390,320,768]){
  await t.setViewportSize({width,height:844});
  for(const page of ['cards','import','review','characters','settings','insights']){await t.locator('nav [data-page='+page+']').click();await check(t);if(width===390&&['cards','characters'].includes(page))await snap(t,'mobile-teacher-'+page);}
  await s.setViewportSize({width,height:844});await check(s);if(width===390)await snap(s,'mobile-student-quiz');
 }
 const gc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),g=await gc.newPage();g.on('pageerror',e=>errors.push(e.message));await g.goto(base+'/templates.html');await g.locator('[data-filter="条件启用"]').click();await g.locator('[data-drag-handle]').first().scrollIntoViewIfNeeded();await check(g);
 const gh=await g.locator('[data-drag-handle]').first().boundingBox(),gl=await g.locator('[data-sort-value]').last().boundingBox(),cdp=await gc.newCDPSession(g);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gh.x+20,y:gh.y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:gh.x+20,y:gl.y+gl.height-2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.deepEqual(await g.locator('[data-sort-value]').evaluateAll(es=>es.map(e=>Number(e.dataset.sortValue))),[0,1,2]);await snap(g,'template-mobile-drag');
 await g.setViewportSize({width:1440,height:1000});await g.locator('[data-filter=all]').click();await g.screenshot({path:path.join(out,'template-gallery.png'),fullPage:false});
 assert.deepEqual(errors,[]);console.log('PASS: role isolation; source-gated sequence; mouse/keyboard/touch drag; batch/each feedback; template gallery; mobile widths.');
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}

