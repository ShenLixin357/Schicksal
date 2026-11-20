/** Single source of truth for visible navigation labels, icons and muted subtitles. */
export type PrimaryDestination = "home" | "briefing" | "parliament" | "collection" | "calendar" | "honors" | "profile";
export type CollectionDestination = "library" | "atlas" | "photos" | "archives";
export type PointsDestination = "honors" | "market";
export type SidebarDestination = PrimaryDestination | CollectionDestination | PointsDestination | "messenger";
/** Concrete page states; expandable group labels are not actual routes. */
export type SiteSection = Exclude<SidebarDestination, "collection"> | "citizens" | "emblem" | "club";

export type PrimaryNavItem = { id: PrimaryDestination; label: string; en: string; icon: string };
export type SubNavItem = { id: SidebarDestination; label: string };

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { id: "home", label: "首页", en: "Home", icon: "house" },
  { id: "briefing", label: "帝国简报台", en: "Briefing", icon: "newspaper" },
  { id: "parliament", label: "帝国政务", en: "Government", icon: "landmark" },
  { id: "collection", label: "帝国馆藏", en: "Collection", icon: "library" },
  { id: "calendar", label: "国家节日", en: "Calendar", icon: "celebration" },
  { id: "honors", label: "积分", en: "Honors", icon: "gift" },
  { id: "profile", label: "个人页", en: "Profile", icon: "profile" },
];

export const COLLECTION_NAV: readonly SubNavItem[] = [
  { id: "library", label: "魔法图书馆" },
  { id: "atlas", label: "天命图谱" },
  { id: "photos", label: "家庭影像馆" },
  { id: "archives", label: "国家档案馆" },
];

export const POINTS_NAV: readonly SubNavItem[] = [
  { id: "honors", label: "积分与荣誉" },
  { id: "market", label: "跳蚤市场" },
];
