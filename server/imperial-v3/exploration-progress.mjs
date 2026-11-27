// One registry, three independent progress views. No hidden names or answers
// before discovery; event windows are half-open UTC millisecond ranges.
const obsolete=new Set(['library:core','library:guides','library:fullscreen']);
const special=new Set(['library:banner:left:strong','library:banner:inner:strong','library:banner:outer:strong','lounge:mafraer:broom-flight','lounge:mafraer:orb-rotate']);
export function classification(id){return obsolete.has(id)?'retired':special.has(id)?'hidden':'basic';}
export function classifiedEggs(eggs){return eggs.filter(e=>classification(e.id)!=='retired');}
const ratio=(n,total)=>({total,unlocked:n,percent:total?Math.floor(100*n/total):null});
function bucket(eggs,seen){
 const done=eggs.filter(x=>seen.has(x.id));
 return {...ratio(done.length,eggs.length),regions:[...new Set(eggs.map(x=>x.region))].map(region=>({region,...ratio(done.filter(x=>x.region===region).length,eggs.filter(x=>x.region===region).length)})),discoveries:done.map(x=>({id:x.id,title:x.title,region:x.region,discoveredAt:seen.get(x.id)}))};
}
/** Achievements are accepted only from authoritative server records, never a client event.
 * Each achievement may reference a hidden interaction to avoid double counting.
 * The caller must filter audience/permissions before invoking this pure function. */
export function buildProgress(eggs,seen,{events=[],eventSeen=new Map(),achievements=[],achievementSeen=new Map(),now=Date.now()}={}){
 const normal=classifiedEggs(eggs);
 const basic=normal.filter(x=>classification(x.id)==='basic'),hidden=normal.filter(x=>classification(x.id)==='hidden');
 const hiddenIds=new Set(hidden.map(x=>x.id));const extra=achievements.filter(x=>!hiddenIds.has(x.linkedEgg)).map(x=>({id:'achievement:'+x.id,title:x.title,region:'特殊成就'}));
 const allSeen=new Map(seen);for(const a of achievements){const at=achievementSeen.get(a.id);if(at!==undefined)allSeen.set(hiddenIds.has(a.linkedEgg)?a.linkedEgg:'achievement:'+a.id,at);}
 const basicView=bucket(basic,seen),hiddenView=bucket([...hidden,...extra],allSeen);
 const limited=events.filter(e=>now>=e.opensAt||e.publicBefore===true).map(e=>{
   const found=new Map();for(const x of e.items){const at=eventSeen.get(e.id+':'+x.id);if(at!==undefined&&at>=e.opensAt&&at<e.closesAt)found.set(x.id,at);}
   return {id:e.id,title:e.title,opensAt:e.opensAt,closesAt:e.closesAt,status:now<e.opensAt?'upcoming':now<e.closesAt?'active':'ended',...bucket(e.items,found)};
 });
 return {coverage:'registered-preview',...basicView,basic:basicView,hidden:hiddenView,limited,achievementCoverage:'awaiting-authoritative-registry'};
}
export const freeHintEggs=eggs=>classifiedEggs(eggs).filter(e=>classification(e.id)==='basic');
