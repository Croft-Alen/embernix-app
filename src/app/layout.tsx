import type { Metadata } from "next";
import {
  Inter,
  Plus_Jakarta_Sans,
} from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Embernix",
    template: "%s | Embernix",
  },
  description:
    "Manage your Embernix products, projects, orders, invoices, and support.",
  applicationName: "Embernix",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plusJakartaSans.variable}`}
      >
        {children}
      </body>
    </html>
  );
}