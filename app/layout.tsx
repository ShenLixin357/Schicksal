import type { Metadata } from "next";
import "./globals.css";
import "./navigation-layout.css";

export const metadata: Metadata = {
  title: "Schicksal — 天命第一帝国",
  description: "天命第一帝国数字政府与公民系统。",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
