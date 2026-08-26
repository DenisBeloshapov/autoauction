import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "sonner";
import { Providers } from "@/contexts/Providers";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
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
  keywords: [
    "AutoAuction",
    "японские аукционы",
    "автомобили",
    "лоты",
    "доставка",
  ],
  authors: [{ name: "AutoAuction" }],
};

// Disable iOS auto-zoom on input focus (font-size < 16px triggers zoom).
// Also prevent pinch-zoom — this is an app-like UI, not a content page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${playfair.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Sonner position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
