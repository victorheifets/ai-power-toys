# Working Solutions for Merck's Restricted Environment

## The Situation

All custom applications and even Microsoft's pre-approved client IDs are blocked at Merck:
- ✅ **What Works**: Microsoft Graph Explorer (because it's pre-approved by Merck IT)
- ❌ **What's Blocked**: Everything else (custom apps, PowerShell client ID, Azure CLI client ID)

---

## Solution 1: Use Microsoft Graph Explorer Directly ⭐ RECOMMENDED

Microsoft Graph Explorer is a web-based tool that Merck has likely pre-approved.

### Steps:

1. **Go to Graph Explorer**
   ```
   https://developer.microsoft.com/en-us/graph/graph-explorer
   ```

2. **Sign in with your Merck account**
   - Click "Sign in to Graph Explorer"
   - Use: heifets@merck.com
   - This should work without admin approval

3. **Test Graph API calls directly in the browser**

   **Get your profile:**
   ```
   GET https://graph.microsoft.com/v1.0/me
   ```

   **List your inbox (10 messages):**
   ```
   GET https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime DESC
   ```

   **Send email to yourself:**
   ```
   POST https://graph.microsoft.com/v1.0/me/sendMail

   Body:
   {
     "message": {
       "subject": "Test from Graph Explorer",
       "body": {
         "contentType": "Text",
         "content": "Hello from Graph Explorer!"
       },
       "toRecipients": [
         {
           "emailAddress": {
             "address": "heifets@merck.com"
           }
         }
       ]
     }
   }
   ```

4. **Learn and experiment**
   - Graph Explorer has autocomplete for all Graph APIs
   - You can see request/response headers
   - You can modify permissions as needed
   - Perfect for learning without any custom app

---

## Solution 2: Extract Access Token from Graph Explorer

If you need to use the token in your own code (Postman, curl, etc.):

### Steps:

1. **Open Graph Explorer and sign in**
   ```
   https://developer.microsoft.com/en-us/graph/graph-explorer
   ```

2. **Open Browser Developer Tools**
   - Press **F12** (or right-click → Inspect)
   - Go to **Network** tab

3. **Make any Graph API call**
   - Example: GET https://graph.microsoft.com/v1.0/me

4. **Find the request in Network tab**
   - Click on the request (shows as "me" or similar)
   - Go to **Headers** section

5. **Copy the Authorization header**
   - Look for: `Authorization: Bearer eyJ0eXAiOiJKV1Qi...`
   - Copy everything after "Bearer " (the long token)

6. **Use the token in your code or tools**

   **In curl:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
        https://graph.microsoft.com/v1.0/me
   ```

   **In JavaScript:**
   ```javascript
   const token = "YOUR_TOKEN_HERE";
   fetch('https://graph.microsoft.com/v1.0/me', {
       headers: { 'Authorization': `Bearer ${token}` }
   }).then(r => r.json()).then(console.log);
   ```

   **In Postman:**
   - Authorization tab → Type: Bearer Token
   - Paste the token

**Important:**
- Tokens expire in ~1 hour
- You'll need to extract a new token when it expires
- This is manual but works immediately

---

## Solution 3: Install Azure CLI (If Allowed)

Azure CLI might bypass the web restrictions since it's a command-line tool.

### Installation:

**macOS (via Homebrew):**
```bash
brew update && brew install azure-cli
```

**macOS (via installer):**
Download from: https://aka.ms/installazureclimacos

### Usage After Installation:

```bash
# Login (opens browser once, then stores credentials)
az login

# Get access token for Microsoft Graph
az account get-access-token --resource https://graph.microsoft.com

# The output will include an "accessToken" field
# Copy and use it like in Solution 2
```

**Advantages:**
- Once logged in, no browser popup needed
- Token refresh is automatic
- Works for scripting

**Disadvantage:**
- Requires installation (might need admin rights on Mac)
- First login still requires browser authentication (might fail with same restrictions)

---

## Solution 4: Install Microsoft Graph PowerShell Module

Similar to Azure CLI but specifically for Graph API.

### Installation (PowerShell - if you have it):

```powershell
# Install module (might need admin)
Install-Module Microsoft.Graph -Scope CurrentUser

# Connect
Connect-MgGraph -Scopes "User.Read", "Mail.Read", "Mail.Send"

# Get your profile
Get-MgUser -UserId "me"

# List inbox
Get-MgUserMessage -UserId "me" -Top 10

# Send email
Send-MgUserMail -UserId "me" -Message @{...}
```

**Note:** This will likely hit the same "user assignment required" error we saw earlier.

---

## Solution 5: Request Specific Access (Faster than full admin consent)

Instead of requesting full admin consent for your custom app, ask IT for:

### Option A: Assign You to Graph PowerShell
```
App: Microsoft Graph Command Line Tools
Client ID: 14d82eec-204b-4c2f-b7e8-296a70dab67e
Request: Assign heifets@merck.com to this app
```

This is a Microsoft app, so IT might approve faster than a custom app.

### Option B: Assign You to Azure CLI
```
App: Microsoft Azure CLI
Client ID: 04b07795-8ddb-461a-bbee-02f9e1bf7b46
Request: Assign heifets@merck.com to this app
```

These are **assignment requests**, not admin consent requests, and might be processed faster.

---

## Comparison Table

| Solution | Works Immediately? | Limitations | Best For |
|----------|-------------------|-------------|----------|
| **Graph Explorer** | ✅ Yes | Browser only | Learning, testing |
| **Extract Token** | ✅ Yes | 1-hour expiry, manual | Quick testing, Postman |
| **Azure CLI** | 🟡 Maybe | Installation needed, might be blocked | Scripting, automation |
| **PowerShell** | ❌ Probably not | User assignment needed | Windows users |
| **Request Assignment** | ⏳ Few days | Requires IT approval | Long-term solution |

---

## Recommended Approach: Start with Graph Explorer

1. **Right now** → Use Graph Explorer for immediate learning
   - URL: https://developer.microsoft.com/en-us/graph/graph-explorer
   - No setup, should work immediately

2. **For coding/testing** → Extract tokens from Graph Explorer
   - Works in any tool (Postman, curl, code)
   - Manual but functional

3. **For long-term** → Request assignment to Microsoft Graph PowerShell app
   - Email template: ADMIN_CONSENT_REQUEST.md (modify to request assignment instead)
   - Faster approval than custom app

4. **Eventually** → Get admin consent for your custom app
   - Best for production use
   - Full control over application

---

## Next Steps

**Try Graph Explorer right now:**
```
https://developer.microsoft.com/en-us/graph/graph-explorer
```

If that works, you can start learning the Microsoft Graph API immediately without any other setup!

Report back whether Graph Explorer lets you sign in.
