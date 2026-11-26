import {poseAt,projectPoint,inversePoint,homePosition,positionForRailPoint} from './projection.js';
export const imageOf=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('无法载入素材'));image.src=new URL(src,new URL("../../",import.meta.url)).href;});
export class LadderRenderer{
 constructor(canvas,config){this.canvas=canvas;this.c=config;canvas.width=config.width;canvas.height=config.height;this.ctx=canvas.getContext('2d');this.ready=false;}
 async load(){
  const entries=await Promise.all(Object.entries(this.c.assets).map(async([key,src])=>[key,await imageOf(src)]));this.images=Object.fromEntries(entries);
  const c=document.createElement('canvas');c.width=this.c.sprite.sourceWidth;c.height=this.c.sprite.sourceHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.images.body,0,0);this.hitData=ctx.getImageData(0,0,c.width,c.height).data;this.ready=true;
 }
 draw(position,{compare=false,guides=false}={}){
  if(!this.ready)return;const ctx=this.ctx,c=this.c,s=c.sprite,img=this.images;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img.original,0,0);
  if(compare)return;
  ctx.drawImage(img.repair,c.crop.x,c.crop.y,c.crop.width,c.crop.height);
  this.drawObject(position);
  ctx.drawImage(img.foreground,0,0);
  if(guides)this.drawGuides(position);
 }
 drawObject(position){
  if(!this.ready)return;const ctx=this.ctx,c=this.c,s=c.sprite,img=this.images;
  const pose=poseAt(position,c),home=poseAt(homePosition(c),c),foot=projectPoint(c.contact,pose),baseFoot=projectPoint(c.contact,home);
  for(const w of c.wheels){
   const p=projectPoint({x:s.x+w.cx*s.width/s.sourceWidth,y:s.y+(w.cy+(w.id==='nearWheel'?79:68))*s.height/s.sourceHeight},pose);
   ctx.save();ctx.translate(p.x,p.y+1);ctx.scale(19*pose.scale,4*pose.scale);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(40,25,49,.22)');g.addColorStop(1,'rgba(40,25,49,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.save();ctx.setTransform(pose.scale,0,0,pose.scale,pose.dx,pose.dy);ctx.translate(s.x,s.y);ctx.scale(s.width/s.sourceWidth,s.height/s.sourceHeight);ctx.drawImage(img.body,0,0);
  const travelled=Math.sign(position-homePosition(c))*Math.hypot(foot.x-baseFoot.x,foot.y-baseFoot.y);
  for(const w of c.wheels){const radius=(w.id==='nearWheel'?72:62)*s.width/s.sourceWidth*(1+pose.scale)/2;ctx.save();ctx.translate(w.cx,w.cy);ctx.scale(w.rx,w.ry);ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.clip();ctx.rotate(travelled/radius);ctx.drawImage(img[w.id],-1,-1,2,2);ctx.restore();}
  ctx.restore();
 }
 drawGuides(position){
  const ctx=this.ctx,c=this.c,a=projectPoint(c.rail.homeAnchor,poseAt(0,c)),b=projectPoint(c.rail.homeAnchor,poseAt(1,c));ctx.save();ctx.strokeStyle='rgba(255,235,167,.78)';ctx.lineWidth=1.5;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
  for(const t of [0,homePosition(c),1]){const p=projectPoint(c.rail.homeAnchor,poseAt(t,c));ctx.fillStyle=Math.abs(t-position)<.015?'#ffe0a0':'#332337';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
 }
 toScene(event){const r=this.canvas.getBoundingClientRect(),scale=Math.min(r.width/this.c.width,r.height/this.c.height);return {x:(event.clientX-r.left-(r.width-this.c.width*scale)/2)/scale,y:(event.clientY-r.top-(r.height-this.c.height*scale)/2)/scale};}
 hit(p,position){
  if(!this.ready)return false;const q=inversePoint(p,poseAt(position,this.c)),s=this.c.sprite,x=Math.floor((q.x-s.x)*s.sourceWidth/s.width),y=Math.floor((q.y-s.y)*s.sourceHeight/s.height);
  if(x<0||y<0||x>=s.sourceWidth||y>=s.sourceHeight)return false;
  // Small tolerance around thin rungs, preserving empty-space targeting.
  for(let dy=-10;dy<=10;dy+=5)for(let dx=-10;dx<=10;dx+=5){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<s.sourceWidth&&yy<s.sourceHeight&&this.hitData[(yy*s.sourceWidth+xx)*4+3]>100)return true;}
  return this.c.wheels.some(w=>((x-w.cx)/w.rx)**2+((y-w.cy)/w.ry)**2<1.5);
 }
 railTarget(p){const t=positionForRailPoint(p,this.c),q=projectPoint(this.c.rail.homeAnchor,poseAt(t,this.c));return Math.hypot(p.x-q.x,p.y-q.y)<32?t:null;}
}

