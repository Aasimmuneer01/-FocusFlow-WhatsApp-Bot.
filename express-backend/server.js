/**
 * FocusFlow WhatsApp Support Bot - Production Express Server
 * Deployable on Vercel Serverless, Railway, Render, or Node.js container.
 */

try {
  require("dotenv").config();
} catch {
  // dotenv is optional in production environments like Vercel where process.env is injected directly
}
const express = require("express");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");
const { FOCUSFLOW_SYSTEM_PROMPT } = require("./focusFlowKnowledge");

const app = express();
const PORT = process.env.PORT || 3000;

// Helper to safely read and trim environment variables with common alias support
function getEnv(primaryKey, fallbackKeys = [], defaultValue = "") {
  const keys = [primaryKey, ...fallbackKeys];
  for (const k of keys) {
    if (process.env[k] !== undefined && process.env[k] !== null && String(process.env[k]).trim() !== "") {
      return String(process.env[k]).trim();
    }
  }
  return defaultValue;
}

// Environment Variables with aliases
const GEMINI_API_KEY = getEnv("GEMINI_API_KEY", ["GOOGLE_API_KEY"]);
const WHATSAPP_TOKEN = getEnv("WHATSAPP_TOKEN", ["WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN", "WHATSAPP_API_TOKEN"]);
const WHATSAPP_PHONE_NUMBER_ID = getEnv("WHATSAPP_PHONE_NUMBER_ID", ["PHONE_NUMBER_ID", "WHATSAPP_PHONE_ID"]);
const WHATSAPP_VERIFY_TOKEN = getEnv("WHATSAPP_VERIFY_TOKEN", ["VERIFY_TOKEN"], "focusflow_secure_webhook_token_2026");
const WHATSAPP_APP_SECRET = getEnv("WHATSAPP_APP_SECRET", ["APP_SECRET", "META_APP_SECRET"]);

// Diagnostic configuration check (sanitized - never logs secrets)
function logConfigurationStatus() {
  const sanitizeMask = (val, visibleChars = 4) => {
    if (!val) return "(not set)";
    if (val.length <= visibleChars) return "••••";
    return `••••${val.slice(-visibleChars)} (len: ${val.length})`;
  };

  console.log("=======================================================");
  console.log("🤖 FocusFlow WhatsApp Bot - Runtime Configuration:");
  console.log(`   - GEMINI_API_KEY:          ${sanitizeMask(GEMINI_API_KEY, 6)}`);
  console.log(`   - WHATSAPP_TOKEN:          ${sanitizeMask(WHATSAPP_TOKEN, 6)}`);
  console.log(`   - WHATSAPP_PHONE_NUMBER_ID: ${WHATSAPP_PHONE_NUMBER_ID ? WHATSAPP_PHONE_NUMBER_ID : "(not set)"}`);
  console.log(`   - WHATSAPP_VERIFY_TOKEN:   ${sanitizeMask(WHATSAPP_VERIFY_TOKEN, 4)}`);
  console.log(`   - WHATSAPP_APP_SECRET:     ${sanitizeMask(WHATSAPP_APP_SECRET, 4)}`);
  console.log(`   - NODE_ENV:                ${process.env.NODE_ENV || "development"}`);
  console.log(`   - VERCEL:                  ${Boolean(process.env.VERCEL)}`);
  console.log("=======================================================");
}

logConfigurationStatus();

// Middleware: parse JSON and capture raw buffer for HMAC SHA-256 signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Initialize Gemini API SDK (server-side only)
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Validates Meta's X-Hub-Signature-256 header against the raw body using WHATSAPP_APP_SECRET.
 */
function verifySignature(req) {
  if (!WHATSAPP_APP_SECRET) {
    // If APP_SECRET is not configured, skip HMAC check with a log
    return true;
  }

  const signatureHeader = req.headers["x-hub-signature-256"];
  if (!signatureHeader) {
    console.warn("[SECURITY] Missing x-hub-signature-256 header while WHATSAPP_APP_SECRET is configured.");
    return false;
  }

  try {
    const parts = signatureHeader.split("sha256=");
    if (parts.length < 2) {
      console.warn("[SECURITY] Malformed x-hub-signature-256 header.");
      return false;
    }
    const signature = parts[1];

    const expectedSignature = crypto
      .createHmac("sha256", WHATSAPP_APP_SECRET)
      .update(req.rawBody || "")
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    if (!isValid) {
      console.warn("[SECURITY] Invalid HMAC SHA-256 signature on incoming webhook.");
    }
    return isValid;
  } catch (err) {
    console.error("[SECURITY] Error during signature verification:", err.message);
    return false;
  }
}

/**
 * Marks an incoming WhatsApp message as read to display double blue checkmarks.
 */
async function markMessageRead(messageId) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
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
      console.warn(`[READ RECEIPT] Meta responded HTTP ${res.status} for msg ${messageId}:`, errData.error?.message || res.statusText);
    } else {
      console.log(`[READ RECEIPT] Message marked as read: ${messageId}`);
    }
  } catch (err) {
    console.warn(`[READ RECEIPT] Failed to mark message ${messageId} as read:`, err.message);
  }
}

/**
 * Calls Gemini with automatic fallback (gemini-3.8-flash -> gemini-3.1-flash-lite)
 * and detailed diagnostic latency & error logging.
 */
async function generateBotReply(senderPhone, messageText, senderName) {
  const prompt = `
${FOCUSFLOW_SYSTEM_PROMPT}

User Profile:
- Phone / WhatsApp ID: ${senderPhone}
- Name: ${senderName || "Valued User"}

Incoming WhatsApp Message:
"${messageText}"

Respond directly to the user as the FocusFlow WhatsApp Support Bot. Remember to:
- Be clear, friendly, and structured.
- Use WhatsApp markdown (*bold*, _italics_, bullet points).
- If reporting a bug/crash, provide a generated Ticket ID like "*Ticket ID: FF-${Math.floor(10000 + Math.random() * 90000)}*" and reassurance that engineering is investigating.
`;

  // Candidate models: Primary is gemini-3.8-flash; fallback is gemini-3.1-flash-lite
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  const startTime = Date.now();

  for (const modelName of candidateModels) {
    try {
      console.log(`[GEMINI REQUEST] Calling model "${modelName}" for sender ${senderPhone}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const replyText = response.text?.trim();
      if (replyText) {
        const elapsedMs = Date.now() - startTime;
        console.log(`[GEMINI SUCCESS] Model "${modelName}" generated reply in ${elapsedMs}ms (${replyText.length} chars).`);
        return replyText;
      }
    } catch (err) {
      const elapsedMs = Date.now() - startTime;
      console.error(`[GEMINI ERROR] Model "${modelName}" failed after ${elapsedMs}ms:`, {
        status: err.status || "N/A",
        code: err.code || "N/A",
        message: err.message || String(err),
      });
      // Continue to next candidate model
    }
  }

  // Graceful fallback response if all AI calls fail
  console.warn("[GEMINI FALLBACK] Using pre-configured FocusFlow support message.");
  return "👋 Hello from *FocusFlow Support*! We received your message and our support system is actively logging your request. For immediate assistance with sync, website blockers, or subscriptions, please check our guide at *https://docs.focusflow.app* or email our team at *support@focusflow.app*.";
}

/**
 * Dispatches an outgoing message via Meta WhatsApp Cloud API with full diagnostic reporting.
 */
async function sendWhatsAppMessage(recipientPhone, textBody) {
  // Validate credentials
  if (!WHATSAPP_TOKEN) {
    console.error("[WHATSAPP SEND ERROR] Cannot send message: WHATSAPP_TOKEN is missing in environment variables.");
    return { success: false, error: "Missing WHATSAPP_TOKEN" };
  }

  if (!WHATSAPP_PHONE_NUMBER_ID) {
    console.error("[WHATSAPP SEND ERROR] Cannot send message: WHATSAPP_PHONE_NUMBER_ID is missing in environment variables.");
    return { success: false, error: "Missing WHATSAPP_PHONE_NUMBER_ID" };
  }

  const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: false,
      body: textBody,
    },
  };

  const startTime = Date.now();
  console.log(`[WHATSAPP DISPATCH] Sending to recipient: ${cleanPhone} via Phone ID: ${WHATSAPP_PHONE_NUMBER_ID}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    const elapsedMs = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errInfo = data.error || {};
      console.error(`[WHATSAPP SEND FAILED] HTTP ${response.status} ${response.statusText} (${elapsedMs}ms):`, {
        message: errInfo.message || "Unknown error",
        type: errInfo.type,
        code: errInfo.code,
        error_subcode: errInfo.error_subcode,
        fbtrace_id: errInfo.fbtrace_id,
      });

      // Special diagnostic alert for expired token
      if (errInfo.code === 190 || errInfo.error_subcode === 463) {
        console.error("🚨 [ACTION REQUIRED - TOKEN EXPIRED] The Meta WhatsApp Access Token (WHATSAPP_TOKEN) has expired!");
        console.error("   Solution: In Meta Business Manager > System Users, generate a permanent System User Token with 'whatsapp_business_messaging' permission and update WHATSAPP_TOKEN in Vercel.");
      }

      return { success: false, status: response.status, error: data };
    }

    const messageId = data.messages?.[0]?.id || "(unknown-id)";
    console.log(`[WHATSAPP SEND SUCCESS] HTTP ${response.status} (${elapsedMs}ms) | Meta Message ID: ${messageId}`);
    return { success: true, messageId, data };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[WHATSAPP SEND NETWORK EXCEPTION] after ${elapsedMs}ms:`, {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// 1. Health check & diagnostic status endpoint
app.get(["/", "/health"], (req, res) => {
  res.status(200).json({
    service: "FocusFlow WhatsApp Support Bot",
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    config: {
      hasGeminiKey: Boolean(GEMINI_API_KEY),
      hasWhatsAppToken: Boolean(WHATSAPP_TOKEN),
      tokenLength: WHATSAPP_TOKEN ? WHATSAPP_TOKEN.length : 0,
      hasPhoneNumberId: Boolean(WHATSAPP_PHONE_NUMBER_ID),
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID || "(not configured)",
      hasVerifyToken: Boolean(WHATSAPP_VERIFY_TOKEN),
      hasAppSecret: Boolean(WHATSAPP_APP_SECRET),
    },
    metaApiVersion: "v21.0",
    supportedModels: ["gemini-3.8-flash", "gemini-3.1-flash-lite"],
  });
});

// 2. Webhook Verification (GET /webhook)
// Meta Developer Portal calls this during Webhook subscription setup
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`[WEBHOOK VERIFICATION ATTEMPT] mode="${mode}", token="${token ? token.substring(0, 4) + '...' : ''}"`);

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("[WEBHOOK VERIFIED] Meta handshake successful. Returning hub.challenge.");
    return res.status(200).send(challenge);
  }

  console.warn(`[WEBHOOK VERIFICATION FAILED] Token mismatch or invalid mode. Expected: "${WHATSAPP_VERIFY_TOKEN.substring(0, 4)}..."`);
  return res.status(403).send("Forbidden: Verification Token Mismatch");
});

// 3. Webhook Event Handler (POST /webhook)
// Meta delivers incoming messages and status changes here
app.post("/webhook", async (req, res) => {
  const startTime = Date.now();

  // A. Signature verification
  if (!verifySignature(req)) {
    console.warn("[SECURITY REJECTION] Invalid X-Hub-Signature-256 header. Rejecting with 401.");
    return res.status(401).json({ error: "Invalid cryptographic signature" });
  }

  const body = req.body;

  // Verify that payload comes from a WhatsApp Business Account
  if (!body || body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    console.log("[WEBHOOK IGNORED] Payload is not a whatsapp_business_account event.");
    return res.status(200).json({ status: "IGNORED_NON_WHATSAPP" });
  }

  try {
    // Process each entry in the incoming webhook batch
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Log Delivery Status Updates (DO NOT send bot replies to status events!)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            console.log(
              `[MESSAGE STATUS UPDATE] ID: ${statusObj.id} | Status: "${statusObj.status}" | Recipient: ${statusObj.recipient_id}`
            );
            if (statusObj.errors && statusObj.errors.length > 0) {
              console.error(`[MESSAGE STATUS ERROR]`, statusObj.errors);
            }
          }
          // Do not proceed to message reply logic for status events
          continue;
        }

        // 2. Handle Real Incoming Messages from WhatsApp Users
        if (value.messages && value.messages.length > 0) {
          const contact = value.contacts && value.contacts[0];
          const userName = contact?.profile?.name || "FocusFlow User";

          for (const message of value.messages) {
            const senderPhone = message.from;
            const messageId = message.id;

            // Extract message text content
            let textContent = "";
            if (message.type === "text" && message.text) {
              textContent = message.text.body;
            } else if (message.type === "interactive") {
              textContent =
                message.interactive.button_reply?.title ||
                message.interactive.list_reply?.title ||
                "Interactive selection";
            } else {
              console.log(`[INCOMING ATTACHMENT] Received unsupported message type: ${message.type} from ${senderPhone}`);
              textContent = `[User sent a ${message.type} message]`;
            }

            console.log(`-------------------------------------------------------`);
            console.log(`📩 [INCOMING USER MESSAGE] From: "${userName}" (${senderPhone}) | Type: ${message.type}`);
            console.log(`   Message Text: "${textContent}"`);
            console.log(`   Message ID:   ${messageId}`);
            console.log(`-------------------------------------------------------`);

            // Step 1: Mark message as read (blue ticks)
            await markMessageRead(messageId);

            // Step 2: Generate response using Gemini AI
            const botReply = await generateBotReply(senderPhone, textContent, userName);

            // Step 3: Dispatch reply back to the user via Meta WhatsApp Cloud API
            const sendResult = await sendWhatsAppMessage(senderPhone, botReply);

            if (!sendResult.success) {
              console.error(`[CRITICAL] Bot failed to dispatch reply to ${senderPhone}. Reason:`, sendResult.error);
            } else {
              console.log(`✅ [BOT REPLIED] Successfully replied to ${senderPhone}.`);
            }
          }
        }
      }
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`[WEBHOOK COMPLETED] All messages processed in ${totalElapsed}ms. Returning HTTP 200.`);

    // CRITICAL FIX: Return HTTP 200 ONLY AFTER processing promises have resolved
    // In Vercel serverless, returning the response prematurely freezes the container and cancels pending fetches.
    return res.status(200).json({ status: "EVENT_PROCESSED", elapsedMs: totalElapsed });
  } catch (error) {
    console.error("[WEBHOOK EXCEPTION] Unhandled error processing webhook:", error);
    // Return 200 to prevent Meta retry loops while logging the failure
    return res.status(200).json({ status: "ERROR_LOGGED", error: error.message });
  }
});

// Start standalone server when executed directly (not in Vercel serverless mode)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 FocusFlow WhatsApp Support Bot running on port ${PORT}`);
    console.log(`📍 Webhook Verification URL: http://localhost:${PORT}/webhook`);
    console.log(`🔑 Verify Token: ${WHATSAPP_VERIFY_TOKEN}`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
