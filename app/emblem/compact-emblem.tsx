"use client";

import { useEffect, useRef } from "react";
import { EMBLEM_BLADES } from "./blade-spec";
import { bladeOutline, emblemFacets, mountEmblem, sampleEmblem, technologyRingSvg, type MotionMode } from "./motion-v10";
const colors=EMBLEM_BLADES.map(blade=>blade.color);
const facets=emblemFacets(colors),softened=emblemFacets(colors,.3);
export function EmblemCanvas({mode="static",revealed=8}:{mode?:MotionMode;revealed?:number}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const canvas=ref.current;if(canvas)return mountEmblem(canvas,mode,bladeOutline(),mode==="loading"?softened:facets,sampleEmblem,revealed);},[mode,revealed]);
  return <canvas ref={ref} className="empire-emblem-canvas" aria-hidden="true" />;
}
export function CompactEmpireEmblem({compact=false,revealed=8,ceremonial=false}: {compact?:boolean;highlight?:number;revealed?:number;ceremonial?:boolean}) {
  return <div className={"emblem "+(compact?"compact ":"")+(ceremonial?"ceremonial ":"")+(revealed>=8?"complete":"")} role="img" aria-label="天命第一帝国八棱主标志，正式名称待定">
    {ceremonial && <span className="opening-orbit-v10" aria-hidden="true"/>}
    <EmblemCanvas mode={ceremonial?"opening":"static"} revealed={ceremonial?8:revealed}/>
  </div>;
}
export function TechnologyEmblem({compact=true}:{compact?:boolean}) {
  return <div className={"emblem technology-orbits "+(compact?"compact":"")} role="img" aria-label="科技部长四环徽记" dangerouslySetInnerHTML={{__html:technologyRingSvg(colors)}}/>;
}
