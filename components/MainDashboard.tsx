"use client";

import React, { useState } from "react";
import { MessageSquare, Webhook, Bug, Users, FileCode, Shield, CheckCircle2, Terminal, ArrowUpRight, Sparkles } from "lucide-react";
import { WhatsAppSimulator } from "./WhatsAppSimulator";
import { WebhookInspector } from "./WebhookInspector";
import { SupportTicketsView } from "./SupportTicketsView";
import { GroupLimitationsGuide } from "./GroupLimitationsGuide";
import { CodeDeploymentHub } from "./CodeDeploymentHub";
import { SecurityOverview } from "./SecurityOverview";

interface MainDashboardProps {
  serverCode: string;
  vercelJson: string;
  packageJson: string;
  envExample: string;
  knowledgeCode: string;
  readmeMarkdown: string;
  appUrl: string;
}

export function MainDashboard({
  serverCode,
  vercelJson,
  packageJson,
  envExample,
  knowledgeCode,
  readmeMarkdown,
  appUrl,
}: MainDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "simulator" | "webhook" | "tickets" | "group-rules" | "deploy" | "security"
  >("simulator");

  const [lastEventTime, setLastEventTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  const handleEventLogged = () => {
    setLastEventTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const navItems = [
    { id: "simulator", label: "WhatsApp Simulator", icon: MessageSquare, badge: "Live Gemini" },
    { id: "webhook", label: "Webhook & Meta Handshake", icon: Webhook, badge: "GET / POST" },
    { id: "tickets", label: "Bug Reports & Triage", icon: Bug, badge: "AI Parsed" },
    { id: "group-rules", label: "Group Chat Constraints", icon: Users, badge: "Meta Policy" },
    { id: "deploy", label: "Express & Vercel Code", icon: FileCode, badge: "Production" },
    { id: "security", label: "Security & Env Secrets", icon: Shield, badge: "Zero-Leak" },
  ];

  return (
    <div className="min-h-screen bg-[#070b10] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Banner / System Notice */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border-b border-emerald-500/20 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400">FocusFlow WhatsApp Backend:</span>
            <span>Meta Webhook Handshake verified &bull; Gemini 3.8 Flash Active &bull; Vercel Serverless Ready</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
              Webhook: {appUrl}/api/webhook
            </span>
            <span>Last Activity: {lastEventTime}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-lg">
              FF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">FocusFlow</h1>
                <span className="text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  WhatsApp Support Bot
                </span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full hidden md:inline">
                  Meta Cloud API v21.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI deep-work support companion, issue ticketing, and verified webhook backend
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setActiveTab("simulator")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab("deploy")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-xl transition border border-slate-700/60 flex items-center space-x-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Deploy to Vercel</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-1 overflow-x-auto py-2 no-scrollbar border-t border-slate-800/40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === "simulator" && (
          <WhatsAppSimulator onEventLogged={handleEventLogged} />
        )}

        {activeTab === "webhook" && <WebhookInspector />}

        {activeTab === "tickets" && <SupportTicketsView />}

        {activeTab === "group-rules" && <GroupLimitationsGuide />}

        {activeTab === "deploy" && (
          <CodeDeploymentHub
            serverCode={serverCode}
            vercelJson={vercelJson}
            packageJson={packageJson}
            envExample={envExample}
            knowledgeCode={knowledgeCode}
            readmeMarkdown={readmeMarkdown}
          />
        )}

        {activeTab === "security" && <SecurityOverview />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span>FocusFlow Production WhatsApp Bot</span>
            <span>&bull;</span>
            <span>Built with Node.js, Express &amp; Gemini 3.8 Flash</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 font-mono">Meta Graph API v21.0</span>
            <span className="text-slate-400">&bull;</span>
            <span>Vercel Serverless Compatible</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
