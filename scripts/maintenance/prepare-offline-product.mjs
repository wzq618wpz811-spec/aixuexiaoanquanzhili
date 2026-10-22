import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {backup} from 'node:sqlite';
import {Store} from '../../src/store.mjs';
import {Learning} from '../../src/learning.mjs';
import {MajorBank,defaultBankPath} from '../../src/major-bank.mjs';
import {offlineRows} from '../../src/offline-bank.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),bank=new MajorBank(defaultBankPath(root));
let store;
try{
 const {rows,profiles,rules=[]}=offlineRows(bank,{assetsRoot:path.join(root,'web'),exists:existsSync});
 const targetDir=path.join(root,'data/offline-backups');mkdirSync(targetDir,{recursive:true});store=new Store(path.join(root,'data'));
 await backup(store.db,path.join(targetDir,new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite'));
 const learning=new Learning(store),kept=new Set(),sourceKey=s=>s.majorName+'|'+s.sourceQuestionId;
 let existing=new Map(store.all().map(q=>[sourceKey(q.source),q]));
 const missing=rows.filter(r=>!existing.has(sourceKey(r.source)));
 for(let start=0;start<missing.length;start+=100)store.import(JSON.stringify(missing.slice(start,start+100).map(r=>r.source)));
 existing=new Map(store.all().map(q=>[sourceKey(q.source),q]));store.db.exec('BEGIN');
 try{
  for(const {source,candidate} of rows){
   const q=existing.get(sourceKey(source));if(!q)throw new Error('原题导入失败：'+sourceKey(source));
   if(q.candidate?.provider==='gpt-pregenerated-v1'&&JSON.stringify(q.candidate)===JSON.stringify(candidate)&&q.status==='published'){kept.add(q.id);continue;}
   q.candidate=candidate;q.status='published';q.version++;q.history.push({at:new Date().toISOString(),event:'本地实验题包：原题保留，使用经画面核对的GPT预生成素材',version:q.version});store.save(q);store.snapshot(q);kept.add(q.id);
  }
  const majors=new Set(profiles.map(p=>p.major));for(const q of store.all())if(majors.has(q.source.majorName)&&q.status==='published'&&!kept.has(q.id)){q.status='archived';q.history.push({at:new Date().toISOString(),event:'本地实验题包替换，历史版本保留'});store.save(q);}
  store.db.exec('COMMIT');
 }catch(e){store.db.exec('ROLLBACK');throw e;}
 learning.updateSettings({feedback:'batch',batchSize:10});
 writeFileSync(path.join(root,'web/task-rules.json'),JSON.stringify({tasks:rules},null,2));
 writeFileSync(path.join(root,'data/offline-bank-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),mode:'pregenerated',liveApiCalled:false,totalQuestions:rows.length,majors:profiles},null,2));
 console.log(JSON.stringify({majors:profiles.length,published:rows.length,perRound:10,minPool:Math.min(...profiles.map(p=>p.count)),maxPool:Math.max(...profiles.map(p=>p.count)),apiCalls:0}));
}finally{store?.close();bank.close();}
