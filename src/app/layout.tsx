import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arus — Keuangan Pribadi",
  description: "Buku kas pribadi: kategori otomatis, multi-dompet, budget, utang-piutang, laporan PDF. Privat, gratis, tanpa akun.",
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
