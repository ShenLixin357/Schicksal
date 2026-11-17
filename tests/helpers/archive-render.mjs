import { readFile } from "node:fs/promises";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const react=JSON.stringify(import.meta.resolve("react")),jsx=JSON.stringify(import.meta.resolve("react/jsx-runtime"));
const hooks=`data:text/javascript,${encodeURIComponent("export const useState=(initial)=>globalThis.__archiveRender.useState(initial);export const useEffect=(fn)=>globalThis.__archiveRender.effects.push(fn);")}`;
const image=`data:text/javascript,${encodeURIComponent(`import {createElement} from ${react};export default function Image({fill,priority,unoptimized,...props}){return createElement('img',{...props,'data-fill':String(fill),'data-priority':String(priority),'data-unoptimized':String(unoptimized)})}`)}`;
export function presentation(){return{PageHead:({eyebrow,title,copy})=>createElement("header",{className:"page-head"},createElement("div",null,createElement("p",{className:"eyebrow"},eyebrow),createElement("h1",null,title)),createElement("p",null,copy)),ownerMark:createElement("span",{className:"citizen-mark snow","data-owner":"amberina"})}}
export async function archiveModule(source,legacy=false){
 if(legacy)source=`import Image from 'next/image';import {useState,useEffect} from 'react';\nconst CITIZENS=[{id:'amberina'}];const PageHead=(props)=>globalThis.__archiveRender.presentation.PageHead(props);const CitizenMark=()=>globalThis.__archiveRender.presentation.ownerMark;\n${source.replace("function ArchivesSection()","export function ArchivesSection()")}`;
 let code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies={react:hooks,"next/image":image,"react/jsx-runtime":JSON.parse(jsx)};
 for(const name of ["catalogue","markdown","chapter-source"])dependencies[`./${name}`]=new URL(`../../features/archives/${name}.ts`,import.meta.url).href;
 code=code.replace(/from ["']([^"']+)["']/g,(all,name)=>dependencies[name]?`from ${JSON.stringify(dependencies[name])}`:all);
 return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
export async function currentArchiveModule(){return archiveModule(await readFile(new URL("../../features/archives/archives-section.tsx",import.meta.url),"utf8"))}
export function renderArchive(module,initial){
 const state=[...initial],props=presentation();let cursor=0;
 const harness={state,effects:[],presentation:props,useState(initial){const index=cursor++;if(state[index]===undefined)state[index]=initial;return[state[index],next=>{state[index]=typeof next==="function"?next(state[index]):next}]}};
 globalThis.__archiveRender=harness;const tree=module.ArchivesSection(props),html=renderToStaticMarkup(tree);return{...harness,tree,html};
}
export function findElement(tree,predicate){
 if(Array.isArray(tree)){for(const child of tree){const found=findElement(child,predicate);if(found)return found}return null}
 if(!isValidElement(tree))return null;return predicate(tree)?tree:findElement(tree.props.children,predicate);
}
