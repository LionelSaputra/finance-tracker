import type { Metadata, Viewport } from "next";
import { Archivo_Narrow } from "next/font/google";
import "./globals.css";

const narrow = Archivo_Narrow({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-archivo-narrow" });

export const metadata: Metadata = {
  title: "Finance",
  description: "Catatan keuangan pribadi",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#fbfaf6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`h-full antialiased ${narrow.variable}`}>
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
