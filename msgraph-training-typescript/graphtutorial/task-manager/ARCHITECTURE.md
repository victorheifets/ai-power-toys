# Task Manager Architecture - Final Design

## ✅ Architectural Decision: Separate Tasks Table

### **Power Toy Detections vs. Tasks**

We've separated these into **two distinct concepts**:

#### 1. **Power Toy Detections** (`power_toy_detections` table)
- **Purpose:** AI-detected patterns in emails → Suggested one-time actions
- **Flow:** Email arrives → AI detects pattern → Suggests action → User clicks button → Action executed → DONE
- **Examples:**
  - **Follow-Up:** "Send report by Friday" → Suggests "📅 Create Calendar Event"
  - **Kudos:** "Great job!" → Suggests "🙏 Send Inspire Message"
  - **Urgent:** "ASAP needed" → Suggests "🚩 Flag Email"
- **Lives in:** Dashboard (pending detections view)
- **Lifecycle:** pending → actioned/dismissed (one-time event)

#### 2. **Tasks** (`tasks` table)
- **Purpose:** Persistent to-do items that need tracking until completion
- **Flow:** Created manually OR converted from email → Tracked until user marks complete
- **Examples:**
  - Manual: User speaks "Call Yan about work plan by next week"
  - Email-derived: User clicks "Create Task" on email detection
- **Lives in:** Task Manager (dedicated app)
- **Lifecycle:** pending → snoozed → completed (persistent tracking)

---

## 📊 **Database Schema**

### **New `tasks` Table**
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,

    -- Task content
    title TEXT NOT NULL,
    notes TEXT,
    due_date TIMESTAMP,
    priority VARCHAR(10) DEFAULT 'medium',  -- low/medium/high
    task_type VARCHAR(50) DEFAULT 'manual', -- follow_up/task/urgent/kudos/manual

    -- Task management
    status VARCHAR(20) DEFAULT 'pending',   -- pending/completed/snoozed/dismissed
    snoozed_until TIMESTAMP,
    completed_at TIMESTAMP,

    -- Source tracking
    source VARCHAR(20) DEFAULT 'manual',    -- manual/email
    source_detection_id INTEGER,            -- FK to power_toy_detections (if from email)
    source_email_id INTEGER,                -- FK to emails (if from email)

    -- Voice/LLM data
    input_method VARCHAR(10),               -- text/voice
    raw_input TEXT,                         -- Original user input
    llm_parsed_data JSONB,                  -- Full LLM extraction
    mentioned_people TEXT[],                -- ["Yan", "Sarah"]
    tags TEXT[],                            -- ["work plan", "meeting"]

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,

    -- Foreign keys
    CONSTRAINT tasks_detection_fk FOREIGN KEY (source_detection_id)
        REFERENCES power_toy_detections(id) ON DELETE SET NULL,
    CONSTRAINT tasks_email_fk FOREIGN KEY (source_email_id)
        REFERENCES emails(id) ON DELETE SET NULL
);
```

---

## 🔄 **Workflows**

### **Workflow 1: Manual Task Creation**
```
User speaks: "Call Yan about work plan by next week"
  ↓
Web Speech API transcribes
  ↓
(Optional) LLM parses:
  - title: "Call Yan about work plan"
  - due_date: 2025-11-15
  - mentioned_people: ["Yan"]
  - tags: ["work plan"]
  ↓
POST /api/tasks
  ↓
Inserted into `tasks` table with source='manual'
  ↓
Appears in Task Manager
  ↓
User can: Complete, Snooze, Edit, Delete
```

### **Workflow 2: Email-to-Task Conversion** (Future)
```
Email arrives: "Please send Q4 report by Friday"
  ↓
AI detects: TASK power toy
  ↓
Inserted into `power_toy_detections` table
  ↓
Shows in Dashboard with "Create Task" button
  ↓
User clicks "Create Task"
  ↓
POST /api/tasks/from-detection/:id
  ↓
Copies data to `tasks` table:
  - source='email'
  - source_detection_id = detection.id
  - source_email_id = email.id
  - title, due_date, priority from detection
  ↓
Detection marked as 'actioned'
  ↓
Task appears in Task Manager
```

---

## 🎯 **API Endpoints**

### **Task Manager API** (Separate from Power Toys)
```
GET    /api/tasks/:userEmail           - Get filtered tasks
POST   /api/tasks                      - Create manual task
PUT    /api/tasks/:taskId              - Update task
POST   /api/tasks/:taskId/complete     - Complete task
POST   /api/tasks/:taskId/snooze       - Snooze task
DELETE /api/tasks/:taskId              - Delete task (soft)
POST   /api/tasks/:taskId/restore      - Restore deleted task
POST   /api/tasks/bulk                 - Bulk operations
GET    /api/tasks/:userEmail/stats     - Get statistics
POST   /api/tasks/parse                - Parse natural language with LLM
```

### **Future: Email-to-Task Conversion**
```
POST   /api/tasks/from-detection/:id   - Convert detection to task
```

---

## 🧩 **Frontend Components**

### **Built:**
- ✅ `App.tsx` - Main app with responsive detection, SSE, state management
- ✅ `QuickAddForm.tsx` - Text + Voice input with LLM toggle
- ✅ `FilterSidebar.tsx` - Comprehensive filtering (7 dimensions)

### **To Build:**
- ⏳ `TaskTable.tsx` - Desktop table view
- ⏳ `TaskCards.tsx` - Mobile card view
- ⏳ All CSS files

---

## 🎨 **Key Features**

### **Voice Recognition**
- Web Speech API
- 3 languages: English, Hebrew, Russian
- Real-time transcription
- Microphone button with listening state

### **LLM Parsing** (Placeholder)
- Extracts: title, due_date, priority, mentioned_people, tags
- Can be toggled on/off
- Currently uses keyword matching (real LLM integration later)

### **Filtering**
- Status: Pending/Completed/Snoozed/Dismissed
- Type: Follow-up/Task/Urgent/Kudos/Manual
- Priority: High/Medium/Low
- Timeframe: All/Overdue/Today/Tomorrow/This Week/Later/No Date
- Source: Email/Manual
- Search: Full-text across title, notes, email subject

### **Real-time Updates**
- SSE connection to backend
- Auto-refresh on task_created, task_updated, task_completed events

### **Responsive Design**
- Desktop (>768px): Table view with sortable columns
- Mobile (<768px): Card view with swipe gestures

---

## 📁 **Project Structure**

```
task-manager/
├── src/
│   ├── App.tsx                    # Main app component
│   ├── types.ts                   # TypeScript interfaces
│   ├── components/
│   │   ├── QuickAddForm.tsx       # ✅ Task creation with voice
│   │   ├── FilterSidebar.tsx      # ✅ Filtering controls
│   │   ├── TaskTable.tsx          # ⏳ Desktop table view
│   │   ├── TaskCards.tsx          # ⏳ Mobile card view
│   │   └── *.css                  # ⏳ Component styles
│   └── App.css                    # ⏳ Main layout styles
├── vite.config.ts                 # ✅ Port 5275, proxy to 3200
├── PROGRESS.md                    # ✅ Build progress tracker
├── ARCHITECTURE.md                # ✅ This file
└── IMPLEMENTATION_PLAN.md         # ✅ Original plan

backend/
├── database/
│   ├── migration_create_tasks_table.sql  # ✅ New tasks table
│   ├── tasks.ts                          # ✅ Task CRUD module
│   └── db.ts                             # Existing emails/detections
└── webhook_server_db.ts                  # ✅ Updated with task endpoints
```

---

## 🚀 **Next Steps**

1. **Create remaining components** (TaskTable, TaskCards)
2. **Add CSS styling** (responsive layout, animations)
3. **Run database migration**
4. **Test end-to-end workflow**
5. **Polish UX** (loading states, error handling)

**ETA:** ~2 hours to complete frontend + testing

---

## 💡 **Benefits of Separate Tables**

✅ **Clean separation:** Power toys are suggestions, tasks are commitments
✅ **Better queries:** No need to filter by `is_task` flag everywhere
✅ **Simpler code:** Each table has its own focused schema
✅ **Scalability:** Can add task-specific features without affecting detections
✅ **Clarity:** Code is easier to understand and maintain

