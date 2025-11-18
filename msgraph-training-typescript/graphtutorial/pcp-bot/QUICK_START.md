# PCP Bot - Quick Start Guide

## How to Start the Bot

### 1. Start Bot Server
```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot
npm run dev
```

### 2. Start Cloudflare Tunnel (in new terminal)
```bash
cloudflared tunnel --url http://localhost:3978
```

### 3. If Tunnel URL Changed
- Note the new URL from Cloudflare (e.g., `https://XXXXX.trycloudflare.com`)
- Go to Azure Portal → pcp-bot → Configuration
- Update Messaging endpoint: `https://XXXXX.trycloudflare.com/api/messages`
- Click Apply

## Configuration

**App ID:** `10f0dd45-d789-4c48-a0f0-54ea60ad2ddb`
**Tenant:** Hackathon (7c40eae0-faa8-4ed6-b57f-2fcb1cec8375)
**Teams:** VictorHeifets@Hackathon144.onmicrosoft.com

## Bot Commands

- `help` - Show available commands
- `standup` - Daily standup check-in
- `eod` - End-of-day check-in
- `/create-us` - Create user story with AI
- `/test-ado` - Test ADO connection
- `/set-email <email>` - Set user email

## Troubleshooting

**Bot not responding?**
```bash
# Check if bot is running
lsof -i:3978

# Check if tunnel is running
ps aux | grep cloudflared

# Restart bot
pkill -9 -f "node.*index.js"
npm run dev
```

**See full documentation:** `DEPLOYMENT_GUIDE.md`
