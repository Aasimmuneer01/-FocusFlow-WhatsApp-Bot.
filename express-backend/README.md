# FocusFlow WhatsApp Support Bot (Node.js & Express)

A production-ready Meta WhatsApp Business Cloud API support bot backend for the **FocusFlow** productivity app. Powered by Google Gemini AI (`gemini-3.8-flash`), with webhook verification, HMAC SHA-256 signature security, message status tracking, bug report ticketing, and 1-click Vercel deployment.

---

## 📋 Features

- **Meta Webhook Verification:** Full `GET /webhook` handshake with `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- **HMAC SHA-256 Signature Security:** Cryptographically validates `X-Hub-Signature-256` using your Meta App Secret.
- **AI Support Agent:** Server-side Gemini AI (`gemini-3.8-flash` via `@google/genai`) trained on FocusFlow's knowledge base (Pomodoro intervals, blocker permissions on macOS/Android, cloud sync, calendar integrations, and billing).
- **Bug & Crash Triage:** Automatically detects user-reported issues and generates unique support ticket IDs (`*Ticket ID: FF-XXXXX*`).
- **Message Status Handling:** Receives and logs webhook events for `sent`, `delivered`, and `read` statuses.
- **Auto Read Receipts:** Automatically marks user messages as read (`status: "read"`) to send double blue checkmarks.
- **Vercel Serverless Ready:** Includes preconfigured `vercel.json` and exportable Express handler.

---

## 🚨 Critical Security Architecture

> **SECURITY RULE:** Meta WhatsApp Cloud API credentials (`WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`) and your `GEMINI_API_KEY` are **strictly server-side secrets**.
> - **NEVER** expose them to any React or browser client code.
> - **NEVER** prefix them with `NEXT_PUBLIC_` or commit them to public Git repositories.
> - In this project, all API calls to `https://graph.facebook.com` and Gemini occur exclusively on the Node.js server.

---

## ⚠️ WhatsApp Group Messaging Limitations & Policies

Meta imposes strict structural rules and policies on the **WhatsApp Business Cloud API** regarding group chats:

### 1. No Native Group Messaging Support in Cloud API
Unlike Telegram, Slack, or Discord bot integrations:
- The **WhatsApp Business Platform / Cloud API DOES NOT support bots participating in WhatsApp Groups**.
- The API endpoint `/messages` is strictly designed for **1-to-1 conversations** (`"recipient_type": "individual"`).
- Trying to send a message to a group JID (e.g., `123456789-group@g.us`) will return an error code `100: Invalid parameter`.

### 2. The 24-Hour Customer Service Window
- When a user sends a 1-to-1 message to your FocusFlow WhatsApp number, Meta opens a **24-hour customer service window**.
- Within this 24-hour window, your bot can send free-form messages (such as Gemini AI replies) at standard low session rates.
- Once 24 hours have elapsed without a user message, you **cannot** send free-form messages. You may only re-engage users with pre-approved **Meta Message Templates** (Utility, Marketing, or Authentication).

### 3. Recommended Group & Team Alternatives for FocusFlow:
If FocusFlow users want collaborative deep-work focus rooms:
- **FocusFlow Virtual Focus Rooms:** Use FocusFlow's native web/mobile synchronized focus rooms.
- **Slack / Discord FocusFlow Bots:** Implement team presence and blocker bots on platforms that natively permit multi-user group chat participation.
- **WhatsApp Broadcast / Channels:** For announcements, use WhatsApp Business Channels rather than group bots.

---

## 🛠️ Step-by-Step Meta Developer Setup

### Step 1: Create a Meta App
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Click **My Apps** > **Create App**.
3. Select **Other** > **Business**, and name your app `FocusFlow Support`.
4. Under "Add products to your app", click **Set Up** on **WhatsApp**.

### Step 2: Obtain Phone Number ID and Test Token
1. Go to **WhatsApp** > **API Setup** in the left sidebar.
2. Note your **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`).
3. Add your personal WhatsApp number under "To" to test sandbox messaging.

### Step 3: Configure Permanent System User Token (Production)
*Do not use the temporary 24-hour token for production.*
1. Go to [Meta Business Settings](https://business.facebook.com/settings).
2. Navigate to **Users** > **System Users** and click **Add**.
3. Role: **Admin**.
4. Click **Generate New Token**, select your FocusFlow app, and grant the `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
5. Copy the generated permanent token (`WHATSAPP_TOKEN`).

### Step 4: Configure the Webhook
1. In Meta Developer Dashboard, click **WhatsApp** > **Configuration**.
2. Under **Webhook**, click **Edit**.
3. **Callback URL:** `https://your-domain.vercel.app/webhook` (or your local ngrok/tunnel URL).
4. **Verify Token:** Enter your custom secret (e.g. `focusflow_secure_webhook_token_2026`).
5. Click **Verify and Save**. Meta will perform a `GET` handshake to your server.
6. Under **Webhook Fields**, click **Manage** and subscribe to **`messages`**.

---

## 🚀 Deploying to Vercel

### Method 1: Using the Vercel CLI (Fastest)

1. Install the Vercel CLI if you haven't:
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. Navigate to this backend folder:
   \`\`\`bash
   cd express-backend
   \`\`\`

3. Deploy and link project:
   \`\`\`bash
   vercel
   \`\`\`

4. Add your Environment Variables to Vercel:
   \`\`\`bash
   vercel env add GEMINI_API_KEY
   vercel env add WHATSAPP_TOKEN
   vercel env add WHATSAPP_PHONE_NUMBER_ID
   vercel env add WHATSAPP_VERIFY_TOKEN
   vercel env add WHATSAPP_APP_SECRET
   \`\`\`

5. Deploy to Production:
   \`\`\`bash
   vercel --prod
   \`\`\`

### Method 2: Deploying via GitHub & Vercel Dashboard

1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import your repository.
4. Under **Environment Variables**, paste the following keys:
   - `GEMINI_API_KEY`: Your key from Google AI Studio.
   - `WHATSAPP_TOKEN`: Permanent System User token from Meta.
   - `WHATSAPP_PHONE_NUMBER_ID`: Numeric ID from WhatsApp API Setup.
   - `WHATSAPP_VERIFY_TOKEN`: Your secret token string (e.g. `focusflow_secure_webhook_token_2026`).
   - `WHATSAPP_APP_SECRET`: App secret from Meta App Settings > Basic.
5. Click **Deploy**.
6. Copy your Vercel deployment URL (e.g. `https://focusflow-bot.vercel.app`) and configure `https://focusflow-bot.vercel.app/webhook` in Meta.

---

## 🧪 Local Testing with ngrok

To test your local server with real WhatsApp messages:

1. Install dependencies & start server:
   \`\`\`bash
   npm install
   npm run dev
   \`\`\`

2. Start an ngrok tunnel to port 3000:
   \`\`\`bash
   ngrok http 3000
   \`\`\`

3. In Meta Developer Dashboard:
   - **Callback URL:** `https://your-ngrok-url.ngrok-free.app/webhook`
   - **Verify Token:** `focusflow_secure_webhook_token_2026`

4. Send a WhatsApp message to your test number!
