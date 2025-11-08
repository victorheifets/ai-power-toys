// Debug authentication to see what's happening
import { DeviceCodeCredential, DeviceCodeInfo } from '@azure/identity';
import settings from './appSettings';

async function main() {
  console.log('=== Device Code Authentication Debug ===\n');
  console.log('Client ID:', settings.clientId);
  console.log('Tenant ID:', settings.tenantId);
  console.log('Scopes:', settings.graphUserScopes);
  console.log('\n');

  const credential = new DeviceCodeCredential({
    clientId: settings.clientId,
    tenantId: settings.tenantId,
    userPromptCallback: (info: DeviceCodeInfo) => {
      console.log('--- Device Code Info Object ---');
      console.log('Full object:', JSON.stringify(info, null, 2));
      console.log('Message property:', info.message);
      console.log('User code:', info.userCode);
      console.log('Verification URI:', info.verificationUri);
      console.log('-------------------------------\n');

      // Manually construct the message if needed
      if (info.verificationUri && info.userCode) {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║          DEVICE CODE AUTHENTICATION REQUIRED            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        console.log('  1. Open this URL in your browser:');
        console.log(`     ${info.verificationUri}\n`);
        console.log('  2. Enter this code:');
        console.log(`     ${info.userCode}\n`);
        console.log('  3. Sign in with your Microsoft account\n');
        console.log('  Waiting for authentication...\n');
      }
    }
  });

  try {
    console.log('Requesting token...\n');
    const token = await credential.getToken(settings.graphUserScopes);
    console.log('\n✓ Authentication successful!');
    console.log('Token received, expires:', new Date(token.expiresOnTimestamp));
  } catch (err: any) {
    console.error('\n✗ Authentication failed:', err.message);
    console.error('Error type:', err.name);
    console.error('Error code:', err.code);
  }
}

main();
