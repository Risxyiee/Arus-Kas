import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

/**
 * GET /api/summary?user_id=xxx — Financial summary from Supabase
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId)
      return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const admin = supabaseAdmin();

    const [txnsRes, debtsRes] = await Promise.all([
      admin.from("transactions").select("*").eq("user_id", userId),
      admin.from("debts").select("*").eq("user_id", userId),
    ]);

    if (txnsRes.error) throw txnsRes.error;
    if (debtsRes.error) throw debtsRes.error;

    const transactions = txnsRes.data || [];
    const debts = debtsRes.data || [];

    const totalIncome = transactions
      .filter((t: { type: string }) => t.type === "income")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t: { type: string }) => t.type === "expense")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const activeBalance = totalIncome - totalExpenses;

    const totalDebt = debts
      .filter((d: { type: string; status: string }) => d.type === "debt" && d.status !== "paid")
      .reduce((sum: number, d: { amount: number; paid_amount: number }) => sum + (d.amount - d.paid_amount), 0);

    const totalReceivable = debts
      .filter((d: { type: string; status: string }) => d.type === "receivable" && d.status !== "paid")
      .reduce((sum: number, d: { amount: number; paid_amount: number }) => sum + (d.amount - d.paid_amount), 0);

    // Monthly cash flow data (last 12 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthTransactions = transactions.filter((t: { occurred_at: string }) => {
        const tDate = new Date(t.occurred_at);
        return tDate >= monthDate && tDate < nextMonth;
      });

      const monthIncome = monthTransactions
        .filter((t: { type: string }) => t.type === "income")
        .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter((t: { type: string }) => t.type === "expense")
        .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

      monthlyData.push({
        month: monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses,
      });
    }

    return NextResponse.json({
      activeBalance,
      totalIncome,
      totalExpenses,
      totalDebt,
      totalReceivable,
      monthlyData,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
