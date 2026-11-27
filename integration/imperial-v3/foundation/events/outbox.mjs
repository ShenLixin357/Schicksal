// Internal server-only candidate; no public API, scheduler or production binding.
const KINDS = new Set(['book.published','collection.changed','permission.changed','exploration.discovered','system.health_changed']);
const CONSUMERS = new Set(['search','observatory','exploration']);
const ERRORS = new Set(['temporary','unavailable','invalid']);
const MAX = 5;
const now = () => Math.floor(Date.now()/1000);
function consumer(value) { if (!CONSUMERS.has(value)) throw new TypeError('Unknown consumer'); return value; }
function clock(value) { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Invalid clock'); return value; }
function identity(event) {
  if (!event || Object.keys(event).sort().join(',') !== 'kind,resource,revision' || !KINDS.has(event.kind) || typeof event.resource !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(event.resource) || !Number.isSafeInteger(event.revision) || event.revision < 1) throw new TypeError('Invalid event');
  return `${event.kind}:${event.resource}:${event.revision}`;
}
// Include this prepared statement in the SAME D1 batch as a successful domain write.
// Caller must make domain write and event conditional on the same authoritative outcome.
export function prepareEvent(db,event,at=now()) {
  const id=identity(event); clock(at);
  return db.prepare('INSERT INTO imperial_events(id,kind,resource,revision,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,event.kind,event.resource,event.revision,at);
}
export async function claim(db,name,{at=now(),leaseSeconds=60}={}) {
  consumer(name); clock(at);
  if (!Number.isInteger(leaseSeconds)||leaseSeconds<5||leaseSeconds>300) throw new TypeError('Invalid lease');
  await db.prepare("UPDATE imperial_deliveries SET state='dead',lease_token=NULL,lease_until=NULL,last_error='lease_expired' WHERE consumer=? AND state='leased' AND lease_until<=? AND attempts>=?").bind(name,at,MAX).run();
  const token=crypto.randomUUID();
  const row=await db.prepare(`UPDATE imperial_deliveries SET state='leased',attempts=attempts+1,lease_token=?,lease_until=?
    WHERE (event_id,consumer)=(SELECT event_id,consumer FROM imperial_deliveries WHERE consumer=? AND attempts<? AND ((state='pending' AND available_at<=?) OR (state='leased' AND lease_until<=?)) ORDER BY available_at,event_id LIMIT 1)
    RETURNING event_id,consumer,attempts,lease_token,lease_until`).bind(token,at+leaseSeconds,name,MAX,at,at).first();
  if (!row) return null;
  const event=await db.prepare('SELECT id,kind,resource,revision,created_at FROM imperial_events WHERE id=?').bind(row.event_id).first();
  if (!event) throw new Error('Missing immutable event');
  return {...row,event};
}
function leaseArgs(lease,at) {
  clock(at); consumer(lease?.consumer);
  if (typeof lease.event_id!=='string'||typeof lease.lease_token!=='string'||!lease.lease_token) throw new TypeError('Invalid lease');
  return [lease.event_id,lease.consumer,lease.lease_token,at];
}
export async function complete(db,lease,at=now()) {
  const row=await db.prepare("UPDATE imperial_deliveries SET state='done',lease_token=NULL,lease_until=NULL,last_error=NULL WHERE event_id=? AND consumer=? AND lease_token=? AND state='leased' AND lease_until>? RETURNING event_id").bind(...leaseArgs(lease,at)).first();
  return !!row;
}
export async function fail(db,lease,code,at=now()) {
  if (!ERRORS.has(code)) throw new TypeError('Unknown error code');
  const args=leaseArgs(lease,at);
  const row=await db.prepare(`UPDATE imperial_deliveries SET state=CASE WHEN attempts>=5 OR ?='invalid' THEN 'dead' ELSE 'pending' END,
    available_at=?+min(3600,30*(1 << (attempts-1))), lease_token=NULL,lease_until=NULL,last_error=?
    WHERE event_id=? AND consumer=? AND lease_token=? AND state='leased' AND lease_until>? RETURNING state`).bind(code,at,code,...args).first();
  return row?.state??null;
}
export async function summary(db) {
  const {results}=await db.prepare('SELECT consumer,state,count(*) AS count FROM imperial_deliveries GROUP BY consumer,state ORDER BY consumer,state').all();
  return results;
}
