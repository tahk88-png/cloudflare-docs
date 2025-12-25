import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rentbox AI Employee",
  description: "Customer Support Chat Widget and Event-driven Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
