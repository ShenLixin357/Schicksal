export type ArchiveChapter = { id: string; lesson: string; title: string; source: string; version: string; note: string };

export const ARCHIVE_BOOK_CHAPTERS: ArchiveChapter[] = [
  { id: "lesson-1", lesson: "LESSON 1 · 第一课", title: "我们究竟在建立什么？", source: "/archives/how-to-build-a-state-lesson-1.md", version: "v1.1", note: "国家、领土、政府、行政权、宪法与主权" },
  { id: "lesson-2-a", lesson: "LESSON 2 · 第二课上", title: "谁是“我们的人”，谁又有权决定什么？", source: "/archives/how-to-build-a-state-lesson-2-a.md", version: "v1.1", note: "公民身份、年龄政治权利与低龄自治" },
  { id: "lesson-2-b", lesson: "LESSON 2 · 第二课下", title: "如果家人犯了错，国家应该怎样让他回来？", source: "/archives/how-to-build-a-state-lesson-2-b.md", version: "v1.0", note: "政治权利暂停、恢复与共同体身份" },
];

