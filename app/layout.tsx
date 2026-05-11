import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bordermath",
  description: "Bordermath",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0F1117] antialiased">{children}</body>
    </html>
  );
}
