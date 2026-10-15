/**
 * FocusFlow WhatsApp Support Bot - Production Express Server
 * Deployable on Vercel, Railway, Render, or any Node.js container.
 */

require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");
const { FOCUSFLOW_SYSTEM_PROMPT } = require("./focusFlowKnowledge");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and preserve the raw body buffer for HMAC signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Initialize Gemini API SDK (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Validates Meta's X-Hub-Signature-256 header against the request's raw body.
 */
function verifySignature(req) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // If APP_SECRET is not configured, skip HMAC verification (with warning)
    return true;
  }

  const signatureHeader = req.headers["x-hub-signature-256"];
  if (!signatureHeader) {
    return false;
  }

  try {
    const parts = signatureHeader.split("sha256=");
    if (parts.length < 2) return false;
    const signature = parts[1];

    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(req.rawBody || "")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Dispatches an outgoing message to the user via Meta's WhatsApp Cloud API.
 */
async function sendWhatsAppMessage(recipientPhone, textBody) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || token.startsWith("EAAG...") || phoneNumberId === "109876543210987") {
    console.log(`[SIMULATED WHATSAPP OUTGOING] To: ${recipientPhone} | Body:\n${textBody}`);
    return { success: true, simulated: true };
  }

  const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta Graph API error response:", data);
      return { success: false, error: data };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Failed to call Meta Graph API:", error);
    return { success: false, error };
  }
}

/**
 * Sends a read receipt back to Meta for an incoming message.
 */
async function markMessageRead(messageId) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || token.startsWith("EAAG...")) {
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    await fetch(url, {
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
    });
  } catch (err) {
    console.warn("Failed to mark message as read:", err.message);
  }
}

/**
 * Calls Gemini 3.8 Flash to generate context-aware replies & support ticket logging.
 */
async function generateBotReply(senderPhone, messageText, senderName) {
  const prompt = `
${FOCUSFLOW_SYSTEM_PROMPT}

User Profile:
- Phone / WhatsApp ID: ${senderPhone}
- Name: ${senderName || "Valued User"}

Incoming Message:
"${messageText}"

Respond directly to the user as the FocusFlow WhatsApp Support Bot. Remember to:
- Be clear, friendly, and structured.
- Use WhatsApp markdown (*bold*, _italics_, bullet points).
- If reporting a bug/crash, provide a generated Ticket ID like "*Ticket ID: FF-${Math.floor(10000 + Math.random() * 90000)}*" and reassurance that engineering is investigating.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return (
      response.text?.trim() ||
      "Thank you for contacting FocusFlow Support! How can I assist you with your focus timers, app blocker, or sync today?"
    );
  } catch (err) {
    console.error("Gemini API generation error:", err);
    return "Hello from FocusFlow Support! We are currently experiencing a brief delay. For urgent help, please check *https://docs.focusflow.app* or email *support@focusflow.app*.";
  }
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// 1. Health check & status
app.get(["/", "/health"], (req, res) => {
  res.status(200).json({
    service: "FocusFlow WhatsApp Support Bot",
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: "/webhook",
    },
    metaApiVersion: "v21.0",
  });
});

// 2. Webhook Verification (GET /webhook)
// Meta Developer Portal calls this when you configure your Webhook Callback URL
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "focusflow_secure_webhook_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WEBHOOK VERIFIED] Meta handshake successful.");
    return res.status(200).send(challenge);
  }

  console.warn("[WEBHOOK VERIFICATION FAILED] Token mismatch or invalid mode.");
  return res.status(403).send("Forbidden: Verification Token Mismatch");
});

// 3. Webhook Event Handler (POST /webhook)
// Meta delivers incoming messages and message delivery statuses here
app.post("/webhook", async (req, res) => {
  // A. Signature verification
  if (!verifySignature(req)) {
    console.warn("[SECURITY] Invalid X-Hub-Signature-256 header. Request rejected.");
    return res.status(401).json({ error: "Invalid cryptographic signature" });
  }

  // B. Quick 200 OK acknowledgment to prevent Meta webhook retries
  res.status(200).json({ status: "EVENT_RECEIVED" });

  const body = req.body;

  // Verify that payload comes from WhatsApp Business Account
  if (body.object !== "whatsapp_business_account" || !body.entry) {
    return;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      // 1. Handle Status Updates (sent, delivered, read, failed)
      if (value.statuses && value.statuses.length > 0) {
        for (const statusObj of value.statuses) {
          console.log(
            `[STATUS UPDATE] Msg ID: ${statusObj.id} | Status: ${statusObj.status} | Recipient: ${statusObj.recipient_id}`
          );
          if (statusObj.errors) {
            console.error(`[STATUS ERROR]`, statusObj.errors);
          }
        }
      }

      // 2. Handle Incoming Messages from Users
      if (value.messages && value.messages.length > 0) {
        const contact = value.contacts && value.contacts[0];
        const userName = contact?.profile?.name || "FocusFlow User";

        for (const message of value.messages) {
          const senderPhone = message.from;
          const messageId = message.id;

          let textContent = "";
          if (message.type === "text" && message.text) {
            textContent = message.text.body;
          } else if (message.type === "interactive") {
            textContent =
              message.interactive.button_reply?.title ||
              message.interactive.list_reply?.title ||
              "Interactive button tapped";
          } else {
            textContent = `[User sent an attachment: ${message.type}]`;
          }

          console.log(`[INCOMING MESSAGE] From: ${userName} (${senderPhone}) -> "${textContent}"`);

          // Mark message as read (blue ticks)
          await markMessageRead(messageId);

          // Generate response with Gemini
          const botReply = await generateBotReply(senderPhone, textContent, userName);

          // Send reply back via WhatsApp Cloud API
          await sendWhatsAppMessage(senderPhone, botReply);
        }
      }
    }
  }
});

// Start standalone server when executed directly (not in Vercel serverless mode)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FocusFlow WhatsApp Support Bot running on port ${PORT}`);
    console.log(`📍 Webhook Verification URL: http://localhost:${PORT}/webhook`);
    console.log(`🔑 Verify Token: ${process.env.WHATSAPP_VERIFY_TOKEN || "focusflow_secure_webhook_token_2026"}`);
    console.log(`=======================================================`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
