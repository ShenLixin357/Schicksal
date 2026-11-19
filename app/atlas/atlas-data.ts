import { CITIZENS, citizenRepresentativeColor, type Citizen } from "../citizens";

/** Replace art paths independently; the UI never redraws a member's approved sigil or flower. */
export type AtlasAppearance = { emblemSrc?: string; ornamentSrc?: string; accent?: string };
export const ATLAS_APPEARANCE: Record<string, AtlasAppearance> = {
  amberina: {
    emblemSrc: "/amberina-personal-simple-official.png",
    ornamentSrc: "/atlas/avs-raised-sunflowers.webp",
    accent: "#F3ED87",
  },
};
/** Set a new public asset path here to replace the central library-style crystal emblem. */
export const ATLAS_SHARED_EMBLEM_SRC: string | null = null;

export type Office = {
  id: string;
  title: string;
  english: string;
  category: "presidency" | "committee" | "ministry" | "institution";
  holderIds: string[];
  description: string;
  confirmed: boolean;
};
export const ATLAS_OFFICES: Office[] = [
  { id:"president", title:"天命主席", english:"President", category:"presidency", holderIds:["amberina"], confirmed:true, description:"代表天命第一帝国，统筹国家行政事务，在宪法和法律规定范围内行使相应职权。" },
  { id:"committee", title:"天命委员会委员", english:"Committee Member", category:"committee", holderIds:["amberina","zxy","truth"], confirmed:true, description:"参与国家重大事项审议、公共程序监督与复核，并协调共同体事务。"},
  { id:"finance", title:"财政部长", english:"Minister of Finance", category:"ministry", holderIds:[], confirmed:false, description:"负责公共资金、预算、收支记录与财务透明等事务。" },
  { id:"technology", title:"科技部长", english:"Minister of Technology", category:"ministry", holderIds:["amberina"], confirmed:true, description:"负责天命网站、数据库、信息安全、数字基础设施和技术系统维护。" },
  { id:"puzzles", title:"谜题事务部长", english:"Minister of Puzzle Affairs", category:"ministry", holderIds:["amberina"], confirmed:true, description:"负责谜题作品、Puzzle Hunt、解谜活动和相关竞赛策划。" },
  { id:"culture", title:"文化部长", english:"Minister of Culture", category:"ministry", holderIds:["amberina"], confirmed:true, description:"负责国家节日、庆典、礼仪和共同文化传统的策划与维护。" },
  { id:"games", title:"游戏部长", english:"Minister of Games", category:"ministry", holderIds:[], confirmed:false, description:"负责小游戏、赛事、游戏规则、成绩记录与排行榜。" },
  { id:"organisation", title:"组织部长", english:"Minister of Organisation", category:"ministry", holderIds:[], confirmed:false, description:"负责活动组织、人员联络、日程安排及跨部门协作。" },
  { id:"librarian", title:"图书馆馆长", english:"Head Librarian", category:"institution", holderIds:[], confirmed:false, description:"负责图书馆藏书、文献编目、书稿整理和检索服务。" },
];
export const ATLAS_COMMITTEE_IDS = ["amberina","zxy","truth"] as const;
export const ATLAS_YOUTH_IDS = CITIZENS.map(c=>c.id).filter(id=>!ATLAS_COMMITTEE_IDS.some(k=>k===id));
/** A codename, never an account number; the user's registered alias is authoritative. */
export function atlasCodename(id:string):string {
  if(id==="truth") return "你说真的";
  return CITIZENS.find(c=>c.id===id)?.codename ?? "身份待补";
}
export function atlasName(c:Citizen):string { return c.id==="amberina" ? "AvS" : c.name; }
export function atlasColor(c:Citizen):string { return ATLAS_APPEARANCE[c.id]?.accent ?? citizenRepresentativeColor(c); }
export function atlasOfficesForCitizen(id:string):Office[] { return ATLAS_OFFICES.filter(o=>o.holderIds.includes(id)); }
