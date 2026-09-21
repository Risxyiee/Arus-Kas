import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all debts/receivables
export async function GET() {
  try {
    const debts = await db.debt.findMany({
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(debts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch debts" }, { status: 500 });
  }
}

// POST create a new debt/receivable
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personName, amount, dueDate, type } = body;

    if (!personName || !amount || !dueDate || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const debt = await db.debt.create({
      data: {
        personName,
        amount: parseFloat(amount),
        paidAmount: 0,
        dueDate: new Date(dueDate),
        type,
        status: "unpaid",
      },
    });

    return NextResponse.json(debt);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create debt" }, { status: 500 });
  }
}

// PUT update a debt/receivable (settle payment)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing debt id" }, { status: 400 });
    }

    const existing = await db.debt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    if (action === "settle") {
      // Mark as fully paid and create a corresponding transaction
      const updatedDebt = await db.debt.update({
        where: { id },
        data: {
          paidAmount: existing.amount,
          status: "paid",
        },
      });

      // Create a transaction entry for the settlement
      const remainingAmount = existing.amount - existing.paidAmount;
      if (remainingAmount > 0) {
        await db.transaction.create({
          data: {
            amount: remainingAmount,
            date: new Date(),
            description: `${existing.type === "debt" ? "Debt payment to" : "Received payment from"} ${existing.personName}`,
            category: existing.type === "debt" ? "Debt Payment" : "Receivable Collection",
            type: existing.type === "debt" ? "expense" : "income",
          },
        });
      }

      return NextResponse.json(updatedDebt);
    }

    if (action === "partial") {
      const { partialAmount } = body;
      if (!partialAmount || partialAmount <= 0) {
        return NextResponse.json({ error: "Invalid partial amount" }, { status: 400 });
      }

      const newPaidAmount = existing.paidAmount + parseFloat(partialAmount);
      const newStatus = newPaidAmount >= existing.amount ? "paid" : "partially_paid";

      const updatedDebt = await db.debt.update({
        where: { id },
        data: {
          paidAmount: Math.min(newPaidAmount, existing.amount),
          status: newStatus,
        },
      });

      // Create a transaction for partial payment
      await db.transaction.create({
        data: {
          amount: parseFloat(partialAmount),
          date: new Date(),
          description: `Partial ${existing.type === "debt" ? "payment to" : "received from"} ${existing.personName}`,
          category: existing.type === "debt" ? "Debt Payment" : "Receivable Collection",
          type: existing.type === "debt" ? "expense" : "income",
        },
      });

      return NextResponse.json(updatedDebt);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update debt" }, { status: 500 });
  }
}

// DELETE a debt/receivable
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing debt id" }, { status: 400 });
    }

    await db.debt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete debt" }, { status: 500 });
  }
}
