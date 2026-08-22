import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "sonner";
import { Providers } from "@/contexts/Providers";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${nunito.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
        <Sonner position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
