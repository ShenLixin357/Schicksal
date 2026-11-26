// Geometry only. All points are book-center coordinates in the unchanged scene.
export const mix=(a,b,t)=>a+(b-a)*t;
export const clamp=t=>Math.max(0,Math.min(1,t));
export const smooth=t=>(t=clamp(t))*t*(3-2*t);
export function cubic(s,t){const u=1-t;return{x:u**3*s[0].x+3*u*u*t*s[1].x+3*u*t*t*s[2].x+t**3*s[3].x,y:u**3*s[0].y+3*u*u*t*s[1].y+3*u*t*t*s[2].y+t**3*s[3].y};}
const point=(x,y)=>({x,y});
function curve(segments){const points=[];let length=0,prev;for(const segment of segments)for(let i=points.length?1:0;i<=240;i++){const p=cubic(segment,i/240);if(prev)length+=Math.hypot(p.x-prev.x,p.y-prev.y);points.push({...p,d:length});prev=p;}
 return{segments,points,length,at(f){const d=clamp(f)*length;let l=0,r=points.length-1;while(l<r){const m=(l+r)>>1;if(points[m].d<d)l=m+1;else r=m;}const b=points[l],a=points[Math.max(0,l-1)],u=(d-a.d)/(b.d-a.d||1);return{x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)};}};
}
export function createBookPath(a,p){
 const S=point(a.shelf.x,a.shelf.y),E=point(S.x-46,S.y+6),H=point(a.hover.x,a.hover.y),L=point(a.stand.x,a.stand.y);
 const rx=64*p.loopSize,ry=37*p.loopSize,B=point(H.x+(S.x-H.x)*.60,mix(S.y,H.y,.72)-p.loopHeight),C=point(B.x,B.y-ry),k=.5522847498;
 // A: an oval ABOVE the incoming/outgoing junction. At the lower junction
 // motion continues leftwards; one full traversal, never a body roll.
 const loop=curve([
  [B,point(B.x-k*rx,B.y),point(B.x-rx,C.y+k*ry),point(B.x-rx,C.y)],
  [point(B.x-rx,C.y),point(B.x-rx,C.y-k*ry),point(B.x-k*rx,C.y-ry),point(B.x,C.y-ry)],
  [point(B.x,C.y-ry),point(B.x+k*rx,C.y-ry),point(B.x+rx,C.y-k*ry),point(B.x+rx,C.y)],
  [point(B.x+rx,C.y),point(B.x+rx,C.y+k*ry),point(B.x+k*rx,B.y),B]
 ]);
 const extract=curve([[S,point(S.x-8,S.y+1),point(E.x+18,E.y),E]]);
 const takeoff=curve([[E,point(E.x-90,E.y),point(B.x+135,B.y),B]]);
 const approach=curve([[B,point(B.x-130,B.y),point(H.x,H.y-85),H]]);
 const returning=curve([[L,point(L.x+110,L.y-120),point(E.x-150,E.y-130),E]]);
 const insert=curve([[E,point(E.x+15,E.y),point(S.x-8,S.y+1),S]]);
 return {extract,takeoff,loop,approach,returning,inserting:insert,anchors:{S,E,B,C,H,L},outbound:[extract,takeoff,loop,approach]};
}
