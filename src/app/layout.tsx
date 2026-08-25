import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "sonner";
import { Providers } from "@/contexts/Providers";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoAuction — Управление японскими аукционными лотами",
  description:
    "Веб-приложение для автоматизации работы с японскими автомобильными аукционами: добавление лотов, отправка заявок, учёт выигрышей и управление доставкой.",
  keywords: ["AutoAuction", "японские аукционы", "автомобили", "лоты", "доставка"],
  authors: [{ name: "AutoAuction" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#F7F6F3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Sonner position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
