/**
 * Central public office registry: positions belong to offices, not personal
 * marks, login records, or Lounge masks. Historical assignments below are the initial metadata baseline. Current
 * officeholders come only from the authenticated live office snapshot. The
 * election processor will update server-side current_office_holders.
 */
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

export function officeHolders(officeId: string, snapshot: readonly Office[] = ATLAS_OFFICES): readonly string[] {
  return snapshot.find(office => office.id === officeId)?.holderIds ?? [];
}
/** Site administration follows the confirmed Technology Minister office, not an individual's name. */
export function isCurrentTechnologyMinister(citizenId: string, snapshot: readonly Office[] = ATLAS_OFFICES): boolean {
  return Boolean(citizenId) && officeHolders("technology", snapshot).includes(citizenId);
}
export function isCurrentPresident(citizenId: string, snapshot: readonly Office[] = ATLAS_OFFICES): boolean {
  return officeHolders("president", snapshot).includes(citizenId);
}
/** Derive display office from current assignments; do not trust stale Citizen.office. */
export function officesForCitizen(citizenId: string, snapshot: readonly Office[] = ATLAS_OFFICES): Office[] {
  return snapshot.filter(office => office.holderIds.includes(citizenId));
}
/** Titles are computed from the same current office roster as permissions.
 * Never fall back to a former office in citizen.office after a transition.
 */
export function currentOfficeLabel(
  citizen: { id: string; office: string },
  snapshot: readonly Office[] = ATLAS_OFFICES,
): string {
  if (isCurrentPresident(citizen.id, snapshot)) return "President of the First Empire";
  const held = officesForCitizen(citizen.id, snapshot);
  const primary = held.find(office => office.category === "ministry" || office.category === "institution")
    ?? held.find(office => office.category === "committee");
  return primary?.english ?? "Citizen of the First Empire";
}
/**
 * Pure draft transition helper for election logic/tests. No mutations, writes
 * or authorization: only a verified server-side election result may persist it.
 */
export function withOfficeHolders(
  snapshot: readonly Office[], officeId: string, holders: readonly string[],
): Office[] {
  const originalOffice = snapshot.find(office => office.id === officeId);
  if (!originalOffice) throw new Error("Unknown office");
  if (holders.some(id => !id.trim()) || new Set(holders).size !== holders.length)
    throw new Error("Invalid office holder list");
  return snapshot.map(office => office.id === officeId
    ? { ...office, holderIds: [...holders], confirmed: true }
    : { ...office, holderIds: [...office.holderIds] });
}
