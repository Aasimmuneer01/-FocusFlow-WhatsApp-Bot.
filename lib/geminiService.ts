import { GoogleGenAI } from "@google/genai";
import {
  FOCUSFLOW_BASE_INSTRUCTION,
  getRelevantKnowledgeSnippet,
} from "./focusFlowKnowledge";
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
  modelUsed?: string;
  totalTokens?: number;
}

// Circuit breaker map: modelName -> cooldown expiry timestamp
const modelCooldowns = new Map<string, number>();

function isModelAvailable(modelName: string): boolean {
  const until = modelCooldowns.get(modelName);
  if (!until) return true;
  if (Date.now() > until) {
    modelCooldowns.delete(modelName);
    return true;
  }
  return false;
}

function setModelCooldown(modelName: string, durationMs = 60000) {
  modelCooldowns.set(modelName, Date.now() + durationMs);
  console.warn(`[CIRCUIT BREAKER] Model "${modelName}" cooled down for ${durationMs / 1000}s.`);
}

function getSafeFallbackReply(userMessage: string): string {
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
 * Generates an empathetic and expert response for FocusFlow WhatsApp users
 * using low-cost Gemini Flash-Lite (gemini-3.1-flash-lite) with maxOutputTokens: 160.
 */
export async function generateSupportReply(
  userId: string,
  userMessage: string,
  userName?: string
): Promise<GeminiBotResult> {
  const history = botStore.getConversationHistory(userId);
  // Keep only the most recent user-bot exchange to minimize token usage
  const recentHistory = history.slice(-2);
  const historyContext = recentHistory.length > 0
    ? "\nRecent Context:\n" + recentHistory.map((t) => `${t.role === "user" ? "User" : "Support"}: ${t.text}`).join("\n")
    : "";

  const snippet = getRelevantKnowledgeSnippet(userMessage);

  const systemInstruction = `${FOCUSFLOW_BASE_INSTRUCTION}

${snippet}${historyContext}
User: "${userName || 'Student'}" (${userId})`;

  // Primary model: gemini-3.1-flash-lite (cost-optimized, active quota)
  // Fallback model: gemini-flash-latest
  const modelChain = [
    { name: "gemini-3.1-flash-lite", isFallback: false },
    { name: "gemini-flash-latest", isFallback: true },
  ];

  let replyText = "";
  let modelUsed = "";
  let totalTokens: number | undefined;

  for (const { name: modelName, isFallback } of modelChain) {
    if (!isModelAvailable(modelName)) {
      console.log(`[STAGE 2/4: MODEL SKIPPED] Model "${modelName}" is currently cooling down due to recent quota/availability errors.`);
      continue;
    }

    const modelStart = Date.now();
    if (isFallback) {
      console.log(`[STAGE 2/4: GEMINI FALLBACK] Attempting verified fallback model "${modelName}" for sender ${userId}...`);
    } else {
      console.log(`[STAGE 2/4: GEMINI ATTEMPT] Attempting primary model "${modelName}" for sender ${userId}...`);
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userMessage,
        config: {
          systemInstruction,
          maxOutputTokens: 160,
          temperature: 0.6,
        },
      });

      const text = response.text?.trim();
      if (text) {
        replyText = text;
        modelUsed = modelName;
        totalTokens = response.usageMetadata?.totalTokenCount;
        const elapsed = Date.now() - modelStart;
        console.log(`[STAGE 2/4: REPLY GENERATED] Model "${modelName}" (${isFallback ? "fallback" : "primary"}) generated reply in ${elapsed}ms | Total tokens: ${totalTokens || "n/a"}`);
        break;
      }
    } catch (modelErr: unknown) {
      const elapsed = Date.now() - modelStart;
      const status = (modelErr as { status?: number; code?: number })?.status || "ERROR";
      const errMsg = (modelErr as Error)?.message || String(modelErr);
      console.warn(`[STAGE 2/4: GEMINI ${isFallback ? "FALLBACK" : "PRIMARY"} FAILED] Model "${modelName}" failed after ${elapsed}ms with status ${status}: ${errMsg}`);

      if (status === 429 || status === 503 || errMsg.includes("quota") || errMsg.includes("demand")) {
        setModelCooldown(modelName, 60000);
      }
    }
  }

  if (!replyText) {
    console.warn("[STAGE 2/4: GEMINI EXHAUSTED] Using situation-aware FocusFlow fallback reply.");
    replyText = getSafeFallbackReply(userMessage);
    modelUsed = "safe_fallback";
  }

  // Record conversation turn
  botStore.addConversationTurn(userId, "user", userMessage);
  botStore.addConversationTurn(userId, "model", replyText);

  return {
    replyText,
    modelUsed,
    totalTokens,
  };
}
