import { NextRequest, NextResponse } from "next/server";
import { autoCategorize } from "@/lib/auto-categorize";

export const runtime = "edge";

// POST auto-categorize a description
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    const result = autoCategorize(description);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to categorize" }, { status: 500 });
  }
}
