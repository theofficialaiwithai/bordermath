import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Bordermath",
  description: "Plan the trip. Do the visa math.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0F1117] antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
