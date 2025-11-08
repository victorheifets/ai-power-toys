// Test browser-based authentication to bypass Conditional Access
import settings from './appSettings';
import * as graphHelperBrowser from './graphHelper_browser';

async function main() {
  console.log('=== Testing Browser-Based Authentication ===\n');
  console.log('This will open a browser window for authentication.');
  console.log('Sign in with your Merck account (heifets@merck.com)\n');

  // Initialize Graph with browser credential
  console.log('Initializing Graph with InteractiveBrowserCredential...');
  graphHelperBrowser.initializeGraphForUserAuth(settings);

  try {
    console.log('Opening browser for authentication...\n');

    // Attempt to get user information
    // This will trigger the browser to open
    const user = await graphHelperBrowser.getUserAsync();

    console.log('\n✅ SUCCESS! Authentication worked!\n');
    console.log('User Details:');
    console.log('  Name:', user?.displayName);
    console.log('  Email:', user?.mail ?? user?.userPrincipalName);
    console.log('\n🎉 Browser-based auth bypassed Conditional Access!\n');

  } catch (err: any) {
    console.error('\n❌ Authentication failed:', err.message);
    console.error('\nPossible reasons:');
    console.error('  1. Redirect URI not added to app (http://localhost:3200)');
    console.error('  2. Conditional Access still blocks (requires managed device/location)');
    console.error('  3. Port 3200 is already in use');
    console.error('\nSee SWITCH_TO_BROWSER_AUTH.md for troubleshooting\n');
  }
}

main();
