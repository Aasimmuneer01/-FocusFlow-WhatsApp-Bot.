"use client";

import React, { useState } from "react";
import { FileCode, Copy, Check, Terminal, Cloud, ShieldCheck, Download, ExternalLink } from "lucide-react";

interface CodeDeploymentHubProps {
  serverCode: string;
  vercelJson: string;
  packageJson: string;
  envExample: string;
  knowledgeCode: string;
  readmeMarkdown: string;
}

export function CodeDeploymentHub({
  serverCode,
  vercelJson,
  packageJson,
  envExample,
  knowledgeCode,
  readmeMarkdown,
}: CodeDeploymentHubProps) {
  const [activeTab, setActiveTab] = useState<
    "server" | "vercel" | "package" | "env" | "knowledge" | "readme" | "guide"
  >("server");
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    switch (activeTab) {
      case "server":
        return serverCode;
      case "vercel":
        return vercelJson;
      case "package":
        return packageJson;
      case "env":
        return envExample;
      case "knowledge":
        return knowledgeCode;
      case "readme":
        return readmeMarkdown;
      default:
        return serverCode;
    }
  };

  const getFileName = () => {
    switch (activeTab) {
      case "server":
        return "server.js";
      case "vercel":
        return "vercel.json";
      case "package":
        return "package.json";
      case "env":
        return ".env.example";
      case "knowledge":
        return "focusFlowKnowledge.js";
      case "readme":
        return "README.md";
      default:
        return "server.js";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Vercel Deployment Instructions Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Cloud className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-100">
                Deploying FocusFlow WhatsApp Backend to Vercel
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Complete standalone Node.js and Express files configured with <code className="text-emerald-400">vercel.json</code>. You can deploy via Vercel CLI in 60 seconds or link this backend directly to GitHub.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab("guide")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
                activeTab === "guide"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Step-by-Step Vercel Guide</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "guide" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h4 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <span>3-Step Quick Vercel Deployment</span>
            </h4>
            <button
              onClick={() => setActiveTab("server")}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Back to Code View
            </button>
          </div>

          <div className="space-y-5">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">1</span>
                <span>Initialize or export the files</span>
              </div>
              <p className="text-xs text-slate-400">
                All standalone Express files are located in the <code className="text-cyan-300">express-backend/</code> folder. Copy or clone them to your local project directory.
              </p>
              <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto">
{`cd express-backend
npm install`}
              </pre>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">2</span>
                <span>Configure Environment Variables in Vercel</span>
              </div>
              <p className="text-xs text-slate-400">
                Run the following commands or add them via Vercel Project Settings &gt; Environment Variables:
              </p>
              <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
{`vercel env add GEMINI_API_KEY
vercel env add WHATSAPP_TOKEN
vercel env add WHATSAPP_PHONE_NUMBER_ID
vercel env add WHATSAPP_VERIFY_TOKEN
vercel env add WHATSAPP_APP_SECRET`}
              </pre>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">3</span>
                <span>Deploy to Production &amp; Link Meta Webhook</span>
              </div>
              <p className="text-xs text-slate-400">
                Deploy using the Vercel CLI:
              </p>
              <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
{`vercel --prod`}
              </pre>
              <p className="text-xs text-slate-400 mt-2">
                Then set your Webhook URL in Meta Developer Dashboard:
                <br />
                <code className="text-emerald-400 font-mono">https://your-focusflow-bot.vercel.app/webhook</code>
                <br />
                with your Verify Token: <code className="text-cyan-400 font-mono">focusflow_secure_webhook_token_2026</code>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* File Explorer and Code Viewer */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* File Tabs Header */}
          <div className="bg-slate-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "server", name: "server.js" },
                { id: "vercel", name: "vercel.json" },
                { id: "package", name: "package.json" },
                { id: "env", name: ".env.example" },
                { id: "knowledge", name: "focusFlowKnowledge.js" },
                { id: "readme", name: "README.md" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-1.5 ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 font-medium shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : `Copy ${getFileName()}`}</span>
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="p-4 bg-[#0d1117] max-h-[580px] overflow-y-auto">
            <pre className="text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto">
              <code>{getActiveCode()}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
