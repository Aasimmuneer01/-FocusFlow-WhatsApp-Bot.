"use client";

import React, { useState, useEffect } from "react";
import { Webhook, CheckCircle2, XCircle, Copy, Check, Terminal, Play, ShieldAlert, Clock, ArrowDownLeft } from "lucide-react";
import { WebhookLog } from "@/lib/types";

export function WebhookInspector() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Verification test state
  const [verifyMode, setVerifyMode] = useState("subscribe");
  const [verifyToken, setVerifyToken] = useState("focusflow_secure_webhook_token_2026");
  const [verifyChallenge, setVerifyChallenge] = useState("challenge_123456789_abcdef");
  const [verifyResult, setVerifyResult] = useState<{ status: number; text: string; ok: boolean } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = () => {
      fetch("/api/logs")
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.logs) {
            setLogs(data.logs);
          }
        })
        .catch((err) => console.error(err));
    };

    load();
    const interval = setInterval(load, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleTestHandshake = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const query = new URLSearchParams({
        "hub.mode": verifyMode,
        "hub.verify_token": verifyToken,
        "hub.challenge": verifyChallenge,
      });

      const res = await fetch(`/api/webhook?${query.toString()}`);
      const text = await res.text();
      setVerifyResult({
        status: res.status,
        text,
        ok: res.ok && text === verifyChallenge,
      });
      fetchLogs();
    } catch (err) {
      setVerifyResult({
        status: 500,
        text: String(err),
        ok: false,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "/api/webhook";

  const sampleMetaPayload = JSON.stringify(
    {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID_987654321",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15550012345",
                  phone_number_id: "109876543210987",
                },
                contacts: [
                  {
                    profile: { name: "Sarah Jenkins" },
                    wa_id: "14155552671",
                  },
                ],
                messages: [
                  {
                    from: "14155552671",
                    id: "wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI2ODQ4MjE4Mzg0OTI1ODQ3MwA=",
                    timestamp: "1729000000",
                    text: { body: "How do I fix cloud sync on FocusFlow?" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
              <Webhook className="w-5 h-5 text-emerald-400" />
              <span>Meta Webhook Endpoint & Handshake Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter these exact parameters in Meta for Developers &gt; WhatsApp &gt; Configuration &gt; Webhook
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-medium">Ready for Meta Webhooks</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          {/* Webhook Callback URL */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">1. Callback URL</span>
              <button
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                {copiedText === "url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText === "url" ? "Copied" : "Copy URL"}</span>
              </button>
            </div>
            <code className="block text-xs font-mono text-emerald-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all select-all">
              {webhookUrl}
            </code>
            <p className="text-[11px] text-slate-500 mt-2">
              Accepts both <code className="text-slate-400">GET</code> (Meta verification challenge) and <code className="text-slate-400">POST</code> (messages &amp; statuses).
            </p>
          </div>

          {/* Webhook Verify Token */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">2. Verify Token</span>
              <button
                onClick={() => copyToClipboard("focusflow_secure_webhook_token_2026", "token")}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                {copiedText === "token" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText === "token" ? "Copied" : "Copy Token"}</span>
              </button>
            </div>
            <code className="block text-xs font-mono text-cyan-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 select-all">
              focusflow_secure_webhook_token_2026
            </code>
            <p className="text-[11px] text-slate-500 mt-2">
              Configured via <code className="text-slate-400">WHATSAPP_VERIFY_TOKEN</code> in your environment variables.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive GET Verification Handshake Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Simulate Meta Verification Handshake (GET /webhook)</span>
          </h4>
          <span className="text-xs text-slate-400">Test how Meta validates your server</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">hub.mode</label>
            <input
              type="text"
              value={verifyMode}
              onChange={(e) => setVerifyMode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">hub.verify_token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">hub.challenge</label>
            <input
              type="text"
              value={verifyChallenge}
              onChange={(e) => setVerifyChallenge(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTestHandshake}
            disabled={isVerifying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isVerifying ? "Verifying..." : "Execute Verification Handshake"}</span>
          </button>

          {verifyResult && (
            <div
              className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg border ${
                verifyResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {verifyResult.ok ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    HTTP {verifyResult.status}: Handshake Succeeded! Meta received expected challenge.
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>
                    HTTP {verifyResult.status}: Failed ({verifyResult.text})
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta Webhook Live Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-100">Live Webhook Event Stream</h4>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {logs.length} logged events
            </span>
          </div>

          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {isLoadingLogs ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Summary</th>
                <th className="py-2.5 px-3">Sender / Recipient</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.method === "GET"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {log.method}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                    {log.type === "verification" && "Handshake"}
                    {log.type === "incoming_message" && "Incoming Message"}
                    {log.type === "message_status" && "Message Status"}
                    {log.type === "error" && "Error / Rejection"}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-semibold ${
                        log.status === 200 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-200 font-sans max-w-xs truncate" title={log.payloadSummary}>
                    {log.payloadSummary}
                  </td>
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                    {log.from || log.to || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta JSON Payload Structure Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Meta WhatsApp Cloud API Payload Schema (POST /webhook)</span>
          </h4>
          <button
            onClick={() => copyToClipboard(sampleMetaPayload, "json")}
            className="text-xs text-slate-400 hover:text-emerald-300 flex items-center space-x-1"
          >
            {copiedText === "json" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === "json" ? "Copied" : "Copy Sample JSON"}</span>
          </button>
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
          {sampleMetaPayload}
        </pre>
      </div>
    </div>
  );
}
