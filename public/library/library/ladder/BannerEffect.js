import {imageOf} from './LadderRenderer.js';
import {bannerEmblems} from './banner-emblems.js';
export const bannerConfigs=[
 {id:'left',name:'左侧旗帜',x:349,y:178,width:66,height:246,points:[[368,188],[373,190],[379,196],[385,200],[390,205],[392,207],[392,270],[391,347],[390,373],[391,380],[387,390],[382,402],[378,413],[375.5,420],[374,410],[371,400],[367,390],[364,382],[362,375],[362,370],[363,303],[365,229]],amplitude:42},
 {id:'inner',name:'右内旗帜',x:1264,y:175,width:63,height:250,points:[[1281,205],[1287,202.5],[1293,198.5],[1299,193.5],[1303,190],[1306,192],[1308,255],[1310,350],[1311,374],[1313,381],[1307,398],[1301,413],[1296,421],[1293,411],[1289,400],[1285,388],[1282,378],[1281,354]],amplitude:42},
 {id:'outer',name:'右外旗帜',x:1495,y:101,width:78,height:308,points:[[1509,135],[1513,133],[1519,132],[1525,127],[1531,122.5],[1537,116.5],[1542,120],[1549,121],[1552,180],[1554,240],[1556,300],[1558,340],[1559,351],[1554,368],[1544,392],[1536,408],[1531,398],[1524,385],[1517,371],[1512,357],[1509,343],[1508.5,328],[1508.5,230]],amplitude:64}
];
export const windDuration=11000;
export const swayDuration=2600;
const clamp=v=>Math.max(0,Math.min(1,v));
export function windEnvelope(time,duration=windDuration){return Math.sin(Math.PI*clamp(time/duration))**.75;}
export function waveAt(row,time,amplitude,mode='strong'){
 const e=windEnvelope(time,mode==='gentle'?swayDuration:windDuration);
 if(mode==='gentle')return amplitude*.16*e*row**1.4*Math.sin(time/340-row*3.3);
 return amplitude*e*row**1.3*(.88+.20*Math.sin(time/330-row*7)+.09*Math.sin(time/185-row*11));
}
export function clothPoint(c,x,y,time,mode='strong'){
 const pin=46,span=c.height-pin,v=clamp((y-pin)/span),u=x/c.width,e=windEnvelope(time,mode==='gentle'?swayDuration:windDuration);
 const direction=c.id==='left'?1:-1;
 if(mode==='gentle')return {x:c.x+x+direction*waveAt(v,time,c.amplitude,mode)+e*1.2*v*Math.sin(time/310-v*4+u*2),y:c.y+y-e*span*.025*v*v*(.7+.3*Math.sin(time/400))};
 return {x:c.x+x+direction*(waveAt(v,time,c.amplitude)+e*3*v*Math.sin(u*Math.PI*2+time/260-v*6)),y:c.y+y-span*.59*e*v*v*(.8+.2*Math.sin(time/620))+e*1.5*v*v*Math.sin(time/270-v*5+u*3)};
}
function triangle(ctx,img,s,d){const [a,b,c]=s,[p,q,r]=d,den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(den)<1e-6)return;const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den,C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den,D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;ctx.save();ctx.beginPath();for(let i=0;i<3;i++){const v=d[i],dx=v.x-cx,dy=v.y-cy,n=Math.hypot(dx,dy)||1;const x=v.x+dx/n*.3,y=v.y+dy/n*.3;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);ctx.drawImage(img,0,0);ctx.restore();}
export class BannerEffect{
 constructor(ctx){this.ctx=ctx;this.starts=new Map();this.items=[];this.customEmblem=null;this.lastElapsed=0;}
 async load(){this.items=await Promise.all(bannerConfigs.map(async c=>({...c,cloth:await imageOf(`./assets/banners/v3/${c.id}-cloth.png`),emblem:await imageOf(bannerEmblems[c.id].src),repair:await imageOf(`./assets/banners/${c.id==='outer'?'v3':'v2'}/${c.id}-repair.png`),path:new Path2D('M'+c.points.map(p=>p.join(' ')).join(' L')+' Z')})));this.compose();}
 compose(){for(const c of this.items){const canvas=document.createElement('canvas');canvas.width=c.width;canvas.height=c.height;const ctx=canvas.getContext('2d'),b=bannerEmblems[c.id].box;ctx.drawImage(c.cloth,0,0);if(this.customEmblem){ctx.globalCompositeOperation='source-atop';const image=this.customEmblem,ratio=image.naturalWidth/image.naturalHeight;let w=1,h=1;if(ratio>1)h=1/ratio;else w=ratio;ctx.drawImage(image,b.x+(1-w)*b.width/2,b.y+(1-h)*b.height/2,w*b.width,h*b.height);ctx.globalCompositeOperation='source-over';}else{ctx.clearRect(b.x,b.y,b.width,b.height);ctx.drawImage(c.emblem,b.x,b.y,b.width,b.height);}c.sprite=canvas;}}
 replaceEmblem(image){this.customEmblem=image;this.compose();}
 wind(id,elapsed,mode='strong'){if(!this.items.some(x=>x.id===id))return;this.starts.set(id,{start:elapsed,mode});}
 active(elapsed){return [...this.starts.values()].some(({start,mode})=>elapsed-start<(mode==='gentle'?swayDuration:windDuration));}
 hit(p){return this.items.find(c=>{const motion=this.starts.get(c.id);if(!motion||this.lastElapsed-motion.start>=(motion.mode==='gentle'?swayDuration:windDuration))return this.ctx.isPointInPath(c.path,p.x,p.y);for(let y=46;y<c.height;y+=7){const a=clothPoint(c,0,y,this.lastElapsed-motion.start,motion.mode),b=clothPoint(c,c.width,y,this.lastElapsed-motion.start,motion.mode);if(p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&Math.abs(p.y-(a.y+b.y)/2)<7)return true;}return false;})?.id;}
 draw(elapsed){this.lastElapsed=elapsed;const ctx=this.ctx;for(const c of this.items){const motion=this.starts.get(c.id);let age=motion?elapsed-motion.start:null;if(age!==null&&age>=(motion.mode==='gentle'?swayDuration:windDuration)){this.starts.delete(c.id);age=null;}if(age===null&&!this.customEmblem)continue;ctx.drawImage(c.repair,c.x,c.y);if(age===null){ctx.drawImage(c.sprite,c.x,c.y);continue;}const cols=6,rows=40;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a={x:i*c.width/cols,y:j*c.height/rows},b={x:(i+1)*c.width/cols,y:a.y},d={x:a.x,y:(j+1)*c.height/rows},e={x:b.x,y:d.y},pa=clothPoint(c,a.x,a.y,age,motion.mode),pb=clothPoint(c,b.x,b.y,age,motion.mode),pd=clothPoint(c,d.x,d.y,age,motion.mode),pe=clothPoint(c,e.x,e.y,age,motion.mode);triangle(ctx,c.sprite,[a,b,e],[pa,pb,pe]);triangle(ctx,c.sprite,[a,e,d],[pa,pe,pd]);}}}
}
