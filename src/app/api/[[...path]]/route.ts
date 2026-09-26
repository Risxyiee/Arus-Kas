import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering — this is an API route, not a static page
export const dynamic = 'force-dynamic'

// ─── Environment helpers ──────────────────────────────────────────
function getEnv(key: string): string {
  return process.env[key] || ''
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const ADMIN_EMAIL = getEnv('ADMIN_EMAIL') || 'riskiakbarp123@gmail.com'

// ─── JSON response helper ─────────────────────────────────────────
function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// ─── Config check ────────────────────────────────────────────────
function isConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('YOUR_'))
}

// ─── Supabase Auth proxy ─────────────────────────────────────────
async function supabaseAuth(endpoint: string, options: RequestInit): Promise<NextResponse> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      ...(options.headers as Record<string, string> || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) return json({ error: data.error_description || data.msg || data.error || 'Auth gagal' }, res.status)
  return json(data)
}

// ─── Admin Auth Verification ─────────────────────────────────────
async function verifyAdmin(req: NextRequest): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  if (!res.ok) return null
  const user = await res.json() as { id: string; email: string }
  if (user.email !== ADMIN_EMAIL) return null
  return { userId: user.id, email: user.email }
}

// ─── Supabase Admin Client helper ────────────────────────────────
function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    Prefer: 'return=representation',
  }
}

async function sbSelect(table: string, query: string, filters?: Record<string, string>): Promise<{ data: unknown[] | null; error: string | null; count?: number }> {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${query}`
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      url += `&${k}=${encodeURIComponent(v)}`
    }
  }
  const res = await fetch(url, { headers: adminHeaders() })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data.message || data.error || 'Query failed' }
  return { data: data as unknown[], error: null, count: (data as unknown[]).length }
}

async function sbInsert(table: string, body: unknown): Promise<{ data: unknown | null; error: string | null }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...adminHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data.message || data.error || 'Insert failed' }
  return { data, error: null }
}

async function sbUpdate(table: string, body: unknown, filters: Record<string, string>): Promise<{ data: unknown | null; error: string | null }> {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`
  for (const [k, v] of Object.entries(filters)) {
    url += `${k}=${encodeURIComponent(v)}&`
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...adminHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data.message || data.error || 'Update failed' }
  return { data, error: null }
}

// ─── Get email map from auth admin API ───────────────────────────
async function getEmailMap(): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>()
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.startsWith('YOUR_')) return emailMap
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?limit=1000`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_ANON_KEY },
    })
    if (res.ok) {
      const authData = await res.json() as { users: { id: string; email: string }[] }
      for (const u of (authData.users || [])) {
        emailMap.set(u.id, u.email)
      }
    }
  } catch { /* proceed without emails */ }
  return emailMap
}

// ═══════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════

// ─── Auth: Login ──────────────────────────────────────────────────
async function handleLogin(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { email, password } = body as { email: string; password: string }

    if (!email || !password) {
      return json({ error: 'Email dan password wajib diisi' }, 400)
    }

    return await supabaseAuth('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return json({ error: 'Request body tidak valid' }, 400)
  }
}

// ─── Auth: Signup ─────────────────────────────────────────────────
async function handleSignup(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { email, password, name } = body as { email: string; password: string; name?: string }

    if (!email || !password) {
      return json({ error: 'Email dan password wajib diisi' }, 400)
    }

    return await supabaseAuth('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, data: { name: name || 'Saya' } }),
    })
  } catch {
    return json({ error: 'Request body tidak valid' }, 400)
  }
}

// ─── Auth: Me (get current user) ─────────────────────────────────
async function handleAuthMe(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.replace('Bearer ', '')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  const data = await res.json()
  if (!res.ok) return json({ error: data.msg || data.error || 'Token tidak valid' }, res.status)
  return json({ data })
}

// ─── Auth: Logout ────────────────────────────────────────────────
async function handleLogout(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.replace('Bearer ', '')
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  return json({ ok: true })
}

// ─── Admin: Stats ────────────────────────────────────────────────
async function handleAdminStats(): Promise<NextResponse> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [profilesRes, subsRes, recentRes] = await Promise.all([
    sbSelect('profiles', 'id,created_at'),
    sbSelect('subscriptions', 'plan,expires_at'),
    sbSelect('profiles', 'id', { created_at: `gte.${sevenDaysAgo}` }),
  ])

  const totalUsers = (profilesRes.data || []).length
  const subs = (subsRes.data || []) as { plan: string; expires_at: string | null }[]
  const proCount = subs.filter(s => s.plan === 'pro').length
  const freeCount = totalUsers - proCount
  const now = new Date()
  const activePro = subs.filter(s => s.plan === 'pro' && s.expires_at && new Date(s.expires_at) >= now).length
  const expiredPro = subs.filter(s => s.plan === 'pro' && s.expires_at && new Date(s.expires_at) < now).length
  const recentSignups = (recentRes.data || []).length

  return json({
    data: { totalUsers, proCount, freeCount, monthlyRevenue: proCount * 29000, recentSignups, activePro, expiredPro },
  })
}

// ─── Admin: Users ────────────────────────────────────────────────
async function handleAdminUsers(): Promise<NextResponse> {
  const [profilesRes, subsRes] = await Promise.all([
    sbSelect('profiles', '*'),
    sbSelect('subscriptions', 'user_id,plan,started_at,expires_at'),
  ])

  const emailMap = await getEmailMap()
  const profiles = (profilesRes.data || []) as { id: string; user_id?: string; name?: string; created_at: string }[]
  const subsData = (subsRes.data || []) as { user_id: string; plan: string; started_at: string | null; expires_at: string | null }[]

  const subMap = new Map<string, { plan: string; started_at: string | null; expires_at: string | null }>()
  for (const s of subsData) subMap.set(s.user_id, s)

  const users = profiles.map(p => {
    const uid = p.user_id || p.id
    const sub = subMap.get(uid)
    return {
      user_id: uid,
      id: p.id,
      name: p.name || '—',
      email: emailMap.get(uid) || '—',
      plan: sub?.plan || 'free',
      created_at: p.created_at,
    }
  })

  return json({ data: users })
}

// ─── Admin: Subscriptions ────────────────────────────────────────
async function handleAdminSubscriptions(): Promise<NextResponse> {
  const { data, error } = await sbSelect('subscriptions', '*', )
  if (error) return json({ error }, 500)

  const emailMap = await getEmailMap()
  const subs = (data || []).map((s: Record<string, unknown>) => ({
    ...s,
    email: emailMap.get(s.user_id as string) || '—',
  }))

  return json({ data: subs })
}

// ─── Admin: Subscription Update ──────────────────────────────────
async function handleAdminSubscriptionUpdate(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const userId = body.user_id as string
    const plan = body.plan as string
    const expiresAt = body.expires_at as string | undefined

    if (!userId || !plan) return json({ error: 'user_id dan plan required' }, 400)
    if (plan !== 'free' && plan !== 'pro') return json({ error: "Plan harus 'free' atau 'pro'" }, 400)

    // Check existing
    const { data: existing } = await sbSelect('subscriptions', 'id', { user_id: `eq.${userId}` })

    if (existing && existing.length > 0) {
      const updateData: Record<string, unknown> = { plan, started_at: new Date().toISOString() }
      if (plan === 'pro') {
        updateData.expires_at = expiresAt || new Date(Date.now() + 30 * 86400000).toISOString()
      } else {
        updateData.expires_at = null
      }
      const result = await sbUpdate('subscriptions', updateData, { user_id: `eq.${userId}` })
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data })
    } else {
      const insertData: Record<string, unknown> = { user_id: userId, plan }
      if (plan === 'pro') {
        insertData.expires_at = expiresAt || new Date(Date.now() + 30 * 86400000).toISOString()
      }
      const result = await sbInsert('subscriptions', insertData)
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data }, 201)
    }
  } catch {
    return json({ error: 'Request body tidak valid' }, 400)
  }
}

// ─── Admin: Transactions ─────────────────────────────────────────
async function handleAdminTransactions(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  let query = `${SUPABASE_URL}/rest/v1/transactions?select=*&order=occurred_at.desc&offset=${offset}&limit=${limit}`

  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const type = url.searchParams.get('type')
  if (from) query += `&occurred_at=gte.${from}`
  if (to) query += `&occurred_at=lte.${to}`
  if (type) query += `&type=eq.${type}`

  const res = await fetch(query, { headers: adminHeaders() })
  const data = await res.json()
  if (!res.ok) return json({ error: data.message || 'Query failed' }, 500)

  const emailMap = await getEmailMap()
  const txns = (data || []).map((t: Record<string, unknown>) => ({
    ...t,
    user_email: emailMap.get(t.user_id as string) || '—',
  }))

  return json({ data: txns })
}

// ─── Wallets ─────────────────────────────────────────────────────
async function handleWallets(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const userId = url.searchParams.get('user_id')
    if (!userId) return json({ error: 'user_id required' }, 400)
    const { data, error } = await sbSelect('wallets', '*', { user_id: `eq.${userId}` })
    if (error) return json({ error }, 500)
    return json({ data })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const result = await sbInsert('wallets', body)
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data }, 201)
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'id required' }, 400)
    const delUrl = `${SUPABASE_URL}/rest/v1/wallets?id=eq.${id}`
    const res = await fetch(delUrl, { method: 'DELETE', headers: adminHeaders() })
    if (!res.ok) return json({ error: 'Delete failed' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ─── Transactions ────────────────────────────────────────────────
async function handleTransactions(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const userId = url.searchParams.get('user_id')
    if (!userId) return json({ error: 'user_id required' }, 400)

    let query = `${SUPABASE_URL}/rest/v1/transactions?select=*&user_id=eq.${userId}&order=occurred_at.desc`
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const type = url.searchParams.get('type')
    const category = url.searchParams.get('category')
    const wallet = url.searchParams.get('wallet')
    const limit = url.searchParams.get('limit')

    if (from) query += `&occurred_at=gte.${from}`
    if (to) query += `&occurred_at=lte.${to}`
    if (type) query += `&type=eq.${type}`
    if (category) query += `&category=eq.${category}`
    if (wallet) query += `&wallet_id=eq.${wallet}`
    if (limit) query += `&limit=${limit}`

    const res = await fetch(query, { headers: adminHeaders() })
    const data = await res.json()
    if (!res.ok) return json({ error: data.message || 'Query failed' }, 500)
    return json({ data })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const result = await sbInsert('transactions', body)
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data }, 201)
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'id required' }, 400)
    const delUrl = `${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`
    const res = await fetch(delUrl, { method: 'DELETE', headers: adminHeaders() })
    if (!res.ok) return json({ error: 'Delete failed' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ─── Debts ───────────────────────────────────────────────────────
async function handleDebts(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const userId = url.searchParams.get('user_id')
    if (!userId) return json({ error: 'user_id required' }, 400)
    const { data, error } = await sbSelect('debts', '*', { user_id: `eq.${userId}` })
    if (error) return json({ error }, 500)
    return json({ data })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const result = await sbInsert('debts', body)
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data }, 201)
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json()
      const { id, ...patch } = body
      if (!id) return json({ error: 'id required' }, 400)
      const result = await sbUpdate('debts', patch, { id: `eq.${id}` })
      if (result.error) return json({ error: result.error }, 500)
      return json({ data: result.data })
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'id required' }, 400)
    const delUrl = `${SUPABASE_URL}/rest/v1/debts?id=eq.${id}`
    const res = await fetch(delUrl, { method: 'DELETE', headers: adminHeaders() })
    if (!res.ok) return json({ error: 'Delete failed' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ─── Subscription ────────────────────────────────────────────────
async function handleSubscription(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const userId = url.searchParams.get('user_id')
    if (!userId) return json({ error: 'user_id required' }, 400)
    const { data, error } = await sbSelect('subscriptions', '*', { user_id: `eq.${userId}` })
    if (error) return json({ error }, 500)
    if (!data || data.length === 0) {
      return json({ data: { plan: 'free', started_at: null, expires_at: null } })
    }
    return json({ data: data[0] })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const userId = body.user_id as string
      const plan = body.plan as string
      if (!userId || !plan) return json({ error: 'user_id dan plan required' }, 400)

      const { data: existing } = await sbSelect('subscriptions', 'id', { user_id: `eq.${userId}` })
      const expiresAt = plan === 'pro' ? new Date(Date.now() + 30 * 86400000).toISOString() : null

      if (existing && existing.length > 0) {
        const result = await sbUpdate('subscriptions', { plan, started_at: new Date().toISOString(), expires_at: expiresAt }, { user_id: `eq.${userId}` })
        if (result.error) return json({ error: result.error }, 500)
        return json({ data: result.data })
      } else {
        const result = await sbInsert('subscriptions', { user_id: userId, plan, expires_at: expiresAt })
        if (result.error) return json({ error: result.error }, 500)
        return json({ data: result.data }, 201)
      }
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ─── Summary ─────────────────────────────────────────────────────
async function handleSummary(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id')
  if (!userId) return json({ error: 'user_id required' }, 400)

  const [txnsRes, debtsRes] = await Promise.all([
    sbSelect('transactions', '*', { user_id: `eq.${userId}` }),
    sbSelect('debts', '*', { user_id: `eq.${userId}` }),
  ])

  const transactions = (txnsRes.data || []) as { type: string; amount: number; occurred_at: string }[]
  const debts = (debtsRes.data || []) as { type: string; status: string; amount: number; paid_amount: number }[]

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const activeBalance = totalIncome - totalExpenses
  const totalDebt = debts.filter(d => d.type === 'debt' && d.status !== 'paid').reduce((s, d) => s + (d.amount - d.paid_amount), 0)
  const totalReceivable = debts.filter(d => d.type === 'receivable' && d.status !== 'paid').reduce((s, d) => s + (d.amount - d.paid_amount), 0)

  return json({ activeBalance, totalIncome, totalExpenses, totalDebt, totalReceivable })
}

// ─── Categorize ──────────────────────────────────────────────────
const CATEGORY_RULES: { keywords: string[]; category: string; type: 'income' | 'expense' }[] = [
  { keywords: ['food', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'grocery', 'makan', 'beli', 'restaurant'], category: 'F&B', type: 'expense' },
  { keywords: ['gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking', 'transport', 'ojek', 'bensin'], category: 'Transportation', type: 'expense' },
  { keywords: ['rent', 'mortgage', 'electricity', 'water', 'utility', 'internet', 'listrik', 'sewa'], category: 'Housing', type: 'expense' },
  { keywords: ['movie', 'netflix', 'spotify', 'game', 'entertainment', 'hiburan'], category: 'Entertainment', type: 'expense' },
  { keywords: ['shop', 'shopping', 'clothes', 'belanja', 'purchase'], category: 'Shopping', type: 'expense' },
  { keywords: ['doctor', 'hospital', 'medicine', 'health', 'dokter', 'obat'], category: 'Healthcare', type: 'expense' },
  { keywords: ['salary', 'wage', 'paycheck', 'bonus', 'freelance', 'income', 'gaji', 'upah'], category: 'Income', type: 'income' },
  { keywords: ['transfer', 'deposit', 'withdrawal'], category: 'Transfer', type: 'expense' },
  { keywords: ['gift', 'donation', 'hadiah', 'sedekah'], category: 'Gift', type: 'expense' },
]

function autoCategorize(desc: string): { category: string; type: 'income' | 'expense' } {
  const lower = desc.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return { category: rule.category, type: rule.type }
    }
  }
  return { category: 'Other', type: 'expense' }
}

async function handleCategorize(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const description = body.description as string
    if (!description) return json({ error: 'Missing description' }, 400)
    return json(autoCategorize(description))
  } catch {
    return json({ error: 'Request body tidak valid' }, 400)
  }
}

// ─── Sync ────────────────────────────────────────────────────────
async function handleSync(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const userId = url.searchParams.get('user_id')
    if (!userId) return json({ error: 'user_id required' }, 400)

    const [wallets, transactions, debts, budgets, customCats, subscription] = await Promise.all([
      sbSelect('wallets', '*', { user_id: `eq.${userId}` }),
      sbSelect('transactions', '*', { user_id: `eq.${userId}` }),
      sbSelect('debts', '*', { user_id: `eq.${userId}` }),
      sbSelect('budgets', '*', { user_id: `eq.${userId}` }),
      sbSelect('custom_categories', '*', { user_id: `eq.${userId}` }),
      sbSelect('subscriptions', '*', { user_id: `eq.${userId}` }),
    ])

    return json({
      data: {
        wallets: wallets.data || [],
        transactions: transactions.data || [],
        debts: debts.data || [],
        budgets: (budgets.data || []).reduce((acc: Record<string, number>, b: Record<string, unknown>) => { acc[b.category as string] = b.amount as number; return acc }, {}),
        customCats: (customCats.data || []).map((c: Record<string, unknown>) => ({ name: c.name, type: c.type, color: c.color, kw: c.keywords })),
        subscription: (subscription.data || [])[0] || { plan: 'free' },
      },
    })
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const userId = body.user_id as string
      const syncData = body.data as Record<string, unknown>
      if (!userId || !syncData) return json({ error: 'user_id dan data required' }, 400)

      // Check Pro plan
      const { data: subs } = await sbSelect('subscriptions', 'plan', { user_id: `eq.${userId}` })
      const sub = (subs || [])[0] as { plan: string } | undefined
      if (sub?.plan !== 'pro') return json({ error: 'Sinkronisasi cloud cuma untuk paket Pro.' }, 403)

      const results: Record<string, unknown> = {}

      // Upsert wallets
      if (Array.isArray(syncData.wallets) && syncData.wallets.length > 0) {
        const wallets = (syncData.wallets as Record<string, unknown>[]).map(w => ({
          id: w.id, user_id: userId, name: w.name, color: w.color || '#C9A962', initial_balance: w.initial || 0,
        }))
        const res = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
          method: 'POST',
          headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(wallets),
        })
        if (res.ok) results.wallets = await res.json()
      }

      // Upsert transactions
      if (Array.isArray(syncData.transactions) && syncData.transactions.length > 0) {
        const txns = (syncData.transactions as Record<string, unknown>[]).map(t => ({
          id: t.id, user_id: userId, wallet_id: t.wallet_id, type: t.type, category: t.category,
          description: t.description, amount: t.amount, occurred_at: t.occurred_at,
          source: t.source || 'manual', ref_id: t.ref_id || null, recur: t.recur || 'none', recur_parent: t.recur_parent || null,
        }))
        const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(txns),
        })
        if (res.ok) results.transactions = await res.json()
      }

      // Upsert debts
      if (Array.isArray(syncData.debts) && syncData.debts.length > 0) {
        const debts = (syncData.debts as Record<string, unknown>[]).map(d => ({
          id: d.id, user_id: userId, name: d.name, type: d.type, amount: d.amount,
          paid_amount: d.paid_amount || 0, due_date: d.due_date || null, note: d.note || '',
          status: d.status || 'unpaid', settled_at: d.settled_at || null,
        }))
        const res = await fetch(`${SUPABASE_URL}/rest/v1/debts`, {
          method: 'POST',
          headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(debts),
        })
        if (res.ok) results.debts = await res.json()
      }

      return json({ ok: true, synced: Object.keys(results) })
    } catch {
      return json({ error: 'Request body tidak valid' }, 400)
    }
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ─── Payment: Create ─────────────────────────────────────────────
async function handlePaymentCreate(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const userId = body.user_id as string
    const email = body.email as string
    const name = (body.name as string) || 'Saya'
    if (!userId) return json({ error: 'user_id required' }, 400)

    const midtransKey = getEnv('MIDTRANS_SERVER_KEY')
    if (!midtransKey || midtransKey.includes('placeholder')) {
      return json({ error: 'Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di .env' }, 503)
    }

    const isProd = getEnv('MIDTRANS_IS_PRODUCTION') === 'true'
    const baseUrl = isProd
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const orderId = `ARUS-PRO-${userId.slice(0, 8)}-${Date.now()}`
    const payload = {
      transaction_details: { order_id: orderId, gross_amount: 29000 },
      item_details: [{ id: 'pro-monthly', price: 29000, quantity: 1, name: 'Arus Pro — Bulanan', category: 'Subscription' }],
      customer_details: { first_name: name, email: email || undefined },
      metadata: { user_id: userId, plan: 'pro' },
    }

    const authKey = Buffer.from(midtransKey + ':').toString('base64')
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Basic ${authKey}` },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: data.error_messages?.[0] || 'Midtrans error' }, 400)

    // Save pending order
    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, plan: 'free', payment_method: 'midtrans', transaction_id: orderId }),
    })

    return json({ token: data.token, redirect_url: data.redirect_url, order_id: orderId })
  } catch (e) {
    return json({ error: 'Gagal membuat pembayaran' }, 500)
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  return handleRequest(req)
}

export async function POST(req: NextRequest) {
  return handleRequest(req)
}

export async function PUT(req: NextRequest) {
  return handleRequest(req)
}

export async function PATCH(req: NextRequest) {
  return handleRequest(req)
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req)
}

async function handleRequest(req: NextRequest): Promise<NextResponse> {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return json({
      error: 'Supabase belum dikonfigurasi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di file .env',
      setup: true,
    }, 503)
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.replace('/api/', '').split('/')
  const path = '/' + pathParts.join('/')

  try {
    // ─── Auth routes ───
    if (path === '/auth/login') return await handleLogin(req)
    if (path === '/auth/signup') return await handleSignup(req)
    if (path === '/auth/me') return await handleAuthMe(req)
    if (path === '/auth/logout') return await handleLogout(req)

    // ─── Admin routes (require admin verification) ───
    if (path.startsWith('/admin')) {
      const admin = await verifyAdmin(req)
      if (!admin) return json({ error: 'Akses ditolak. Halaman ini hanya untuk admin.' }, 403)

      if (path === '/admin/stats') return await handleAdminStats()
      if (path === '/admin/users') return await handleAdminUsers()
      if (path === '/admin/subscriptions') return await handleAdminSubscriptions()
      if (path === '/admin/subscription/update') return await handleAdminSubscriptionUpdate(req)
      if (path === '/admin/transactions') return await handleAdminTransactions(req)
      return json({ error: 'Admin endpoint not found' }, 404)
    }

    // ─── Data routes ───
    if (path === '/wallets' || path.startsWith('/wallets')) return await handleWallets(req)
    if (path === '/transactions' || path.startsWith('/transactions')) return await handleTransactions(req)
    if (path === '/debts' || path.startsWith('/debts')) return await handleDebts(req)
    if (path === '/subscription') return await handleSubscription(req)
    if (path === '/summary') return await handleSummary(req)
    if (path === '/categorize') return await handleCategorize(req)
    if (path === '/sync') return await handleSync(req)
    if (path === '/payment/create') return await handlePaymentCreate(req)

    // ─── Root ───
    if (path === '/' || path === '') return json({ message: 'Arus Kas API v3.1', status: 'ok' })

    return json({ error: 'Not found' }, 404)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return json({ error: msg }, 500)
  }
}
