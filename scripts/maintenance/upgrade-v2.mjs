import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from '../../src/store.mjs';
import {Learning} from '../../src/learning.mjs';
import {DemoProvider} from '../../src/provider.mjs';
import {sampleText} from '../../src/catalog.mjs';
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const store=new Store(path.join(root,'data'));new Learning(store);const provider=new DemoProvider();
try{let archived=0;for(const q of store.all()){if(q.candidate?.provider==='demo-fixture'&&q.status!=='archived'){q.status='archived';q.history.push({at:new Date().toISOString(),version:q.version,event:'v0.2 升级，旧版演示卡片归档'});store.save(q);archived++;}}
 const r=store.import(sampleText);for(const id of r.ids)store.applyCandidate(id,await provider.generate(store.get(id).source));console.log(JSON.stringify({archived,added:r.added,stats:store.stats()}));
}finally{store.close();}
