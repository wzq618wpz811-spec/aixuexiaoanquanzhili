import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from '../../src/store.mjs';
import {sampleText} from '../../src/catalog.mjs';
import {DemoProvider} from '../../src/provider.mjs';
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const store=new Store(path.join(root,'data'));const provider=new DemoProvider();
try {
  const result=store.import(sampleText);
  for(const id of result.ids){const q=store.get(id);store.applyCandidate(id,await provider.generate(q.source));}
  console.log(JSON.stringify({added:result.added,duplicates:result.duplicates,stats:store.stats()}));
}finally{store.close();}
