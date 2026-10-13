import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goalcryst CRM - TCL",
  description: "Goalcryst CRM - Tata Capital Limited",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" style={{ colorScheme: "dark" }}>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
