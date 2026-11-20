import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Proxy sign-up to Supabase Auth */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
    }

    const { email, password, name } = await req.json();

    const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: { name: name || "Saya" },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const raw = String(data.error_description || data.msg || data.message || data.error || "Signup gagal");
      const isKeyIssue = /invalid api key/i.test(raw);
      let error: string;
      if (isKeyIssue) {
        error = "Server pendaftaran sedang bermasalah (API key Supabase tidak valid). Coba lagi nanti atau hubungi admin.";
      } else if (/already registered|already exists/i.test(raw)) {
        error = "Email sudah terdaftar — silakan masuk saja.";
      } else if (/password/i.test(raw) && /short|weak|at least/i.test(raw)) {
        error = "Password terlalu pendek — minimal 6 karakter.";
      } else {
        error = raw;
      }
      return NextResponse.json({ error, serverIssue: isKeyIssue }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
