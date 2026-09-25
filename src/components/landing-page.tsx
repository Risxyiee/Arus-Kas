'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════
   Arus Landing Page — Human-crafted, warm, opinionated
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

/* ── Arrow SVG ── */
const ArrowSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ── FAQ data (trimmed to 4) ── */
const FAQ_DATA = [
  {
    q: 'Data saya dikirim ke internet?',
    a: 'Nggak. Arus jalan sepenuhnya di browser dan simpan data di penyimpanan lokal perangkatmu. Nggak ada server, nggak ada akun, nggak ada yang terkirim. Kamu bisa pakai dalam mode pesawat sekalipun.',
  },
  {
    q: 'Kalau hapus cache browser, datanya hilang?',
    a: 'Betul, itu konsekuensinya kalau nggak backup. Makanya ada fitur "Unduh backup JSON" di Pengaturan — satu klik, seluruh data aman. Impor kembali kapan pun, di perangkat mana pun.',
  },
  {
    q: 'Bisa dipakai di HP?',
    a: 'Bisa banget. Semua halaman responsif, menu samping otomatis jadi layar geser di layar kecil. Tidak perlu install apa-apa.',
  },
  {
    q: 'Gratis sampai kapan?',
    a: 'Selamanya. Nggak ada langganan, nggak ada fitur premium tersembunyi. Ini satu berkas HTML yang kamu punya penuh.',
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
  /* ── State ── */
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoInput, setDemoInput] = useState('');
  const [userTyped, setUserTyped] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);

  const demoInputRef = useRef<HTMLInputElement>(null);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Nav scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((x) => {
        if (x.isIntersecting) {
          x.target.classList.add('in');
          io.unobserve(x.target);
        }
      }),
      { threshold: 0.12 }
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

  /* ── Demo input change handler ── */
  const handleDemoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserTyped(true);
    setDemoInput(val);
    runDemoResult(val);
  };

  /* ── FAQ toggle ── */
  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  /* ── Smooth scroll for anchor links ── */
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
      {/* ═══ NAV ═══ */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap navin">
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
            style={{ padding: '10px 18px' }}
            onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
          >
            Buka Aplikasi
          </a>
          <button
            className="menu-btn"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ≡
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <header className="hero" id="top">
        <div className="wrap">
          <div className="hero-grid">
            {/* Left: Name, tagline, demo */}
            <div className="hero-text">
              <h1 className="hero-name">
                <span className="line">Arus.</span>
                <span className="line" style={{ color: 'var(--accent)', fontSize: 'clamp(22px, 3.2vw, 32px)', fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.4, marginTop: 8 }}>
                  Catat uang di browser. Hilang kalau hapus cache.
                </span>
              </h1>
              <p className="hero-tagline">
                Ketik <span className="mono" style={{ color: 'var(--accent2)' }}>kopi 35rb</span>, langsung kecatat. Nggak perlu login, nggak ada cloud, nggak ada yang pegang data selain kamu. Tersimpan di browser — satu device, satu kendali.
              </p>
              <div className="hero-cta">
                <a
                  className="btn btn-accent"
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
                >
                  Coba ketik transaksi pertama <ArrowSvg />
                </a>
                <a className="btn btn-ghost" href="#cara" onClick={(e) => handleNavClick(e, '#cara')}>
                  Lihat cara kerjanya
                </a>
              </div>

              {/* Demo input right in the hero */}
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

            {/* Right: App preview — transaction list */}
            <div className="hero-preview">
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
      </header>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="cara" className="lp-section" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="reveal">
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 480, fontSize: 'clamp(26px, 3.5vw, 36px)', lineHeight: 1.15, letterSpacing: '-.01em' }}>
              Tiga langkah. Nggak lebih.
            </h2>
            <p style={{ color: 'var(--mut)', fontSize: 15, marginTop: 8, fontWeight: 500 }}>
              Nggak perlu setting apa-apa. Tulis, simpan, selesai.
            </p>
          </div>
          <div className="how-grid">
            <div className="how-step reveal">
              <div className="how-num">01</div>
              <div className="how-icon">✏️</div>
              <h3>Tulis</h3>
              <p>Ketik aja apa yang kamu beli atau terima. <span className="mono" style={{ fontSize: 12, color: 'var(--accent2)' }}>kopi 35rb</span>, <span className="mono" style={{ fontSize: 12, color: 'var(--accent2)' }}>gaji 8,5jt</span> — pokoknya natural.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-step reveal" style={{ transitionDelay: '.1s' }}>
              <div className="how-num">02</div>
              <div className="how-icon">🏷️</div>
              <h3>Kategori otomatis</h3>
              <p>Arus baca kata kuncinya, langsung masukin ke kategori yang pas. Makanan, transportasi, tagihan — semua ke-handle.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-step reveal" style={{ transitionDelay: '.2s' }}>
              <div className="how-num">03</div>
              <div className="how-icon">✅</div>
              <h3>Simpan</h3>
              <p>Sudah. Nggak ada tombol "simpan", nggak ada form panjang. Satu baris, selesai. Data tinggal di perangkatmu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EXAMPLES ═══ */}
      <section id="contoh" className="lp-section examples-section">
        <div className="wrap">
          <div className="ex-header reveal">
            <h2>
              Biarkan contoh yang <span style={{ color: 'var(--accent)' }}>berbicara</span>.
            </h2>
          </div>
          <div className="ex-list">
            {EXAMPLES.map((ex, idx) => (
              <div
                key={idx}
                className={`ex-card reveal${ex.style ? ` ${ex.style}` : ''}`}
                style={idx > 0 ? { transitionDelay: `${idx * 0.06}s` } : undefined}
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE PITCH ═══ */}
      <section className="lp-section">
        <div className="wrap">
          <div className="pitch-grid">
            <div className="pitch-left reveal">
              <h2>
                Kenapa nggak pakai app <span style={{ color: 'var(--accent)' }}>biasa</span>?
              </h2>
              <p>
                Karena app keuangan "biasa" minta kamu daftar akun, upload KTP, sinkronisasi ke cloud — padahal kamu cuma mau catat beli kopi. Arus nggak. Ini bukan SaaS yang mau datamu. Ini alat yang kamu punya penuh.
              </p>
              <p style={{ color: 'var(--mut)', fontSize: 14, marginTop: 16, fontWeight: 500, fontStyle: 'italic' }}>
                Konsekuensinya: data mati sama device-nya. Kalau hapus cache tanpa backup, ya hilang. Itu bukan bug — itu pilihan desain. Makanya ada backup JSON.
              </p>
              <div className="pitch-points">
                <div className="pitch-point">
                  <span className="icon">🔒</span>
                  <div>
                    <strong>Nggak ada server</strong>
                    <span>Data cuma hidup di browsermu. Bisa dipakai mode pesawat.</span>
                  </div>
                </div>
                <div className="pitch-point">
                  <span className="icon">👤</span>
                  <div>
                    <strong>Nggak ada akun</strong>
                    <span>Buka, pakai, selesai. Nggak perlu email, nggak perlu password.</span>
                  </div>
                </div>
                <div className="pitch-point">
                  <span className="icon">📦</span>
                  <div>
                    <strong>Backup JSON — datamu, kendalimu</strong>
                    <span>Unduh satu file, impor ke perangkat lain. Kamu yang pegang kendali.</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pitch-right reveal" style={{ transitionDelay: '.15s' }}>
              <div className="label">Prinsip</div>
              <p>
                "Kalau app keuangan minta akses ke email dan lokasimu, app itu bukan buku kas — app itu data harvester."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="pricing-section reveal">
        <div className="wrap">
          <div className="pricing-label">Harga</div>
          <div className="pricing-amount">Rp 0</div>
          <div className="pricing-per">Selamanya.</div>
          <div className="pricing-desc">
            Semua fitur, semua halaman, tanpa iklan, tanpa langganan tersembunyi. Nggak ada catch — cuma alat yang kamu butuhin.
          </div>
          <div className="pricing-cta">
            <a
              className="btn btn-accent"
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
            >
              Buka Aplikasi <ArrowSvg />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="lp-section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 8 }}>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 480, fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-.01em' }}>
              Yang biasa ditanyain
            </h2>
          </div>
          <div className="faq reveal" style={{ transitionDelay: '.08s' }}>
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

      {/* ═══ CTA FINAL ═══ */}
      <section className="lp-section final" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="wrap reveal">
          <h2>
            Uangmu, <span style={{ color: 'var(--accent)' }}>aturanmu</span>.
          </h2>
          <p className="sub">Buka aplikasinya, catat transaksi pertamamu. Nggak perlu daftar, nggak perlu nunggu.</p>
          <a
            className="btn btn-accent"
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
          >
            Buka Arus <ArrowSvg />
          </a>
          <span className="mini">tanpa server · tanpa akun · data tetap di perangkatmu</span>
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
                Buku kas pribadi yang nggak nyuruh kamu buat akun.
              </div>
            </div>
            <a
              className="footer-link"
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
            >
              Buka Aplikasi →
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
