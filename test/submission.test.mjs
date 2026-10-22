import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {buildSubmission} from '../scripts/build/submission.mjs';
import {privateJson} from '../src/private-data.mjs';
import {createApp} from '../server.mjs';

test('交付只保留正式内容，不带密钥、待审题、学生记录；泄漏时停止',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'campus-release-'));let db;
 try{
  mkdirSync(path.join(root,'data'),{recursive:true});mkdirSync(path.join(root,'web/assets'),{recursive:true});
  copyFileSync('web/assets/blank-book.png',path.join(root,'web/assets/blank-book.png'));
  writeFileSync(path.join(root,'server.mjs'),'// fixture entry point');
  writeFileSync(path.join(root,'.env'),'DASHSCOPE_API_KEY=local-test-key-not-for-sharing-123456789');writeFileSync(path.join(root,'.env.example'),'DASHSCOPE_API_KEY=\n');
  writeFileSync(path.join(root,'data/private.log'),'private');
  db=new DatabaseSync(path.join(root,'data/demo.sqlite'));db.exec('CREATE TABLE questions(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE,body TEXT);CREATE TABLE attempts(id TEXT,body TEXT);CREATE TABLE learning_runs(id TEXT,owner TEXT,body TEXT);');
  for(const status of ['published','review']){const q={id:status,version:1,status,source:{majorName:'工商管理'},candidate:{provider:'visual-pipeline-v1',type:'illustrated',visual:{image:'assets/blank-book.png'},options:[{text:'甲'},{text:'乙'}],answer:0}};db.prepare('INSERT INTO questions VALUES(?,?,?)').run(q.id,q.id,JSON.stringify(q));}
  db.exec("INSERT INTO attempts VALUES('private','student-private');INSERT INTO learning_runs VALUES('private','student01','private');");db.close();db=null;
  const release=buildSubmission(root,path.join(root,'artifacts/one'));assert.equal(release.publishedQuestions,1);
  assert.equal(existsSync(path.join(release.directory,'server.mjs')),true);
  assert.equal(existsSync(path.join(release.directory,'.env')),false);assert.equal(existsSync(path.join(release.directory,'data/private.log')),false);
  assert.equal(readFileSync(path.join(release.directory,'.env.example'),'utf8'),'DASHSCOPE_API_KEY=\n');
  const out=new DatabaseSync(path.join(release.directory,'data/demo.sqlite'),{readOnly:true});try{assert.equal(out.prepare('SELECT COUNT(*) AS n FROM questions').get().n,1);assert.equal(out.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('attempts','learning_runs','jobs')").get().n,0);}finally{out.close();}
  writeFileSync(path.join(root,'web/leak.js'),'const accidentallyCopied="local-test-key-not-for-sharing-123456789";');
  assert.throws(()=>buildSubmission(root,path.join(root,'artifacts/two')),/疑似包含密钥/);
 }finally{db?.close();rmSync(root,{recursive:true,force:true});}
});

test('浏览器无法读取服务端.env和源码，错误中的密钥会隐藏',async()=>{
 const secret='private-test-token-12345678901234567890';assert.ok(!privateJson({error:secret},[secret]).includes(secret));
 const dir=mkdtempSync(path.join(tmpdir(),'campus-private-')),app=createApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+app.server.address().port;for(const file of ['/.env','/data/demo.sqlite','/server.mjs','/%2e%2e%2f.env','/src/visual-pipeline.mjs'])assert.equal((await fetch(base+file)).status,404);}finally{await new Promise(r=>app.server.close(r));app.store.close();rmSync(dir,{recursive:true,force:true});}
});
