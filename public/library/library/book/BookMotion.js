// Public facade retained for preview scripts. Geometry, time laws and pose are separate.
export{defaultBookSettings as bookMotion,defaultBookSettings,cleanSettings,createBookSpeed}from'./BookSpeed.js';
export{createBookPath,smooth,mix as lerp}from'./BookPath.js';
export{bookOrientation,bookDepth}from'./BookPose.js';
