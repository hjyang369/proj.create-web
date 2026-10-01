import type { Metadata } from "next";
import { AppNavSlot } from "@/widgets/app-nav";
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
      <body className="flex min-h-full flex-col bg-white text-gray-900 antialiased">
        <AppNavSlot />
        {children}
      </body>
    </html>
  );
}
