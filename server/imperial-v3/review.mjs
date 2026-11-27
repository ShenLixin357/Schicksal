// Canonical review ledger. No bytes, arbitrary HTML or credentials stored here.
export const categories=Object.freeze(['完成作品','概念设计','设计草稿','未采用方案','艺术素材','参考资料','制作教程','工程文件']);
const kinds=new Set(['book','gallery','digital']), states=new Set(['pending','approved','rejected']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(v);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const enabled=c=>c.SCHICKSAL_HOSTING==='cloudflare'&&c.SCHICKSAL_V32_REVIEW_ENABLED==='true'&&/^[a-f0-9]{40}$/.test(c.SCHICKSAL_PREVIEW_COMMIT??'');
const sources={
 book:{table:'library_revisions',entity:'entity_id',version:'revision',author:'actor',extra:" AND kind='book' AND state='published'"},
 gallery:{table:'gallery_versions',entity:'work_id',version:'id',author:'created_by',extra:''},
 digital:{table:'digital_versions',entity:'object_id',version:'id',author:'created_by',extra:''}
};
function validateKey(p){if(!kinds.has(p.kind)||!id(p.entity)||!id(p.version))fail('作品编号无效');}
function authority(a){if(!id(a.actor)||!(/^[a-f0-9]{64}$/).test(a.tokenHash??'')||!Number.isSafeInteger(a.now)||a.now<0||!['citizen','technology'].includes(a.mode))fail('会话无效',401);}
const live="EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.expires_at>? AND s.account_mode=? AND (?='citizen' OR (s.minister_grant_expires_at>? AND EXISTS(SELECT 1 FROM current_office_holders o WHERE o.office_id='technology' AND o.citizen_id=s.citizen_id AND o.term_id=?) AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1)))";
const authArgs=a=>[a.tokenHash,a.actor,a.now,a.mode,a.mode,a.now,a.term??null];
const query=(db,q,args)=>db.prepare(q).bind(...args);
export async function submitReview(db,p,a){
 validateKey(p);authority(a);
 if(p.kind==='book'?p.category!=='书籍':!categories.includes(p.category))fail('请选择正确作品类别');
 const s=sources[p.kind],at=Math.floor(a.now/1000),state=a.mode==='technology'?'approved':'pending';
 // Existing immutable version must belong to the submitting account; the
 // canonical upload adapter must complete bytes before registering this item.
 // Visibility stays fail-closed between canonical insert and this atomic batch.
 const i=query(db,"INSERT INTO imperial_review_items(kind,entity,version,author,category,submitted_at) SELECT ?,?,?,?,?,? WHERE "+live+" AND EXISTS(SELECT 1 FROM "+s.table+" WHERE "+s.entity+"=? AND "+s.version+"=? AND "+s.author+"=?"+s.extra+") ON CONFLICT(kind,entity,version) DO NOTHING",[p.kind,p.entity,p.version,a.actor,p.category,at,...authArgs(a),p.entity,p.version,a.actor]);
 const h=query(db,"INSERT INTO imperial_review_history(kind,entity,version,revision,state,actor,term,reason,at) SELECT ?,?,?,1,?,?,?,?,? WHERE changes()=1 AND "+live+" AND EXISTS(SELECT 1 FROM imperial_review_items WHERE kind=? AND entity=? AND version=? AND author=?)",[p.kind,p.entity,p.version,state,a.actor,a.term??null,a.mode==='technology'?'现任科技部长直接发布':'公民提交，待审核',at,...authArgs(a),p.kind,p.entity,p.version,a.actor]);
 const result=await db.batch([i,h]);
 if(result[1].meta.changes!==1)fail('作品不存在、已提交或会话已变化',409);
 return {state,revision:1};
}
export async function reviewDecision(db,p,a){
 validateKey(p);authority(a);
 if(a.mode!=='technology'||!a.term)fail('需要现任科技部长账号',403);
 if(!states.has(p.state)||!Number.isSafeInteger(p.expected)||p.expected<1||typeof p.reason!=='string'||!p.reason.trim()||p.reason.length>500)fail('审核状态、版本或原因无效');
 const row=await query(db,"INSERT INTO imperial_review_history(kind,entity,version,revision,state,actor,term,reason,at) SELECT ?,?,?,?,?,?,?,?,? FROM imperial_review_current r WHERE r.kind=? AND r.entity=? AND r.version=? AND r.revision=? AND r.state<>? AND "+live+" RETURNING revision,state",[p.kind,p.entity,p.version,p.expected+1,p.state,a.actor,a.term,p.reason.trim(),Math.floor(a.now/1000),p.kind,p.entity,p.version,p.expected,p.state,...authArgs(a)]).first();
 if(!row)fail('审核版本、任期或会话已变化',409);
 return row;
}
export async function reviewList(db,a,limit=50,before=null){
 authority(a);if(!Number.isSafeInteger(limit)||limit<1||limit>100||before!==null&&(!Number.isSafeInteger(before)||before<0))fail('分页无效');
 const result=await query(db,"SELECT i.*,r.revision,r.state,r.reason,r.at FROM imperial_review_items i JOIN imperial_review_current r USING(kind,entity,version) WHERE (?='technology' OR i.author=?) AND (? IS NULL OR i.submitted_at<?) AND "+live+" ORDER BY CASE r.state WHEN 'pending' THEN 0 ELSE 1 END,i.submitted_at DESC,i.kind,i.entity,i.version LIMIT ?",[a.mode,a.actor,before,before,...authArgs(a),limit]).all();
 return result.results;
}
export async function assignSlot(db,p,a){
 authority(a);if(a.mode!=='technology'||!a.term)fail('需要现任科技部长',403);
 if(!id(p.book)||p.slot!==null&&!id(p.slot)||!Number.isSafeInteger(p.expected)||p.expected<0)fail('书位配置无效');
 // Derive author from immutable original submission, never trust client owner.
 const row=await query(db,"INSERT INTO imperial_book_bindings(book,revision,slot,author,actor,term,at) SELECT ?,?,?,i.author,?,?,? FROM imperial_review_items i JOIN imperial_review_current r USING(kind,entity,version) WHERE i.kind='book' AND i.entity=? AND r.state='approved' AND i.submitted_at=(SELECT MIN(x.submitted_at) FROM imperial_review_items x WHERE x.kind='book' AND x.entity=i.entity) AND "+live+" AND COALESCE((SELECT MAX(revision) FROM imperial_book_bindings WHERE book=?),0)=? AND (? IS NULL OR EXISTS(SELECT 1 FROM imperial_book_slots s WHERE s.id=? AND (s.owner IS NULL OR s.owner=i.author))) AND (?<>'AVS' OR (?='AVS' AND i.author='amberina')) ORDER BY i.version LIMIT 1 RETURNING book,revision,slot",[p.book,p.expected+1,p.slot,a.actor,a.term,Math.floor(a.now/1000),p.book,...authArgs(a),p.book,p.expected,p.slot,p.slot,p.book,p.slot]).first();
 if(!row)fail('书籍、书位、权限或版本不匹配',409);return row;
}
export async function displayBook(db,p,a){
 authority(a);if(a.mode!=='technology'||!a.term)fail('需要现任科技部长',403);
 if(!id(p.book)||!id(p.slot)||!Number.isSafeInteger(p.expected)||p.expected<0)fail('陈列配置无效');
 const row=await query(db,"INSERT INTO imperial_slot_displays(slot,revision,book,actor,term,at) SELECT ?,?,?,?,?,? WHERE "+live+" AND EXISTS(SELECT 1 FROM imperial_book_binding_current WHERE book=? AND slot=?) AND EXISTS(SELECT 1 FROM imperial_review_current WHERE kind='book' AND entity=? AND state='approved') AND COALESCE((SELECT MAX(revision) FROM imperial_slot_displays WHERE slot=?),0)=? RETURNING slot,revision,book",[p.slot,p.expected+1,p.book,a.actor,a.term,Math.floor(a.now/1000),...authArgs(a),p.book,p.slot,p.book,p.slot,p.expected]).first();
 if(!row)fail('陈列书籍、任期或版本已变化',409);return row;
}
