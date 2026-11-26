import {clamp01,smoothStep} from './projection.js';
export class RailMotion{
 constructor({position=0,onFrame=()=>{},onSettle=()=>{},reducedMotion=false,clock=()=>performance.now(),requestFrame=f=>requestAnimationFrame(f),cancelFrame=id=>cancelAnimationFrame(id)}={}){
  this.position=clamp01(position);this.target=this.position;this.onFrame=onFrame;this.onSettle=onSettle;this.reducedMotion=reducedMotion;this.clock=clock;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.frame=null;this.running=false;
 }
 sample(now){if(!this.running)return this.position;const progress=Math.min(1,(now-this.started)/this.duration);this.position=this.from+(this.target-this.from)*smoothStep(progress);return this.position;}
 go(target){if(this.disposed)return;const now=this.clock();this.sample(now);this.stopFrame();this.from=this.position;this.target=clamp01(target);
  if(this.reducedMotion||Math.abs(this.target-this.position)<.0001){this.position=this.target;this.running=false;this.onFrame(this.position);this.onSettle(this.position);return;}
  this.started=now;this.duration=500+Math.abs(this.target-this.from)*1100;this.running=true;this.tick(now);
 }
 tick(now){this.frame=null;this.sample(now);this.onFrame(this.position);if(now-this.started>=this.duration){this.position=this.target;this.running=false;this.onFrame(this.position);this.onSettle(this.position);}else this.frame=this.requestFrame(t=>this.tick(t));}
 stopFrame(){if(this.frame!==null)this.cancelFrame(this.frame);this.frame=null;}
 setReducedMotion(value){this.reducedMotion=value;if(value&&this.running)this.finish();}
 finish(){if(this.disposed)return;this.stopFrame();this.position=this.target;this.running=false;this.onFrame(this.position);this.onSettle(this.position);}
 dispose(){this.stopFrame();this.running=false;this.disposed=true;}
}

