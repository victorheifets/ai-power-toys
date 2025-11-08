# Task Manager - Implementation Plan

## ✅ Completed (Backend)

### 1. Database Schema
- ✅ Created migration file (`migration_add_task_fields.sql`)
- ✅ Added fields: `title`, `notes`, `due_date`, `priority`, `snoozed_until`, `source`, `input_method`, `raw_input`, `llm_parsed_data`, `mentioned_people`, `tags`, `completed_at`, `deleted_at`, `is_deleted`
- ✅ Updated constraints for new statuses and toy types
- ✅ Added indexes for performance
- ✅ Made `email_id` nullable for manual tasks

### 2. Task Database Module (`database/tasks.ts`)
- ✅ Type definitions for Task, TaskFilters, LLMParseResult
- ✅ `getTasks()` - with comprehensive filtering
- ✅ `getTaskById()` - single task with email data
- ✅ `createManualTask()` - create from user input
- ✅ `updateTask()` - update any field
- ✅ `completeTask()` - mark complete
- ✅ `snoozeTask()` - snooze with duration parsing
- ✅ `deleteTask()` - soft delete
- ✅ `restoreTask()` - undelete
- ✅ `bulkUpdateTasks()` - bulk operations
- ✅ `getTaskStats()` - statistics
- ✅ `parseLLM()` - **PLACEHOLDER** for LLM parsing

### 3. Backend API Endpoints (`webhook_server_db.ts`)
- ✅ `GET /api/tasks/:userEmail` - Get tasks with filters
- ✅ `GET /api/tasks/:userEmail/:taskId` - Get single task
- ✅ `POST /api/tasks` - Create manual task (with optional LLM parsing)
- ✅ `POST /api/tasks/parse` - Parse text with LLM (standalone)
- ✅ `PUT /api/tasks/:taskId` - Update task
- ✅ `POST /api/tasks/:taskId/complete` - Complete task
- ✅ `POST /api/tasks/:taskId/snooze` - Snooze task
- ✅ `DELETE /api/tasks/:taskId` - Delete task
- ✅ `POST /api/tasks/:taskId/restore` - Restore deleted task
- ✅ `POST /api/tasks/bulk` - Bulk operations
- ✅ `GET /api/tasks/:userEmail/stats` - Get statistics
- ✅ SSE broadcasting for real-time updates

---

## 🚧 To Do (Frontend)

### Phase 1: Basic UI (Next 2-3 hours)

**1. Update Vite Config**
- [ ] Set port to 5275
- [ ] Configure proxy to backend (port 3200)

**2. Create Main App Component**
- [ ] Responsive detection (desktop vs mobile)
- [ ] User email storage (localStorage)
- [ ] SSE connection for real-time updates

**3. Desktop Table View**
- [ ] Table component with columns:
  - Checkbox (multi-select)
  - Title
  - Type (icon + badge)
  - Priority (color-coded)
  - Due Date (with countdown/overdue indicator)
  - From/Source
  - Actions (Complete, Snooze, Edit, Delete)
- [ ] Sortable columns
- [ ] Bulk action toolbar (when items selected)

**4. Mobile Card View**
- [ ] Card component with swipe gestures
- [ ] Compact info display
- [ ] Bottom sheet for actions
- [ ] Pull-to-refresh

**5. Filter Sidebar**
- [ ] Status checkboxes (Pending, Completed, Snoozed)
- [ ] Type checkboxes (Follow-up, Task, Urgent, Kudos, Manual)
- [ ] Priority checkboxes (High, Medium, Low)
- [ ] Timeframe radio buttons (All, Overdue, Today, Tomorrow, This Week, Later, No Date)
- [ ] Source checkboxes (Email, Manual)
- [ ] Search input
- [ ] Remember filters in localStorage

### Phase 2: Task Creation (Next 2 hours)

**6. Quick Add Form**
- [ ] Input field with placeholder "Type or speak task..."
- [ ] Microphone button
- [ ] Add button
- [ ] LLM toggle switch (enabled by default, can disable)

**7. Voice Recognition**
- [ ] Web Speech API integration
- [ ] Microphone permission handling
- [ ] Real-time transcription display
- [ ] Language selector (English/Hebrew/Russian)
- [ ] Stop/Cancel buttons
- [ ] Error handling (unsupported browser, no mic)

**8. LLM Preview Modal**
- [ ] Show parsed result from LLM
- [ ] Editable fields (title, due date, priority, people, tags)
- [ ] Confirm/Cancel buttons
- [ ] Toggle "Always use my input" (disable LLM)

### Phase 3: Task Actions (Next 2 hours)

**9. Task Details Modal**
- [ ] Full task information
- [ ] Original email content (if email-sourced)
- [ ] Edit inline
- [ ] Save changes

**10. Snooze Dropdown**
- [ ] Quick options: 1h, 4h, Tomorrow, Next Week
- [ ] Custom date/time picker

**11. Bulk Actions Toolbar**
- [ ] Complete selected
- [ ] Snooze selected
- [ ] Delete selected
- [ ] Clear selection

### Phase 4: Polish (Next 1-2 hours)

**12. Loading States**
- [ ] Skeleton loaders
- [ ] Loading spinners
- [ ] Optimistic UI updates

**13. Empty States**
- [ ] No tasks found
- [ ] No results for filters
- [ ] Welcome message for new users

**14. Animations**
- [ ] Task completion animation
- [ ] Task creation animation
- [ ] Smooth transitions

**15. Responsive Breakpoints**
- [ ] Desktop: Table view (> 768px)
- [ ] Tablet: Compact table (> 480px)
- [ ] Mobile: Card view (< 480px)

---

## 🎯 API Integration Examples

### Get Tasks with Filters
```typescript
const filters = {
  status: ['pending'],
  priority: ['high', 'medium'],
  timeframe: 'today',
  search: 'report'
};

const params = new URLSearchParams();
filters.status.forEach(s => params.append('status', s));
filters.priority.forEach(p => params.append('priority', p));
params.append('timeframe', filters.timeframe);
params.append('search', filters.search);

const response = await fetch(`http://localhost:3200/api/tasks/heifets@merck.com?${params}`);
const tasks = await response.json();
```

### Create Manual Task (Text)
```typescript
const response = await fetch('http://localhost:3200/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'heifets@merck.com',
    title: 'Review project proposal',
    due_date: '2025-11-15T17:00:00Z',
    priority: 'high',
    input_method: 'text',
    raw_input: 'review project proposal by next friday',
    llm_enabled: false
  })
});
const newTask = await response.json();
```

### Create Manual Task (Voice with LLM)
```typescript
// 1. Get transcription from Web Speech API
const transcript = "call to yan and speak about work plan by next week";

// 2. Create task with LLM parsing
const response = await fetch('http://localhost:3200/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'heifets@merck.com',
    title: transcript, // Will be overwritten by LLM
    input_method: 'voice',
    raw_input: transcript,
    llm_enabled: true
  })
});

// Response will include LLM-parsed data:
// {
//   title: "Call Yan about work plan",
//   due_date: "2025-11-15T...",
//   priority: "high",
//   mentioned_people: ["Yan"],
//   tags: ["work plan"],
//   ...
// }
```

### Complete Task
```typescript
await fetch(`http://localhost:3200/api/tasks/123/complete`, {
  method: 'POST'
});
```

### Snooze Task
```typescript
await fetch(`http://localhost:3200/api/tasks/123/snooze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ duration: 'tomorrow' })
});
```

### Bulk Complete
```typescript
await fetch('http://localhost:3200/api/tasks/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_ids: [123, 456, 789],
    action: 'complete'
  })
});
```

---

## 🎨 Design System

### Colors
```css
--primary: #6264A7;      /* Teams purple */
--success: #10b981;      /* Green */
--warning: #f59e0b;      /* Orange/Yellow */
--danger: #ef4444;       /* Red */
--gray: #6b7280;         /* Neutral */

/* Priority colors */
--priority-high: #ef4444;
--priority-medium: #f59e0b;
--priority-low: #10b981;

/* Status colors */
--status-pending: #6b7280;
--status-completed: #10b981;
--status-snoozed: #9ca3af;
--status-overdue: #ef4444;
```

### Typography
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
--font-size-xl: 1.25rem;   /* 20px */
```

### Spacing
```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

---

## 📱 Mobile-First Breakpoints

```css
/* Mobile first (default) */
@media (min-width: 480px) {
  /* Tablet - compact table */
}

@media (min-width: 768px) {
  /* Desktop - full table with sidebar */
}

@media (min-width: 1024px) {
  /* Large desktop - wider layout */
}
```

---

## 🔊 Voice Recognition Implementation

### Web Speech API Setup
```typescript
// Check browser support
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
  alert('Voice recognition not supported in this browser');
  return;
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US'; // or 'he-IL', 'ru-RU'
recognition.continuous = false;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  setTranscript(transcript);
};

recognition.onerror = (event) => {
  console.error('Speech recognition error:', event.error);
};

recognition.start();
```

### Language Support
```typescript
const languages = {
  english: 'en-US',
  hebrew: 'he-IL',
  russian: 'ru-RU'
};
```

---

## 🚀 Next Steps

1. **Run database migration**
   ```bash
   cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/database
   psql ai_power_toys < migration_add_task_fields.sql
   ```

2. **Start building frontend**
   ```bash
   cd task-manager
   npm run dev
   ```

3. **Test backend API**
   - Start webhook server: `ts-node webhook_server_db.ts`
   - Test endpoints with curl or Postman

---

## 📝 Notes

- LLM parsing is currently a **placeholder** that does basic keyword matching
- Real LLM integration will be added later with OpenAI GPT-4
- Voice recognition uses browser's built-in Web Speech API
- Task Manager runs on port **5275** (different from dashboard port 5274)
- No authentication required (reads user email from app state)
- All tasks are user-scoped via email address

