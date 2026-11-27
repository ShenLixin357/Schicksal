const idPattern=/^[a-z0-9_-]{1,100}$/;
function validId(x){return typeof x==='string'&&idPattern.test(x)}
function active(s,at){return (s.opensAt==null||at>=s.opensAt)&&(s.closesAt==null||at<s.closesAt)}
export function validateSecrets(secrets){
  if(!Array.isArray(secrets)||secrets.length>5000)throw new TypeError('Invalid catalog');
  const ids=new Set();for(const s of secrets){
    if(!s||!validId(s.id)||ids.has(s.id)||!validId(s.scope)||typeof s.title!=='string'||!s.title.trim()||s.title.length>100||typeof s.hidden!=='boolean'||!Array.isArray(s.steps)||s.steps.length<1||s.steps.length>20||s.steps.some(x=>!validId(x))||new Set(s.steps).size!==s.steps.length||[s.opensAt,s.closesAt].some(t=>t!=null&&(!Number.isSafeInteger(t)||t<0))||(s.opensAt!=null&&s.closesAt!=null&&s.opensAt>=s.closesAt))throw new TypeError('Invalid secret');ids.add(s.id);
  }return secrets;
}
// Only the service's authoritative evidence resolver may call this. No client-submitted proof accepted.
export async function advance(db,{secret,member,authorized,evidence,at}){
  validateSecrets([secret]);if(!validId(member)||!Number.isSafeInteger(at)||at<0||!validId(evidence?.id)||!validId(evidence?.kind))throw new TypeError('Invalid proof');
  if(authorized!==true||!active(secret,at))return {accepted:false};
  const index=secret.steps.indexOf(evidence.kind);if(index<0)return {accepted:false};
  const step=index+1;
  // SQL checks all preceding contiguous steps; duplicate proof/step is ignored.
  const insert=db.prepare("INSERT INTO imperial_exploration_steps(member,secret,step,evidence,discovered_at) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM imperial_exploration_steps WHERE member=? AND secret=? AND step<?)=? ON CONFLICT DO NOTHING").bind(member,secret.id,step,evidence.id,at,member,secret.id,step,step-1);
  const completion=db.prepare("INSERT INTO imperial_exploration_completions(member,secret,completed_at) SELECT ?,?,? WHERE (SELECT count(*) FROM imperial_exploration_steps WHERE member=? AND secret=? AND step BETWEEN 1 AND ?)=? ON CONFLICT DO NOTHING").bind(member,secret.id,at,member,secret.id,secret.steps.length,secret.steps.length);
  const result=await db.batch([insert,completion]);return {accepted:result[0].meta.changes===1,completed:result[1].meta.changes===1};
}
export function explorationView(secrets,completions,{scopes,at}){
  validateSecrets(secrets);if(!Number.isSafeInteger(at)||at<0)throw new TypeError('Invalid clock');
  const eligible=secrets.filter(s=>scopes.has(s.scope)),done=new Map(completions.map(x=>[x.secret,x.completed_at]));
  const counted=eligible.filter(s=>!s.hidden&&active(s,at));
  const found=counted.filter(s=>done.has(s.id)).length;
  // No IDs, titles, step count, trigger, location, time window or hint for uncompleted secrets.
  return {found,total:counted.length,percent:counted.length?100*found/counted.length:null,discovered:eligible.filter(s=>done.has(s.id)).map(s=>({id:s.id,title:s.title,hidden:s.hidden,completedAt:done.get(s.id)}))};
}
