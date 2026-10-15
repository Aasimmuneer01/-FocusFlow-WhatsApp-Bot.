import { NextRequest, NextResponse } from "next/server";
import { botStore } from "@/lib/storage";
import { verifyMetaSignature, sendWhatsAppTextMessage, markWhatsAppMessageAsRead } from "@/lib/whatsappCloudApi";
import { generateSupportReply } from "@/lib/geminiService";
import { WhatsAppWebhookPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhook
 * Webhook Verification Handler required by Meta Developer Dashboard.
 * Meta sends:
 *  - hub.mode = 'subscribe'
 *  - hub.verify_token = '<your token>'
 *  - hub.challenge = '<random string>'
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "focusflow_secure_webhook_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    botStore.addLog({
      timestamp: new Date().toISOString(),
      method: "GET",
      endpoint: "/api/webhook",
      type: "verification",
      status: 200,
      payloadSummary: `hub.mode=${mode} verified with token. Returning hub.challenge.`,
      details: {
        receivedToken: token ? `${token.substring(0, 4)}...` : "",
        challengeLength: challenge ? challenge.length : 0,
      },
    });

    // Meta expects HTTP 200 with the exact challenge string as text/plain
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Verification failed
  botStore.addLog({
    timestamp: new Date().toISOString(),
    method: "GET",
    endpoint: "/api/webhook",
    type: "error",
    status: 403,
    payloadSummary: "Verification token mismatch or invalid hub.mode",
    details: {
      receivedMode: mode,
      receivedToken: token ? `${token.substring(0, 4)}...` : "none",
    },
  });

  return new NextResponse("Forbidden: Verification Token Mismatch", { status: 403 });
}

/**
 * POST /api/webhook
 * Handles incoming WhatsApp messages, user interactions, and message delivery status updates.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Optional cryptographic signature verification
    const isValidSignature = verifyMetaSignature(rawBody, signatureHeader, appSecret);
    if (!isValidSignature) {
      botStore.addLog({
        timestamp: new Date().toISOString(),
        method: "POST",
        endpoint: "/api/webhook",
        type: "error",
        status: 401,
        payloadSummary: "Invalid X-Hub-Signature-256 signature",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Check if this is a WhatsApp Business Account webhook event
    if (payload.object !== "whatsapp_business_account" || !payload.entry || payload.entry.length === 0) {
      return NextResponse.json({ status: "ignored_not_whatsapp" }, { status: 200 });
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Handle Message Status Updates (sent, delivered, read, failed)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            botStore.addLog({
              timestamp: new Date().toISOString(),
              method: "POST",
              endpoint: "/api/webhook",
              type: "message_status",
              status: 200,
              payloadSummary: `Status update: '${statusObj.status}' for recipient ${statusObj.recipient_id}`,
              to: statusObj.recipient_id,
              messageId: statusObj.id,
              details: {
                status: statusObj.status,
                timestamp: statusObj.timestamp,
                conversation: statusObj.conversation,
                errors: statusObj.errors,
              },
            });
          }
        }

        // 2. Handle Incoming Messages from Users
        if (value.messages && value.messages.length > 0) {
          const contact = value.contacts?.[0];
          const userName = contact?.profile?.name || "FocusFlow User";

          for (const message of value.messages) {
            const senderPhone = message.from;
            const messageId = message.id;

            // Extract message text content
            let userText = "";
            if (message.type === "text" && message.text?.body) {
              userText = message.text.body;
            } else if (message.type === "interactive") {
              userText =
                message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title ||
                "Interactive response";
            } else {
              userText = `[Sent a ${message.type} attachment]`;
            }

            // Log incoming message
            botStore.addLog({
              timestamp: new Date().toISOString(),
              method: "POST",
              endpoint: "/api/webhook",
              type: "incoming_message",
              status: 200,
              payloadSummary: `Message from ${userName} (${senderPhone}): "${userText}"`,
              from: senderPhone,
              messageId: messageId,
              verifiedSignature: Boolean(signatureHeader),
            });

            // Mark message as read in WhatsApp (sends double blue ticks)
            await markWhatsAppMessageAsRead(messageId);

            // Generate reply using Gemini 3.8 Flash loaded with FocusFlow knowledge
            const botResult = await generateSupportReply(senderPhone, userText, userName);

            // Dispatch reply via Meta WhatsApp Cloud API
            const dispatchResult = await sendWhatsAppTextMessage(senderPhone, botResult.replyText);

            botStore.addLog({
              timestamp: new Date().toISOString(),
              method: "POST",
              endpoint: "/api/webhook",
              type: "incoming_message",
              status: 200,
              payloadSummary: `Replied to ${senderPhone}: "${botResult.replyText.slice(0, 90)}..." (Mode: ${dispatchResult.mode})`,
              to: senderPhone,
              messageId: dispatchResult.messageId,
              details: {
                ticketGenerated: botResult.detectedTicket ? botResult.detectedTicket.id : null,
                dispatchSuccess: dispatchResult.success,
                dispatchMode: dispatchResult.mode,
                error: dispatchResult.error,
              },
            });
          }
        }
      }
    }

    // Always respond with 200 OK quickly so Meta doesn't retry the webhook call
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return 200 to prevent Meta retry loop while logging internal error
    return NextResponse.json({ status: "error_logged", error: String(error) }, { status: 200 });
  }
}
