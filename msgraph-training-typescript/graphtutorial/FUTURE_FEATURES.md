# AI Power Toys - Future Implementation Ideas

**Date:** November 8, 2025
**Status:** Planning / Ideas for Next Implementation Phases

---

## 🎯 Priority Features to Implement

### 1. Task Management React App ⭐ **HIGH PRIORITY**

**Why Critical:**
- Core purpose of the system is task/action monitoring from emails
- Currently "Create Task" buttons just open dashboard placeholder
- Need dedicated task view to manage all detected items

**Implementation Approach: React Web App (Not Electron)**

**Decision Rationale:**
- ✅ **Teams Integration Ready** - Can embed same React app as Teams tab with zero code changes
- ✅ **Cross-Platform** - Works on Mac, Windows, Linux, Mobile automatically
- ✅ **Lighter Weight** - No Electron runtime (~80MB saved)
- ✅ **Easy Deployment** - localhost:5274/tasks → production URL → Teams embed
- ✅ **Real-time Sync** - Already using SSE, multiple devices stay in sync
- ❌ Electron would require rebuilding as web app anyway for Teams

**Where to Build:**
- Add as new tab/route in existing React Dashboard
- `/dashboard` - Home
- `/notifications` - Notification Center (see below)
- `/tasks` - Task Management (NEW)

**Features Needed:**
```
Task Manager View:
├─ Filter by Status: Pending / Completed / Dismissed
├─ Filter by Type: Follow-up / Task / Urgent / Kudos
├─ Group by Time: Today / Tomorrow / This Week / Later
├─ Actions per Task:
│  ├─ Complete
│  ├─ Snooze (1h, 4h, tomorrow, next week)
│  ├─ Edit (change title, due date, priority)
│  ├─ Delete
│  └─ View Original Email
├─ Quick Create: Add task manually
└─ Search/Filter by subject, sender, keywords
```

**Database Schema** (Already exists):
```sql
power_toy_detections table:
- id, email_id, toy_type, detection_data,
- confidence_score, status (pending/actioned/dismissed/snoozed)
```

**API Endpoints Needed:**
```typescript
GET  /api/tasks              // Fetch all tasks
GET  /api/tasks/:id          // Get single task
POST /api/tasks              // Create task manually
PUT  /api/tasks/:id          // Update task (complete, snooze, edit)
DELETE /api/tasks/:id        // Delete task
```

**Electron Integration:**
```typescript
// When user clicks "Create Task" in notification popup:
else if (url === 'action://create-task') {
  // Open browser to task manager with pre-filled form
  shell.openExternal(
    `http://localhost:5274/tasks?new=true&subject=${data.subject}&detection_id=${data.detection_id}`
  );
  notifWindow.close();
}
```

---

### 2. Notification Center 📋 **HIGH PRIORITY**

**Why Needed:**
- Users miss popups (away from desk, dismissed too quickly)
- Need history of all detections
- Central place to review and take action

**Where to Build:**
- Add as new tab in Dashboard: `/notifications`
- Also accessible from Electron system tray menu

**Features:**
```
Notification Center:
├─ Timeline View:
│  ├─ Today (5 notifications)
│  ├─ Yesterday (3)
│  ├─ This Week (12)
│  └─ Older
├─ Filters:
│  ├─ By Type: Follow-up / Task / Urgent / Kudos
│  ├─ By Status: Pending / Actioned / Dismissed
│  └─ By Sender / Subject (search)
├─ Each Notification Shows:
│  ├─ Time received
│  ├─ Email subject + sender
│  ├─ Detected toy type + confidence
│  ├─ Quick actions (same as popup buttons)
│  └─ Link to full email
└─ Mark as Read/Unread
```

**Data Source:**
- Query `power_toy_detections` table joined with `emails`
- Already have all data, just need UI

**API Endpoints:**
```typescript
GET /api/notifications              // All notifications
GET /api/notifications/:id          // Single notification
PUT /api/notifications/:id/status   // Update status
```

---

### 3. Custom Toy Builder 🚀 **GAME CHANGER - MEDIUM PRIORITY**

**The "Killer Feature" - User-Defined Power Toys**

**Why This is Revolutionary:**
- Users create their own detection rules without coding
- Customizable to specific workflows
- Shareable configurations across teams
- Makes platform truly extensible

**Implementation Approach:**

#### Database Schema:
```sql
CREATE TABLE custom_toys (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    toy_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    detection_rules JSONB NOT NULL,
    ui_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Detection Rules Format (JSON):
```json
{
  "conditions": "AND",  // or "OR"
  "rules": [
    {
      "field": "subject",
      "operator": "contains",
      "value": "standup",
      "case_sensitive": false
    },
    {
      "field": "from_domain",
      "operator": "equals",
      "value": "@merck.com"
    },
    {
      "field": "body",
      "operator": "contains_any",
      "value": ["meeting", "tomorrow", "9am"]
    },
    {
      "field": "has_attachment",
      "operator": "equals",
      "value": false
    }
  ]
}
```

#### UI Config Format (JSON):
```json
{
  "popup": {
    "title": "📅 Standup Meeting Tomorrow",
    "icon": "📅",
    "color": "#1e40af"
  },
  "actions": [
    {
      "label": "📅 Add to Calendar",
      "action_type": "create_calendar_event",
      "params": {
        "event_title": "${subject}",
        "event_time": "tomorrow 9am"
      }
    },
    {
      "label": "⏰ Set Reminder",
      "action_type": "create_reminder",
      "params": {
        "remind_before": "15min"
      }
    }
  ]
}
```

#### Builder UI (Dashboard Tab: `/custom-toys`):
```
Create Custom Power Toy:
┌─────────────────────────────────────────┐
│ Toy Name: [Daily Standup Reminder     ]│
│                                          │
│ Detection Rules:                         │
│ ☑ Email subject contains: "standup"     │
│ ☑ From domain: "@merck.com"             │
│ ☑ Has attachment: No                    │
│ ☑ Body contains keywords:               │
│   [meeting, tomorrow, 9am]              │
│                                          │
│ Notification Popup:                      │
│ Title: [📅 Standup Meeting Tomorrow   ] │
│ Icon: [📅] Color: [Blue      ]          │
│                                          │
│ Action Buttons:                          │
│ Button 1: [📅 Add to Calendar] →        │
│   Action: Create calendar event          │
│ Button 2: [⏰ Set Reminder] →           │
│   Action: Remind 15 min before          │
│                                          │
│ [Save Custom Toy] [Preview] [Test]     │
└─────────────────────────────────────────┘
```

#### Detection Engine Update:
```typescript
// webhook_server_db.ts
async function analyzeEmail(message: Message) {
  const detections = [];

  // 1. Built-in LLM toys (existing)
  const llmDetections = await analyzeEmailWithLLM(message);
  detections.push(...llmDetections);

  // 2. Custom user-defined toys (NEW)
  const customToys = await db.getEnabledCustomToys(user_email);
  for (const toy of customToys) {
    if (matchesRules(message, toy.detection_rules)) {
      detections.push({
        toy_type: `custom_${toy.id}`,
        toy_name: toy.toy_name,
        detection_data: toy.ui_config,
        confidence_score: 1.0 // Rule-based = 100% confidence
      });
    }
  }

  return detections;
}
```

#### Supported Rule Operators:
```
Field Types:
- subject, from, from_domain, to, body
- has_attachment (boolean)
- received_time (date/time)
- is_reply, is_forward (boolean)

Operators:
- equals, not_equals
- contains, not_contains
- contains_any, contains_all
- starts_with, ends_with
- regex_match
- greater_than, less_than (for dates/times)
```

#### Benefits:
1. **No Code Required** - Users configure via UI
2. **Extensible** - Users create toys for specific workflows
3. **Shareable** - Export/import toy configs (JSON)
4. **Team Templates** - Admins create org-wide toys
5. **Hybrid Approach** - Combines LLM semantic understanding + user rules

#### Challenges:
- **Rule Engine Complexity** - Need robust matching logic
- **Security** - Validate user-defined actions (no arbitrary code execution)
- **Performance** - Don't slow down email processing
- **LLM vs Rules** - When to use LLM vs simple matching?

**Recommendation: Start Simple**
- Phase 1: Simple keyword/pattern matching only
- Phase 2: Add LLM validation for higher confidence
- Phase 3: User can choose: rules-only OR rules+LLM OR LLM-only

---

## 🔧 Teams Integration Path

### Current Architecture:
```
Electron Client Agent → Desktop notifications + quick actions
React Dashboard → Task management + Notification center
PostgreSQL → Shared data
SSE → Real-time sync
```

### Teams Integration (Future):

#### Option A: Teams Tab (Recommended)
```json
// manifest.json
{
  "staticTabs": [
    {
      "entityId": "powerToysTasks",
      "name": "My Tasks",
      "contentUrl": "https://your-app.com/tasks",
      "scopes": ["personal"]
    },
    {
      "entityId": "powerToysNotifications",
      "name": "Notifications",
      "contentUrl": "https://your-app.com/notifications",
      "scopes": ["personal"]
    }
  ]
}
```

**Steps:**
1. Deploy React app to production (Azure, AWS, etc.)
2. Create Teams app manifest
3. Upload to Teams app catalog
4. Users install from Teams app store
5. Same React code runs in Teams iframe

**No code changes needed!**

#### Option B: Teams Bot (Advanced)
- Proactive notifications via Teams bot
- Requires bot registration, additional complexity
- Defer until after Tab integration works

---

## 📊 Implementation Priority

### Phase 1: Foundation (Next 2-3 Days)
1. ✅ **Notification Center** - Add `/notifications` tab to dashboard
   - Query existing database
   - Display timeline view
   - Filter/search
   - Easy win, high value

2. ✅ **Task Manager** - Add `/tasks` tab to dashboard
   - CRUD operations on detections
   - Status management (complete, snooze, dismiss)
   - Integration with Graph Calendar API
   - Integration with Graph Tasks API

### Phase 2: Actual Action Integrations (2-3 Days)
3. ✅ **Calendar API Integration**
   - "Create Calendar Event" creates actual Outlook event
   - Pre-fill from detection data (title, time, attendees)
   - Use existing Graph token

4. ✅ **Tasks API Integration**
   - "Create Task" creates Microsoft To Do task
   - Pre-fill from detection data
   - Link back to original email

5. ✅ **Reminder System**
   - "Set Reminder" schedules notification
   - Could use local DB + scheduler OR Graph Tasks with reminder

### Phase 3: User Customization (Hackathon Demo Feature)
6. ✅ **Custom Toy Builder**
   - Add `/custom-toys` tab to dashboard
   - Rule-based matching (no LLM initially)
   - 3-5 predefined templates
   - Test with real emails

### Phase 4: Teams (Post-Hackathon)
7. ⏳ **Teams Tab Deployment**
   - Deploy React app to production
   - Create Teams manifest
   - Test in Teams environment

---

## 🎨 UX Flow Examples

### Example 1: Follow-up Email Flow
```
1. Email arrives: "Send Q4 report by Friday"
2. Webhook detects → LLM analyzes → follow_up detected
3. SSE broadcasts to Electron
4. Notification popup appears (bottom-right):
   ┌─────────────────────────────────────┐
   │ 📬 New Power Toy Detection          │
   │ Email: Send Q4 report by Friday     │
   │ From: boss@merck.com                │
   │                                      │
   │ [📅 Create Calendar Event]          │
   │ [⏰ Set Reminder]                   │
   │ [Dismiss]                            │
   └─────────────────────────────────────┘
5. User clicks "Create Calendar Event"
6. Opens browser to http://localhost:5274/tasks?action=calendar&detection_id=123
7. Pre-filled calendar form:
   - Title: "Send Q4 report"
   - Date: This Friday 5:00 PM
   - Reminder: 1 hour before
8. User confirms → Graph API creates Outlook event
9. Task marked as "actioned" in database
```

### Example 2: Custom Toy Flow
```
1. User creates custom toy: "Code Review Reminder"
   - Rule: Subject contains "PR #" OR "Pull Request"
   - From: github-notifications@github.com
   - Action: Create task with link to PR

2. Email arrives from GitHub: "New PR #1234: Fix login bug"

3. Custom toy matches → Creates detection

4. Notification popup:
   ┌─────────────────────────────────────┐
   │ 🔧 Code Review Reminder             │
   │ PR #1234: Fix login bug             │
   │ From: github-notifications          │
   │                                      │
   │ [📝 Create Review Task]             │
   │ [🔗 Open PR in Browser]             │
   │ [Dismiss]                            │
   └─────────────────────────────────────┘

5. User clicks "Create Review Task"
6. Task created in Microsoft To Do with PR link
```

---

## 🔮 Long-term Vision

**Platform Extensibility:**
- Marketplace for custom toys (share with community)
- Machine learning from user actions (improve detection)
- Multi-user team dashboards
- Analytics (which toys save the most time?)
- Mobile app (iOS/Android)
- Slack/Jira integrations

**Enterprise Features:**
- Admin-defined org-wide toys
- Team-level sharing
- Compliance & audit logs
- Role-based permissions

---

## 📝 Decision Summary

| Feature | Approach | Rationale |
|---------|----------|-----------|
| Task Management | React Web App | Teams-ready, cross-platform, lighter |
| Notification Center | Dashboard Tab | Reuse existing infrastructure |
| Custom Toys | Rule-based + LLM hybrid | Start simple, add LLM validation later |
| Teams Integration | Static Tab | Zero code changes, production URL only |
| Calendar/Tasks | Graph API | Native M365 integration |

---

**Last Updated:** November 8, 2025
**Next Action:** Implement Notification Center tab in Dashboard
