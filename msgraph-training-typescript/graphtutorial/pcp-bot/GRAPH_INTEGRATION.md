# Microsoft Graph Integration for Auto Email Detection

This guide shows how to eliminate the need for `/set-email` command by automatically detecting user emails from Azure Active Directory.

## Overview

When a user interacts with the bot in Teams, we can:
1. Get their AAD Object ID from `context.activity.from.aadObjectId`
2. Use Microsoft Graph API to query their email
3. Cache it for future use

## Step 1: Add Dependencies

```bash
npm install @microsoft/microsoft-graph-client isomorphic-fetch
npm install --save-dev @types/microsoft-graph
```

## Step 2: Update package.json

Add to dependencies in `package.json`:

```json
{
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "isomorphic-fetch": "^3.0.0"
  },
  "devDependencies": {
    "@types/microsoft-graph": "^1.43.0"
  }
}
```

## Step 3: Create Graph Service

Create `src/services/graphService.ts`:

```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import 'isomorphic-fetch';

export interface GraphConfig {
    appId: string;
    appPassword: string;
    tenantId: string;
}

export class GraphService {
    private config: GraphConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(config: GraphConfig) {
        this.config = config;
    }

    /**
     * Get an app-only access token using client credentials flow
     */
    private async getAccessToken(): Promise<string> {
        // Check if token is still valid (with 5 min buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        try {
            const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

            const params = new URLSearchParams();
            params.append('client_id', this.config.appId);
            params.append('client_secret', this.config.appPassword);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('grant_type', 'client_credentials');

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return this.accessToken;
        } catch (error) {
            console.error('Error getting Graph access token:', error);
            throw new Error('Failed to acquire Graph access token');
        }
    }

    /**
     * Get user email by AAD Object ID
     */
    async getUserEmail(aadObjectId: string): Promise<string | null> {
        try {
            const token = await this.getAccessToken();

            const client = Client.init({
                authProvider: (done) => {
                    done(null, token);
                }
            });

            const user = await client.api(`/users/${aadObjectId}`)
                .select('mail,userPrincipalName,displayName')
                .get();

            // Prefer mail, fall back to userPrincipalName
            return user.mail || user.userPrincipalName || null;
        } catch (error) {
            console.error(`Error fetching user email for ${aadObjectId}:`, error);
            return null;
        }
    }

    /**
     * Get multiple users' emails in batch
     */
    async getUserEmails(aadObjectIds: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>();

        try {
            const token = await this.getAccessToken();

            const client = Client.init({
                authProvider: (done) => {
                    done(null, token);
                }
            });

            // Use $batch for efficiency
            const batchRequest = {
                requests: aadObjectIds.map((id, index) => ({
                    id: index.toString(),
                    method: 'GET',
                    url: `/users/${id}?$select=mail,userPrincipalName`
                }))
            };

            const batchResponse = await client.api('/$batch').post(batchRequest);

            for (const response of batchResponse.responses) {
                if (response.status === 200) {
                    const user = response.body;
                    const email = user.mail || user.userPrincipalName;
                    if (email) {
                        const originalId = aadObjectIds[parseInt(response.id)];
                        result.set(originalId, email);
                    }
                }
            }
        } catch (error) {
            console.error('Error batch fetching user emails:', error);
        }

        return result;
    }
}

// Singleton instance
let graphServiceInstance: GraphService | null = null;

export function initGraphService(config: GraphConfig): GraphService {
    graphServiceInstance = new GraphService(config);
    return graphServiceInstance;
}

export function getGraphService(): GraphService | null {
    return graphServiceInstance;
}
```

## Step 4: Initialize Graph Service

Update `src/index.ts` to initialize Graph service:

```typescript
import { initGraphService } from './services/graphService';

// In initializeServices() function, add:
if (process.env.MicrosoftAppId && process.env.MicrosoftAppPassword && process.env.MicrosoftAppTenantId) {
    initGraphService({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword,
        tenantId: process.env.MicrosoftAppTenantId
    });
    console.log('✅ Graph service initialized');
} else {
    console.log('⚠️  Graph service not configured (set MicrosoftAppId, MicrosoftAppPassword, MicrosoftAppTenantId)');
}
```

## Step 5: Update EnhancedBot to Use Graph

Update `src/enhancedBot.ts`:

```typescript
import { getGraphService } from './services/graphService';

export class EnhancedPCPBot extends ActivityHandler {
    // ... existing code ...

    /**
     * Get user's email automatically from AAD
     */
    private async getUserEmail(context: TurnContext): Promise<string> {
        const userData: UserData = await this.userDataAccessor.get(context, {});

        // Check if email already cached
        if (userData.adoEmail) {
            return userData.adoEmail;
        }

        // Get user's AAD object ID from Teams context
        const aadObjectId = context.activity.from.aadObjectId;

        if (aadObjectId) {
            const graphService = getGraphService();
            if (graphService) {
                try {
                    const email = await graphService.getUserEmail(aadObjectId);

                    if (email) {
                        // Cache it
                        userData.adoEmail = email;
                        await this.userDataAccessor.set(context, userData);
                        await this.userState.saveChanges(context);

                        console.log(`✅ Auto-detected email for user ${context.activity.from.name}: ${email}`);
                        return email;
                    }
                } catch (error) {
                    console.error('Error fetching user email from Graph:', error);
                }
            }
        }

        // Fallback: use display name or ask user to set email
        const fallback = context.activity.from.name || context.activity.from.id;
        console.warn(`⚠️  Could not auto-detect email for user ${fallback}`);
        return fallback;
    }

    // Update handleStandupCommand to use getUserEmail
    private async handleStandupCommand(context: TurnContext) {
        try {
            const userEmail = await this.getUserEmail(context);
            await context.sendActivity(`Fetching work items for: ${userEmail}`);

            // ... rest of the code ...
        }
    }

    // Update handleEODCommand similarly
    private async handleEODCommand(context: TurnContext) {
        try {
            const userEmail = await this.getUserEmail(context);
            // ... rest of the code ...
        }
    }

    // Keep /set-email as a fallback for manual override
    private async setUserEmail(context: TurnContext, text: string) {
        const parts = text.split(' ');

        if (parts.length < 2) {
            await context.sendActivity('Usage: `/set-email your.email@company.com`\n\nNote: The bot will try to auto-detect your email, but you can use this to override it.');
            return;
        }

        const email = parts[1];
        const userData: UserData = await this.userDataAccessor.get(context, {});
        userData.adoEmail = email;
        await this.userDataAccessor.set(context, userData);
        await this.userState.saveChanges(context);

        await context.sendActivity(`✅ Set your ADO email to: ${email}`);
    }
}
```

## Step 6: Update .env

Add tenant ID to `.env`:

```env
MicrosoftAppTenantId=YOUR_TENANT_ID
```

To find your tenant ID:
```bash
az account show --query tenantId -o tsv
```

## Step 7: Configure Azure AD Permissions

In Azure Portal > App Registrations > Your Bot App:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Add: `User.Read.All` or `User.ReadBasic.All`
6. Click **Grant admin consent for [Your Organization]**

**Important**: Application permissions require admin consent.

## Step 8: Test

Rebuild and redeploy:

```bash
npm run build
# Deploy to Azure (see DEPLOYMENT.md)
```

Test in Teams:
1. Start a conversation with the bot
2. Type `standup` (no need for `/set-email` anymore!)
3. The bot should automatically detect your email

## Troubleshooting

### "Insufficient privileges to complete the operation"

- Ensure `User.Read.All` permission is added
- Ensure admin consent is granted
- Check that you're using **Application permissions**, not Delegated

### "aadObjectId is undefined"

- This happens in Bot Framework Emulator (not a real Teams context)
- In production Teams, `aadObjectId` is always available
- Fallback to `/set-email` for testing

### Token acquisition fails

- Verify `MicrosoftAppPassword` is correct
- Verify `MicrosoftAppTenantId` is correct
- Check App Registration has client secret that's not expired

## Alternative: Use Bot Framework Token Service

For a more robust solution, use Bot Framework's built-in OAuth:

1. Configure OAuth connection in Azure Bot
2. Use `OAuthPrompt` to get user token
3. Use delegated permissions (User.Read) instead of app permissions

This allows the bot to act on behalf of the user, but requires users to sign in once.

## Performance Considerations

- **Caching**: User emails are cached in `userState` after first lookup
- **Batch API**: Use `getUserEmails()` for bulk operations
- **Token caching**: Access token is cached and reused until expiry

## Security Considerations

- **Least privilege**: Use `User.ReadBasic.All` if you only need email
- **Token storage**: Tokens are kept in memory, not persisted
- **Audit logs**: Graph API calls are logged in Azure AD audit logs

## Next Steps

- ✅ Users no longer need `/set-email`
- Consider adding a `/reset-email` command to clear cache
- Monitor Graph API usage in Azure portal
- Consider rate limiting if bot is used by many users simultaneously
