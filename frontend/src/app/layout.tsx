import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CREP AI",
  description: "AI 기반 웹사이트·앱 빌더 SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
