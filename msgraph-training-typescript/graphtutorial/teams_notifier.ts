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

  if (!GRAPH_TOKEN) {
    throw new Error('GRAPH_TOKEN not set');
  }

  if (!TEAMS_APP_ID) {
    throw new Error('TEAMS_APP_ID not set');
  }

  console.log('📬 Sending system notification...');
  console.log('  User:', data.userEmail);
  console.log('  Subject:', data.emailSubject);
  console.log('  Action:', data.actionItem);

  try {
    // Get user's Teams ID from email
    const userResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${data.userEmail}`,
      {
        headers: { 'Authorization': `Bearer ${GRAPH_TOKEN}` }
      }
    );

    if (!userResponse.ok) {
      const error = await userResponse.text();
      throw new Error(`Failed to get user: ${error}`);
    }

    const user = await userResponse.json();
    const userId = user.id;

    console.log('  User ID:', userId);

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

    console.log('✅ System notification sent! User will see popup in bottom-right corner.');
    return await response.json();

  } catch (error: any) {
    console.error('❌ Failed to send system notification:', error.message);
    throw error;
  }
}

export { sendSystemNotification, FollowUpNotification };
