import { GoogleGenAI } from "@google/genai";
import { FOCUSFLOW_SYSTEM_PROMPT } from "./focusFlowKnowledge";
import { botStore } from "./storage";

const apiKey = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface GeminiBotResult {
  replyText: string;
  detectedTicket?: {
    id: string;
    category: "bug" | "sync_issue" | "billing" | "feature_request" | "general_inquiry";
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    osDevice?: string;
    appVersion?: string;
  };
}

/**
 * Generates an empathetic and expert response for FocusFlow WhatsApp users
 * using Gemini (gemini-3.8-flash with fallback to gemini-3.1-flash-lite),
 * maintaining a brief conversation context.
 */
export async function generateSupportReply(
  userId: string,
  userMessage: string,
  userName?: string
): Promise<GeminiBotResult> {
  const history = botStore.getConversationHistory(userId);

  const historyFormatted = history
    .map((turn) => `${turn.role === "user" ? "User" : "FocusFlow Support"}: ${turn.text}`)
    .join("\n");

  const fullPrompt = `
${FOCUSFLOW_SYSTEM_PROMPT}

User Profile:
- Phone / WhatsApp ID: ${userId}
- Name: ${userName || "Valued User"}

Previous Messages in this 24h Customer Service Window:
${historyFormatted || "None (Fresh conversation)"}

New User Message:
"${userMessage}"

Respond directly to the user as the FocusFlow WhatsApp Support Bot. Remember to:
- Be clear, friendly, and structured.
- Use WhatsApp markdown (*bold*, _italics_, bullet points).
- If the user is reporting a technical issue or bug:
  1) Generate a unique Ticket ID like "*Ticket ID: FF-${Math.floor(10000 + Math.random() * 90000)}*".
  2) Provide immediate quick troubleshooting steps if known (e.g. restart, permissions, pull to refresh).
  3) Confirm that our engineering team has been logged this ticket.
`;

  let replyText = "";
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
      });

      const text = response.text?.trim();
      if (text) {
        replyText = text;
        break;
      }
    } catch (modelErr) {
      console.warn(`[GEMINI] Model ${modelName} call failed:`, modelErr);
    }
  }

  if (!replyText) {
    replyText =
      "Hello from FocusFlow Support! We are currently experiencing a brief connection delay to our knowledge server. For immediate assistance with sync, blockers, or subscriptions, please visit *https://docs.focusflow.app* or email *support@focusflow.app*.";
  }

  // Record conversation turn
  botStore.addConversationTurn(userId, "user", userMessage);
  botStore.addConversationTurn(userId, "model", replyText);

  // Check if a ticket was generated in the reply text
  const ticketMatch = replyText.match(/Ticket ID:\s*([A-Z0-9\-]+)/i);
  let detectedTicket = undefined;

  const lowerQuery = userMessage.toLowerCase();
  const isProblem =
    ticketMatch ||
    lowerQuery.includes("bug") ||
    lowerQuery.includes("crash") ||
    lowerQuery.includes("freeze") ||
    lowerQuery.includes("not working") ||
    lowerQuery.includes("error") ||
    lowerQuery.includes("failed") ||
    lowerQuery.includes("stopped") ||
    lowerQuery.includes("broken") ||
    lowerQuery.includes("sync");

  if (isProblem) {
    const ticketId = ticketMatch
      ? ticketMatch[1].replace(/[*_]/g, "")
      : `FF-${Math.floor(10000 + Math.random() * 90000)}`;

    let category: "bug" | "sync_issue" | "billing" | "feature_request" | "general_inquiry" = "bug";
    if (lowerQuery.includes("sync") || lowerQuery.includes("cloud")) category = "sync_issue";
    else if (
      lowerQuery.includes("refund") ||
      lowerQuery.includes("charge") ||
      lowerQuery.includes("subscription")
    )
      category = "billing";
    else if (lowerQuery.includes("feature") || lowerQuery.includes("add support"))
      category = "feature_request";

    let severity: "critical" | "high" | "medium" | "low" = "medium";
    if (lowerQuery.includes("crash") || lowerQuery.includes("data loss") || lowerQuery.includes("charge"))
      severity = "high";
    if (lowerQuery.includes("unable to open") || lowerQuery.includes("infinite loop")) severity = "critical";

    let osDevice = undefined;
    if (lowerQuery.includes("mac") || lowerQuery.includes("sequoia") || lowerQuery.includes("macos"))
      osDevice = "macOS";
    else if (lowerQuery.includes("ios") || lowerQuery.includes("iphone") || lowerQuery.includes("ipad"))
      osDevice = "iOS / iPhone";
    else if (lowerQuery.includes("android") || lowerQuery.includes("samsung") || lowerQuery.includes("pixel"))
      osDevice = "Android";
    else if (lowerQuery.includes("windows") || lowerQuery.includes("pc")) osDevice = "Windows";

    detectedTicket = {
      id: ticketId,
      category,
      title: userMessage.slice(0, 80) + (userMessage.length > 80 ? "..." : ""),
      severity,
      osDevice: osDevice || "Unspecified",
      appVersion: "v3.4.2 (Latest)",
    };

    botStore.addTicket({
      id: ticketId,
      userId,
      userName,
      category,
      title: detectedTicket.title,
      description: userMessage,
      osDevice: detectedTicket.osDevice,
      appVersion: detectedTicket.appVersion,
      severity,
      status: "open",
      source: "whatsapp",
      rawQuery: userMessage,
    });
  }

  return {
    replyText,
    detectedTicket,
  };
}
