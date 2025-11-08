// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// <SettingsSnippet>
const settings: AppSettings = {
  // Your registered app client ID
  'clientId': 'a4a4b111-3db0-4832-ae7c-d6f2447144a0',
  'tenantId': 'a00de4ec-48a8-43a6-be74-e31274e2060d',
  'graphUserScopes': [
    'user.read',
    'mail.read',
    'mail.send'
  ]
};

export interface AppSettings {
  clientId: string;
  tenantId: string;
  graphUserScopes: string[];
}

export default settings;
// </SettingsSnippet>
