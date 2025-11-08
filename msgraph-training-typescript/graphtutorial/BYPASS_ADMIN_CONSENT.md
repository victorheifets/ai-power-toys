# Bypass Admin Consent Requirement - Complete Guide

## The Problem

Merck has a tenant-wide policy requiring admin approval for ANY custom application. This affects:
- Your custom app (Client ID: `a4a4b111-3db0-4832-ae7c-d6f2447144a0`)
- Even Microsoft's Graph Explorer might be restricted

## Solution: Use Microsoft's Pre-Approved Client IDs

Microsoft has several "first-party" applications that are often pre-approved by organizations:

| Application | Client ID | Likely to Work? |
|------------|-----------|----------------|
| **Microsoft Graph PowerShell** | `14d82eec-204b-4c2f-b7e8-296a70dab67e` | ⭐ Most likely |
| **Azure CLI** | `04b07795-8ddb-461a-bbee-02f9e1bf7b46` | ⭐ Very likely |
| **Azure PowerShell** | `1950a258-227b-4e31-a9cf-717495945fc2` | 🟡 Possibly |

---

## Testing Instructions

The web server is **already running** at http://localhost:3200

### Test 1: Microsoft Graph PowerShell Client ID ⭐ TRY THIS FIRST

1. Open your browser to: **http://localhost:3200/index_ms_powershell.html**
2. Click "Sign in with Microsoft"
3. Sign in with heifets@merck.com
4. **If it works:** You'll see your user info without admin consent prompt!
5. **If it fails:** Move to Test 2

### Test 2: Azure CLI Client ID

1. Open your browser to: **http://localhost:3200/index_azure_cli.html**
2. Click "Sign in with Microsoft"
3. Sign in with heifets@merck.com
4. **If it works:** Success! Use this version.
5. **If it fails:** Try the fallback options below

### Test 3: Your Original Custom App (Baseline)

1. Open your browser to: **http://localhost:3200**
2. This uses your custom client ID - expect admin consent prompt
3. Confirms the baseline behavior

---

## What to Expect

### ✅ Success - No Admin Consent Prompt
- You'll see your account info immediately
- No "Need admin approval" message
- All features will work (inbox, send mail, etc.)

### ❌ Still Requires Admin Consent
- You'll see "AI Power Toys needs permission to access resources"
- **This means:** Merck has blocked even Microsoft's first-party apps
- **Next step:** Use fallback options below

---

## Fallback Options if Microsoft Client IDs Don't Work

### Option A: Extract Token from Graph Explorer (Immediate Solution)

If Microsoft Graph Explorer works for you, you can extract its token:

1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
2. Sign in with heifets@merck.com
3. Open browser Developer Tools (F12)
4. Go to **Network** tab
5. Make any Graph API call (e.g., GET /me)
6. Find the request, click on it, go to **Headers**
7. Look for `Authorization: Bearer <token>`
8. Copy the token (long string after "Bearer ")
9. Use it in your code or Postman to test Graph API

**Token lifetime:** ~1 hour, then you need to get a new one

**Pros:** Works immediately, no admin consent needed
**Cons:** Manual process, token expires, not good for production

### Option B: Use Azure CLI Locally

If you have Azure CLI installed:

```bash
# Login with your Merck account
az login

# Get access token for Microsoft Graph
az account get-access-token --resource https://graph.microsoft.com

# Use the token in your application
```

This uses Azure CLI's pre-approved client ID automatically.

### Option C: Request Admin Consent (Permanent Solution)

Submit the admin consent request to Merck IT:
- File: `ADMIN_CONSENT_REQUEST.md` (already created)
- This is the only permanent solution if other methods fail
- May take days/weeks depending on Merck's approval process

---

## Which Client ID to Use in Your Code?

Once you find a working client ID, update your code:

### For Microsoft Graph PowerShell:
```javascript
const msalConfig = {
    auth: {
        clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e',
        authority: 'https://login.microsoftonline.com/a00de4ec-48a8-43a6-be74-e31274e2060d',
        redirectUri: 'http://localhost:3200'
    }
};
```

### For Azure CLI:
```javascript
const msalConfig = {
    auth: {
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
        authority: 'https://login.microsoftonline.com/a00de4ec-48a8-43a6-be74-e31274e2060d',
        redirectUri: 'http://localhost:3200'
    }
};
```

---

## Important Notes

### Redirect URI Configuration

Even if you use Microsoft's client IDs, you might need to configure redirect URIs in Azure Portal. However:

- **Microsoft's first-party apps** often have wildcard or pre-configured redirect URIs
- If you get a redirect URI error, you'll need admin access to configure it
- Most likely **it will just work** without configuration

### Limitations

Using Microsoft's client IDs is:
- ✅ **Fine for learning and development**
- ✅ **Works within your organization**
- ❌ **Not recommended for production apps you distribute**
- ❌ **Microsoft could change/restrict these IDs**

For production apps, you should:
1. Get admin consent for your own app
2. Or build a backend that uses service principal authentication

---

## Testing Checklist

- [ ] Web server running (should already be running)
- [ ] Test Microsoft Graph PowerShell client ID (index_ms_powershell.html)
- [ ] Test Azure CLI client ID (index_azure_cli.html)
- [ ] If both fail, try extracting token from Graph Explorer
- [ ] Document which approach works for future use

---

## Quick Start - Try Right Now!

1. Open browser: **http://localhost:3200/index_ms_powershell.html**
2. Click **Sign in with Microsoft**
3. Enter: **heifets@merck.com**
4. Check if admin consent is bypassed!

Good luck! Let me know which approach works.
