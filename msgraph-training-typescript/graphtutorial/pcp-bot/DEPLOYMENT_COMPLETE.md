# 🎉 PCP Bot Deployment - READY TO USE!

## ✅ Status: DEPLOYED & RUNNING

Your PCP Bot is now running and ready to be added to Teams!

---

## 🔗 Your Bot URLs

**Public URL (Cloudflare Tunnel):**
```
https://rays-drawing-pairs-debian.trycloudflare.com
```

**Messaging Endpoint (for Azure Portal):**
```
https://rays-drawing-pairs-debian.trycloudflare.com/api/messages
```

**Bot Credentials:**
- **Application ID:** `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
- **Tenant ID:** `871a6e27-1087-4575-98e0-56e5738bc38e`
- **Secret:** (already configured in .env)

---

## 📋 Next Steps (5 minutes)

### Step 1: Update Azure Bot Endpoint (2 min)

1. Go to https://portal.azure.com
2. Search for your bot: `pcp-bot` or App ID: `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
3. Click **Configuration** (left menu)
4. Set **Messaging endpoint** to:
   ```
   https://rays-drawing-pairs-debian.trycloudflare.com/api/messages
   ```
5. Click **Apply**

### Step 2: Enable Teams Channel (1 min)

1. In your Bot resource → Click **Channels**
2. Click the **Microsoft Teams** icon
3. Accept terms → Click **Save**

### Step 3: Install in Teams (2 min)

1. The Teams app package is already created: `teams-app/pcp-bot.zip`
2. Open **Microsoft Teams**
3. Click **Apps** → **Manage your apps**
4. Click **Upload an app** → **Upload a custom app**
5. Select: `/Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot/teams-app/pcp-bot.zip`
6. Click **Add**

---

## 🧪 Test Your Bot

Once installed in Teams, start a chat with PCP Bot and try:

```
help
```

Should show all available commands!

Then try:
```
/set-email heifets@merck.com
/test-ado
standup
/create-us
eod
```

---

## 🚀 What's Running

| Service | Status | Details |
|---------|--------|---------|
| **PCP Bot** | ✅ Running | Port 3978 (PID in bot.pid) |
| **Cloudflare Tunnel** | ✅ Running | Public URL active (PID in tunnel.pid) |
| **ADO Integration** | ✅ Configured | Organization: AHITL, Project: IDP - DEVOPS |
| **LLM Integration** | ✅ Configured | OpenAI GPT-3.5-turbo |
| **Database** | ✅ Initialized | SQLite at dist/database/pcp_bot.db |

---

## 📊 Bot Features

### ✅ Daily Standup
- Type `standup` to start
- Auto-fetches your ADO work items
- Track yesterday's work, today's plan, and blockers
- Updates ADO with comments

### ✅ End of Day Check-in
- Type `eod` to start
- Reviews today's plan from morning standup
- Records completed work and reflection
- Plans for tomorrow

### ✅ AI User Story Creation
- Type `/create-us` to start
- AI enhances stories with Given/When/Then format
- Generates acceptance criteria
- Estimates story points
- Can create directly in ADO

### ✅ ADO Integration
- Fetches assigned work items
- Updates work item states and comments
- Tracks blockers with tags
- Caches items for offline access

---

## 🔧 Managing Your Bot

### View Bot Logs
```bash
tail -f bot.log
```

### View Tunnel Logs
```bash
tail -f cloudflare.log
```

### Restart Bot
```bash
# Stop
kill $(cat bot.pid)

# Start
npm run dev > bot.log 2>&1 &
echo $! > bot.pid
```

### Restart Tunnel
```bash
# Stop
pkill cloudflared

# Start
cloudflared tunnel --url http://localhost:3978 > cloudflare.log 2>&1 &
```

### Stop Everything
```bash
kill $(cat bot.pid)
pkill cloudflared
```

---

## 🌐 Cloudflare Tunnel

Your bot is exposed via Cloudflare Tunnel:
- **URL:** `https://rays-drawing-pairs-debian.trycloudflare.com`
- **Free tier** - No authentication required
- **No uptime guarantee** - For production, use a named tunnel

**Note:** This URL will change if you restart the tunnel. If that happens:
1. Update the Messaging endpoint in Azure Portal
2. No need to recreate the Teams app

---

## 📁 Files & Directories

| File/Directory | Purpose |
|----------------|---------|
| `bot.log` | Bot runtime logs |
| `cloudflare.log` | Tunnel logs |
| `bot.pid` | Bot process ID |
| `teams-app/pcp-bot.zip` | **Teams app package (upload this!)** |
| `.env` | Configuration (contains secrets) |
| `dist/database/pcp_bot.db` | SQLite database |

---

## ⚠️ Important Notes

### Cloudflare URL Changes
The Cloudflare tunnel URL changes each time you restart it. When it changes:
1. Update the Messaging endpoint in Azure Portal
2. Wait 1-2 minutes for the change to propagate

### Bot Restarts
If the bot crashes or you restart your computer:
```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot

# Start bot
npm run dev > bot.log 2>&1 &
echo $! > bot.pid

# Start tunnel
cloudflared tunnel --url http://localhost:3978 > cloudflare.log 2>&1 &

# Get new URL
sleep 5 && grep -o "https://[a-z0-9-]*\.trycloudflare\.com" cloudflare.log | head -1

# Update Azure Portal with new URL!
```

### Security
- `.env` contains secrets - never commit to git
- Cloudflare tunnel is public - anyone with URL can access
- For production, use proper authentication and Azure App Service

---

## 🎯 Quick Access

**Azure Portal (Bot Configuration):**
```
https://portal.azure.com
Search for App ID: 9db623c8-aad8-4f4a-ac12-8401bc1dc2ec
```

**Teams App Package:**
```
/Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot/teams-app/pcp-bot.zip
```

**Health Check:**
```
curl https://rays-drawing-pairs-debian.trycloudflare.com/health
```

---

## 💰 Current Cost

| Component | Cost |
|-----------|------|
| Azure Bot (using existing) | **FREE** |
| Cloudflare Tunnel | **FREE** |
| Local hosting | **FREE** |
| ADO (5 users) | **FREE** |
| OpenAI API | ~$10-50/month (usage-based) |
| **Total** | **~$10-50/month** |

---

## 🚀 Production Deployment (Optional)

For a production deployment:
1. Request Azure App Service permissions
2. Deploy bot to Azure App Service
3. Use named Cloudflare tunnel (or remove tunnel entirely)
4. Migrate to Azure SQL from SQLite
5. Add Application Insights monitoring

See `DEPLOYMENT.md` for details.

---

## 🎊 You're Ready!

**Your bot is deployed and running!**

**Next:** Follow the 3 steps above to configure Azure and install in Teams.

**Testing:** Once installed, chat with the bot and type `help`

**Support:** Check `bot.log` and `cloudflare.log` for any issues

---

Enjoy your PCP Bot! 🤖
