# Switch to Browser-Based Authentication

## Why This Fixes Your Problem

**Device Code Flow** → Blocked by Conditional Access (Azure doesn't know your device)
**Browser Flow** → ✅ Works with Conditional Access (Azure sees your real browser/device)

## Step 1: Add Redirect URI to Your App

1. Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Authentication/appId/a4a4b111-3db0-4832-ae7c-d6f2447144a0

2. Click **"+ Add a platform"**

3. Select **"Mobile and desktop applications"**

4. In the "Custom redirect URIs" section, add:
   ```
   http://localhost:3200
   ```

5. Check the box for **"Allow public client flows"** (should already be enabled)

6. Click **"Configure"**

## Step 2: Test Browser Authentication

I've created a test script. Run this:

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial
npx ts-node test_browser_auth.ts
```

**What will happen:**
1. A browser window will open automatically
2. Sign in with your **heifets@merck.com** account
3. Grant permissions
4. Browser shows success message
5. Terminal continues and shows your user info

## Step 3: If It Works, Update Main App

If the test works, I can update the main `index.ts` to use browser auth instead of device code.

## Why This Should Work

- ✅ Real browser = Azure AD knows your device
- ✅ Can satisfy device compliance policies
- ✅ Can use Managed/Corporate devices
- ✅ Conditional Access sees all the context it needs

## Troubleshooting

### Browser doesn't open?

Check if port 3200 is available:
```bash
lsof -i :3200
```

If it's in use, we can change the port.

### Still blocked?

If you're still blocked, it means Merck's Conditional Access specifically requires:
- Managed/Intune-enrolled device
- Specific location/IP
- Multi-factor authentication

In that case, you'd need to contact IT.

---

**Ready?** Add the redirect URI in Azure Portal, then run the test!
