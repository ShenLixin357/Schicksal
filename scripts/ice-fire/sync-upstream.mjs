#!/usr/bin/env node
// Pinned upstream import adapted for independent same-origin hosting.
import {spawnSync} from "node:child_process";
import {cp,mkdir,mkdtemp,readFile,rm,rename,stat,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {optionalPlatformProgress} from "./standalone-compat.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const names=["1-forest-temple","2-light-temple","3-ice-temple","4-crystal-temple","5-elements","6-fairy-tales"];
const expected="f255e5f74f695528d431d96aa8cf5181e88557f0";
const sourceUrl="https://github.com/wyf9/Fireboy-and-Watergirl.git";
const localSource=process.argv.find(x=>x.startsWith("--source="))?.slice(9);
const enabled=process.argv.includes("--import");
function git(args){const p=spawnSync("git",args,{encoding:"utf8",timeout:180000,maxBuffer:5e6});if(p.error||p.status!==0)throw Error("Git command failed: "+(p.error?.message||p.stderr));return p.stdout.trim();}
async function requireFile(p){const st=await stat(p);if(!st.isFile()||st.size===0)throw Error("Missing/empty file: "+p);}
function parseList(js,name){const found=js.match(new RegExp("\\bvar\\s+"+name+"\\s*=\\s*(\\[[\\s\\S]*?\\]);"));if(!found)throw Error("Missing "+name);const items=[...found[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);if(!items.length||items.some(v=>!/^assets\/[A-Za-z0-9_./-]+$/.test(v)||v.includes("..")))throw Error("Unsafe asset path");return items;}
async function main(){
if(!enabled){console.log("[ice-fire] optional import not enabled");return;}
const temp=await mkdtemp(join(tmpdir(),"schicksal-icefire-"));
const source=localSource?resolve(localSource):join(temp,"upstream");
const staged=join(temp,"games");
try{
if(!localSource){
 git(["clone","--depth","1","--branch","main","--single-branch",sourceUrl,source]);
 const revision=git(["-C",source,"rev-parse","HEAD"]);
 if(revision!==expected)throw Error("Upstream updated: "+revision+". Review before changing pinned commit "+expected);
}
const upstreamGames=join(source,"games");
for(const name of names){await requireFile(join(upstreamGames,name,"index.html"));await requireFile(join(upstreamGames,name,"game.json"));await requireFile(join(upstreamGames,name,name==="6-fairy-tales"?"game.js":"js/game.js"));}
await requireFile(join(upstreamGames,"lib","require.js"));
await requireFile(join(upstreamGames,"sw.js"));
await cp(upstreamGames,staged,{recursive:true});
const sw=await readFile(join(staged,"sw.js"),"utf8");
const all=parseList(sw,"ALL_GAMES"),early=parseList(sw,"GAMES_1234");
for(const [i,name] of names.entries()){
const game=join(staged,name);
if(i<4){
const script=join(game,"js/game.js");
await writeFile(script,optionalPlatformProgress(await readFile(script,"utf8")));
}
for(const rel of [...all,...(i<4?early:[])]){
const src=join(staged,"shared-assets",rel),dest=join(game,rel);
await requireFile(src);await mkdir(dirname(dest),{recursive:true});await cp(src,dest,{force:true});
}
const file=join(game,"index.html"),html=await readFile(file,"utf8");
const clean=html.replace(/<script>\s*if\s*\(\s*["']serviceWorker["']\s+in\s+navigator\s*\)\s*\{[\s\S]*?<\/script>/g,"");
if(clean===html||clean.includes("serviceWorker.register"))throw Error("SW bootstrap removal failed: "+name);
await writeFile(file,clean);
}
await rm(join(staged,"sw.js"));
await rm(join(staged,"shared-assets"),{recursive:true});
const out=join(root,"public/games");
await writeFile(join(staged,"ice-fire-import.json"),JSON.stringify({repository:sourceUrl,revision:expected,imported:names,mode:"shared-assets-restored"},null,2));
// Atomic swap: never leave partially imported assets if anything fails.
const backup=join(temp,"previous-games");
let hadOld=false;
try{await stat(out);hadOld=true;}catch{}
await mkdir(join(root,"public"),{recursive:true});
if(hadOld)await rename(out,backup);
try{await rename(staged,out);}catch(error){if(hadOld)await rename(backup,out);throw error;}
console.log("[ice-fire] six game directories imported into public/games");
}finally{await rm(temp,{recursive:true,force:true});}
}
await main();
