import { SupportTicket, WebhookLog } from "./types";

/**
 * In-memory global store to hold recent Webhook Logs and Support Tickets
 * for live monitoring and interactive testing in the UI.
 */
class BotStore {
  private static instance: BotStore;
  private tickets: SupportTicket[] = [];
  private logs: WebhookLog[] = [];
  private conversationHistory: Map<string, Array<{ role: "user" | "model"; text: string; timestamp: string }>> = new Map();

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): BotStore {
    if (!BotStore.instance) {
      BotStore.instance = new BotStore();
    }
    return BotStore.instance;
  }

  private seedInitialData() {
    this.tickets = [
      {
        id: "FF-83921",
        userId: "+14155552671",
        userName: "Sarah Jenkins",
        category: "bug",
        title: "Mac blocker permission resetting after macOS Sequoia 15.1 update",
        description: "User reported that after restarting macOS, the FocusFlow accessibility helper is unselected.",
        osDevice: "macOS Sequoia 15.1 (MacBook Pro M2)",
        appVersion: "v3.4.2",
        severity: "medium",
        status: "open",
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        source: "whatsapp",
        rawQuery: "Hey my website blocker stopped working this morning right after I updated to macOS 15.1. Can you help?",
      },
      {
        id: "FF-49102",
        userId: "+447911123456",
        userName: "Marcus Thorne",
        category: "sync_issue",
        title: "Pomodoro sessions delay syncing between Android 14 and Windows 11",
        description: "Completed sessions on Android phone take ~10 minutes to reflect on desktop app.",
        osDevice: "Android 14 (Pixel 8) / Windows 11 Pro",
        appVersion: "v3.4.1",
        severity: "low",
        status: "in_investigation",
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        source: "whatsapp",
        rawQuery: "I just finished two 50 min deep work blocks on my Pixel 8 but my Windows app still shows 0 sessions for today.",
      },
    ];

    this.logs = [
      {
        id: "log_01",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        method: "GET",
        endpoint: "/api/webhook",
        type: "verification",
        status: 200,
        payloadSummary: "hub.mode=subscribe & hub.challenge verified successfully",
        details: { verify_token_match: true, challenge_length: 10 },
      },
      {
        id: "log_02",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        method: "POST",
        endpoint: "/api/webhook",
        type: "incoming_message",
        status: 200,
        payloadSummary: "Incoming text from +14155552671: 'How do I enable binaural beats in Pro?'",
        from: "+14155552671",
        messageId: "wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI2ODQ4MjE4Mzg0OTI1ODQ3MwA=",
        verifiedSignature: true,
      },
      {
        id: "log_03",
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        method: "POST",
        endpoint: "/api/webhook",
        type: "message_status",
        status: 200,
        payloadSummary: "Message status: 'delivered' to +14155552671",
        to: "+14155552671",
        messageId: "wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI2ODQ4MjE4Mzg0OTI1ODQ3MwA=",
      },
      {
        id: "log_04",
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        method: "POST",
        endpoint: "/api/webhook",
        type: "message_status",
        status: 200,
        payloadSummary: "Message status: 'read' by +14155552671",
        to: "+14155552671",
        messageId: "wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI2ODQ4MjE4Mzg0OTI1ODQ3MwA=",
      },
    ];
  }

  public addLog(log: Omit<WebhookLog, "id">): WebhookLog {
    const newLog: WebhookLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      ...log,
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 50) {
      this.logs.pop();
    }
    return newLog;
  }

  public getLogs(): WebhookLog[] {
    return [...this.logs];
  }

  public addTicket(ticket: Omit<SupportTicket, "id" | "createdAt"> & { id?: string }): SupportTicket {
    const id = ticket.id || "FF-" + Math.floor(10000 + Math.random() * 90000);
    const newTicket: SupportTicket = {
      id,
      createdAt: new Date().toISOString(),
      ...ticket,
    };
    this.tickets.unshift(newTicket);
    if (this.tickets.length > 100) {
      this.tickets.pop();
    }
    return newTicket;
  }

  public getTickets(): SupportTicket[] {
    return [...this.tickets];
  }

  public updateTicketStatus(id: string, status: SupportTicket["status"]): boolean {
    const ticket = this.tickets.find((t) => t.id === id);
    if (ticket) {
      ticket.status = status;
      return true;
    }
    return false;
  }

  public addConversationTurn(userId: string, role: "user" | "model", text: string) {
    const history = this.conversationHistory.get(userId) || [];
    history.push({ role, text, timestamp: new Date().toISOString() });
    // keep last 12 turns
    if (history.length > 12) {
      history.shift();
    }
    this.conversationHistory.set(userId, history);
  }

  public getConversationHistory(userId: string) {
    return this.conversationHistory.get(userId) || [];
  }
}

export const botStore = BotStore.getInstance();
