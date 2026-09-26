'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════
   Arus Landing — $150k Agency Build
   ═══════════════════════════════════════════════════ */

interface LandingPageProps {
  onOpenApp?: () => void;
}

/* ── Keyword DB for demo ── */
const KW: Record<string, { c: string; k: string[]; inc?: boolean }> = {
  'Makanan & Minuman': { c: '#C7723B', k: ['kopi', 'makan', 'gofood', 'grabfood', 'bakso', 'nasi', 'cafe', 'kafe', 'lunch', 'dinner', 'susu', 'warteg', 'resto', 'snack', 'pizza', 'burger', 'sarapan'] },
  'Transportasi': { c: '#3E8FA8', k: ['gojek', 'grab', 'uber', 'ojek', 'bensin', 'pertamax', 'parkir', 'tol', 'krl', 'mrt', 'bus', 'taksi', 'commuter'] },
  'Belanja': { c: '#A75686', k: ['shopee', 'tokopedia', 'baju', 'uniqlo', 'sepatu', 'belanja', 'mall', 'tas', 'skincare'] },
  'Tagihan': { c: '#B8862F', k: ['listrik', 'pln', 'token', 'internet', 'wifi', 'indihome', 'pulsa', 'pdam', 'bpjs'] },
  'Hiburan': { c: '#7A6BC9', k: ['netflix', 'spotify', 'bioskop', 'game', 'steam', 'konser', 'tiket', 'disney'] },
  'Kesehatan': { c: '#4E9B6E', k: ['apotek', 'obat', 'dokter', 'klinik', 'vitamin', 'gym'] },
  'Pendidikan': { c: '#5A72B8', k: ['kursus', 'les', 'buku', 'spp', 'kuliah', 'kelas'] },
  'Gaji': { c: '#0E7C55', k: ['gaji', 'salary', 'thr', 'upah'], inc: true },
  'Freelance': { c: '#2F9E77', k: ['proyek', 'freelance', 'klien', 'client', 'invoice', 'jasa'], inc: true },
  'Piutang': { c: '#0E7C55', k: ['piutang', 'diterima dari'], inc: true },
  'Cicilan / Utang': { c: '#C14E33', k: ['utang', 'cicilan', 'angsuran', 'pinjam'] },
};

function parseAmt(s: string): number {
  const m = s.toLowerCase().replace(/\s/g, '').match(/(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)(rb|k|jt|juta)?/);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  if (m[2] === 'rb' || m[2] === 'k') n *= 1e3;
  if (m[2] === 'jt' || m[2] === 'juta') n *= 1e6;
  return Math.round(n);
}

const FMT = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

interface DemoResult {
  cat: string;
  catColor: string;
  inc: boolean;
  amt: number;
}

function scanDemo(s: string): DemoResult {
  const sl = s.toLowerCase();
  let cat: string | null = null;
  let catColor = '#6E6757';
  let inc = false;
  for (const [c, v] of Object.entries(KW)) {
    if (v.k.some(k => sl.includes(k))) {
      cat = c;
      catColor = v.c;
      inc = !!v.inc;
      break;
    }
  }
  const amt = parseAmt(s);
  return { cat: cat || (inc ? 'Pemasukan Lain' : 'Lainnya'), catColor, inc, amt };
}

/* ── Premium SVG Line Icons (Phosphor Light style) ── */
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const IconPencil = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
    <path d="M14.5 7.5l3 3" />
  </svg>
);

const IconTag = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);

const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="3.5" />
  </svg>
);

const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
  </svg>
);

/* ── FAQ data ── */
const FAQ_DATA = [
  {
    q: 'Gratis sampai kapan?',
    a: 'Paket Gratis gratis selamanya. Kalau butuh lebih — unlimited dompet, cloud sync, laporan branded — ada Paket Pro Rp 29.000/bulan.',
  },
  {
    q: 'Data saya dikirim ke internet?',
    a: 'Paket Gratis: data hanya di browsermu. Paket Pro: data bisa disinkronkan ke cloud via Supabase (terenkripsi, aman). Kamu pilih sendiri.',
  },
  {
    q: 'Kalau hapus cache browser, datanya hilang?',
    a: 'Paket Gratis: ya, makanya ada backup JSON. Paket Pro: data tersinkron ke cloud, bisa dipulihkan dari perangkat lain.',
  },
  {
    q: 'Bisa dipakai di HP?',
    a: 'Bisa banget. Semua halaman responsif, menu samping otomatis jadi layar geser di layar kecil. Tidak perlu install apa-apa.',
  },
  {
    q: 'Kenapa Rp 29.000/bulan?',
    a: 'Harga ini dirancang untuk UMKM Indonesia — lebih murah dari secangkir kopi per hari, tapi fiturnya lengkap untuk kelola keuangan usaha kecil-menengah. Bayar tahunan hemat 20%.',
  },
  {
    q: 'Bisa pindah paket?',
    a: 'Bisa. Upgrade atau downgrade kapan aja. Kalau downgrade ke Gratis, data Pro-mu tetap ada, cuma akses fitur unlimited yang hilang.',
  },
];

/* ── Examples data ── */
const EXAMPLES = [
  { input: 'kopi susu 35rb', cat: 'Makanan & Minuman', catColor: '#C7723B', amt: 'Rp 35.000', type: 'Pengeluaran', inc: false, style: 'wide' as const },
  { input: 'gojek ke kantor 28rb', cat: 'Transportasi', catColor: '#3E8FA8', amt: 'Rp 28.000', type: 'Pengeluaran', inc: false, style: 'flat' as const },
  { input: 'gaji bulanan 8,5jt', cat: 'Gaji', catColor: '#0E7C55', amt: 'Rp 8.500.000', type: 'Pemasukan', inc: true, style: 'highlight' as const },
  { input: 'token listrik pln 100rb', cat: 'Tagihan', catColor: '#B8862F', amt: 'Rp 100.000', type: 'Pengeluaran', inc: false, style: '' as const },
  { input: 'netflix 186rb', cat: 'Hiburan', catColor: '#7A6BC9', amt: 'Rp 186.000', type: 'Pengeluaran', inc: false, style: 'minimal' as const },
  { input: 'beli baju uniqlo 250rb', cat: 'Belanja', catColor: '#A75686', amt: 'Rp 250.000', type: 'Pengeluaran', inc: false, style: '' as const },
];

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
export default function LandingPage({ onOpenApp }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoInput, setDemoInput] = useState('');
  const [userTyped, setUserTyped] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [cookieConsent, setCookieConsent] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem('arus-cookie')) {
      setCookieConsent(false);
    }
  }, []);

  const demoInputRef = useRef<HTMLInputElement>(null);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Cursor glow tracking ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      setGlowPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    hero.addEventListener('mousemove', onMove, { passive: true });
    return () => hero.removeEventListener('mousemove', onMove);
  }, []);

  /* ── Tilt effect on app preview ── */
  useEffect(() => {
    const shell = document.querySelector('.appwin-shell');
    if (!shell) return;
    const onMove = (e: MouseEvent) => {
      const rect = shell.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - .5;
      const y = (e.clientY - rect.top) / rect.height - .5;
      (shell as HTMLElement).style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    };
    const onLeave = () => {
      (shell as HTMLElement).style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
      (shell as HTMLElement).style.transition = 'transform .6s cubic-bezier(.32,.72,0,1)';
    };
    const onEnter = () => {
      (shell as HTMLElement).style.transition = 'transform .1s ease-out';
    };
    shell.addEventListener('mousemove', onMove, { passive: true });
    shell.addEventListener('mouseleave', onLeave);
    shell.addEventListener('mouseenter', onEnter);
    return () => {
      shell.removeEventListener('mousemove', onMove);
      shell.removeEventListener('mouseleave', onLeave);
      shell.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((x) => {
        if (x.isIntersecting) {
          x.target.classList.add('in');
          io.unobserve(x.target);
        }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Demo typing animation ── */
  const demoExamples = ['kopi susu 35rb', 'gojek ke kantor 28rb', 'gaji bulanan 8,5jt', 'token listrik 100rb', 'bayar utang budi 500rb'];
  const exampleIdxRef = useRef(0);

  const runDemoResult = useCallback((s: string) => {
    if (s.trim()) {
      setDemoResult(scanDemo(s));
    } else {
      setDemoResult(null);
    }
  }, []);

  useEffect(() => {
    if (userTyped) return;

    const typeLoop = () => {
      if (userTyped) return;
      const s = demoExamples[exampleIdxRef.current];
      let i = 0;

      const type = () => {
        if (userTyped) return;
        i++;
        const val = s.slice(0, i);
        setDemoInput(val);
        runDemoResult(val);
        if (i < s.length) {
          typeTimerRef.current = setTimeout(type, 55 + Math.random() * 50);
        } else {
          typeTimerRef.current = setTimeout(() => {
            if (userTyped) return;
            const del = () => {
              if (userTyped) return;
              i--;
              const val2 = s.slice(0, i);
              setDemoInput(val2);
              runDemoResult(val2);
              if (i > 0) {
                typeTimerRef.current = setTimeout(del, 22);
              } else {
                exampleIdxRef.current = (exampleIdxRef.current + 1) % demoExamples.length;
                typeTimerRef.current = setTimeout(typeLoop, 450);
              }
            };
            del();
          }, 2100);
        }
      };
      type();
    };

    typeTimerRef.current = setTimeout(typeLoop, 1600);

    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    };
  }, [userTyped, runDemoResult]);

  const handleDemoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserTyped(true);
    setDemoInput(val);
    runDemoResult(val);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      setMenuOpen(false);
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* ═══ Cookie Consent ═══ */}
      {!cookieConsent && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#242019', color: '#F4F1E8',
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap', justifyContent: 'center', fontSize: 13,
          boxShadow: '0 -4px 20px rgba(0,0,0,.3)'
        }}>
          <span>🍪 Kami gunakan cookie untuk preferensi & analitik. <a href="/privacy.html" style={{ color: '#63D6A0', textDecoration: 'underline' }}>Pelajari</a></span>
          <button onClick={() => { setCookieConsent(true); localStorage.setItem('arus-cookie', '1'); }} style={{
            background: '#0E7B4F', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>Terima</button>
          <button onClick={() => { setCookieConsent(true); localStorage.setItem('arus-cookie', '0'); }} style={{
            background: 'transparent', color: '#F4F1E8', border: '1px solid #9B947F',
            borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer'
          }}>Tolak</button>
        </div>
      )}
      {/* ═══ NAV — Floating Glass Pill ═══ */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-pill">
          <div className="navin">
            <a className="logo" href="#top" onClick={(e) => handleNavClick(e, '#top')}>
              <span className="logomark"><i /></span>Arus
            </a>
            <div className={`nlinks${menuOpen ? ' open' : ''}`}>
              <a href="#cara" onClick={(e) => handleNavClick(e, '#cara')}>Cara kerja</a>
              <a href="#contoh" onClick={(e) => handleNavClick(e, '#contoh')}>Contoh</a>
              <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
            </div>
            <a
              className="btn btn-accent nav-cta"
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
            >
              Buka
              <span className="btn-icon"><ArrowIcon /></span>
            </a>
            <button
              className="menu-btn"
              aria-label="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ≡
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <header className="hero" id="top" ref={heroRef}>
        <div className="hero-glow" style={{ left: glowPos.x, top: glowPos.y }} />

        {/* 3D Geometric Shapes */}
        <div className="geo-3d" style={{ top: '18%', left: '5%' }}>
          <div className="geo-ring" />
        </div>
        <div className="geo-3d" style={{ top: '60%', right: '8%' }}>
          <div className="geo-ring-2" />
        </div>
        <div className="geo-3d" style={{ top: '35%', right: '3%' }}>
          <div className="geo-diamond" />
        </div>

        {/* 3D Parallax Orbs */}
        <div className="parallax-orb orb-float-1" style={{ top: '10%', left: '60%' }} />
        <div className="parallax-orb orb-float-2" style={{ bottom: '20%', left: '15%' }} />

        {/* 3D Perspective Grid */}
        <div className="perspective-grid" />

        <div className="wrap">
          <div className="hero-grid">
            {/* Left: Name, tagline, demo */}
            <div className="hero-text">
              <div className="eyebrow" style={{ opacity: 0, animation: 'heroRise 1s .05s cubic-bezier(.16,1,.3,1) forwards', transform: 'translateY(20px)', filter: 'blur(6px)' }}>
                Buku Kas Pribadi
              </div>
              <h1 className="hero-name">
                <span className="line">Arus.</span>
                <span className="line" style={{ color: 'var(--accent)', fontSize: 'clamp(20px, 2.8vw, 28px)', fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.4, marginTop: 12 }}>
                  Buku kas pribadi & UMKM.<br />Gratis untuk mulai, Pro untuk tumbuh.
                </span>
              </h1>
              <p className="hero-tagline">
                Ketik <span className="mono" style={{ color: 'var(--accent2)' }}>kopi 35rb</span>, langsung kecatat. Catat keuanganmu dengan mudah. Gratis untuk pemula, Pro untuk UMKM yang serius.
              </p>
              <div className="hero-cta">
                <a
                  className="btn btn-accent"
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
                >
                  Coba sekarang
                  <span className="btn-icon"><ArrowIcon /></span>
                </a>
                <a className="btn btn-ghost" href="#cara" onClick={(e) => handleNavClick(e, '#cara')}>
                  Lihat cara kerjanya
                </a>
              </div>

              {/* Trust badges */}
              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-dot" style={{ background: 'var(--pos)' }} />
                  <span>Data di perangkatmu</span>
                </div>
                <div className="trust-item">
                  <span className="trust-dot" style={{ background: 'var(--accent)' }} />
                  <span>Privasi utama</span>
                </div>
                <div className="trust-item">
                  <span className="trust-dot" style={{ background: '#7A6BC9' }} />
                  <span>Mulai gratis</span>
                </div>
              </div>

              {/* Demo input */}
              <div className="hero-demo">
                <div className="demo-in">
                  <span className="caret" />
                  <input
                    ref={demoInputRef}
                    type="text"
                    value={demoInput}
                    onChange={handleDemoInput}
                    placeholder="coba ketik: kopi 35rb"
                    maxLength={60}
                    aria-label="Coba input pintar"
                  />
                </div>
                <div className="demo-res">
                  {demoResult && demoInput.trim() && (
                    <>
                      <span className="chip">
                        <i className="cdot" style={{ background: demoResult.catColor }} />
                        {demoResult.cat}
                      </span>
                      <span className="chip type">
                        {demoResult.inc ? 'Pemasukan ↑' : 'Pengeluaran ↓'}
                      </span>
                      {demoResult.amt > 0 && (
                        <span className="chip amt">{FMT.format(demoResult.amt)}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="demo-hint">ketik di atas, atau biarkan kami mendemokan</div>
              </div>
            </div>

            {/* Right: App preview — Double-Bezel with 3D depth */}
            <div className="hero-preview">
              <div className="hero-depth-stack">
                <div className="depth-card depth-card-2" />
                <div className="depth-card depth-card-1" />
              </div>
              <div className="appwin-shell">
                <div className="appwin">
                  <div className="appbar"><i /><i /><i /></div>
                  <div className="appbody">
                    <div className="bal-lbl">Saldo</div>
                    <div className="bal" style={{ color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--accent)' }}>—</span> tersimpan lokal
                    </div>
                    <div className="trows">
                      <div className="trow">
                        <i className="tdot" style={{ background: '#0E7C55' }} />
                        <span className="n">gaji bulanan 8,5jt</span>
                        <span className="d">Hari ini</span>
                        <span className="amt-p mono">+Rp 8.500.000</span>
                      </div>
                      <div className="trow">
                        <i className="tdot" style={{ background: '#C7723B' }} />
                        <span className="n">kopi susu 35rb</span>
                        <span className="d">Hari ini</span>
                        <span className="amt-n mono">−Rp 35.000</span>
                      </div>
                      <div className="trow">
                        <i className="tdot" style={{ background: '#3E8FA8' }} />
                        <span className="n">gojek ke kantor 28rb</span>
                        <span className="d">Kemarin</span>
                        <span className="amt-n mono">−Rp 28.000</span>
                      </div>
                      <div className="trow">
                        <i className="tdot" style={{ background: '#B8862F' }} />
                        <span className="n">token listrik pln 100rb</span>
                        <span className="d">2 hari lalu</span>
                        <span className="amt-n mono">−Rp 100.000</span>
                      </div>
                      <div className="trow">
                        <i className="tdot" style={{ background: '#C14E33' }} />
                        <span className="n">bayar utang budi 500rb</span>
                        <span className="d">3 hari</span>
                        <span className="amt-n mono">−Rp 500.000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ HOW IT WORKS — Bento Steps ═══ */}
      <section id="cara" className="lp-section" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">Cara Kerja</div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)' }}>
              Tiga langkah. Nggak lebih.
            </h2>
            <p style={{ color: 'var(--mut)', fontSize: 15, marginTop: 12, fontWeight: 500 }}>
              Nggak perlu setting apa-apa. Tulis, simpan, selesai.
            </p>
          </div>
          <div className="how-grid">
            <div className="how-step reveal">
              <div className="inner">
                <div className="how-num">01</div>
                <div className="how-icon"><IconPencil /></div>
                <h3>Tulis</h3>
                <p>Ketik aja apa yang kamu beli atau terima. <span className="mono" style={{ fontSize: 12, color: 'var(--accent2)' }}>kopi 35rb</span>, <span className="mono" style={{ fontSize: 12, color: 'var(--accent2)' }}>gaji 8,5jt</span> — natural.</p>
              </div>
            </div>
            <div className="how-step reveal" style={{ transitionDelay: '.12s' }}>
              <div className="inner">
                <div className="how-num">02</div>
                <div className="how-icon"><IconTag /></div>
                <h3>Kategori otomatis</h3>
                <p>Arus baca kata kuncinya, langsung masukin ke kategori yang pas. Makanan, transportasi, tagihan — semua ke-handle.</p>
              </div>
            </div>
            <div className="how-step reveal" style={{ transitionDelay: '.24s' }}>
              <div className="inner">
                <div className="how-num">03</div>
                <div className="how-icon"><IconCheck /></div>
                <h3>Simpan</h3>
                <p>Sudah. Nggak ada tombol "simpan", nggak ada form panjang. Satu baris, selesai. Data tinggal di perangkatmu.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EXAMPLES — Asymmetrical Bento ═══ */}
      <section id="contoh" className="lp-section examples-section">
        <div className="wrap">
          <div className="ex-header reveal">
            <div className="eyebrow">Contoh Nyata</div>
            <h2>
              Biarkan contoh yang <span style={{ color: 'var(--accent)' }}>berbicara</span>.
            </h2>
          </div>
          <div className="ex-list">
            {EXAMPLES.map((ex, idx) => (
              <div
                key={idx}
                className={`ex-card reveal${ex.style ? ` ${ex.style}` : ''}`}
                style={idx > 0 ? { transitionDelay: `${idx * 0.08}s` } : undefined}
              >
                <div className="inner">
                  <div className="ex-input">
                    <span className="prompt">{'>'}</span> {ex.input}
                  </div>
                  <div className="ex-result">
                    <span className="ex-cat">
                      <i className="cdot" style={{ background: ex.catColor, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                      {ex.cat}
                    </span>
                    <span className="ex-arrow">→</span>
                    <span className={`ex-amt ${ex.inc ? 'pos' : 'neg'}`}>
                      {ex.inc ? '+' : '−'}{ex.amt}
                    </span>
                    <span className="ex-type">{ex.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE PITCH — Editorial Split ═══ */}
      <section className="lp-section">
        <div className="wrap">
          <div className="pitch-grid">
            <div className="pitch-left reveal">
              <div className="eyebrow">Kenapa Arus</div>
              <h2>
                Kenapa nggak pakai app <span style={{ color: 'var(--accent)' }}>biasa</span>?
              </h2>
              <p>
                Karena app keuangan "biasa" minta kamu daftar akun, upload KTP, sinkronisasi ke cloud — padahal kamu cuma mau catat beli kopi. Arus nggak. Ini bukan SaaS yang mau datamu. Ini alat yang kamu punya penuh.
              </p>
              <p style={{ color: 'var(--dim)', fontSize: 13.5, marginTop: 20, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.7 }}>
                Konsekuensinya: data mati sama device-nya. Kalau hapus cache tanpa backup, ya hilang. Itu bukan bug — itu pilihan desain. Makanya ada backup JSON.
              </p>
              <div className="pitch-points">
                <div className="pitch-point">
                  <span className="icon"><IconShield /></span>
                  <div>
                    <strong>Privasi diutamakan</strong>
                    <span>Data Gratis cuma di browsermu. Paket Pro bisa sync ke cloud, tapi kamu yang pegang kendali.</span>
                  </div>
                </div>
                <div className="pitch-point">
                  <span className="icon"><IconUser /></span>
                  <div>
                    <strong>Tanpa ribet</strong>
                    <span>Paket Gratis nggak perlu akun. Paket Pro bisa login untuk sinkronisasi antar perangkat.</span>
                  </div>
                </div>
                <div className="pitch-point">
                  <span className="icon"><IconBox /></span>
                  <div>
                    <strong>Backup JSON — datamu, kendalimu</strong>
                    <span>Unduh satu file, impor ke perangkat lain. Kamu yang pegang kendali.</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="reveal" style={{ transitionDelay: '.15s' }}>
              <div className="pitch-right-shell">
                <div className="pitch-right">
                  <div className="label">Prinsip</div>
                  <p>
                    "Buku kas yang baik nggak nyuruh kamu bayar sebelum kamu merasakan manfaatnya. Gratis dulu, bayar kalau cocok."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="pricing-section reveal">
        <div className="wrap">
          <div className="pricing-label">Harga</div>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)', marginTop: 12, fontWeight: 700 }}>
            Pilih paket yang <span style={{ color: 'var(--accent)' }}>cocok</span>
          </h2>
          <p style={{ color: 'var(--dim)', fontSize: 14, marginTop: 8, fontWeight: 500 }}>
            Gratis untuk mulai. Pro untuk UMKM yang serius.
          </p>
          <div className="pricing-grid">
            {/* GRATIS */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3>Gratis</h3>
                <div className="pricing-card-price">
                  <span className="pricing-card-amount">Rp 0</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li className="pricing-feature"><span className="pf-check" />Transaksi unlimited</li>
                <li className="pricing-feature"><span className="pf-check" />2 dompet</li>
                <li className="pricing-feature"><span className="pf-check" />5 utang/piutang</li>
                <li className="pricing-feature"><span className="pf-check" />3 budget</li>
                <li className="pricing-feature"><span className="pf-check" />3 kategori kustom</li>
                <li className="pricing-feature"><span className="pf-check" />Kategori otomatis</li>
                <li className="pricing-feature"><span className="pf-check" />Backup JSON</li>
                <li className="pricing-feature"><span className="pf-check" />PIN kunci</li>
                <li className="pricing-feature"><span className="pf-check" />Laporan dasar</li>
              </ul>
              <div className="pricing-card-cta">
                <a
                  className="btn btn-ghost"
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
                >
                  Mulai Gratis
                </a>
              </div>
            </div>
            {/* PRO */}
            <div className="pricing-card recommended">
              <div className="pricing-badge">COCOK UMKM</div>
              <div className="pricing-card-header">
                <h3>Pro</h3>
                <div className="pricing-card-price">
                  <span className="pricing-card-amount">Rp 29.000</span>
                  <span className="pricing-card-per">/bln</span>
                </div>
                <div className="pricing-card-annual">Rp 278.400/thn <span className="pricing-save">hemat 20%</span></div>
              </div>
              <ul className="pricing-features">
                <li className="pricing-feature"><span className="pf-check" />Semua fitur Gratis</li>
                <li className="pricing-feature"><span className="pf-check" />Unlimited dompet</li>
                <li className="pricing-feature"><span className="pf-check" />Unlimited utang/piutang</li>
                <li className="pricing-feature"><span className="pf-check" />Unlimited budget & kategori</li>
                <li className="pricing-feature"><span className="pf-check" />Cloud sync</li>
                <li className="pricing-feature"><span className="pf-check" />Laporan P&L (laba-rugi)</li>
                <li className="pricing-feature"><span className="pf-check" />PDF dengan logo usaha</li>
                <li className="pricing-feature"><span className="pf-check" />Transaksi berulang</li>
                <li className="pricing-feature"><span className="pf-check" />Notifikasi push jatuh tempo</li>
                <li className="pricing-feature"><span className="pf-check" />Buat & kirim invoice</li>
              </ul>
              <div className="pricing-card-cta">
                <a
                  className="btn btn-accent"
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
                >
                  Upgrade ke Pro
                  <span className="btn-icon"><ArrowIcon /></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="lp-section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 8 }}>
            <div className="eyebrow">FAQ</div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)' }}>
              Yang biasa ditanyain
            </h2>
          </div>
          <div className="faq reveal" style={{ transitionDelay: '.1s' }}>
            {FAQ_DATA.map((item, idx) => (
              <div key={idx} className={`qa${openFaq === idx ? ' open' : ''}`}>
                <button onClick={() => toggleFaq(idx)}>
                  {item.q}
                  <span className="pm">+</span>
                </button>
                <div
                  className="ans"
                  style={{ maxHeight: openFaq === idx ? 500 : 0 }}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL — Cinematic ═══ */}
      <section className="lp-section final" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap reveal">
          <div className="final-card-shell">
            <div className="final-card">
              <h2>
                Uangmu, <span style={{ color: 'var(--accent)' }}>aturanmu</span>.
              </h2>
              <p className="sub">Buka aplikasinya, catat transaksi pertamamu. Nggak perlu daftar, nggak perlu nunggu.</p>
              <a
                className="btn btn-accent"
                href="#"
                onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
              >
                Buka Arus
                <span className="btn-icon"><ArrowIcon /></span>
              </a>
              <span className="mini">gratis untuk mulai · pro untuk tumbuh · data tetap aman</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">
                <span className="logomark"><i /></span>Arus
              </div>
              <div className="footer-tagline" style={{ marginTop: 6 }}>
                Buku kas pribadi & UMKM. Gratis untuk mulai.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <a
                  className="footer-link"
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
                >
                  Buka Aplikasi →
                </a>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <a className="footer-link" href="/terms.html" style={{ fontSize: 11, opacity: 0.7 }}>Syarat & Ketentuan</a>
                <a className="footer-link" href="/privacy.html" style={{ fontSize: 11, opacity: 0.7 }}>Privasi</a>
                <a className="footer-link" href="/refund.html" style={{ fontSize: 11, opacity: 0.7 }}>Refund</a>
                <a className="footer-link" href="/contact.html" style={{ fontSize: 11, opacity: 0.7 }}>Kontak</a>
                <a className="footer-link" href="/admin.html" style={{ fontSize: 11, opacity: 0.4 }}>Admin</a>
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                © {new Date().getFullYear()} Arus — Riski Akbar P
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
