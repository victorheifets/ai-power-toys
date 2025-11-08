# How to Register Your Own Microsoft Graph App

## Problem Identified

The tutorial's client ID `2c96ebe0-9e51-4575-9845-54570dc90abd` is **NO LONGER VALID**.

Error from Azure: `AADSTS700016: Application with identifier was not found in the directory`

You must create your own app registration to use this tutorial.

## Step-by-Step: Create Your App Registration

### 1. Go to Azure Portal

Open: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

(You can use any Microsoft account - personal or work/school)

### 2. Create New Registration

Click **"+ New registration"**

Fill in:
- **Name**: `Graph Tutorial Test` (or any name you like)
- **Supported account types**: Select **"Accounts in any organizational directory and personal Microsoft accounts (Multi-tenant)"**
- **Redirect URI**: Leave BLANK (not needed for device code flow)

Click **"Register"**

### 3. Copy Your Client ID

On the app's Overview page, you'll see:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**COPY THIS!** You'll need it in step 6.

### 4. Enable Public Client Flow

1. In the left menu, click **"Authentication"**
2. Scroll down to **"Advanced settings"**
3. Find **"Allow public client flows"**
4. Toggle it to **"Yes"**
5. Click **"Save"** at the top

### 5. Add API Permissions

1. In the left menu, click **"API permissions"**
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"**
5. Search for and check these permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.Send`
6. Click **"Add permissions"**

**Optional**: If you have admin rights, click **"Grant admin consent for [Your Org]"**

### 6. Update Your Code

Edit `appSettings.ts` and replace the client ID:

```typescript
const settings: AppSettings = {
  'clientId': 'YOUR-NEW-CLIENT-ID-HERE',  // ← Paste your client ID from step 3
  'tenantId': 'common',
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};

export default settings;
```

### 7. Run the Application

```bash
npx ts-node index.ts
```

This time, you should see a proper device code URL and code!

## What if I Don't Want to Register an App?

You can also use Microsoft's official Graph Explorer app:

Edit `appSettings.ts`:

```typescript
const settings: AppSettings = {
  'clientId': 'de8bc8b5-d9f9-48b1-a8ad-b748da725064',  // Graph Explorer client ID
  'tenantId': 'common',
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};
```

This is Microsoft's Graph Explorer client ID which should work, but it's better to use your own.

## Troubleshooting

### "Permissions not granted" error

If you see a consent error:
1. Go back to API permissions in Azure Portal
2. Click "Grant admin consent"
3. Try authenticating again

### "Invalid tenant" error

Try changing `tenantId` in `appSettings.ts`:
- For personal Microsoft accounts: `'consumers'`
- For work/school accounts: `'organizations'`
- For both (recommended): `'common'`

### Still not working?

Run this diagnostic:

```bash
npx ts-node fresh_auth.ts
```

This will show detailed information about what's happening during authentication.

## Summary

1. ✅ Register app in Azure Portal
2. ✅ Copy your new client ID
3. ✅ Enable public client flows
4. ✅ Add API permissions
5. ✅ Update `appSettings.ts` with your client ID
6. ✅ Run `npx ts-node index.ts`
7. ✅ Complete device code authentication in your browser

That's it! The app will work once you use your own valid client ID.
