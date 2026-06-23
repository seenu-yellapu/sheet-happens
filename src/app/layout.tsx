import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SheetHappens",
  description: "Event file management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-zinc-900">
        <header className="border-b border-zinc-100">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
            <Link href="/events" className="text-xl font-bold tracking-tight text-[#2a5bd7]">
              SheetHappens
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
