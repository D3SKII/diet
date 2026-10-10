import {products,recipes} from './data.js';
export const productById=Object.fromEntries(products.map(p=>[p.id,p]));
export const recipeById=Object.fromEntries(recipes.map(r=>[r.id,r]));
export function initialState(){return {schema:1,settings:{names:'Мы вдвоём',people:2,budget:4500,maxTime:40,excluded:[],equipment:['Плита','Духовка','Без техники'],activeMeals:[0,1,2]},prices:{},pantry:{},checked:[],plan:[]};}
export function price(state,id){return state.prices[id]??productById[id].price;}
export function recipeCost(state,r){return Object.entries(r.ingredients).reduce((sum,[id,q])=>sum+q/productById[id].pack*price(state,id),0);}
export function available(state,meal){return recipes.filter(r=>r.meal===meal&&r.time<=state.settings.maxTime&&state.settings.equipment.includes(r.equipment)&&!Object.keys(r.ingredients).some(id=>state.settings.excluded.includes(id)));}
export function shopping(state,plan=state.plan){
 const quantities={};
 for(const day of plan)for(const id of day){const r=recipeById[id];if(r)for(const [pid,q] of Object.entries(r.ingredients))quantities[pid]=(quantities[pid]??0)+q*state.settings.people;}
 return Object.entries(quantities).map(([id,need])=>{const p=productById[id],remaining=Math.max(0,need-(state.pantry[id]??0)),packs=Math.ceil(remaining/p.pack);return {...p,need,remaining,packs,cost:packs*price(state,id),price:price(state,id)};}).sort((a,b)=>a.category.localeCompare(b.category,'ru')||a.name.localeCompare(b.name,'ru'));
}
export function totals(state,plan=state.plan){return {purchase:shopping(state,plan).reduce((s,p)=>s+p.cost,0),ingredients:plan.flat().reduce((s,id)=>s+(recipeById[id]?recipeCost(state,recipeById[id])*state.settings.people:0),0)};}
export function generate(state,random=Math.random){
 const pools=[0,1,2].map(m=>available(state,m));
 for(const m of state.settings.activeMeals)if(!pools[m].length)throw new Error('Нет подходящих рецептов для одного из приёмов пищи. Измените ограничения.');
 let best,score=Infinity;
 for(let attempt=0;attempt<250;attempt++){
  const used={};const plan=Array.from({length:7},()=>[0,1,2].map(m=>{if(!state.settings.activeMeals.includes(m))return null;const pool=pools[m];let r;
   if(attempt===0){r=pool.reduce((a,b)=>recipeCost(state,a)<=recipeCost(state,b)?a:b);}
   else if(attempt>100&&random()<.45){const sorted=[...pool].sort((a,b)=>recipeCost(state,a)-recipeCost(state,b));r=sorted[Math.floor(random()*Math.min(3,sorted.length))];}
   else{const least=Math.min(...pool.map(r=>used[r.id]??0));const candidates=pool.filter(r=>(used[r.id]??0)===least);r=candidates[Math.floor(random()*candidates.length)];}
   used[r.id]=(used[r.id]??0)+1;return r.id;}));
  const cost=totals(state,plan).purchase;const repeats=Object.values(used).reduce((s,count)=>s+count*count,0);
  const candidateScore=cost<=state.settings.budget?repeats*30+cost/state.settings.budget*10+random()*5:100000+cost;
  if(candidateScore<score){best=plan;score=candidateScore;}
 }
 return best;
}
