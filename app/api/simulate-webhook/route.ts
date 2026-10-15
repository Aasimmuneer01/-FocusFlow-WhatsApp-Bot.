import { NextRequest, NextResponse } from "next/server";
import { generateSupportReply } from "@/lib/geminiService";
import { botStore } from "@/lib/storage";
import { sendWhatsAppTextMessage } from "@/lib/whatsappCloudApi";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message = "How do I install FocusFlow?",
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

    // 2. Process with situation-aware Gemini (gemini-3.1-flash-lite)
    const botResult = await generateSupportReply(from, message, userName);

    // 3. Dispatch (calls real Meta API or logs)
    const dispatchResult = await sendWhatsAppTextMessage(from, botResult.replyText);

    // 4. Log reply
    botStore.addLog({
      timestamp: new Date().toISOString(),
      method: "POST",
      endpoint: "/api/webhook",
      type: "incoming_message",
      status: 200,
      payloadSummary: `FocusFlow Bot reply (${botResult.modelUsed}): "${botResult.replyText.slice(0, 90)}..."`,
      to: from,
      messageId: dispatchResult.messageId,
      details: {
        modelUsed: botResult.modelUsed,
        totalTokens: botResult.totalTokens,
        mode: dispatchResult.mode,
        simulation: true,
      },
    });

    return NextResponse.json({
      success: true,
      replyText: botResult.replyText,
      modelUsed: botResult.modelUsed,
      totalTokens: botResult.totalTokens,
      messageId,
      dispatchMode: dispatchResult.mode,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
