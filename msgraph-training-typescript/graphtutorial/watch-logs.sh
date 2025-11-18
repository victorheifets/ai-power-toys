#!/bin/bash

# AI Power Toys - Live Log Monitor
# Watch all component logs in real-time

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default to webhook server if no argument
COMPONENT=${1:-webhook}

case $COMPONENT in
    webhook|server|backend)
        echo -e "${CYAN}📡 Watching Webhook Server logs...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""
        if [ -f "$PROJECT_ROOT/logs/webhook-server.log" ]; then
            tail -f "$PROJECT_ROOT/logs/webhook-server.log"
        else
            echo "⚠️  Log file not found. Server may not be running yet."
            echo "Waiting for log file to be created..."
            while [ ! -f "$PROJECT_ROOT/logs/webhook-server.log" ]; do
                sleep 1
            done
            tail -f "$PROJECT_ROOT/logs/webhook-server.log"
        fi
        ;;

    dashboard|frontend|ui)
        echo -e "${CYAN}🖥️  Watching Dashboard logs...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""
        if [ -f "$PROJECT_ROOT/logs/dashboard.log" ]; then
            tail -f "$PROJECT_ROOT/logs/dashboard.log"
        else
            echo "⚠️  Log file not found. Dashboard may not be running yet."
            echo "Waiting for log file to be created..."
            while [ ! -f "$PROJECT_ROOT/logs/dashboard.log" ]; do
                sleep 1
            done
            tail -f "$PROJECT_ROOT/logs/dashboard.log"
        fi
        ;;

    client|agent|electron)
        echo -e "${CYAN}💻 Watching Client Agent logs...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""
        if [ -f "$PROJECT_ROOT/logs/client-agent.log" ]; then
            tail -f "$PROJECT_ROOT/logs/client-agent.log"
        else
            echo "⚠️  Log file not found. Client Agent may not be running yet."
            echo "Waiting for log file to be created..."
            while [ ! -f "$PROJECT_ROOT/logs/client-agent.log" ]; do
                sleep 1
            done
            tail -f "$PROJECT_ROOT/logs/client-agent.log"
        fi
        ;;

    all)
        echo -e "${CYAN}📋 Watching ALL logs (combined)...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""

        # Use tail with multiple files
        tail -f "$PROJECT_ROOT/logs"/*.log 2>/dev/null || {
            echo "⚠️  No log files found yet. Waiting..."
            sleep 5
            tail -f "$PROJECT_ROOT/logs"/*.log 2>/dev/null
        }
        ;;

    *)
        echo "AI Power Toys - Log Watcher"
        echo ""
        echo "Usage: ./watch-logs.sh [component]"
        echo ""
        echo "Components:"
        echo "  webhook    - Webhook server logs (default)"
        echo "  dashboard  - Dashboard logs"
        echo "  client     - Client agent logs"
        echo "  all        - All logs combined"
        echo ""
        echo "Examples:"
        echo "  ./watch-logs.sh"
        echo "  ./watch-logs.sh dashboard"
        echo "  ./watch-logs.sh all"
        ;;
esac
