import {readFileSync,writeFileSync,mkdirSync,readdirSync,cpSync,rmSync} from 'node:fs';
import {join,extname} from 'node:path';
import {build} from 'esbuild';
const assets={},types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2'};
function add(file,url){const binary=/\.woff2?$/.test(file);assets[url]={data:readFileSync(file,binary?'base64':'utf8'),type:types[extname(file)]||'application/octet-stream',binary}}
function walk(dir,url=''){for(const f of readdirSync(dir,{withFileTypes:true})){const file=join(dir,f.name),u=url+'/'+f.name;if(f.isDirectory())walk(file,u);else add(file,u)}}
walk('public');add('node_modules/bootstrap/dist/css/bootstrap.min.css','/vendor/bootstrap/css/bootstrap.min.css');add('node_modules/bootstrap-icons/font/bootstrap-icons.css','/vendor/icons/bootstrap-icons.css');walk('node_modules/bootstrap-icons/font/fonts','/vendor/icons/fonts');
mkdirSync('.generated',{recursive:true});writeFileSync('.generated/assets.js','export const assets='+JSON.stringify(assets)+';');
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});cpSync('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built IssueFlow Worker and embedded assets.');
