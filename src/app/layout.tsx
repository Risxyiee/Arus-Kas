import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arus — Buku Kas Pribadi & UMKM | Gratis + Pro Rp 29.000/bln",
  description: "Catat keuangan pribadi & UMKM: kategori otomatis, multi-dompet, budget, utang-piutang, laporan PDF. Paket Gratis selamanya, Pro Rp 29.000/bulan dengan cloud sync & unlimited fitur.",
  openGraph: {
    title: "Arus — Buku Kas Pribadi & UMKM | Gratis + Pro Rp 29.000/bln",
    description: "Catat keuangan pribadi & UMKM: kategori otomatis, multi-dompet, budget, utang-piutang, laporan PDF. Paket Gratis selamanya, Pro Rp 29.000/bulan dengan cloud sync & unlimited fitur.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
