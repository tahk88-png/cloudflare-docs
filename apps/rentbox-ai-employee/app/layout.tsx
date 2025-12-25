import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rentbox AI Employee v1.0",
  description: "Chat + automation + admin console"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

