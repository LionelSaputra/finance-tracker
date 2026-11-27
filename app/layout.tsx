import type { Metadata, Viewport } from "next";
import { Archivo_Narrow } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const narrow = Archivo_Narrow({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-archivo-narrow" });

export const metadata: Metadata = {
  title: "Finance",
  description: "Catatan keuangan pribadi",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#171612" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Per-device choice from Pengaturan → Tampilan; without it the device setting decides.
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="id" data-theme={theme === "light" || theme === "dark" ? theme : undefined} className={`h-full antialiased ${narrow.variable}`}>
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
