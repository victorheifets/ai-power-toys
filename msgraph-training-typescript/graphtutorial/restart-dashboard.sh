#!/bin/bash

# Restart Dashboard (port 5273)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Restarting Dashboard..."

# Kill process on port 5273
if lsof -Pi :5273 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :5273 -sTCP:LISTEN -t)
    echo "   Stopping existing dashboard (PID: $PID)..."
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
rm -f "$PROJECT_ROOT/.dashboard.pid"

# Start dashboard
cd "$PROJECT_ROOT/dashboard"
echo "   Starting dashboard..."
npm run dev > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "$DASHBOARD_PID" > ../.dashboard.pid

sleep 3

if ps -p $DASHBOARD_PID > /dev/null 2>&1; then
    echo "✅ Dashboard restarted successfully (PID: $DASHBOARD_PID)"
    echo "   URL: http://localhost:5273"
    echo "   Logs: $PROJECT_ROOT/logs/dashboard.log"
else
    echo "❌ Failed to start Dashboard"
    echo "   Check logs: $PROJECT_ROOT/logs/dashboard.log"
    exit 1
fi
