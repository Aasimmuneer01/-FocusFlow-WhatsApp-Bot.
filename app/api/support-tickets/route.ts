import { NextRequest, NextResponse } from "next/server";
import { botStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const tickets = botStore.getTickets();
  return NextResponse.json({ tickets });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }
    const success = botStore.updateTicketStatus(id, status);
    if (!success) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, tickets: botStore.getTickets() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
