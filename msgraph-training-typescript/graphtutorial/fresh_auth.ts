// Force fresh authentication with explicit token cache disabled
import { DeviceCodeCredential } from '@azure/identity';
import settings from './appSettings';

async function main() {
  console.log('=== Fresh Authentication Test ===\n');
  console.log('Client ID:', settings.clientId);
  console.log('Tenant:', settings.tenantId);
  console.log('Scopes:', settings.graphUserScopes.join(', '));
  console.log('\n');

  // Create credential
  const credential = new DeviceCodeCredential({
    clientId: settings.clientId,
    tenantId: settings.tenantId,
    userPromptCallback: (info) => {
      console.log('\n' + '='.repeat(70));
      console.log('DEVICE CODE AUTHENTICATION');
      console.log('='.repeat(70));

      console.log('\nCallback invoked!');
      console.log('Info object:', JSON.stringify(info, null, 2));

      if (info && info.verificationUri && info.userCode) {
        console.log('\n📱 STEPS TO AUTHENTICATE:\n');
        console.log(`1. Open this URL in your browser:`);
        console.log(`   ${info.verificationUri}\n`);
        console.log(`2. Enter this code:`);
        console.log(`   ${info.userCode}\n`);
        console.log(`3. Sign in with your Microsoft account`);
        console.log(`4. Grant the requested permissions\n`);
        console.log('Waiting for you to complete authentication...\n');
      } else {
        console.log('\n⚠️  WARNING: Device code info is incomplete!');
        console.log('This might indicate a problem with the client ID or Azure AD configuration.\n');
      }

      console.log('='.repeat(70) + '\n');
    }
  });

  try {
    console.log('🔄 Requesting access token...\n');

    const token = await credential.getToken(settings.graphUserScopes);

    console.log('\n✅ SUCCESS! Authentication completed!');
    console.log('Token acquired, expires:', new Date(token.expiresOnTimestamp).toLocaleString());
    console.log('\nYou can now run: npx ts-node index.ts');

  } catch (err: any) {
    console.error('\n❌ FAILED! Authentication error:');
    console.error('Message:', err.message);
    console.error('Name:', err.name);
    console.error('Code:', err.code);

    console.log('\n🔍 Troubleshooting:');
    console.log('1. The client ID might be invalid or expired');
    console.log('2. You might need to register your own app in Azure Portal');
    console.log('3. Check your internet connection');
    console.log('4. Try using a different tenant ID (e.g., "consumers" for personal accounts)');

    process.exit(1);
  }
}

main();
