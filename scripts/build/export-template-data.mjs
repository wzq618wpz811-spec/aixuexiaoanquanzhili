import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('config/card-templates.json',root),'utf8'));
writeFileSync(new URL('web/template-data.js',root),'window.TEMPLATE_CATALOG = '+JSON.stringify(catalog,null,2)+';\n');
console.log('Exported config/card-templates.json to web/template-data.js');
