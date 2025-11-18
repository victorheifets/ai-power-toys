# Manual Azure Portal Setup for PCP Bot

Since you don't have Azure CLI permissions to create resource groups, follow these steps to set up the bot manually via Azure Portal.

## Step 1: Create Bot Registration in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"Azure Bot"** in the search bar
3. Click **Create**
4. Fill in the details:
   - **Bot handle**: `pcp-bot` (must be globally unique, try `pcp-bot-merck` if taken)
   - **Subscription**: `MMCA_DIP_AzureVDI_11` (or whichever you prefer)
   - **Resource group**:
     - If you can create: Click "Create new" → `pcp-bot-rg`
     - If not: Select an existing resource group you have access to
   - **Pricing tier**: F0 (Free)
   - **Type of App**: Multi Tenant
   - **Creation type**: Create new Microsoft App ID

5. Click **Review + Create**, then **Create**

**⏱️ Wait 1-2 minutes for deployment to complete**

## Step 2: Get App ID and Create Secret

1. Once deployed, click **Go to resource**
2. On the left menu, click **Configuration**
3. Copy the **Microsoft App ID** (you'll need this!)
4. Click **Manage** next to Microsoft App ID (this opens App Registration)
5. In the App Registration page:
   - Click **Certificates & secrets** (left menu)
   - Click **New client secret**
   - Description: `pcp-bot-secret`
   - Expires: 24 months
   - Click **Add**
   - **⚠️ IMPORTANT**: Copy the secret **Value** immediately (you can't see it again!)

## Step 3: Configure Microsoft Graph Permissions

Still in the App Registration page:

1. Click **API permissions** (left menu)
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions**
5. Search for and add: `User.Read.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
   - If you can't do this, request it from your Azure AD admin
   - Without this, users will need to use `/set-email` command

## Step 4: Update Local .env File

Now that you have your credentials, update your local `.env` file:

```bash
MicrosoftAppId=YOUR_APP_ID_FROM_STEP_2
MicrosoftAppPassword=YOUR_SECRET_VALUE_FROM_STEP_2
MicrosoftAppTenantId=a00de4ec-48a8-43a6-be74-e31274e2060d
PORT=3978

# Azure DevOps Integration
ADO_ORGANIZATION=AHITL
ADO_PROJECT=IDP - DEVOPS
ADO_PAT=YOUR_ADO_PAT_TOKEN

# Azure OpenAI for LLM-assisted story creation
AZURE_OPENAI_ENDPOINT=https://api.openai.com/v1/
AZURE_OPENAI_API_KEY=YOUR_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-3.5-turbo
```

## Step 5: Build and Start Bot Locally

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot

# Install dependencies (if not done)
npm install

# Build the bot
npm run build

# Start the bot
npm run dev
```

Bot should start on `http://localhost:3978`

## Step 6: Expose Bot with ngrok

In a **new terminal window**:

```bash
ngrok http 3978
```

You'll see output like:
```
Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:3978
```

**Copy the https URL** (e.g., `https://abc123def456.ngrok-free.app`)

## Step 7: Update Bot Messaging Endpoint

1. Go back to Azure Portal → Your Bot resource
2. Click **Configuration** (left menu)
3. Set **Messaging endpoint** to: `https://YOUR_NGROK_URL/api/messages`
   - Example: `https://abc123def456.ngrok-free.app/api/messages`
4. Click **Apply**
5. Wait for it to save

## Step 8: Enable Teams Channel

1. In your Bot resource, click **Channels** (left menu)
2. Click the **Microsoft Teams** icon
3. Accept the terms
4. Click **Save**
5. Status should show "Running"

## Step 9: Create Teams App Package

1. Update the manifest file:

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot/teams-app

# Replace YOUR_BOT_APP_ID_HERE with your actual App ID
sed -i '' 's/YOUR_BOT_APP_ID_HERE/YOUR_ACTUAL_APP_ID/g' manifest.json
```

2. Create icon files (or use placeholders):
   - `color.png` - 192x192px (full color)
   - `outline.png` - 32x32px (white on transparent)

   For testing, you can download placeholder icons or create simple ones.

3. Package the app:

```bash
zip -r pcp-bot.zip manifest.json color.png outline.png
```

## Step 10: Install Bot in Teams

1. Open **Microsoft Teams**
2. Click **Apps** (left sidebar)
3. Click **Manage your apps** (bottom left)
4. Click **Upload an app** → **Upload a custom app**
5. Select `pcp-bot.zip`
6. Click **Add** (to add for yourself) or **Add to a team**

## Step 11: Test the Bot

In Teams, start a conversation with your bot:

1. Type `help` - Should show all commands
2. Type `/set-email heifets@merck.com` - Set your email (until Graph API is approved)
3. Type `/test-ado` - Test ADO connection
4. Type `standup` - Try the standup flow
5. Type `/create-us` - Try creating a user story

## Troubleshooting

### Bot doesn't respond

**Check:**
- Bot is running locally (`npm run dev` should be active)
- ngrok is running and forwarding to port 3978
- Messaging endpoint in Azure Portal is correct
- Try restarting the bot and ngrok

**Check logs:**
Look at the terminal where `npm run dev` is running for error messages.

### ngrok URL changes

ngrok free tier generates a new URL every time you restart it. When this happens:
1. Copy the new ngrok URL
2. Update the Messaging endpoint in Azure Portal
3. No need to recreate Teams app package

### ADO integration fails

- Verify your PAT token has **Work Items: Read & Write** permissions
- Check token hasn't expired
- Verify organization and project names are correct

### Graph API permissions not working

If you couldn't grant admin consent in Step 3:
- Request your Azure AD admin to grant `User.Read.All` permission
- Until then, users must use `/set-email` command

## Request Azure Deployment Permissions (Optional)

To deploy to Azure App Service (for production), contact your Azure administrator and request:

- **Role**: Contributor or Owner
- **Scope**: Subscription or Resource Group level
- **Reason**: Deploy PCP Bot for team collaboration

Once you have permissions, you can use the automated deployment script:
```bash
./.azure/deploy.sh
```

## Production Deployment Considerations

For moving to production:

1. **Use Azure App Service** instead of local deployment
2. **Get a static domain** instead of ngrok
3. **Set up Application Insights** for monitoring
4. **Migrate to Azure SQL** instead of SQLite
5. **Set up CI/CD pipeline** with GitHub Actions
6. **Configure backup and disaster recovery**

## Architecture Comparison

### Current Setup (Local + ngrok)
```
Teams → Azure Bot Service → ngrok → Your Local Machine
```

### Production Setup
```
Teams → Azure Bot Service → Azure App Service → Azure SQL
```

## Cost Comparison

| Setup | Monthly Cost |
|-------|--------------|
| **Local + ngrok (Free)** | $0 |
| **Local + ngrok (Paid)** | $10/month (static domain, better limits) |
| **Azure App Service** | $30-70/month (production-grade) |

## Next Steps

Once your bot is running locally:

1. ✅ Test all features with your team
2. 📊 Gather feedback
3. 🔒 Request Azure deployment permissions from IT
4. 🚀 Deploy to production Azure App Service
5. 📈 Set up monitoring and analytics

## Support

For issues:
- Check bot terminal output for errors
- Check ngrok terminal for connection logs
- Verify Azure Portal configuration
- Review `.env` file for correct credentials
