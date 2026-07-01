import type { Metadata } from "next";
import "./globals.css";
import { ComparisonTray } from "@/components/ComparisonTray";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  metadataBase: new URL("https://tasselcost.com"),
  title: {
    default: "Tassel CO$T — Free College Cost Comparison & Student Loan Calculator",
    template: "%s | Tassel CO$T",
  },
  description:
    "Compare costs from 6,500+ colleges using official Department of Education data. Free loan calculator, ROI analysis, and guides to financial aid, scholarships, and student loans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-brand-gray-50 text-brand-black">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ComparisonTray />
      </body>
    </html>
  );
}
