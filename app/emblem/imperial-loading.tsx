"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EmblemCanvas } from "./compact-emblem";
const Allowed=createContext(true);
/** Deny the entire Lounge subtree and both directions of its passage. */
export function ImperialLoadingScope({enabled,children}:{enabled:boolean;children:ReactNode}){
  const parent=useContext(Allowed);
  return <Allowed.Provider value={parent&&enabled}>{children}</Allowed.Provider>;
}
export function ImperialLoading({size=48}:{size?:24|48|88}){
  const allowed=useContext(Allowed);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{if(!allowed){setVisible(false);return;}const timer=window.setTimeout(()=>setVisible(true),200);return ()=>window.clearTimeout(timer);},[allowed]);
  if(!allowed||!visible)return null;
  return <span className={"imperial-loading imperial-loading-"+size} aria-hidden="true" data-imperial-loading=""><EmblemCanvas mode="loading"/></span>;
}
