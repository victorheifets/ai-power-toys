// Check if the client ID is valid by querying Azure AD
import https from 'https';
import settings from './appSettings';

async function checkClientId() {
  console.log('=== Checking Client ID Configuration ===\n');
  console.log('Client ID:', settings.clientId);
  console.log('Tenant:', settings.tenantId);
  console.log('\n');

  // Try to initiate a device code flow to see if the client ID is valid
  const data = JSON.stringify({
    client_id: settings.clientId,
    scope: settings.graphUserScopes.join(' ')
  });

  const options = {
    hostname: 'login.microsoftonline.com',
    port: 443,
    path: `/${settings.tenantId}/oauth2/v2.0/devicecode`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response:', body);
        console.log('\n');

        try {
          const response = JSON.parse(body);

          if (response.error) {
            console.log('❌ ERROR from Azure AD:');
            console.log('Error:', response.error);
            console.log('Description:', response.error_description);
            console.log('\n');

            if (response.error === 'invalid_client') {
              console.log('🔍 This means the Client ID is INVALID or NOT FOUND');
              console.log('\nSolution: You need to register your own application');
              console.log('See SOLUTION.md for instructions on creating your own app registration\n');
            }
          } else if (response.user_code && response.verification_uri) {
            console.log('✅ Client ID is VALID!');
            console.log('\nDevice Code Flow initiated successfully:');
            console.log('User Code:', response.user_code);
            console.log('Verification URI:', response.verification_uri);
            console.log('Message:', response.message);
            console.log('\nThe client ID is working! The issue might be elsewhere.\n');
          }

          resolve(response);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Network error:', err.message);
      reject(err);
    });

    // Send the request with proper form encoding
    const formData = `client_id=${encodeURIComponent(settings.clientId)}&scope=${encodeURIComponent(settings.graphUserScopes.join(' '))}`;
    req.write(formData);
    req.end();
  });
}

checkClientId()
  .then(() => {
    console.log('Check complete.');
  })
  .catch((err) => {
    console.error('Failed to check client ID:', err.message);
  });
