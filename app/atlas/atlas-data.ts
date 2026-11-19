import { CITIZENS, type Citizen } from "../citizens";

/** One place for atlas visuals. Future uploads replace paths, not JSX. */
export type CitizenAtlasAppearance = {
  emblemSrc?: string;
  ornamentSrc?: string;
  personalColor?: string;
  webColor?: string;
};
export const CITIZEN_APPEARANCE: Record<string, CitizenAtlasAppearance> = {
  amberina: { personalColor: "#F3ED87", webColor: "#F0DD7B", ornamentSrc: "/atlas/amberina-crystal-sunflowers.webp" },
};

export type ImperialOffice = {
  id: string;
  title: string;
  english: string;
  holderIds: string[];
  description: string;
  group: "presidency" | "committee" | "ministry" | "institution";
  status: "confirmed" | "vacant" | "pending";
};

/** Position → people. Citizen cards and the office table derive from this ONE registry. */
export const IMPERIAL_OFFICES: ImperialOffice[] = [
  { id:"president", title:"天命主席", english:"President", holderIds:["amberina"], group:"presidency", status:"confirmed", description:"代表天命第一帝国，统筹行政事务、推动公共项目，并在宪法和法律规定范围内行使行政职权。" },
  { id:"committee", title:"天命委员会委员", english:"Schicksal Committee", holderIds:["amberina","zxy","truth"], group:"committee", status:"confirmed", description:"参与重大事项审议及重要程序的监督和复核，协助协调公共事务。" },
  { id:"finance", title:"财政部长", english:"Minister of Finance", holderIds:[], group:"ministry", status:"pending", description:"负责公共资金、预算、收支记录以及公共项目经费的管理。" },
  { id:"technology", title:"科技部长", english:"Minister of Technology", holderIds:["amberina"], group:"ministry", status:"confirmed", description:"负责网站、数据库、数字基础设施、信息安全以及技术系统维护。" },
  { id:"puzzles", title:"谜题事务部长", english:"Minister of Puzzle Affairs", holderIds:["amberina"], group:"ministry", status:"confirmed", description:"负责谜题创作、Puzzle Hunt、解谜竞赛及相关活动记录。" },
  { id:"culture", title:"文化部长", english:"Minister of Culture", holderIds:["amberina"], group:"ministry", status:"confirmed", description:"负责国家节日、庆典、礼仪以及文化传统的策划与维护。" },
  { id:"games", title:"游戏部长", english:"Minister of Games", holderIds:[], group:"ministry", status:"pending", description:"负责小游戏、竞赛活动、排行榜与游戏规则的管理。" },
  { id:"organisation", title:"组织部长", english:"Minister of Organisation", holderIds:[], group:"ministry", status:"pending", description:"负责公共活动、人员联络、跨部门协调及执行安排。" },
  { id:"librarian", title:"图书馆馆长", english:"Head Librarian", holderIds:[], group:"institution", status:"pending", description:"负责图书馆藏书、书稿、文献编目与查询入口的维护。" },
];
export const SCHICKSAL_COMMITTEE_IDS = ["amberina","zxy","truth"] as const;
export const YOUTH_COUNCIL_IDS = CITIZENS.map(c=>c.id).filter(id=>!SCHICKSAL_COMMITTEE_IDS.some(member=>member===id));

export function officeHolderCodename(id: string): string {
  const citizen = CITIZENS.find(c => c.id === id);
  return citizen?.codename ?? "身份待确认";
}
export function atlasCitizenName(citizen: Citizen): string {
  return citizen.id === "amberina" ? "AvS" : citizen.name;
}
export function atlasCitizenColor(citizen: Citizen): string {
  return CITIZEN_APPEARANCE[citizen.id]?.webColor ?? citizen.markColor;
}
export function officesOf(citizenId: string): ImperialOffice[] {
  return IMPERIAL_OFFICES.filter(o=>o.holderIds.includes(citizenId));
}
