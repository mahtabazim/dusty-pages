import type { Metadata, Viewport } from "next";
import { Jost, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/bottom-nav";

const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "DustyPages — swap books with coins",
    template: "%s · DustyPages",
  },
  description:
    "A community marketplace where readers sell used books for coins and spend them on their next read. No money, just books.",
  applicationName: "DustyPages",
  keywords: [
    "used books",
    "book exchange",
    "sell books",
    "buy second hand books",
    "book marketplace",
    "swap books",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "DustyPages",
    title: "DustyPages — swap books with coins",
    description:
      "Sell used books to readers near you, earn coins, and spend them on your next great read.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "DustyPages — swap books with coins",
    description:
      "Sell used books to readers near you, earn coins, and spend them on your next great read.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c5c3e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
