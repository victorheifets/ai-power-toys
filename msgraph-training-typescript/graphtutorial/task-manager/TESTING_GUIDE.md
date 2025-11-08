# Task Manager - Testing Guide

## 🎉 **BUILD COMPLETE!**

All components are ready. Follow this guide to test the complete Task Manager.

---

## 📋 **Pre-Flight Checklist**

### **1. Run Database Migration**

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/database

# Run the migration to create tasks table
psql ai_power_toys < migration_create_tasks_table.sql
```

**Expected output:** Creates `tasks` table with sample data (5 test tasks)

---

### **2. Start Backend Server**

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial

# Start webhook server (includes task API)
ts-node webhook_server_db.ts
```

**Expected output:**
```
✅ Connected to PostgreSQL database
🚀 AI Power Toys listening on http://localhost:3200
```

---

### **3. Start Frontend**

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/task-manager

# Start Vite dev server
npm run dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:5275/
  ➜  Network: use --host to expose
```

---

## 🧪 **Testing Workflow**

### **Test 1: Initial Load**

1. Open browser: `http://localhost:5275`
2. ✅ **Check:** Header shows "🎤 AI Task Manager"
3. ✅ **Check:** Connection status shows "🟢 Live" (SSE connected)
4. ✅ **Check:** User email shows "heifets@merck.com"
5. ✅ **Check:** Left sidebar shows filters (desktop) or hidden (mobile)
6. ✅ **Check:** Test tasks from migration are displayed

---

### **Test 2: Create Manual Task (Text Input)**

1. Type in quick add form: **"Review budget proposal by Friday"**
2. ✅ **Check:** LLM toggle is ON (default)
3. Click **"+ Add"**
4. ✅ **Check:** Task appears in list immediately
5. ✅ **Check:** Task has:
   - Title: "Review budget proposal by Friday" (or LLM-parsed version)
   - Type: Manual (📝)
   - Source: ⌨️ Manual
   - Tags: ["budget", "proposal"] (if LLM detected)

---

### **Test 3: Create Task with Voice Input** 🎤

1. Click **microphone button** (🎤)
2. ✅ **Check:** Browser asks for mic permission
3. **Allow** microphone access
4. ✅ **Check:** Input field shows "Listening..." with red border animation
5. **Speak clearly:** *"Call Yan about work plan by next week"*
6. ✅ **Check:** Transcribed text appears in input
7. Click **"+ Add"**
8. ✅ **Check:** Task created with:
   - Title: "Call Yan about work plan" (LLM-parsed)
   - Due date: ~7 days from now
   - Mentioned people: ["Yan"]
   - Tags: ["work plan"]
   - Source: 🎤 Voice

---

### **Test 4: Voice Language Switching**

1. Change language dropdown to **"🇮🇱 עברית"** (Hebrew)
2. Click microphone
3. Speak in Hebrew
4. ✅ **Check:** Transcription works in Hebrew
5. Switch back to **"🇺🇸 English"**

---

### **Test 5: LLM Toggle On/Off**

1. **Disable** "🤖 AI Smart Parse" checkbox
2. Type: **"call to yan and speak about work plan by next week"**
3. Click **"+ Add"**
4. ✅ **Check:** Task created with exact input as title (no parsing)
5. **Enable** LLM toggle again
6. Type same text
7. Click **"+ Add"**
8. ✅ **Check:** Task parsed (title cleaned up, date extracted, etc.)

---

### **Test 6: Filtering**

**Filter by Status:**
1. Uncheck **"Pending"** in sidebar
2. ✅ **Check:** Tasks disappear
3. Check **"Completed"**
4. Complete a task (click ✓)
5. ✅ **Check:** Only completed tasks show

**Filter by Priority:**
1. Check only **"🔴 High"**
2. ✅ **Check:** Only high priority tasks show

**Filter by Timeframe:**
1. Select **"Today"** radio button
2. ✅ **Check:** Only tasks due today show
3. Select **"Overdue"**
4. ✅ **Check:** Only overdue tasks show (red indicator)

**Search:**
1. Type **"report"** in search box
2. ✅ **Check:** Only tasks with "report" in title/notes show

**Clear Filters:**
1. Click **"Clear All"** button
2. ✅ **Check:** All filters reset to default (Pending only)

---

### **Test 7: Task Actions (Desktop Table)**

**Complete Task:**
1. Click ✓ button on any task
2. ✅ **Check:** Task gets strikethrough text
3. ✅ **Check:** Status changes to completed
4. ✅ **Check:** Real-time SSE update triggers

**Snooze Task:**
1. Click ⏰ button
2. ✅ **Check:** Snooze menu appears
3. Click **"Tomorrow"**
4. ✅ **Check:** Task disappears from Pending view
5. Change filter to **"Snoozed"**
6. ✅ **Check:** Task appears in snoozed list

**Edit Task:**
1. Click ✏️ button
2. ✅ **Check:** Title becomes editable input
3. Change title to: **"Updated task title"**
4. Press **Enter** (or click ✓)
5. ✅ **Check:** Title updates
6. ✅ **Check:** SSE broadcasts update

**Delete Task:**
1. Click 🗑️ button
2. ✅ **Check:** Confirmation dialog appears
3. Click **OK**
4. ✅ **Check:** Task disappears from list

---

### **Test 8: Bulk Actions**

1. Click checkboxes on **3 tasks**
2. ✅ **Check:** Bulk toolbar appears: "3 selected"
3. Click **"✓ Complete All"**
4. ✅ **Check:** All 3 tasks marked complete
5. Select 2 more tasks
6. Click **"🗑 Delete All"**
7. Confirm deletion
8. ✅ **Check:** Both tasks deleted

---

### **Test 9: Mobile Responsive (Card View)**

1. Resize browser to **< 768px** width (or use DevTools mobile view)
2. ✅ **Check:** Sidebar disappears
3. ✅ **Check:** Tasks display as cards (not table)
4. ✅ **Check:** Each card shows:
   - Emoji + Title
   - Due date, Priority, Source
   - Expand button (▶)

**Expand Card:**
1. Click on a card
2. ✅ **Check:** Card expands (▼ button)
3. ✅ **Check:** Shows notes, tags, people, email content

**Card Actions:**
1. Click **"✓ Complete"**
2. ✅ **Check:** Task completed
3. Click **"⏰ Snooze"**
4. ✅ **Check:** Snooze menu appears above button
5. Select duration
6. ✅ **Check:** Task snoozed

---

### **Test 10: Real-Time Updates (SSE)**

**Setup:**
1. Open **two browser tabs** to `http://localhost:5275`

**Test:**
1. In Tab 1: Create a new task
2. ✅ **Check:** Tab 2 automatically shows the new task (no refresh!)
3. In Tab 2: Complete a task
4. ✅ **Check:** Tab 1 shows task as completed
5. In console: Look for SSE logs: `"SSE event received: task_created"`

---

### **Test 11: Statistics Display**

1. Check sidebar stats (desktop)
2. ✅ **Check:** Shows:
   - Pending count
   - Overdue count
   - Today count
   - Done count
3. Create a new task
4. ✅ **Check:** Pending count increments
5. Complete the task
6. ✅ **Check:** Done count increments, Pending decrements

---

### **Test 12: Filter Persistence**

1. Set filters:
   - Status: Pending + Completed
   - Priority: High
   - Timeframe: This Week
2. Refresh page (F5)
3. ✅ **Check:** All filters remembered (from localStorage)

---

### **Test 13: LLM Placeholder Parsing**

**Test Date Parsing:**
- Input: "Review slides tomorrow"
- ✅ Expected: due_date = tomorrow's date

- Input: "Call John next week"
- ✅ Expected: due_date = 7 days from now

**Test People Extraction:**
- Input: "Call Yan about project"
- ✅ Expected: mentioned_people = ["Yan"]

- Input: "Meet with Sarah and talk to John"
- ✅ Expected: mentioned_people = ["Sarah", "John"]

**Test Tags:**
- Input: "Review project proposal for meeting"
- ✅ Expected: tags = ["project", "proposal", "meeting"]

**Test Priority:**
- Input: "URGENT: Send report ASAP"
- ✅ Expected: priority = "high"

---

## 🐛 **Common Issues & Fixes**

### **Issue:** Tasks not loading
**Fix:** Check backend is running on port 3200
```bash
curl http://localhost:3200/api/tasks/heifets@merck.com
```

### **Issue:** SSE not connecting
**Fix:** Check console for CORS errors. Backend should allow `*` origin.

### **Issue:** Voice not working
**Fix:**
- Use Chrome/Edge/Safari (Firefox has limited support)
- Check mic permissions in browser settings
- Try HTTPS (some browsers require secure context)

### **Issue:** LLM not parsing correctly
**Fix:** This is expected! Current LLM is a placeholder with keyword matching. Real OpenAI integration comes next.

---

## 📊 **Expected Sample Data**

After migration, you should see these test tasks:

1. **Call Yan about work plan**
   - Priority: High
   - Due: +7 days
   - Source: Manual (Voice)

2. **Review project proposal**
   - Priority: Medium
   - Due: +2 days
   - Tags: ["project", "proposal"]
   - Source: Manual (Text)

3. **Prepare Q3 presentation**
   - Priority: High
   - Due: Tomorrow
   - Notes: "Include sales data and market analysis"

4. **Buy groceries**
   - Priority: Low
   - No due date

5. **Send Q4 report to boss**
   - Priority: High
   - Due: 2025-11-15
   - Source: Email (converted from detection)

---

## ✅ **Success Criteria**

Your Task Manager is working if:

- ✅ All 5 sample tasks load
- ✅ You can create tasks via text input
- ✅ You can create tasks via voice input
- ✅ Filters work (status, priority, timeframe, search)
- ✅ Actions work (complete, snooze, edit, delete)
- ✅ Bulk actions work (select multiple, complete/delete all)
- ✅ Responsive design works (table on desktop, cards on mobile)
- ✅ Real-time updates work (SSE connection shows 🟢 Live)
- ✅ Filters persist across page refreshes
- ✅ LLM parsing extracts dates, people, tags (basic)

---

## 🚀 **Next Steps**

Once all tests pass:

1. **Integrate Real LLM** - Replace placeholder with OpenAI GPT-4
2. **Add Email-to-Task Conversion** - Dashboard button to create task from detection
3. **Implement Calendar/Tasks API** - Actually create Outlook events
4. **Add Mobile Gestures** - Swipe to complete/delete
5. **Build Notification Center** - Timeline view of all activities
6. **Deploy** - Cloudflare tunnel, production database

---

## 📝 **Test Report Template**

```
Date: _______
Tester: _______

✅ Initial load
✅ Create task (text)
✅ Create task (voice)
✅ Voice language switching
✅ LLM toggle
✅ Filtering (all types)
✅ Complete task
✅ Snooze task
✅ Edit task
✅ Delete task
✅ Bulk actions
✅ Mobile responsive
✅ Real-time SSE
✅ Statistics display
✅ Filter persistence

Issues found:
1. _______
2. _______

Overall: PASS / FAIL
```

---

🎊 **CONGRATULATIONS! Your AI Task Manager is complete and ready to test!** 🎊

