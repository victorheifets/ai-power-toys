# Authentication Issue Fix

## Problem
The application is showing `invalid_grant` error because of stale cached credentials.

## Solution

### Step 1: Clear the authentication cache

Run the following commands in your terminal:

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial

# Clear Azure authentication cache
rm -rf ~/.IdentityService
rm -rf ~/.msal_token_cache.bin
rm -rf ~/.azure
rm -rf ~/.msal

# Or use the provided script
bash clear_cache.sh
```

### Step 2: Run the application

```bash
npx ts-node index.ts
```

### Step 3: Complete device code authentication

When you run the application, you should see a message like:

```
To sign in, use a web browser to open the page https://microsoft.com/devicelogin
and enter the code XXXXXXXX to authenticate.
```

**Important**: You must:
1. Open the URL in your browser
2. Enter the code shown
3. Sign in with your Microsoft account
4. Grant permissions to the application
5. Return to the terminal - the app will continue automatically

## Why this happens

The `@azure/identity` library caches authentication tokens. If:
- The tokens expired
- The cached tokens were from a different client ID
- The authentication was incomplete

You'll get an `invalid_grant` error. Clearing the cache forces a fresh authentication.

## Alternative: Check if tokens exist

```bash
ls -la ~ | grep -E "(\.azure|\.msal|\.Identity)"
```

If you see these directories, they contain cached authentication data.

## After successful authentication

Once you successfully authenticate:
- Tokens will be cached
- You won't need to authenticate again for ~1 hour
- The application will work normally
