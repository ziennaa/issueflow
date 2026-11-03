import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openDB} from '../server/db.js';
test('Hosted auth uses Sites identity without cookies, with persistent isolated workspaces',async()=>{
 const source=readFileSync('dist/server/index.js','utf8');const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const {sqlite,adapter}=openDB(':memory:');const env={DB:adapter};let identity='viewer-one',csrf='';
 async function call(path,method='GET',body,headers={}){const response=await worker.fetch(new Request('https://example.test'+path,{method,headers:{...(identity?{'oai-authenticated-user-id':identity,'oai-authenticated-user-email':identity+'@example.test'}:{}),'X-CSRF-Token':csrf,'Content-Type':'application/json',Origin:'https://example.test',...headers},...(body?{body:JSON.stringify(body)}:{})}),env);const data=await response.json();if(data.csrf)csrf=data.csrf;return {status:response.status,data}}
 try{
 assert.equal((await worker.fetch(new Request('https://example.test/'),env)).status,200);
 assert.equal((await worker.fetch(new Request('https://example.test/vendor/bootstrap/css/bootstrap.min.css'),env)).status,200);
 identity='';assert.equal((await call('/api/auth/me')).status,401);
 identity='viewer-one';assert.equal((await call('/api/auth/me')).data.user.hosted,true);
 assert.equal((await call('/api/projects')).data.length,3);
 const issues=(await call('/api/issues')).data;assert.equal(issues.length,12);const i=issues[0];
 assert.equal((await call('/api/issues/'+i.id+'/status','PATCH',{status:'DONE'})).status,200);
 assert.equal((await call('/api/issues/'+i.id)).data.status,'DONE');
 assert.equal((await call('/api/auth/me')).data.user.id,'sites:viewer-one');
 assert.equal((await call('/api/projects')).data.length,3); // Repeated calls never reseed.
 assert.equal((await call('/api/auth/logout','POST',{})).data.redirect,'/signout-with-chatgpt?return_to=%2F');
 identity='viewer-two';await call('/api/auth/me');assert.equal((await call('/api/issues/'+i.id)).status,404);
 assert.equal((await call('/api/projects','POST',{name:'Bad token'},{'X-CSRF-Token':'invalid'})).status,403);
 assert.equal((await call('/api/auth/login','POST',{email:'other@example.test',password:'password123'})).status,400);
 identity='viewer-one';assert.equal((await call('/api/issues/'+i.id)).data.status,'DONE');
 }finally{sqlite.close()}
});
