import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {openDB} from './db.js';
import {handleAPI} from './core.js';
import {fileURLToPath} from 'node:url';
export function createApp(filename){
 const {sqlite,adapter}=openDB(filename),app=express();
 const secretPath=resolve(dirname(filename||process.env.DATABASE_PATH||'data/issueflow.sqlite'),'session-secret');
 mkdirSync(dirname(secretPath),{recursive:true});if(!process.env.SESSION_SECRET&&!existsSync(secretPath))writeFileSync(secretPath,randomBytes(32).toString('hex'),{mode:0o600});
 const secret=process.env.SESSION_SECRET||readFileSync(secretPath,'utf8');app.disable('x-powered-by');app.set('trust proxy',1);
 class Store extends session.Store{
 get(sid,cb){try{const row=sqlite.prepare('SELECT data FROM local_sessions WHERE sid=? AND expires>?').get(sid,Date.now());cb(null,row?JSON.parse(row.data):null)}catch(e){cb(e)}}
 set(sid,data,cb){try{sqlite.prepare('INSERT OR REPLACE INTO local_sessions VALUES (?,?,?)').run(sid,JSON.stringify(data),Date.now()+7*86400000);cb?.()}catch(e){cb?.(e)}}
 destroy(sid,cb){try{sqlite.prepare('DELETE FROM local_sessions WHERE sid=?').run(sid);cb?.()}catch(e){cb?.(e)}}
 }
 app.use(session({name:'issueflow.sid',secret,store:new Store(),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000}}));
 app.use(express.text({type:'application/json',limit:'32kb'}));
 app.use('/api',async(req,res)=>{
 const origin=`${req.protocol}://${req.get('host')}`,request=new Request(origin+req.originalUrl,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:req.body||'{}'})});
 const env={DB:adapter,hash:p=>bcrypt.hash(p,12),verify:(p,h)=>bcrypt.compare(p,h),session:async()=>req.session.user?{user:req.session.user,csrf:req.session.csrf}:null,
 login:async(_r,u)=>{await new Promise((ok,no)=>req.session.regenerate(e=>e?no(e):ok()));req.session.user={id:u.id,name:u.name,email:u.email,is_demo:u.is_demo};req.session.csrf=randomBytes(32).toString('hex');await new Promise((ok,no)=>req.session.save(e=>e?no(e):ok()));return {headers:{},csrf:req.session.csrf}},
 logout:async()=>{await new Promise((ok,no)=>req.session.destroy(e=>e?no(e):ok()));return {'Set-Cookie':'issueflow.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'}}};
 const response=await handleAPI(request,env);response.headers.forEach((v,k)=>res.setHeader(k,v));res.status(response.status).send(await response.text());
 });
 app.get(['/dashboard.html','/projects.html','/project.html','/issues.html','/kanban.html','/explorer.html'],(req,res,next)=>req.session.user?next():res.redirect('/login.html'));
 app.use('/vendor/bootstrap',express.static('node_modules/bootstrap/dist'));app.use('/vendor/icons',express.static('node_modules/bootstrap-icons/font'));
 app.use(express.static(fileURLToPath(new URL('../public',import.meta.url))));
 app.get(/.*/,(_req,res)=>res.sendFile(fileURLToPath(new URL('../public/index.html',import.meta.url))));
 app.use((e,_req,res,_next)=>res.status(e.status||500).json({error:e.status===413?'Request is too large.':'Request could not be completed.'}));
 return {app,sqlite};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {app}=createApp();const port=process.env.PORT||(process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:3000);app.listen(port,'0.0.0.0',()=>console.log(`IssueFlow is ready at http://localhost:${port}`));}
