import {imageOf} from '../ladder/LadderRenderer.js';
import {blueBookV5} from './book-appearance.js';
import {drawSpread,drawLeaf,turnPoint} from './PageSurface.js';
import {createBookPath,clamp,smooth,mix as lerp} from './BookPath.js';
import {defaultBookSettings,cleanSettings,createBookSpeed} from './BookSpeed.js';
import {bookOrientation,bookDepth} from './BookPose.js';
const next={extract:'takeoff',takeoff:'loop',loop:'approach',approach:'hovering',hovering:'opening',opening:'flipping',flipping:'landing',landing:'open',closing:'returning',returning:'inserting',inserting:'idle'};
export class BookEffect{
 constructor(ctx,onState,appearance=blueBookV5,settings=defaultBookSettings){this.ctx=ctx;this.onState=onState;this.appearance=appearance;this.phase='idle';this.time=0;this.ready=false;this.pagesFinished=false;this.hasRead=false;this.paused=false;this.playbackRate=1;this.debugLoop=false;this.turns=16;this.configure(settings);}
 async load(){this.images=Object.fromEntries(await Promise.all(Object.entries(this.appearance.assets).map(async([k,u])=>[k,await imageOf(u)])));this.ready=true;}
 configure(settings){const fraction=this.progress?.()||0;this.settings=cleanSettings(settings);this.path=createBookPath(this.appearance,this.settings);this.speed=createBookSpeed(this.path,this.settings);this.time=fraction*(this.speed.times[this.phase]||0)*1000;}
 set(phase){this.phase=phase;this.time=0;this.onState?.(phase);}
 reset(){this.pagesFinished=false;this.hasRead=false;this.set('idle');}
 summon(reduced=false){if(this.phase!=='idle')return false;this.hasRead=false;this.pagesFinished=reduced;this.set(reduced?'open':'extract');return true;}
 turnPages(reduced=false){if(this.phase!=='hovering')return false;if(reduced)this.skip();else this.set('opening');return true;}
 skip(){if(['idle','open','reading'].includes(this.phase))return false;if(['closing','returning','inserting'].includes(this.phase))this.reset();else{this.pagesFinished=true;this.set('open');}return true;}
 enter(){if(this.phase!=='open')return false;this.hasRead=true;this.set('reading');return true;}
 exit(){if(this.phase!=='reading')return false;this.set('open');return true;}
 close(reduced=false){if(this.phase==='idle')return false;if(this.phase!=='open'&&this.phase!=='reading'){this.reset();return true;}this.set(reduced?'idle':'closing');return true;}
 active(){return !this.paused&&(this.phase in this.speed.times||this.debugLoop&&['idle','open'].includes(this.phase));}
 tick(dt,force=false){if(this.paused&&!force)return;if(!(this.phase in this.speed.times)&&!this.debugLoop)return;this.time+=dt*(force?1:this.playbackRate);let guard=0;while(guard++<20){const duration=(this.speed.times[this.phase]??(this.debugLoop&&['idle','open'].includes(this.phase)?.7:Infinity))*1000;if(this.time+1e-7<duration)break;const overflow=Math.max(0,this.time-duration);if(this.phase==='flipping')this.pagesFinished=true;const phase=this.phase==='open'?'closing':this.phase==='idle'?'extract':next[this.phase];if(!phase)break;if(phase==='extract'){this.pagesFinished=false;this.hasRead=false;}this.set(phase);this.time=overflow;}}
 progress(){return clamp(this.time/((this.speed?.times[this.phase]||1)*1000));}
 forwardTime(){let t=0;for(const k of this.speed.forward){if(k===this.phase)return t+this.time/1000;t+=this.speed.times[k];}return this.phase==='idle'?0:this.speed.total;}
 seek(seconds){let t=Math.max(0,Math.min(this.speed.total,seconds));this.pagesFinished=false;for(const phase of this.speed.forward){if(t<this.speed.times[phase]){this.set(phase);this.time=t*1000;this.pagesFinished=['landing'].includes(phase);return;}t-=this.speed.times[phase];}this.pagesFinished=true;this.set('open');}
 center(){const phase=this.phase,u=this.progress(),a=this.appearance;if(phase in this.path&&this.speed.laws[phase])return this.path[phase].at(this.speed.laws[phase](u));if(phase==='landing')return{x:a.hover.x,y:lerp(a.hover.y,a.stand.y,smooth(u))};if(['open','reading','closing'].includes(phase))return{x:a.stand.x,y:a.stand.y};return{x:a.hover.x,y:a.hover.y};}
 hit(p){const a=this.appearance;if(this.phase==='idle'){const h=a.shelf.hit;return p.x>=h.x1&&p.x<=h.x2&&p.y>=h.y1&&p.y<=h.y2;}if(this.phase==='reading')return false;const c=this.center(),w=['open','closing','landing','flipping','opening'].includes(this.phase)?a.stand.openWidth:a.hover.closedWidth;return Math.abs(p.x-c.x)<w*.6&&Math.abs(p.y-c.y)<48;}
 drawBack(){if(!this.ready)return;const c=this.ctx,a=this.appearance,i=this.images;if(this.phase!=='idle')c.drawImage(i.shelf,a.shelf.repairX,a.shelf.repairY);c.drawImage(i.stand,a.stand.repairX,a.stand.repairY);}
 sprite(img,x,y,w,h,tilt=0){const c=this.ctx;c.save();c.translate(x,y);c.rotate(tilt);c.drawImage(img,-w/2,-h/2,w,h);c.restore();}
 // Same painted book throughout: its left binding is the shared rotation axis.
 // At zero reveal the body is edge-on behind the original spine. The cover
 // swings out as the top/bottom binding endpoints move into their flight pose.
 closedPose(p,reveal=1,size=1,tilt=0){
  const c=this.ctx,a=this.appearance,h=a.hover,i=this.images,r=clamp(reveal);
  const from=a.closedPose.binding[0],to=a.closedPose.binding[1];
  const bx=(from.x+to.x)/2,by=(from.y+to.y)/2;
  const vx=(to.x-from.x)*h.closedWidth,vy=(to.y-from.y)*h.closedHeight;
  const length=lerp(a.shelf.spineHeight,Math.hypot(vx,vy),r)*size;
  const angle=lerp(-Math.PI/2,Math.atan2(vy,vx),smooth(r))+tilt;
  c.save();c.translate(p.x,p.y);c.rotate(angle);
  // Local y runs along the binding; local x is the face width.
  c.rotate(Math.PI/2);c.scale(lerp(.001,1,Math.sin(r*Math.PI/2))*size,length/Math.hypot(vx,vy));
  c.rotate(-Math.atan2(vy,vx)-Math.PI/2);
  c.drawImage(i.closed,-bx*h.closedWidth,-by*h.closedHeight,h.closedWidth,h.closedHeight);c.restore();
  if(r<.98){
   c.save();c.translate(p.x,p.y);c.rotate(angle+Math.PI/2);
   // The original spine stays visible on the left until the cover is revealed.
   c.drawImage(i.spine,-a.shelf.spineWidth*.5*(1-r),-length/2,a.shelf.spineWidth*(1-r),length);c.restore();
  }
 }
 closedCenter(p,reveal=1,size=1,tilt=0){const a=this.appearance,h=a.hover,b=a.closedPose.binding,mid={x:(b[0].x+b[1].x)/2,y:(b[0].y+b[1].y)/2};this.closedPose({x:p.x+(mid.x-.5)*h.closedWidth*size*smooth(reveal),y:p.y+(mid.y-.5)*h.closedHeight*size*smooth(reveal)},reveal,size,tilt);}
 openAt(x,y,w,h,index=0){const c=this.ctx;c.save();c.translate(x,y);c.scale(w/166,h/70);drawSpread(c,this.images,index);c.restore();}
 drawOpening(u,p){
  const c=this.ctx,h=this.appearance.hover,w=p.openWidth,height=p.openHeight;
  if(u<.25){const v=smooth(u/.25);this.sprite(this.images.closed,p.x+v*w*.21,p.y,lerp(h.closedWidth,w*.46,v),lerp(h.closedHeight,height*.85,v));return;}
  const v=smooth((u-.25)/.75),extent=4+78*Math.max(0,-Math.cos(Math.PI*v));
  c.save();c.translate(p.x,p.y);c.scale(w/166,height/70);
  c.save();c.beginPath();c.rect(-extent,-70,166,140);c.clip();drawSpread(c,this.images,this.pagesFinished?this.turns:0);c.restore();
  drawLeaf(c,v<.5?this.images.cover:this.images.leftPage,(a,b)=>turnPoint(v,a,b));c.restore();
 }
 drawFront(){if(!this.ready||this.phase==='idle')return;const a=this.appearance,u=this.progress(),p=this.center(),h=a.hover,s=a.stand;
  if(['extract','takeoff','loop','approach','returning','inserting'].includes(this.phase)){const pose=bookOrientation(this.phase,u);this.closedCenter(p,pose.reveal,bookDepth(this.phase,u),pose.bank);return;}
  if(this.phase==='hovering'){this.sprite(this.images.closed,p.x,p.y,h.closedWidth,h.closedHeight);return;}
  if(this.phase==='opening'||this.phase==='closing'){this.drawOpening(this.phase==='opening'?smooth(u):1-smooth(u),this.phase==='opening'?h:s);return;}
  if(this.phase==='flipping'){this.drawPages(u);return;}
  if(this.phase==='landing'){const t=smooth(u);this.openAt(p.x,p.y,lerp(h.openWidth,s.openWidth,t),lerp(h.openHeight,s.openHeight,t),this.turns);return;}
  if(this.phase==='open'||this.phase==='reading')this.openAt(s.x,s.y,s.openWidth,s.openHeight,this.turns);
 }
 drawPages(t){const c=this.ctx,a=this.appearance,n=this.turns,cycle=Math.min(n-.000001,t*n),index=Math.floor(cycle),unit=cycle%1;c.save();c.translate(a.hover.x,a.hover.y);c.scale(a.hover.openWidth/166,a.hover.openHeight/70);drawSpread(c,this.images,index+1,index);for(const delay of [.32,.16,0]){const u=clamp((unit-delay)/.68);if(u>0&&u<1)drawLeaf(c,u<.5?this.images.rightPage:this.images.leftPage,(x,y)=>turnPoint(u,x,y),u<.5?index:index+1);}c.restore();}
}
