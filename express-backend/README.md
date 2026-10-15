# FocusFlow WhatsApp Support Bot (Node.js & Express)

A production-ready Meta WhatsApp Business Cloud API support bot backend for the **FocusFlow** productivity app. Powered by Google Gemini AI (`gemini-3.8-flash` with automatic `gemini-3.1-flash-lite` fallback), with webhook verification, HMAC SHA-256 signature security, message status tracking, bug report ticketing, and 1-click Vercel deployment.

---

## 📋 Features

- **Meta Webhook Verification:** Full `GET /webhook` handshake with `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- **HMAC SHA-256 Signature Security:** Cryptographically validates `X-Hub-Signature-256` using your Meta App Secret.
- **Serverless-Safe Execution:** Awaits the complete message processing lifecycle before returning HTTP 200, preventing premature container freezes on Vercel.
- **Dual-Model Gemini AI:** Primary model `gemini-3.8-flash` with automatic failover to `gemini-3.1-flash-lite` on 503 high-demand spikes or network rate limits.
- **Message Status Handling:** Receives and logs webhook events for `sent`, `delivered`, and `read` statuses without triggering unwanted reply loops.
- **Auto Read Receipts:** Automatically marks user messages as read (`status: "read"`) to send double blue checkmarks.
- **Comprehensive Diagnostic Logging:** Structured latency, HTTP statuses, and Meta Graph API error codes (with token expiration detection).
- **Vercel Serverless Ready:** Includes preconfigured `vercel.json` with `maxDuration: 30` and exportable Express handler.

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
- Within this 24-hour window, your bot can send free-form messages (such as Gemini AI replies) at standard customer care rates.
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

### Step 2: Obtain Phone Number ID
1. Go to **WhatsApp** > **API Setup** in the left sidebar.
2. Note your **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`).

### Step 3: Configure Permanent System User Token (CRITICAL FOR PRODUCTION)
> **Note:** The 24-hour temporary token generated in WhatsApp > API Setup expires quickly and causes `OAuthException (code: 190, error_subcode: 463): Session has expired`. To create a permanent token:
1. Open [Meta Business Settings](https://business.facebook.com/settings).
2. Go to **Users** > **System Users** and click **Add** (or select an existing Admin system user).
3. Assign your FocusFlow app under **Assigned Assets** with Full Control.
4. Click **Generate New Token**, select your FocusFlow App, and select the following permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Set token expiration to **Never** (Permanent).
6. Copy the token and set it as `WHATSAPP_TOKEN` in Vercel.

### Step 4: Configure the Webhook
1. In Meta Developer Dashboard, click **WhatsApp** > **Configuration**.
2. Under **Webhook**, click **Edit**.
3. **Callback URL:** `https://your-domain.vercel.app/webhook`.
4. **Verify Token:** Enter your secret (e.g. `FocusFlowWebhookVerify_7mQ9xR2pL8vN` or your custom string).
5. Click **Verify and Save**. Meta will perform a `GET` handshake to your server.
6. Under **Webhook Fields**, click **Manage** and subscribe to **`messages`**.

---

## 🚀 Deploying to Vercel

### Method 1: Using the Vercel CLI (Fastest)

1. Navigate to the backend folder:
   ```bash
   cd express-backend
   ```

2. Link and deploy:
   ```bash
   vercel
   ```

3. Ensure all environment variables are set in Vercel:
   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add WHATSAPP_TOKEN
   vercel env add WHATSAPP_PHONE_NUMBER_ID
   vercel env add WHATSAPP_VERIFY_TOKEN
   vercel env add WHATSAPP_APP_SECRET
   ```

4. Deploy to Production:
   ```bash
   vercel --prod
   ```

### Method 2: Deploying via GitHub & Vercel Dashboard

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Fix FocusFlow WhatsApp bot serverless lifecycle and diagnostics"
   git push
   ```
2. In [Vercel Dashboard](https://vercel.com/), your deployment will automatically trigger.
3. Verify that your Environment Variables under **Project Settings > Environment Variables** match:
   - `GEMINI_API_KEY`: Key from Google AI Studio.
   - `WHATSAPP_TOKEN`: Permanent System User token from Meta.
   - `WHATSAPP_PHONE_NUMBER_ID`: Numeric ID from WhatsApp API Setup (e.g. `1416584018203797`).
   - `WHATSAPP_VERIFY_TOKEN`: Verification token matching Meta Webhook Configuration.
   - `WHATSAPP_APP_SECRET`: App secret from Meta App Settings > Basic.

---

## 🔍 Diagnostic Log Reference

When an incoming message arrives, the updated backend prints clear trace logs:

```
📩 [INCOMING USER MESSAGE] From: "Sarah" (14155552671) | Type: text
   Message Text: "How do I turn on the website blocker for FocusFlow on Mac?"
   Message ID:   wamid.HBgLMTQxNTU1...
[READ RECEIPT] Message marked as read: wamid.HBgLMTQxNTU1...
[GEMINI REQUEST] Calling model "gemini-3.8-flash" for sender 14155552671...
[GEMINI SUCCESS] Model "gemini-3.8-flash" generated reply in 1420ms (480 chars).
[WHATSAPP DISPATCH] Sending to recipient: 14155552671 via Phone ID: 1416584018203797...
[WHATSAPP SEND SUCCESS] HTTP 200 (340ms) | Meta Message ID: wamid.HBg...
✅ [BOT REPLIED] Successfully replied to 14155552671.
[WEBHOOK COMPLETED] All messages processed in 1860ms. Returning HTTP 200.
```

If Meta returns an authorization error, the log immediately flags:
```
[WHATSAPP SEND FAILED] HTTP 401 Unauthorized: { message: 'Authentication Error', code: 190 }
🚨 [ACTION REQUIRED - TOKEN EXPIRED] The Meta WhatsApp Access Token (WHATSAPP_TOKEN) has expired!
```
