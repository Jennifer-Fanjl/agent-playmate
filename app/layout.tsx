import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "陪玩 Agent",
  description: "会倾听、会推荐游戏，也能和机械臂协作的语音陪玩伙伴。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
