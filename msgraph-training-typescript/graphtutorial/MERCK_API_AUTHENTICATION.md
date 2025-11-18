# 🔐 Merck GPT API - Authentication Guide

**Date:** 2025-11-17
**API Version:** GPT-5 (2025-08-07)

---

## ⚡ Quick Reference

```bash
# Merck GPT API Endpoint
URL: https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions

# Authentication
Header: api-key: JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1

# ⚠️ NOT Authorization: Bearer (like OpenAI)
# ✅ Use api-key header instead
```

---

## 🔑 Authentication Method

### **Merck Uses Custom Header (NOT OAuth2 Bearer)**

```http
POST /gpt/v2/gpt-5-2025-08-07/chat/completions HTTP/1.1
Host: iapi-test.merck.com
api-key: JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1
Content-Type: application/json

{
  "messages": [...]
}
```

### **Comparison with OpenAI**

| Provider | Header Name | Header Value | Example |
|----------|-------------|--------------|---------|
| **Merck GPT** | `api-key` | `<api_key>` | `api-key: JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1` |
| **OpenAI** | `Authorization` | `Bearer <token>` | `Authorization: Bearer sk-proj-...` |

---

## 🧪 Test Results

### Test 1: Basic Authentication ✅

```bash
curl -X POST 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions' \
  -H 'api-key: JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1' \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user", "content": "Say hello"}]}'
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Hello! How can I help you today?",
        "role": "assistant"
      }
    }
  ],
  "model": "gpt-5-2025-08-07",
  "usage": {
    "prompt_tokens": 7,
    "completion_tokens": 19,
    "total_tokens": 26
  }
}
```

### Test 2: JSON Response Format ✅

```bash
curl -X POST 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions' \
  -H 'api-key: JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role": "system", "content": "Return only valid JSON."},
      {"role": "user", "content": "Parse: Call John tomorrow at 3pm. Return {person, time}"}
    ],
    "response_format": {"type": "json_object"}
  }'
```

**Response:**
```json
{
  "person": "John",
  "time": "tomorrow at 3pm"
}
```

### Test 3: Wrong API Key ❌

```bash
curl -X POST 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions' \
  -H 'api-key: WRONG_KEY_123' \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

**Response:**
```json
{
  "message": "Unauthorized",
  "request_id": "6bba8e1247a61572a5d4f17acf7b2062"
}
```

---

## 💻 Code Implementation

### TypeScript/Node.js

```typescript
// Configuration
const MERCK_GPT_API_URL = 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions';
const MERCK_GPT_API_KEY = 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1';

// API Call
const response = await fetch(MERCK_GPT_API_URL, {
  method: 'POST',
  headers: {
    'api-key': MERCK_GPT_API_KEY,        // ← Custom header
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Your prompt here' }
    ],
    response_format: { type: 'json_object' }  // Optional: Force JSON
  })
});

const result = await response.json();
const content = result.choices[0].message.content;
```

### Python

```python
import requests

MERCK_GPT_API_URL = 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions'
MERCK_GPT_API_KEY = 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1'

response = requests.post(
    MERCK_GPT_API_URL,
    headers={
        'api-key': MERCK_GPT_API_KEY,  # ← Custom header
        'Content-Type': 'application/json'
    },
    json={
        'messages': [
            {'role': 'user', 'content': 'Hello'}
        ]
    }
)

result = response.json()
content = result['choices'][0]['message']['content']
```

### cURL (Shell)

```bash
#!/bin/bash

MERCK_API_URL="https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions"
MERCK_API_KEY="JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1"

curl -X POST "$MERCK_API_URL" \
  -H "api-key: $MERCK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }' | jq
```

---

## 📝 Request Format

### Minimal Request

```json
{
  "messages": [
    {"role": "user", "content": "Your prompt"}
  ]
}
```

### Full Request (All Options)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that returns JSON."
    },
    {
      "role": "user",
      "content": "Your prompt here"
    }
  ],
  "response_format": {
    "type": "json_object"
  },
  "temperature": 0.7,
  "max_tokens": 1000
}
```

---

## 📊 Response Format

### Standard Response

```json
{
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "The AI's response here",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1763403541,
  "id": "chatcmpl-Ccy6X1Vh0Th7OKi7pcjFHe6JF0jxq",
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 19,
    "total_tokens": 27
  }
}
```

### Extracting Content

```typescript
// JavaScript/TypeScript
const content = result.choices[0].message.content;

// Python
content = result['choices'][0]['message']['content']

// Shell (with jq)
echo "$response" | jq -r '.choices[0].message.content'
```

---

## 🔒 Security Notes

### **API Key Management**

```typescript
// ✅ Good - Environment Variable
const API_KEY = process.env.MERCK_GPT_API_KEY;

// ✅ Good - External Config
const API_KEY = config.merckGptApiKey;

// ❌ Bad - Hardcoded in client-side code
const API_KEY = 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1';  // Don't expose in frontend!
```

### **Best Practices**

1. **Server-Side Only** - Never expose API key in client-side JavaScript
2. **Environment Variables** - Store in `.env` file (gitignored)
3. **Proxy Pattern** - Frontend → Your Server → Merck API
4. **Rate Limiting** - Implement rate limits on your server
5. **Error Handling** - Handle 401/403 errors gracefully

---

## ⚠️ Common Mistakes

### Mistake 1: Using Bearer Authentication

```typescript
// ❌ WRONG - This is OpenAI format
headers: {
  'Authorization': 'Bearer JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1'
}

// ✅ CORRECT - Merck uses custom header
headers: {
  'api-key': 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1'
}
```

### Mistake 2: Wrong Header Name

```typescript
// ❌ WRONG - Various incorrect attempts
headers: {
  'API-Key': '...',        // Wrong case
  'apikey': '...',         // No hyphen
  'X-API-Key': '...',      // Wrong prefix
}

// ✅ CORRECT - Exact header name
headers: {
  'api-key': '...'
}
```

### Mistake 3: Missing Content-Type

```typescript
// ❌ WRONG - Missing Content-Type
headers: {
  'api-key': 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1'
}

// ✅ CORRECT - Include Content-Type
headers: {
  'api-key': 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1',
  'Content-Type': 'application/json'
}
```

---

## 🧪 Testing Authentication

### Quick Test Script

```bash
#!/bin/bash
# test_merck_auth.sh

API_URL="https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions"
API_KEY="JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1"

echo "Testing Merck GPT API authentication..."

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Test"}]}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "✅ Authentication successful!"
  echo "$body" | jq -r '.choices[0].message.content'
else
  echo "❌ Authentication failed (HTTP $http_code)"
  echo "$body" | jq
fi
```

---

## 📚 Additional Information

### Model Information
- **Model:** `gpt-5-2025-08-07`
- **Context Window:** (Check with Merck IT)
- **Max Tokens:** (Check with Merck IT)
- **Rate Limits:** (Check with Merck IT)

### Support Contacts
- **Merck IT Support:** (Contact info)
- **API Documentation:** (Internal docs link)

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] Using `api-key` header (not `Authorization`)
- [ ] API key stored securely (environment variable)
- [ ] Never exposed in client-side code
- [ ] Error handling for 401/403 responses
- [ ] Rate limiting implemented
- [ ] Logging API usage for monitoring
- [ ] Testing with wrong key shows proper error

---

**Last Updated:** 2025-11-17
**Status:** ✅ Tested and Working
**Integration:** webhook_server_db.ts, database/tasks.ts
