import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {validSelection} from '../../src/learning.mjs';
import {sequenceReady} from '../../src/sequence-policy.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// An explicit allowlist keeps .env, logs, caches, attempts and historical runs out.
const entries=['server.mjs','src','web','config','scripts','test','docs','package.json','README.md','.gitignore','.env.example','configure-api.ps1','配置API.cmd','启动演示.cmd','本地试运行说明.md','产品题库流程.md','参赛交付与费用说明.md'];
const extensions=new Set(['.mjs','.js','.json','.md','.html','.css','.png','.jpg','.jpeg','.svg','.cmd','.ps1','.py','.txt']);
function knownSecrets(project){
 const values=[];
 for(const [key,value] of Object.entries(process.env))if(/API_KEY|TOKEN|SECRET/.test(key)&&value?.length>=16)values.push(value);
 if(existsSync(path.join(project,'.env')))for(const line of readFileSync(path.join(project,'.env'),'utf8').split(/\r?\n/)){
  const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&/API_KEY|TOKEN|SECRET/.test(match[1])){const value=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');if(value.length>=16)values.push(value);}
 }
 return [...new Set(values)];
}
function checkFile(file,secrets,label){
 const bytes=readFileSync(file);
 if(secrets.some(value=>bytes.includes(Buffer.from(value)))||/\bsk-[A-Za-z0-9._-]{20,}/.test(bytes.toString('utf8')))throw new Error('交付检查未通过：'+label+' 疑似包含密钥；未生成压缩包。请移除后重新打包。');
}
export function buildSubmission(project,destination){
 project=path.resolve(project);destination=path.resolve(destination);
 if(destination===project||!destination.startsWith(path.join(project,'artifacts')+path.sep))throw new Error('交付目录必须位于本项目 artifacts 下');
 if(existsSync(destination))throw new Error('交付目录已存在，请使用新的目录名');
 const secrets=knownSecrets(project);mkdirSync(destination,{recursive:true});
 function copy(relative){
  const source=path.join(project,relative),target=path.join(destination,relative);if(!existsSync(source))return;
  const stat=lstatSync(source);if(stat.isSymbolicLink())throw new Error('交付不包含符号链接：'+relative);
  if(stat.isDirectory()){for(const name of readdirSync(source))if(!name.startsWith('.')&&name!=='node_modules'&&name!=='__pycache__'&&!(relative==='web/assets'&&name==='uploads'))copy(path.join(relative,name));return;}
  if(!extensions.has(path.extname(source))&&!['.env.example','.gitignore'].includes(relative))return;
  checkFile(source,secrets,relative);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(source,target);
 }
 for(const entry of entries)copy(entry);
 const dataDir=path.join(destination,'data');mkdirSync(dataDir,{recursive:true});
 // Only export published question versions; never copy the live SQLite database.
 const sourceDb=path.join(project,'data/demo.sqlite');let published=0;
 if(existsSync(sourceDb)){
  const source=new DatabaseSync(sourceDb,{readOnly:true}),target=new DatabaseSync(path.join(dataDir,'demo.sqlite'));
  try{
   target.exec('CREATE TABLE questions(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE,body TEXT NOT NULL); CREATE TABLE revisions(question_id TEXT,version INTEGER,body TEXT,PRIMARY KEY(question_id,version));');
   for(const row of source.prepare('SELECT id,fingerprint,body FROM questions').all()){
    const q=JSON.parse(row.body),c=q.candidate;
    const localImage=image=>{if(typeof image!=='string')return false;const file=path.resolve(project,'web',image);return file.startsWith(path.join(project,'web')+path.sep)&&existsSync(file)&&!image.startsWith('assets/uploads/');};
    if(q.status!=='published'||!q.source?.majorName||!['visual-pipeline-v1','gpt-pregenerated-v1'].includes(c?.provider)||!c.visual||!localImage(c.visual.image)||!validSelection(c,c.answer)||!sequenceReady(c)||(c.type==='order'&&!c.options.every(o=>localImage(o.image))))continue;
    target.prepare('INSERT INTO questions VALUES(?,?,?)').run(q.id,row.fingerprint,row.body);
    target.prepare('INSERT INTO revisions VALUES(?,?,?)').run(q.id,q.version,row.body);published++;
   }
  }finally{source.close();target.close();}
  checkFile(path.join(dataDir,'demo.sqlite'),secrets,'data/demo.sqlite');
 }
 const bank=path.join(project,'data/question-bank.sqlite');
 if(existsSync(bank)){checkFile(bank,secrets,'data/question-bank.sqlite');copyFileSync(bank,path.join(dataDir,'question-bank.sqlite'));}
 const report={createdAt:new Date().toISOString(),publishedQuestions:published,containsApiKeys:false,containsStudentRecords:false,containsJobs:false,containsUnreviewedQuestions:false,note:'源码和现有正式图片可离线运行；生成新内容需要使用接收方自己的服务端API配置。正式题不足10道的专业仍不可开始整组练习。'};
 writeFileSync(path.join(destination,'交付检查.json'),JSON.stringify(report,null,2));
 return {directory:destination,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=buildSubmission(root,path.join(root,'artifacts','submission-'+new Date().toISOString().replace(/[:.]/g,'-')));
  const archive=result.directory+'.zip';
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:CAMPUS_RELEASE_SOURCE, $env:CAMPUS_RELEASE_ZIP)"],{env:{...process.env,CAMPUS_RELEASE_SOURCE:result.directory,CAMPUS_RELEASE_ZIP:archive},stdio:'pipe'});
  console.log(JSON.stringify({...result,archive},null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
