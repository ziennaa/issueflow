import bcrypt from 'bcryptjs';
import {seed} from '../server/core.js';
import {handleAPI} from '../server/core.js';
import {assets} from '../.generated/assets.js';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export default {async fetch(req,env){
 const url=new URL(req.url);
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
 if(url.pathname.startsWith('/api/')){
  if(!env.DB)return Response.json({error:'Database is not available.'},{status:503});
  if(Number(req.headers.get('content-length')||0)>32768)return Response.json({error:'Request is too large.'},{status:413});
  // Sites dispatch establishes identity and supplies trusted, site-scoped headers.
  // Application cookies are not required to survive the hosting proxy.
  const identity=req.headers.get('oai-authenticated-user-id');
  if(!identity)return Response.json({error:'Please sign in with ChatGPT to continue.'},{status:401});
  const uid='sites:'+identity;
  let user=await env.DB.prepare('SELECT id,name,email,is_demo FROM users WHERE id=?').bind(uid).first();
  if(!user){
   let name=req.headers.get('oai-authenticated-user-full-name')||'Your workspace';
   if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{}}
   const email=req.headers.get('oai-authenticated-user-email')||identity+'@identity.issueflow.invalid';
   const result=await env.DB.prepare('INSERT OR IGNORE INTO users (id,name,email,password_hash,is_demo) VALUES (?,?,?,?,0)').bind(uid,name.slice(0,80),email,'platform-managed').run();
   user=await env.DB.prepare('SELECT id,name,email,is_demo FROM users WHERE id=?').bind(uid).first();
   if(!user)return Response.json({error:'Unable to initialize your workspace. Please contact support.'},{status:409});
   if(result.meta?.changes||result.changes)await seed(env.DB,uid);
  }
  const sid='platform:'+identity;
  await env.DB.prepare('INSERT OR IGNORE INTO sessions (id,user_id,csrf,expires) VALUES (?,?,?,?)').bind(sid,user.id,token(),Date.now()+604800000).run();
  const saved=await env.DB.prepare('SELECT csrf FROM sessions WHERE id=?').bind(sid).first();
  const session=async()=>({user:{...user,hosted:true},csrf:saved.csrf});
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
   if(req.headers.get('x-csrf-token')!==saved.csrf)return Response.json({error:'Refresh before signing out.'},{status:403});
   if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return Response.json({error:'Request origin is not allowed.'},{status:403});
   return Response.json({ok:true,redirect:'/signout-with-chatgpt?return_to=%2F'});
  }
  if(['/api/auth/login','/api/auth/register'].includes(url.pathname))return Response.json({error:'This hosted workspace uses ChatGPT sign-in.'},{status:400});
  const login=async()=>({headers:{},csrf:saved.csrf});
  const logout=async()=>({});
  return handleAPI(req,{DB:env.DB,hash:p=>bcrypt.hash(p,12),verify:(p,h)=>bcrypt.compare(p,h),session,login,logout});
 }
 const protectedPaths=['/dashboard.html','/projects.html','/project.html','/issues.html','/kanban.html','/explorer.html'];
 if(protectedPaths.includes(url.pathname)&&!req.headers.get('oai-authenticated-user-id'))return Response.redirect(url.origin+'/signin-with-chatgpt?return_to='+encodeURIComponent(url.pathname),302);
 const asset=assets[url.pathname]||((url.pathname==='/'||url.pathname.endsWith('.html'))?assets['/index.html']:null);
 if(!asset)return new Response('Not found',{status:404});
 const body=asset.binary?Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)):asset.data;
 return new Response(body,{headers:{...headers,'Content-Type':asset.type,'Cache-Control':asset.type.startsWith('text/html')?'no-cache':'public, max-age=3600'}});
}};
