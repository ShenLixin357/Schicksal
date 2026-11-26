export type AssetId = string;
export interface BookChapter {id:string;title:string;version?:string;source?:string;}
export interface BookDocument {id:string;title:string;author?:string;coverAssetId?:AssetId;status:"bound"|"placeholder";chapters:BookChapter[];}
export interface ShelfSlot {id:string;side:"left"|"right";box:readonly number[];origin:readonly number[];}
export interface AnimationProfile {id:string;routeId:string;revision:string;parameters:Readonly<Record<string,number>>;}
export interface BookBinding {bookId:string;slotId:string;profileId:string;}
export interface AssetReference {id:AssetId;sha256?:string;bytes?:number;mimeType:string;kind:"master"|"preview"|"thumbnail"|"runtime";}
export interface AssetPort {resolve(id:AssetId,signal?:AbortSignal):Promise<string>;describe(id:AssetId,signal?:AbortSignal):Promise<AssetReference|null>;}
export interface CatalogPort {list(signal?:AbortSignal):Promise<readonly BookDocument[]>;read(id:string,signal?:AbortSignal):Promise<BookDocument|null>;}
// No production storage, upload or publication APIs are implemented in this phase.
