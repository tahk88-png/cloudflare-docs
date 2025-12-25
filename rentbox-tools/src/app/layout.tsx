import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Tööriistad | Rentbox.ee",
    template: "%s | Rentbox.ee",
  },
  description: "Rendi tööriistu 24/7. Võta kapist, kasuta, tagasta.",
  keywords: ["tööriistade rent", "tööriista laenutus", "Rentbox", "24/7 rent"],
  openGraph: {
    title: "Tööriistad | Rentbox.ee",
    description: "Rendi tööriistu 24/7. Võta kapist, kasuta, tagasta.",
    type: "website",
    locale: "et_EE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
