// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css"; // Tailwind stijlen

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bitcoindevil_trading_signals",
  description: "Tradiing signals from Bitcoindevil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${inter.className} bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-gray-100`}
      >
        {/* Header met zwarte gradient achtergrond */}
        <header className="bg-gradient-to-b from-black to-neutral-800 text-white p-6 shadow-md">
          <div className="container mx-auto flex items-center">
            <Image
              src="/devil_full_white.png" // Replace with your logo's path in the /public directory
              alt="Logo"
              width={300} // Adjust to your logo's width
              height={80} // Adjust to your logo's height
              priority
            />
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}