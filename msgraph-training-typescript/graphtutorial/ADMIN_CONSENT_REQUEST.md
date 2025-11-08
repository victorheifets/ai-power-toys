# Admin Consent Request for Merck IT

---

**Subject:** Admin Consent Request for Microsoft Graph Learning Application

**To:** Merck IT Help Desk / Azure AD Administrators

**From:** heifets@merck.com

---

## Request

I need admin consent for a Microsoft Graph API learning/development application that I registered in our Azure tenant.

## Application Details

- **Application Name:** AI Power Toys
- **Application (Client) ID:** `a4a4b111-3db0-4832-ae7c-d6f2447144a0`
- **Directory (Tenant) ID:** `a00de4ec-48a8-43a6-be74-e31274e2060d`
- **Purpose:** Learning Microsoft Graph API (following official Microsoft tutorial)
- **Application Type:** Single-tenant, registered in our Merck tenant

## Permissions Requested

All permissions are **Delegated** (user context only, NOT app-only):

1. **User.Read** - Read the signed-in user's profile
2. **Mail.Read** - Read the signed-in user's mail
3. **Mail.Send** - Send mail as the signed-in user

## Why These Permissions?

This is a learning/development application following Microsoft's official Graph API tutorial:
https://learn.microsoft.com/en-us/graph/tutorials/typescript

The application allows me to:
- Read my own profile
- Read my own emails
- Send emails from my own account

**Important:** These are delegated permissions - the app can ONLY access MY data, not other users' data.

## Admin Consent URL

For your convenience, here's the direct admin consent URL:

```
https://login.microsoftonline.com/a00de4ec-48a8-43a6-be74-e31274e2060d/adminconsent?client_id=a4a4b111-3db0-4832-ae7c-d6f2447144a0
```

Or you can grant consent via Azure Portal:
1. Go to Azure Portal → Enterprise Applications
2. Search for "AI Power Toys" or client ID `a4a4b111-3db0-4832-ae7c-d6f2447144a0`
3. Go to Permissions → Grant admin consent

## Additional Context

- This is for learning/professional development
- Application is single-tenant (only accessible within Merck)
- All permissions are standard Microsoft Graph delegated permissions
- No sensitive scopes or elevated privileges requested

Please let me know if you need any additional information or if there's a specific process I should follow.

Thank you!

---

**Alternative:** If this requires a formal approval process, please let me know the steps.
