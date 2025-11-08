// Subscribe to Sent Mail Events
// Get notifications when emails are sent from your mailbox

const ACCESS_TOKEN = process.env.GRAPH_TOKEN || 'PASTE_YOUR_TOKEN_HERE';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://YOUR_PUBLIC_ENDPOINT.com/webhook';

async function subscribeSentMail() {
  console.log('\n=== Creating Subscription for Sent Mail ===\n');

  if (WEBHOOK_URL === 'https://YOUR_PUBLIC_ENDPOINT.com/webhook') {
    console.log('❌ ERROR: You need to set a real webhook URL!\n');
    console.log('Quick setup for testing:');
    console.log('1. Use webhook.site for immediate testing:');
    console.log('   - Go to: https://webhook.site');
    console.log('   - Copy your unique URL');
    console.log('   - export WEBHOOK_URL="https://webhook.site/your-unique-id"');
    console.log('');
    console.log('2. Or use ngrok for local testing:');
    console.log('   - Install: brew install ngrok');
    console.log('   - Run: ngrok http 3000');
    console.log('   - export WEBHOOK_URL="https://abc123.ngrok.io/webhook"\n');
    return;
  }

  // Subscription for Sent Items folder
  const subscription = {
    changeType: 'created',  // Watch for new sent emails
    notificationUrl: WEBHOOK_URL,
    resource: '/me/mailFolders/sentitems/messages',  // Sent Items folder
    expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    clientState: 'MySecretState456'  // Secret for validation
  };

  console.log('Subscription Configuration:');
  console.log('  📤 Resource: /me/mailFolders/sentitems/messages');
  console.log('  🔔 Change type: created (new sent emails)');
  console.log('  🌐 Webhook URL:', WEBHOOK_URL);
  console.log('  ⏰ Expires: 3 days from now\n');

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();

    console.log('✅ SUCCESS! Subscription created!\n');
    console.log('📋 Subscription Details:');
    console.log('  ID:', result.id);
    console.log('  Expires:', new Date(result.expirationDateTime).toLocaleString());
    console.log('');
    console.log('🎉 You will now receive notifications when emails are sent!\n');
    console.log('What happens next:');
    console.log('  1. Send an email from your mailbox');
    console.log('  2. Microsoft Graph will POST a notification to:', WEBHOOK_URL);
    console.log('  3. Your webhook receives the notification');
    console.log('  4. You can fetch the full email details using the resource URL\n');

    // Save subscription ID for later
    console.log('💡 To delete this subscription later:');
    console.log(`  export SUBSCRIPTION_ID="${result.id}"`);
    console.log('  npx ts-node delete_subscription.ts\n');

    return result;

  } catch (error: any) {
    console.error('\n❌ Failed to create subscription\n');
    console.error('Error:', error.message);

    if (error.message.includes('400')) {
      console.log('\n🔍 Troubleshooting:');
      console.log('  - Ensure webhook URL is publicly accessible via HTTPS');
      console.log('  - Webhook must respond to validation (see example below)');
      console.log('  - Try using webhook.site first for testing');
    } else if (error.message.includes('403')) {
      console.log('\n🔍 Permission issue:');
      console.log('  - Token needs Mail.Read permission');
      console.log('  - Go to Graph Explorer → Modify permissions → Consent to Mail.Read');
    }
  }
}

// Example of what notification looks like
function showNotificationExample() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Example Notification You Will Receive                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const exampleNotification = {
    value: [
      {
        subscriptionId: '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
        clientState: 'MySecretState456',
        changeType: 'created',
        resource: "Users/heifets@merck.com/Messages/AAMkAGI2...truncated",
        resourceData: {
          '@odata.type': '#Microsoft.Graph.Message',
          '@odata.id': "Users/heifets@merck.com/Messages/AAMkAGI2...truncated",
          '@odata.etag': 'W/"CQAAABYAAADkrWGt...truncated"',
          id: 'AAMkAGI2...truncated'
        },
        subscriptionExpirationDateTime: '2025-11-09T22:00:00.0000000Z',
        tenantId: 'a00de4ec-48a8-43a6-be74-e31274e2060d'
      }
    ]
  };

  console.log(JSON.stringify(exampleNotification, null, 2));
  console.log('\n');
}

// Example webhook handler
function showWebhookExample() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Example Webhook Handler (Express.js)                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`
// webhook_server.ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  // STEP 1: Handle validation request (happens when creating subscription)
  const validationToken = req.query.validationToken;
  if (validationToken) {
    console.log('✅ Subscription validation request');
    return res.status(200).send(validationToken);
  }

  // STEP 2: Process notifications
  const notifications = req.body.value;

  for (const notification of notifications) {
    // Verify client state
    if (notification.clientState !== 'MySecretState456') {
      console.warn('⚠️  Invalid client state!');
      continue;
    }

    console.log('📧 NEW EMAIL SENT!');
    console.log('Change type:', notification.changeType);
    console.log('Resource:', notification.resource);

    // STEP 3: Fetch full email details
    const token = process.env.GRAPH_TOKEN;
    const messageUrl = \`https://graph.microsoft.com/v1.0/\${notification.resource}\`;

    const messageResponse = await fetch(messageUrl, {
      headers: { 'Authorization': \`Bearer \${token}\` }
    });

    const message = await messageResponse.json();

    console.log('Subject:', message.subject);
    console.log('To:', message.toRecipients.map(r => r.emailAddress.address).join(', '));
    console.log('Sent at:', message.sentDateTime);

    // STEP 4: Do something with the sent email
    // - Log it to database
    // - Trigger workflow
    // - Send to analytics
    // - etc.
  }

  // STEP 5: Always return 202 Accepted
  res.status(202).send();
});

app.listen(3000, () => {
  console.log('🚀 Webhook server running on port 3000');
});
  `);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Subscribe to Sent Mail Events - Microsoft Graph     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (ACCESS_TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
    console.log('\n❌ No access token!\n');
    console.log('export GRAPH_TOKEN="your_token_here"');
    console.log('export WEBHOOK_URL="https://your-webhook-url.com/webhook"');
    console.log('npx ts-node subscribe_sent_mail.ts\n');
    return;
  }

  // Show what the notification looks like
  showNotificationExample();

  // Show webhook handler example
  showWebhookExample();

  // Create the subscription (if webhook URL is set)
  if (WEBHOOK_URL !== 'https://YOUR_PUBLIC_ENDPOINT.com/webhook') {
    await subscribeSentMail();
  } else {
    console.log('\n💡 To actually create the subscription:');
    console.log('   1. Set up a webhook endpoint (see examples above)');
    console.log('   2. export WEBHOOK_URL="your_url"');
    console.log('   3. Run this script again\n');
  }
}

main();
