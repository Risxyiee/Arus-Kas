import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arus — Keuangan Pribadi",
  description: "Arus — Aplikasi Keuangan Pribadi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
