# AI Power Toys Client Agent

System tray application that receives real-time email detection notifications from the Power Toys webhook server.

## Features

- 🔔 **Desktop Notifications**: Instant alerts when Power Toys are detected
- 🎯 **System Tray**: Runs silently in the background
- 📬 **Real-time Updates**: SSE connection to webhook server
- 🖥️ **Cross-platform**: Works on Mac, Windows, Linux

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm start

# Package for distribution
npm run package
```

## How It Works

1. Agent connects to webhook server via SSE (`http://localhost:3200/api/events`)
2. Receives `new_email` events when Power Toys are detected
3. Shows desktop notification with email details
4. Clicking notification opens the dashboard

## Requirements

- Node.js 18+
- Webhook server running on port 3200
- Dashboard running on port 5274

## System Tray Menu

- **Show Notifications**: Opens the dashboard
- **Quit**: Exits the application

## Architecture

```
Webhook Server (port 3200)
    ↓ SSE Events
Client Agent (Electron)
    ↓ Desktop Notifications
User
```

The agent is a lightweight Electron app (~80MB) that runs in the background and connects to your webhook server.
