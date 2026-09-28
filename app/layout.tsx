import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Homeio",
  description:
    "Your home server dashboard - manage all your self-hosted services in one place.",
  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a2332",
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark" suppressHydrationWarning={true}>
      <body
        className={`${_inter.variable} ${_geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider><AppProviders>{children}</AppProviders></NextIntlClientProvider>
      </body>
    </html>
  );
}
