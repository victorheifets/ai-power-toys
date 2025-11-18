#!/bin/bash

# PCP Bot Azure Deployment Script
# Usage: ./deploy.sh [resource-group-name] [app-name]

set -e

RESOURCE_GROUP=${1:-"pcp-bot-rg"}
APP_NAME=${2:-"pcp-bot-app"}
LOCATION="eastus"
PLAN_NAME="pcp-bot-plan"
BOT_NAME="pcp-bot"

echo "🚀 Starting PCP Bot deployment..."
echo "Resource Group: $RESOURCE_GROUP"
echo "App Name: $APP_NAME"
echo "Location: $LOCATION"

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Create resource group
echo "📦 Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Create App Service Plan
echo "📋 Creating App Service Plan..."
if az appservice plan show --name "$PLAN_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "   App Service Plan already exists, skipping..."
else
    az appservice plan create \
      --name "$PLAN_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --sku B1 \
      --is-linux
fi

# Create Web App
echo "🌐 Creating Web App..."
if az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "   Web App already exists, skipping..."
else
    az webapp create \
      --resource-group "$RESOURCE_GROUP" \
      --plan "$PLAN_NAME" \
      --name "$APP_NAME" \
      --runtime "NODE:18-lts"
fi

# Create Bot Registration
echo "🤖 Creating Bot Registration..."
if az bot show --name "$BOT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "   Bot already exists, skipping..."
    BOT_APP_ID=$(az bot show --name "$BOT_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.msaAppId" -o tsv)
else
    az bot create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$BOT_NAME" \
      --kind webapp \
      --sku F0 \
      --app-type MultiTenant

    BOT_APP_ID=$(az bot show --name "$BOT_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.msaAppId" -o tsv)
fi

echo "✅ Bot App ID: $BOT_APP_ID"

# Set messaging endpoint
WEBAPP_URL="https://${APP_NAME}.azurewebsites.net"
echo "🔗 Setting messaging endpoint to: ${WEBAPP_URL}/api/messages"
az bot update \
  --name "$BOT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --endpoint "${WEBAPP_URL}/api/messages"

# Enable Teams channel
echo "📱 Enabling Teams channel..."
az bot msteams create \
  --name "$BOT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-calling false \
  --calling-web-hook "" || echo "   Teams channel may already be enabled"

# Configure app settings (without secrets)
echo "⚙️  Configuring app settings..."
echo "   NOTE: You need to set these secrets manually:"
echo "   - MicrosoftAppPassword"
echo "   - ADO_PAT"
echo "   - AZURE_OPENAI_API_KEY"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    MicrosoftAppId="$BOT_APP_ID" \
    ADO_ORGANIZATION="AHITL" \
    ADO_PROJECT="IDP - DEVOPS" \
    AZURE_OPENAI_ENDPOINT="https://api.openai.com/v1/" \
    AZURE_OPENAI_DEPLOYMENT="gpt-3.5-turbo"

# Build the application
echo "🔨 Building application..."
npm run build
cp database/schema.sql dist/database/

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../deploy.zip . > /dev/null
cd ..

# Deploy to Azure
echo "🚀 Deploying to Azure Web App..."
az webapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --src deploy.zip

# Clean up
rm deploy.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set the following secrets in Azure Portal:"
echo "   - Go to: https://portal.azure.com/#@/resource/subscriptions/.../resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME/configuration"
echo "   - Add MicrosoftAppPassword (from App Registration)"
echo "   - Add ADO_PAT (Azure DevOps Personal Access Token)"
echo "   - Add AZURE_OPENAI_API_KEY"
echo ""
echo "2. Create an App Password for the bot:"
echo "   - Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/$BOT_APP_ID"
echo "   - Create a new client secret"
echo "   - Copy the value and add it as MicrosoftAppPassword"
echo ""
echo "3. Update Teams app manifest:"
echo "   - Edit teams-app/manifest.json"
echo "   - Replace YOUR_BOT_APP_ID_HERE with: $BOT_APP_ID"
echo "   - Create app package: cd teams-app && zip -r pcp-bot.zip manifest.json color.png outline.png"
echo ""
echo "4. Install app in Teams:"
echo "   - Upload pcp-bot.zip to Teams"
echo ""
echo "🔗 Resources:"
echo "   Web App: $WEBAPP_URL"
echo "   Bot: https://portal.azure.com/#@/resource/subscriptions/.../resourceGroups/$RESOURCE_GROUP/providers/Microsoft.BotService/botServices/$BOT_NAME"
echo "   Logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
