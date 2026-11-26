export function clamp01(t){return Math.max(0,Math.min(1,Number.isFinite(t)?t:0));}
export function homePosition(config){const r=config.rail;return (r.homeAnchor.x-r.nearX)/(r.farX-r.nearX);}
export function poseAt(t,config){
 const r=config.rail,v=r.vanishingPoint,x=r.nearX+(r.farX-r.nearX)*clamp01(t),scale=(v.x-x)/(v.x-r.homeAnchor.x);
 return {scale,dx:v.x*(1-scale),dy:v.y*(1-scale)};
}
export function projectPoint(p,pose){return {x:p.x*pose.scale+pose.dx,y:p.y*pose.scale+pose.dy};}
export function inversePoint(p,pose){return {x:(p.x-pose.dx)/pose.scale,y:(p.y-pose.dy)/pose.scale};}
export function positionForRailPoint(p,config){
 const r=config.rail,a=projectPoint(r.homeAnchor,poseAt(0,config)),b=projectPoint(r.homeAnchor,poseAt(1,config)),dx=b.x-a.x,dy=b.y-a.y;
 return clamp01(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy));
}
export function smoothStep(t){t=clamp01(t);return t*t*(3-2*t);}

