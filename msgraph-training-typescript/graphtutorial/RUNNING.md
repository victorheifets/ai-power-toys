# AI Power Toys - Running Guide

## 🚀 Quick Start

### First Time Setup
```bash
./setup-database.sh   # One-time: Create and initialize database
./start-all.sh        # Start all components
```

### Start All Components
```bash
./start-all.sh
```

This will:
1. **Check/Start PostgreSQL** and create database if needed
2. **Start Webhook Server** on http://localhost:3200
3. **Start Dashboard** on http://localhost:5273
4. **Start Electron Client Agent** (system tray)

---

## 🛑 Stop All Components
```bash
./stop-all.sh
```

---

## 🔄 Restart Individual Components

### Restart Webhook Server (port 3200)
```bash
./restart-webhook.sh
```
This kills any process on port 3200 and restarts the webhook server.

### Restart Dashboard (port 5273)
```bash
./restart-dashboard.sh
```
This kills any process on port 5273 and restarts the dashboard.

### Restart Client Agent
```bash
./restart-client-agent.sh
```
This kills any Electron processes and restarts the client agent.

---

## 📋 Manual Start (Individual Components)

### 1. Webhook Server
```bash
cd /path/to/graphtutorial
npx ts-node webhook_server_db.ts
```

### 2. Dashboard
```bash
cd /path/to/graphtutorial/dashboard
npm run dev
```

### 3. Client Agent
```bash
cd /path/to/graphtutorial/client-agent
npm run dev
```

---

## 📊 Component Status

### Check if components are running:
```bash
# Check webhook server
lsof -i :3200

# Check dashboard
lsof -i :5273

# Check client agent
pgrep -f "electron.*client-agent"
```

---

## 📝 Logs

All logs are stored in: `graphtutorial/logs/`

- `webhook-server.log` - Backend webhook server logs
- `dashboard.log` - Frontend dashboard logs
- `client-agent.log` - Electron app logs

### View logs in real-time:
```bash
tail -f logs/webhook-server.log
tail -f logs/dashboard.log
tail -f logs/client-agent.log
```

---

## 🔧 Troubleshooting

### Port already in use?
Use the restart scripts to kill and restart:
```bash
./restart-webhook.sh    # Restarts port 3200
./restart-dashboard.sh  # Restarts port 5273
```

### Force kill all processes:
```bash
# Kill webhook server
kill -9 $(lsof -ti :3200)

# Kill dashboard
kill -9 $(lsof -ti :5273)

# Kill electron
pkill -9 -f "electron.*client-agent"
```

### Database not connected?
Run the database setup script:
```bash
./setup-database.sh
```

Or manually:
```bash
# Create database
psql -d postgres -c "CREATE DATABASE ai_power_toys;"

# Run schema
psql -d ai_power_toys -f database/schema.sql

# Restart webhook server to pick up the database
./restart-webhook.sh
```

### Environment variables not set?
The webhook server needs these environment variables:
```bash
export GRAPH_TOKEN="your_microsoft_graph_token"
export OPENAI_API_KEY="your_openai_api_key"
```

Add them to your `~/.bashrc` or `~/.zshrc` for persistence.

---

## 📦 Project Structure

```
graphtutorial/
├── webhook_server_db.ts       # Backend server (port 3200)
├── dashboard/                  # React dashboard (port 5273)
├── client-agent/               # Electron app (system tray)
├── database/
│   ├── db.ts                   # Database connection
│   └── schema.sql              # Database schema
├── logs/                       # Log files
├── start-all.sh                # Start all components
├── stop-all.sh                 # Stop all components
├── restart-webhook.sh          # Restart webhook server
├── restart-dashboard.sh        # Restart dashboard
└── restart-client-agent.sh     # Restart client agent
```

---

## ✅ All Components Running Successfully

When all components are running, you should see:

1. **Webhook Server**: Console output showing "Server listening on http://localhost:3200"
2. **Dashboard**: Browser window at http://localhost:5273 showing the dashboard
3. **Client Agent**: Icon in system tray (macOS menu bar)

---

## 🎯 Next Steps

### Setting Up Webhooks

The system requires two Microsoft Graph webhook subscriptions to monitor both incoming and outgoing emails:

1. **Inbox Subscription** (for incoming emails)
2. **Sent Items Subscription** (for outgoing emails)

#### Initial Setup

1. **Start CloudFlare Tunnel or ngrok** (for HTTPS webhook endpoint):
   ```bash
   ngrok http 3200
   # Or use cloudflared tunnel
   ```

2. **Apply Graph API Token** in dashboard:
   - Open http://localhost:5273
   - Paste your Microsoft Graph API token (from Graph Explorer)
   - Click "Apply Token"

3. **Verify Inbox Subscription Exists**:
   ```bash
   curl -s http://localhost:3200/health | jq '.subscriptions'
   ```

4. **Create Sent Items Subscription** (for outgoing emails):
   ```bash
   curl -X POST http://localhost:3200/api/subscribe-sent-items
   ```

#### What Gets Monitored

- **Inbox Subscription**: Monitors `me/mailFolders('Inbox')/messages`
  - Triggers on new emails arriving in your Inbox
  - Webhook fires when external emails arrive

- **Sent Items Subscription**: Monitors `/me/mailFolders/sentitems/messages`
  - Triggers on emails you send
  - Webhook fires immediately after sending

#### Testing Webhooks

1. **Test Incoming Email**: Send an email TO `heifets@merck.com`
2. **Test Outgoing Email**: Use dashboard to send email FROM `heifets@merck.com`
3. **View Results**: Check dashboard or logs for detections

### After Webhooks Are Working

4. View detections in the dashboard
5. Receive notifications in the Electron client agent
6. Take actions on Power Toy detections

---

## 📞 Support

For issues or questions, check the logs first:
```bash
ls -lh logs/
tail -f logs/webhook-server.log
```
