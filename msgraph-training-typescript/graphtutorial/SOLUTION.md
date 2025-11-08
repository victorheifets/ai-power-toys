# Microsoft Graph API Tutorial - Solution Summary

## What I Found

1. **TTY Issue**: The application uses `readline-sync` for interactive menus, which requires a real terminal (TTY). My automated environment doesn't have TTY access, so I can't run the interactive application.

2. **Version Issue Fixed**: I downgraded `@azure/identity` from v4.13.0 (installed by `npm audit fix`) back to v2.1.0 (the version the tutorial was written for). Version 4 has breaking API changes.

3. **Authentication Issue**: The application shows `undefined` for the device code message and fails with `invalid_grant` error. This appears to be because:
   - There may be stale cached credentials from previous auth attempts
   - The device code callback isn't getting proper data (possibly due to the client ID or auth flow)

## What YOU Need To Do

Since this application requires YOUR Microsoft account credentials for authentication, YOU need to run it:

### Step 1: Run the application

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial
npx ts-node index.ts
```

### Step 2: Complete Device Code Authentication

When you run it, you should see a message like:

```
To sign in, use a web browser to open the page https://microsoft.com/devicelogin
and enter the code XXXXXXXX to authenticate.
```

**You MUST**:
1. Open that URL in your browser
2. Enter the code shown
3. Sign in with your Microsoft account (personal or work/school)
4. Grant the requested permissions (user.read, mail.read, mail.send)
5. Return to the terminal

### Step 3: If you see "undefined" or errors

If the device code message shows as "undefined" or you get `invalid_grant` errors:

**Try this alternative approach** - Create your own app registration:

1. Go to [Azure Portal App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Name: "Graph Tutorial Test"
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: Leave blank
6. Click "Register"
7. Copy the "Application (client) ID"
8. Go to "Authentication" → "Advanced settings" → Enable "Allow public client flows" → Save
9. Go to "API permissions" → Add permissions → Microsoft Graph → Delegated → Add:
   - User.Read
   - Mail.Read
   - Mail.Send
10. Click "Grant admin consent" (if you have permission)

Then update `appSettings.ts`:

```typescript
const settings: AppSettings = {
  'clientId': 'YOUR-NEW-CLIENT-ID',  // Paste your client ID here
  'tenantId': 'common',
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};
```

Run the application again with your new client ID.

## Why I Couldn't Run It For You

1. **TTY Requirement**: The application needs interactive terminal input (menu selections)
2. **Personal Authentication**: Device code authentication requires YOUR browser and YOUR Microsoft account
3. **No Automation Possible**: Microsoft's device code flow is designed to prevent automation - a human must complete it

## Application Features (Once Running)

Once authenticated successfully, you can:

- **[1] Display access token**: Shows your OAuth access token
- **[2] List my inbox**: Shows your 25 most recent emails
- **[3] Send mail**: Sends a test email to yourself
- **[4] Make a Graph call**: Playground for custom Graph API calls

## Files I Created

- `test_auth.ts` - Non-interactive authentication test
- `debug_auth.ts` - Debug script to see authentication details
- `clear_cache.sh` - Script to clear Azure auth cache
- `README_AUTH_FIX.md` - Authentication troubleshooting guide
- `SOLUTION.md` - This file

## Current State

- ✅ Dependencies installed (297 packages)
- ✅ @azure/identity downgraded to v2.1.0 (compatible version)
- ✅ Auth cache cleared
- ⏳ Waiting for YOU to complete device code authentication

## Next Steps

Just run `npx ts-node index.ts` and complete the authentication in your browser!
