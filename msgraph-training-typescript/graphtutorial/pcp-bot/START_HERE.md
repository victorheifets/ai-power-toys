# 🚀 PCP Bot - Start Here!

## Current Status

✅ **Bot is built and ready to deploy!**

Since you don't have Azure resource creation permissions, we'll use **local deployment with ngrok** for now.

---

## Quick Start (30 minutes)

### Step 1: Create Bot Registration in Azure Portal (10 min)

1. Go to https://portal.azure.com
2. Search for **"Azure Bot"** → Click **Create**
3. Fill in:
   - Bot handle: `pcp-bot-merck-yourname` (must be unique)
   - Subscription: `MMCA_DIP_AzureVDI_11`
   - Resource group: Select existing or create if allowed
   - Pricing: **F0 (Free)**
   - App Type: **Multi Tenant**
4. Click **Create** and wait ~2 minutes

5. Once created → Click **Go to resource**
6. Click **Configuration** → Copy the **Microsoft App ID**
7. Click **Manage** (next to App ID) → Opens App Registration
8. Click **Certificates & secrets** → **New client secret**
   - Description: `pcp-bot-secret`
   - Expires: 24 months
   - Click **Add**
   - **⚠️ COPY THE SECRET VALUE IMMEDIATELY** (you can't see it again!)

### Step 2: Update .env File (2 min)

Edit `.env` in this directory:

```bash
MicrosoftAppId=YOUR_APP_ID_FROM_STEP_1
MicrosoftAppPassword=YOUR_SECRET_VALUE_FROM_STEP_1
MicrosoftAppTenantId=a00de4ec-48a8-43a6-be74-e31274e2060d
PORT=3978

ADO_ORGANIZATION=AHITL
ADO_PROJECT=IDP - DEVOPS
ADO_PAT=YOUR_ADO_PAT

AZURE_OPENAI_ENDPOINT=https://api.openai.com/v1/
AZURE_OPENAI_API_KEY=YOUR_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-3.5-turbo
```

### Step 3: Start the Bot (1 min)

```bash
npm run dev
```

Bot starts on http://localhost:3978
Leave this terminal running!

### Step 4: Start ngrok (1 min)

Open a **NEW terminal window**:

```bash
ngrok http 3978
```

You'll see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3978
```

**Copy the https URL!**

### Step 5: Update Bot Endpoint (2 min)

1. Go to Azure Portal → Your Bot → **Configuration**
2. Set **Messaging endpoint**: `https://YOUR_NGROK_URL/api/messages`
3. Click **Apply**

### Step 6: Enable Teams Channel (1 min)

1. In Bot resource → **Channels**
2. Click **Microsoft Teams** icon
3. Accept terms → **Save**

### Step 7: Create Teams App Package (5 min)

```bash
cd teams-app

# Download placeholder icons (or create your own)
# color.png - 192x192px
# outline.png - 32x32px

# Update manifest with your App ID
sed -i '' 's/YOUR_BOT_APP_ID_HERE/YOUR_ACTUAL_APP_ID/g' manifest.json

# Create package
zip -r pcp-bot.zip manifest.json color.png outline.png
```

**For placeholder icons**, you can:
- Use https://www.canva.com to create simple 192x192 and 32x32 icons
- Or download from https://aka.ms/teams-design-toolkit

### Step 8: Install in Teams (3 min)

1. Open **Microsoft Teams**
2. Click **Apps** (sidebar) → **Manage your apps**
3. Click **Upload an app** → **Upload a custom app**
4. Select `pcp-bot.zip`
5. Click **Add**

### Step 9: Test! (5 min)

In Teams, chat with your bot:

```
help
```

Should show all commands!

Try:
```
/set-email heifets@merck.com
/test-ado
standup
/create-us
```

---

## Files Created for You

| File | Purpose |
|------|---------|
| `START_HERE.md` | This file - quick start guide |
| `MANUAL_AZURE_SETUP.md` | Detailed Azure Portal setup |
| `DEPLOYMENT.md` | Full deployment guide |
| `GRAPH_INTEGRATION.md` | Auto email detection setup |
| `QUICK_START.md` | Multiple deployment options |
| `teams-app/manifest.json` | Teams app configuration |
| `teams-app/README.md` | Icon creation guide |
| `.azure/deploy.sh` | Automated deployment script (when you get permissions) |

---

## Troubleshooting

### Bot doesn't respond

1. Check bot terminal - any errors?
2. Check ngrok terminal - is it forwarding?
3. Verify messaging endpoint in Azure Portal is correct
4. Try restarting both bot and ngrok

### ADO connection fails

- Check ADO_PAT has Work Items: Read & Write
- Verify ADO_ORGANIZATION and ADO_PROJECT are correct
- Test PAT: https://dev.azure.com/AHITL/_apis/projects

### Can't upload to Teams

- Check all 3 files are in ZIP: manifest.json, color.png, outline.png
- Verify App ID in manifest matches Azure Portal
- Ensure icons are correct size (192x192 and 32x32)

---

## Next Steps

### Immediate (Testing)

- [x] Local deployment with ngrok ✅
- [ ] Test with your team
- [ ] Gather feedback

### Short-term (Production)

- [ ] Request Azure deployment permissions
- [ ] Deploy to Azure App Service
- [ ] Set up static domain (no ngrok)
- [ ] Add Application Insights monitoring

### Long-term (Enhancements)

- [ ] Add Microsoft Graph integration (auto email)
- [ ] Add scheduled standup reminders
- [ ] Add team lead blocker notifications
- [ ] Migrate SQLite → Azure SQL
- [ ] Create dashboard for analytics

---

## Architecture

### Current Setup
```
Teams → Azure Bot Service → ngrok → Your Mac (localhost:3978)
```

### Future Production Setup
```
Teams → Azure Bot Service → Azure App Service (Static URL)
```

---

## Cost

| Component | Cost |
|-----------|------|
| Azure Bot (F0) | **FREE** |
| ngrok (Free tier) | **FREE** |
| ADO (5 users) | **FREE** |
| OpenAI API | ~$10-50/month (usage-based) |
| **Total** | **~$10-50/month** |

---

## Support & Resources

- **Quick issues**: Check bot/ngrok terminal logs
- **Bot Framework**: https://docs.microsoft.com/azure/bot-service
- **Teams Platform**: https://docs.microsoft.com/microsoftteams/platform
- **Your deployment files**: All in this directory

---

## Request Azure Permissions

To move to production, email your Azure admin:

> Hi [Azure Admin],
>
> I need permissions to deploy a Microsoft Teams bot for team collaboration (PCP Bot).
>
> **Required permissions:**
> - Role: Contributor
> - Scope: Subscription or new Resource Group
> - Resources needed: Azure App Service (B1 tier, ~$13/month)
>
> **Purpose**: Daily standup bot with ADO and AI integration for [Your Team]
>
> **Current status**: Working prototype using local deployment
>
> Thanks!

---

## 🎉 You're Ready!

Follow the 9 steps above and you'll have a working Teams bot in 30 minutes!

**Start with Step 1** → Create Bot Registration in Azure Portal

Good luck! 🚀
