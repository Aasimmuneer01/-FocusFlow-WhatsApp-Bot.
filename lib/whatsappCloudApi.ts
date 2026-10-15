import crypto from "crypto";

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  status?: number;
  error?: string | Record<string, unknown>;
  mode: "meta_graph_api" | "simulated_local";
}

function getEnv(primary: string, fallbacks: string[] = []): string {
  const keys = [primary, ...fallbacks];
  for (const k of keys) {
    if (process.env[k] && String(process.env[k]).trim() !== "") {
      return String(process.env[k]).trim();
    }
  }
  return "";
}

/**
 * Validates the Meta WhatsApp Webhook Signature (X-Hub-Signature-256)
 * using the configured App Secret and raw request body.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  const secret = (appSecret || getEnv("WHATSAPP_APP_SECRET", ["APP_SECRET", "META_APP_SECRET"])).trim();
  if (!secret) {
    // If no app secret is configured, skip strict signature check
    return true;
  }
  if (!signatureHeader) {
    console.warn("[SECURITY] Missing x-hub-signature-256 header.");
    return false;
  }

  try {
    const parts = signatureHeader.split("sha256=");
    if (parts.length < 2) return false;
    const signature = parts[1];

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (err) {
    console.error("[SECURITY] Signature verification error:", err);
    return false;
  }
}

/**
 * Sends a message to a WhatsApp user via the official Meta WhatsApp Business Cloud API.
 */
export async function sendWhatsAppTextMessage(
  recipientPhoneNumber: string,
  messageText: string
): Promise<SendWhatsAppResponse> {
  const token = getEnv("WHATSAPP_TOKEN", ["WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN"]);
  const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID", ["PHONE_NUMBER_ID", "WHATSAPP_PHONE_ID"]);

  const cleanPhone = recipientPhoneNumber.replace(/[^0-9]/g, "");

  // If credentials are completely missing, operate in local simulation mode
  if (!token || !phoneNumberId) {
    console.log(`[SIMULATED WHATSAPP OUTGOING] To: ${cleanPhone} | Body:\n${messageText}`);
    const mockId = "wamid.HBg" + Buffer.from(`sim_${Date.now()}_${cleanPhone}`).toString("base64").substring(0, 24);
    return {
      success: true,
      messageId: mockId,
      mode: "simulated_local",
    };
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  const startTime = Date.now();
  console.log(`[STAGE 3/4: WHATSAPP SEND REQUEST] Dispatching to ${cleanPhone} via Phone ID: ${phoneNumberId}...`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    const elapsedMs = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    console.log(`[STAGE 4/4: WHATSAPP SEND RESPONSE] Meta Graph API returned HTTP ${response.status} in ${elapsedMs}ms.`);

    if (!response.ok) {
      const errInfo = data.error || {};
      console.error(`[STAGE 4/4: WHATSAPP SEND FAILED] HTTP ${response.status} (${elapsedMs}ms):`, {
        message: errInfo.message,
        type: errInfo.type,
        code: errInfo.code,
        error_subcode: errInfo.error_subcode,
      });

      if (errInfo.code === 190 || errInfo.error_subcode === 463) {
        console.error("🚨 [ACTION REQUIRED] Meta Access Token has expired. Replace WHATSAPP_TOKEN in Vercel settings.");
      }

      return {
        success: false,
        status: response.status,
        error: data,
        mode: "meta_graph_api",
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    console.log(`[STAGE 4/4: WHATSAPP SUCCESS] Reply delivered! WhatsApp Message ID: ${messageId}`);
    return {
      success: true,
      messageId,
      status: response.status,
      mode: "meta_graph_api",
    };
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Network error contacting Meta Graph API";
    console.error(`[WHATSAPP SEND EXCEPTION] (${elapsedMs}ms):`, msg);
    return {
      success: false,
      error: msg,
      mode: "meta_graph_api",
    };
  }
}

/**
 * Marks an incoming message as "read" to send double blue checkmarks to the user.
 */
export async function markWhatsAppMessageAsRead(messageId: string): Promise<boolean> {
  const token = getEnv("WHATSAPP_TOKEN", ["WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN"]);
  const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID", ["PHONE_NUMBER_ID", "WHATSAPP_PHONE_ID"]);

  if (!token || !phoneNumberId) {
    return true;
  }

  try {
    const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn(`[READ RECEIPT] Meta responded HTTP ${res.status}:`, errData.error?.message || res.statusText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[READ RECEIPT] Failed to mark message as read:", err instanceof Error ? err.message : err);
    return false;
  }
}
