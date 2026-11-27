import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mount=read('public/library/library/catalog/mount.js');
const template=read('public/library/library/catalog/template.js');
const entrance=read('app/library/library-entrance.tsx');
const page=read('app/page.tsx');
const art=read('public/library/library/book/multi/book-art.js');
const scene=read('public/library/library/catalog/scene-host.js');
// Minimal controlled DOM and scene ports. Tests native boot/teardown ordering, not browser paint or visuals.
function fixture(){
 class Node {
  constructor(tag='div'){this.tagName=tag;this.events={};this.children=[];this.attributes={};this.style={};this.dataset={};this.hidden=false;this.open=false;}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  emit(name,event={}){for(const fn of this.events[name]??[])fn({...event,currentTarget:this});}
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);if(nodes[0]?.tagName==='link')this.link=nodes[0];}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  getAnimations(){return [];}
  closest(){return this;}
  focus(){}
  close(){this.open=false;}
  showModal(){this.open=true;}
 }
 const nodes=new Map(),root=new Node(),host=new Node(),doc=new Node(),media=new Node();media.matches=false;
 root.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 root.querySelectorAll=()=>root.getElementById('room-controls').children.filter(n=>n.tagName==='button');
 root.querySelector=()=>null;
 host.shadowRoot=root;doc.hidden=false;doc.createElement=tag=>new Node(tag);
 const order=[],timers=new Map();let nextTimer=0,disposed=0;
 function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
 const assets=deferred(),documents=deferred();
 const stage={slots:[],lights:{candle:1,window:1,dome:1},setView(){},render(){order.push('frame')},dispose(){disposed++},suspend(){},reducedChanged(){},hit(){return null}};
 const controller=class{signal={aborted:false};abort(){this.signal.aborted=true;}};
 const code=mount.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url','"https://example.invalid/library/library/catalog/mount.js"');
 const deps={document:doc,matchMedia:()=>media,performance:{now:()=>0},URL:class{href='https://example.invalid/catalog.css';},AbortController:controller,DOMException:class extends Error{},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},template:'',crestCenter:{x:837,y:507},sceneSize:{width:1671,height:941},createSelection:()=>({cancel(){},click(){},direct(){}}),createSceneFullscreen:()=>({active:()=>false,close:async()=>{}}),loadSceneHost:()=>assets.promise,loadDocuments:()=>documents.promise,bindingForBook:()=>null};
 const install=new Function(...Object.keys(deps),code+'\nreturn mountLibrary;')(...Object.values(deps));
 const dispose=install(host,{onReady:()=>order.push('ready'),onError:()=>order.push('error')});
 const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 return {assets,documents,stage,root,nodes,order,dispose,drain,timers,get disposed(){return disposed;}};
}
test('native readiness waits for stylesheet, documents and rendered first frame',async()=>{
 const f=fixture();f.assets.resolve(f.stage);f.documents.resolve([]);await f.drain();assert.deepEqual(f.order,[]);
 f.root.link.emit('load');await f.drain();assert.deepEqual(f.order,['frame','ready']);
 const labels=f.root.getElementById('room-controls').children.map(n=>n.textContent);
 assert.deepEqual(labels,['灯光调节','烛火','花窗','穹顶','原画']);
 assert.equal(f.root.getElementById('room').dataset.mode,'idle');
 f.dispose();
});
test('stylesheet first is insufficient while assets or documents are pending',async()=>{
 const f=fixture();f.root.link.emit('load');await f.drain();assert.deepEqual(f.order,[]);
 f.assets.resolve(f.stage);await f.drain();assert.deepEqual(f.order,[]);
 f.documents.resolve([]);await f.drain();assert.deepEqual(f.order,['frame','ready']);f.dispose();
});
test('style error never reveals scene; late scene disposed',async()=>{
 const f=fixture();f.root.link.emit('error');await f.drain();assert.deepEqual(f.order,['error']);
 f.assets.resolve(f.stage);f.documents.resolve([]);await f.drain();assert.deepEqual(f.order,['error']);assert.equal(f.disposed,1);f.dispose();
});
test('leave before ready suppresses callbacks and releases late scene',async()=>{
 const f=fixture();f.dispose();f.assets.resolve(f.stage);f.documents.resolve([]);f.root.link.emit('load');await f.drain();assert.deepEqual(f.order,[]);assert.equal(f.disposed,1);
});
test('boot timeout reports failure instead of revealing a blank screen',async()=>{
 const f=fixture();[...f.timers.values()][0]();await f.drain();assert.deepEqual(f.order,['error']);f.assets.resolve(f.stage);f.documents.resolve([]);f.root.link.emit('load');await f.drain();assert.deepEqual(f.order,['error']);f.dispose();
});
test('persistent loading, collapsed sidebar, no masthead/catalog shortcut, A origin and discoverable wind',()=>{
 assert.ok(entrance.includes('<Suspense fallback={null}>')&&entrance.includes('<EmblemCanvas mode="loading"/>')&&entrance.includes('data-ready={phase==="ready"}'));
 assert.ok(entrance.includes('collapsed:inLibrary?!expanded:globalCollapsed')&&page.includes('useLibrarySidebar(section==="library",sidebarCollapsed)'));
 assert.ok(page.split('\n').length<=650);
 assert.ok(!template.includes('masthead')&&!template.includes('open-catalog')&&!template.includes('scene-hint'));
 assert.ok(mount.includes("crest.addEventListener('click',showCatalog)")&&!mount.includes('openCatalog'));
 assert.ok(mount.includes("stage.wind(p.banner,'strong')")&&mount.includes("stage.wind(p.banner,'gentle')"));
 assert.ok(art.includes('origin:[shelf.repairX,shelf.repairY],highlightOrigin:[1618,432]'));
 assert.ok(scene.includes('ctx.drawImage(b.spine,...(b.highlightOrigin??b.origin))')&&scene.includes('ctx.drawImage(active.repair,...active.origin)'));
});
