/** Primary navigation is intentionally limited to six destinations. */
export type PrimaryDestination = "home" | "briefing" | "parliament" | "collection" | "calendar" | "honors";
export type CollectionDestination = "library" | "atlas" | "photos" | "archives";
export type SidebarDestination = PrimaryDestination | CollectionDestination | "messenger";

export const PRIMARY_NAV: readonly { id: PrimaryDestination; label: string; icon: string }[] = [
  { id: "home", label: "首页", icon: "house" },
  { id: "briefing", label: "帝国简报台", icon: "newspaper" },
  { id: "parliament", label: "帝国政务", icon: "landmark" },
  { id: "collection", label: "帝国馆藏", icon: "library" },
  { id: "calendar", label: "国家节日", icon: "celebration" },
  { id: "honors", label: "积分", icon: "gift" },
];
export const COLLECTION_NAV: readonly { id: CollectionDestination; label: string }[] = [
  { id: "library", label: "魔法图书馆" },
  { id: "atlas", label: "天命图谱" },
  { id: "photos", label: "家庭影像馆" },
  { id: "archives", label: "国家档案馆" },
];
