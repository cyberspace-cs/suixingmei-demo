import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreHydrator } from "@/components/shell/store-hydrator";

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "随行美 · AI 跟妆助手",
  description: "从一张灵感照片，到适合你的专属妆容。上传参考妆和自拍，AI 按你的脸型一步步陪你化完。",
};

export const viewport: Viewport = {
  themeColor: "#f6f3fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerif.variable} ${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider delay={300}>
          <StoreHydrator />
          {children}
          <Toaster theme="light" position="top-center" richColors={false} />
        </TooltipProvider>
      </body>
    </html>
  );
}
