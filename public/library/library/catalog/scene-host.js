import {SceneRenderer} from '../ladder/SceneRenderer.js';
import {ladderScene as left} from '../ladder/scene-config.js';
import {rightLadderScene as right} from '../ladder/right-config.js';
import {homePosition} from '../ladder/projection.js';
import {RailMotion} from '../ladder/RailMotion.js';
import {buildGuides,drawGuides} from './debug-guides.js';
import {coreEffect} from '../ladder/CoreEffect.js';
import {loadBooks} from '../book/multi/book-art.js';
import {createForegroundMask,createArmillaryMask} from '../book/multi/foreground-occluders-v1.js';
import {createShelfSlotMasks,createStandMasks,createDeskCandleMask,createWallSconceMask} from '../book/multi/room-fixtures-v1.js';
import {loadArchiveMarks,drawArchiveEffects} from '../book/multi/archive-flight.js';
import {drawTeleportFlashes} from '../book/multi/teleport.js';
import {drawBookPose} from '../book/multi/rigid-book.js';
import {multiTrack} from '../book/multi/track.js';
import {AnimationProfiles,makeShelfSlots} from './documents.js';
const canvas=()=>Object.assign(document.createElement('canvas'),{width:1671,height:941});
export const sceneSize={width:1671,height:941},crestCenter=coreEffect.center;
export async function loadSceneHost(room,{signal,reduced=()=>false}={}){
 const scene=new SceneRenderer(room);let books,archiveMarks;
 const releaseScene=()=>{if(scene.base){scene.base.width=0;scene.base.height=0;}scene.banners?.starts.clear();scene.ready=false;};
 const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
 try{checkAbort();await scene.load();checkAbort();[books,archiveMarks]=await Promise.all([loadBooks(scene.book),loadArchiveMarks()]);checkAbort();}
 catch(error){releaseScene();throw error;}
 const guideLayer=canvas();let guideTrack=null;
 const actor=canvas(),actorContext=actor.getContext('2d'),ctx=room.getContext('2d');
 const roomForeground=createForegroundMask(true),flightOccluders={L3:[roomForeground],R2:[createForegroundMask(false),createArmillaryMask()],R3:[roomForeground],R4:[createForegroundMask(true,{deskCandle:false}),createDeskCandleMask(),createWallSconceMask()]};
 const renderContext={scene,actorContext,flightOccluders,shelfOccluders:createShelfSlotMasks(),standMasks:createStandMasks()};
 let active=null,track=null,state={inShelf:true},disposed=false,elapsed=0;
 const config={left,right},motions=Object.fromEntries(Object.entries(config).map(([side,c])=>[side,new RailMotion({position:homePosition(c),reducedMotion:reduced()})]));
 const lights={candle:1,dome:1,window:1},lightLevel={...lights};let lastRender=null,coreElapsed=0,corePlaying=true,guides=false,compare=false,debugGuides=false,lockedCore=null;
 const nextStop={left:1,right:0};
 const move=(side,target)=>{const t=target==='home'?homePosition(config[side]):target;motions[side].go(t);nextStop[side]=t>.5?0:1;};
 const positions=()=>Object.fromEntries(Object.entries(motions).map(([side,m])=>[side,m.position]));
 const originalBack=scene.book.drawBack.bind(scene.book);scene.book.drawBack=()=>{originalBack();if(active&&!state.inShelf)scene.ctx.drawImage(active.repair,...active.origin);};scene.book.drawFront=()=>{};
 const setBook=(binding,settings)=>{if(!binding)throw Error('未绑定书籍');const slotKey=binding.slotId.replace(/^slot-/,'');const profile=AnimationProfiles[binding.profileId];if(!books[slotKey]||!profile)throw Error('未知书位或动画');
  // Current profiles include absolute-coordinate occlusion and path data. Do not apply a profile to another slot without compatibility validation.
  if(slotKey!==profile.id)throw Error('书位与该定稿轨迹不兼容');active=books[slotKey];track=multiTrack(active,{...profile.parameters,...settings},renderContext);state={inShelf:true};return track;};
 function render(now,time,highlight){if(disposed)return;const dt=lastRender===null?0:Math.min(100,Math.max(0,now-lastRender));lastRender=now;if(!reduced()){elapsed+=dt;if(corePlaying)coreElapsed+=dt;}for(const k of Object.keys(lights)){const d=lights[k]-lightLevel[k];lightLevel[k]+=reduced()?d:Math.sign(d)*Math.min(Math.abs(d),dt/1050);}
  state=track?track.sample(time):{inShelf:true};const crestTime=lockedCore===null?(reduced()?0:coreElapsed):lockedCore;scene.draw(positions(),{compare,guides,elapsed:crestTime,windElapsed:elapsed,lightLevel});if(compare)return;
  if(highlight&&state.inShelf){const b=books[highlight];if(b){ctx.save();ctx.globalCompositeOperation='screen';ctx.shadowColor='#ffe3a4';ctx.shadowBlur=14;ctx.globalAlpha=.92;ctx.drawImage(b.spine,...b.origin);ctx.restore();}}
  if(state.effectsBehindBook)drawArchiveEffects(ctx,state.effects,archiveMarks);
  if(state.pose&&track){actorContext.clearRect(0,0,room.width,room.height);track.draw(state,crestTime);ctx.drawImage(actor,0,0);}
  if(state.flash)drawTeleportFlashes(ctx,state.flash);if(state.effects&&!state.effectsBehindBook)drawArchiveEffects(ctx,state.effects,archiveMarks);
  if(debugGuides&&track){if(guideTrack!==track){buildGuides(guideLayer,track);guideTrack=track;}drawGuides(ctx,guideLayer,state);}
 }
 function drawCover(cover,yaw,pitch){if(!active)return;const c=cover.getContext('2d');c.clearRect(0,0,cover.width,cover.height);drawBookPose(c,active,{x:cover.width/2,y:cover.height/2,heading:yaw,pitch,lean:-.045,scale:cover.height*.67/active.height,exposed:active.length});}
 return {books,phase:()=>state.behindCrest&&state.pose&&Math.abs(state.pose.x-835)<125?`${state.phase} · 徽记后方`:state.phase??'原书位',coreDegrees:()=>((Math.floor((lockedCore===null?coreElapsed:lockedCore)/coreEffect.periodMs*360)%360)+360)%360,slots:makeShelfSlots(books),setBook,render,drawCover,lights,move,activateLadder:side=>move(side,nextStop[side]),position:side=>motions[side].position,home:side=>homePosition(config[side]),setView:options=>{if('corePlaying' in options)corePlaying=options.corePlaying;if('compare' in options)compare=options.compare;if('guides' in options)guides=options.guides;if('debugGuides' in options)debugGuides=options.debugGuides;if('lockedCore' in options)lockedCore=options.lockedCore;},replaceEmblem:image=>scene.banners.replaceEmblem(image),wind:(id,mode)=>{if(!reduced())scene.banners.wind(id,elapsed,mode);},hit:e=>scene.target(scene.toScene(e),positions()),reset:()=>{active=null;track=null;guideTrack=null;state={inShelf:true};},suspend:()=>{lastRender=null;for(const m of Object.values(motions))if(m.running)m.finish();},dispose:()=>{if(disposed)return;disposed=true;for(const m of Object.values(motions))m.dispose();actor.width=0;actor.height=0;guideLayer.width=0;guideLayer.height=0;releaseScene();active=null;track=null;guideTrack=null;},reducedChanged:()=>{for(const m of Object.values(motions))m.setReducedMotion(reduced());}};
}
