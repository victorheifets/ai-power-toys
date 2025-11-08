#!/bin/bash

# Test script for Custom Toys API
API_BASE="http://localhost:3200"
USER_EMAIL="heifets@merck.com"

echo "🧪 Testing Custom Toys API"
echo "================================"

# Test 1: Create a custom toy
echo ""
echo "1️⃣ Creating custom toy..."
RESPONSE=$(curl -s -X POST "${API_BASE}/api/custom-toys" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "'"${USER_EMAIL}"'",
    "toy_name": "Working Hours Reminder",
    "icon": "⏰",
    "user_description": "Recognize emails from HR asking to fill working hours. Suggest opening www.workinghours.com in browser",
    "action_type": "open_url",
    "action_config": {
      "button_label": "🌐 Open Timesheet Portal",
      "url": "https://www.workinghours.com"
    },
    "enabled": true
  }')

echo "$RESPONSE" | jq '.'
TOY_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "✅ Created custom toy with ID: $TOY_ID"

# Test 2: Get all custom toys
echo ""
echo "2️⃣ Fetching all custom toys for user..."
curl -s "${API_BASE}/api/custom-toys/${USER_EMAIL}" | jq '.'

# Test 3: Test the custom toy detection
echo ""
echo "3️⃣ Testing custom toy detection..."
curl -s -X POST "${API_BASE}/api/custom-toys/test" \
  -H "Content-Type: application/json" \
  -d '{
    "user_description": "Recognize emails from HR asking to fill working hours",
    "test_email": "From: hr@company.com\nSubject: Reminder: Submit Working Hours\n\nPlease submit your working hours for last week.",
    "token": "dummy-token"
  }' | jq '.'

# Test 4: Update the custom toy
echo ""
echo "4️⃣ Updating custom toy..."
curl -s -X PUT "${API_BASE}/api/custom-toys/${TOY_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "toy_name": "Working Hours Reminder (Updated)",
    "enabled": true
  }' | jq '.'

# Test 5: Delete the custom toy
echo ""
echo "5️⃣ Deleting custom toy..."
curl -s -X DELETE "${API_BASE}/api/custom-toys/${TOY_ID}" | jq '.'

echo ""
echo "================================"
echo "✅ All tests completed!"
