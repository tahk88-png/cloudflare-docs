import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rentbox.ee - Tööriistad 24/7",
  description: "Rendi tööriistad ainult siis, kui vaja. 24/7 juurdepääs nutikast kapist.",
  keywords: ["tööriistade rent", "tööriist", "rent", "24/7", "Eesti"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="et">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
