"use client";

import React, { useState, useEffect } from "react";
import { Bug, CheckCircle2, AlertCircle, Clock, Smartphone, RefreshCw, Filter, ShieldAlert } from "lucide-react";
import { SupportTicket } from "@/lib/types";

export function SupportTicketsView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/support-tickets");
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/support-tickets")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.tickets) {
          setTickets(data.tickets);
        }
      })
      .catch((err) => console.error("Failed to fetch tickets:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: SupportTicket["status"]) => {
    try {
      const res = await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Error updating ticket status:", err);
    }
  };

  const filtered = tickets.filter((t) => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
              <Bug className="w-5 h-5 text-emerald-400" />
              <span>FocusFlow Support Tickets &amp; Bug Triage</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Issues, sync anomalies, and crash reports automatically detected and parsed from incoming WhatsApp messages by Gemini AI.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchTickets}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
              {filtered.length} Active Tickets
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
          <div className="flex items-center space-x-1 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          {["all", "bug", "sync_issue", "billing", "feature_request"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg capitalize transition ${
                filterCategory === cat
                  ? "bg-emerald-600 text-white font-medium shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat === "all" ? "All Categories" : cat.replace("_", " ")}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-2 hidden sm:block" />

          <div className="flex items-center space-x-1 text-slate-400">
            <span>Status:</span>
          </div>
          {["all", "open", "in_investigation", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg capitalize transition ${
                filterStatus === st
                  ? "bg-cyan-600 text-white font-medium shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "all" ? "All Statuses" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            No tickets match your selected filters. Try reporting an issue in the WhatsApp Simulator!
          </div>
        ) : (
          filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-bold bg-slate-950 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-800">
                    {ticket.id}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      ticket.severity === "critical"
                        ? "bg-red-500/20 text-red-300 border-red-500/40"
                        : ticket.severity === "high"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    }`}
                  >
                    {ticket.severity} Severity
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize bg-slate-800/80 px-2 py-0.5 rounded">
                    {ticket.category.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={ticket.status}
                    onChange={(e) =>
                      handleStatusChange(ticket.id, e.target.value as SupportTicket["status"])
                    }
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_investigation">In Investigation</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-100">{ticket.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-sans">
                  &ldquo;{ticket.rawQuery}&rdquo;
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{ticket.osDevice || "Unspecified"}</span>
                  </span>
                  <span>•</span>
                  <span>App: {ticket.appVersion || "v3.4.2"}</span>
                  <span>•</span>
                  <span>User: {ticket.userId}</span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
