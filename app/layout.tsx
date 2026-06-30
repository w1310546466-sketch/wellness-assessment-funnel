import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wellness Assessment Funnel",
  description: "A full-stack health assessment funnel with anonymous progress recovery and mock subscription unlock."
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
