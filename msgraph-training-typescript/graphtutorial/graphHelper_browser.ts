// Alternative graphHelper using InteractiveBrowserCredential
// This works better with Conditional Access Policies

import 'isomorphic-fetch';
import { InteractiveBrowserCredential } from '@azure/identity';
import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { User, Message } from '@microsoft/microsoft-graph-types';
import { TokenCredentialAuthenticationProvider } from
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

import { AppSettings } from './appSettings';

let _settings: AppSettings | undefined = undefined;
let _browserCredential: InteractiveBrowserCredential | undefined = undefined;
let _userClient: Client | undefined = undefined;

export function initializeGraphForUserAuth(settings: AppSettings) {
  // Ensure settings isn't null
  if (!settings) {
    throw new Error('Settings cannot be undefined');
  }

  _settings = settings;

  // Use InteractiveBrowserCredential instead of DeviceCodeCredential
  // This opens a real browser window and works better with Conditional Access
  _browserCredential = new InteractiveBrowserCredential({
    clientId: settings.clientId,
    tenantId: settings.tenantId,
    redirectUri: 'http://localhost:3200'  // Local redirect for Node.js
  });

  const authProvider = new TokenCredentialAuthenticationProvider(_browserCredential, {
    scopes: settings.graphUserScopes
  });

  _userClient = Client.initWithMiddleware({
    authProvider: authProvider
  });
}

export async function getUserTokenAsync(): Promise<string> {
  // Ensure credential isn't undefined
  if (!_browserCredential) {
    throw new Error('Graph has not been initialized for user auth');
  }

  // Ensure scopes isn't undefined
  if (!_settings?.graphUserScopes) {
    throw new Error('Setting "scopes" cannot be undefined');
  }

  // Request token with given scopes
  const response = await _browserCredential.getToken(_settings?.graphUserScopes);
  return response.token;
}

export async function getUserAsync(): Promise<User> {
  // Ensure client isn't undefined
  if (!_userClient) {
    throw new Error('Graph has not been initialized for user auth');
  }

  return _userClient.api('/me')
    // Only request specific properties
    .select(['displayName', 'mail', 'userPrincipalName'])
    .get();
}

export async function getInboxAsync(): Promise<PageCollection> {
  // Ensure client isn't undefined
  if (!_userClient) {
    throw new Error('Graph has not been initialized for user auth');
  }

  return _userClient.api('/me/mailFolders/inbox/messages')
    .select(['from', 'isRead', 'receivedDateTime', 'subject'])
    .top(25)
    .orderby('receivedDateTime DESC')
    .get();
}

export async function sendMailAsync(subject: string, body: string, recipient: string) {
  // Ensure client isn't undefined
  if (!_userClient) {
    throw new Error('Graph has not been initialized for user auth');
  }

  // Create a new message
  const message: Message = {
    subject: subject,
    body: {
      content: body,
      contentType: 'text'
    },
    toRecipients: [
      {
        emailAddress: {
          address: recipient
        }
      }
    ]
  };

  // Send the message
  return _userClient.api('me/sendMail')
    .post({
      message: message
    });
}

export async function makeGraphCallAsync() {
  // INSERT YOUR CODE HERE
}
