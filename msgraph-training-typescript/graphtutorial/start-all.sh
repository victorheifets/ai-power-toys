#!/bin/bash

# AI Power Toys - Start All Components
# This script starts the webhook server, dashboard, and client agent

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Power Toys - Starting All Components                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 0. Check and start PostgreSQL database
echo -e "${BLUE}[0/4] Checking PostgreSQL Database...${NC}"

# Check if PostgreSQL is running
if ! pg_isready >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  PostgreSQL not running. Attempting to start...${NC}"

    # Try to start PostgreSQL (works on macOS with Homebrew)
    if command -v brew >/dev/null 2>&1 ; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 3
    fi

    if ! pg_isready >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Could not start PostgreSQL automatically${NC}"
        echo "   Please start PostgreSQL manually:"
        echo "   - macOS: brew services start postgresql"
        echo "   - Linux: sudo systemctl start postgresql"
        echo ""
    else
        echo -e "${GREEN}✅ PostgreSQL started${NC}"
    fi
else
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
fi

# Check if database exists, create if needed
if ! psql -d ai_power_toys -c "SELECT 1" >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Database 'ai_power_toys' does not exist. Creating...${NC}"

    psql -d postgres -c "CREATE DATABASE ai_power_toys;" 2>/dev/null

    if [ -f "$PROJECT_ROOT/database/schema.sql" ]; then
        echo "   Loading database schema..."
        psql -d ai_power_toys -f "$PROJECT_ROOT/database/schema.sql" >/dev/null 2>&1
        echo -e "${GREEN}✅ Database created and schema loaded${NC}"
    else
        echo -e "${GREEN}✅ Database created${NC}"
        echo -e "${YELLOW}⚠️  Schema file not found. Run manually: psql -d ai_power_toys -f database/schema.sql${NC}"
    fi
else
    echo -e "${GREEN}✅ Database 'ai_power_toys' exists${NC}"
fi
echo ""

# Check if components are already running
if lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3200 already in use (Webhook Server may be running)${NC}"
    echo "   Run ./restart-webhook.sh to restart it"
    echo ""
fi

if lsof -Pi :5273 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 5273 already in use (Dashboard may be running)${NC}"
    echo "   Run ./restart-dashboard.sh to restart it"
    echo ""
fi

# 1. Start Webhook Server
echo -e "${BLUE}[1/4] Starting Webhook Server (port 3200)...${NC}"
cd "$PROJECT_ROOT"
if ! lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    npx ts-node webhook_server_db.ts > logs/webhook-server.log 2>&1 &
    WEBHOOK_PID=$!
    echo "$WEBHOOK_PID" > .webhook.pid
    echo -e "${GREEN}✅ Webhook Server started (PID: $WEBHOOK_PID)${NC}"
    echo "   Logs: $PROJECT_ROOT/logs/webhook-server.log"
else
    echo -e "${YELLOW}   Already running${NC}"
fi
echo ""

# Wait for webhook server to initialize
sleep 2

# 2. Start Dashboard
echo -e "${BLUE}[2/4] Starting Dashboard (port 5273)...${NC}"
cd "$PROJECT_ROOT/dashboard"
if ! lsof -Pi :5273 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    npm run dev > ../logs/dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    echo "$DASHBOARD_PID" > ../.dashboard.pid
    echo -e "${GREEN}✅ Dashboard started (PID: $DASHBOARD_PID)${NC}"
    echo "   Logs: $PROJECT_ROOT/logs/dashboard.log"
    echo "   URL: http://localhost:5273"
else
    echo -e "${YELLOW}   Already running${NC}"
fi
echo ""

# Wait for dashboard to initialize
sleep 3

# 3. Start Client Agent (Electron)
echo -e "${BLUE}[3/4] Starting Electron Client Agent...${NC}"
cd "$PROJECT_ROOT/client-agent"
npm run dev > ../logs/client-agent.log 2>&1 &
CLIENT_PID=$!
echo "$CLIENT_PID" > ../.client-agent.pid
echo -e "${GREEN}✅ Client Agent started (PID: $CLIENT_PID)${NC}"
echo "   Logs: $PROJECT_ROOT/logs/client-agent.log"
echo ""

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                          All Components Started                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Running services:"
echo "   • Webhook Server:  http://localhost:3200"
echo "   • Dashboard:       http://localhost:5273"
echo "   • Client Agent:    Running in system tray"
echo ""
echo "📝 Logs are in: $PROJECT_ROOT/logs/"
echo ""
echo "🛑 To stop all services, run: ./stop-all.sh"
echo ""
