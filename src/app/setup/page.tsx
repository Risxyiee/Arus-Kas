'use client'

import { useState } from 'react'

export default function SetupPage() {
  const [anonKey, setAnonKey] = useState('')
  const [serviceKey, setServiceKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [serviceStatus, setServiceStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [serviceMessage, setServiceMessage] = useState('')

  const testAnonKey = async () => {
    if (!anonKey.trim()) { setMessage('Masukkan Anon Key'); return }
    setStatus('testing')
    setMessage('')
    try {
      const res = await fetch('https://evntvbqrprizgqogjyva.supabase.co/auth/v1/settings', {
        headers: { apikey: anonKey.trim() }
      })
      if (res.ok) {
        setStatus('success')
        setMessage('✅ Anon Key valid! Supabase terhubung.')
      } else {
        const data = await res.json()
        setStatus('error')
        setMessage('❌ Key tidak valid: ' + (data.message || data.error || 'HTTP ' + res.status))
      }
    } catch (e) {
      setStatus('error')
      setMessage('❌ Gagal terhubung ke Supabase: ' + (e instanceof Error ? e.message : 'Network error'))
    }
  }

  const testServiceKey = async () => {
    if (!serviceKey.trim()) { setServiceMessage('Masukkan Service Key'); return }
    setServiceStatus('testing')
    setServiceMessage('')
    try {
      const res = await fetch('https://evntvbqrprizgqogjyva.supabase.co/rest/v1/profiles?select=id&limit=1', {
        headers: {
          apikey: anonKey.trim(),
          Authorization: 'Bearer ' + serviceKey.trim()
        }
      })
      if (res.ok || res.status === 200) {
        setServiceStatus('success')
        setServiceMessage('✅ Service Key valid! Akses admin OK.')
      } else {
        const data = await res.json()
        setServiceStatus('error')
        setServiceMessage('❌ Key tidak valid: ' + (data.message || data.error || 'HTTP ' + res.status))
      }
    } catch (e) {
      setServiceStatus('error')
      setServiceMessage('❌ Gagal test Service Key: ' + (e instanceof Error ? e.message : 'Network error'))
    }
  }

  const saveConfig = async () => {
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonKey: anonKey.trim(), serviceKey: serviceKey.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('✅ Konfigurasi tersimpan! Muat ulang halaman untuk menerapkan.')
        setTimeout(() => window.location.href = '/', 2000)
      } else {
        setMessage('❌ Gagal menyimpan: ' + data.error)
      }
    } catch (e) {
      setMessage('❌ Gagal menyimpan: ' + (e instanceof Error ? e.message : 'Error'))
    }
  }

  return (
    <div style={{
      maxWidth: 640,
      margin: '60px auto',
      padding: '0 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#242019'
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #E2DCCC',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 12px 32px rgba(30,27,21,0.10)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>⚙️</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Setup Arus Kas</h1>
        </div>
        <p style={{ color: '#8B8471', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Supabase belum dikonfigurasi. Login &amp; sinkronisasi cloud membutuhkan kunci API dari Supabase.
        </p>

        <div style={{
          background: '#DFF0E6',
          border: '1px solid #0E7B4F',
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#0E7B4F' }}>📝 Cara mendapatkan kunci API:</strong><br />
          1. Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" style={{ color: '#0E7B4F', fontWeight: 600 }}>Supabase Dashboard</a><br />
          2. Pilih project <code style={{ background: '#F4F1E8', padding: '1px 4px', borderRadius: 3 }}>evntvbqrprizgqogjyva</code><br />
          3. Klik <strong>Settings → API → Project API keys</strong><br />
          4. Copy <strong>anon public</strong> key &amp; <strong>service_role</strong> key
        </div>

        {/* Anon Key */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: '#8B8471',
            marginBottom: 6
          }}>
            SUPABASE_ANON_KEY (publik — aman untuk browser)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              style={{
                flex: 1,
                border: '1px solid #E2DCCC',
                background: '#fff',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'ui-monospace, monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={testAnonKey}
              disabled={status === 'testing'}
              style={{
                background: '#242019',
                color: '#F4F1E8',
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: status === 'testing' ? 'wait' : 'pointer',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {status === 'testing' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {message && (
            <div style={{ marginTop: 6, fontSize: 13, color: status === 'success' ? '#0E7B4F' : '#C14E33' }}>
              {message}
            </div>
          )}
        </div>

        {/* Service Key */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: '#8B8471',
            marginBottom: 6
          }}>
            SUPABASE_SERVICE_ROLE_KEY (rahasia — hanya server)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={serviceKey}
              onChange={e => setServiceKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              style={{
                flex: 1,
                border: '1px solid #E2DCCC',
                background: '#fff',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'ui-monospace, monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={testServiceKey}
              disabled={serviceStatus === 'testing' || !anonKey.trim()}
              style={{
                background: '#242019',
                color: '#F4F1E8',
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: serviceStatus === 'testing' ? 'wait' : 'pointer',
                whiteSpace: 'nowrap' as const,
                opacity: !anonKey.trim() ? 0.5 : 1,
              }}
            >
              {serviceStatus === 'testing' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {serviceMessage && (
            <div style={{ marginTop: 6, fontSize: 13, color: serviceStatus === 'success' ? '#0E7B4F' : '#C14E33' }}>
              {serviceMessage}
            </div>
          )}
        </div>

        <button
          onClick={saveConfig}
          disabled={status !== 'success' || (serviceKey.trim() && serviceStatus !== 'success')}
          style={{
            width: '100%',
            background: (status === 'success' && (!serviceKey.trim() || serviceStatus === 'success')) ? '#0E7B4F' : '#8B8471',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 700,
            cursor: (status === 'success' && (!serviceKey.trim() || serviceStatus === 'success')) ? 'pointer' : 'not-allowed',
          }}
        >
          Simpan &amp; Terapkan
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: '#8B8471', textAlign: 'center' as const }}>
          <a href="/" style={{ color: '#0E7B4F' }}>← Kembali ke Beranda</a>
        </div>
      </div>
    </div>
  )
}
