import { NextRequest, NextResponse } from "next/server";
import { generateSupportReply } from "@/lib/geminiService";
import { botStore } from "@/lib/storage";
import { sendWhatsAppTextMessage } from "@/lib/whatsappCloudApi";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message = "How do I turn on the website blocker for FocusFlow?",
      from = "+14155552671",
      userName = "Alex Rivera",
    } = body;

    const messageId = "wamid.HBg" + Buffer.from(`sim_${Date.now()}`).toString("base64").substring(0, 20);

    // 1. Log incoming simulated message
    botStore.addLog({
      timestamp: new Date().toISOString(),
      method: "POST",
      endpoint: "/api/webhook",
      type: "incoming_message",
      status: 200,
      payloadSummary: `Incoming WhatsApp from ${userName} (${from}): "${message}"`,
      from,
      messageId,
      verifiedSignature: true,
      details: { simulation: true },
    });

    // 2. Simulate delivered status
    setTimeout(() => {
      botStore.addLog({
        timestamp: new Date().toISOString(),
        method: "POST",
        endpoint: "/api/webhook",
        type: "message_status",
        status: 200,
        payloadSummary: `Message status: 'delivered' to recipient ${from}`,
        to: from,
        messageId,
        details: { status: "delivered", simulation: true },
      });
    }, 500);

    // 3. Process with Gemini
    const botResult = await generateSupportReply(from, message, userName);

    // 4. Dispatch (will use real Meta API if WHATSAPP_TOKEN is configured, or simulate)
    const dispatchResult = await sendWhatsAppTextMessage(from, botResult.replyText);

    // 5. Log reply
    botStore.addLog({
      timestamp: new Date().toISOString(),
      method: "POST",
      endpoint: "/api/webhook",
      type: "incoming_message",
      status: 200,
      payloadSummary: `FocusFlow Bot reply sent: "${botResult.replyText.slice(0, 90)}..."`,
      to: from,
      messageId: dispatchResult.messageId,
      details: {
        ticket: botResult.detectedTicket,
        mode: dispatchResult.mode,
        simulation: true,
      },
    });

    return NextResponse.json({
      success: true,
      replyText: botResult.replyText,
      ticket: botResult.detectedTicket,
      messageId,
      dispatchMode: dispatchResult.mode,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
