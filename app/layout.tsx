import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tasslecost.com"),
  title: {
    default: "TassleCost — Is Your College Worth It?",
    template: "%s | TassleCost",
  },
  description:
    "Compare real costs and salary outcomes for 7,000+ colleges. Find out if your degree pays off before you sign.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-brand-gray-50 text-brand-black">
        {children}
      </body>
    </html>
  );
}
