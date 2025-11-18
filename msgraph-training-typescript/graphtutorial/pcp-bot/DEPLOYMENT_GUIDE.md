# PCP Bot - Teams Deployment Guide

## Overview
This document describes the complete deployment process for the PCP Bot to Microsoft Teams, including all issues encountered and their solutions.

## Deployment Summary

**Date Completed:** November 16, 2025
**Status:** ✅ Successfully Deployed and Working
**Tenant:** Hackathon (Hackathon144.onmicrosoft.com)
**Tenant ID:** 7c40eae0-faa8-4ed6-b57f-2fcb1cec8375

## Final Configuration

### App Registration Details
- **App Name:** PCP Bot
- **Application (Client) ID:** `10f0dd45-d789-4c48-a0f0-54ea60ad2ddb`
- **Client Secret:** `[REDACTED - See Azure Portal]`
- **Tenant ID:** `7c40eae0-faa8-4ed6-b57f-2fcb1cec8375`
- **Sign-in Audience:** Multi-tenant (AzureADMultipleOrgs)

### Azure Bot Resource
- **Name:** pcp-bot
- **Resource Group:** pcp-bot-rg
- **Location:** East US
- **Pricing Tier:** F0 (Free)
- **Messaging Endpoint:** `https://butterfly-greetings-tool-meditation.trycloudflare.com/api/messages`
- **Channels Configured:** Microsoft Teams (Status: Healthy)

### Local Configuration
- **Bot Port:** 3978
- **Cloudflare Tunnel URL:** `https://butterfly-greetings-tool-meditation.trycloudflare.com`
- **Database:** SQLite (local)
- **ADO Integration:** Enabled (AHITL/IDP - DEVOPS)
- **LLM Integration:** Enabled (OpenAI GPT-3.5-turbo)

## Deployment Steps Performed

### 1. Created Azure AD App Registration
```bash
az ad app create --display-name "PCP Bot" --sign-in-audience AzureADMultipleOrgs
```

**Result:**
- App ID: 10f0dd45-d789-4c48-a0f0-54ea60ad2ddb
- Created client secret with 2-year expiration
- Configured as multi-tenant application

### 2. Updated Bot Configuration Files

#### .env File
```env
MicrosoftAppId=10f0dd45-d789-4c48-a0f0-54ea60ad2ddb
MicrosoftAppPassword=[YOUR_CLIENT_SECRET_HERE]
MicrosoftAppTenantId=7c40eae0-faa8-4ed6-b57f-2fcb1cec8375
PORT=3978
```

#### teams-app/manifest.json
Updated three locations with new App ID:
- Line 5: `"id": "10f0dd45-d789-4c48-a0f0-54ea60ad2ddb"`
- Line 28: `"botId": "10f0dd45-d789-4c48-a0f0-54ea60ad2ddb"`
- Line 79: `"id": "10f0dd45-d789-4c48-a0f0-54ea60ad2ddb"` (webApplicationInfo)

### 3. Created Teams App Package
```bash
cd teams-app
zip pcp-bot.zip manifest.json color.png outline.png
```

**Package Contents:**
- manifest.json (bot configuration)
- color.png (192x192 app icon)
- outline.png (32x32 outline icon)

### 4. Uploaded to Teams Admin Center
1. Logged into Teams Admin Center (https://admin.teams.microsoft.com)
2. Navigated to: Teams apps → Manage apps → Upload
3. Uploaded pcp-bot.zip
4. Set availability: Everyone
5. Status: Published, Allowed

### 5. Created Azure Bot Resource
```bash
az group create --name pcp-bot-rg --location eastus
```

Then via Azure Portal:
- Created Azure Bot (pcp-bot)
- Configured messaging endpoint
- Enabled Microsoft Teams channel
- Verified channel status: Healthy

### 6. Granted Admin Consent for Bot Framework Permissions
```bash
az ad app permission add --id 10f0dd45-d789-4c48-a0f0-54ea60ad2ddb \
  --api 00000002-0000-0000-c000-000000000000 \
  --api-permissions 3afa6a7d-9b1a-42eb-948e-1650a849e176=Role

az ad app permission admin-consent --id 10f0dd45-d789-4c48-a0f0-54ea60ad2ddb
```

### 7. Fixed Critical Bot Code Issue

**Problem:** Bot was only using credentials in production mode (NODE_ENV=production)

**File:** `src/index.ts` (Lines 18-22)

**Original Code:**
```typescript
const adapter = new BotFrameworkAdapter({
    appId: process.env.NODE_ENV === 'production' ? process.env.MicrosoftAppId : undefined,
    appPassword: process.env.NODE_ENV === 'production' ? process.env.MicrosoftAppPassword : undefined
});
```

**Fixed Code:**
```typescript
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    channelAuthTenant: process.env.MicrosoftAppTenantId
});
```

**Also improved error handling (Lines 25-34):**
```typescript
adapter.onTurnError = async (context: TurnContext, error: Error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    console.error(error.stack);

    try {
        await context.sendActivity('Sorry, the bot encountered an error. Please try again.');
    } catch (sendError) {
        console.error('Failed to send error message:', sendError);
    }
};
```

## Issues Encountered and Solutions

### Issue 1: Tenant Mismatch
**Problem:** Initial bot registration in Merck tenant, but deployment to Hackathon tenant
**Solution:** Created new app registration in Hackathon tenant (7c40eae0-faa8-4ed6-b57f-2fcb1cec8375)

### Issue 2: Messaging Policy Error
**Problem:** "You don't have access to this app. Due to your org's messaging policy"
**Root Cause:** App registered in different tenant than Teams deployment
**Solution:** Re-registered app in correct tenant (Hackathon)

### Issue 3: Bot Not Using Credentials
**Problem:** Bot received messages but crashed when trying to respond with RestError
**Root Cause:** Bot adapter only used credentials when NODE_ENV=production (line 20-21 in src/index.ts)
**Solution:** Modified src/index.ts to always use credentials from .env file

### Issue 4: Teams Admin Center Policy Configuration
**Problem:** Custom app policies needed configuration
**Solution:**
- Enabled "Allow third-party apps" in org-wide settings
- Enabled "Allow custom apps" in org-wide settings
- Added bot to Setup policies

## How to Run the Bot

### Prerequisites
- Node.js installed
- Cloudflare tunnel (cloudflared) installed
- Access to Hackathon Azure tenant

### Start the Bot

1. **Start the bot server:**
```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot
npm run dev
```

2. **Start Cloudflare tunnel (in separate terminal):**
```bash
cloudflared tunnel --url http://localhost:3978
```

3. **Note the tunnel URL** from Cloudflare output (format: https://XXXXX.trycloudflare.com)

4. **If tunnel URL changed, update Azure Bot messaging endpoint:**
   - Go to Azure Portal → pcp-bot → Configuration
   - Update Messaging endpoint to: `https://NEW-URL.trycloudflare.com/api/messages`
   - Click Apply

### Verify Bot is Running

Check console output for:
```
✅ Database initialized
✅ ADO service initialized
✅ LLM service initialized
🤖 PCP Bot is running on port 3978
✅ Connected to ADO: AHITL/IDP - DEVOPS
```

## Testing the Bot

### In Microsoft Teams

1. **Open Teams** (logged in as VictorHeifets@Hackathon144.onmicrosoft.com)
2. **Click Apps** on left sidebar
3. **Search for "PCP Bot"** or find it in "Built for your org"
4. **Click Add**
5. **Type "help"** to see available commands

### Available Commands

- `help` - Show all available commands
- `standup` - Start daily standup check-in
- `eod` - Start end-of-day check-in
- `/create-us` - Create user story with AI assistance
- `/test-ado` - Test Azure DevOps connection
- `/set-email <email>` - Set user email for ADO integration

## Architecture

```
Microsoft Teams Client
       ↓
Bot Framework Service (Azure)
       ↓
Cloudflare Tunnel (HTTPS)
       ↓
Local Bot Server (port 3978)
       ↓
   ├─ Bot Framework SDK
   ├─ Azure DevOps API
   ├─ OpenAI API
   └─ SQLite Database
```

## Files Modified

1. **src/index.ts** (Lines 18-34) - Fixed authentication and error handling
2. **.env** - Updated with Hackathon tenant credentials
3. **teams-app/manifest.json** - Updated App ID in 3 locations
4. **teams-app/pcp-bot.zip** - Re-packaged with new manifest

## Security Notes

### Credentials Storage
- App credentials stored in `.env` file (git-ignored)
- Never commit credentials to version control
- Client secret expires: November 16, 2027

### Network Security
- Bot uses HTTPS via Cloudflare tunnel
- Cloudflare tunnel is temporary and changes on restart
- For production, use Azure App Service or stable tunnel

## Troubleshooting

### Bot Not Responding

1. **Check bot is running:**
```bash
lsof -i:3978
```

2. **Check Cloudflare tunnel is active:**
```bash
ps aux | grep cloudflared
```

3. **Check bot logs** for errors in terminal where `npm run dev` is running

4. **Verify Azure Bot messaging endpoint** matches current Cloudflare URL

### Authentication Errors

1. **Verify credentials in .env:**
```bash
grep MicrosoftApp .env
```

2. **Test authentication:**
```bash
curl -X POST "https://login.microsoftonline.com/7c40eae0-faa8-4ed6-b57f-2fcb1cec8375/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=10f0dd45-d789-4c48-a0f0-54ea60ad2ddb&client_secret=[YOUR_CLIENT_SECRET_HERE]&scope=https://api.botframework.com/.default&grant_type=client_credentials"
```

Should return an access token.

### Teams Can't Find Bot

1. **Verify bot is published** in Teams Admin Center
2. **Check availability** is set to "Everyone"
3. **Wait 5-10 minutes** after uploading for propagation
4. **Try uploading directly** in Teams: Apps → Manage your apps → Upload an app

## Production Deployment Recommendations

For production deployment, consider:

1. **Azure App Service:** Deploy bot to Azure App Service instead of running locally
2. **Named Cloudflare Tunnel:** Use a named tunnel with persistent URL
3. **Azure Key Vault:** Store credentials in Key Vault instead of .env
4. **Application Insights:** Enable logging and monitoring
5. **CI/CD Pipeline:** Automate deployment with GitHub Actions or Azure DevOps
6. **High Availability:** Deploy multiple instances behind load balancer

## Support

For issues or questions:
- Check bot logs in terminal
- Review Azure Bot Service logs in Azure Portal
- Verify Teams Admin Center configuration
- Check Cloudflare tunnel status

## Version History

- **v1.0.0** (Nov 16, 2025) - Initial deployment to Hackathon tenant
- Fixed authentication bug (src/index.ts)
- Successfully tested in Microsoft Teams

---

**Documentation Last Updated:** November 16, 2025
**Bot Status:** ✅ Active and Working
