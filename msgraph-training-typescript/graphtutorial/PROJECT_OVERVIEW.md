# AI Power Toys - Project Overview

## 🎯 The Vision

**AI Power Toys** is a customizable AI assistant platform that monitors Microsoft 365 activities (emails, Teams messages) and proactively suggests context-aware actions through desktop notifications.

### The Problem We're Solving

Knowledge workers receive hundreds of emails daily. Important actions get buried:
- Follow-ups are forgotten
- Achievements go unrecognized (no kudos sent)
- Tasks aren't captured
- Urgent requests are missed

### Our Solution

An intelligent system that:
1. **Monitors** - Watches email/Teams via Microsoft Graph webhooks
2. **Analyzes** - Uses corporate LLM to detect patterns
3. **Suggests** - Shows desktop popups with action buttons
4. **Acts** - Integrates with calendar, tasks, and other M365 apps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MICROSOFT 365 CLOUD                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Outlook   │    │    Teams    │    │  Calendar   │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                   │                │
│         └──────────────────┴───────────────────┘                │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │ Microsoft Graph │                          │
│                   │      API        │                          │
│                   └────────┬────────┘                          │
└────────────────────────────┼─────────────────────────────────┘
                             │ Webhooks (HTTPS)
                             │
                   ┌─────────▼─────────┐
                   │      ngrok        │  Tunnel (dev only)
                   │   Public HTTPS    │
                   └─────────┬─────────┘
                             │
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    LOCAL DEVELOPMENT MACHINE                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Webhook Server (Express.js - Port 3200)             │   │
│  │  • Receives Graph notifications                      │   │
│  │  • Validates webhook requests                        │   │
│  │  • Fetches full email/message details               │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Analyzer / Orchestrator                             │   │
│  │  • Routes to appropriate Power Toys                  │   │
│  │  • Coordinates workflow                              │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Corporate LLM (ChatGPT-based)                       │   │
│  │  • Analyzes email content                            │   │
│  │  • Detects patterns: follow-ups, kudos, tasks, etc. │   │
│  │  • Extracts structured data                          │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  • emails table                                      │   │
│  │  • power_toy_detections table (multi-toy support)   │   │
│  │  • user_actions table                                │   │
│  │  • Row-Level Security for multi-user               │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Testing Dashboard (http://localhost:5274)     │   │
│  │  • Real-time email feed                              │   │
│  │  • LLM analysis display                              │   │
│  │  • Token management                                  │   │
│  │  • Permissions display                               │   │
│  │  • Send test emails                                  │   │
│  │  • SSE event broadcasting                            │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           │ SSE Events                                        │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Electron Client Agent (System Tray)                 │   │
│  │  • Desktop notifications (bottom-right corner)       │   │
│  │  • Context-aware action buttons per Power Toy        │   │
│  │  • Follow-up: Create Calendar | Set Reminder         │   │
│  │  • Task: Create Task | Add to To-Do                  │   │
│  │  • Urgent: Reply Now | Flag Important                │   │
│  │  • Kudos: Send Thanks | Share with Team              │   │
│  │  • Real-time SSE connection to webhook server        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎨 Power Toys Catalog

### 1. **Follow-Up Toy** 📅
**Trigger:** Email contains action items with deadlines
**Detection:** "send report by Friday", "get back to me", "waiting for"
**Action:** Suggest calendar reminder
**Example:**
```
📬 Follow-up needed: Send Q4 report by Friday
[Add to Calendar] [Add as Task] [Dismiss]
```

### 2. **Kudos Toy** 🏆
**Trigger:** Email mentions achievements or good work
**Detection:** "great work", "excellent job", "congratulations"
**Action:** Suggest sending Inspire/kudos
**Example:**
```
🏆 Achievement detected: John completed Q4 report
[Send Inspire] [Add as Task] [Dismiss]
```

### 3. **Task Toy** ✅
**Trigger:** Email contains actionable items
**Detection:** "please do", "can you", "need to"
**Action:** Suggest adding to task app
**Example:**
```
✅ Task detected: Review contract by Monday
[Add to Tasks] [Add to Calendar] [Dismiss]
```

### 4. **Urgent Request Toy** ⚠️
**Trigger:** Boss/VIP sends urgent request
**Detection:** "urgent", "ASAP", "by today", from boss
**Action:** Immediate notification with quick actions
**Example:**
```
⚠️ URGENT: Fill self-evaluation by tomorrow (from Boss)
[Open Now] [Add as Task] [Snooze 1h]
```

### 5. **More Power Toys...** 🔮
Platform is designed to be **extensible** - new "toys" can be added by:
- Writing detection logic
- Defining suggested actions
- Customizing notification UI

---

## 📊 Database Schema

### **emails** table
```sql
CREATE TABLE emails (
    id SERIAL PRIMARY KEY,
    graph_message_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_preview TEXT,
    body_content TEXT,
    received_at TIMESTAMP NOT NULL,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Row-Level Security
    CONSTRAINT emails_user_fk FOREIGN KEY (user_email)
        REFERENCES users(email) ON DELETE CASCADE
);

CREATE INDEX idx_emails_user ON emails(user_email);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
```

### **power_toy_detections** table
```sql
CREATE TABLE power_toy_detections (
    id SERIAL PRIMARY KEY,
    email_id INTEGER NOT NULL,
    toy_type VARCHAR(50) NOT NULL, -- 'follow_up', 'kudos', 'task', 'urgent'
    detection_data JSONB NOT NULL,  -- Flexible schema per toy type
    confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'actioned', 'dismissed', 'snoozed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT detections_email_fk FOREIGN KEY (email_id)
        REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX idx_detections_email ON power_toy_detections(email_id);
CREATE INDEX idx_detections_status ON power_toy_detections(status);
CREATE INDEX idx_detections_toy_type ON power_toy_detections(toy_type);
```

### **user_actions** table
```sql
CREATE TABLE user_actions (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'add_task', 'add_calendar', 'send_inspire', 'dismiss'
    action_data JSONB,  -- Details about the action taken
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
    error_message TEXT,

    CONSTRAINT actions_detection_fk FOREIGN KEY (detection_id)
        REFERENCES power_toy_detections(id) ON DELETE CASCADE
);

CREATE INDEX idx_actions_detection ON user_actions(detection_id);
```

### Example Data Flow

**Email arrives:**
```json
{
  "id": 123,
  "graph_message_id": "AAMkAGI2...",
  "user_email": "heifets@merck.com",
  "from_email": "boss@merck.com",
  "subject": "Q4 Report - Great work! Send final version by Friday",
  "received_at": "2025-11-07T14:30:00Z"
}
```

**LLM detects 2 toys:**
```json
[
  {
    "email_id": 123,
    "toy_type": "kudos",
    "detection_data": {
      "achievement": "Q4 report completion",
      "person": "user",
      "suggested_action": "Send Inspire to self or share achievement"
    },
    "confidence_score": 0.85,
    "status": "pending"
  },
  {
    "email_id": 123,
    "toy_type": "follow_up",
    "detection_data": {
      "action": "Send final version",
      "deadline": "2025-11-08T17:00:00Z",
      "suggested_date": "2025-11-08T09:00:00Z",
      "priority": "high"
    },
    "confidence_score": 0.92,
    "status": "pending"
  }
]
```

**User takes action:**
```json
{
  "detection_id": 2,
  "action_type": "add_calendar",
  "action_data": {
    "event_title": "Send Q4 final version to boss",
    "event_date": "2025-11-08T09:00:00Z",
    "calendar_id": "AAMkAD..."
  },
  "result": "success"
}
```

---

## 🔐 Permissions

### **Current Permissions (What We Have)**

Based on current Graph Explorer token:

✅ **Calendars.ReadWrite**
- Create/update calendar events
- Read calendar entries
- **Status:** HAVE - Essential for Follow-Up Toy

✅ **Mail.Read**
- Read email messages
- Access mailbox
- **Status:** HAVE - Essential for all toys

✅ **Mail.ReadBasic**
- Basic email metadata
- **Status:** HAVE - Subset of Mail.Read

✅ **Mail.ReadWrite**
- Read and modify emails
- Mark as read, delete, etc.
- **Status:** HAVE - Nice to have

✅ **User.Read**
- Read user profile
- Get user details
- **Status:** HAVE - Essential

✅ **User.Read.All**
- Read all user profiles
- **Status:** HAVE - Useful for multi-user

✅ **Reports.Read.All**
- Read usage reports
- **Status:** HAVE (unexpected) - Not needed

✅ **openid, profile, email**
- Standard authentication
- **Status:** HAVE - Essential

### **Missing Permissions (What We Need)**

❌ **TeamsActivity.Send**
- Send activity feed notifications
- Trigger system popups via Teams
- **Status:** MISSING - Critical for Teams notifications approach

❌ **Tasks.ReadWrite**
- Create/update tasks
- Integrate with To Do / Planner
- **Status:** MISSING - Critical for Task Toy

❌ **Mail.Send**
- Send emails programmatically
- **Status:** MISSING - Needed if we auto-send Inspire emails

❌ **MailboxSettings.ReadWrite**
- Manage mailbox settings
- **Status:** MISSING - Nice to have for advanced features

### **Optional Future Permissions**

⚪ **Chat.Read** - Read Teams chats (Daily Bot feature)
⚪ **Chat.ReadWrite** - Send Teams messages
⚪ **Files.ReadWrite.All** - Access OneDrive/SharePoint (if needed)
⚪ **Notes.ReadWrite** - OneNote integration
⚪ **Presence.Read** - User availability status

---

## 🛠️ Tech Stack

### **Backend**
- **Language:** TypeScript
- **Runtime:** Node.js
- **Web Framework:** Express.js (port 3200)
- **Database:** PostgreSQL 14 (local development)
- **Database Client:** pg (node-postgres)
- **LLM:** Corporate ChatGPT (API pending) / Mock for testing

### **Frontend**
- **Framework:** React 18
- **Build Tool:** Vite
- **State Management:** React hooks + Context
- **Real-time:** WebSocket (Socket.io)
- **Styling:** Tailwind CSS (or similar)

### **Development Tools**
- **Tunnel:** ngrok (local development)
- **Token Source:** Microsoft Graph Explorer (manual extraction, 24hr validity)
- **API Testing:** Manual Graph subscriptions via TypeScript scripts

### **Future Production**
- **Database:** AWS RDS PostgreSQL
- **Hosting:** Azure Functions / AWS Lambda
- **Local Agent:** Electron app

---

## 📝 Discovery Conversation Summary

### Key Decisions Made

1. **Local Development First**
   - PostgreSQL local (not AWS yet)
   - ngrok for webhooks (not production deployment)
   - Manual token refresh (automated auth later)

2. **Testing Strategy**
   - Build React dashboard BEFORE local agent
   - Validate: Graph API → Webhook → LLM → DB → Dashboard
   - Mock LLM initially (corporate ChatGPT integration pending)

3. **Database Choice: PostgreSQL**
   - Row-Level Security for multi-user future
   - JSON support for flexible Power Toy data
   - Same DB locally and in AWS RDS (easy migration)

4. **Multi-Toy Architecture**
   - One email can trigger multiple Power Toys
   - Separate `power_toy_detections` table
   - User can act on each detection independently

5. **Notification Approach** (Deferred)
   - **Option 1:** Teams Activity Feed (requires Teams app registration)
   - **Option 2:** Electron desktop app (full control, requires installation)
   - **Decision:** Build backend first, decide on notifications later

6. **All Actions = Add as Task**
   - Every Power Toy detection can be converted to a task
   - Centralized task management
   - Integration with M365 Tasks/Planner

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Now)
- [x] Webhook server receiving Graph notifications
- [x] Basic LLM integration structure
- [ ] PostgreSQL setup and schema
- [ ] Database layer (TypeORM or Prisma)

### Phase 2: Testing Dashboard (Now)
- [ ] React app scaffolding
- [ ] Real-time webhook feed display
- [ ] Bearer token management UI
- [ ] Permissions display
- [ ] Subscriptions management
- [ ] Mock notification preview
- [ ] Manual email testing

### Phase 3: End-to-End Flow (Next)
- [ ] Corporate LLM integration (when API ready)
- [ ] Multi-toy detection logic
- [ ] Database persistence
- [ ] Dashboard showing detections
- [ ] Test with real emails

### Phase 4: Actions & Integration (Later)
- [ ] Calendar event creation
- [ ] Task app integration
- [ ] Inspire/kudos sending
- [ ] User action tracking

### Phase 5: Local Agent ✅ (Completed)
- [x] Electron client agent with system tray
- [x] Desktop notification UI (bottom-right popups)
- [x] Context-aware action buttons per Power Toy type
- [x] SSE real-time connection to webhook server
- [x] Background service monitoring
- [ ] Implement actual action integrations (Calendar API, Tasks API)

### Phase 6: Production (Future)
- [ ] Automated authentication (no manual token)
- [ ] Deploy to AWS RDS
- [ ] Deploy webhook server (Azure/AWS)
- [ ] Multi-user Row-Level Security
- [ ] Monitoring and logging

---

## 📐 Port Allocation

- **3200** - Webhook server (Express) + SSE endpoint
- **5274** - React dashboard (Vite dev server)
- **5432** - PostgreSQL (default)
- **4040** - ngrok web interface

---

## 🎯 Success Criteria (Hackathon Demo)

1. ✅ Send email with action item
2. ✅ Webhook receives notification within 5 seconds
3. ✅ LLM analyzes and detects Follow-Up Toy
4. ✅ Detection saved to database
5. ✅ React dashboard shows:
   - Email details
   - LLM analysis results
   - Follow-up suggestion
   - Mock notification preview
6. ✅ Click "Add to Calendar" → Event created in Outlook

---

## 🔮 Future Vision

**AI Power Toys Platform** becomes a customizable productivity assistant:

- Users can **enable/disable specific toys**
- Users can **configure detection rules** (e.g., only urgent from boss)
- Users can **create custom toys** via low-code interface
- System learns from user actions (ML feedback loop)
- Multi-user deployment with team-level sharing
- Mobile app for on-the-go notifications
- Integration with non-M365 tools (Slack, Jira, etc.)

---

## 🆕 Recent Updates

### November 8, 2025 - Electron Client Agent Implementation

**What's New:**
- ✅ **Electron Client Agent** - System tray application for desktop notifications
- ✅ **Context-Aware Notifications** - Different action buttons based on Power Toy type
- ✅ **Real-time SSE Connection** - Live updates from webhook server to client
- ✅ **Enhanced Webhook Server** - Now broadcasts toy_type and detection_data via SSE

**Key Features:**

1. **System Tray Integration**
   - Background service running in system tray
   - Shows connection status: "Connected" / "Disconnected"
   - Menu options: Show Notifications, Quit

2. **Smart Notification Popups**
   - Bottom-right corner placement (450x240px)
   - Blue gradient background (#1e40af)
   - Displays: email subject, sender, detected Power Toy type
   - Auto-closes when action is taken

3. **Power Toy Specific Actions**
   - **Follow-up**: 📅 Create Calendar Event | ⏰ Set Reminder
   - **Task**: ✅ Create Task | 📝 Add to To-Do
   - **Urgent**: ✉️ Reply Now | 🚩 Flag Important
   - **Kudos**: 🙏 Send Thanks | 👥 Share with Team

4. **Technical Implementation**
   - Anchor tags with `action://` custom protocol for click handling
   - `will-navigate` event for button actions
   - SSE connection auto-reconnects on failure
   - Notification windows are independent browser windows

**File Structure:**
```
client-agent/
├── src/
│   └── main.ts              # Electron main process
├── dist/                    # Compiled TypeScript
├── package.json
├── tsconfig.json
└── README.md
```

**How to Run:**
```bash
cd client-agent
npm install
npm run dev              # Development mode
npm run build && npm start  # Production mode
npm run package          # Create distributable
```

**Integration Points:**
- Webhook Server SSE endpoint: `http://localhost:3200/api/events`
- Dashboard URL (for action buttons): `http://localhost:5274`
- Event format includes: `toy_type`, `detection_id`, `confidence`, `detection_data`

**Next Steps:**
- Implement actual Calendar API integration for "Create Calendar Event"
- Implement actual Tasks API integration for "Create Task"
- Add reminder scheduling functionality
- Implement email reply functionality for "Reply Now"

---

**Last Updated:** November 8, 2025
**Project Status:** In Development - Local Agent Phase Complete
**Team:** Victor Heifets
**Purpose:** Merck Hackathon 2025
