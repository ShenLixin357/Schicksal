export const coreEffect={center:{x:837,y:507},periodMs:120000,sparklePeriodMs:3800};
export function coreAngle(elapsed){return -elapsed/coreEffect.periodMs*Math.PI*2;}
export const coreSpriteBounds=[-107,-97,210,210];
export function drawCoreSprite(ctx,sprite,elapsed){
  const {center}=coreEffect;
  ctx.save();ctx.translate(center.x,center.y);ctx.rotate(coreAngle(elapsed));
  ctx.drawImage(sprite,...coreSpriteBounds);ctx.restore();
}
const star=(ctx,x,y,r,alpha)=>{ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.shadowColor='#fff0bc';ctx.shadowBlur=12;ctx.fillStyle='#fffbea';ctx.beginPath();ctx.moveTo(0,-r*2);ctx.lineTo(r*.21,-r*.2);ctx.lineTo(r,0);ctx.lineTo(r*.21,r*.2);ctx.lineTo(0,r*2);ctx.lineTo(-r*.21,r*.2);ctx.lineTo(-r,0);ctx.lineTo(-r*.21,-r*.2);ctx.closePath();ctx.fill();ctx.restore();};
export class CoreEffect{
 constructor(ctx,images){this.ctx=ctx;this.images=images;}
 draw(elapsed,night=0){const ctx=this.ctx,{center}=coreEffect,angle=coreAngle(elapsed),breath=.5+.5*Math.sin(elapsed/2100);ctx.save();ctx.translate(center.x,center.y);
  ctx.save();ctx.globalCompositeOperation='screen';const halo=ctx.createRadialGradient(0,0,7,0,0,124);halo.addColorStop(0,`rgba(255,239,181,${.25+.1*breath+.13*night})`);halo.addColorStop(.35,`rgba(245,203,255,${.13+.08*breath+.1*night})`);halo.addColorStop(1,'rgba(186,164,255,0)');ctx.fillStyle=halo;ctx.fillRect(-125,-125,250,250);
  // Fine rising motes emerge near the heart and disperse, with independent phases.
  for(let i=0;i<28;i++){const phase=(elapsed/6500+i*.6180339)%1,a=i*2.39996+elapsed/18000,rad=12+phase*98,x=Math.cos(a)*rad,y=Math.sin(a)*rad*.62-phase*13,alpha=Math.sin(Math.PI*phase)*.8;ctx.fillStyle=i%3?'#fff0b8':'#d9d0ff';ctx.globalAlpha=alpha;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(x,y,1.1+(i%4)*.3,0,Math.PI*2);ctx.fill();if(i%7===0)star(ctx,x,y,1.5,alpha);}
  ctx.restore();ctx.save();ctx.rotate(angle);
  ctx.save();ctx.globalAlpha=.22+.11*breath+.14*night;ctx.filter='blur(4px)';ctx.globalCompositeOperation='screen';ctx.drawImage(this.images.sprite,...coreSpriteBounds);ctx.restore();ctx.drawImage(this.images.sprite,...coreSpriteBounds);
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.08+.09*breath+.1*night;ctx.drawImage(this.images.sprite,...coreSpriteBounds);ctx.restore();
  const points=[[0,-66],[46,-43],[64,0],[44,43],[0,63],[-43,44],[-65,0],[-45,-43]];points.forEach(([x,y],i)=>{const phase=(elapsed/3800+i*.37)%1,pulse=Math.pow(Math.max(0,Math.sin(phase*Math.PI)),5);ctx.save();ctx.translate(x,y);ctx.rotate(-angle);star(ctx,0,0,3+4.5*pulse,.9*pulse);ctx.restore();});ctx.restore();
  star(ctx,0,0,4+2.5*breath,.65+.2*breath);ctx.restore();
 }
}
