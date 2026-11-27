import {claim,complete,fail} from './events/outbox.mjs';
const names=['search','observatory','exploration'];
// Invoked only from an authorized, isolated scheduled worker. No handlers are enabled by default.
export async function tick(db,{handlers={},maxJobs=12,budgetMs=15000,leaseSeconds=60,clock=()=>Date.now(),startAt=0}={}){
  if(!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>100||!Number.isInteger(budgetMs)||budgetMs<1||budgetMs>120000||!Number.isInteger(leaseSeconds)||leaseSeconds<5||leaseSeconds>300||budgetMs>=leaseSeconds*1000||!Number.isInteger(startAt)||startAt<0)throw new TypeError('Invalid budget');
  if(Object.keys(handlers).some(k=>!names.includes(k)||typeof handlers[k]!=='function'))throw new TypeError('Unknown handler');
  const active=names.filter(k=>typeof handlers[k]==='function'), deadline=clock()+budgetMs;
  const report={claimed:0,done:0,retry:0,dead:0,expired:0,nextStart:0};
  if(!active.length)return report;
  let cursor=startAt%active.length, empty=0;
  while(report.claimed<maxJobs&&clock()<deadline&&empty<active.length){
    const name=active[cursor];cursor=(cursor+1)%active.length;report.nextStart=cursor;
    const lease=await claim(db,name,{at:Math.floor(clock()/1000),leaseSeconds});
    if(!lease){empty++;continue} empty=0;report.claimed++;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.max(0,Math.min(deadline-clock(),lease.lease_until*1000-clock())));
    let code=null;
    try{
      // A handler MUST check authoritative revision/access and use event.id as an idempotency key.
      // Await completion even after abort: abort is cooperative, not proof of cancellation.
      await handlers[name](lease.event,{signal:controller.signal,leaseToken:lease.lease_token,expiresAt:lease.lease_until});
      if(controller.signal.aborted)code='temporary';
    }catch(e){code=e?.code==='invalid'?'invalid':e?.code==='unavailable'?'unavailable':'temporary'}
    finally{clearTimeout(timeout)}
    const at=Math.floor(clock()/1000);
    if(code){const s=await fail(db,lease,code,at);if(s==='pending')report.retry++;else if(s==='dead')report.dead++;else report.expired++}
    else if(await complete(db,lease,at))report.done++;else report.expired++;
  }
  return report;
}
