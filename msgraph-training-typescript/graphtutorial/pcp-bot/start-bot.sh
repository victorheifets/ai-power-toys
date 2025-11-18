#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BOT_PORT=3978
BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}🔍 Checking for existing bot process on port ${BOT_PORT}...${NC}"

# Find and kill process on port 3978
PID=$(lsof -ti:$BOT_PORT)

if [ ! -z "$PID" ]; then
    echo -e "${YELLOW}⚠️  Found existing process (PID: $PID) on port ${BOT_PORT}${NC}"
    echo -e "${YELLOW}🛑 Killing process...${NC}"
    kill -9 $PID
    sleep 2
    echo -e "${GREEN}✅ Process killed${NC}"
else
    echo -e "${GREEN}✅ No existing process found${NC}"
fi

# Navigate to bot directory
cd "$BOT_DIR"

echo -e "${YELLOW}🔨 Building bot...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo -e "${YELLOW}🚀 Starting bot...${NC}"

# Start bot in background and save PID
nohup npm start > bot.log 2>&1 &
BOT_PID=$!
echo $BOT_PID > bot.pid

sleep 3

# Check if bot is actually running
if kill -0 $BOT_PID 2>/dev/null; then
    echo -e "${GREEN}✅ PCP Bot started successfully (PID: $BOT_PID)${NC}"
    echo -e "${GREEN}🤖 Bot is running on port ${BOT_PORT}${NC}"
    echo -e "${GREEN}📡 Connect Bot Framework Emulator to: http://localhost:${BOT_PORT}/api/messages${NC}"
    echo -e "${GREEN}📋 Logs: tail -f $BOT_DIR/bot.log${NC}"
else
    echo -e "${RED}❌ Bot failed to start. Check bot.log for details${NC}"
    cat bot.log
    exit 1
fi
