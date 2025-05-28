// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Tailwind stijlen
import Header from './components/Header'; // Import the Header

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bitcoindevil_signals",
  description: "Dashboard for viewing and managing trading signals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* The className on the body likely controls the overall theme (dark/light) for globals.css */}
      {/* For now, our Header makes its own assumption for styling. True global theme state would be better. */}
      <body className={`${inter.className} bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-gray-100`}>
        <Header /> {/* Our new navigation header */}
        <main>{children}</main> 
      </body>
    </html>
  );
}