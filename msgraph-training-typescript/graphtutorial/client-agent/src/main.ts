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
      <a href="action://create-calendar" class="btn-action">📅 Calendar</a>
      <a href="action://set-reminder" class="btn-action">⏰ Reminder</a>
    `;
  } else if (toyType === 'task') {
    actionButtons = `
      <a href="action://create-task" class="btn-action">✅ Task</a>
      <a href="action://add-to-list" class="btn-action">📝 To-Do</a>
    `;
  } else if (toyType === 'urgent') {
    actionButtons = `
      <a href="action://reply-now" class="btn-action">✉️ Reply</a>
      <a href="action://flag-important" class="btn-action">🚩 Flag</a>
    `;
  } else if (toyType === 'kudos') {
    actionButtons = `
      <a href="action://send-thanks" class="btn-action">🙏 Thanks</a>
      <a href="action://share-team" class="btn-action">👥 Share</a>
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
        <a href="action://dismiss" class="btn-dismiss">✕</a>
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
