# 🎯 AI Power Toys

An intelligent email assistant that monitors your Microsoft 365 inbox and proactively suggests context-aware actions through desktop notifications.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

---

## 🚀 What It Does

AI Power Toys automatically analyzes your emails and detects:

- **📅 Follow-ups** - Deadlines and action items requiring calendar reminders
- **✅ Tasks** - Actionable items to add to your task list
- **⚠️ Urgent Requests** - High-priority emails needing immediate attention
- **🏆 Kudos** - Achievements worth celebrating or sharing

When a "Power Toy" is detected, you get an instant desktop notification with smart action buttons tailored to the detection type.

---

## 📋 Quick Start

### Prerequisites

- **PostgreSQL 14+** installed and running
- **Node.js 18+**
- **Microsoft 365 Account** (Outlook/Exchange)
- **Graph API Token** (from [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer))

### Installation

```bash
# 1. Clone the repository
cd graphtutorial

# 2. Install dependencies
npm install
cd dashboard && npm install && cd ..
cd client-agent && npm install && cd ..

# 3. Setup database
./setup-database.sh

# 4. Start all components
./start-all.sh
```

### First-Time Configuration

1. **Get Graph API Token**:
   - Visit [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
   - Sign in with your Microsoft 365 account
   - Copy the access token

2. **Apply Token**:
   - Open http://localhost:5273
   - Paste token and click "Apply Token"

3. **Create Webhook Subscriptions**:
   ```bash
   # Create subscription for outgoing emails
   curl -X POST http://localhost:3200/api/subscribe-sent-items
   ```

4. **Test It**:
   - Send a test email using the dashboard
   - Watch for desktop notification!

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Microsoft Graph API (Office 365)                │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhooks
                         ▼
         ┌───────────────────────────────┐
         │   Webhook Server (port 3200)  │
         │   • Receives email webhooks    │
         │   • AI analysis (LLM)          │
         │   • Database storage           │
         │   • SSE event broadcast        │
         └────────┬──────────────┬────────┘
                  │              │
        ┌─────────▼──────┐   ┌──▼────────────────┐
        │   PostgreSQL   │   │  SSE Clients      │
        └────────────────┘   └──┬────────────────┘
                                │
        ┌───────────────────────┴─────────┐
        │    Dashboard (port 5273)        │
        │    • React UI                   │
        │    • Token management           │
        │    • Email composition          │
        └─────────────────────────────────┘
                │
        ┌───────▼─────────────────────────┐
        │  Client Agent (Electron)        │
        │  • System tray                  │
        │  • Desktop notifications        │
        │  • Action buttons               │
        └─────────────────────────────────┘
```

---

## 🎨 Power Toy Types

### 📅 Follow-Up
**Detects**: Deadlines, action items, "get back to me"
**Actions**: Create Calendar Event | Set Reminder

### ✅ Task
**Detects**: "Please do", "Can you", action verbs
**Actions**: Create Task | Add to To-Do

### ⚠️ Urgent
**Detects**: "Urgent", "ASAP", emails from VIPs
**Actions**: Reply Now | Flag Important

### 🏆 Kudos
**Detects**: Achievements, "great work", congratulations
**Actions**: Send Thanks | Share with Team

---

## 📂 Project Structure

```
graphtutorial/
├── webhook_server_db.ts       # Backend server (Express + TypeScript)
├── dashboard/                  # React dashboard (Vite)
├── client-agent/               # Electron desktop app
├── database/
│   ├── db.ts                   # PostgreSQL client
│   └── schema.sql              # Database schema
├── logs/                       # Application logs
├── *.sh                        # Management scripts
├── README.md                   # This file
├── RUNNING.md                  # Detailed running instructions
├── STATUS.md                   # Current system status
└── PROJECT_OVERVIEW.md         # Full technical documentation
```

---

## 🛠️ Management Scripts

### Start/Stop
```bash
./start-all.sh          # Start all components
./stop-all.sh           # Stop all components
```

### Restart Individual Components
```bash
./restart-webhook.sh    # Restart webhook server (port 3200)
./restart-dashboard.sh  # Restart dashboard (port 5273)
./restart-client-agent.sh  # Restart Electron app
```

### Monitoring
```bash
./monitor.sh            # System status overview
./debug.sh              # Comprehensive diagnostics
./watch-logs.sh         # Watch webhook logs
./watch-logs.sh all     # Watch all logs
```

---

## 📊 API Endpoints

### Webhook Server (http://localhost:3200)

- `POST /webhook` - Microsoft Graph webhook receiver
- `GET /health` - Health check with system status
- `GET /api/stats/:userEmail` - Dashboard statistics
- `GET /api/pending/:userEmail` - Pending detections
- `POST /api/update-token` - Update Graph API token
- `POST /api/subscribe-sent-items` - Create Sent Items subscription
- `POST /api/send-email` - Send email via Graph API

---

## 🗄️ Database Schema

### Tables

**emails** - Stores processed emails
```sql
id, graph_message_id, user_email, from_email,
subject, body_content, received_at, analyzed_at
```

**power_toy_detections** - AI detections per email
```sql
id, email_id, toy_type, detection_data (JSON),
confidence_score, status, created_at
```

**user_actions** - User responses to detections
```sql
id, detection_id, action_type, action_data (JSON),
executed_at, result
```

**custom_toys** - User-defined detection rules
```sql
id, user_email, toy_name, detection_rules (JSON),
actions (JSON), enabled
```

**notifications** - Notification history
```sql
id, detection_id, sent_at, acknowledged_at
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional - defaults to manual token update via dashboard
export GRAPH_TOKEN="your_microsoft_graph_token"

# Optional - defaults to mock keyword detection
export OPENAI_API_KEY="your_openai_api_key"
```

### Database Configuration

Database name: `ai_power_toys`
Connection: `postgresql://localhost:5432/ai_power_toys`

To recreate database:
```bash
./setup-database.sh
```

---

## 📬 Webhook Subscriptions

The system monitors TWO Microsoft Graph subscriptions:

1. **Inbox Subscription** - Incoming emails
   - Resource: `me/mailFolders('Inbox')/messages`
   - Change Type: `created, updated`

2. **Sent Items Subscription** - Outgoing emails
   - Resource: `/me/mailFolders/sentitems/messages`
   - Change Type: `created`

**Both subscriptions are required** to monitor all email activity.

---

## 🔍 Troubleshooting

### Components Not Starting

```bash
# Check if ports are in use
lsof -i :3200  # Webhook server
lsof -i :5273  # Dashboard

# Force kill and restart
./restart-webhook.sh
./restart-dashboard.sh
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep ai_power_toys

# Recreate database
./setup-database.sh
```

### No Webhooks Received

1. Check subscriptions exist:
   ```bash
   curl -s http://localhost:3200/health | jq '.subscriptions'
   ```

2. Verify token is set:
   ```bash
   curl -s http://localhost:3200/health | jq '.features.graphAPIStatus'
   ```

3. Test by sending email to yourself via dashboard

### Comprehensive Diagnostics

```bash
./debug.sh  # Shows full system analysis
```

---

## 📚 Documentation

- **[RUNNING.md](RUNNING.md)** - Detailed setup and operation guide
- **[STATUS.md](STATUS.md)** - Current system status snapshot
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Complete technical documentation
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Development progress
- **[FUTURE_FEATURES.md](FUTURE_FEATURES.md)** - Roadmap and planned features

---

## 🎯 System Status

| Component | Status | Details |
|-----------|--------|---------|
| Webhook Server | ✅ Running | Port 3200 |
| Dashboard | ✅ Running | Port 5273 |
| Client Agent | ✅ Running | System Tray |
| Database | ✅ Connected | PostgreSQL |
| Subscriptions | ✅ Active (2) | Inbox + Sent Items |

For current system status, run:
```bash
./monitor.sh
```

---

## 🚧 Known Limitations

- Graph API token expires after 1 hour (must manually refresh)
- OpenAI API key not required (uses mock detection if not set)
- Webhook subscriptions expire after 3 days (must recreate)
- CloudFlare tunnel must be running for webhooks

---

## 🔮 Future Enhancements

- [ ] Automated Graph API authentication (no manual token)
- [ ] Real OpenAI/LLM integration for better detection
- [ ] Actual action implementations (Calendar API, Tasks API)
- [ ] Custom Power Toy builder UI
- [ ] Multi-user support with Row-Level Security
- [ ] Mobile app for notifications
- [ ] Teams integration

---

## 👨‍💻 Development

### Running in Development Mode

```bash
# Terminal 1: Webhook server
npx ts-node webhook_server_db.ts

# Terminal 2: Dashboard
cd dashboard && npm run dev

# Terminal 3: Client agent
cd client-agent && npm run dev
```

### Viewing Logs

```bash
tail -f logs/webhook-server.log
tail -f logs/dashboard.log
tail -f logs/client-agent.log

# Or use helper script
./watch-logs.sh all
```

---

## 📄 License

This project is for internal development and hackathon purposes.

---

## 🙏 Acknowledgments

- Microsoft Graph API for webhook infrastructure
- OpenAI for LLM capabilities (planned)
- PostgreSQL for robust data storage
- Electron for cross-platform desktop notifications

---

**Built by Victor Heifets for Merck Hackathon 2025**

For issues or questions, check [RUNNING.md](RUNNING.md) or run `./debug.sh`
