import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Authentication, CRUD, ownership, filtering, CSRF, cascade, and restart persistence',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'issueflow-test-'));const file=join(dir,'test.sqlite');let app,sqlite,server,base;
 async function start(){({app,sqlite}=createApp(file));server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`}
 await start();let cookie='',csrf='';
 async function request(path,method='GET',body,override={}){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf,...override},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();if(data.csrf)csrf=data.csrf;return {status:r.status,data}}
 try{
 assert.equal((await request('/projects')).status,401);
 assert.equal((await request('/auth/register','POST',{name:'Test',email:'invalid',password:'password123'})).status,400);
 assert.equal((await request('/auth/register','POST',{name:'Test User',email:'test@example.com',password:'password123'})).status,200);
 const ownerCookie=cookie;
 assert.equal((await request('/auth/register','POST',{name:'Test',email:'test@example.com',password:'password123'})).status,409);
 assert.equal((await request('/projects','POST',{name:'No token'},{'X-CSRF-Token':''})).status,403);
 assert.equal((await request('/projects','POST',{name:''})).status,400);
 const p=(await request('/projects','POST',{name:'My project',description:'Persistent project'})).data;
 assert.ok(p.id);
 assert.equal((await request('/projects/'+p.id,'PUT',{name:'Updated project',description:'Edited'})).data.name,'Updated project');
 const i=(await request('/issues','POST',{project_id:p.id,title:'Fix login',description:'validation defect',priority:'HIGH',status:'TODO',due_date:'2026-11-10'})).data;
 assert.ok(i.id);
 assert.equal((await request('/issues/'+i.id,'PUT',{project_id:p.id,title:'Fix login validation',description:'A searchable description',priority:'MEDIUM',status:'TODO',due_date:''})).data.priority,'MEDIUM');
 assert.equal((await request('/issues/'+i.id+'/status','PATCH',{status:'IN_PROGRESS'})).data.status,'IN_PROGRESS');
 assert.equal((await request('/issues/'+i.id)).data.status,'IN_PROGRESS');
 assert.equal((await request('/issues/'+i.id+'/status','PATCH',{status:'DONE'})).data.status,'DONE');
 assert.equal((await request('/issues?search=login&priority=MEDIUM&status=DONE&project='+p.id)).data.length,1);
 assert.equal((await request('/issues?search=searchable')).data.length,1);
 assert.equal((await request('/issues?priority=HIGH')).data.length,0);
 assert.equal((await request('/issues')).data.length,1);
 assert.equal((await request('/dashboard/stats')).data.done,1);
 assert.equal((await request('/issues/'+i.id,'PUT',{project_id:p.id,title:'Invalid date',priority:'LOW',status:'TODO',due_date:'2026-02-30'})).status,400);
 const raw=sqlite.prepare('SELECT password_hash FROM users WHERE email=?').get('test@example.com');assert.ok(raw.password_hash.startsWith('$2'));
 await new Promise(r=>server.close(r));sqlite.close();await start();
 assert.equal((await request('/auth/me')).data.user.name,'Test User');
 assert.equal((await request('/issues/'+i.id)).data.status,'DONE');
 await request('/auth/logout','POST');assert.equal((await request('/issues')).status,401);
 assert.equal((await request('/auth/login','POST',{email:'test@example.com',password:'wrong'})).status,401);
 assert.equal((await request('/auth/login','POST',{email:'test@example.com',password:'password123'})).status,200);
 const savedCookie=cookie,savedCSRF=csrf;await request('/auth/logout','POST');
 await request('/auth/register','POST',{name:'Other',email:'other@example.com',password:'password456'});
 assert.equal((await request('/projects/'+p.id)).status,404);
 assert.equal((await request('/issues/'+i.id)).status,404);
 assert.equal((await request('/issues/'+i.id+'/status','PATCH',{status:'TODO'})).status,404);
 assert.equal((await request('/issues','POST',{project_id:p.id,title:'Forbidden',priority:'LOW',status:'TODO'})).status,404);
 assert.equal((await request('/issues')).data.length,0);
 await request('/auth/logout','POST');await request('/auth/login','POST',{email:'test@example.com',password:'password123'});
 assert.equal((await request('/issues/'+i.id,'DELETE')).status,200);
 assert.equal((await request('/issues/'+i.id)).status,404);
 await request('/issues','POST',{project_id:p.id,title:'Cascade me',priority:'LOW',status:'TODO'});
 await request('/projects/'+p.id,'DELETE');assert.equal((await request('/issues')).data.length,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM issues').get().n,0);
 console.log('PASS: invalid input, register/login/logout, duplicate email, CSRF, project/issue CRUD, status persistence, filters, stats, authorization, cascade, restart persistence.');
 }finally{await new Promise(r=>server.close(r));sqlite.close();rmSync(dir,{recursive:true,force:true})}
});
