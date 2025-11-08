# ⚡ Quick Setup - Register Your App (5 Minutes)

## Why You Need This

Both client IDs in the tutorial are INVALID:
- Original tutorial ID: **DELETED/EXPIRED** ❌
- Graph Explorer ID: **Not configured for your tenant** ❌

**You MUST register your own app to use this tutorial.**

## ⚡ 5-Minute Setup

### Step 1: Go to Azure Portal (No Login Needed Yet!)

Open: https://portal.azure.com

Sign in with ANY Microsoft account:
- Personal account (outlook.com, hotmail.com, live.com)
- Work/School account

### Step 2: Navigate to App Registrations

Once logged in, use the search bar at the top and search for:
```
App registrations
```

Click on "App registrations" service.

### Step 3: Create New App

Click the **"+ New registration"** button at the top.

Fill in EXACTLY as shown:

**Name**: `Graph Tutorial` (or any name)

**Supported account types**: Select the **SECOND option**:
```
✓ Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)
```

**Redirect URI**: LEAVE BLANK (don't fill anything)

Click **"Register"** button at the bottom.

### Step 4: Copy Your Client ID

You'll see a page with app details. Find this field:

```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Click the copy icon** next to it. This is your new client ID!

### Step 5: Enable Device Code Flow

In the left sidebar, click **"Authentication"**

Scroll down to find **"Advanced settings"** section

Find **"Allow public client flows"**: Toggle it to **YES**

Click **"Save"** at the top of the page

### Step 6: Add Permissions

In the left sidebar, click **"API permissions"**

You'll see "Microsoft Graph" with "User.Read" already there.

Click **"+ Add a permission"**

1. Click **"Microsoft Graph"**
2. Click **"Delegated permissions"**
3. Use the search box to find and CHECK:
   - `Mail.Read`
   - `Mail.Send`
4. Click **"Add permissions"** at the bottom

Your permissions list should now show:
- User.Read
- Mail.Read
- Mail.Send

### Step 7: Update Your Code

Open the file:
```
/Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/appSettings.ts
```

Replace the `clientId` with YOUR new client ID:

```typescript
const settings: AppSettings = {
  'clientId': 'YOUR-CLIENT-ID-HERE',  // ← PASTE YOUR CLIENT ID FROM STEP 4
  'tenantId': 'common',
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};
```

Save the file.

### Step 8: Run It!

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial
npx ts-node index.ts
```

You should now see:

```
TypeScript Graph Tutorial
To sign in, use a web browser to open the page https://microsoft.com/devicelogin
and enter the code ABC12345 to authenticate.
```

### Step 9: Authenticate

1. Open https://microsoft.com/devicelogin in your browser
2. Enter the code shown
3. Sign in with YOUR Microsoft account
4. Click "Accept" when asked for permissions
5. Return to terminal - app will continue!

## That's It!

The app will now work perfectly. You only need to authenticate once - the token is cached for about 1 hour.

## Troubleshooting

### "undefined" still showing?

Make sure you saved `appSettings.ts` with your new client ID.

### "invalid_grant" error?

Your client ID might be wrong. Double-check you copied it correctly from Azure Portal.

### Can't access Azure Portal?

You need a Microsoft account. Create one for free:
- Personal: https://signup.live.com
- Developer (includes Azure): https://developer.microsoft.com/microsoft-365/dev-program

### Need help?

Run this diagnostic:
```bash
npx ts-node debug_auth.ts
```

This will show what's happening during authentication.

---

**Total time: ~5 minutes**

Once you have your own client ID, the tutorial will work perfectly! 🎉
