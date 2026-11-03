let csrf='';
export function setToken(value){csrf=value||''}
export async function api(path,options={}){
 const response=await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers},...(options.body?{body:JSON.stringify(options.body)}:{})});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Request failed.'),{status:response.status});if(data.csrf)setToken(data.csrf);return data;
}
