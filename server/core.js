const statuses=['TODO','IN_PROGRESS','DONE'], priorities=['LOW','MEDIUM','HIGH'];
const id=()=>crypto.randomUUID();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail(required?'Please fill in all required fields.':'Text is too long.');return value.trim()};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
export async function handleAPI(req,env){
 const db=env.DB, url=new URL(req.url),path=url.pathname,method=req.method;
 const first=async(sql,...args)=>db.prepare(sql).bind(...args).first();
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const run=async(sql,...args)=>db.prepare(sql).bind(...args).run();
 try{
 const session=await env.session(req);let user=session?.user;
 const body=method==='GET'||method==='DELETE'?{}:await req.json().catch(()=>fail('Invalid JSON.'));
 if(method!=='GET'){
  if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)fail('Request origin is not allowed.',403);
  if(session&&req.headers.get('x-csrf-token')!==session.csrf)fail('Session expired. Refresh and try again.',403);
 }
 const authenticate=async(u)=>{const {headers,csrf}=await env.login(req,u);return json({user:{id:u.id,name:u.name,email:u.email,is_demo:u.is_demo},csrf},200,headers)};
 if(path==='/api/auth/register'&&method==='POST'){
  const name=text(body.name,80,true),email=text(body.email,254,true).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>72)fail('Use a password between 8 and 72 characters.');
  if(await first('SELECT id FROM users WHERE email=?',email))fail('An account with this email already exists.',409);
  const u={id:id(),name,email,is_demo:0};await run('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)',u.id,name,email,await env.hash(body.password));return authenticate(u);
 }
 if(path==='/api/auth/login'&&method==='POST'){
  const u=await first('SELECT * FROM users WHERE email=?',String(body.email||'').trim().toLowerCase());
  if(!u||!await env.verify(String(body.password||'').slice(0,72),u.password_hash))fail('Email or password is incorrect.',401);return authenticate(u);
 }
 if(path==='/api/auth/demo'&&method==='POST'){
  if(user)return json({user,csrf:session.csrf});
  const u={id:id(),name:'Alex Morgan',email:id()+'@demo.issueflow.invalid',is_demo:1};
  await run('INSERT INTO users (id,name,email,password_hash,is_demo) VALUES (?,?,?,?,1)',u.id,u.name,u.email,await env.hash(id()));await seed(db,u.id);return authenticate(u);
 }
 if(!user)fail('Please sign in to continue.',401);
 if(path==='/api/auth/me')return json({user,csrf:session.csrf});
 if(path==='/api/auth/logout'&&method==='POST'){return json({ok:true},200,await env.logout(req));}
 const project=async(pid)=>{const p=await first('SELECT * FROM projects WHERE id=? AND owner_id=?',pid,user.id);if(!p)fail('Project not found.',404);return p};
 const issue=async(iid)=>{const i=await first('SELECT i.*,p.name AS project_name,p.color FROM issues i JOIN projects p ON i.project_id=p.id WHERE i.id=? AND p.owner_id=?',iid,user.id);if(!i)fail('Issue not found.',404);return i};
 if(path==='/api/projects'&&method==='GET')return json(await all('SELECT p.*,COUNT(i.id) AS issue_count,SUM(CASE WHEN i.status=\'DONE\' THEN 1 ELSE 0 END) AS done_count FROM projects p LEFT JOIN issues i ON i.project_id=p.id WHERE p.owner_id=? GROUP BY p.id ORDER BY p.created_at',user.id));
 if(path==='/api/projects'&&method==='POST'){
  const pid=id();await run('INSERT INTO projects (id,name,description,owner_id,color) VALUES (?,?,?,?,?)',pid,text(body.name,100,true),text(body.description||'',3000),user.id,/^#[\da-f]{6}$/i.test(body.color||'')?body.color:'#6366f1');return json(await project(pid),201);
 }
 const pm=path.match(/^\/api\/projects\/([^/]+)$/);
 if(pm){const p=await project(pm[1]);if(method==='GET')return json(p);if(method==='DELETE'){await run('DELETE FROM projects WHERE id=?',p.id);return json({ok:true})}if(method==='PUT'){await run('UPDATE projects SET name=?,description=?,color=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',text(body.name,100,true),text(body.description||'',3000),/^#[\da-f]{6}$/i.test(body.color||'')?body.color:p.color,p.id);return json(await project(p.id))}}
 if(path==='/api/issues'&&method==='GET'){
  let sql='SELECT i.*,p.name AS project_name,p.color FROM issues i JOIN projects p ON i.project_id=p.id WHERE p.owner_id=?';const args=[user.id];
  for(const [key,col] of [['priority','i.priority'],['status','i.status'],['project','i.project_id']])if(url.searchParams.get(key)){sql+=' AND '+col+'=?';args.push(url.searchParams.get(key))}
  if(url.searchParams.get('search')){sql+=' AND (i.title LIKE ? OR i.description LIKE ?)';let s='%'+url.searchParams.get('search').slice(0,200)+'%';args.push(s,s)}return json(await all(sql+' ORDER BY i.created_at DESC,i.id',...args));
 }
 function values(b){if(!priorities.includes(b.priority)||!statuses.includes(b.status))fail('Select a valid priority and status.');if(b.due_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)||Number.isNaN(Date.parse(b.due_date))||new Date(b.due_date).toISOString().slice(0,10)!==b.due_date))fail('Enter a valid due date.');return [text(b.title,200,true),text(b.description||'',10000),b.priority,b.status,b.due_date||null]}
 if(path==='/api/issues'&&method==='POST'){await project(body.project_id);const v=values(body),iid=id();await run('INSERT INTO issues (id,project_id,title,description,priority,status,due_date) VALUES (?,?,?,?,?,?,?)',iid,body.project_id,...v);return json(await issue(iid),201)}
 const im=path.match(/^\/api\/issues\/([^/]+)(\/status)?$/);
 if(im){const i=await issue(im[1]);if(method==='GET')return json(i);if(method==='DELETE'){await run('DELETE FROM issues WHERE id=?',i.id);return json({ok:true})}if(method==='PATCH'&&im[2]){if(!statuses.includes(body.status))fail('Invalid status.');await run('UPDATE issues SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',body.status,i.id);return json(await issue(i.id))}if(method==='PUT'){const v=values(body);await project(body.project_id||i.project_id);await run('UPDATE issues SET title=?,description=?,priority=?,status=?,due_date=?,project_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',...v,body.project_id||i.project_id,i.id);return json(await issue(i.id))}}
 if(path==='/api/dashboard/stats'&&method==='GET'){
 const issues=await all('SELECT i.* FROM issues i JOIN projects p ON p.id=i.project_id WHERE p.owner_id=?',user.id);const projects=await first('SELECT COUNT(*) AS total FROM projects WHERE owner_id=?',user.id);return json({projects:projects.total,total:issues.length,todo:issues.filter(i=>i.status==='TODO').length,in_progress:issues.filter(i=>i.status==='IN_PROGRESS').length,done:issues.filter(i=>i.status==='DONE').length,priority:Object.fromEntries(priorities.map(p=>[p,issues.filter(i=>i.priority===p).length]))});}
 fail('Endpoint not found.',404);
 }catch(e){if(!e.status)console.error(e);return json({error:e.status?e.message:'Something went wrong. Please try again.'},e.status||500)}
}
export async function seed(db,uid){
 const projects=[['Website redesign','A fresh, accessible experience for our next chapter.','#6366f1'],['Developer API','Thoughtful APIs. Powerful integrations.','#f59e0b'],['Mobile app','Bring the whole workspace along.','#14b8a6']];
 const pids=projects.map(()=>id());
 await db.batch(projects.map((p,n)=>db.prepare('INSERT INTO projects (id,name,description,owner_id,color) VALUES (?,?,?,?,?)').bind(pids[n],p[0],p[1],uid,p[2])));
 const data=[
 [0,'Fix navigation on smaller screens','The menu overlaps the page heading on mobile devices.','HIGH','IN_PROGRESS','2026-11-06'],
 [0,'Design new onboarding experience','Welcome new developers with a focused, friendly first run.','MEDIUM','TODO','2026-11-10'],
 [1,'Add rate limiting to API endpoints','Protect public endpoints and return useful retry headers.','HIGH','TODO','2026-11-05'],
 [2,'Polish the empty states','Add helpful guidance when a workspace has no projects.','LOW','TODO',null],
 [0,'Update color tokens','Align semantic color variables across light mode.','LOW','DONE',null],
 [1,'Write authentication documentation','Explain access tokens, sessions, and error responses.','MEDIUM','IN_PROGRESS','2026-11-09'],
 [2,'Build notification preferences','Let users choose the updates they care about.','MEDIUM','IN_PROGRESS','2026-11-12'],
 [0,'Improve dashboard performance','Remove redundant requests and reduce layout shifts.','HIGH','DONE',null],
 [1,'Validate request payloads','Return clear field validation errors.','HIGH','DONE',null],
 [2,'Add pull-to-refresh support','Refresh the issue list with a familiar gesture.','LOW','TODO',null],
 [0,'Review accessibility of forms','Check labels, contrast, and keyboard navigation.','MEDIUM','TODO','2026-11-13'],
 [1,'Add pagination to issue endpoint','Keep large workspaces fast and predictable.','MEDIUM','TODO',null]
 ];
 await db.batch(data.map((d,n)=>db.prepare('INSERT INTO issues (id,project_id,title,description,priority,status,due_date,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id(),pids[d[0]],...d.slice(1),`2026-11-02 ${String(9+Math.floor(n/4)).padStart(2,'0')}:${String(n*5%60).padStart(2,'0')}:00`)));
}
