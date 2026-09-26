import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { anonKey, serviceKey } = body as { anonKey?: string; serviceKey?: string }

    if (!anonKey || !anonKey.startsWith('eyJ')) {
      return NextResponse.json({ error: 'Anon Key tidak valid (harus JWT format)' }, { status: 400 })
    }

    // Read current .env
    const envPath = join(process.cwd(), '.env')
    let envContent = ''
    try {
      envContent = readFileSync(envPath, 'utf-8')
    } catch {
      envContent = ''
    }

    // Update or add the keys
    const lines = envContent.split('\n')
    let foundAnon = false
    let foundService = false

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        lines[i] = `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`
        foundAnon = true
      }
      if (lines[i].startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        if (serviceKey && serviceKey.startsWith('eyJ')) {
          lines[i] = `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`
          foundService = true
        }
      }
    }

    if (!foundAnon) {
      lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`)
    }
    if (!foundService && serviceKey && serviceKey.startsWith('eyJ')) {
      lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`)
    }

    writeFileSync(envPath, lines.join('\n'), 'utf-8')

    // Update process.env for current session (won't persist across restarts but helps immediately)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
    if (serviceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey

    return NextResponse.json({ ok: true, message: 'Konfigurasi tersimpan. Muat ulang halaman untuk menerapkan.' })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi: ' + (e instanceof Error ? e.message : 'Error') }, { status: 500 })
  }
}
