/** Six feature destinations and the independent seventh personal-profile entry. */
export type PrimaryDestination = "home" | "briefing" | "parliament" | "collection" | "calendar" | "honors" | "profile";
export type CollectionDestination = "library" | "atlas" | "photos" | "archives";
export type PointsDestination = "honors" | "market";
export type SidebarDestination = PrimaryDestination | CollectionDestination | PointsDestination | "messenger";

export const PRIMARY_NAV: readonly { id: PrimaryDestination; label: string; icon: string }[] = [
  { id: "home", label: "首页", icon: "house" },
  { id: "briefing", label: "帝国简报台", icon: "newspaper" },
  { id: "parliament", label: "帝国政务", icon: "landmark" },
  { id: "collection", label: "帝国馆藏", icon: "library" },
  { id: "calendar", label: "国家节日", icon: "celebration" },
  { id: "honors", label: "积分", icon: "gift" },
  { id: "profile", label: "个人页", icon: "profile" },
];
export const COLLECTION_NAV: readonly { id: CollectionDestination; label: string }[] = [
  { id: "library", label: "魔法图书馆" },
  { id: "atlas", label: "天命图谱" },
  { id: "photos", label: "家庭影像馆" },
  { id: "archives", label: "国家档案馆" },
];
export const POINTS_NAV: readonly { id: PointsDestination; label: string }[] = [
  { id: "honors", label: "积分与荣誉" },
  { id: "market", label: "跳蚤市场" },
];
