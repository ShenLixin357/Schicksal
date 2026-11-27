"use client";
import {Component,Suspense,useCallback,useState,type ComponentType,type ReactNode} from "react";
import {EmblemCanvas} from "../emblem/compact-emblem";
import "./library-entrance.css";

type SceneProps={technology?:boolean;onReady?:()=>void;onLoading?:()=>void;onFailure?:()=>void};
class EntranceBoundary extends Component<{children:ReactNode;onExit:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="library-entrance-error" role="alert"><p>图书馆暂时无法打开。</p><button type="button" onClick={this.props.onExit}>返回首页</button></div>:this.props.children;}
}
/** One persistent cover spanning React chunk, stylesheet, assets, documents and first painted frame. */
export function LibraryEntrance({component:Scene,technology,onExit}:{component:ComponentType<SceneProps>;technology:boolean;onExit:()=>void}){
 const [phase,setPhase]=useState<"loading"|"ready"|"error">("loading"),[attempt,setAttempt]=useState(0);
 const ready=useCallback(()=>setPhase("ready"),[]);
 const loading=useCallback(()=>setPhase("loading"),[]);
 const failure=useCallback(()=>setPhase("error"),[]);
 return <EntranceBoundary onExit={onExit}><div className="library-entrance" aria-busy={phase==="loading"}>
   <div className="library-scene-content" data-ready={phase==="ready"} inert={phase!=="ready"}>
     {phase!=="error"&&<Suspense fallback={null}><Scene key={attempt} technology={technology} onReady={ready} onLoading={loading} onFailure={failure}/></Suspense>}
   </div>
   {phase==="loading"&&<div className="library-loading-cover" role="status" aria-label="正在加载天命图书馆"><span className="library-loading-mark"><EmblemCanvas mode="loading"/></span><span>正在布置图书馆…</span></div>}
   {phase==="error"&&<div className="library-entrance-error" role="alert"><p>图书馆暂时无法打开。</p><button type="button" onClick={()=>{setPhase("loading");setAttempt(v=>v+1)}}>重试</button><button type="button" onClick={onExit}>返回首页</button></div>}
 </div></EntranceBoundary>;
}
