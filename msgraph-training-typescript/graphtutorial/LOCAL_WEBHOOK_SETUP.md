## Complete Local Webhook Setup for Microsoft Graph Subscriptions

This guide shows you how to receive real-time notifications for sent emails during local development.

---

## The Setup (3 steps)

```
┌─────────────────┐
│  Your Laptop    │
│  localhost:3200 │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     ngrok       │  ← Creates public HTTPS URL
│ Tunnel Service  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Microsoft Graph │  ← Sends notifications
│   Azure AD      │
└─────────────────┘
```

---

## Step 1: Start Your Local Webhook Server

Open **Terminal 1**:

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial

# Set your access token (from Graph Explorer)
export GRAPH_TOKEN="your_token_here"

# Start the webhook server
npx ts-node webhook_server.ts
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║     Microsoft Graph Webhook Server - RUNNING            ║
╚══════════════════════════════════════════════════════════╝

🚀 Server listening on http://localhost:3200
```

**Leave this running!**

---

## Step 2: Expose with ngrok

Open **Terminal 2** (NEW terminal window):

```bash
ngrok http 3200
```

You'll see output like:
```
Session Status                online
Account                       Your Account
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3200

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok-free.app`)

**Leave this running too!**

---

## Step 3: Create the Subscription

Open **Terminal 3** (ANOTHER new terminal):

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial

# Set your token
export GRAPH_TOKEN="your_token_here"

# Set your ngrok URL (paste the HTTPS URL from step 2)
export WEBHOOK_URL="https://abc123def456.ngrok-free.app/webhook"

# Create subscription for SENT MAIL
npx ts-node subscribe_sent_mail.ts
```

You should see:
```
✅ SUCCESS! Subscription created!
📋 Subscription Details:
  ID: 7f105c7d-2dc5-4530-97cd-4e7ae6534c07
  Expires: 11/9/2025, 10:00:00 PM

🎉 You will now receive notifications when emails are sent!
```

---

## Step 4: Test It! 📧

1. **Send an email** from your Outlook (heifets@merck.com)
   - Go to outlook.office.com
   - Send any email to anyone

2. **Watch Terminal 1** (webhook server)
   - You should see notifications appear instantly!

Example output:
```
============================================================
📬 WEBHOOK REQUEST RECEIVED
============================================================
📧 CHANGE NOTIFICATION RECEIVED

Processing notification:
  Subscription ID: 7f105c7d...
  Change Type: created
  Resource: Users/heifets@merck.com/Messages/AAMkAGI2...

📥 Fetching full message details...

✉️  EMAIL DETAILS:
  Subject: Test Email
  From: heifets@merck.com
  To: recipient@example.com
  Sent: 11/6/2025, 10:45:30 PM
  Has Attachments: false

============================================================
✅ Notification processed successfully
```

---

## What Each Terminal Is Doing

| Terminal | Purpose | Command |
|----------|---------|---------|
| **Terminal 1** | Webhook server (receives notifications) | `npx ts-node webhook_server.ts` |
| **Terminal 2** | ngrok tunnel (exposes localhost) | `ngrok http 3200` |
| **Terminal 3** | Create subscription (one-time) | `npx ts-node subscribe_sent_mail.ts` |

---

## Monitoring Your Subscription

### View in Browser

While ngrok is running, you can also use the **ngrok web interface**:

```
http://127.0.0.1:4040
```

This shows:
- All HTTP requests
- Request/response details
- Timing information

### Check Subscription Status

```bash
export GRAPH_TOKEN="your_token"
npx ts-node create_subscription.ts
```

This lists all your active subscriptions.

---

## Subscription Lifecycle

```
Creation → Active (3 days) → Expiration
                ↓
         Renew before expiry
```

**Subscriptions expire after 3 days.** To renew:

```bash
# Delete old subscription
export SUBSCRIPTION_ID="your_subscription_id"
npx ts-node delete_subscription.ts

# Create new one
export WEBHOOK_URL="your_ngrok_url"
npx ts-node subscribe_sent_mail.ts
```

---

## Troubleshooting

### Issue: "Webhook validation failed"

**Cause:** ngrok URL is not accessible or webhook server is not running

**Fix:**
1. Check Terminal 1 - is webhook server running?
2. Check Terminal 2 - is ngrok running?
3. Test ngrok URL in browser: `https://your-ngrok-url.ngrok-free.app`
4. Should show: "Microsoft Graph Webhook Server"

---

### Issue: "No notifications received"

**Cause:** Multiple possibilities

**Fix:**
1. Send an email from Outlook (heifets@merck.com)
2. Check that email appears in Sent Items
3. Wait 10-30 seconds for notification
4. Check Terminal 1 for incoming requests
5. Check ngrok dashboard at http://127.0.0.1:4040

---

### Issue: "Token expired"

**Cause:** Your 24-hour token expired

**Fix:**
1. Go to Graph Explorer
2. Make any API call
3. Extract new token (F12 → Network → Headers)
4. Update `GRAPH_TOKEN` in all terminals
5. Restart webhook server

---

### Issue: ngrok session expires (free tier)

**Cause:** ngrok free tier sessions timeout after 8 hours

**Fix:**
1. Restart ngrok: `ngrok http 3200`
2. Copy NEW ngrok URL
3. Delete old subscription
4. Create new subscription with new URL

---

## Production Alternatives

For production, don't use ngrok. Instead:

### Option 1: Azure Functions
```typescript
// Deploy webhook_server.ts as Azure Function
// Get permanent HTTPS URL
// https://your-function.azurewebsites.net/api/webhook
```

### Option 2: AWS Lambda + API Gateway
```typescript
// Deploy as Lambda function
// Get permanent HTTPS URL
// https://your-api.amazonaws.com/webhook
```

### Option 3: Your Server
```bash
# Deploy to your server with HTTPS
# https://your-server.com/webhook
```

---

## Quick Reference Commands

```bash
# Start webhook server
export GRAPH_TOKEN="..." && npx ts-node webhook_server.ts

# Start ngrok
ngrok http 3200

# Create subscription
export WEBHOOK_URL="https://....ngrok-free.app/webhook" && \
export GRAPH_TOKEN="..." && \
npx ts-node subscribe_sent_mail.ts

# List subscriptions
export GRAPH_TOKEN="..." && npx ts-node create_subscription.ts

# Delete subscription
export GRAPH_TOKEN="..." && \
export SUBSCRIPTION_ID="..." && \
npx ts-node delete_subscription.ts
```

---

## Files You Need

- ✅ `webhook_server.ts` - Local webhook server (created)
- ✅ `subscribe_sent_mail.ts` - Create subscription (created)
- ✅ `create_subscription.ts` - Manage subscriptions (created)
- ✅ `ngrok` - Tunnel service (installed)

---

## Summary

1. **Start webhook server** (Terminal 1)
2. **Start ngrok** (Terminal 2)
3. **Create subscription** with ngrok URL (Terminal 3)
4. **Send email** from Outlook
5. **Watch notifications** appear in Terminal 1!

You now have real-time webhooks for sent mail events! 🎉
