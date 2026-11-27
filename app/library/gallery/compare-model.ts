export const comparisonModes=[{id:'side',label:'并排'},{id:'wipe',label:'滑动分割'},{id:'blend',label:'透明叠加'}] as const;
export function splitValue(v:number){return Number.isFinite(v)?Math.max(0,Math.min(100,v)):50;}
/** Keep at most two distinct, exact immutable version references; never infer a "same" design. */
export function chooseVersion<T extends {id:string}>(selected:T[],v:T):T[]{if(selected.some(x=>x.id===v.id))return selected.filter(x=>x.id!==v.id);return [...selected.slice(-1),v];}
