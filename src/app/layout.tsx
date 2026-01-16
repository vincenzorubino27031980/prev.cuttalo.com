import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GateLoader from "@/components/GateLoader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generatore Preventivi AI - Cuttalo",
  description: "Genera preventivi istantanei per taglio laser, stencil, timbri e lavorazioni personalizzate",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={`${inter.variable} antialiased bg-gray-950 min-h-screen`}>
        <GateLoader />
        {children}
      </body>
    </html>
  );
}
