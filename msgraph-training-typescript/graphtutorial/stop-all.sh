#!/bin/bash

# AI Power Toys - Stop All Components

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Power Toys - Stopping All Components                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to kill process by PID file
kill_by_pidfile() {
    local pidfile="$1"
    local name="$2"

    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped $name (PID: $PID)${NC}" || echo -e "${RED}❌ Failed to stop $name${NC}"
        else
            echo -e "${YELLOW}⚠️  $name not running (stale PID)${NC}"
        fi
        rm "$pidfile"
    else
        echo -e "${YELLOW}⚠️  No PID file for $name${NC}"
    fi
}

# Function to kill process by port
kill_by_port() {
    local port="$1"
    local name="$2"

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        PID=$(lsof -Pi :$port -sTCP:LISTEN -t)
        kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped $name on port $port (PID: $PID)${NC}" || echo -e "${RED}❌ Failed to stop $name${NC}"
    fi
}

# Stop by PID files first
kill_by_pidfile "$PROJECT_ROOT/.webhook.pid" "Webhook Server"
kill_by_pidfile "$PROJECT_ROOT/.dashboard.pid" "Dashboard"
kill_by_pidfile "$PROJECT_ROOT/.client-agent.pid" "Client Agent"

# Fallback: kill by port if still running
echo ""
echo "Checking ports..."
kill_by_port 3200 "Webhook Server"
kill_by_port 5273 "Dashboard"

# Kill any remaining electron processes for client-agent
if pgrep -f "electron.*client-agent" > /dev/null; then
    pkill -f "electron.*client-agent" && echo -e "${GREEN}✅ Stopped remaining Electron processes${NC}"
fi

echo ""
echo -e "${GREEN}All components stopped${NC}"
echo ""
