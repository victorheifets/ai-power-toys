# Verify Your App Registration Setup

Your client ID: `a4a4b111-3db0-4832-ae7c-d6f2447144a0`

The app is registered, but there might be a configuration issue. Let's check:

## ✅ Checklist - Go Back to Azure Portal

### 1. Go to Your App

https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/a4a4b111-3db0-4832-ae7c-d6f2447144a0

### 2. Check "Supported account types"

On the **Overview** page, look for:

```
Supported account types: ???
```

**It MUST say:**
```
Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)
```

**If it says something else:**
1. Click **"Manifest"** in the left menu
2. Find this line (around line 80):
   ```json
   "signInAudience": "...",
   ```
3. Change it to:
   ```json
   "signInAudience": "AzureADandPersonalMicrosoftAccount",
   ```
4. Click **"Save"** at the top

### 3. Check "Allow public client flows"

1. Click **"Authentication"** in the left menu
2. Scroll down to **"Advanced settings"**
3. Find **"Allow public client flows"**
4. **It MUST be set to "Yes"**

If it's "No":
1. Toggle it to **"Yes"**
2. Click **"Save"** at the top

### 4. Check API Permissions

Click **"API permissions"** in the left menu

You should see:
- ✓ Microsoft Graph - User.Read
- ✓ Microsoft Graph - Mail.Read
- ✓ Microsoft Graph - Mail.Send

**If Mail.Read or Mail.Send are missing:**
1. Click **"+ Add a permission"**
2. Click **"Microsoft Graph"**
3. Click **"Delegated permissions"**
4. Search and add:
   - Mail.Read
   - Mail.Send
5. Click **"Add permissions"**

### 5. After Making Changes

Once you've verified all settings are correct:

```bash
# Clear any cached tokens
rm -rf ~/.IdentityService ~/.msal_token_cache.bin ~/.azure ~/.msal

# Run the app
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial
npx ts-node index.ts
```

## Common Issues

### "Application not found" error

This usually means:
- The app is not configured as multi-tenant (`signInAudience` must be `AzureADandPersonalMicrosoftAccount`)
- You're using the wrong tenant ID in the code

### "Public client flows not allowed" error

This means:
- "Allow public client flows" is not enabled in Authentication settings

### "Tenant-identifying information" error

This means:
- The `signInAudience` setting is wrong in the Manifest

## Need to Start Over?

If you want to create a new app registration:

1. Go to https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Click "+ New registration"
3. Name: anything
4. **IMPORTANT**: Select **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"**
5. Redirect URI: LEAVE BLANK
6. Click "Register"
7. Copy the new client ID
8. Follow steps 3-4 above

Then update `appSettings.ts` with the new client ID.

---

## Quick Test

After fixing the settings, test if your client ID works:

```bash
curl -s -X POST "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=a4a4b111-3db0-4832-ae7c-d6f2447144a0&scope=user.read" | python3 -m json.tool
```

**Success looks like:**
```json
{
  "user_code": "ABC12345",
  "device_code": "...",
  "verification_uri": "https://microsoft.com/devicelogin",
  "message": "To sign in, use a web browser..."
}
```

**Failure looks like:**
```json
{
  "error": "unauthorized_client",
  "error_description": "..."
}
```
