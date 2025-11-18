#!/bin/bash

# Create subscription for Sent Items to monitor outgoing emails

echo "Creating subscription for Sent Items (outgoing emails)..."
echo ""

# Get token from dashboard (assumes dashboard is running and token is set)
GRAPH_TOKEN=$(curl -s http://localhost:3200/api/token 2>/dev/null | jq -r '.token' 2>/dev/null)

if [ -z "$GRAPH_TOKEN" ] || [ "$GRAPH_TOKEN" = "null" ]; then
    echo "❌ Could not get Graph token"
    echo ""
    echo "Make sure:"
    echo "1. Dashboard is open at http://localhost:5273"
    echo "2. You've applied your Graph API token in the dashboard"
    echo ""
    echo "Then run: ./create-sent-items-subscription.sh"
    exit 1
fi

echo "✅ Graph token obtained"
echo ""

# Create subscription
export GRAPH_TOKEN="$GRAPH_TOKEN"
export WEBHOOK_URL="https://spoke-promotions-pub-rock.trycloudflare.com/webhook"

npx ts-node subscribe_sent_mail.ts

echo ""
echo "After creating the subscription, you will receive webhooks for:"
echo "  📥 Inbox: Incoming emails"
echo "  📤 Sent Items: Outgoing emails"
echo ""
