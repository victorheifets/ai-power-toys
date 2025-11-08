// Simple authentication test without interactive menu
import { DeviceCodeInfo } from '@azure/identity';
import settings from './appSettings';
import * as graphHelper from './graphHelper';

async function main() {
  console.log('=== Microsoft Graph API Authentication Test ===\n');

  // Initialize Graph
  console.log('Initializing Graph with device code authentication...');
  graphHelper.initializeGraphForUserAuth(settings, (info: DeviceCodeInfo) => {
    console.log('\n' + '='.repeat(60));
    console.log('AUTHENTICATION REQUIRED');
    console.log('='.repeat(60));
    console.log(info.message);
    console.log('='.repeat(60) + '\n');
  });

  try {
    console.log('Attempting to get user information...\n');
    const user = await graphHelper.getUserAsync();

    console.log('✓ Authentication successful!\n');
    console.log('User Details:');
    console.log('  Name:', user?.displayName);
    console.log('  Email:', user?.mail ?? user?.userPrincipalName);
    console.log('\nAuthentication test completed successfully!');

  } catch (err: any) {
    console.error('✗ Authentication failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure you completed the device code authentication in your browser');
    console.error('  2. Check that you granted the requested permissions');
    console.error('  3. Verify your Microsoft account has access to the application');
    process.exit(1);
  }
}

main();
