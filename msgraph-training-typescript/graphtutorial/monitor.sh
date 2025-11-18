#!/bin/bash

# AI Power Toys - System Monitor
# Real-time monitoring of all components

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Power Toys - System Monitor                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Function to check if port is listening
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        PID=$(lsof -Pi :$port -sTCP:LISTEN -t)
        echo -e "${GREEN}✅ Running${NC} (PID: $PID)"
        return 0
    else
        echo -e "${RED}❌ Not Running${NC}"
        return 1
    fi
}

# Function to check database
check_database() {
    if psql -d ai_power_toys -c "SELECT 1" >/dev/null 2>&1 ; then
        echo -e "${GREEN}✅ Connected${NC}"

        # Get stats
        EMAIL_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM emails;" 2>/dev/null | xargs)
        DETECTION_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM power_toy_detections;" 2>/dev/null | xargs)
        PENDING_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM power_toy_detections WHERE status='pending';" 2>/dev/null | xargs)

        echo "   📧 Emails: $EMAIL_COUNT"
        echo "   🔍 Detections: $DETECTION_COUNT"
        echo "   ⏳ Pending: $PENDING_COUNT"
        return 0
    else
        echo -e "${RED}❌ Not Connected${NC}"
        return 1
    fi
}

# Function to check process by name
check_process() {
    local pattern=$1
    if pgrep -f "$pattern" > /dev/null; then
        PID=$(pgrep -f "$pattern")
        echo -e "${GREEN}✅ Running${NC} (PID: $PID)"
        return 0
    else
        echo -e "${RED}❌ Not Running${NC}"
        return 1
    fi
}

# Component Status
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Component Status:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -n "🔧 Webhook Server (port 3200): "
WEBHOOK_STATUS=$?
check_port 3200

echo -n "🌐 Dashboard (port 5273): "
DASHBOARD_STATUS=$?
check_port 5273

echo -n "💻 Client Agent (Electron): "
CLIENT_STATUS=$?
check_process "electron.*client-agent"

echo ""

# Database Status
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Database Status:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -n "💾 PostgreSQL (ai_power_toys): "
check_database

echo ""

# URLs
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Access URLs:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "📡 Webhook Server:  http://localhost:3200"
echo "🖥️  Dashboard:       http://localhost:5273"
echo "📊 Health Check:    http://localhost:3200/health"
echo "📈 Stats API:       http://localhost:3200/api/stats/heifets@merck.com"
echo ""

# Recent Logs
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Recent Activity (last 5 lines from each log):${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$PROJECT_ROOT/logs/webhook-server.log" ]; then
    echo -e "${YELLOW}📝 Webhook Server:${NC}"
    tail -n 3 "$PROJECT_ROOT/logs/webhook-server.log" 2>/dev/null | head -c 200
    echo ""
    echo ""
fi

if [ -f "$PROJECT_ROOT/logs/dashboard.log" ]; then
    echo -e "${YELLOW}📝 Dashboard:${NC}"
    tail -n 3 "$PROJECT_ROOT/logs/dashboard.log" 2>/dev/null | head -c 200
    echo ""
    echo ""
fi

# Commands
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Commands:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "🔍 Watch logs:          tail -f logs/webhook-server.log"
echo "🔄 Restart component:   ./restart-webhook.sh"
echo "🛑 Stop all:            ./stop-all.sh"
echo "🚀 Start all:           ./start-all.sh"
echo "📊 This monitor:        ./monitor.sh"
echo "🔧 Debug mode:          ./debug.sh"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
