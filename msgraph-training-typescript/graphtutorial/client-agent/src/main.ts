import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, net } from 'electron';
import * as path from 'path';
import * as http from 'http';

const API_BASE = 'http://localhost:3200';
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let historyWindow: BrowserWindow | null = null;
let sseRequest: http.ClientRequest | null = null;

// Keep app running in background
app.on('window-all-closed', () => {
  // Keep app running
});

app.whenReady().then(() => {
  // Show in Dock so it's always visible and clickable (macOS only)
  app.dock?.show();

  createTray();
  console.log('🚀 AI Power Toys Started - monitoring emails...');
  connectToServer();

  // Update unread count every 30 seconds
  setInterval(updateUnreadCount, 30000);
  updateUnreadCount(); // Initial update

  // Update Dock badge with unread count (macOS only)
  setInterval(updateDockBadge, 30000);
  updateDockBadge();
});

function createTray() {
  // Create a simple but visible colored icon for macOS
  // Using a 32x32 PNG with bright colors
  const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAADQylYeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAAAC5ElEQVRYCe2XT0hUURTGv3fezJsZHU3NyMIfhBG4CAKJMnJhixahq8hVBBktglq0a9EqaBG0qIVERGQQLSIKokURFAT9gzZF0KJF0D8yczKnmXnv3XvPue+NOs7MeyPTrkUHDu/ec8/5vnPPO+8OoZTCZpIgm4guAwAGgI0uwEbzgEagEdgIArYRGWxE1kdERmSNwEYQsI3IYCOyPiIyImsENoKAbUQGG5H1EZERWSOw/wXY7Xbs27cPJSUlsFqtMJlMOHXqFNrb2+FyuZbF/GRkZMDv98Pj8YiY1WqF2WyGxWKByWRCVlYW0tPTYTabodVqIy+HmzdvSvmVK1eQm5uLwsJCnD17Fnl5eUhJSYFOpwNN00hISIDRaAyLCABycnJw7tw5vHnzBh0dHejq6sLFixeRmZkpACKNLYLFYokoH6mw6urqcP36dbS0tODVq1fo6OjAtWvX4HA4YDKZQOMILJfLJXhYTp48iY6ODvT19eHJkycYGRnBq1evcPv2bdjtdtA4AjkcDrhcLty/fx/T09OYnp5Gb28vbt26haamJuzYsQM0joCLFy+KaR4cHMTIyAi8Xi8mJibw8OFDnDhxArdu3cLu3btBGSMPHz6E3+/H/fv3kZ+fL6bY6/ViZGQEbW1tqKurQ3l5OcxmM2gc0d3djadPn4opPn78OCoqKjA+Po7BwUHU1NSgqqoKp0+fRnFxMWgcgdvb23H58mXk5OTg7NmzGBsbw9DQEPr7+1FbW4tjx46htrYWiYmJoHEEfv/+PRwOBxYWFlBaWori4mKMjo6iu7sbR44cQX19PYqKikDjCPzx4wdmZmbg9/tRUVGBiooKjI+Po6urC4cPH8bRo0dRUFAAGucL/fXrF+bm5hAIBFBWVobS0lJMTk7i+fPnOHToEA4ePIj9+/eDMkY+fPiAR48eiZfP5/OhtLRUrH1nZycOHDiAyspK7N27FzSOgK9fv6K5uRnBYBDBYBAHDhwQe9/Q0ICGhgbs3LkTNI7Ajx8/oqWlBcFgEF++fBFr39jYiMbGRuzZswd/ASxM8jct4j8CAAAAAElFTkSuQmCC';

  const icon = nativeImage.createFromDataURL(iconData);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📬 AI Power Toys',
      type: 'normal',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '📋 Show Notifications',
      click: () => showNotificationHistory()
    },
    { type: 'separator' },
    {
      label: '⏹ Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('AI Power Toys - Click to view notifications');
  tray.setContextMenu(contextMenu);

  // Add click handler - left click opens notification history
  tray.on('click', () => {
    showNotificationHistory();
  });
}

function connectToServer() {
  console.log('Connecting to SSE server...');

  sseRequest = http.get(`${API_BASE}/api/events`, (res) => {
    console.log('Connected to Power Toys server');
    if (tray) {
      tray.setToolTip('AI Power Toys - Connected');
    }

    let buffer = '';

    res.on('data', (chunk) => {
      buffer += chunk.toString();

      // Process complete messages (separated by \n\n)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      messages.forEach((msg) => {
        if (msg.startsWith('data: ')) {
          try {
            const data = JSON.parse(msg.substring(6));
            console.log('Event received:', data);

            if (data.type === 'new_email') {
              handleNewEmail(data.data);
            }
          } catch (err) {
            console.error('Error parsing event:', err);
          }
        }
      });
    });

    res.on('end', () => {
      console.log('SSE connection ended, reconnecting...');
      setTimeout(connectToServer, 5000);
    });
  });

  sseRequest.on('error', (err) => {
    console.error('SSE error:', err);
    if (tray) {
      tray.setToolTip('AI Power Toys - Disconnected');
    }
    setTimeout(connectToServer, 5000);
  });
}

function handleNewEmail(data: any) {
  console.log('📬 Creating notification for:', data);

  // Only create popup if a toy was detected
  if (data.toy_type && data.toy_type !== null) {
    createNotificationWindow(data);
  } else {
    console.log('ℹ️ No toy detected, skipping popup');
  }
}

async function handleAction(data: any, actionType: string) {
  try {
    console.log(`📤 Sending action: ${actionType} for detection:`, data.detection_id);

    const response = await fetch(`${API_BASE}/api/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        detection_id: data.detection_id,
        action_type: actionType,
        action_data: {
          email_subject: data.subject,
          email_from: data.from
        },
        user_email: data.to || 'heifets@merck.com' // Fallback to default user
      })
    });

    const result: any = await response.json();

    if (result.task) {
      console.log('✅ Task created:', result.task);
      // Show success notification
      const notif = new Notification({
        title: '✅ Task Created',
        body: `"${result.task.title}"`,
        silent: false
      });
      notif.show();
    } else {
      console.log('✅ Action recorded:', result);
    }
  } catch (error) {
    console.error('Error handling action:', error);
    const notif = new Notification({
      title: '❌ Action Failed',
      body: 'Could not complete the action',
      silent: false
    });
    notif.show();
  }
}

function createNotificationWindow(data: any) {
  const notifWindow = new BrowserWindow({
    width: 420,
    height: 200,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#6264A7',
    resizable: false,
    transparent: false,
    hasShadow: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  // Position in bottom-right corner
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  notifWindow.setPosition(width - 440, height - 220);

  // Show window immediately after loading content
  notifWindow.webContents.on('did-finish-load', () => {
    notifWindow.show();
  });

  // Determine toy type and suggested actions
  const toyType = data.toy_type || 'unknown';
  let actionButtons = '';

  if (toyType === 'follow_up') {
    actionButtons = `
      <a href="action://schedule-calendar" class="btn-action">📅 Schedule</a>
      <a href="action://quick-add-calendar" class="btn-action">✅ Quick Add</a>
    `;
  } else if (toyType === 'task') {
    actionButtons = `
      <a href="action://create-task" class="btn-action">✅ Create Task</a>
    `;
  } else if (toyType === 'urgent') {
    actionButtons = `
      <a href="action://open-mail" class="btn-action">📧 Open Mail</a>
      <a href="action://reply-now" class="btn-action">✉️ Reply</a>
    `;
  } else if (toyType === 'kudos') {
    actionButtons = `
      <a href="action://give-inspire" class="btn-action">🏆 Give Inspire</a>
    `;
  } else if (toyType === 'meeting_summary') {
    actionButtons = `
      <a href="action://send-summary" class="btn-action">📝 Send Summary</a>
    `;
  } else {
    actionButtons = `
      <a href="action://open-dashboard" class="btn-action">Dashboard</a>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #ffffff;
          color: #242424;
          overflow: hidden;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.05);
          border-radius: 8px;
        }
        .header {
          background: linear-gradient(135deg, #6264A7 0%, #5558a0 100%);
          padding: 14px 16px;
          border-radius: 8px 8px 0 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.2px;
        }
        .body {
          padding: 14px 16px 8px 16px;
          font-size: 13px;
          line-height: 1.5;
          color: #424242;
          background: #fafafa;
        }
        .body strong {
          color: #242424;
          font-weight: 600;
        }
        .actions {
          display: flex;
          gap: 8px;
          padding: 8px 16px 16px 16px;
          justify-content: flex-end;
          align-items: center;
          background: #fafafa;
          border-radius: 0 0 8px 8px;
        }
        a {
          padding: 7px 14px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 600;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .btn-action {
          background: #6264A7;
          color: #ffffff;
        }
        .btn-action:hover {
          background: #5558a0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
        }
        .btn-action:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }
        .btn-dismiss {
          background: transparent;
          color: #616161;
          padding: 7px 12px;
          box-shadow: none;
          font-size: 16px;
        }
        .btn-dismiss:hover {
          background: #f3f2f1;
          color: #242424;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">📬 AI Power Toys</div>
      </div>
      <div class="body">
        <strong>Email:</strong> ${data.subject}<br>
        <strong>From:</strong> ${data.from}
      </div>
      <div class="actions">
        ${actionButtons}
        <a href="action://show-history" class="btn-action" style="background: #0078d4;">📋 History</a>
        <a href="action://dismiss" class="btn-dismiss">✕</a>
      </div>
    </body>
    </html>
  `;

  notifWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Handle button clicks
  notifWindow.webContents.on('will-navigate', async (event, url) => {
    event.preventDefault();
    console.log('Button clicked, URL:', url);

    if (url === 'action://dismiss') {
      // Mark notification as dismissed in database
      markNotificationDismissed(data.detection_id);
      notifWindow.close();
    } else if (url === 'action://show-history') {
      showNotificationHistory();
      notifWindow.close();
    } else if (url === 'action://open-dashboard') {
      showNotificationHistory();
      notifWindow.close();
    } else if (url === 'action://schedule-calendar') {
      console.log('Creating calendar event with attachment and opening in Outlook:', data);
      await handleCalendarWithAttachment(data, true); // true = open in Outlook after creation
      notifWindow.close();
    } else if (url === 'action://quick-add-calendar') {
      console.log('Creating calendar event with email attachment:', data);
      await handleCalendarWithAttachment(data);
      notifWindow.close();
    } else if (url === 'action://create-task') {
      console.log('Creating task for:', data);
      handleCreateTask(data);
      notifWindow.close();
    } else if (url === 'action://open-mail') {
      console.log('Opening mail for:', data);
      const { shell } = require('electron');
      shell.openExternal('outlook://');
      notifWindow.close();
    } else if (url === 'action://reply-now') {
      console.log('Opening reply for:', data);
      const { shell } = require('electron');
      shell.openExternal('outlook://');
      notifWindow.close();
    } else if (url === 'action://give-inspire') {
      console.log('Opening WorkHuman Inspire:', data);
      const { shell } = require('electron');
      shell.openExternal('https://cloud.workhuman.com/static-apps/wh-host/');
      notifWindow.close();
    } else if (url === 'action://send-summary') {
      console.log('Sending meeting summary:', data);
      handleSendSummary(data);
      notifWindow.close();
    }
  });
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:5274'); // Dashboard URL

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });
}

async function markNotificationDismissed(detectionId: number) {
  try {
    // Find notification by detection_id
    const response = await fetch(`${API_BASE}/api/notifications?userEmail=heifets@merck.com`);
    const data: any = await response.json();
    const notification = data.notifications.find((n: any) => n.detection_id === detectionId);

    if (notification) {
      await fetch(`${API_BASE}/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' })
      });
      console.log('✅ Notification marked as dismissed');
    }
  } catch (error) {
    console.error('Error dismissing notification:', error);
  }
}

async function handleCalendarWithAttachment(data: any, openInOutlook: boolean = false) {
  try {
    // Get notification to find graph_message_id in metadata
    const response = await fetch(`${API_BASE}/api/notifications?userEmail=heifets@merck.com`);
    const notifData: any = await response.json();
    const notification = notifData.notifications.find((n: any) => n.detection_id === data.detection_id);

    if (!notification || !notification.metadata?.graph_message_id) {
      console.error('Could not find notification or graph_message_id');
      const { Notification } = require('electron');
      new Notification({
        title: '❌ Error',
        body: 'Could not find email reference'
      }).show();
      return;
    }

    if (openInOutlook) {
      // Schedule button: Open Outlook desktop with pre-filled meeting including email content
      console.log('Opening Outlook desktop with pre-filled meeting for:', data.subject);
      const { shell } = require('electron');
      const { exec } = require('child_process');

      // Fetch email content from backend
      const emailResponse = await fetch(`${API_BASE}/api/email/${notification.metadata.graph_message_id}`);
      const emailData: any = await emailResponse.json();

      if (!emailData.success) {
        console.error('Failed to fetch email content:', emailData.error);
        const { Notification } = require('electron');
        new Notification({
          title: '❌ Error',
          body: 'Failed to fetch email content'
        }).show();
        return;
      }

      // Calculate date: 1 week from now at 8:00 AM
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      startDate.setHours(8, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      // Format for AppleScript
      const startStr = startDate.toLocaleString();
      const endStr = endDate.toLocaleString();

      // Strip HTML tags from email content if it's HTML
      let emailContent = emailData.content;
      if (emailData.contentType === 'HTML') {
        emailContent = emailContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }

      // Prepare content for AppleScript (escape special characters)
      const subject = data.subject.replace(/"/g, '\\"').replace(/'/g, "'");
      const from = emailData.from.replace(/"/g, '\\"').replace(/'/g, "'");
      const content = emailContent.replace(/"/g, '\\"').replace(/'/g, "'").substring(0, 2000); // Limit to 2000 chars

      const meetingBody = `Follow-up meeting regarding email from ${from}:\\n\\nOriginal Email:\\n${content}`;

      // Use AppleScript to open Outlook with new meeting including email content
      const script = `tell application "Microsoft Outlook"
	activate
	set newEvent to make new calendar event with properties {subject:"Follow-up: ${subject}", start time:date "${startStr}", end time:date "${endStr}", content:"${meetingBody}"}
	open newEvent
end tell`;

      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (error: any) => {
        if (error) {
          console.error('Error opening Outlook:', error);
          // Fallback to web version
          const subject = encodeURIComponent(`Follow-up: ${data.subject}`);
          const body = encodeURIComponent(`Follow-up meeting regarding email: ${data.subject}\n\nFrom: ${emailData.from}\n\n${emailContent.substring(0, 1000)}`);
          const startIso = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const endIso = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          shell.openExternal(`https://outlook.office.com/calendar/0/deeplink/compose?subject=${subject}&body=${body}&startdt=${startIso}&enddt=${endIso}`);
        }
      });

    } else {
      // Quick Add button: Create calendar reminder with email content (silently, no Outlook opening)
      console.log('Creating follow-up calendar event with email content:', data);
      const { exec } = require('child_process');

      // Fetch email content from backend
      const emailResponse = await fetch(`${API_BASE}/api/email/${notification.metadata.graph_message_id}`);
      const emailData: any = await emailResponse.json();

      if (!emailData.success) {
        console.error('Failed to fetch email content:', emailData.error);
        const { Notification } = require('electron');
        new Notification({
          title: '❌ Error',
          body: 'Failed to fetch email content'
        }).show();
        return;
      }

      // Calculate date: 1 week from now at 8:00 AM
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      startDate.setHours(8, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      // Format for AppleScript
      const startStr = startDate.toLocaleString();
      const endStr = endDate.toLocaleString();

      // Strip HTML tags from email content if it's HTML
      let emailContent = emailData.content;
      if (emailData.contentType === 'HTML') {
        emailContent = emailContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }

      // Prepare content for AppleScript (escape special characters)
      const subject = data.subject.replace(/"/g, '\\"').replace(/'/g, "'");
      const from = emailData.from.replace(/"/g, '\\"').replace(/'/g, "'");
      const content = emailContent.replace(/"/g, '\\"').replace(/'/g, "'").substring(0, 2000); // Limit to 2000 chars

      const meetingBody = `Follow-up meeting regarding email from ${from}:\\n\\nOriginal Email:\\n${content}`;

      // Use AppleScript to create event in Outlook (without opening it) with email content
      const script = `tell application "Microsoft Outlook"
	set newEvent to make new calendar event with properties {subject:"Follow-up: ${subject}", start time:date "${startStr}", end time:date "${endStr}", content:"${meetingBody}"}
end tell`;

      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (error: any) => {
        const { Notification } = require('electron');
        if (error) {
          console.error('Error creating calendar event:', error);
          new Notification({
            title: '❌ Calendar Error',
            body: 'Failed to create follow-up event'
          }).show();
        } else {
          console.log('✅ Follow-up calendar event created with email content');
          new Notification({
            title: '📅 Follow-up Scheduled',
            body: `Meeting created for 1 week from now: "${data.subject}"`
          }).show();
        }
      });
    }
  } catch (error) {
    console.error('Error handling calendar action:', error);
    const { Notification } = require('electron');
    new Notification({
      title: '❌ Error',
      body: 'Error handling calendar action'
    }).show();
  }
}

async function handleCreateTask(data: any) {
  try {
    console.log('Creating task in task management DB:', data);

    const result = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: 'heifets@merck.com',
        title: data.subject || 'Task from email',
        description: `From: ${data.from}\nSubject: ${data.subject}`,
        priority: 'medium',
        status: 'pending'
      })
    });

    if (result.ok) {
      const taskData = await result.json();
      console.log('✅ Task created:', taskData);

      const { Notification } = require('electron');
      new Notification({
        title: '✅ Task Created',
        body: `Task created: "${data.subject}"`
      }).show();
    } else {
      const error = await result.text();
      console.error('Failed to create task:', error);
    }
  } catch (error) {
    console.error('Error creating task:', error);
  }
}

async function handleSendSummary(data: any) {
  try {
    console.log('Sending meeting summary:', data);

    const result = await fetch(`${API_BASE}/api/send-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailSubject: data.subject,
        emailFrom: data.from,
        userEmail: 'heifets@merck.com'
      })
    });

    if (result.ok) {
      console.log('✅ Summary sent');

      const { Notification } = require('electron');
      new Notification({
        title: '📝 Summary Sent',
        body: `Meeting summary sent for "${data.subject}"`
      }).show();
    } else {
      const error = await result.text();
      console.error('Failed to send summary:', error);
    }
  } catch (error) {
    console.error('Error sending summary:', error);
  }
}

function showNotificationHistory() {
  if (historyWindow) {
    historyWindow.show();
    historyWindow.focus();
    return;
  }

  historyWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'AI Power Toys - Notifications',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load notification history from API and display
  fetch(`${API_BASE}/api/notifications?userEmail=heifets@merck.com`)
    .then(res => res.json())
    .then((data: any) => {
      const notifications = data.notifications || [];
      const totalCount = notifications.length;
      const unreadCount = notifications.filter((n: any) => n.status === 'unread').length;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            h1 {
              color: #6264A7;
              margin-bottom: 8px;
              font-size: 24px;
            }
            .subtitle {
              color: #666;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .notification-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .notification {
              background: white;
              padding: 16px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border-left: 4px solid #6264A7;
            }
            .notification.unread {
              border-left-color: #6264A7;
            }
            .notification.read {
              opacity: 0.6;
              border-left-color: #999;
            }
            .notification-title {
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 8px;
              color: #242424;
            }
            .notification-message {
              font-size: 14px;
              color: #666;
              margin-bottom: 12px;
            }
            .notification-time {
              font-size: 12px;
              color: #999;
              margin-bottom: 12px;
            }
            .notification-actions {
              display: flex;
              gap: 8px;
            }
            button {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              transition: all 0.2s;
            }
            .btn-primary {
              background: #6264A7;
              color: white;
            }
            .btn-primary:hover {
              background: #5558a0;
            }
            .btn-secondary {
              background: #e0e0e0;
              color: #333;
            }
            .btn-secondary:hover {
              background: #d0d0d0;
            }
            .empty-state {
              text-align: center;
              padding: 60px 20px;
              color: #999;
            }
            .empty-state h2 {
              margin-bottom: 8px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>📬 Notification History</h1>
          <div class="subtitle">${totalCount} total (${unreadCount} unread)</div>
          <div class="notification-list">
            ${notifications.length === 0 ? `
              <div class="empty-state">
                <h2>✨ All caught up!</h2>
                <p>No notifications</p>
              </div>
            ` : notifications.map((n: any) => `
              <div class="notification ${n.status}">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${new Date(n.created_at).toLocaleString()}</div>
                <div class="notification-actions">
                  ${n.action_buttons.map((btn: any) => `
                    <button class="btn-primary" onclick="window.location.href='action://${btn.action}?id=${n.id}&detection=${n.detection_id}'">${btn.label}</button>
                  `).join('')}
                  <button class="btn-secondary" onclick="window.location.href='action://dismiss?id=${n.id}'">Dismiss</button>
                </div>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `;

      historyWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    })
    .catch(err => {
      console.error('Error loading notifications:', err);
      historyWindow?.loadURL(`data:text/html,<h1>Error loading notifications</h1>`);
    });

  historyWindow.on('close', () => {
    historyWindow = null;
  });

  // Handle button clicks in history window
  historyWindow.webContents.on('will-navigate', async (event, url) => {
    event.preventDefault();
    console.log('History action clicked:', url);

    const urlObj = new URL(url);
    const action = urlObj.hostname;
    const notifId = urlObj.searchParams.get('id');

    if (action === 'dismiss' && notifId) {
      // Mark as dismissed
      await fetch(`${API_BASE}/api/notifications/${notifId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' })
      });
      console.log(`✅ Notification ${notifId} marked as dismissed`);

      // Close and reopen history window to refresh
      historyWindow?.close();
      historyWindow = null;
      setTimeout(() => {
        showNotificationHistory();
      }, 100);
    } else {
      // Handle other actions
      const detectionId = urlObj.searchParams.get('detection');
      console.log(`Triggering action: ${action} for detection: ${detectionId}`);
      historyWindow?.close();
    }
  });
}

async function updateUnreadCount() {
  try {
    const response = await fetch(`${API_BASE}/api/notifications/unread?userEmail=heifets@merck.com`);
    const data: any = await response.json();
    const count = data.count || 0;

    if (tray) {
      if (count > 0) {
        tray.setTitle(`${count}`); // Shows unread count next to icon
        tray.setToolTip(`AI Power Toys - ${count} unread notification${count > 1 ? 's' : ''}`);
      } else {
        tray.setTitle(''); // Clear the count when no unread
        tray.setToolTip('AI Power Toys - No unread notifications');
      }
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
  }
}

async function updateDockBadge() {
  try {
    const response = await fetch(`${API_BASE}/api/notifications/unread?userEmail=heifets@merck.com`);
    const data: any = await response.json();
    const count = data.count || 0;

    if (count > 0) {
      app.dock?.setBadge(`${count}`); // Shows red badge with number on Dock icon
    } else {
      app.dock?.setBadge(''); // Clear badge when no unread
    }
  } catch (error) {
    console.error('Error updating dock badge:', error);
  }
}

// Handle dock icon click - open notification history
app.on('activate', () => {
  showNotificationHistory();
});

app.on('before-quit', () => {
  sseRequest?.destroy();
});
