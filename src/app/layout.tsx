import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
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
        <header className="border-b border-zinc-100">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/events" className="text-xl font-bold tracking-tight text-[#2a5bd7]">
              SheetHappens
            </Link>
            {user && (
              <div className="flex items-center gap-5">
                <Link href="/templates" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
                  Templates
                </Link>
                <SignOutButton email={user.email ?? ""} />
              </div>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
