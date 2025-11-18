# PCP Bot - Quick Reference Card

## 🔗 Your Bot Info

**Public URL:** `https://rays-drawing-pairs-debian.trycloudflare.com`

**Bot ID:** `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`

**Teams App Package:** `teams-app/pcp-bot.zip`

---

## 📋 3-Step Setup (Do this NOW!)

### 1️⃣ Azure Portal (2 min)
```
1. Go to: https://portal.azure.com
2. Search: 9db623c8-aad8-4f4a-ac12-8401bc1dc2ec
3. Configuration → Messaging endpoint:
   https://rays-drawing-pairs-debian.trycloudflare.com/api/messages
4. Apply → Channels → Microsoft Teams → Save
```

### 2️⃣ Install in Teams (2 min)
```
1. Teams → Apps → Manage your apps
2. Upload an app → Upload custom app
3. Select: teams-app/pcp-bot.zip
4. Click Add
```

### 3️⃣ Test (1 min)
```
Type in Teams chat:
help
/set-email heifets@merck.com
/test-ado
standup
```

---

## 💬 Bot Commands

| Command | Description |
|---------|-------------|
| `help` | Show all commands |
| `standup` | Daily standup check-in |
| `eod` | End of day check-in |
| `/create-us` | Create AI-enhanced user story |
| `/set-email [email]` | Set your ADO email |
| `/test-ado` | Test ADO connection |

---

## 🔧 Manage Bot

### View Logs
```bash
tail -f bot.log          # Bot logs
tail -f cloudflare.log   # Tunnel logs
```

### Restart Everything
```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot

# Stop
kill $(cat bot.pid)
pkill cloudflared

# Start bot
npm run dev > bot.log 2>&1 &
echo $! > bot.pid

# Start tunnel
cloudflared tunnel --url http://localhost:3978 > cloudflare.log 2>&1 &

# Wait 5 seconds, then get new URL
sleep 5
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" cloudflare.log | head -1

# UPDATE AZURE PORTAL WITH NEW URL!
```

### Check Status
```bash
# Check if bot is running
curl http://localhost:3978/health

# Check public URL
curl https://rays-drawing-pairs-debian.trycloudflare.com/health
```

---

## ⚠️ Important

- **Tunnel URL changes** when you restart cloudflared
- When URL changes: Update Azure Portal messaging endpoint
- Bot must be running for Teams to work
- Check logs if bot doesn't respond

---

## 🆘 Troubleshooting

### Bot doesn't respond in Teams

1. Check bot is running:
   ```bash
   curl http://localhost:3978/health
   ```

2. Check tunnel is running:
   ```bash
   curl https://rays-drawing-pairs-debian.trycloudflare.com/health
   ```

3. Check Azure Portal messaging endpoint is correct

4. View logs:
   ```bash
   tail -20 bot.log
   tail -20 cloudflare.log
   ```

### ADO integration fails

- Verify PAT token hasn't expired
- Check organization/project names are correct
- Try: `/test-ado` in Teams

---

## 📁 Key Files

- `bot.log` - Bot runtime logs
- `cloudflare.log` - Tunnel logs
- `teams-app/pcp-bot.zip` - Teams app package
- `.env` - Configuration (has secrets!)
- `DEPLOYMENT_COMPLETE.md` - Full documentation

---

**Bot is running! Now go do the 3-step setup above.** ⬆️
