const ID=/^[a-zA-Z0-9_-]{1,100}$/;
const kinds=new Set(['inspired-by','variant-of','supersedes','derived-from','related']);
const valid=x=>typeof x==='string'&&ID.test(x);
export function buildGraph(versions,relations){
  if(!Array.isArray(versions)||versions.length>10000||!Array.isArray(relations)||relations.length>50000)throw new TypeError('Invalid graph');
  const nodes=new Map(),edges=[],keys=new Set(),parent=new Map(),revisions=new Set();
  for(const v of versions){if(!v||!valid(v.id)||!valid(v.work)||!Number.isSafeInteger(v.revision)||v.revision<1||typeof v.title!=='string'||v.title.length>200||nodes.has(v.id))throw new TypeError('Invalid version');const rev=v.work+':'+v.revision;if(revisions.has(rev))throw new TypeError('Duplicate work revision');revisions.add(rev);nodes.set(v.id,{id:v.id,work:v.work,revision:v.revision,title:v.title});}
  for(const r of relations){
    if(!r||!nodes.has(r.from)||!nodes.has(r.to)||r.from===r.to||!kinds.has(r.kind))throw new TypeError('Invalid relation');
    const key=[r.from,r.to,r.kind].join(':');if(keys.has(key))throw new TypeError('Duplicate relation');keys.add(key);
    if(r.kind==='supersedes'){const from=nodes.get(r.from),to=nodes.get(r.to);if(from.work!==to.work||from.revision<=to.revision||parent.has(r.from))throw new TypeError('Invalid version lineage');parent.set(r.from,r.to)}
    edges.push({from:r.from,to:r.to,kind:r.kind});
  }
  // Lineage/dependency relations must be acyclic, even across work IDs. Related/inspiration can be cyclic.
  const adj=new Map([...nodes.keys()].map(id=>[id,[]])),indegree=new Map([...nodes.keys()].map(id=>[id,0]));
  for(const e of edges)if(['supersedes','derived-from','variant-of'].includes(e.kind)){adj.get(e.from).push(e.to);indegree.set(e.to,indegree.get(e.to)+1)}
  const q=[...nodes.keys()].filter(id=>indegree.get(id)===0);for(let i=0;i<q.length;i++)for(const n of adj.get(q[i])){indegree.set(n,indegree.get(n)-1);if(indegree.get(n)===0)q.push(n)}if(q.length!==nodes.size)throw new TypeError('Dependency cycle');
  return {nodes,edges};
}
export function visibleGraph(graph,allowedIds){
  const nodes=[...graph.nodes.values()].filter(n=>allowedIds.has(n.id)),visible=new Set(nodes.map(n=>n.id));
  return {nodes,edges:graph.edges.filter(e=>visible.has(e.from)&&visible.has(e.to))};
}
export function versionTimeline(graph,work,allowedIds){
  const g=visibleGraph(graph,allowedIds);
  return g.nodes.filter(n=>n.work===work).sort((a,b)=>b.revision-a.revision||a.id.localeCompare(b.id));
}
