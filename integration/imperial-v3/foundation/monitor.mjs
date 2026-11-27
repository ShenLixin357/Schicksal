// Fixed read-only providers. Server-side tokens only; callers cannot supply arbitrary URLs.
const validName=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(s)&&s!=='.'&&s!=='..';
async function request(fetcher,url,token,timeoutMs){
  if(typeof token!=='string'||!token||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)return {state:'unconfigured'};
  try{
    const r=await fetcher(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
    if(!r.ok)return {state:r.status===401||r.status===403?'forbidden':r.status===429?'rate_limited':'unavailable',status:r.status};
    const body=await r.json();return {state:'ok',body};
  }catch{return {state:'unavailable'};}
}
export async function githubOverview({owner,repo,branch,token,fetcher=fetch,timeoutMs=5000}){
  if(!validName(owner)||!validName(repo)||typeof branch!=='string'||!branch||branch.length>150)throw new TypeError('Invalid repository');
  const base='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo);
  const [b,r]=await Promise.all([request(fetcher,base+'/branches/'+encodeURIComponent(branch),token,timeoutMs),request(fetcher,base+'/actions/runs?branch='+encodeURIComponent(branch)+'&per_page=10',token,timeoutMs)]);
  const sha=b.body?.commit?.sha;
  const runs=Array.isArray(r.body?.workflow_runs)?r.body.workflow_runs.slice(0,10).map(x=>({id:Number.isSafeInteger(x.id)?x.id:null,status:typeof x.status==='string'?x.status.slice(0,40):null,conclusion:typeof x.conclusion==='string'?x.conclusion.slice(0,40):null,sha:/^[a-f0-9]{40}$/i.test(x.head_sha)?x.head_sha:null})):null;
  return {branch:b.state==='ok'&&typeof sha==='string'&&/^[a-f0-9]{40}$/i.test(sha)?{state:'ok',sha}:{state:b.state==='ok'?'invalid_response':b.state},runs:r.state==='ok'&&runs?{state:'ok',items:runs,limitedTo:10}:{state:r.state==='ok'?'invalid_response':r.state}};
}
export async function cloudflareOverview({account,worker,token,fetcher=fetch,timeoutMs=5000}){
  if(typeof account!=='string'||!/^[a-f0-9]{32}$/i.test(account)||!validName(worker))throw new TypeError('Invalid Worker');
  const r=await request(fetcher,'https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(worker)+'/settings',token,timeoutMs);
  if(r.state!=='ok')return {state:r.state};
  if(r.body?.success!==true||!Array.isArray(r.body?.result?.bindings))return {state:'invalid_response'};
  const bindings=r.body.result.bindings;
  const counts={d1:0,r2_bucket:0,ai:0,kv_namespace:0,service:0,other:0};
  for(const b of bindings){const key=Object.hasOwn(counts,b.type)?b.type:'other';counts[key]++}
  const marker=bindings.find(b=>b.name==='SCHICKSAL_PREVIEW_COMMIT');
  return {state:'ok',bindingCounts:counts,previewCommit:typeof marker?.text==='string'&&/^[a-f0-9]{40}$/i.test(marker.text)?marker.text:null};
}
