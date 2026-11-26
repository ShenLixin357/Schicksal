/** Only own the library scene's full-screen state. Never close a separate feature's full screen. */
export function createSceneFullscreen(scene,root,doc,{isDisposed=()=>false}={}){
 let transition=Promise.resolve(),entering=false;
 const ownsNative=()=>root.fullscreenElement===scene||doc.fullscreenElement===scene;
 const ownsExpanded=()=>scene.classList.contains('is-expanded');
 const queue=operation=>{const next=transition.then(operation,operation);transition=next.catch(()=>{});return next;};
 async function exit(){scene.classList.remove('is-expanded');if(ownsNative()&&doc.exitFullscreen){try{await doc.exitFullscreen();}catch{/* Native exit may already be in progress. */}}}
 return {
  // Native entry must be requested synchronously in the user's click, not after a promise.
  toggle(){
   if(isDisposed())return Promise.resolve();
   if(entering||ownsNative()||ownsExpanded())return queue(exit);
   if(doc.fullscreenElement||root.fullscreenElement)return Promise.resolve();
   let requested;try{requested=scene.requestFullscreen?.();}catch{scene.classList.add('is-expanded');return Promise.resolve();}
   if(!requested){scene.classList.add('is-expanded');return Promise.resolve();}
   entering=true;
   transition=Promise.resolve(requested).catch(()=>{if(!isDisposed())scene.classList.add('is-expanded');}).then(()=>{if(isDisposed())return exit();}).finally(()=>{entering=false;});
   return transition;
  },
  close:()=>queue(exit),
  active:()=>entering||ownsNative()||ownsExpanded(),
  escape:()=>scene.classList.remove('is-expanded')
 };
}
