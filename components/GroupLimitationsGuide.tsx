"use client";

import React from "react";
import { Users, AlertTriangle, Clock, ShieldX, CheckCircle, ArrowRight, Lightbulb, MessageSquare } from "lucide-react";

export function GroupLimitationsGuide() {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              WhatsApp Group Messaging: Official Meta Cloud API Constraints
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Developers frequently ask: <em>&ldquo;Can we add our FocusFlow WhatsApp AI bot into group chats with our study buddies or coworkers?&rdquo;</em>
              Here is Meta&apos;s architectural reality and policy rules for the WhatsApp Business Cloud API.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Limitations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Limitation 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-3">
              <ShieldX className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mb-1.5">
              1. No Bot Support for Groups
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unlike Telegram, Discord, or Slack bot frameworks, the <strong>Meta WhatsApp Cloud API does NOT support adding bots to WhatsApp Groups</strong>. The <code className="text-slate-300">/messages</code> endpoint strictly requires:
            </p>
            <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-red-400">
              &quot;recipient_type&quot;: &quot;individual&quot;
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Attempting to pass a WhatsApp Group JID (e.g., <code className="text-slate-400">12345-group@g.us</code>) returns Graph API Error 100 (&ldquo;Invalid Parameter&rdquo;).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-amber-400 font-medium">
            Strict Meta Cloud API limitation
          </div>
        </div>

        {/* Limitation 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mb-1.5">
              2. The 24-Hour Service Window
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a user messages FocusFlow, Meta opens a rolling <strong>24-hour customer care window</strong>.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Within 24 Hours:</strong> Bot can reply with dynamic AI text for free or low customer service pricing.
              </li>
              <li>
                <strong className="text-slate-300">After 24 Hours:</strong> Bot <em>cannot</em> send free-form messages. Must use pre-approved Meta message templates (utility/marketing fees apply).
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-cyan-400 font-medium">
            Prevents unsolicited spam
          </div>
        </div>

        {/* Limitation 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mb-1.5">
              3. Opt-in &amp; Spam Protection
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Meta enforces severe penalties (phone number quality rating downgrade, messaging limit decrease, or permanent WABA ban) if users mark bot messages as spam.
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Group environments frequently trigger spam reports because not all group members opted in to receive automated productivity pings.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-400 font-medium">
            Protects phone quality score
          </div>
        </div>
      </div>

      {/* FocusFlow Architectural Alternatives */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2 mb-4">
          <Lightbulb className="w-4 h-4 text-emerald-400" />
          <span>Recommended Architecture for FocusFlow Team &amp; Group Deep Work</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-200">
                Option A: FocusFlow Virtual Focus Rooms (In-App)
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Direct users to FocusFlow Team tier for real-time synchronized Pomodoro timers, video/audio ambient rooms, and habit streaks inside the FocusFlow app.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-200">
                Option B: Slack &amp; Discord Bot Integrations
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Use Slack or Discord webhooks where group channels natively allow shared team timers, leaderboard notifications, and &ldquo;Do Not Disturb&rdquo; status sync.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-200">
                Option C: 1-on-1 WhatsApp Coaching &amp; Accountability
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Keep the WhatsApp bot focused on individual deep-work support: sending personal morning focus briefs, answering blocker setup questions, and triaging bugs.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-200">
                Option D: WhatsApp Broadcast Channels
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                For community announcements (product release notes, weekly focus tips), create an official WhatsApp Channel where users follow one-way updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
