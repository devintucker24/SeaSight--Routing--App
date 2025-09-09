/**
 * Root Layout Component
 *
 * This is the main layout component for the My Study App.
 * It provides the HTML structure, fonts, and global styles for all pages.
 * The layout includes:
 * - Font loading (Geist Sans and Geist Mono)
 * - Global CSS imports
 * - HTML document structure
 * - Metadata for SEO
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";

// Load Geist Sans font for body text
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono font for code and monospace text
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Application metadata for SEO and browser tabs
export const metadata: Metadata = {
  title: "My Study App",
  description: "Your comprehensive learning companion with AI tutoring, question banks, flash cards, and memory techniques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
