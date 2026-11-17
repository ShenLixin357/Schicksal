export type VaseGroup = "flowers" | "curios" | "produce" | "treats" | "magic" | "royal";
export type VaseOption = { id: string; label: string; group: VaseGroup; hidden: boolean; original?: boolean };
export type VaseRoom = { id: string; vaseSelection: string; updatedByCitizenId: string; updatedAt: string };
export type VaseHistoryEntry = { seq: number; citizenId: string; vaseSelection: string; createdAt: string; method: "manual" | "random" };
export type VaseChange = { room: VaseRoom; draw: VaseHistoryEntry | null };
export const VASE_GROUPS: { id: VaseGroup; label: string }[] = [
  { id: "flowers", label: "花束与枝叶" }, { id: "curios", label: "趣味小物" },
  { id: "produce", label: "蔬菜与水果" }, { id: "treats", label: "零食" },
];

// Existing IDs remain stable: stored rooms and the nine original illustrations are untouched.
export const VASE_OPTIONS: readonly VaseOption[] = [
  { id: "autumn", label: "秋日红叶", group: "flowers", hidden: false, original: true },
  { id: "sunflower", label: "向日葵", group: "flowers", hidden: false, original: true },
  { id: "roses", label: "玫瑰", group: "flowers", hidden: false, original: true },
  { id: "tulips", label: "郁金香", group: "flowers", hidden: false, original: true },
  { id: "lavender", label: "薰衣草", group: "flowers", hidden: false, original: true },
  { id: "daisies", label: "雏菊", group: "flowers", hidden: false, original: true },
  { id: "cabbage", label: "卷心菜", group: "produce", hidden: false, original: true },
  { id: "popcorn", label: "爆米花", group: "treats", hidden: false, original: true },
  { id: "lollipop", label: "棒棒糖", group: "treats", hidden: false, original: true },
  { id: "iris", label: "鸢尾", group: "flowers", hidden: false },
  { id: "hydrangea", label: "绣球", group: "flowers", hidden: false },
  { id: "lily-of-the-valley", label: "铃兰", group: "flowers", hidden: false },
  { id: "feathers", label: "羽毛", group: "curios", hidden: false },
  { id: "pencils", label: "彩色铅笔", group: "curios", hidden: false },
  { id: "pinwheels", label: "风车", group: "curios", hidden: false },
  { id: "scallions", label: "葱", group: "produce", hidden: false },
  { id: "garlic", label: "大蒜", group: "produce", hidden: false },
  { id: "bananas", label: "香蕉", group: "produce", hidden: false },
  { id: "carrots", label: "胡萝卜", group: "produce", hidden: false },
  { id: "rainbow", label: "彩虹", group: "magic", hidden: true },
  { id: "rain-cloud", label: "下雨的云朵", group: "magic", hidden: true },
  { id: "ice-flower", label: "冰晶花", group: "magic", hidden: true },
  { id: "star-branches", label: "星星枝条", group: "magic", hidden: true },
  { id: "ice-lily", label: "冰晶铃兰", group: "magic", hidden: true },
  { id: "aurora", label: "瓶中极光", group: "magic", hidden: true },
  { id: "reverse-rain", label: "逆流的雨", group: "magic", hidden: true },
  { id: "ink-flower", label: "墨水花", group: "magic", hidden: true },
  { id: "crane-branches", label: "纸鹤枝", group: "magic", hidden: true },
  { id: "royal-cabbage", label: "Royal Cabbage", group: "royal", hidden: true },
  { id: "royal-rose", label: "Royal Rose · 钻石玫瑰", group: "royal", hidden: true },
];

export const VASE_IDS = VASE_OPTIONS.map(option => option.id);
export function getVase(id: string): VaseOption {
  return VASE_OPTIONS.find(option => option.id === id) ?? VASE_OPTIONS[0];
}
