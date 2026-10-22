import {Store} from '../../src/store.mjs';
import {sequenceReady} from '../../src/sequence-policy.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))),s=new Store(path.join(root,'data'));
try{let held=0;for(const q of s.all()){if(q.candidate?.type==='order'&&q.status==='published'&&!sequenceReady(q.candidate)){q.status='review';q.candidate.issues=[...new Set([...(q.candidate.issues||[]),'来源题型与现行顺序依据未核验，研究阶段撤回'])];q.history.push({event:'题库研究后撤回未经核验的排序示例',at:new Date().toISOString(),version:q.version});s.save(q);held++;}}console.log(JSON.stringify({held,stats:s.stats()}));}finally{s.close();}
