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
const {
  FOCUSFLOW_APP_INFO,
  getRelevantKnowledgeSnippet,
  FOCUSFLOW_BASE_INSTRUCTION,
} = require("./focusFlowKnowledge");

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
  console.log(`   - Primary Model:           gemini-3.1-flash-lite (cost-optimized)`);
  console.log(`   - GEMINI_API_KEY:          ${sanitizeMask(GEMINI_API_KEY, 6)}`);
  console.log(`   - WHATSAPP_TOKEN:          ${sanitizeMask(WHATSAPP_TOKEN, 6)}`);
  console.log(`   - WHATSAPP_PHONE_NUMBER_ID: ${WHATSAPP_PHONE_NUMBER_ID ? WHATSAPP_PHONE_NUMBER_ID : "(not set)"}`);
  console.log(`   - WHATSAPP_VERIFY_TOKEN:   ${sanitizeMask(WHATSAPP_VERIFY_TOKEN, 4)}`);
  console.log(`   - WHATSAPP_APP_SECRET:     ${sanitizeMask(WHATSAPP_APP_SECRET, 4)}`);
  console.log(`   - App Install URL:         ${FOCUSFLOW_APP_INFO.installUrl}`);
  console.log("=======================================================");
}

logConfigurationStatus();

// Deduplication tracking: prevents duplicate processing if Meta retries a webhook
const processedMessages = new Map();

function isDuplicateMessage(messageId) {
  if (!messageId) return false;
  const now = Date.now();
  // Purge IDs older than 10 minutes
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      processedMessages.delete(id);
    }
  }
  if (processedMessages.has(messageId)) {
    return true;
  }
  processedMessages.set(messageId, now);
  return false;
}

// Circuit breaker for models experiencing 429 quota exhaustion or 503 unavailability
const modelCooldowns = new Map();

function isModelAvailable(modelName) {
  const until = modelCooldowns.get(modelName);
  if (!until) return true;
  if (Date.now() > until) {
    modelCooldowns.delete(modelName);
    return true;
  }
  return false;
}

function setModelCooldown(modelName, durationMs = 60000) {
  modelCooldowns.set(modelName, Date.now() + durationMs);
  console.warn(`[CIRCUIT BREAKER] Model "${modelName}" cooled down for ${durationMs / 1000}s.`);
}

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
 * Safe, context-aware fallback response when all AI models fail or hit rate limits.
 */
function getSafeFallbackReply(userMessage) {
  const q = String(userMessage || "").toLowerCase();

  if (q.includes("install") || q.includes("download") || q.includes("link") || q.includes("website")) {
    return "Hi! You can download FocusFlow and access its installation guide here: *https://noteshub9.vercel.app/* (Note: noteshub9 is the official installation page). Let us know if you have any questions during setup!";
  }
  if (q.includes("pdf") || q.includes("notes") || q.includes("missing")) {
    return "To help locate missing study materials, please let us know the *Class*, *Subject*, *Lesson/Chapter*, and the *exact PDF title*. We will note these details down.";
  }
  if (q.includes("incorrect") || q.includes("wrong answer") || q.includes("error")) {
    return "To help verify an incorrect answer, please provide the *Subject*, *Chapter*, and the specific *question text or screenshot*. We will make a note for review.";
  }
  if (q.includes("not opening") || q.includes("crash") || q.includes("freeze")) {
    return "If FocusFlow is not opening, please let us know your *device model*, *OS version*, and whether you see a black screen or error code. We will note the issue.";
  }
  if (q.match(/^(hi|hello|hey|greetings)(\s|$|[!.?])/)) {
    return "Hello! Welcome to FocusFlow Support. How can we help you today with the app, installation, or study content?";
  }
  if (q.includes("thank")) {
    return "You're very welcome! Feel free to reach out anytime if you need more help with FocusFlow. Have a great day!";
  }
  return "FocusFlow Support: For app information and installation, visit *https://noteshub9.vercel.app/*. If you're reporting an issue or missing PDF, please share your details and we will note them down.";
}

/**
 * Generates situation-aware, token-optimized replies.
 * - Primary model: gemini-3.1-flash-lite (fast, low-cost)
 * - Restricts maxOutputTokens to 160 (~80-140 tokens)
 * - Injects ONLY the relevant knowledge snippet for the user's specific query
 * - Circuit breaker avoids spamming quota-exhausted models
 */
async function generateBotReply(senderPhone, messageText, senderName) {
  // Get ONLY the relevant snippet matching the query
  const relevantSnippet = getRelevantKnowledgeSnippet(messageText);

  const systemPrompt = `${FOCUSFLOW_BASE_INSTRUCTION}

${relevantSnippet}

User: "${senderName || 'Student'}" (${senderPhone})`;

  // Supported model chain: Primary is gemini-3.1-flash-lite; fallback is gemini-flash-latest
  const modelChain = [
    { name: "gemini-3.1-flash-lite", isFallback: false },
    { name: "gemini-flash-latest", isFallback: true },
  ];

  for (const { name: modelName, isFallback } of modelChain) {
    if (!isModelAvailable(modelName)) {
      console.log(`[STAGE 2/4: MODEL SKIPPED] Model "${modelName}" is currently cooling down due to recent quota/availability errors.`);
      continue;
    }

    const modelStart = Date.now();
    if (isFallback) {
      console.log(`[STAGE 2/4: GEMINI FALLBACK] Attempting fallback model "${modelName}" for sender ${senderPhone}...`);
    } else {
      console.log(`[STAGE 2/4: GEMINI ATTEMPT] Attempting primary model "${modelName}" for sender ${senderPhone}...`);
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: messageText,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 160,
          temperature: 0.6,
        },
      });

      const replyText = response.text?.trim();
      if (replyText) {
        const elapsed = Date.now() - modelStart;
        const totalTokens = response.usageMetadata?.totalTokenCount || "(n/a)";
        console.log(`[STAGE 2/4: REPLY GENERATED] Model "${modelName}" (${isFallback ? "fallback" : "primary"}) generated reply in ${elapsed}ms | Total tokens: ${totalTokens}`);
        return replyText;
      }
    } catch (err) {
      const elapsed = Date.now() - modelStart;
      const status = err.status || err.code || "UNKNOWN";
      const errMsg = err.message || String(err);
      console.warn(`[STAGE 2/4: GEMINI ${isFallback ? "FALLBACK" : "PRIMARY"} FAILED] Model "${modelName}" failed after ${elapsed}ms with status ${status}: ${errMsg}`);

      // If quota exhausted (429) or unavailable (503), cool down model
      if (status === 429 || status === 503 || String(errMsg).includes("quota") || String(errMsg).includes("demand")) {
        setModelCooldown(modelName, 60000);
      }
    }
  }

  // Graceful fallback response preserving FocusFlow facts if all AI models fail
  console.warn("[STAGE 2/4: GEMINI EXHAUSTED] Using situation-aware FocusFlow fallback reply.");
  return getSafeFallbackReply(messageText);
}

/**
 * Dispatches an outgoing message via Meta WhatsApp Cloud API with full diagnostic reporting.
 * Logs: WhatsApp send request, WhatsApp API response status, and WhatsApp message ID on success.
 */
async function sendWhatsAppMessage(recipientPhone, textBody) {
  if (!WHATSAPP_TOKEN) {
    console.error("[STAGE 3/4: WHATSAPP ERROR] Cannot send message: WHATSAPP_TOKEN is missing in environment variables.");
    return { success: false, error: "Missing WHATSAPP_TOKEN" };
  }

  if (!WHATSAPP_PHONE_NUMBER_ID) {
    console.error("[STAGE 3/4: WHATSAPP ERROR] Cannot send message: WHATSAPP_PHONE_NUMBER_ID is missing in environment variables.");
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
  console.log(`[STAGE 3/4: WHATSAPP SEND REQUEST] Dispatching reply to ${cleanPhone} via Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}...`);

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

    console.log(`[STAGE 4/4: WHATSAPP SEND RESPONSE] Meta Graph API returned HTTP ${response.status} ${response.statusText} in ${elapsedMs}ms.`);

    if (!response.ok) {
      const errInfo = data.error || {};
      console.error(`[STAGE 4/4: WHATSAPP SEND FAILED] HTTP ${response.status}:`, {
        message: errInfo.message || "Unknown error",
        type: errInfo.type,
        code: errInfo.code,
        error_subcode: errInfo.error_subcode,
        fbtrace_id: errInfo.fbtrace_id,
      });

      if (errInfo.code === 190 || errInfo.error_subcode === 463) {
        console.error("🚨 [ACTION REQUIRED - TOKEN EXPIRED] The Meta WhatsApp Access Token (WHATSAPP_TOKEN) has expired!");
        console.error("   Solution: In Meta Business Manager > System Users, generate a permanent System User Token with 'whatsapp_business_messaging' permission and update WHATSAPP_TOKEN in Vercel.");
      }

      return { success: false, status: response.status, error: data };
    }

    const messageId = data.messages?.[0]?.id || "(unknown-id)";
    console.log(`[STAGE 4/4: WHATSAPP SUCCESS] Reply delivered! WhatsApp Message ID: ${messageId}`);
    return { success: true, messageId, status: response.status, data };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[STAGE 4/4: WHATSAPP NETWORK EXCEPTION] after ${elapsedMs}ms:`, {
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
    primaryModel: "gemini-3.1-flash-lite",
    appWebsite: FOCUSFLOW_APP_INFO.installUrl,
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
  });
});

// 2. Webhook Verification (GET /webhook)
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
app.post("/webhook", async (req, res) => {
  const startTime = Date.now();

  // A. Signature verification
  if (!verifySignature(req)) {
    console.warn("[SECURITY REJECTION] Invalid X-Hub-Signature-256 header. Rejecting with 401.");
    return res.status(401).json({ error: "Invalid cryptographic signature" });
  }

  const body = req.body;

  if (!body || body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    console.log("[WEBHOOK IGNORED] Payload is not a whatsapp_business_account event.");
    return res.status(200).json({ status: "IGNORED_NON_WHATSAPP" });
  }

  try {
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Delivery & Read Status Updates (Filter out - DO NOT trigger Gemini or replies!)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            console.log(
              `[STATUS/READ NOTIFICATION - NO AI TRIGGER] Msg ID: ${statusObj.id} | Status: "${statusObj.status}" | Recipient: ${statusObj.recipient_id}`
            );
          }
          continue; // Skip AI generation for status notifications
        }

        // 2. Real Incoming Messages from WhatsApp Users
        if (value.messages && value.messages.length > 0) {
          const contact = value.contacts && value.contacts[0];
          const userName = contact?.profile?.name || "FocusFlow User";

          for (const message of value.messages) {
            const senderPhone = message.from;
            const messageId = message.id;

            // Deduplication check: ignore if already processed
            if (isDuplicateMessage(messageId)) {
              console.log(`[DEDUPLICATION] Message ${messageId} already processed. Skipping duplicate.`);
              continue;
            }

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

            // STAGE 1: Log incoming message received
            console.log(`=======================================================`);
            console.log(`📩 [STAGE 1/4: INCOMING MESSAGE RECEIVED]`);
            console.log(`   From:       "${userName}" (${senderPhone})`);
            console.log(`   Message ID: ${messageId}`);
            console.log(`   Text Body:  "${textContent}"`);
            console.log(`=======================================================`);

            // Step 1: Mark message as read (blue ticks)
            await markMessageRead(messageId);

            // Step 2: Generate response using low-cost Gemini 3.1 Flash-Lite
            // Awaited before returning HTTP 200
            const botReply = await generateBotReply(senderPhone, textContent, userName);

            // Step 3: Dispatch reply back to the user via Meta WhatsApp Cloud API
            // Awaited before returning HTTP 200
            const sendResult = await sendWhatsAppMessage(senderPhone, botReply);

            if (!sendResult.success) {
              console.error(`[CRITICAL] Bot failed to dispatch reply to ${senderPhone}. Reason:`, sendResult.error);
            } else {
              console.log(`✅ [BOT REPLIED SUCCESSFULLY] Outbound message delivered to ${senderPhone}.`);
            }
          }
        }
      }
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`[WEBHOOK COMPLETED] All messages processed in ${totalElapsed}ms. Returning HTTP 200 to Meta.`);

    return res.status(200).json({ status: "EVENT_PROCESSED", elapsedMs: totalElapsed });
  } catch (error) {
    console.error("[WEBHOOK EXCEPTION] Unhandled error processing webhook:", error);
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
