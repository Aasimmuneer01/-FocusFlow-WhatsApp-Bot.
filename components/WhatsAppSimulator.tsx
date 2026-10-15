"use client";

import React, { useState } from "react";
import { Send, Check, CheckCheck, Sparkles, RefreshCw, AlertCircle, Bot, ShieldCheck } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  ticketId?: string;
}

const PRESET_QUESTIONS = [
  {
    label: "Blocker on macOS",
    query: "My website blocker stopped working after updating to macOS Sequoia. How do I fix it?",
  },
  {
    label: "Report Crash (iOS)",
    query: "The app crashed when starting a 50 min Pomodoro session on iPhone 15 Pro iOS 18.2.",
  },
  {
    label: "Sync Delay",
    query: "Tasks I create on my Android 14 phone aren't syncing to my Windows 11 laptop.",
  },
  {
    label: "Group Chat Question",
    query: "Can we add the FocusFlow bot to our WhatsApp study group for shared Pomodoro sprints?",
  },
  {
    label: "Pro vs Team Plans",
    query: "What is the difference between FocusFlow Pro and the Team workspace tier?",
  },
];

interface WhatsAppSimulatorProps {
  onEventLogged?: () => void;
}

export function WhatsAppSimulator({ onEventLogged }: WhatsAppSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_init_1",
      sender: "bot",
      text: "👋 Welcome to *FocusFlow Support* on WhatsApp! I can help you troubleshoot website blockers, cross-device sync, app crashes, or answer questions about Pro and Team plans.\n\nHow can I help you achieve deep focus today?",
      time: "10:14 AM",
      status: "read",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("Alex Rivera");
  const [userPhone, setUserPhone] = useState("+1 (415) 555-2671");

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = "msg_user_" + Date.now();

    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text,
      time: timeStr,
      status: "sent",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Simulate delivery ticks
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsgId ? { ...m, status: "delivered" } : m))
      );
    }, 400);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsgId ? { ...m, status: "read" } : m))
      );
    }, 800);

    try {
      const response = await fetch("/api/simulate-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          from: userPhone,
          userName: userName,
        }),
      });

      const data = await response.json();
      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: "msg_bot_" + Date.now(),
            sender: "bot",
            text: data.replyText,
            time: botTime,
            ticketId: data.ticket?.id,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "msg_bot_err_" + Date.now(),
            sender: "bot",
            text: "Sorry, I encountered a temporary processing error. Please try again or visit docs.focusflow.app.",
            time: botTime,
          },
        ]);
      }

      if (onEventLogged) {
        onEventLogged();
      }
    } catch (err) {
      console.error("Simulation error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_bot_err_" + Date.now(),
          sender: "bot",
          text: "Connection error: Unable to contact the backend webhook route.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "msg_init_reset",
        sender: "bot",
        text: "👋 Welcome back to *FocusFlow Support*! What can I help you with today?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "read",
      },
    ]);
  };

  // Helper to format WhatsApp markdown (*bold*, _italics_)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, lineIdx) => {
      // replace *bold*
      const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g);
      return (
        <span key={lineIdx} className="block min-h-[1.2rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith("*") && part.endsWith("*")) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-100">
                  {part.slice(1, -1)}
                </strong>
              );
            }
            if (part.startsWith("_") && part.endsWith("_")) {
              return (
                <em key={pIdx} className="italic text-slate-300">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* WhatsApp Device Mockup */}
      <div className="w-full max-w-md mx-auto lg:mx-0 flex-shrink-0 bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-700/60 relative">
        {/* Device Notch / Dynamic Island */}
        <div className="w-32 h-4 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-800 mr-2" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>

        {/* WhatsApp App Container */}
        <div className="bg-[#0b141a] rounded-[2rem] overflow-hidden flex flex-col h-[640px] text-slate-100 border border-slate-800">
          {/* WhatsApp Header */}
          <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-md text-sm">
                  FF
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#202c33]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-sm text-slate-100">FocusFlow Support</span>
                  <span className="inline-flex items-center text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Official
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">Meta Verified Business • Online</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              title="Reset Chat Session"
              className="p-1.5 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition text-xs flex items-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Messages Body with WhatsApp pattern background */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0b141a] bg-opacity-95 text-xs">
            {/* WhatsApp encryption badge banner */}
            <div className="bg-[#182229] border border-amber-500/20 rounded-lg p-2.5 text-center text-[11px] text-amber-200/90 shadow-sm">
              🔒 Messages are end-to-end encrypted with Meta WhatsApp Cloud API. Verified FocusFlow business profile.
            </div>

            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md relative leading-relaxed ${
                      isUser
                        ? "bg-[#005c4b] text-slate-100 rounded-tr-none"
                        : "bg-[#202c33] text-slate-200 rounded-tl-none border border-slate-700/40"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center space-x-1 mb-1 text-[10px] text-emerald-400 font-semibold tracking-wide">
                        <Sparkles className="w-3 h-3" />
                        <span>FocusFlow Gemini AI</span>
                        {msg.ticketId && (
                          <span className="ml-auto bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-mono border border-amber-500/30">
                            Ticket #{msg.ticketId}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-[12px] break-words whitespace-pre-wrap">
                      {renderFormattedText(msg.text)}
                    </div>

                    <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-400">
                      <span>{msg.time}</span>
                      {isUser && (
                        <span>
                          {msg.status === "sent" && <Check className="w-3.5 h-3.5 text-slate-400" />}
                          {msg.status === "delivered" && (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {msg.status === "read" && (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] rounded-2xl rounded-tl-none px-4 py-3 shadow border border-slate-700/40 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="text-[11px] text-slate-400 ml-1">FocusFlow AI is typing...</span>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Input Bar */}
          <div className="bg-[#202c33] p-2.5 flex items-center space-x-2 border-t border-slate-700/40">
            <input
              type="text"
              placeholder="Ask a question or report a bug..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
              className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-xs text-slate-100 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                inputText.trim() && !isLoading
                  ? "bg-[#00a884] hover:bg-[#00c59b] text-white shadow-md cursor-pointer"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Controls & Quick Prompts */}
      <div className="flex-1 space-y-5 w-full">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>Simulated WhatsApp Customer Profile</span>
            </h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              24-Hour Active Window
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Simulates an incoming WhatsApp message payload from an authentic WhatsApp user ID. The backend handles message receipt, sends a read-receipt handshake, invokes Gemini 3.8 Flash with FocusFlow knowledge, and updates delivery statuses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
            <div>
              <label className="text-slate-400 block mb-1">Simulated User Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">WhatsApp Phone Number ID</label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4">
            <label className="text-xs font-medium text-slate-300 block mb-2.5">
              Click to Send Instant FocusFlow Test Scenarios:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.query)}
                  disabled={isLoading}
                  className="text-left text-xs bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/40 rounded-xl px-3 py-2 transition flex items-center space-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-cyan-400" />
            <span>How Webhook Message Statuses Work in Production</span>
          </h4>
          <p className="leading-relaxed text-slate-400">
            When a user writes to your WhatsApp number, Meta invokes <code className="text-emerald-400 font-mono">POST /webhook</code>. Your Node.js / Express backend immediately returns <code className="text-emerald-400 font-mono">200 OK</code> to avoid timeout retries, marks the message as <strong className="text-slate-200">&apos;read&apos;</strong> (triggering double blue ticks in the user&apos;s WhatsApp app), and executes Gemini AI asynchronously to send the reply back.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px]">
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Step 1</span>
              <span className="text-slate-200">✓ Sent</span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Step 2</span>
              <span className="text-slate-200">✓✓ Delivered</span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Step 3</span>
              <span className="text-cyan-400">✓✓ Read</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
