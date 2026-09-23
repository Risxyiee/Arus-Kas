'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════
   Arus Landing Page Component
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ── Marquee content ── */
const MARQUEE_TEXT = 'Kategori otomatis ✦ Saldo real-time ✦ Kartu piutang PDF ✦ Statistik pengeluaran ✦ Mode gelap ✦ Backup JSON ✦ Laporan bulanan ✦ Tanpa akun ✦';

/* ── FAQ data ── */
const FAQ_DATA = [
  {
    q: 'Apakah data saya dikirim ke internet?',
    a: 'Tidak. Arus berjalan sepenuhnya di browser perangkatmu dan menyimpan data di penyimpanan lokal. Tidak ada server, tidak ada akun, tidak ada pengiriman data. Kamu bahkan bisa memakainya dalam mode pesawat.',
  },
  {
    q: 'Bisa dipakai di ponsel?',
    a: 'Bisa. Seluruh halaman — dashboard sampai laporan PDF — dirancang responsif, dengan menu samping yang berubah menjadi layar geser di layar kecil.',
  },
  {
    q: 'Bagaimana cara backup datanya?',
    a: 'Buka halaman Pengaturan → "Unduh backup JSON". Seluruh profil, transaksi, dan utang-piutang tersimpan dalam satu berkas yang bisa diimpor kembali kapan pun, di perangkat mana pun.',
  },
  {
    q: 'Gratis sampai kapan?',
    a: 'Selamanya. Arus adalah satu berkas HTML yang kamu miliki penuh — tidak ada model langganan, tidak ada fitur premium tersembunyi.',
  },
  {
    q: 'Bisa dipindah ke Supabase atau server nanti?',
    a: 'Bisa. Struktur data Arus sudah mengikuti skema tabel Supabase (transactions dan debts), jadi saat kamu siap naik kelas ke sinkronisasi awan, cukup ganti fungsi penyimpanannya.',
  },
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
  const [counterValues, setCounterValues] = useState([0, 0, 0, 0]);

  const demoInputRef = useRef<HTMLInputElement>(null);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countersObserved = useRef(false);

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
      { threshold: 0.14 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Counter animation ── */
  useEffect(() => {
    const targets = [1, 14, 3, 0];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((x) => {
        if (x.isIntersecting && !countersObserved.current) {
          countersObserved.current = true;
          const t0 = performance.now();
          const dur = 1400;
          const step = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            setCounterValues(targets.map((to) => Math.round(to * e)));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      }),
      { threshold: 0.5 }
    );
    const el = document.getElementById('nums-section');
    if (el) io.observe(el);
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
      {/* Grain overlay */}
      <div className="grain" />

      {/* ═══ NAV ═══ */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap navin">
          <a className="logo" href="#top" onClick={(e) => handleNavClick(e, '#top')}>
            <span className="logomark"><i /></span>Arus<span className="navfree">GRATIS</span>
          </a>
          <div className={`nlinks${menuOpen ? ' open' : ''}`}>
            <a href="#preview" onClick={(e) => handleNavClick(e, '#preview')}>Pratinjau</a>
            <a href="#fitur" onClick={(e) => handleNavClick(e, '#fitur')}>Fitur</a>
            <a href="#demo" onClick={(e) => handleNavClick(e, '#demo')}>Coba Demo</a>
            <a href="#testimoni" onClick={(e) => handleNavClick(e, '#testimoni')}>Testimoni</a>
            <a href="#harga" onClick={(e) => handleNavClick(e, '#harga')}>Harga</a>
            <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
          </div>
          <a
            className="btn btn-gold nav-cta"
            href="#"
            style={{ padding: '11px 20px' }}
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
        <div className="glow g1" />
        <div className="glow g2" />
        <div className="hero-frame" />
        <div className="wrap">
          <span
            className="eyebrow center"
            style={{ opacity: 0, animation: 'rise .8s .05s forwards', transform: 'translateY(16px)' }}
          >
            Buku Kas pribadi · Privat · Tanpa akun
          </span>
          <h1 className="h1big">
            <span className="line">Catat dalam sekejap.</span>
            <span className="line">Kelola dengan <em className="g">kelas</em>.</span>
          </h1>
          <p className="sub">
            Arus mencatat pemasukan, pengeluaran, utang &amp; piutang dengan kategori otomatis —
            secepat menulis catatan, selengkap pembukuan profesional. Semuanya berjalan di perangkatmu.
          </p>
          <div className="hero-cta">
            <a
              className="btn btn-gold"
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
            >
              Buka Aplikasi — Gratis <ArrowSvg />
            </a>
            <a className="btn btn-ghost" href="#fitur" onClick={(e) => handleNavClick(e, '#fitur')}>
              Jelajahi fitur
            </a>
          </div>
          <div className="hero-stats">
            <div className="hstat"><b className="g">±2 dtk</b><span>mencatat 1 transaksi</span></div>
            <div className="hstat"><b className="g">14+</b><span>kategori pintar ID &amp; EN</span></div>
            <div className="hstat"><b className="g">100%</b><span>data di perangkatmu</span></div>
            <div className="hstat"><b className="g">Rp 0</b><span>biaya, selamanya</span></div>
          </div>
        </div>
      </header>

      {/* ═══ MARQUEE ═══ */}
      <div className="marq">
        <div className="marq-in">
          {/* Duplicate content for seamless loop */}
          {[0, 1].map((dup) => (
            <span key={dup}>
              {MARQUEE_TEXT.split(' ✦ ').map((text, i, arr) => (
                <React.Fragment key={`${dup}-${i}`}>
                  {text}
                  {i < arr.length - 1 && <i>✦</i>}
                </React.Fragment>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ PREVIEW ═══ */}
      <section id="preview" className="lp-section">
        <div className="wrap">
          <div className="prev-grid">
            <div className="reveal">
              <span className="eyebrow">Pratinjau</span>
              <h2 className="lp-h2">Satu dasbor,<br /><em className="g">seluruh</em> keuanganmu.</h2>
              <p className="sub" style={{ marginTop: 20 }}>
                Saldo aktif dihitung otomatis dari setiap transaksi. Utang &amp; piutang
                tersinkron — begitu ada pembayaran, buku kas dan statusnya ikut bergerak. Tanpa konfigurasi, langsung terasa rapi.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
                <span className="chip"><i className="cdot" style={{ background: '#C9A962' }} />Saldo real-time</span>
                <span className="chip"><i className="cdot" style={{ background: '#7FC79E' }} />Status lunas otomatis</span>
                <span className="chip"><i className="cdot" style={{ background: '#E08A6D' }} />Peringatan jatuh tempo</span>
              </div>
            </div>
            <div className="reveal" style={{ transitionDelay: '.15s' }}>
              <div className="appwin">
                <div className="float f1"><span className="ok">✓</span><span>Piutang Budi — <b className="mono" style={{ color: 'var(--pos)' }}>LUNAS</b></span></div>
                <div className="float f2"><span className="cat"><i className="cdot" style={{ background: '#3E8FA8' }} /><b>Transportasi</b></span><span><small style={{ display: 'block' }}>gojek 28rb</small></span></div>
                <div className="appbar"><i /><i /><i /></div>
                <div className="appbody">
                  <div className="bal-lbl">Saldo aktif</div>
                  <div className="bal">Rp 12.480.000 <span className="livedot" /></div>
                  <div className="mbars">
                    <div style={{ height: '34%' }} /><div style={{ height: '58%' }} /><div style={{ height: '44%' }} />
                    <div style={{ height: '72%' }} /><div style={{ height: '52%' }} /><div style={{ height: '88%' }} />
                    <div style={{ height: '64%' }} /><div style={{ height: '96%' }} />
                  </div>
                  <div className="trows">
                    <div className="trow"><i className="tdot" style={{ background: '#0E7C55' }} /><span className="n">Gaji bulanan</span><span className="d">Hari ini</span><span className="amt-p mono">+Rp 8.500.000</span></div>
                    <div className="trow"><i className="tdot" style={{ background: '#C7723B' }} /><span className="n">Kopi — cafe lokal</span><span className="d">Kemarin</span><span className="amt-n mono">−Rp 35.000</span></div>
                    <div className="trow"><i className="tdot" style={{ background: '#C14E33' }} /><span className="n">Pembayaran utang — Budi</span><span className="d">2 hari</span><span className="amt-n mono">−Rp 500.000</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FITUR ═══ */}
      <section
        id="fitur"
        className="lp-section"
        style={{ background: 'var(--bg2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="wrap">
          <div className="center reveal">
            <span className="eyebrow center">Fitur</span>
            <h2 className="lp-h2">Dirancang seperti <em className="g">barang mewah</em> —<br />detailnya terasa.</h2>
          </div>
          <div className="feat-grid">
            {[
              { num: 'No. 01', title: 'Input Pintar', desc: 'Tulis "kopi 35rb" — kategori dan jumlah terisi sendiri. Ibarat asisten pribadi yang hafal kebiasaan belanjamu, dalam Bahasa Indonesia maupun Inggris.', delay: '' },
              { num: 'No. 02', title: 'Utang & Piutang', desc: 'Status berjalan sendiri: belum dibayar, sebagian, lunas. Setiap pembayaran langsung mengalir ke buku kas dan saldo diperbarui seketika.', delay: '.08s' },
              { num: 'No. 03', title: 'Kartu PDF per Orang', desc: 'Satu klik: seluruh riwayat tagihan, pembayaran, dan sisa utang seseorang — tercetak rapi dengan baris total. Ahli berkata: ini penghabisan debat "berberapa sisa?".', delay: '.16s' },
              { num: 'No. 04', title: 'Statistik Berkelas', desc: 'Donut komposisi pengeluaran, tren enam bulan, dan lima pengeluaran terbesar. Angka yang tidak hanya benar, tetapi berbicara.', delay: '' },
              { num: 'No. 05', title: 'Laporan PDF', desc: 'Filter per bulan, header mewah, ringkasan terhitung, nomor halaman. Siap dicetak, diarsipkan, atau dikirim ke siapa pun.', delay: '.08s' },
              { num: 'No. 06', title: 'Privat Sejak Desain', desc: 'Tanpa server, tanpa akun, tanpa pelacak. Data keuanganmu tinggal di perangkatmu — bukan di gudang data orang lain.', delay: '.16s' },
            ].map((feat, idx) => (
              <div key={idx} className="feat reveal" style={feat.delay ? { transitionDelay: feat.delay } : undefined}>
                <div className="fnum">{feat.num}</div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DEMO INTERAKTIF ═══ */}
      <section id="demo" className="lp-section">
        <div className="glow" style={{ width: 520, height: 520, top: '10%', left: '50%', transform: 'translateX(-50%)', opacity: .08 }} />
        <div className="wrap">
          <div className="center reveal">
            <span className="eyebrow center">Coba Sekarang</span>
            <h2 className="lp-h2">Rasakan input <em className="g">pintar</em>-nya.</h2>
            <p className="sub">
              Ketik apa saja — misalnya <b className="mono" style={{ color: 'var(--gold2)' }}>gojek ke kantor 28rb</b> —
              dan lihat kategori beserta jumlahnya terbentuk di depan mata.
            </p>
          </div>
          <div className="demo-box reveal" style={{ transitionDelay: '.12s' }}>
            <div className="demo-in">
              <span className="caret" />
              <input
                ref={demoInputRef}
                type="text"
                value={demoInput}
                onChange={handleDemoInput}
                placeholder="kopi susu 35rb"
                maxLength={60}
                aria-label="Coba input pintar"
              />
            </div>
            <div className="demo-res">
              {demoResult && demoInput.trim() && (
                <>
                  <span className="chip">
                    <i className="cdot" style={{ background: demoResult.catColor }} />
                    {demoResult.cat}{' '}
                    <span style={{ color: 'var(--dim)', fontWeight: 600, fontSize: 10, letterSpacing: '.1em' }}>OTOMATIS</span>
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
            <div className="demo-hint">← ketik di atas, atau biarkan kami mendemokan otomatis</div>
          </div>
        </div>
      </section>

      {/* ═══ ANGKA ═══ */}
      <section id="nums-section" className="nums" style={{ padding: '80px 0' }}>
        <div className="wrap num-grid">
          {[
            { val: counterValues[0], suffix: '', label: 'berkas untuk seluruh aplikasi' },
            { val: counterValues[1], suffix: '+', label: 'kategori otomatis ID & EN' },
            { val: counterValues[2], suffix: '', label: 'jenis laporan PDF siap cetak' },
            { val: counterValues[3], suffix: '', label: 'data yang dibagikan ke siapa pun' },
          ].map((n, idx) => (
            <div
              key={idx}
              className="num reveal"
              style={idx > 0 ? { transitionDelay: `${idx * 0.08}s` } : undefined}
            >
              <b className="g">{n.val}{n.suffix}</b>
              <span>{n.label}</span>
              <i />
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONI ═══ */}
      <section id="testimoni" className="lp-section">
        <div className="wrap">
          <div className="center reveal">
            <span className="eyebrow center">Testimoni</span>
            <h2 className="lp-h2">Kata mereka yang <em className="g">sudah tenang</em>.</h2>
          </div>
          <div className="t-grid">
            {[
              { quote: 'Baru tiga minggu pakai Arus, tabungan terlihat jujur untuk pertama kalinya. Grafiknya tidak menyembunyikan apa pun.', initials: 'RA', name: 'Raka Adhitya', role: 'Freelance designer', delay: '' },
              { quote: 'Kartu PDF piutang mengakhiri semua debat "berapa sisa utangmu?". Tinggal kirim file-nya, selesai dengan sopan.', initials: 'SW', name: 'Sinta Wulandari', role: 'Pemilik toko kelontong', delay: '.08s' },
              { quote: 'Inputnya cepat banget, rasanya seperti kirim pesan singkat ke buku kas sendiri. Tidak ada alasan lagi untuk malas mencatat.', initials: 'DP', name: 'Dimas Prakoso', role: 'Analis keuangan', delay: '.16s' },
            ].map((t, idx) => (
              <div key={idx} className="tcard reveal" style={t.delay ? { transitionDelay: t.delay } : undefined}>
                <span className="qm">&ldquo;</span>
                <p>{t.quote}</p>
                <div className="twho">
                  <span className="tava">{t.initials}</span>
                  <div><b>{t.name}</b><span>{t.role}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HARGA ═══ */}
      <section
        id="harga"
        className="lp-section"
        style={{ background: 'var(--bg2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="wrap">
          <div className="center reveal">
            <span className="eyebrow center">Harga</span>
            <h2 className="lp-h2">Satu harga: <em className="g">gratis</em>.<br />Selamanya.</h2>
          </div>
          <div className="price-wrap">
            <div className="pside reveal">
              <h4>Tanpa langganan</h4>
              <p>Tidak ada tagihan tahunan yang menyelinap, tidak ada fitur yang dikunci di balik paywall. Semua halaman terbuka sejak menit pertama.</p>
            </div>
            <div className="pmain reveal" style={{ transitionDelay: '.1s' }}>
              <span className="ptag">PERMANEN</span>
              <div className="price g">Rp 0</div>
              <div className="per">selamanya · semua fitur · semua halaman</div>
              <div className="plist">
                <div><span className="ok">✓</span>Dashboard, transaksi, utang–piutang, statistik, laporan, pengaturan</div>
                <div><span className="ok">✓</span>Kategori otomatis + deteksi jumlah dari deskripsi</div>
                <div><span className="ok">✓</span>Kartu PDF per orang &amp; rekap gabungan</div>
                <div><span className="ok">✓</span>Backup &amp; impor JSON — datamu, kendalimu</div>
                <div><span className="ok">✓</span>Mode gelap &amp; tampilan penuh di ponsel</div>
              </div>
              <a
                className="btn btn-gold"
                href="#"
                onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
              >
                Mulai sekarang
              </a>
              <div className="pnote">Karena datamu milikmu, bukan komoditas.</div>
            </div>
            <div className="pside reveal" style={{ transitionDelay: '.2s' }}>
              <h4>Tanpa iklan</h4>
              <p>Tidak ada banner yang mengganggu, tidak ada data yang dijual. Satu-satunya yang kami minta: catat transaksimu dengan rutin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="lp-section">
        <div className="wrap">
          <div className="center reveal">
            <span className="eyebrow center">FAQ</span>
            <h2 className="lp-h2">Pertanyaan yang <em className="g">sering</em> muncul.</h2>
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

      {/* ═══ CTA AKHIR ═══ */}
      <section className="lp-section final">
        <div className="glow" />
        <div className="wrap reveal">
          <span className="eyebrow center">Mulai malam ini</span>
          <h2 className="lp-h2">Waktunya uangmu <em className="g">tenang</em>.</h2>
          <p className="sub">Tanpa pendaftaran. Tanpa menunggu. Buka aplikasinya, catat transaksi pertamamu, dan rasakan bedanya.</p>
          <a
            className="btn btn-gold"
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}
          >
            Buka Arus — Gratis <ArrowSvg />
          </a>
          <span className="mini">Satu berkas · semua fitur · data tetap di perangkatmu</span>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="wrap">
          <div className="foot">
            <div className="brand">
              <a className="logo" href="#top" onClick={(e) => handleNavClick(e, '#top')}>
                <span className="logomark"><i /></span>Arus
              </a>
              <p>Buku kas pribadi dengan kategori otomatis, kartu utang–piutang, dan laporan PDF. Dibuat dengan teliti, untuk ketenangan finansialmu.</p>
            </div>
            <div className="fcol">
              <b>Navigasi</b>
              <a href="#preview" onClick={(e) => handleNavClick(e, '#preview')}>Pratinjau</a>
              <a href="#fitur" onClick={(e) => handleNavClick(e, '#fitur')}>Fitur</a>
              <a href="#demo" onClick={(e) => handleNavClick(e, '#demo')}>Demo</a>
              <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
            </div>
            <div className="fcol">
              <b>Aplikasi</b>
              <a href="#" onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}>Buka Arus</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}>Laporan</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}>Utang &amp; Piutang</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onOpenApp?.(); }}>Pengaturan</a>
            </div>
            <div className="fcol">
              <b>Prinsip</b>
              <a href="#harga" onClick={(e) => handleNavClick(e, '#harga')}>Gratis selamanya</a>
              <a href="#fitur" onClick={(e) => handleNavClick(e, '#fitur')}>Privat sejak desain</a>
              <a href="#harga" onClick={(e) => handleNavClick(e, '#harga')}>Tanpa iklan</a>
            </div>
          </div>
          <div className="fbot">
            <span>© 2025 ARUS — BUKU KAS PRIBADI</span>
            <span className="mono">SATU BERKAS · TANPA SERVER · TANPA JEJAK</span>
          </div>
        </div>
      </footer>
    </>
  );
}
