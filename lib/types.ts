/**
 * WhatsApp Cloud API Webhook and Message Type Definitions
 */

export interface WhatsAppTextMessage {
  body: string;
}

export interface WhatsAppInteractiveMessage {
  type: "button_reply" | "list_reply";
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface WhatsAppIncomingMessage {
  from: string; // sender WhatsApp ID (phone number, e.g. "15551234567")
  id: string; // wamid.HBg...
  timestamp: string;
  type: "text" | "interactive" | "image" | "audio" | "document" | "location";
  text?: WhatsAppTextMessage;
  interactive?: WhatsAppInteractiveMessage;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppStatus {
  id: string; // message ID
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

export interface WhatsAppWebhookChangeValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppWebhookEntry {
  id: string; // WABA ID
  changes: Array<{
    value: WhatsAppWebhookChangeValue;
    field: "messages";
  }>;
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: WhatsAppWebhookEntry[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  category: "bug" | "sync_issue" | "billing" | "feature_request" | "general_inquiry";
  title: string;
  description: string;
  osDevice?: string;
  appVersion?: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_investigation" | "resolved";
  createdAt: string;
  source: "whatsapp";
  rawQuery: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  method: "GET" | "POST";
  endpoint: string;
  type: "verification" | "incoming_message" | "message_status" | "error";
  status: number;
  payloadSummary: string;
  from?: string;
  to?: string;
  messageId?: string;
  details?: Record<string, unknown>;
  verifiedSignature?: boolean;
}
