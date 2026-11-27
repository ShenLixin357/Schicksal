// General retrieval benchmark. Relevance sets are supplied by a curator, not embedded in corpus code.
function validK(k){if(!Number.isInteger(k)||k<1||k>100)throw new TypeError('Invalid K')}
export function scoreRanking(ranking,judgments,k=10){
  validK(k);
  if(!Array.isArray(ranking)||ranking.length>10000||!judgments||typeof judgments!=='object'||Array.isArray(judgments)||Object.entries(judgments).some(([id,v])=>!id||!Number.isInteger(v)||v<0||v>4))throw new TypeError('Invalid ranking or judgments');
  const seen=new Set(),ordered=[];
  for(const id of ranking){if(typeof id!=='string'||!id)throw new TypeError('Invalid result ID');if(!seen.has(id)){seen.add(id);ordered.push(id)}}
  const grades=ordered.slice(0,k).map(id=>Object.hasOwn(judgments,id)?judgments[id]:0);
  const relevant=Object.values(judgments).filter(v=>v>0).length, hits=grades.filter(v=>v>0).length;
  const dcg=arr=>arr.reduce((sum,v,i)=>sum+(2**v-1)/Math.log2(i+2),0);
  const ideal=dcg(Object.values(judgments).sort((a,b)=>b-a).slice(0,k));
  const first=grades.findIndex(v=>v>0);
  return {recall:relevant?hits/relevant:null,precision:hits/k,mrr:relevant?(first<0?0:1/(first+1)):null,ndcg:ideal?dcg(grades)/ideal:null,returned:grades.length};
}
export async function evaluate(cases,search,{k=10,maxCases=200,clock=()=>Date.now(),signal}={}){
  validK(k);if(!Array.isArray(cases)||!Number.isInteger(maxCases)||maxCases<1||maxCases>1000||cases.length>maxCases||typeof search!=='function')throw new TypeError('Invalid benchmark');
  const rows=[],ids=new Set();for(const c of cases){
    if(signal?.aborted)break;
    if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.query!=='string'||!c.query.trim()||c.query.length>2000)throw new TypeError('Invalid case');
    ids.add(c.id);scoreRanking([],c.judgments,k);
    const t=clock();
    try{const ranking=await search(c.query,{k,signal});rows.push({id:c.id,...scoreRanking(ranking,c.judgments,k),ms:Math.max(0,clock()-t)})}
    catch{rows.push({id:c.id,error:true,ms:Math.max(0,clock()-t)})}
  }
  const means={};for(const m of ['recall','precision','mrr','ndcg']){const vals=rows.map(r=>r[m]).filter(x=>typeof x==='number');means[m]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
  return {k,total:cases.length,executed:rows.length,failed:rows.filter(r=>r.error).length,means,rows};
}
