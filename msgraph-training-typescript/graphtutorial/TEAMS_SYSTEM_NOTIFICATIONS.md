# Teams System Notifications - Making Teams Popups Appear as System Toasts

## The Problem
Teams Adaptive Cards only appear **inside** the Teams app, not as system-level popups in the bottom-right corner.

## The Solution: Teams Bot + Activity Feed Notifications

This approach gives you:
- ✅ Zero installation (everyone has Teams)
- ✅ System popup notifications (bottom-right corner)
- ✅ Rich interactive buttons
- ✅ Works even when Teams is minimized

---

## Architecture

```
Email Sent → Webhook → Analyzer → LLM → Orchestrator
                                            ↓
                                  Teams Bot API
                                            ↓
                     Activity Feed Notification (appears as system toast)
                                            ↓
                                When user clicks notification
                                            ↓
                            Opens Teams with Adaptive Card
```

---

## How It Works

1. **Activity Feed Notification**: Triggers Windows/Mac system notification
2. **User clicks notification**: Opens Teams with full Adaptive Card
3. **Action buttons**: User can respond directly in Teams

---

## Implementation Steps

### Step 1: Register Teams Bot

1. Go to: https://dev.teams.microsoft.com/bots
2. Create new bot
3. Copy Bot ID and create Bot Secret
4. Add to environment variables:
   ```bash
   export TEAMS_BOT_ID="your-bot-id"
   export TEAMS_BOT_SECRET="your-bot-secret"
   export TEAMS_APP_ID="your-app-id"
   ```

### Step 2: Install Bot in Your Teams

1. Create manifest.json (see below)
2. Upload to Teams: Apps → Manage your apps → Upload an app
3. Install for yourself

### Step 3: Send Activity Feed Notification

When LLM detects action item, send notification that triggers system popup.

---

## Code Implementation

### File: `teams_notifier.ts`

```typescript
// Teams System Notification Service
// Sends notifications that appear as system popups

interface FollowUpNotification {
  userEmail: string;
  emailSubject: string;
  actionItem: string;
  suggestedDate: string;
  originalEmailId: string;
}

async function sendSystemNotification(data: FollowUpNotification) {
  const GRAPH_TOKEN = process.env.GRAPH_TOKEN || '';
  const TEAMS_APP_ID = process.env.TEAMS_APP_ID || '';

  // Get user's Teams ID from email
  const userResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${data.userEmail}`,
    {
      headers: { 'Authorization': `Bearer ${GRAPH_TOKEN}` }
    }
  );
  const user = await userResponse.json();
  const userId = user.id;

  // Send Activity Feed Notification
  // This will trigger a system popup!
  const notification = {
    topic: {
      source: "entityUrl",
      value: `https://graph.microsoft.com/v1.0/users/${userId}/messages/${data.originalEmailId}`
    },
    activityType: "taskCreated",
    previewText: {
      content: `Follow-up needed: ${data.actionItem}`
    },
    templateParameters: [
      {
        name: "emailSubject",
        value: data.emailSubject
      },
      {
        name: "actionItem",
        value: data.actionItem
      },
      {
        name: "suggestedDate",
        value: data.suggestedDate
      }
    ]
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GRAPH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notification)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send notification: ${error}`);
  }

  console.log('✅ System notification sent! User will see popup.');
  return await response.json();
}

export { sendSystemNotification };
```

---

### File: `orchestrator.ts`

```typescript
// Orchestrator - Integrates LLM analysis with Teams notifications

import { sendSystemNotification } from './teams_notifier';

interface EmailAnalysis {
  subject: string;
  from: string;
  sentDate: string;
  actionItems: {
    description: string;
    suggestedFollowUpDate: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  emailId: string;
}

async function processEmailForFollowUp(email: any) {
  console.log('📧 Processing email for follow-up...');

  // STEP 1: Analyze with LLM
  const analysis = await analyzeEmailWithLLM(email);

  // STEP 2: If action items found, send notification
  if (analysis.actionItems.length > 0) {
    console.log(`🎯 Found ${analysis.actionItems.length} action item(s)`);

    for (const actionItem of analysis.actionItems) {
      // Send system popup notification
      await sendSystemNotification({
        userEmail: email.from.emailAddress.address,
        emailSubject: email.subject,
        actionItem: actionItem.description,
        suggestedDate: actionItem.suggestedFollowUpDate,
        originalEmailId: email.id
      });

      console.log(`✅ Notification sent for: ${actionItem.description}`);
    }
  }
}

async function analyzeEmailWithLLM(email: any): Promise<EmailAnalysis> {
  // This will call OpenAI/Claude to extract action items
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  const prompt = `
Analyze this email and extract any action items that need follow-up:

Subject: ${email.subject}
From: ${email.from.emailAddress.address}
Body: ${email.body.content}

Extract:
1. Action items that need follow-up
2. Suggested follow-up date for each
3. Priority (high/medium/low)

Return as JSON.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an assistant that extracts action items from emails.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const result = await response.json();
  const analysis = JSON.parse(result.choices[0].message.content);

  return {
    subject: email.subject,
    from: email.from.emailAddress.address,
    sentDate: email.sentDateTime,
    emailId: email.id,
    actionItems: analysis.actionItems || []
  };
}

export { processEmailForFollowUp };
```

---

### File: `webhook_server_enhanced.ts`

```typescript
// Enhanced webhook server with LLM integration

import express from 'express';
import { processEmailForFollowUp } from './orchestrator';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3200;
const ACCESS_TOKEN = process.env.GRAPH_TOKEN || '';

app.post('/webhook', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('📬 WEBHOOK REQUEST RECEIVED');
  console.log('='.repeat(60));

  // STEP 1: Handle subscription validation
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    console.log('✅ Subscription validation request');
    return res.status(200).send(validationToken);
  }

  // STEP 2: Process change notifications
  const notificationData = req.body;
  const notificationList = notificationData.value || [];

  for (const notification of notificationList) {
    console.log('Processing notification:', notification.subscriptionId);

    // Verify client state
    if (notification.clientState !== 'MySecretState456') {
      console.warn('⚠️  Invalid client state!');
      continue;
    }

    // STEP 3: Fetch full message details
    if (ACCESS_TOKEN) {
      try {
        const messageUrl = `https://graph.microsoft.com/v1.0/${notification.resource}`;
        const messageResponse = await fetch(messageUrl, {
          headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        if (messageResponse.ok) {
          const message = await messageResponse.json();

          console.log('✉️  Email received:');
          console.log('  Subject:', message.subject);
          console.log('  From:', message.from?.emailAddress?.address);

          // STEP 4: Process with LLM and send notification
          console.log('🤖 Analyzing with LLM...');
          await processEmailForFollowUp(message);

        } else {
          console.error('❌ Failed to fetch message');
        }
      } catch (error: any) {
        console.error('❌ Error:', error.message);
      }
    }
  }

  console.log('='.repeat(60));
  console.log('✅ Notification processed\n');

  res.status(202).send();
});

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  AI Power Toys - Follow-Up Bot RUNNING                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log('🤖 LLM: Ready');
  console.log('📬 Teams notifications: Enabled\n');
});

export default app;
```

---

## Required Permissions

Add these to your Azure AD app registration:

```
TeamsActivity.Send          - Send activity feed notifications
User.Read                   - Read user profile
Mail.Read                   - Read emails
Calendars.ReadWrite         - Create calendar events
```

---

## Teams App Manifest

### File: `manifest.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_APP_ID",
  "packageName": "com.powertools.followup",
  "developer": {
    "name": "Your Name",
    "websiteUrl": "https://yourcompany.com",
    "privacyUrl": "https://yourcompany.com/privacy",
    "termsOfUseUrl": "https://yourcompany.com/terms"
  },
  "name": {
    "short": "Follow-Up Power Toy",
    "full": "AI-Powered Follow-Up Assistant"
  },
  "description": {
    "short": "Never miss a follow-up",
    "full": "AI-powered assistant that analyzes your emails and reminds you to follow up on action items"
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "accentColor": "#0078D4",
  "bots": [
    {
      "botId": "YOUR_BOT_ID",
      "scopes": ["personal"],
      "supportsFiles": false,
      "isNotificationOnly": true
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": [],
  "webApplicationInfo": {
    "id": "YOUR_APP_ID",
    "resource": "api://YOUR_APP_ID"
  }
}
```

---

## Testing the System Notification

### File: `test_notification.ts`

```typescript
// Test sending a system notification

import { sendSystemNotification } from './teams_notifier';

async function testNotification() {
  console.log('🧪 Testing system notification...\n');

  try {
    await sendSystemNotification({
      userEmail: 'heifets@merck.com',
      emailSubject: 'Q4 Budget Review Meeting',
      actionItem: 'Send budget proposal to Sarah by Friday',
      suggestedDate: '2025-11-08T14:00:00',
      originalEmailId: 'test-email-id-123'
    });

    console.log('\n✅ SUCCESS!');
    console.log('Check your:');
    console.log('  1. Windows notification center (bottom-right)');
    console.log('  2. Teams activity feed');
    console.log('  3. Click the notification to open Teams\n');

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testNotification();
```

---

## What Happens

1. **Email sent** → Webhook notification received
2. **LLM analyzes** → Extracts: "Send budget proposal to Sarah by Friday"
3. **System notification sent** → Windows/Mac popup appears in bottom-right:
   ```
   📬 Follow-Up Power Toy

   Follow-up needed: Send budget proposal to Sarah by Friday

   Email: Q4 Budget Review Meeting
   Suggested: Nov 8, 2:00 PM

   [Click to create reminder]
   ```
4. **User clicks** → Teams opens with Adaptive Card showing full details and action buttons

---

## Advantages of This Approach

✅ **Zero installation** - Uses Teams that everyone already has
✅ **System popups** - Appears in bottom-right corner
✅ **Works when minimized** - Even if Teams is closed
✅ **Rich interactions** - Full Adaptive Cards when clicked
✅ **Cross-platform** - Works on Windows, Mac, mobile
✅ **Microsoft ecosystem** - Integrates perfectly with Outlook/Calendar

---

## Quick Setup Commands

```bash
# Set environment variables
export GRAPH_TOKEN="your_token"
export TEAMS_APP_ID="your_app_id"
export TEAMS_BOT_ID="your_bot_id"
export OPENAI_API_KEY="your_openai_key"

# Start enhanced webhook server
npx ts-node webhook_server_enhanced.ts

# In another terminal: Start ngrok
ngrok http 3200

# Test notification
npx ts-node test_notification.ts
```

---

## Next Steps

1. Register Teams bot at https://dev.teams.microsoft.com/bots
2. Get bot credentials
3. Create and upload manifest.json to Teams
4. Install app for yourself
5. Test with `test_notification.ts`
6. Integrate with webhook server

This gives you exactly what you want: **Teams integration with system popups!** 🎉
