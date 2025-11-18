#!/bin/bash

# Restart Webhook Server (port 3200)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Restarting Webhook Server..."

# Kill process on port 3200
if lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :3200 -sTCP:LISTEN -t)
    echo "   Stopping existing server (PID: $PID)..."
    kill $PID 2>/dev/null
    sleep 2

    # Force kill if still running
    if ps -p $PID > /dev/null 2>&1; then
        echo "   Force killing..."
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
fi

# Clean up PID file
rm -f "$PROJECT_ROOT/.webhook.pid"

# Start webhook server
cd "$PROJECT_ROOT"
echo "   Starting webhook server..."
npx ts-node webhook_server_db.ts > logs/webhook-server.log 2>&1 &
WEBHOOK_PID=$!
echo "$WEBHOOK_PID" > .webhook.pid

sleep 2

if ps -p $WEBHOOK_PID > /dev/null 2>&1; then
    echo "✅ Webhook Server restarted successfully (PID: $WEBHOOK_PID)"
    echo "   URL: http://localhost:3200"
    echo "   Logs: $PROJECT_ROOT/logs/webhook-server.log"
else
    echo "❌ Failed to start Webhook Server"
    echo "   Check logs: $PROJECT_ROOT/logs/webhook-server.log"
    exit 1
fi
