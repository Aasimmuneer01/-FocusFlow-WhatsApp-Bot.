import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const whatsappToken = process.env.WHATSAPP_TOKEN || "";
  const hasWhatsAppToken = Boolean(
    whatsappToken && !whatsappToken.startsWith("EAAG...") && !whatsappToken.includes("MY_")
  );
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const hasPhoneNumberId = Boolean(phoneNumberId && phoneNumberId !== "109876543210987");
  const hasAppSecret = Boolean(
    process.env.WHATSAPP_APP_SECRET && !process.env.WHATSAPP_APP_SECRET.includes("your_meta")
  );
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "focusflow_secure_webhook_token_2026";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return NextResponse.json({
    appUrl,
    webhookUrl: `${appUrl.replace(/\/+$/, "")}/api/webhook`,
    verifyToken,
    environmentStatus: {
      geminiApiKey: {
        status: hasGeminiKey ? "configured" : "using_ai_studio_default",
        masked: hasGeminiKey ? "••••••••" + (process.env.GEMINI_API_KEY?.slice(-4) || "") : "Configured via AI Studio",
        description: "Powers intelligent FocusFlow Q&A, troubleshooting, and bug triage",
      },
      whatsappToken: {
        status: hasWhatsAppToken ? "configured" : "placeholder_or_simulation_mode",
        masked: hasWhatsAppToken ? "EAAG••••" + whatsappToken.slice(-4) : "Simulation mode active",
        description: "Meta Permanent System User Token with whatsapp_business_messaging scope",
      },
      phoneNumberId: {
        status: hasPhoneNumberId ? "configured" : "placeholder_or_simulation_mode",
        masked: hasPhoneNumberId ? phoneNumberId : "Default Demo ID (109876543210987)",
        description: "Meta WhatsApp Business Phone Number ID",
      },
      whatsappAppSecret: {
        status: hasAppSecret ? "configured" : "optional_for_strict_hmac",
        masked: hasAppSecret ? "••••••••••••" : "Optional (HMAC SHA-256 signature check)",
        description: "Verifies X-Hub-Signature-256 header from Meta webhooks",
      },
    },
    metaApiVersion: "v21.0",
    nodeVersion: process.version,
    vercelReady: true,
  });
}
