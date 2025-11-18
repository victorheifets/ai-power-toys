#!/bin/bash

# AI Power Toys - Debug Mode
# Comprehensive debugging and root cause analysis

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Power Toys - Debug & Root Cause Analysis               ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ==============================================================================
# 1. PROCESS & PORT STATUS
# ==============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}[1] PROCESS & PORT STATUS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}Webhook Server (port 3200):${NC}"
if lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :3200 -sTCP:LISTEN -t)
    echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
    echo "  PID: $PID"
    echo "  Command: $(ps -p $PID -o comm= 2>/dev/null)"
    echo "  Started: $(ps -p $PID -o lstart= 2>/dev/null)"
else
    echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
    echo "  ⚠️  Issue: No process listening on port 3200"
    echo "  💡 Fix: Run ./restart-webhook.sh"
fi
echo ""

echo -e "${BLUE}Dashboard (port 5273):${NC}"
if lsof -Pi :5273 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :5273 -sTCP:LISTEN -t)
    echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
    echo "  PID: $PID"
    echo "  Command: $(ps -p $PID -o comm= 2>/dev/null)"
else
    echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
    echo "  ⚠️  Issue: No process listening on port 5273"
    echo "  💡 Fix: Run ./restart-dashboard.sh"
fi
echo ""

echo -e "${BLUE}Client Agent (Electron):${NC}"
if pgrep -f "electron.*client-agent" > /dev/null; then
    PID=$(pgrep -f "electron.*client-agent")
    echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
    echo "  PID: $PID"
else
    echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
    echo "  ⚠️  Issue: Electron process not found"
    echo "  💡 Fix: Run ./restart-client-agent.sh"
fi
echo ""

# ==============================================================================
# 2. DATABASE STATUS
# ==============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}[2] DATABASE STATUS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if psql -d ai_power_toys -c "SELECT version();" >/dev/null 2>&1 ; then
    echo -e "PostgreSQL Status: ${GREEN}✅ CONNECTED${NC}"
    echo "Database: ai_power_toys"

    # Get PostgreSQL version
    VERSION=$(psql -d ai_power_toys -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
    echo "Version: $VERSION"
    echo ""

    # Check tables
    echo -e "${BLUE}Tables:${NC}"
    psql -d ai_power_toys -c "\dt" 2>&1 | grep -E "public|List"
    echo ""

    # Get data counts
    echo -e "${BLUE}Data Counts:${NC}"
    EMAIL_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM emails;" 2>/dev/null | xargs)
    DETECTION_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM power_toy_detections;" 2>/dev/null | xargs)
    PENDING_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM power_toy_detections WHERE status='pending';" 2>/dev/null | xargs)
    CUSTOM_TOYS=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM custom_toys;" 2>/dev/null | xargs)

    echo "  📧 Emails: $EMAIL_COUNT"
    echo "  🔍 Detections: $DETECTION_COUNT"
    echo "  ⏳ Pending: $PENDING_COUNT"
    echo "  🔧 Custom Toys: $CUSTOM_TOYS"
else
    echo -e "PostgreSQL Status: ${RED}❌ NOT CONNECTED${NC}"
    echo ""
    echo "⚠️  Issue: Cannot connect to database 'ai_power_toys'"
    echo ""
    echo "Checking if database exists..."
    if psql -d postgres -l 2>/dev/null | grep -q ai_power_toys; then
        echo -e "  ${GREEN}✅ Database exists${NC}"
        echo "  💡 Check connection settings in database/db.ts"
    else
        echo -e "  ${RED}❌ Database does not exist${NC}"
        echo "  💡 Fix: Run the following commands:"
        echo "     psql -d postgres -c 'CREATE DATABASE ai_power_toys;'"
        echo "     psql -d ai_power_toys -f database/schema.sql"
    fi
fi
echo ""

# ==============================================================================
# 3. API ENDPOINTS TEST
# ==============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}[3] API ENDPOINTS TEST${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${BLUE}Testing API endpoints...${NC}"
    echo ""

    # Test health endpoint
    echo -n "  GET /health: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/health 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ $HTTP_CODE OK${NC}"
    else
        echo -e "${RED}❌ $HTTP_CODE ERROR${NC}"
    fi

    # Test stats endpoint
    echo -n "  GET /api/stats/heifets@merck.com: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/api/stats/heifets@merck.com 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ $HTTP_CODE OK${NC}"
        # Show actual data
        RESPONSE=$(curl -s http://localhost:3200/api/stats/heifets@merck.com 2>/dev/null)
        echo "    Response: ${RESPONSE:0:150}..."
    else
        echo -e "${RED}❌ $HTTP_CODE ERROR${NC}"
        RESPONSE=$(curl -s http://localhost:3200/api/stats/heifets@merck.com 2>/dev/null)
        echo "    Error: ${RESPONSE:0:150}"
    fi
    echo ""
else
    echo -e "${RED}⚠️  Cannot test endpoints - webhook server not running${NC}"
    echo ""
fi

# ==============================================================================
# 4. LOG ANALYSIS
# ==============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}[4] LOG ANALYSIS (Errors & Warnings)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$PROJECT_ROOT/logs/webhook-server.log" ]; then
    echo -e "${BLUE}Webhook Server Errors (last 10):${NC}"
    grep -i "error\|failed\|fatal" "$PROJECT_ROOT/logs/webhook-server.log" 2>/dev/null | tail -10 | head -c 500
    echo ""
else
    echo -e "${YELLOW}⚠️  No webhook server log found${NC}"
fi
echo ""

if [ -f "$PROJECT_ROOT/logs/dashboard.log" ]; then
    echo -e "${BLUE}Dashboard Errors (last 10):${NC}"
    grep -i "error\|failed" "$PROJECT_ROOT/logs/dashboard.log" 2>/dev/null | tail -10 | head -c 500
    echo ""
else
    echo -e "${YELLOW}⚠️  No dashboard log found${NC}"
fi
echo ""

# ==============================================================================
# 5. RECOMMENDATIONS
# ==============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}[5] RECOMMENDATIONS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if all components are running
ALL_OK=true

if ! lsof -Pi :3200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}❌ Webhook server not running${NC}"
    echo "   Fix: ./restart-webhook.sh"
    ALL_OK=false
fi

if ! lsof -Pi :5273 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}❌ Dashboard not running${NC}"
    echo "   Fix: ./restart-dashboard.sh"
    ALL_OK=false
fi

if ! pgrep -f "electron.*client-agent" > /dev/null; then
    echo -e "${RED}❌ Client agent not running${NC}"
    echo "   Fix: ./restart-client-agent.sh"
    ALL_OK=false
fi

if ! psql -d ai_power_toys -c "SELECT 1" >/dev/null 2>&1 ; then
    echo -e "${RED}❌ Database not accessible${NC}"
    echo "   Fix: Ensure PostgreSQL is running and database exists"
    ALL_OK=false
fi

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open dashboard: http://localhost:5273"
    echo "  2. Check system tray for client agent icon"
    echo "  3. Send test email to trigger detection"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "💡 For real-time monitoring: ./monitor.sh"
echo "📝 Watch logs: tail -f logs/webhook-server.log"
echo ""
