import {existsSync,mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createApp} from '../../server.mjs';
import {loadPilot} from '../../src/visual-pilot.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
// Report missing assets before launching a browser or opening a database.
const configuredPilot=loadPilot();
const missingAssets=[...new Set(configuredPilot.cards.filter(c=>c.interaction!=='blocked').flatMap(c=>c.visual.kind==='image'?[c.visual.image]:c.visual.images||[]))].filter(filename=>!existsSync(new URL('../../web/'+filename,import.meta.url)));
assert.deepEqual(missingAssets,[],'Missing visual-pilot assets; restore the actual reviewed files.');

const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))),out=path.join(root,'artifacts/visual-pilot');mkdirSync(out,{recursive:true});
const before=existsSync(path.join(root,'data/demo.sqlite'))?readFileSync(path.join(root,'data/demo.sqlite')):null;
const dir=mkdtempSync(path.join(tmpdir(),'zhian-visual-pilot-browser-'));assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));
const app=createApp({dataDir:dir,jobDelay:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const errors=[],findings=[],screenshots=[];let compositionPixels;
const pilot=loadPilot(),cards=pilot.cards.filter(c=>c.interaction!=='blocked');
async function shot(page,name){const target=path.join(out,name+'.png');await page.screenshot({path:target,fullPage:true});screenshots.push('artifacts/visual-pilot/'+name+'.png');}
async function check(page,card,width){
  await page.waitForFunction(()=>[...document.querySelectorAll('.question img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.question svg image')].map(el=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=el.href.baseVal;})));});
  const shape=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.querySelectorAll('.question img')].map(img=>({src:img.getAttribute('src'),naturalWidth:img.naturalWidth,width:img.clientWidth,height:img.clientHeight})),svgClips:[...document.querySelectorAll('.question svg text')].filter(el=>{const b=el.getBBox();return b.x<0||b.y<0||b.x+b.width>600.5||b.y+b.height>340.5;}).map(el=>el.textContent)}));
  assert.equal(shape.overflow,false,card.id+' '+width+' overflow');
  assert.equal(await page.locator('.question .condition,.question .pilot-diagram,.question .message-window').count(),0,'ordinary cards use actual generated scenes without a condition panel');
  assert.ok(!(await page.locator('.question').textContent()).includes('给定条件'),'production wording must not enter the question');
  assert.deepEqual(shape.svgClips,[],card.id+' '+width+' clipped SVG labels');
  for(const image of shape.images)assert.equal(image.naturalWidth,1536,card.id+' failed image load');
  for(const region of card.critical_regions||[]){const image=shape.images[0];if(image){assert.ok(image.width*region.box[2]>=30,card.id+' critical region width');assert.ok(image.height*region.box[3]>=30,card.id+' critical region height');}}
  if(card.visual.kind==='paired')assert.equal(await page.locator('.composite-image').count(),2,'edited options use fixed base');
  findings.push({id:card.id,width,overflow:false,imagesLoaded:shape.images.length,svgClips:shape.svgClips});
}
async function navigate(page,c){await page.locator('#cohort').selectOption(c.cohort);await page.locator('#type-filter').selectOption('all');const group=cards.filter(x=>x.cohort===c.cohort);await page.locator('[data-index="'+group.findIndex(x=>x.id===c.id)+'"]').click();await page.locator('[data-card-id="'+c.id+'"]').waitFor();}
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/visual-pilot.html');await page.locator('#password').fill('123456');await page.locator('#pilot-login button').click();await page.locator('[data-card-id="vp01"]').waitFor();
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const c of cards){await navigate(page,c);await check(page,c,width);if(width===1440&&['vp01','vp04','vp10','vp12','vp13','vp18'].includes(c.id))await shot(page,'desktop-'+c.id);if(width===390&&['vp01','vp04','vp10','vp12','vp13','vp14','vp15','vp17'].includes(c.id))await shot(page,'mobile-'+c.id);if([390,320].includes(width)&&['vp10','vp12','vp13','vp14','vp15','vp17'].includes(c.id)){const name='question-'+width+'-'+c.id;await page.locator('.question').screenshot({path:path.join(out,name+'.png')});screenshots.push('artifacts/visual-pilot/'+name+'.png');}}
  }
  await page.goto(base+'/visual-pilot.html?question=vp10');await page.locator('[data-card-id="vp10"]').waitFor();
  assert.equal(await page.locator('.question .image-crop').count(),1,'direct link opens the revised, focused label scene');
  await page.setViewportSize({width:1280,height:1000});await navigate(page,cards[0]);
  await navigate(page,cards.find(c=>c.id==='vp04'));
  compositionPixels=await page.evaluate(async()=>{
    async function dataUrl(url){const blob=await(await fetch(url)).blob();return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});}
    async function image(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
    const baseUrl=document.querySelector('.image-options img').src;
    const baseImage=await image(await dataUrl(baseUrl)),canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;
    const ctx=canvas.getContext('2d');ctx.drawImage(baseImage,0,0);const baseline=ctx.getImageData(0,0,1536,1024).data;
    const metrics=[];
    for(const element of document.querySelectorAll('.image-options .composite-image')){
      const svg=element.cloneNode(true);svg.setAttribute('width','1536');svg.setAttribute('height','1024');
      for(const img of svg.querySelectorAll('image'))img.setAttribute('href',await dataUrl(img.getAttribute('href')));
      const xml=new XMLSerializer().serializeToString(svg),objectUrl=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));
      const composed=await image(objectUrl);ctx.clearRect(0,0,1536,1024);ctx.drawImage(composed,0,0);URL.revokeObjectURL(objectUrl);
      const pixels=ctx.getImageData(0,0,1536,1024).data,polygon=svg.querySelector('polygon').getAttribute('points').split(' ').map(point=>point.split(',').map(Number));
      const region=new Path2D();polygon.forEach(([x,y],i)=>i?region.lineTo(x,y):region.moveTo(x,y));region.closePath();
      let compared=0,changed=0,maxDelta=0;
      for(let y=0;y<1024;y+=2)for(let x=0;x<1536;x+=2){
        if(ctx.isPointInPath(region,x,y))continue;
        // Ignore the antialiased clip boundary itself, check protected surroundings.
        if(ctx.isPointInPath(region,x-2,y)||ctx.isPointInPath(region,x+2,y)||ctx.isPointInPath(region,x,y-2)||ctx.isPointInPath(region,x,y+2))continue;
        const p=(y*1536+x)*4,d=Math.max(Math.abs(pixels[p]-baseline[p]),Math.abs(pixels[p+1]-baseline[p+1]),Math.abs(pixels[p+2]-baseline[p+2]));compared++;if(d>0)changed++;maxDelta=Math.max(maxDelta,d);
      }
      metrics.push({id:svg.querySelector('clipPath').id,protectedSamples:compared,changedSamples:changed,maxChannelDelta:maxDelta});
    }
    return {method:'Browser renders the actual SVG composition with embedded actual assets at original resolution; protected pixels sampled on a 2px grid excluding 2px clip antialias boundary',metrics};
  });
  for(const metric of compositionPixels.metrics){assert.ok(metric.protectedSamples>10000);assert.equal(metric.changedSamples,0,'protected background must stay identical');}
  await page.locator('[data-zoom-option="2"]').click();assert.equal(await page.locator('#zoom-dialog .composite-image').count(),1,'zoom must show the same composited option');await page.keyboard.press('Escape');
  await page.locator('[data-zoom-option="2"]').click();await page.locator('#zoom-dialog').screenshot({path:path.join(out,'composite-zoom.png')});screenshots.push('artifacts/visual-pilot/composite-zoom.png');await page.keyboard.press('Escape');
  await navigate(page,cards.find(c=>c.id==='vp08'));
  await page.locator('[name=choice][value="0"]').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('[name=choice][value="0"]').evaluate(el=>el===document.activeElement),true,'selection should preserve keyboard focus');
  await page.keyboard.press('Tab');await page.keyboard.press('Space');
  assert.equal(await page.locator('[name=choice]:checked').count(),2,'keyboard multi-select');
  await navigate(page,cards[0]);
  await page.locator('[data-zoom]').first().click();assert.equal(await page.locator('#zoom-dialog').evaluate(el=>el.open),true);await page.keyboard.press('Escape');
  await page.locator('[name=choice][value="1"]').check();await page.locator('#confirm').click();await page.locator('.feedback').waitFor();assert.equal(await page.locator('[name=choice]:disabled').count(),2);await shot(page,'each-feedback');
  await page.locator('#feedback-mode').selectOption('batch');
  let lastPublicPayload;
  page.on('response',async response=>{if(response.url().endsWith('/api/teacher/visual-pilot'))lastPublicPayload=await response.json();});
  for(const c of cards.filter(c=>c.cohort==='calibration')){
    await navigate(page,c);
    if(c.interaction==='fill')await page.locator('[name=response]').fill('化学试剂');
    else if(c.interaction==='multi')for(const n of c.adapted.answer)await page.locator('[name=choice][value="'+n+'"]').check();
    else await page.locator('[name=choice][value="'+c.adapted.answer+'"]').check();
    assert.equal(await page.locator('.feedback').count(),0);
    await page.locator('#confirm').click();
  }
  await page.locator('#submit-batch').click();await page.locator('.feedback').waitFor();assert.ok(await page.locator('.feedback').textContent());
  await page.locator('[data-index="0"]').click();assert.equal(await page.locator('.feedback').count(),1);
  await navigate(page,cards.find(c=>c.id==='vp18'));await page.locator('[name=response]').fill('按类别收集，有害废物单独交接给专业机构，普通废物放指定容器。');await page.locator('#submit-batch').count();
  await page.locator('#feedback-mode').selectOption('each');await page.locator('[name=response]').fill('按类别收集，有害废物单独交接给专业机构，普通废物放指定容器。');await page.locator('#confirm').click();await page.locator('.feedback').waitFor();assert.ok((await page.locator('.feedback').textContent()).includes('简答对照'));await shot(page,'short-self-review');
  await page.locator('[data-source="vp18"]').click();await page.locator('#source-vp18 pre').waitFor();assert.ok((await page.locator('#source-vp18').textContent()).includes('答案：'));
  await navigate(page,cards.find(c=>c.id==='vp17'));await page.locator('[data-source="vp17"]').click();await page.locator('#source-vp17 pre').waitFor();assert.ok((await page.locator('#source-vp17').textContent()).includes('A、错误'));
  await page.locator('#cohort').selectOption('negative');assert.equal(await page.locator('.blocked-item').count(),6);await shot(page,'blocked-originals');
  assert.equal(app.store.all().length,0);assert.equal(app.store.stats().attempts,0);assert.deepEqual(errors,[]);
  if(before)assert.ok(before.equals(readFileSync(path.join(root,'data/demo.sqlite'))),'demo database changed');
  writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({checkedCards:cards.length,widths:[1440,768,390,320],layoutChecks:findings.length,findings,compositionPixels,errors,screenshots,demoDatabaseUnchanged:true,temporaryDatabaseUsed:true},null,2)+'\n');
  console.log('PASS: '+findings.length+' actual card/viewport checks; each/batch, multi-select, open answers, zoom, source comparison, teacher isolation; demo database unchanged.');
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
