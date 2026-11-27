// Restriction overlays only; this module cannot grant a capability absent from authoritative policy.
const ID=/^[a-z][a-z0-9_-]{0,79}$/;
const MODES=new Set(['inherit','deny','read','use']);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
function known(value,set){return typeof value==='string'&&set.has(value)}
export function normalizePolicy(rules,{members,features,templates,maxTemporarySeconds=30*86400,now}){
  if(!Array.isArray(rules)||rules.length>500||!integer(now)||!integer(maxTemporarySeconds))throw new TypeError('Invalid rules');
  const seen=new Set();
  return rules.map(r=>{
    if(!r||Object.keys(r).some(k=>!['subject','subjectType','feature','mode','expiresAt'].includes(k))||
       !['member','template'].includes(r.subjectType)||!known(r.subject,r.subjectType==='member'?members:templates)||
       !known(r.feature,features)||!MODES.has(r.mode))throw new TypeError('Unknown subject, feature or mode');
    const expiry=r.expiresAt??null;
    if(expiry!==null&&(!integer(expiry)||expiry<=now||expiry-now>maxTemporarySeconds||r.subjectType==='template'))throw new TypeError('Invalid temporary expiry');
    const key=r.subjectType+':'+r.subject+':'+r.feature+':'+(expiry===null?'permanent':'temporary');
    if(seen.has(key))throw new TypeError('Duplicate rule');seen.add(key);
    return {subjectType:r.subjectType,subject:r.subject,feature:r.feature,mode:r.mode,expiresAt:expiry};
  });
}
export function effectiveAccess({baseRead,baseWrite,member,feature,assignedTemplates=[],rules=[],at}){
  if(!integer(at)||typeof baseRead!=='boolean'||typeof baseWrite!=='boolean')throw new TypeError('Invalid access');
  const matched=rules.filter(r=>r.feature===feature&&(r.expiresAt==null||r.expiresAt>at)&&
     (r.subjectType==='member'?r.subject===member:r.subjectType==='template'&&assignedTemplates.includes(r.subject)));
  // An explicit temporary member rule overrides only that member's own permanent rule.
  // It never overrides a template restriction or the authoritative baseline.
  const temporary=matched.filter(r=>r.subjectType==='member'&&r.expiresAt!=null);
  const applied=temporary.length?matched.filter(r=>r.subjectType!=='member'||r.expiresAt!=null):matched;
  const deny=applied.some(r=>r.mode==='deny'),readOnly=applied.some(r=>r.mode==='read');
  return {read:baseRead&&!deny,write:baseRead&&baseWrite&&!deny&&!readOnly,restricted:deny||readOnly};
}
// Templates are named in trusted configuration; batch is a full immutable policy snapshot.
// Term, actor and live elevated session must be enforced by caller in the SAME conditional write.
// Existing snapshot revisions never change. Policy snapshots are not active until explicitly wired.
export function preparePolicyRevision(db,{id,actor,term,reason,expectedRevision,rules,registry,at}){
  if(![id,actor,term].every(x=>typeof x==='string'&&ID.test(x))||typeof reason!=='string'||!reason.trim()||reason.length>500||!integer(expectedRevision)||!integer(at))throw new TypeError('Invalid policy update');
  const data=normalizePolicy(rules,{...registry,now:at});
  return db.prepare("INSERT INTO imperial_policy_sets(id,revision,actor,term,reason,created_at,rules) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT max(revision) FROM imperial_policy_sets WHERE id=?),0)=? ON CONFLICT(id,revision) DO NOTHING RETURNING id,revision").bind(id,expectedRevision+1,actor,term,reason.trim(),at,JSON.stringify(data),id,expectedRevision);
}
