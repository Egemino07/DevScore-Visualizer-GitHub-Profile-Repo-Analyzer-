import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://devscore-visualizer.vercel.app"
  ),
  title: "DevScore Visualizer — GitHub Profile & Repo Analyzer",
  description:
    "Analyze any GitHub username or repo: compute a 0-100 DevScore, visualize activity metrics, and generate shareable README/social cards.",
  openGraph: {
    title: "DevScore Visualizer",
    description: "Compute your DevScore and generate shareable developer cards.",
    images: [{ url: "/api/og/torvalds", width: 880, height: 420 }],
  },
  verification: {
    google: "rrIKxSq9-YTVFH-2YlXcZlJhhwP__9eQkjOIJyDzsNs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <div className="ambient-bg" />
        {children}
      </body>
    </html>
  );
}
