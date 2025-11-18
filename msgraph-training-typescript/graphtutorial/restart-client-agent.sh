#!/bin/bash

# Restart Electron Client Agent

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Restarting Electron Client Agent..."

# Kill any existing electron processes for client-agent
if pgrep -f "electron.*client-agent" > /dev/null; then
    echo "   Stopping existing client agent..."
    pkill -f "electron.*client-agent"
    sleep 2

    # Force kill if still running
    if pgrep -f "electron.*client-agent" > /dev/null; then
        echo "   Force killing..."
        pkill -9 -f "electron.*client-agent"
        sleep 1
    fi
fi

# Clean up PID file
rm -f "$PROJECT_ROOT/.client-agent.pid"

# Start client agent
cd "$PROJECT_ROOT/client-agent"
echo "   Starting client agent..."
npm run dev > ../logs/client-agent.log 2>&1 &
CLIENT_PID=$!
echo "$CLIENT_PID" > ../.client-agent.pid

sleep 3

if ps -p $CLIENT_PID > /dev/null 2>&1; then
    echo "✅ Client Agent restarted successfully (PID: $CLIENT_PID)"
    echo "   Check system tray for the app icon"
    echo "   Logs: $PROJECT_ROOT/logs/client-agent.log"
else
    echo "❌ Failed to start Client Agent"
    echo "   Check logs: $PROJECT_ROOT/logs/client-agent.log"
    exit 1
fi
