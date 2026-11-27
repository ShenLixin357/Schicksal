import {crestCenter,loadSceneHost,sceneSize} from './scene-host.js';
import {loadDocuments,searchDocuments,bindingForBook} from './documents.js';
import {template} from './template.js';
import {AnimationProfiles} from './documents.js';
import {commonFields,aFields,teleportFields,archiveFields,returnBufferField,routeBook} from '../book/multi/routes.js';
import {createSelection} from './selection.js';
import {createSceneFullscreen} from './fullscreen.js';

export function mountLibrary(host,{debug=false,onError=()=>{},onReady=()=>{}}={}){
const root=host.shadowRoot??host.attachShadow({mode:'open'});
root.innerHTML=template;
const abort=new AbortController();let disposed=false,frame=0,ready=false,failed=false;
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';
const styleReady=new Promise((resolve,reject)=>{stylesheet.addEventListener('load',resolve,{once:true,signal:abort.signal});stylesheet.addEventListener('error',()=>reject(Error('图书馆样式无法加载')),{once:true,signal:abort.signal});});
stylesheet.href=new URL('./catalog.css',import.meta.url).href;root.prepend(stylesheet);
const on=(target,name,fn,opts={})=>target.addEventListener(name,fn,{...opts,signal:abort.signal});
const byId=id=>root.getElementById(id);
const room=byId('room'), crest=byId('crest'), shelfButtons=new Map();
const fullscreen=createSceneFullscreen(room.closest('.scene'),root,document,{isDisposed:()=>disposed});
const settingsToggle=byId('settings-toggle'),settings=byId('room-controls'),skip=byId('skip'),status=byId('scene-status');
const closeSettings=()=>{settings.hidden=true;settingsToggle.setAttribute('aria-expanded','false');};
const summon=byId('summon'), query=byId('query'), results=byId('results');
const reader=byId('reader'), pages=byId('reading-pages'), content=byId('reading-content');
const coverView=byId('cover-view'), cover=byId('cover'), resume=byId('resume-button');
const coverButton=byId('cover-button'), contentsButton=byId('contents-button');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const catalogTarget={kind:'contents'};
let stage, catalog, documents, trip, target=catalogTarget, origin=crest;
let mode='loading', animation, clock=0, hover=null, lastFrame=null,lastPaint=0;
let savedScroll=0, turning=null, drag=null, yaw=.18, pitch=-.17;
let debugTick=()=>{},sceneTick=()=>{},cancelScenePress=()=>{},selectDebugBook=()=>{},pauseDebug=()=>{},viewCompare=false;const timers=new Set();
const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
const clearLater=id=>{clearTimeout(id);timers.delete(id);};

function element(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

function bindSelectionClick(button,callback){
  let pointerType='';
  button.addEventListener('pointerdown',event=>{pointerType=event.pointerType;});
  button.addEventListener('pointercancel',()=>{pointerType='';});
  button.addEventListener('click',event=>{const type=event.pointerType||pointerType;pointerType='';callback({detail:event.detail,pointerType:type});});
}

function positionHotspot(button,x,y,w,h){
  button.style.left=100*x/sceneSize.width+'%';
  button.style.top=100*y/sceneSize.height+'%';
  button.style.width=100*w/sceneSize.width+'%';
  button.style.height=100*h/sceneSize.height+'%';
}

function setMode(next){
  mode=next;
  if(next!=='idle'&&viewCompare){viewCompare=false;stage?.setView({compare:false});root.querySelector('[data-compare]')?.setAttribute('aria-pressed','false');}
  for(const button of root.querySelectorAll('#room-controls button,#room-controls input'))button.disabled=next!=='idle';
  const available=next==='idle';
  if(!available)cancelScenePress();
  for(const button of shelfButtons.values())button.disabled=!available&&next!=='debug';
  crest.disabled=!available;settingsToggle.disabled=!available;if(!available)closeSettings();
  skip.hidden=next!=='summoning';
  const message={summoning:'正在召唤书籍…',returning:'书本正在归位…'}[next];
  status.textContent=message??'';
  status.hidden=!message;
  if(!available)hover=null;
  room.dataset.mode=next;
}

function moveThrough(from,to,ended){
  clock=from;
  animation={from,to,ended};lastFrame=null;schedule();
}

function animate(now){
  frame=0;if(disposed||failed||!ready||document.hidden)return;
  const dt=lastFrame===null?0:Math.min(100,now-lastFrame)/1000;lastFrame=now;
  if(animation){
    const {to,ended}=animation;
    clock=Math.min(to,clock+dt*(animation.rate??1));
    if(clock>=to){
      animation=null;
      ended();
    }
  }
  if(now-lastPaint>=32||reduced.matches){stage.render(now,clock,hover);debugTick();sceneTick();lastPaint=now;}
  if((!reduced.matches||animation)&&!frame)frame=requestAnimationFrame(animate);
}

function renderResults(){
  const found=searchDocuments(documents,query.value);
  byId('result-title').textContent=query.value.trim()?'搜索结果':'馆藏';
  byId('result-count').textContent=`${found.length} 项`;
  results.replaceChildren();
  if(!found.length){
    results.append(element('p','没有匹配的书籍或段落。','empty'));
    return;
  }
  const visible=found.slice(0,36);
  for(const match of visible){
    const row=element('div',undefined,'result');
    const choose=element('button',undefined,'result-main');
    choose.type='button';choose.dataset.bookId=match.bookId;choose.dataset.kind=match.kind;if(match.blockId)choose.dataset.blockId=match.blockId;
    choose.append(element('strong',match.title));
    choose.append(element('span',match.chapterTitle??(match.bookId==='AVS'?'7 篇课稿 · 打开目录':'内容占位符 · 打开目录')));
    if(match.snippet)choose.append(element('p',match.snippet));
    bindSelectionClick(choose,event=>selection.click(match,event.detail,event.pointerType));
    const direct=element('button','直接阅读','direct');
    direct.type='button';
    direct.setAttribute('aria-label',`直接阅读${match.chapterTitle??match.title}`);
    direct.addEventListener('click',()=>selection.direct(match));
    row.append(choose,direct);
    results.append(row);
  }
  if(found.length>visible.length)results.append(element('p','可输入更具体的关键词来缩小范围。','empty'));
}

async function showCatalog(event){
  if(mode!=='idle'||viewCompare||summon.open)return;selection.cancel();
  origin=event.currentTarget;closeSettings();
  query.value='';
  renderResults();
  if(fullscreen.active()){setMode('opening-catalog');await fullscreen.close();if(disposed)return;setMode('idle');}
  if(disposed||mode!=='idle'||summon.open)return;
  summon.showModal();
  query.focus();
}

const selection=createSelection((destination,direct)=>{
  if(mode!=='idle'||viewCompare)return;
  target=destination;catalog=documents.find(d=>d.id===destination.bookId);if(!catalog)return;trip=stage.setBook(bindingForBook(catalog.id));
  byId('book-title').textContent=catalog.title;byId('collection-name').textContent=catalog.id==='AVS'?'国家档案馆':'天命图书馆 · 内容占位符';
  if(summon.open)summon.close();
  if(direct||reduced.matches){showReader();return;}
  setMode('summoning');
  skip.focus();
  moveThrough(0,trip.settled,showReader);
});

function showContents(){
  const toc=element('ol',undefined,'toc');
  for(const chapter of catalog.chapters){
    const item=element('li');
    const button=element('button',chapter.title);
    button.type='button';
    button.addEventListener('click',()=>showPassage(chapter.id));
    item.append(button);
    toc.append(item);
  }
  content.replaceChildren(element('h2','全书目录'),toc);
  pages.scrollTop=0;
  pages.focus({preventScroll:true});
}

function showPassage(chapterId,blockId){
  const chapter=catalog.chapters.find(item=>item.id===chapterId);
  if(!chapter){showContents();return;}
  const fragment=document.createDocumentFragment();
  fragment.append(element('h2',chapter.title));
  let match;
  for(const block of chapter.blocks){
    const node=element('div',undefined,block.id===blockId?'search-hit':'');
    node.id=block.id;
    // These are sanitized HTML blocks generated from the authored lesson files.
    const safe=document.createElement('template');safe.innerHTML=block.html;
    const allowed=new Set(['P','H1','H2','H3','H4','H5','H6','STRONG','EM','BR','HR','BLOCKQUOTE','LI','UL','OL','CODE','PRE','TABLE','THEAD','TBODY','TR','TH','TD']);
    for(const tag of [...safe.content.querySelectorAll('*')]){if(!allowed.has(tag.tagName)){tag.replaceWith(document.createTextNode(tag.textContent??''));continue;}for(const a of [...tag.attributes])tag.removeAttribute(a.name);}
    node.append(safe.content);
    fragment.append(node);
    if(block.id===blockId)match=node;
  }
  content.replaceChildren(fragment);
  pages.scrollTop=match?match.getBoundingClientRect().top-pages.getBoundingClientRect().top+pages.scrollTop-24:0;
  pages.focus({preventScroll:true});
}

async function showReader(){
  if(disposed||mode==='opening-reader'||mode==='reading')return;
  animation=null;
  clock=trip.settled;
  setMode('opening-reader');
  coverView.hidden=true;
  pages.hidden=false;
  resume.hidden=true;
  coverButton.hidden=false;
  contentsButton.hidden=false;
  if(fullscreen.active())await fullscreen.close();
  if(disposed||mode!=='opening-reader')return;
  setMode('reading');
  if(!reader.open)reader.showModal();stage.render(performance.now(),clock,null);
  if(target.kind==='passage')showPassage(target.chapterId,target.blockId);
  else showContents();
}

function putBookBack(){
  if(!reader.open)return;
  turning?.cancel();
  reader.close();
  setMode('returning');
  const finish=()=>{
    clock=0;stage.reset();
    setMode('idle');
    stage.render(performance.now(),0,null);
    if(origin.isConnected)origin.focus({preventScroll:true});
  };
  if(reduced.matches){finish();stage.render(performance.now(),0,null);}
  else moveThrough(trip.closes,trip.finish,finish);
}

function showCover(){
  if(turning||pages.hidden)return;
  savedScroll=pages.scrollTop;
  const finish=()=>{
    turning=null;
    if(!reader.open)return;
    pages.hidden=true;
    coverView.hidden=false;
    coverButton.hidden=true;
    contentsButton.hidden=true;
    resume.hidden=false;
    yaw=.18;pitch=-.17;
    stage.drawCover(cover,yaw,pitch);
    cover.focus();
  };
  if(reduced.matches){finish();return;}
  turning=pages.animate([
    {transform:'perspective(950px) rotateY(0deg) scaleX(1)',opacity:1},
    {transform:'perspective(950px) rotateY(-74deg) scaleX(.56)',opacity:.14}
  ],{duration:350,easing:'ease-in'});
  turning.onfinish=finish;
  turning.oncancel=()=>{turning=null;};
}

function resumeReading(){
  coverView.hidden=true;
  pages.hidden=false;
  resume.hidden=true;
  coverButton.hidden=false;
  contentsButton.hidden=false;
  pages.scrollTop=savedScroll;
  pages.focus({preventScroll:true});
  if(!reduced.matches)pages.animate([{opacity:.25, transform:'perspective(950px) rotateY(20deg)'},{opacity:1,transform:'none'}],230);
}

function rotate(dx,dy){
  yaw=(yaw+dx)%(2*Math.PI);
  pitch=Math.max(-1.26,Math.min(1.26,pitch+dy));
  stage.drawCover(cover,yaw,pitch);
}

crest.addEventListener('click',showCatalog);
byId('close-catalog').addEventListener('click',()=>summon.close());
summon.addEventListener('close',()=>selection.cancel());
query.addEventListener('input',event=>{
  selection.cancel();
  if(!event.isComposing)renderResults();
});
query.addEventListener('compositionend',renderResults);
skip.addEventListener('click',showReader);
contentsButton.addEventListener('click',showContents);
coverButton.addEventListener('click',showCover);
resume.addEventListener('click',resumeReading);
for(const id of ['close-reader','return-button'])byId(id).addEventListener('click',putBookBack);
reader.addEventListener('cancel',event=>{event.preventDefault();putBookBack();});
cover.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  cover.setPointerCapture(event.pointerId);
});
cover.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  rotate((event.clientX-drag.x)*.016,(event.clientY-drag.y)*.013);
  drag.x=event.clientX;
  drag.y=event.clientY;
});
cover.addEventListener('lostpointercapture',()=>{drag=null;});
cover.addEventListener('keydown',event=>{
  const directions={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,-.14],ArrowDown:[0,.14]};
  if(!directions[event.key])return;
  event.preventDefault();
  rotate(...directions[event.key]);
});

function bindDebug(){
 const panel=element('details',undefined,'library-debug'),title=element('summary','科技部 · 动画即时预览（不发布）');panel.append(title);
 const selector=element('select'),inputs=element('div'),bar=element('div'),out=element('textarea'),timeline=element('div'),scrub=element('input'),timeLabel=element('output'),chapters=element('div');
 selector.setAttribute('aria-label','调试书籍');out.rows=4;out.setAttribute('aria-label','调试配置 JSON');scrub.type='range';scrub.min=0;scrub.step=.001;scrub.max=1;scrub.value=0;scrub.setAttribute('aria-label','调试时间轴');timeline.append(scrub,timeLabel,chapters);
 let drafts=Object.create(null),current='L1',debugTrip=null,debugPlaying=false,rate=1,loop=false,showGuides=true,locked=false,angle=0;
 const phase=element('output'),routeLabel=element('output'),legend=element('p','去程 · 回程 · 下降');legend.className='debug-legend';timeline.append(phase,routeLabel,legend);
 for(const id of Object.keys(AnimationProfiles)){const option=element('option',`${id} · ${routeBook[id].route??''} ${routeBook[id].title}`);option.value=id;selector.append(option);}selector.value=current;panel.append(selector,inputs,bar,timeline,out);root.querySelector('.scene-wrap').append(panel);
 const fieldsFor=id=>id==='A'?aFields:routeBook[id].kind==='archive'?archiveFields:routeBook[id].kind==='teleport'?teleportFields:id==='R1'?[...commonFields,returnBufferField]:commonFields;
 const values=()=>drafts[current]??={...AnimationProfiles[current].parameters};
 const available=()=>mode==='idle'||mode==='debug';
 function repaint(){stage.render(performance.now(),clock,null);debugTick();}
 function prepare(at=0){if(!available())return false;animation=null;debugPlaying=false;selection.cancel();stage.reset();debugTrip=stage.setBook(bindingForBook(current),values());clock=Math.max(0,Math.min(at,debugTrip.finish));setMode('debug');stage.setView({debugGuides:showGuides,lockedCore:locked?angle/360*120000:null});scrub.max=debugTrip.finish;chapters.replaceChildren();for(const [label,time] of debugTrip.chapters){const b=element('button',label);b.type='button';b.addEventListener('click',()=>seek(time));chapters.append(b);}repaint();return true;}
 function stop(){if(mode!=='debug')return;flagToken++;flagInput.value='';stage.replaceEmblem(null);animation=null;debugPlaying=false;debugTrip=null;stage.reset();stage.setView({debugGuides:false,lockedCore:null});clock=0;setMode('idle');repaint();}
 function seek(time){if(!available())return;if(!debugTrip&&!prepare())return;animation=null;debugPlaying=false;clock=Math.max(0,Math.min(debugTrip.finish,time));repaint();}
 function play(){if(!available())return;if(!debugTrip&&!prepare())return;if(reduced.matches){seek(debugTrip.settled);return;}if(clock>=debugTrip.finish)clock=0;debugPlaying=true;moveThrough(clock,debugTrip.finish,()=>{debugPlaying=false;if(loop&&mode==='debug'){clock=0;play();}});animation.rate=rate;}
 function preview(){if(prepare())play();}
 function fieldsUI(){inputs.replaceChildren();for(const [key,label,min,max,step,unit] of fieldsFor(current)){const row=element('label',label+' '),slider=element('input'),display=element('output',String(values()[key])+unit);slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=values()[key];row.append(slider,display);slider.addEventListener('input',()=>{values()[key]=+slider.value;display.value=slider.value+unit;prepare(clock);});inputs.append(row);}}
 function button(label,fn){const b=element('button',label);b.type='button';on(b,'click',fn);bar.append(b);return b;}
 function toggle(label,fn){const b=button(label,()=>{const next=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(next));fn(next);});b.setAttribute('aria-pressed','false');return b;}
 on(selector,'change',()=>{current=selector.value;fieldsUI();if(mode==='debug')prepare();});on(scrub,'input',()=>seek(+scrub.value));
 button('播放 / 继续',play);button('暂停',()=>{if(mode==='debug'){animation=null;debugPlaying=false;repaint();}});button('重新播放',preview);button('前进一帧 +1/60 s',()=>seek(clock+1/60));button('复位至 0',()=>seek(0));button('停止并归位',stop);
 toggle('循环',v=>{loop=v;});const guideButton=toggle('轨迹与时间标记',v=>{showGuides=v;legend.hidden=!v;if(mode==='debug'){stage.setView({debugGuides:v});repaint();}});guideButton.setAttribute('aria-pressed','true');toggle('固定徽记角度',v=>{locked=v;angleInput.disabled=!v;if(v)angle=stage.coreDegrees();if(mode==='debug'){stage.setView({lockedCore:v?angle/360*120000:null});repaint();}});
 const angleInput=element('input');angleInput.type='range';angleInput.min=0;angleInput.max=359;angleInput.step=1;angleInput.value=0;angleInput.disabled=true;angleInput.setAttribute('aria-label','徽记角度');on(angleInput,'input',()=>{angle=+angleInput.value;if(mode==='debug'&&locked){stage.setView({lockedCore:angle/360*120000});repaint();}});bar.append(angleInput);const degrees=element('output','0°');bar.append(degrees);
 const rateSelect=element('select');rateSelect.setAttribute('aria-label','调试播放倍率');for(const r of [.25,.5,1,1.5,2]){const option=element('option',r+'×');option.value=r;rateSelect.append(option);}rateSelect.value=1;on(rateSelect,'change',()=>{rate=+rateSelect.value;if(mode==='debug'&&animation)animation.rate=rate;});bar.append(rateSelect);
 button('恢复最终定稿',()=>{delete drafts[current];fieldsUI();prepare();});button('导出草稿 JSON',()=>{out.value=JSON.stringify({revision:'handoff-2026-11-27',drafts},null,2);});button('导入草稿 JSON',()=>{try{const obj=JSON.parse(out.value);if(obj.revision!=='handoff-2026-11-27'||!obj.drafts||typeof obj.drafts!=='object'||Array.isArray(obj.drafts))throw Error();const next=Object.create(null);for(const [id,v] of Object.entries(obj.drafts)){if(!Object.hasOwn(AnimationProfiles,id)||!v||typeof v!=='object'||Array.isArray(v))throw Error();const valid=fieldsFor(id);const clean={...AnimationProfiles[id].parameters};if(Object.keys(v).some(k=>!valid.some(f=>f[0]===k)))throw Error();for(const [k,,min,max] of valid)if(Object.hasOwn(v,k)){if(!Number.isFinite(v[k])||v[k]<min||v[k]>max)throw Error();clean[k]=v[k];}next[id]=clean;}drafts=next;fieldsUI();preview();}catch{out.value='配置不合法，未导入。';}});
 debugTick=()=>{routeLabel.value=`${current} · ${routeBook[current].route??''} ${routeBook[current].title}`;degrees.value=stage.coreDegrees()+'°';if(!locked)angleInput.value=stage.coreDegrees();if(mode==='debug'&&debugTrip){phase.value=stage.phase();scrub.value=clock;timeLabel.value=`${clock.toFixed(2)} / ${debugTrip.finish.toFixed(2)} s · ${debugPlaying?'播放':'暂停'}`;}else{scrub.value=0;phase.value='原书位';timeLabel.value='尚未开始调试';}};
 selectDebugBook=id=>{if(mode!=='debug')return;current=id;selector.value=id;fieldsUI();preview();};pauseDebug=()=>{if(mode==='debug'){animation=null;debugPlaying=false;}};
 // Local-only flag art preview. No upload endpoint or persistence.
 const flagInput=element('input');flagInput.type='file';flagInput.accept='image/png,image/webp';flagInput.setAttribute('aria-label','试换旗帜标志');const flagStatus=element('output');let flagToken=0;button('恢复原旗帜标志',()=>{flagToken++;flagInput.value='';stage.replaceEmblem(null);repaint();});
 on(flagInput,'change',async()=>{const file=flagInput.files?.[0];if(!file)return;if(!['image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){flagStatus.value='请选择 8 MB 内的 PNG 或 WebP。';return;}const token=++flagToken;const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(disposed||token!==flagToken)return;if(image.naturalWidth*image.naturalHeight>16000000)throw Error('image too large');if(!prepare(clock))return;stage.replaceEmblem(image);flagStatus.value='仅本地预览，未发布';repaint();}catch{flagStatus.value='图片未能载入或尺寸过大。';}finally{URL.revokeObjectURL(url);}});panel.append(flagInput,flagStatus);
 on(panel,'toggle',()=>{if(!panel.open){flagToken++;flagInput.value='';stage.replaceEmblem(null);}});
 on(panel,'toggle',()=>{if(!panel.open)stop();});fieldsUI();debugTick();
}

function bindSceneControls(){
 const container=byId('room-controls');
 const repaint=()=>stage.render(performance.now(),clock,hover);
 const addButton=(label,fn)=>{const b=element('button',label);b.type='button';on(b,'click',fn);container.append(b);return b;};
 const toggled=(label,initial,fn)=>{const b=addButton(label,()=>{const state=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(state));fn(state);repaint();});b.setAttribute('aria-pressed',String(initial));return b;};
 const heading=element('p','灯光调节','settings-heading');container.append(heading);
 for(const [key,label] of [['candle','烛火'],['window','花窗'],['dome','穹顶']]){
   const b=addButton(label,()=>{stage.lights[key]=1-stage.lights[key];b.setAttribute('aria-pressed',String(!!stage.lights[key]));repaint();schedule();});
   b.setAttribute('aria-pressed','true');b.dataset.light=key;
 }
 toggled('原画',false,compare=>{viewCompare=compare;stage.setView({compare});selection.cancel();}).dataset.compare='true';
 on(settingsToggle,'click',()=>{if(mode!=='idle')return;settings.hidden=!settings.hidden;settingsToggle.setAttribute('aria-expanded',String(!settings.hidden));});
 on(root,'pointerdown',e=>{if(!settings.hidden&&!e.composedPath().includes(settings)&&!e.composedPath().includes(settingsToggle))closeSettings();});
 on(document,'keydown',e=>{if(e.key==='Escape'&&!settings.hidden){closeSettings();settingsToggle.focus();}});
 let press=null,handled=false;
 const cancelPress=()=>{if(press){const {id,timer}=press;press=null;clearLater(timer);if(room.hasPointerCapture?.(id))room.releasePointerCapture(id);}};cancelScenePress=cancelPress;
 on(room,'pointerdown',e=>{if(mode!=='idle'||viewCompare||e.button!==0)return;const hit=stage.hit(e);if(!hit?.banner)return;handled=false;const p={id:e.pointerId,x:e.clientX,y:e.clientY,banner:hit.banner,strong:false};p.timer=later(()=>{if(press===p){p.strong=true;stage.wind(p.banner,'strong');}},420);press=p;room.setPointerCapture?.(e.pointerId);});
 on(room,'pointermove',e=>{if(press?.id===e.pointerId&&!press.strong&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>16)cancelPress();});
 on(room,'pointerup',e=>{if(press?.id!==e.pointerId)return;const p=press;cancelPress();handled=true;later(()=>{handled=false;},500);if(!p.strong)stage.wind(p.banner,'gentle');});
 on(room,'pointercancel',cancelPress);on(room,'lostpointercapture',cancelPress);
 on(room,'click',e=>{if(handled){handled=false;return;}if(mode!=='idle'||viewCompare)return;const hit=stage.hit(e);if(hit?.banner)stage.wind(hit.banner,'gentle');else if(hit?.side){if(hit.ladder)stage.activateLadder(hit.side);else stage.move(hit.side,hit.t);repaint();}});

}
function schedule(){if(!frame&&!disposed&&!failed&&!document.hidden){lastFrame=null;frame=requestAnimationFrame(animate);}}
on(document,'visibilitychange',()=>{if(document.hidden){selection.cancel();cancelScenePress();pauseDebug();cancelAnimationFrame(frame);frame=0;lastFrame=null;stage?.suspend();}else if(stage&&ready&&!failed){stage.render(performance.now(),clock,hover);schedule();}});
on(reduced,'change',()=>{stage?.reducedChanged();if(reduced.matches&&animation){const end=animation.ended;animation=null;end();}if(stage&&ready&&!failed){stage.render(performance.now(),clock,hover);schedule();}});
function failLoading(error){if(disposed||failed)return;failed=true;abort.abort();stage?.dispose();clearLater(loadTimeout);onError(error);}
const loadTimeout=later(()=>{if(!ready)failLoading(Error('图书馆加载超时'));},60000);
(async()=>{try{
 [stage,documents]=await Promise.all([loadSceneHost(room,{signal:abort.signal,reduced:()=>reduced.matches}).then(value=>{if(disposed||failed||abort.signal.aborted){value.dispose();throw new DOMException('Aborted','AbortError');}stage=value;return value;}),loadDocuments(abort.signal),styleReady]);
 if(disposed||failed||abort.signal.aborted){stage.dispose();return;}
 for(const doc of documents){const slot=stage.slots.find(s=>s.id===bindingForBook(doc.id).slotId);const [left,top,right,bottom]=slot.box;const button=element('button',undefined,'hotspot shelf');button.type='button';button.dataset.book=doc.id;button.setAttribute('aria-label','召唤 '+doc.title);positionHotspot(button,(left+right)/2,(top+bottom)/2,right-left+16,bottom-top+12);shelfButtons.set(doc.id,button);byId('shelf-hotspots').append(button);const destination={kind:'contents',bookId:doc.id};bindSelectionClick(button,event=>{if(mode==='debug'){selectDebugBook(doc.id);return;}origin=button;selection.click(destination,event.detail,event.pointerType);});for(const event of ['pointerenter','focus'])on(button,event,()=>{if(mode==='idle'){hover=doc.id;stage.render(performance.now(),clock,hover);}});for(const event of ['pointerleave','blur'])on(button,event,()=>{if(hover===doc.id){hover=null;stage.render(performance.now(),clock,null);}});}
 positionHotspot(crest,crestCenter.x,crestCenter.y,178,178);bindSceneControls();if(debug)bindDebug();stage.render(performance.now(),0,null);setMode('idle');ready=true;clearLater(loadTimeout);onReady();schedule();
 }catch(error){failLoading(error);}})();
 return ()=>{if(disposed)return;disposed=true;cancelScenePress();abort.abort();void fullscreen.close();for(const id of timers)clearTimeout(id);timers.clear();selection.cancel();cancelAnimationFrame(frame);animation=null;turning?.cancel();for(const node of [pages,cover])for(const a of node.getAnimations?.()??[])a.cancel();if(reader.open)reader.close();if(summon.open)summon.close();stage?.dispose();room.width=0;room.height=0;cover.width=0;cover.height=0;root.replaceChildren();};
}
