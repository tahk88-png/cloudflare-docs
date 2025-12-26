import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Demo App",
  description: "Locker rental demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-background antialiased">
        <nav className="border-b bg-white sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Demo App
            </Link>
            <div className="flex gap-4">
              <Link href="/tools">
                <Button variant="ghost">Tööriistad</Button>
              </Link>
              <Link href="/cart">
                <Button variant="ghost">Ostukorv</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost">Armatuurlaud</Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline">Admin</Button>
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
