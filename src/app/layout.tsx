import type { Metadata } from "next";
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
],
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return ( <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>
);
}
