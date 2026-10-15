import { NextResponse } from "next/server";
import { botStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = botStore.getLogs();
  return NextResponse.json({ logs });
}
