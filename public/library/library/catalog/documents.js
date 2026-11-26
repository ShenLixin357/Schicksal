import {routeBook, defaultsFor, finalizedBookIds} from '../book/multi/routes.js';
import {searchBook,prepareBook} from './selection.js';
export const BOOK_IDS=Object.freeze([...finalizedBookIds]);
export const AnimationProfiles=Object.freeze(Object.fromEntries(BOOK_IDS.map(id=>[id,Object.freeze({id,routeId:routeBook[id].route??routeBook[id].kind,parameters:Object.freeze(defaultsFor(id)),revision:'handoff-2026-11-27'})])));
export const BookBindings=Object.freeze(BOOK_IDS.map(id=>Object.freeze({bookId:id,slotId:`slot-${id}`,profileId:id})));
export function bindingForBook(id){return BookBindings.find(b=>b.bookId===id)??null;}
export function makeShelfSlots(loadedBooks){return Object.freeze(BOOK_IDS.map(id=>{const b=loadedBooks[id];return Object.freeze({id:`slot-${id}`,side:b.shelfSide,box:Object.freeze([...b.box]),origin:Object.freeze([...b.origin])});}));}
export function createDocuments(nation){if(nation.id!=='AVS'||nation.chapters.length!==7)throw Error('国家书索引不完整');return BOOK_IDS.map(id=>id==='AVS'?{...nation,author:'AvS',coverAssetId:'cover-AVS',status:'bound'}:{id,title:id,coverAssetId:`cover-${id}`,status:'placeholder',chapters:[{id:`${id}-placeholder`,title:'内容占位符',blocks:[{id:`${id}-placeholder-p1`,html:'<p>占位符 · 本书正文尚未收录。</p>'}]}]});}
export async function loadDocuments(signal){const response=await fetch(new URL('../../data/nation-building.json',import.meta.url),{signal});if(!response.ok)throw Error('馆藏无法读取');return createDocuments(await response.json()).map(prepareBook);}
export function searchDocuments(documents,query){return documents.flatMap(doc=>searchBook(doc,query).map(result=>({...result,bookId:doc.id,title:doc.title})));}
/** Future CatalogPort and AssetPort are implemented separately; no upload/publish side effects in phase I. */
export function staticCatalog(documents){return Object.freeze({list:()=>documents.map(({id,title,status})=>({id,title,status})),search:q=>searchDocuments(documents,q),read:id=>documents.find(x=>x.id===id)??null});}
