"use client";
import { useEffect, useState } from "react";

/** Own the guide's per-visit intent; leaving the immersive library clears its target. */
export function useGuideState(section:string){
  const [guideOpen,setGuideOpen]=useState(false);
  const [guideVisit,setGuideVisit]=useState<{target?:"books"|"collections";serial:number}>({serial:0});
  useEffect(()=>{if(section!=="library")setGuideVisit(v=>v.target?{serial:v.serial}:v);},[section]);
  return {guideOpen,setGuideOpen,guideVisit,setGuideVisit};
}
