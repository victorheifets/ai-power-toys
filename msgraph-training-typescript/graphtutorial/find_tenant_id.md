# Find Your Tenant ID

Since your app is configured as **single tenant**, you need to use your specific tenant ID instead of "common".

## Quick Way - From Azure Portal

1. Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/a4a4b111-3db0-4832-ae7c-d6f2447144a0

2. On the **Overview** page, you'll see:

```
Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Copy this tenant ID!**

## Update Your Code

Once you have your tenant ID, update `appSettings.ts`:

```typescript
const settings: AppSettings = {
  'clientId': 'a4a4b111-3db0-4832-ae7c-d6f2447144a0',
  'tenantId': 'YOUR-TENANT-ID-HERE',  // ← Paste your Directory (tenant) ID here
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};
```

## Then Run

```bash
npx ts-node index.ts
```

## Alternative: Use Domain Name

Instead of the GUID, you can also use your tenant domain name if you know it:
- For work/school accounts: `'yourcompany.onmicrosoft.com'`
- For personal accounts: This won't work, you'd need the GUID

## If You Don't Have Access to Azure Portal

Tell me your tenant ID and I'll update the code for you!
