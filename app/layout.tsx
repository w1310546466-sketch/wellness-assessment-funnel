import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruiqi Wellness Estimate",
  description: "A full-stack health assessment funnel challenge implementation."
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

