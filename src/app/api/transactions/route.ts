import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all transactions
export async function GET() {
  try {
    const transactions = await db.transaction.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

// POST create a new transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, date, description, category, type } = body;

    if (!amount || !date || !description || !category || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await db.transaction.create({
      data: {
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        category,
        type,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

// DELETE a transaction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
    }

    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
