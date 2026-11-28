// Server-only canonical directory-book submission. D1 batch is transactional.
// Original author is the first reviewed owner, independent of the editing actor.
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const key=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x);
const directory=x=>/^book-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const physical=new Set(['A','L1','L2','L3','L4','R1','R2','R3','R4','LT','AVS']);
const live="EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.expires_at>? AND s.account_mode=? AND (?='citizen' OR (s.minister_grant_expires_at>? AND EXISTS(SELECT 1 FROM current_office_holders o WHERE o.office_id='technology' AND o.citizen_id=s.citizen_id AND o.term_id=?) AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1)))";
const args=a=>[a.tokenHash,a.actor,a.now,a.mode,a.mode,a.now,a.term??null];
const query=(db,s,x)=>db.prepare(s).bind(...x);
export async function bookOwner(db,id){
 const first=await query(db,"SELECT i.author FROM imperial_review_items i JOIN library_revisions v ON v.revision=i.version WHERE i.kind='book' AND i.entity=? ORDER BY v.seq LIMIT 1",[id]).first();
 if(first)return first.author;
 const legacy=await query(db,"SELECT owner FROM imperial_legacy_book_versions WHERE book=?",[id]).first();
 return legacy?.owner??null;
}
export async function commitBook(db,p,a){
 if(!key(a.actor)||!['citizen','technology'].includes(a.mode)||!Number.isSafeInteger(a.now)||!/^[a-f0-9]{64}$/.test(a.tokenHash)||a.mode==='technology'&&!a.term)fail('会话无效',401);
 if(!key(p.id)||(!directory(p.id)&&!(a.mode==='technology'&&physical.has(p.id)))||!key(p.revision)||p.revision.startsWith('seed-')||(p.base!==null&&!key(p.base))||typeof p.payload!=='string'||!p.payload||p.draftId!=null&&(!key(p.draftId)||a.mode!=='technology'))fail('书籍或版本编号无效');
 const data=JSON.parse(p.payload);if(data.id!==p.id||!Array.isArray(data.chapters)||!data.chapters.length)fail('书稿缺少正文');
 const owner=await bookOwner(db,p.id);
 if(owner&&owner!=='system:library-seed'&&owner!==a.actor&&a.mode!=='technology')fail('只能提交自己的书稿',403);
 if(p.base!==null&&!owner)fail('既有书稿须先核对作者与审核历史',409);
 if(p.id==='AVS'&&owner!=='amberina')fail('AVS 专属档案所有权未核验',409);
 const author=owner&&owner!=='system:library-seed'?owner:a.actor,state=a.mode==='technology'?'approved':'pending';
 const draft=p.draftId??null;
 const saved=await db.batch([
 query(db,"INSERT INTO library_revisions(revision,kind,entity_id,state,base_revision,origin_draft,actor,created_at,payload) SELECT ?,'book',?,'published',?,?,?,?,? WHERE "+live+" AND (SELECT revision FROM library_revisions WHERE kind='book' AND entity_id=? AND state='published' ORDER BY seq DESC LIMIT 1) IS ? AND (? IS NULL OR EXISTS(SELECT 1 FROM library_revisions d WHERE d.revision=? AND d.kind='book' AND d.entity_id=? AND d.state='draft' AND d.actor=? AND d.base_revision IS ? AND d.payload=?)) AND NOT EXISTS(SELECT 1 FROM library_revisions WHERE revision=?)",[p.revision,p.id,p.base,draft,a.actor,new Date(a.now).toISOString(),p.payload,...args(a),p.id,p.base,draft,draft,p.id,a.actor,p.base,p.payload,p.revision]),
 query(db,"INSERT INTO imperial_review_items(kind,entity,version,author,category,submitted_at,initial_state,initial_term) SELECT 'book',?,? ,?,'书籍',?,?,? WHERE "+live+" AND EXISTS(SELECT 1 FROM library_revisions WHERE kind='book' AND entity_id=? AND revision=? AND state='published' AND actor=? AND base_revision IS ? AND origin_draft IS ? AND payload=?) ON CONFLICT(kind,entity,version) DO NOTHING",[p.id,p.revision,author,Math.floor(a.now/1000),state,a.mode==='technology'?a.term:null,...args(a),p.id,p.revision,a.actor,p.base,draft,p.payload])
 ]);
 const row=await query(db,"SELECT r.state,i.author FROM imperial_review_items i JOIN imperial_review_current r USING(kind,entity,version) JOIN library_revisions v ON v.revision=i.version WHERE i.kind='book' AND i.entity=? AND i.version=? AND i.author=? AND v.actor=? AND v.base_revision IS ? AND v.origin_draft IS ? AND v.payload=? AND "+live,[p.id,p.revision,author,a.actor,p.base,draft,p.payload,...args(a)]).first();
 if(!row)fail('会话、书籍所有权或基线版本已变化',409);
 return {id:p.id,revision:p.revision,state:row.state,replayed:saved[0].meta.changes===0};
}
