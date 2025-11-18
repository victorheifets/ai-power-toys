# PCP Bot Deployment Guide

## Prerequisites

- Azure subscription
- Azure CLI installed
- Node.js 18+ installed
- Teams admin access (for sideloading apps)
- Azure DevOps PAT token

## Step 1: Register Bot in Azure

### 1.1 Create Bot Registration

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name pcp-bot-rg --location eastus

# Create Azure Bot
az bot create \
  --resource-group pcp-bot-rg \
  --name pcp-bot \
  --kind webapp \
  --sku F0 \
  --app-type MultiTenant

# Get the App ID and Password
az bot show --resource-group pcp-bot-rg --name pcp-bot --query "properties.msaAppId" -o tsv
```

### 1.2 Create App Password

```bash
# Go to Azure Portal > App Registrations > Your Bot App
# Under "Certificates & secrets" > "New client secret"
# Copy the secret value (you won't be able to see it again!)
```

### 1.3 Configure Bot Settings

In Azure Portal:
1. Go to your Bot resource
2. Under **Configuration**, set:
   - Messaging endpoint: `https://YOUR_APP_URL.azurewebsites.net/api/messages`

## Step 2: Add Microsoft Graph Permissions (for auto email detection)

### 2.1 Add API Permissions

In Azure Portal > App Registrations > Your Bot App:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Application permissions**
4. Add these permissions:
   - `User.Read.All` (to read user emails)
   - `User.ReadBasic.All` (alternative, more restricted)
5. Click **Grant admin consent**

### 2.2 Update .env file

```env
# Bot Framework
MicrosoftAppId=YOUR_APP_ID_FROM_STEP_1.1
MicrosoftAppPassword=YOUR_APP_PASSWORD_FROM_STEP_1.2
MicrosoftAppTenantId=YOUR_TENANT_ID
PORT=3978

# Azure DevOps Integration
ADO_ORGANIZATION=AHITL
ADO_PROJECT=IDP - DEVOPS
ADO_PAT=YOUR_ADO_PAT_TOKEN

# Azure OpenAI for LLM-assisted story creation
AZURE_OPENAI_ENDPOINT=https://api.openai.com/v1/
AZURE_OPENAI_API_KEY=YOUR_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-3.5-turbo

# Team Configuration
TEAM_ID=
TL_USER_ID=
TL_NAME=
```

## Step 3: Deploy to Azure App Service

### Option A: Deploy via Azure CLI

```bash
# Create App Service Plan
az appservice plan create \
  --name pcp-bot-plan \
  --resource-group pcp-bot-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group pcp-bot-rg \
  --plan pcp-bot-plan \
  --name pcp-bot-app \
  --runtime "NODE:18-lts"

# Configure app settings (environment variables)
az webapp config appsettings set \
  --resource-group pcp-bot-rg \
  --name pcp-bot-app \
  --settings \
    MicrosoftAppId="YOUR_APP_ID" \
    MicrosoftAppPassword="YOUR_PASSWORD" \
    MicrosoftAppTenantId="YOUR_TENANT_ID" \
    ADO_ORGANIZATION="AHITL" \
    ADO_PROJECT="IDP - DEVOPS" \
    ADO_PAT="YOUR_PAT" \
    AZURE_OPENAI_ENDPOINT="YOUR_ENDPOINT" \
    AZURE_OPENAI_API_KEY="YOUR_KEY" \
    AZURE_OPENAI_DEPLOYMENT="gpt-3.5-turbo"

# Build and deploy
npm run build
cd dist
zip -r ../deploy.zip .
cd ..

az webapp deployment source config-zip \
  --resource-group pcp-bot-rg \
  --name pcp-bot-app \
  --src deploy.zip
```

### Option B: Deploy via GitHub Actions

See `azure-deploy.yml` workflow file.

### Option C: Local Testing with ngrok (Development)

```bash
# Install ngrok
npm install -g ngrok

# Start your bot locally
npm run dev

# In another terminal, start ngrok
ngrok http 3978

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update Bot Messaging Endpoint in Azure Portal:
# https://abc123.ngrok.io/api/messages
```

## Step 4: Create Teams App Package

### 4.1 Update manifest.json

Edit `teams-app/manifest.json`:

1. Replace `YOUR_BOT_APP_ID_HERE` with your actual App ID (3 places)
2. Update URLs if needed

### 4.2 Create App Icons

Create two PNG files in `teams-app/`:

- `color.png` - 192x192px (full color icon)
- `outline.png` - 32x32px (white outline on transparent)

You can use placeholder icons for testing.

### 4.3 Package the App

```bash
cd teams-app
zip -r pcp-bot.zip manifest.json color.png outline.png
```

## Step 5: Install Bot in Teams

### 5.1 Sideload App (Development/Testing)

1. Open Microsoft Teams
2. Go to **Apps** (left sidebar)
3. Click **Manage your apps** (bottom left)
4. Click **Upload an app** > **Upload a custom app**
5. Select `pcp-bot.zip`
6. Click **Add** to install for yourself or **Add to team**

### 5.2 Publish to Organization (Production)

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Manage apps**
3. Click **Upload new app**
4. Upload `pcp-bot.zip`
5. Review and approve the app
6. Users can now install it from the Teams app store

## Step 6: Test the Bot

In Teams, start a chat with the bot:

1. Type `help` - should show all commands
2. Type `/set-email your.email@merck.com` - set your email (temporary, will be auto-detected soon)
3. Type `/test-ado` - test ADO connection
4. Type `standup` - test standup flow
5. Type `/create-us` - test AI story creation

## Step 7: Enable Teams Channel in Azure

In Azure Portal:

1. Go to your Bot resource
2. Click **Channels** (left menu)
3. Click **Microsoft Teams** icon
4. Accept the terms
5. Click **Save**

## Troubleshooting

### Bot doesn't respond

- Check Azure App Service logs: `az webapp log tail --name pcp-bot-app --resource-group pcp-bot-rg`
- Verify messaging endpoint is correct
- Ensure App ID and Password are correct
- Check that the bot is running (Web App should be "Running" status)

### ADO integration fails

- Verify ADO_PAT has correct permissions (Work Items: Read & Write)
- Check ADO_ORGANIZATION and ADO_PROJECT match exactly
- Test PAT manually: https://dev.azure.com/{org}/_apis/projects

### LLM/OpenAI fails

- Verify API key is valid
- Check endpoint URL (should end with `/v1/` for OpenAI)
- Ensure deployment name matches your model

### User email not found

- For now, users need to use `/set-email` command
- Follow Step 8 to enable auto email detection

## Step 8: Enable Auto Email Detection (Optional but Recommended)

See `GRAPH_INTEGRATION.md` for detailed instructions on:
- Adding Microsoft Graph SDK
- Implementing token acquisition
- Auto-detecting user emails from AAD

## Monitoring and Logs

### View Application Logs

```bash
# Stream logs
az webapp log tail --resource-group pcp-bot-rg --name pcp-bot-app

# Download logs
az webapp log download --resource-group pcp-bot-rg --name pcp-bot-app
```

### Application Insights (Recommended)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app pcp-bot-insights \
  --location eastus \
  --resource-group pcp-bot-rg

# Link to Web App
az webapp config appsettings set \
  --resource-group pcp-bot-rg \
  --name pcp-bot-app \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="YOUR_CONNECTION_STRING"
```

## Security Best Practices

1. **Never commit secrets** - Use Azure Key Vault or App Service configuration
2. **Use managed identity** - Enable for App Service to access other Azure resources
3. **Rotate credentials** - Regularly rotate App Password and PAT tokens
4. **Restrict access** - Use RBAC to limit who can modify bot settings
5. **Enable HTTPS only** - Ensure App Service enforces HTTPS
6. **Monitor logs** - Set up alerts for errors and unusual activity

## Cost Estimates

- **Bot Channels Registration**: Free (F0 tier)
- **App Service**: ~$13/month (B1 Basic tier)
- **Application Insights**: ~$2-10/month (depending on usage)
- **SQLite Database**: Free (stored in App Service filesystem)

**Total**: ~$15-25/month

## Next Steps

1. ✅ Deploy bot to Azure
2. ✅ Install in Teams
3. 🔄 Add Microsoft Graph integration (remove `/set-email` requirement)
4. 🔄 Add scheduled reminders (standup/EOD at configured times)
5. 🔄 Add team lead notifications for blockers
6. 🔄 Add analytics dashboard
7. 🔄 Migrate from SQLite to Azure SQL (for production scale)

## Support

For issues or questions:
- Check Azure App Service logs
- Review Bot Framework documentation: https://docs.microsoft.com/en-us/azure/bot-service/
- Check Teams app documentation: https://docs.microsoft.com/en-us/microsoftteams/platform/
