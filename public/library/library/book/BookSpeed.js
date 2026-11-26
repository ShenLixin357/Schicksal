import{clamp,smooth,mix}from'./BookPath.js';
export const defaultBookSettings=Object.freeze({total:6.2,extract:.3,acceleration:2.2,loopSpeed:.85,loopSize:.95,loopHeight:-54,deceleration:.5,reading:1.4,descent:.5,returnSpeed:.8});
export function cleanSettings(input={}){const p={...defaultBookSettings,...input};const bounds={total:[3,12],extract:[.25,.9],acceleration:[.5,3],loopSpeed:[.4,1.2],loopSize:[.5,1.6],loopHeight:[-65,65],deceleration:[.5,3],reading:[.7,3],descent:[.3,1.5],returnSpeed:[.4,2]};for(const[k,[a,b]]of Object.entries(bounds))p[k]=Math.max(a,Math.min(b,Number.isFinite(+p[k])?+p[k]:defaultBookSettings[k]));p.total=Math.max(p.total,p.extract+p.reading+p.descent+1);return p;}
// A positive velocity curve is integrated independently of geometry. Boundary
// speeds match; endpoint accelerations are zero. Arc-length lookup handles space.
function law(length,seconds,v0,v1,skew=1){
 const n=800,base=(v0+v1)/2,extra=Math.max(0,length/seconds-base),weights=[];let norm=0;
 for(let i=0;i<=n;i++){const u=i/n,w=u*u*(1-u)**(2*skew);weights.push(w);norm+=w*(i===0||i===n?.5:1)/n;}
 const distances=[0];let sum=0,last=v0;
 for(let i=1;i<=n;i++){const u=i/n,v=mix(v0,v1,smooth(u))+extra*weights[i]/norm;sum+=(last+v)*.5*seconds/n;distances.push(sum);last=v;}
 return u=>{const f=clamp(u)*n,i=Math.min(n-1,Math.floor(f));return mix(distances[i],distances[i+1],f-i)/sum;};
}
function loopLaw(relative){const m=Math.max(.45,Math.min(.85,relative)),avg=(1+m)/2;return{avg,at:u=>(m*u+(1-m)*(u/2+Math.sin(2*Math.PI*u)/(4*Math.PI)))/avg};}
export function createBookSpeed(path,p){
 const flightBase=p.total-p.reading-p.descent,ex=Math.min(p.extract,flightBase*.32),rest=flightBase-ex;
 const lo=Math.min(rest*.72,.9*(rest/2.5)*.7/p.loopSpeed),take=(rest-lo)*.9/1.6,approach=rest-lo-take;
 const times={extract:ex,takeoff:take,loop:lo,approach:approach,hovering:.12/1.4*p.reading,opening:.32/1.4*p.reading,flipping:.96/1.4*p.reading,landing:p.descent,closing:.65/p.returnSpeed,returning:2.1/p.returnSpeed,inserting:.30/p.returnSpeed};
 const ll=loopLaw(p.loopSpeed),cruise=Math.min(path.loop.length/(times.loop*ll.avg),1.45*path.takeoff.length/times.takeoff,1.8*path.approach.length/times.approach),extractExit=Math.min(1.1*path.extract.length/times.extract,.45*cruise);
 const laws={extract:law(path.extract.length,times.extract,0,extractExit),takeoff:law(path.takeoff.length,times.takeoff,extractExit,cruise,p.acceleration),loop:ll.at,approach:law(path.approach.length,times.approach,cruise,0,p.deceleration),returning:law(path.returning.length,times.returning,0,90*p.returnSpeed),inserting:law(path.inserting.length,times.inserting,90*p.returnSpeed,0)};
 // Retiming extreme geometry settings keeps all segment boundary speeds equal.
 const loopAverage=path.loop.length/times.loop,boost=loopAverage-cruise*ll.avg;
 laws.loop=u=>(cruise*(Math.max(.45,Math.min(.85,p.loopSpeed))*u+(1-Math.max(.45,Math.min(.85,p.loopSpeed)))*(u/2+Math.sin(2*Math.PI*u)/(4*Math.PI)))+boost*(u-Math.sin(2*Math.PI*u)/(2*Math.PI)))/loopAverage;
 return{times,laws,forward:['extract','takeoff','loop','approach','hovering','opening','flipping','landing'],flight:times.extract+times.takeoff+times.loop+times.approach,total:Object.entries(times).filter(([k])=>!['closing','returning','inserting'].includes(k)).reduce((s,[,v])=>s+v,0)};
}
