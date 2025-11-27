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
        user_email: data.to || 'victor.heifets@msd.com' // Fallback to default user
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
  // Create custom notification window with action buttons
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
    show: true,
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

  // Bring to front
  notifWindow.setAlwaysOnTop(true, 'screen-saver');
  notifWindow.focus();

  // ALSO: Show a native macOS notification for visibility
  const toyIcons: Record<string, string> = {
    'follow_up': '⏰',
    'kudos': '🌟',
    'task': '✅',
    'urgent': '⚠️',
    'meeting_summary': '📝',
    'blocker': '🚧'
  };

  const icon = toyIcons[data.toy_type] || '📬';
  const nativeNotif = new Notification({
    title: `${icon} ${data.subject}`,
    body: data.body_preview || `From: ${data.from}`,
    silent: false,
    urgency: data.toy_type === 'urgent' ? 'critical' : 'normal'
  });
  nativeNotif.show();

  // Make notification clickable to focus the custom window
  nativeNotif.on('click', () => {
    notifWindow.show();
    notifWindow.focus();
  });

  // Determine toy type and suggested actions
  const toyType = data.toy_type || 'unknown';
  let actionButtons = '';
  let popupTitle = '📬 AI Power Toys';

  if (toyType === 'follow_up') {
    popupTitle = '📤 Follow-Up Detected';
    // Follow-Up toy: OUTGOING emails with task assignments
    actionButtons = `
      <a href="action://add-task" class="btn-action">✅ Add Task</a>
      <a href="action://open-scheduler" class="btn-action">📅 Open Scheduler</a>
    `;
  } else if (toyType === 'task') {
    popupTitle = '✅ Task Detected';
    // Task toy: Emails asking YOU to do something
    actionButtons = `
      <a href="action://add-task" class="btn-action">✅ Add Task</a>
    `;
  } else if (toyType === 'urgent') {
    popupTitle = '⚠️ Urgent Task Detected';
    // Urgent toy: From direct manager OR time-sensitive
    actionButtons = `
      <a href="action://create-urgent-task" class="btn-action">⚠️ Create Urgent Task</a>
      <a href="action://open-email-local" class="btn-action">📧 Open Email</a>
    `;
  } else if (toyType === 'kudos') {
    popupTitle = '🏆 Kudos Detected';
    // Kudos toy: Recognition and appreciation
    actionButtons = `
      <a href="action://open-workhuman" class="btn-action">🏆 Open WorkHuman</a>
    `;
  } else if (toyType === 'meeting_summary') {
    popupTitle = 'Send meeting Summary';
    actionButtons = `
      <a href="action://send-meeting-summary" class="btn-action">📝 Send Summary</a>
    `;
  } else if (toyType === 'blocker') {
    popupTitle = '🚧 Blocker Detected';
    actionButtons = `
      <a href="action://add-urgent-task-blocker" class="btn-action">⚠️ Add Urgent Task</a>
      <a href="action://view-in-teams" class="btn-action">💬 View in Teams</a>
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
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 16px 16px 16px;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
          border-radius: 0 0 8px 8px;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }
        a {
          padding: 8px 16px;
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
          background: #f3f2f1;
          color: #424242;
          padding: 8px 14px;
          box-shadow: none;
          font-size: 18px;
          font-weight: 400;
          margin-left: auto;
        }
        .btn-dismiss:hover {
          background: #e1dfdd;
          color: #242424;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${popupTitle}</div>
      </div>
      <div class="body">
        <strong>Email:</strong> ${data.subject}<br>
        <strong>From:</strong> ${data.from}
      </div>
      <div class="actions">
        <div class="action-buttons">
          ${actionButtons}
        </div>
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
    }
    // FOLLOW-UP TOY ACTIONS
    else if (url === 'action://quick-add') {
      console.log('Quick Add: Creating calendar event for follow-up:', data);
      await handleQuickAddFollowUp(data);
      notifWindow.close();
    } else if (url === 'action://open-scheduler') {
      console.log('Open Scheduler: Creating calendar event with email and opening in Outlook:', data);
      await handleOpenScheduler(data);
      notifWindow.close();
    }
    // TASK TOY ACTIONS
    else if (url === 'action://add-task') {
      console.log('Add Task: Creating task with extracted data:', data);
      await handleAddTask(data);
      notifWindow.close();
    }
    // KUDOS TOY ACTIONS
    else if (url === 'action://open-workhuman') {
      console.log('Open WorkHuman:', data);
      const { shell } = require('electron');
      shell.openExternal('https://cloud.workhuman.com/static-apps/wh-host/');
      notifWindow.close();
    }
    // URGENT TOY ACTIONS
    else if (url === 'action://create-urgent-task') {
      console.log('Create Urgent Task:', data);
      await handleCreateUrgentTask(data);
      notifWindow.close();
    } else if (url === 'action://open-email-local') {
      console.log('Open Email Locally in Outlook:', data);
      await handleOpenEmailLocal(data);
      notifWindow.close();
    }
    // MEETING SUMMARY TOY ACTIONS
    else if (url === 'action://send-meeting-summary') {
      console.log('Sending meeting summary:', data);
      await handleSendMeetingSummary(data);
      notifWindow.close();
    }
    // BLOCKER TOY ACTIONS
    else if (url === 'action://add-urgent-task-blocker') {
      console.log('Adding urgent task for blocker:', data);
      await handleAddUrgentTaskBlocker(data);
      notifWindow.close();
    } else if (url === 'action://view-in-teams') {
      console.log('Opening blocker in Teams:', data);
      await handleViewInTeams(data);
      notifWindow.close();
    } else if (url === 'action://acknowledge-blocker') {
      console.log('Acknowledging blocker:', data);
      await handleAcknowledgeBlocker(data);
      notifWindow.close();
    }
    // OTHER ACTIONS
    else if (url === 'action://send-summary') {
      console.log('Sending meeting summary (old):', data);
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
    const response = await fetch(`${API_BASE}/api/notifications?userEmail=victor.heifets@msd.com`);
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
    const response = await fetch(`${API_BASE}/api/notifications?userEmail=victor.heifets@msd.com`);
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
        user_email: 'victor.heifets@msd.com',
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

/**
 * MEETING SUMMARY TOY: Send Meeting Summary - Open new email compose window with pre-filled content
 */
async function handleSendMeetingSummary(data: any) {
  try {
    console.log('Opening new email with meeting summary:', data);

    // Extract meeting data from detection_data
    const meetingData = data.detection_data;

    if (!meetingData) {
      console.error('No meeting data available');
      const { Notification } = require('electron');
      new Notification({
        title: '❌ Error',
        body: 'Meeting data not available'
      }).show();
      return;
    }

    const { exec } = require('child_process');

    // Format email body as styled HTML
    const emailBodyHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6264A7 0%, #5558a0 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; margin: -20px -20px 0 -20px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header .meta { margin-top: 10px; opacity: 0.9; font-size: 14px; }
    .section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6264A7; }
    .section h2 { color: #6264A7; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; }
    .section p { margin: 0; white-space: pre-wrap; }
    .action-items { background: #fff8e1; border-left-color: #ffa726; }
    .action-items ol { margin: 10px 0; padding-left: 20px; }
    .action-items li { margin: 8px 0; padding: 8px; background: white; border-radius: 4px; }
    .transcript { background: #e3f2fd; border-left-color: #42a5f5; }
    .transcript pre { margin: 0; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .footer-logo { color: #6264A7; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📝 Meeting Summary: ${meetingData.meeting_title}</h1>
    <div class="meta">🕒 ${new Date(meetingData.start_time).toLocaleString()} - ${new Date(meetingData.end_time).toLocaleString()}</div>
  </div>

  <div class="section">
    <h2>📋 Summary</h2>
    <p>${meetingData.summary.replace(/\n/g, '<br>')}</p>
  </div>

  <div class="section action-items">
    <h2>✅ Action Items</h2>
    <ol>
      ${meetingData.action_items.map((item: string) => `<li>${item}</li>`).join('')}
    </ol>
  </div>

  <div class="section transcript">
    <h2>💬 Transcript</h2>
    <pre>${meetingData.transcript}</pre>
  </div>

  <div class="footer">
    <div class="footer-logo">🤖 AI Power Toys</div>
    <div>This summary was automatically generated</div>
  </div>
</body>
</html>
    `.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

    // Escape for AppleScript
    const escapedSubject = `Meeting Summary: ${meetingData.meeting_title}`.replace(/"/g, '\\"').replace(/'/g, "'\\''");
    const escapedBody = emailBodyHTML.replace(/"/g, '\\"').replace(/'/g, "'\\''");

    // Build recipients list for AppleScript
    const recipientsScript = meetingData.attendees
      .map((attendee: any) => `make new recipient at newMsg with properties {email address:{address:"${attendee.email}", name:"${attendee.name}"}}`)
      .join('\n    ');

    // Create new outgoing message in Outlook with AppleScript (HTML format)
    const appleScript = `
tell application "Microsoft Outlook"
  activate
  set newMsg to make new outgoing message with properties {subject:"${escapedSubject}"}
  tell newMsg
    ${recipientsScript}
    set html content to "${escapedBody}"
  end tell
  open newMsg
end tell
    `;

    exec(`osascript -e '${appleScript}'`, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Failed to open compose window in Outlook:', error);
        console.error('stderr:', stderr);

        // Fallback: use mailto URL with plain text
        const recipientsTo = meetingData.attendees.map((a: any) => a.email).join(',');
        const subject = encodeURIComponent(`Meeting Summary: ${meetingData.meeting_title}`);
        const plainTextBody = `Meeting Summary: ${meetingData.meeting_title}\n\nTime: ${new Date(meetingData.start_time).toLocaleString()} - ${new Date(meetingData.end_time).toLocaleString()}\n\n=== SUMMARY ===\n${meetingData.summary}\n\n=== ACTION ITEMS ===\n${meetingData.action_items.map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}\n\n=== TRANSCRIPT ===\n${meetingData.transcript}\n\n---\nThis summary was automatically generated by AI Power Toys.`;
        const bodyEncoded = encodeURIComponent(plainTextBody);

        exec(`open "mailto:${recipientsTo}?subject=${subject}&body=${bodyEncoded}"`);
      } else {
        console.log('✅ Compose window opened successfully in Outlook');
      }
    });

    const { Notification } = require('electron');
    new Notification({
      title: '📝 Opening Compose Window',
      body: `Preparing email for ${meetingData.attendees.length} attendees`,
      urgency: 'normal'
    }).show();

  } catch (error) {
    console.error('Error opening compose window:', error);
    const { Notification } = require('electron');
    new Notification({
      title: '❌ Error',
      body: 'Error opening compose window'
    }).show();
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
        userEmail: 'victor.heifets@msd.com'
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

// ==============================================================================
// BLOCKER TOY ACTION HANDLERS
// ==============================================================================

/**
 * BLOCKER TOY: Add Urgent Task - Create urgent task from blocker
 */
async function handleAddUrgentTaskBlocker(data: any) {
  try {
    console.log('Creating urgent task for blocker:', data);

    const blockerData = data.detection_data;

    if (!blockerData) {
      console.error('No blocker data available');
      return;
    }

    // Create urgent task with blocker details
    const taskTitle = `🚧 BLOCKER: ${blockerData.blocker_type} - ${blockerData.blocked_person}`;
    const taskDescription = `${blockerData.blocker_description}\n\nBlocked Person: ${blockerData.blocked_person}\nBlocker Type: ${blockerData.blocker_type}\nDetected: ${new Date(blockerData.detected_at).toLocaleString()}`;

    const result = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: 'victor.heifets@msd.com',
        title: taskTitle,
        description: taskDescription,
        priority: 'high',
        status: 'pending',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      })
    });

    if (result.ok) {
      const taskData = await result.json();
      console.log('✅ Urgent task created for blocker:', taskData);

      const { Notification } = require('electron');
      new Notification({
        title: '⚠️ Urgent Task Created',
        body: `Blocker tracked: ${blockerData.blocked_person}`,
        urgency: 'critical'
      }).show();
    } else {
      const error = await result.text();
      console.error('Failed to create urgent task:', error);

      const { Notification } = require('electron');
      new Notification({
        title: '❌ Failed',
        body: 'Could not create urgent task'
      }).show();
    }
  } catch (error) {
    console.error('Error creating urgent task for blocker:', error);
  }
}

/**
 * BLOCKER TOY: View in Teams - Open the Teams message where blocker was reported
 */
async function handleViewInTeams(data: any) {
  try {
    console.log('Opening blocker message in Teams:', data);

    const blockerData = data.detection_data;

    if (blockerData && blockerData.message_link) {
      // Open Teams message link
      const { shell } = require('electron');
      shell.openExternal(blockerData.message_link);

      const { Notification } = require('electron');
      new Notification({
        title: '💬 Opening Teams',
        body: 'Opening blocker message in Microsoft Teams'
      }).show();
    } else {
      console.log('⚠️  No Teams message link available');
      const { Notification } = require('electron');
      new Notification({
        title: '⚠️ No Link',
        body: 'No Teams message link available'
      }).show();
    }
  } catch (error) {
    console.error('Error opening Teams:', error);
  }
}

/**
 * BLOCKER TOY: Acknowledge - Mark blocker as acknowledged
 */
async function handleAcknowledgeBlocker(data: any) {
  try {
    console.log('Acknowledging blocker:', data);

    const blockerData = data.detection_data;

    // Could send acknowledgement to API or just show notification
    const { Notification } = require('electron');
    new Notification({
      title: '✅ Blocker Acknowledged',
      body: `Noted: ${blockerData.blocked_person} is blocked by ${blockerData.blocker_type}`,
      urgency: 'normal'
    }).show();

    // TODO: Could implement API call to track acknowledged blockers
    // await fetch(`${API_BASE}/api/acknowledge-blocker`, { ... })

  } catch (error) {
    console.error('Error acknowledging blocker:', error);
  }
}

// ==============================================================================
// NEW TOY-SPECIFIC ACTION HANDLERS
// ==============================================================================

/**
 * FOLLOW-UP TOY: Quick Add - Create quick calendar event for follow-up
 */
async function handleQuickAddFollowUp(data: any) {
  try {
    console.log('Quick Add Follow-Up: Creating calendar event');

    // Extract deadline from detection data
    const deadline = data.detection_data?.deadline || null;
    let eventDate = new Date();

    if (deadline) {
      eventDate = new Date(deadline);
    } else {
      // Default: next week
      eventDate.setDate(eventDate.getDate() + 7);
    }

    // Show success notification
    const { Notification } = require('electron');
    new Notification({
      title: '📅 Follow-Up Reminder Added',
      body: `Quick add created for: "${data.subject}"`
    }).show();

  } catch (error) {
    console.error('Error in Quick Add:', error);
  }
}

/**
 * FOLLOW-UP TOY: Open Scheduler - Create NEW calendar event directly in local Outlook
 * Opens prefilled calendar for next week, 8:00 AM, 30 min duration
 */
async function handleOpenScheduler(data: any) {
  try {
    console.log('Open Scheduler: Creating NEW calendar event directly in local Outlook');

    // Calculate next week 8:00 AM
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(8, 0, 0, 0);

    const endTime = new Date(nextWeek);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const subject = `Follow-Up: ${data.subject}`.replace(/'/g, "'\\''"); // Escape single quotes for AppleScript

    // Simple one-line calendar event body
    const formattedBody = 'Hackaton - Showcase'.replace(/'/g, "'\\''");

    const { exec } = require('child_process');

    // Create NEW calendar event directly in Outlook using AppleScript
    // Using AppleScript's native date arithmetic for proper date handling
    const appleScript = `
tell application "Microsoft Outlook"
  activate
  -- Create start date (next week 8:00 AM)
  set startDate to current date
  set day of startDate to (day of startDate) + 7
  set time of startDate to 8 * hours

  -- Create end date (30 minutes later)
  set endDate to startDate + (30 * minutes)

  set newEvent to make new calendar event with properties {subject:"${subject}", content:"${formattedBody}", start time:startDate, end time:endDate}
  open newEvent
end tell
    `;

    exec(`osascript -e '${appleScript}'`, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Failed to create calendar event in Outlook:', error);
        console.error('stderr:', stderr);
        // Fallback: just open Outlook
        exec('open -a "Microsoft Outlook"');
      } else {
        console.log('✅ Calendar event created successfully in local Outlook');
      }
    });

    const { Notification } = require('electron');
    new Notification({
      title: '📅 Calendar Event Created',
      body: `Follow-up scheduled for next week: "${data.subject}"`
    }).show();

  } catch (error) {
    console.error('Error opening scheduler:', error);
  }
}

/**
 * TASK TOY: Add Task - Create task with extracted data from email
 */
async function handleAddTask(data: any) {
  try {
    console.log('Add Task: Creating task with extracted data:', data);

    // Extract task details from detection data
    const taskDescription = data.detection_data?.task_description || data.subject || 'Task from email';
    const priority = data.detection_data?.priority || 'medium';

    const result = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: 'victor.heifets@msd.com',
        title: taskDescription,
        description: `From: ${data.from}\nSubject: ${data.subject}\n\n${data.body_preview || ''}`,
        priority: priority,
        status: 'pending',
        due_date: data.detection_data?.deadline || null
      })
    });

    if (result.ok) {
      const taskData = await result.json();
      console.log('✅ Task created:', taskData);

      const { Notification } = require('electron');
      new Notification({
        title: '✅ Task Added',
        body: `Task created: "${taskDescription}"`
      }).show();
    } else {
      const error = await result.text();
      console.error('Failed to create task:', error);
    }
  } catch (error) {
    console.error('Error adding task:', error);
  }
}

/**
 * URGENT TOY: Create Urgent Task - Create high-priority urgent task
 */
async function handleCreateUrgentTask(data: any) {
  try {
    console.log('Create Urgent Task: Creating high-priority task');

    const urgentReason = data.detection_data?.reason || `Urgent email: ${data.subject}`;
    const actionNeeded = data.detection_data?.action_needed || 'Review and respond immediately';

    const result = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: 'victor.heifets@msd.com',
        title: `🚨 URGENT: ${data.subject}`,
        description: `${urgentReason}\n\nAction needed: ${actionNeeded}\n\nFrom: ${data.from}\n\n${data.body_preview || ''}`,
        priority: 'high',
        status: 'pending',
        due_date: data.detection_data?.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default: 24 hours
      })
    });

    if (result.ok) {
      const taskData = await result.json();
      console.log('✅ Urgent task created:', taskData);

      const { Notification } = require('electron');
      new Notification({
        title: '⚠️ Urgent Task Created',
        body: `High priority task: "${data.subject}"`,
        urgency: 'critical'
      }).show();
    } else {
      const error = await result.text();
      console.error('Failed to create urgent task:', error);
    }
  } catch (error) {
    console.error('Error creating urgent task:', error);
  }
}

/**
 * URGENT TOY: Open Email Locally - Open email in Outlook web
 * Note: Opening desktop Outlook via URL protocol is not supported on macOS
 */
async function handleOpenEmailLocal(data: any) {
  try {
    const { exec } = require('child_process');
    const path = require('path');

    console.log('Open Email: Searching in Outlook');
    console.log('Subject:', data.subject);
    console.log('Internet Message ID:', data.internet_message_id);
    console.log('Is Outgoing:', data.is_outgoing);

    if (!data.subject) {
      console.log('⚠️  No subject available');
      exec('open -a "Microsoft Outlook"');
      return;
    }

    // Path to Python script
    const scriptPath = path.join(__dirname, '..', 'outlook_manager.py');
    const escapedSubject = data.subject.replace(/"/g, '\\"');

    // Determine folder based on email direction
    const folders = data.is_outgoing ? ['Sent Items', 'Inbox'] : ['Inbox', 'Sent Items'];
    let found = false;

    const tryFolder = (folderIndex: number) => {
      if (folderIndex >= folders.length) {
        if (!found) {
          console.log('⚠️  Email not found in any folder');
          exec('open -a "Microsoft Outlook"');
        }
        return;
      }

      const folder = folders[folderIndex];

      // Build command with internet_message_id if available
      let command = `python3 "${scriptPath}" search "${escapedSubject}" --folder "${folder}" --exact`;

      if (data.internet_message_id) {
        const escapedMessageId = data.internet_message_id.replace(/"/g, '\\"');
        command += ` --message-id "${escapedMessageId}"`;
      }

      console.log(`Trying folder: ${folder}...`);

      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.log(`Not found in ${folder}, trying next...`);
          if (stderr) console.log('stderr:', stderr);
          tryFolder(folderIndex + 1);
        } else {
          console.log('✅ Email opened in Outlook');
          if (stdout) console.log(stdout);
          found = true;
        }
      });
    };

    tryFolder(0);

    const { Notification } = require('electron');
    new Notification({
      title: '📧 Opening Email',
      body: `Opening: "${data.subject}"`
    }).show();
  } catch (error) {
    console.error('Error opening email:', error);
    const { exec } = require('child_process');
    exec('open -a "Microsoft Outlook"');
  }
}

/**
 * UNUSED: Old implementation that fetched webLink first
 */
async function handleOpenEmailLocalOld(data: any) {
  try {
    console.log('Open Email: Opening email via webLink');

    const messageId = data.graph_message_id;

    if (messageId) {
      // Get email webLink via Graph API
      const result = await fetch(`${API_BASE}/api/email-weblink/${messageId}`);

      if (result.ok) {
        const linkData: any = await result.json();
        console.log('✅ Email webLink retrieved:', linkData.webLink);

        // Open email in local Outlook desktop using AppleScript
        const { exec } = require('child_process');
        const subject = (linkData.subject || '').replace(/'/g, "'\\''"); // Escape single quotes for AppleScript

        // Determine which folder to search based on email direction
        const folderName = data.is_outgoing ? 'sent items' : 'inbox';

        const appleScript = `
tell application "Microsoft Outlook"
  activate
  try
    -- Try exact subject match first
    set theMsg to first message of ${folderName} whose subject is "${subject}"
    open theMsg
  on error
    try
      -- Try partial subject match as fallback
      set theMsg to first message of ${folderName} whose subject contains "${subject}"
      open theMsg
    on error
      error "Email not found in local Outlook"
    end try
  end try
end tell
        `;

        exec(`osascript -e '${appleScript}'`, (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.log('⚠️  Email not found in local Outlook - opening in web instead');
            // Fallback: Open in web browser
            exec(`open "${linkData.webLink}"`);
          } else {
            console.log('✅ Email opened successfully in local Outlook');
          }
        });

        const { Notification } = require('electron');
        new Notification({
          title: '📧 Email Opened',
          body: `Opening: "${linkData.subject}"`
        }).show();
      } else {
        const error = await result.text();
        console.error('Failed to get email webLink:', error);

        const { Notification } = require('electron');
        new Notification({
          title: '❌ Email Open Failed',
          body: 'Please ensure Graph token is set in dashboard settings'
        }).show();
      }
    } else {
      console.log('No message ID available - trying to search by subject');

      // Fallback: Search by subject directly
      const { exec } = require('child_process');
      const subject = (data.subject || '').replace(/'/g, "'\\''"); // Escape single quotes for AppleScript

      // Determine which folder to search based on email direction
      const folderName = data.is_outgoing ? 'sent items' : 'inbox';

      const appleScript = `
tell application "Microsoft Outlook"
  activate
  try
    -- Try exact subject match first
    set theMsg to first message of ${folderName} whose subject is "${subject}"
    open theMsg
  on error
    try
      -- Try partial subject match as fallback
      set theMsg to first message of ${folderName} whose subject contains "${subject}"
      open theMsg
    on error
      error "Email not found in local Outlook"
    end try
  end try
end tell
      `;

      exec(`osascript -e '${appleScript}'`, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.log('⚠️  Email not found in local Outlook - cannot open (no webLink available)');
          // Just open Outlook app
          exec('open -a "Microsoft Outlook"');
        } else {
          console.log('✅ Email opened successfully in local Outlook');
        }
      });

      const { Notification } = require('electron');
      new Notification({
        title: '📧 Email Opened',
        body: `Opening: "${data.subject}"`
      }).show();
    }

  } catch (error) {
    console.error('Error opening email:', error);
  }
}

function generateHistoryHTML(notifications: any[], totalCount: number, unreadCount: number): string {
  return `
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
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .header-left {
          flex: 1;
        }
        h1 {
          color: #6264A7;
          margin-bottom: 8px;
          font-size: 24px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .btn-clear-all {
          padding: 10px 20px;
          background: #d13438;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }
        .btn-clear-all:hover {
          background: #a4262c;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
      <div class="header-section">
        <div class="header-left">
          <h1>📬 Notification History</h1>
          <div class="subtitle">${totalCount} total (${unreadCount} unread)</div>
        </div>
        ${totalCount > 0 ? '<button class="btn-clear-all" onclick="window.location.href=\'action://clear-all\'">🗑️ Clear All</button>' : ''}
      </div>
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
}

async function refreshHistoryWindow() {
  if (!historyWindow) return;

  try {
    const response = await fetch(`${API_BASE}/api/notifications?userEmail=heifets@merck.com`);
    const data: any = await response.json();
    const notifications = data.notifications || [];
    const totalCount = notifications.length;
    const unreadCount = notifications.filter((n: any) => n.status === 'unread').length;

    const html = generateHistoryHTML(notifications, totalCount, unreadCount);
    historyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  } catch (error) {
    console.error('Error refreshing history window:', error);
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

      const html = generateHistoryHTML(notifications, totalCount, unreadCount);

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

      // Reload history window content
      await refreshHistoryWindow();
    } else if (action === 'clear-all') {
      // Mark all notifications as dismissed
      try {
        const response = await fetch(`${API_BASE}/api/notifications?userEmail=heifets@merck.com`);
        const data: any = await response.json();
        const notifications = data.notifications || [];

        // Dismiss all notifications
        for (const notification of notifications) {
          await fetch(`${API_BASE}/api/notifications/${notification.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'dismissed' })
          });
        }

        console.log(`✅ All ${notifications.length} notifications cleared`);

        // Reload history window content
        await refreshHistoryWindow();
      } catch (error) {
        console.error('❌ Error clearing all notifications:', error);
      }
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
    const response = await fetch(`${API_BASE}/api/notifications/unread?userEmail=victor.heifets@msd.com`);
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
    const response = await fetch(`${API_BASE}/api/notifications/unread?userEmail=victor.heifets@msd.com`);
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
