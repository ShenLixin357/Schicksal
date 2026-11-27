import {ApiError} from '../http.ts';
import type {Kind} from '../library/discovery.ts';
export type SearchFilters={kind:Kind|'all';history:boolean;from:string;to:string};
export type QueryPlan={query:string;context:string;filters:SearchFilters;interpreted:string[]};
const date=(v:unknown):string=>{if(v===undefined||v==='')return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new ApiError('日期须为有效 YYYY-MM-DD',400);return v;};
const iso=(d:Date)=>d.toISOString().slice(0,10);
/** Explicit filter grammar only; no corpus-specific vocabulary. Calendar in UTC. */
export function planQuery(raw:string,scope:'books'|'all',input:unknown,context:unknown,now=new Date()):QueryPlan{
 if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw new ApiError('筛选格式无效',400);
 const o=(input??{}) as Record<string,unknown>;if(Object.keys(o).some(k=>!['kind','history','from','to'].includes(k)))throw new ApiError('未知筛选项',400);
 const k=o.kind??'all';if(!['all','book','gallery','digital'].includes(String(k))||typeof k!=='string'||(o.history!==undefined&&typeof o.history!=='boolean'))throw new ApiError('筛选参数无效',400);
 if(context!==undefined&&(typeof context!=='string'||context.length>160))throw new ApiError('上轮查询过长',400);
 const f:SearchFilters={kind:k as SearchFilters['kind'],history:o.history===true,from:date(o.from),to:date(o.to)};let q=raw.trim();const interpreted:string[]=[];
 const kindPrefix=q.match(/^(?:只找|仅搜索|只搜索)(图片|艺术作品|书籍|工程文件|数字藏品)[：:\s，,的]+/u);
 if(kindPrefix){const inferred=({图片:'gallery',艺术作品:'gallery',书籍:'book',工程文件:'digital',数字藏品:'digital'} as Record<string,SearchFilters['kind']>)[kindPrefix[1]];if(f.kind!=='all'&&f.kind!==inferred)throw new ApiError('自然语言类型与所选类型冲突，请调整筛选',400);f.kind=inferred;q=q.slice(kindPrefix[0].length).trim();interpreted.push('类型：'+kindPrefix[1]);}
 const period=q.match(/^(上个月|本月|过去7天|过去30天)(?:的|[：:\s，,]+)/u);
 if(period&&!f.from&&!f.to){const y=now.getUTCFullYear(),m=now.getUTCMonth();if(period[1]==='上个月'){f.from=iso(new Date(Date.UTC(y,m-1,1)));f.to=iso(new Date(Date.UTC(y,m,0)));}else if(period[1]==='本月'){f.from=iso(new Date(Date.UTC(y,m,1)));f.to=iso(now);}else{const d=Number(period[1].match(/\d+/)![0]);f.from=iso(new Date(now.getTime()-(d-1)*86400000));f.to=iso(now);}q=q.slice(period[0].length).trim();interpreted.push('UTC 日期：'+f.from+' 至 '+f.to);}
 if(f.from&&f.to&&f.from>f.to)throw new ApiError('起始日期不能晚于结束日期',400);
 if(scope==='books'&&f.kind!=='all'&&f.kind!=='book')throw new ApiError('图书问询不支持非书籍筛选',400);
 if(scope==='books')f.kind='book';
 if(f.history&&f.kind==='book')throw new ApiError('图书检索仅包含当前正式版本',400);
 return {query:q,context:typeof context==='string'?context.trim():'',filters:f,interpreted};
}
export function matchesDate(value:string,filters:SearchFilters){if(!filters.from&&!filters.to)return true;const day=/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):'';return !!day&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to);}
