import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET financial summary
export async function GET() {
  try {
    const transactions = await db.transaction.findMany();
    const debts = await db.debt.findMany();

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const activeBalance = totalIncome - totalExpenses;

    const totalDebt = debts
      .filter((d) => d.type === "debt" && d.status !== "paid")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    const totalReceivable = debts
      .filter((d) => d.type === "receivable" && d.status !== "paid")
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Monthly cash flow data (last 12 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= monthDate && tDate < nextMonth;
      });

      const monthIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
