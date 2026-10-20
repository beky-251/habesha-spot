import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HabeshaSpot — Discover Your Next Favorite Spot",
    template: "%s | HabeshaSpot",
  },
  description:
    "Discover restaurants, cafés, hotels, shops, and local businesses across Ethiopia with HabeshaSpot.",
  applicationName: "HabeshaSpot",
  keywords: [
    "HabeshaSpot",
    "Ethiopia",
    "local businesses",
    "restaurants",
    "cafés",
    "hotels",
    "business directory",
    "ኢትዮጵያ",
    "የአካባቢ ንግዶች",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}