import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schicksal — 天命第一帝国",
  description: "天命第一帝国数字政府与公民系统。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
