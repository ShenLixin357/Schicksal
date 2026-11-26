import{smooth,clamp}from'./BookPath.js';
// Orientation and depth never change center coordinates or distance/time laws.
export function bookOrientation(phase,u){if(phase==='extract')return{reveal:smooth(clamp((u-.22)/.78)),bank:0};if(phase==='inserting')return{reveal:1-smooth(u),bank:0};if(phase==='takeoff')return{reveal:1,bank:-.025*Math.sin(Math.PI*u)};if(phase==='loop')return{reveal:1,bank:.045*Math.sin(2*Math.PI*u)};if(phase==='approach'||phase==='returning')return{reveal:1,bank:.025*Math.sin(Math.PI*u)};return{reveal:1,bank:0};}
export function bookDepth(phase,u){if(phase==='extract')return 1;if(phase==='loop')return 1+.035*Math.sin(Math.PI*u)**2;return 1;}
