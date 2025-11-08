# Fix Merck Organization Restriction

## The Problem

Your Merck account (`heifets@merck.com`) has organizational policies blocking the app.

Error: "Your sign-in was successful but does not meet the criteria to access this resource."

## Solution A: Make App Multi-Tenant (Use Personal Account)

This allows you to use a personal Microsoft account instead of your Merck account.

### 1. Go to Azure Portal Manifest

https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Manifest/appId/a4a4b111-3db0-4832-ae7c-d6f2447144a0

### 2. Edit the Manifest

Find this line (around line 80):
```json
"signInAudience": "AzureADMyOrg",
```

Change it to:
```json
"signInAudience": "AzureADandPersonalMicrosoftAccount",
```

Click **"Save"** at the top.

### 3. Update Your Code

I'll update `appSettings.ts` to use "common" tenant again, which works with both personal and work accounts.

### 4. Sign In With Personal Account

When you run the app:
- Use a **personal Microsoft account** (outlook.com, hotmail.com, live.com)
- NOT your Merck account

## Solution B: Get Admin Consent (Keep Using Merck Account)

If you want to keep using your Merck account, you need admin approval.

### Option B1: Request Admin Consent Yourself

1. Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/a4a4b111-3db0-4832-ae7c-d6f2447144a0

2. Click **"Grant admin consent for [Your Organization]"**

3. If you see "Need admin approval", you need to contact IT.

### Option B2: Contact Merck IT

Email your IT admin:

```
Subject: Admin Consent Request for Microsoft Graph Application

Hi IT Team,

I need admin consent for a Microsoft Graph application I registered for development/testing purposes.

Application Details:
- Application (client) ID: a4a4b111-3db0-4832-ae7c-d6f2447144a0
- Application Name: [Your App Name]
- Required Permissions:
  - User.Read (Read user profile)
  - Mail.Read (Read user mail)
  - Mail.Send (Send mail as user)

This is for learning/testing the Microsoft Graph API tutorial.

Please grant admin consent or let me know the process to get approval.

Thank you!
```

## Solution C: Create New App in Personal Tenant

If you have a personal Microsoft account, you can:

1. Sign in to Azure Portal with your **personal account** (not Merck)
2. Create a NEW app registration there
3. That app won't have any organizational restrictions

This is the cleanest solution if you're just learning/testing.

## Which Solution Should You Choose?

**For Learning/Testing (Recommended):**
- Solution A or C: Use personal account - No admin approval needed

**For Work Use:**
- Solution B: Get admin consent - Proper for company data access

---

Let me know which solution you want to use and I'll help you through it!
