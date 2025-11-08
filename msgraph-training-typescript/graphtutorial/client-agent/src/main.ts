import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, net } from 'electron';
import * as path from 'path';
import * as http from 'http';

const API_BASE = 'http://localhost:3200';
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let sseRequest: http.ClientRequest | null = null;

// Keep app running in background
app.on('window-all-closed', () => {
  // Keep app running
});

app.whenReady().then(() => {
  createTray();
  console.log('🚀 AI Power Toys Started - monitoring emails...');
  connectToServer();
});

function createTray() {
  // Create a simple colored icon for the tray
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGASURBVFhH7ZbRDcIwDETZhBFYhRFYhU3YhE0YgVUYgRFYhRFYBdKqSs7l7CSlqZD4pFOUxM/PdkJFCCGEEEII8W8YYwbO2MnOZJRlWdbOdPT9/uGsnQ3OZJRlWdbOdIQAO2chBNhZCAF2FkKAnYUQYGchBNhZCAF2FkKAnYUQYGchBNhZCAF2FkKAnYUQYGchBNhZCAF2FkKAnYUQYGchBNhZCDgBc8557s5E1HVdO9PRtm072zkLoazrurZTQ0/AGbt3hBAC7CyEADsLIcDOQgiwsxAC7CyEADsLIcDOQgiwsxAC7CyEADsLIcDOQgiwsxAC7CyEADsLIcDOQgiwsxAC7CyEADsL/+0A3vF73XlqeEqd1U/NvJnxlDqrn5p5M+MpdVY/NfNmxlPqrH5q5s2Mp9RZ/dTMmxlPqbP6qZk3M55SZ/VTM29mPKXO6qdm3sx4Sp3VT828mfGUOqufmnkz4yl1Vj818+bNc5bz+u24+j8IIYQQQoi7UfQDaVVvwkq61NIAAAAASUVORK5CYII='
  );

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'AI Power Toys',
      type: 'normal',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Notifications',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('AI Power Toys');
  tray.setContextMenu(contextMenu);
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

  // Only create custom popup window (disable native notification)
  createNotificationWindow(data);
}

function createNotificationWindow(data: any) {
  const notifWindow = new BrowserWindow({
    width: 450,
    height: 240,
    frame: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#1e40af',
    title: 'AI Power Toys Detection',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Position in bottom-right corner
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  notifWindow.setPosition(width - 470, height - 260);

  // Determine toy type and suggested actions
  const toyType = data.toy_type || 'unknown';
  let actionButtons = '';

  if (toyType === 'follow_up') {
    actionButtons = `
      <a href="action://create-calendar" class="btn-action">📅 Create Calendar Event</a>
      <a href="action://set-reminder" class="btn-action">⏰ Set Reminder</a>
    `;
  } else if (toyType === 'task') {
    actionButtons = `
      <a href="action://create-task" class="btn-action">✅ Create Task</a>
      <a href="action://add-to-list" class="btn-action">📝 Add to To-Do</a>
    `;
  } else if (toyType === 'urgent') {
    actionButtons = `
      <a href="action://reply-now" class="btn-action">✉️ Reply Now</a>
      <a href="action://flag-important" class="btn-action">🚩 Flag Important</a>
    `;
  } else if (toyType === 'kudos') {
    actionButtons = `
      <a href="action://send-thanks" class="btn-action">🙏 Send Thanks</a>
      <a href="action://share-team" class="btn-action">👥 Share with Team</a>
    `;
  } else {
    actionButtons = `
      <a href="action://open-dashboard" class="btn-action">Open Dashboard</a>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #1e40af;
          color: white;
        }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .body { font-size: 14px; line-height: 1.4; margin-bottom: 15px; }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 15px;
        }
        a {
          display: block;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          text-align: left;
        }
        .btn-action {
          background: white;
          color: #1e40af;
        }
        .btn-action:hover {
          background: #f0f0f0;
        }
        .btn-dismiss {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          text-align: center;
        }
        .btn-dismiss:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="title">📬 New Power Toy Detection</div>
      <div class="body">
        <strong>Email:</strong> ${data.subject}<br>
        <strong>From:</strong> ${data.from}
      </div>
      <div class="actions">
        ${actionButtons}
        <a href="action://dismiss" class="btn-dismiss">Dismiss</a>
      </div>
    </body>
    </html>
  `;

  notifWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Handle button clicks
  notifWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    console.log('Button clicked, URL:', url);

    if (url === 'action://dismiss') {
      notifWindow.close();
    } else if (url === 'action://open-dashboard') {
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://create-calendar') {
      // TODO: Integrate with calendar API
      console.log('Creating calendar event for:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://set-reminder') {
      console.log('Setting reminder for:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://create-task') {
      console.log('Creating task for:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://add-to-list') {
      console.log('Adding to to-do list:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://reply-now') {
      console.log('Opening reply for:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://flag-important') {
      console.log('Flagging as important:', data);
      notifWindow.close();
    } else if (url === 'action://send-thanks') {
      console.log('Sending thanks for:', data);
      showMainWindow();
      notifWindow.close();
    } else if (url === 'action://share-team') {
      console.log('Sharing with team:', data);
      showMainWindow();
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

app.on('before-quit', () => {
  sseRequest?.destroy();
});
