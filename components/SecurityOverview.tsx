"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Lock, Key, Server, AlertCircle, RefreshCw } from "lucide-react";

interface SystemStatus {
  appUrl: string;
  webhookUrl: string;
  verifyToken: string;
  environmentStatus: {
    geminiApiKey: { status: string; masked: string; description: string };
    whatsappToken: { status: string; masked: string; description: string };
    phoneNumberId: { status: string; masked: string; description: string };
    whatsappAppSecret: { status: string; masked: string; description: string };
  };
  metaApiVersion: string;
  nodeVersion: string;
  vercelReady: boolean;
}

export function SecurityOverview() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/system-status")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setStatus(data);
      })
      .catch((err) => console.error("Failed to load status:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Security Rule Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Zero-Leak Credential Architecture &amp; Security Boundary
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Meta WhatsApp Business Cloud API permanent tokens and Gemini API keys must <strong>never</strong> be bundled into client-side JavaScript or exposed to browsers. All outbound calls to <code className="text-emerald-400">graph.facebook.com</code> and Gemini AI are executed strictly on the Node.js / Express backend.
            </p>
          </div>
        </div>
      </div>

      {/* Environment Secret Status Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Server-Side Environment Secrets (Masked &amp; Protected)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified from server runtime. Plaintext secrets are never returned over the network.
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Gemini Key */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">GEMINI_API_KEY</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Active &bull; Server-Side
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Google GenAI SDK initialized on server with User-Agent telemetry. Never sent to browser.
            </p>
            <code className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 block">
              {status?.environmentStatus.geminiApiKey.masked || "Configured via AI Studio"}
            </code>
          </div>

          {/* WhatsApp Token */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">WHATSAPP_TOKEN</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                System User Token
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Permanent access token with whatsapp_business_messaging scope.
            </p>
            <code className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 block">
              {status?.environmentStatus.whatsappToken.masked || "EAAG•••• (Server-only)"}
            </code>
          </div>

          {/* Phone Number ID */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">WHATSAPP_PHONE_NUMBER_ID</span>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                Meta Phone ID
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Meta WhatsApp Cloud API Sender Phone Identifier.
            </p>
            <code className="text-xs font-mono text-purple-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 block">
              {status?.environmentStatus.phoneNumberId.masked || "109876543210987"}
            </code>
          </div>

          {/* App Secret & HMAC */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">WHATSAPP_APP_SECRET</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                HMAC SHA-256
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Used to verify cryptographic X-Hub-Signature-256 headers on incoming webhooks.
            </p>
            <code className="text-xs font-mono text-amber-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 block">
              {status?.environmentStatus.whatsappAppSecret.masked || "••••••••••••"}
            </code>
          </div>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
        <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Production Security Checklist for FocusFlow Support Bot</span>
        </h4>
        <ul className="space-y-2 text-slate-400">
          <li className="flex items-start space-x-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong>Cryptographic Payload Verification:</strong> Server captures raw byte buffer with <code className="text-slate-200 font-mono">express.json({`{ verify: ... }`})</code> and validates timing-safe HMAC SHA-256.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong>Permanent System User Token:</strong> Using Meta Business Manager System Users avoids 24h temporary token expirations in production.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong>Immediate 200 OK Handshake:</strong> Webhook answers Meta in under 2 seconds to avoid webhook retry loops and DDoS throttling.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
