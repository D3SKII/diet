import {config} from './config.js';
import {initialState} from './domain.js';
export const cloud=Boolean(config.supabaseUrl&&config.supabaseKey);
let session=JSON.parse(localStorage.getItem('diet-session')||'null');
export const signedIn=()=>!cloud||Boolean(session);
async function auth(path,body){const res=await fetch(`${config.supabaseUrl}/auth/v1/${path}`,{method:'POST',headers:{apikey:config.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error('Не удалось войти. Проверьте почту, пароль и настройки Supabase.');return data;}
function setSession(data){session={...data,expires_at:Date.now()+data.expires_in*1000};localStorage.setItem('diet-session',JSON.stringify(session));}
export async function login(email,password){setSession(await auth('token?grant_type=password',{email,password}));}
export function logout(){session=null;localStorage.removeItem('diet-session');}
async function request(path,options={}){
 if(!session)throw new Error('Войдите в общий аккаунт.');
 if(Date.now()>session.expires_at-60000)setSession(await auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}));
 const res=await fetch(`${config.supabaseUrl}/rest/v1/${path}`,{...options,headers:{apikey:config.supabaseKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...options.headers}});
 if(!res.ok)throw new Error('Облако недоступно или не настроено. Изменение не сохранено.');return res.json();
}
export async function read(){
 if(!cloud)return JSON.parse(localStorage.getItem('diet-state')||'null')??{revision:0,payload:initialState()};
 const rows=await request('household_state?select=revision,payload');return rows[0]??{revision:0,payload:initialState()};
}
export async function write(payload,revision){
 if(!cloud){const current=await read();if(current.revision!==revision)throw new Error('Меню уже изменилось в другой вкладке. Обновите страницу.');const row={revision:revision+1,payload};localStorage.setItem('diet-state',JSON.stringify(row));return row;}
 const row=await request('rpc/save_household',{method:'POST',body:JSON.stringify({expected_revision:revision,new_payload:payload})});
 if(!row)throw new Error('На другом телефоне уже изменили данные. Обновите страницу и повторите изменение.');return row;
}
