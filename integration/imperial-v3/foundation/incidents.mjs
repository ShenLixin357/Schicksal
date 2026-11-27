const codePattern=/^[a-z][a-z0-9_.-]{0,79}$/;
const severities=new Set(['info','warning','critical']);
function validate(code,at){if(typeof code!=='string'||!codePattern.test(code)||!Number.isSafeInteger(at)||at<0)throw new TypeError('Invalid incident');}
export async function observe(db,{code,status,severity='warning',at}){
  validate(code,at);
  if(!['healthy','fault','unknown'].includes(status)||!severities.has(severity))throw new TypeError('Invalid observation');
  if(status==='unknown')return null; // an absent/failed probe is not recovery
  if(status==='healthy')return db.prepare("UPDATE imperial_incidents SET state='resolved',revision=revision+1,resolved_at=?,observed_at=? WHERE code=? AND state<>'resolved' AND observed_at<? RETURNING *").bind(at,at,code,at).first();
  return db.prepare(`INSERT INTO imperial_incidents(code,severity,state,generation,revision,observed_at,opened_at) VALUES(?,?,'open',1,1,?,?)
  ON CONFLICT(code) DO UPDATE SET
  state=CASE WHEN state='resolved' OR severity<>excluded.severity THEN 'open' ELSE state END,
  generation=generation+CASE WHEN state='resolved' THEN 1 ELSE 0 END,
  revision=revision+CASE WHEN state='resolved' OR severity<>excluded.severity THEN 1 ELSE 0 END,
  opened_at=CASE WHEN state='resolved' THEN excluded.observed_at ELSE opened_at END,
  acknowledged_by=CASE WHEN state='resolved' OR severity<>excluded.severity THEN NULL ELSE acknowledged_by END,
  acknowledged_at=CASE WHEN state='resolved' OR severity<>excluded.severity THEN NULL ELSE acknowledged_at END,
  resolved_at=NULL,severity=excluded.severity,observed_at=excluded.observed_at
  WHERE observed_at<excluded.observed_at RETURNING *`).bind(code,severity,at,at).first();
}
// Call only behind requireTechnologyMinister with a fresh office check.
export async function acknowledge(db,{code,actor,expectedRevision,at}){
  validate(code,at);
  if(typeof actor!=='string'||!/^[a-z0-9_-]{1,80}$/.test(actor)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw new TypeError('Invalid acknowledgement');
  return db.prepare("UPDATE imperial_incidents SET state='acknowledged',revision=revision+1,acknowledged_by=?,acknowledged_at=? WHERE code=? AND state='open' AND revision=? AND observed_at<=? RETURNING *").bind(actor,at,code,expectedRevision,at).first();
}
export async function listIncidents(db,{includeResolved=false,limit=50}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new TypeError('Invalid limit');
  const {results}=await db.prepare("SELECT * FROM imperial_incidents WHERE (?=1 OR state<>'resolved') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,observed_at DESC,code LIMIT ?").bind(includeResolved?1:0,limit).all();return results;
}
