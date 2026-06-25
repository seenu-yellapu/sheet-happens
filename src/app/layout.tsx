import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileMenu from "@/components/ProfileMenu";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-zinc-900">
        <header style={{ backgroundColor: "#2f2f2f" }}>
          <div className="max-w-5xl mx-auto px-6 h-14 grid grid-cols-3 items-center">
            <Link href="/events" className="text-base font-bold tracking-tight text-white">
              SheetHappens
            </Link>
            {user && (
              <nav className="flex items-center justify-center gap-6">
                <Link href="/events" className="text-sm text-white/70 hover:text-white transition-colors">
                  Events
                </Link>
                <Link href="/templates" className="text-sm text-white/70 hover:text-white transition-colors">
                  Templates
                </Link>
              </nav>
            )}
            {user && (
              <div className="flex justify-end">
                <ProfileMenu />
              </div>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
