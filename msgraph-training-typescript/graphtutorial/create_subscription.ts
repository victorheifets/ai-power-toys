// Create Microsoft Graph Subscription (Webhook) for Email Notifications
// Requires a publicly accessible HTTPS endpoint to receive notifications

const ACCESS_TOKEN = process.env.GRAPH_TOKEN || 'PASTE_YOUR_TOKEN_HERE';

// IMPORTANT: Replace with your actual webhook URL
// This must be a publicly accessible HTTPS endpoint
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://YOUR_PUBLIC_ENDPOINT.com/webhook';

async function createMailSubscription() {
  console.log('\n=== Creating Mail Subscription ===\n');

  if (WEBHOOK_URL === 'https://YOUR_PUBLIC_ENDPOINT.com/webhook') {
    console.log('❌ ERROR: You need to set a real webhook URL!\n');
    console.log('Options:');
    console.log('1. Use ngrok for testing: https://ngrok.com/');
    console.log('   - Run: ngrok http 3000');
    console.log('   - Use the HTTPS URL ngrok provides\n');
    console.log('2. Use Azure Function, AWS Lambda, or similar\n');
    console.log('3. Use a service like webhook.site for testing (NOT for production)\n');
    console.log('Then run:');
    console.log('  export WEBHOOK_URL="https://your-webhook-url.com/webhook"');
    console.log('  npx ts-node create_subscription.ts\n');
    return;
  }

  // Subscription configuration
  const subscription = {
    changeType: 'created,updated',  // What changes to watch for
    notificationUrl: WEBHOOK_URL,   // Your webhook endpoint
    resource: '/me/mailFolders/inbox/messages',  // What to watch
    expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    clientState: 'SecretClientState123'  // Your secret for validation
  };

  console.log('Subscription details:');
  console.log('  Resource: /me/mailFolders/inbox/messages');
  console.log('  Change type: created, updated');
  console.log('  Webhook URL:', WEBHOOK_URL);
  console.log('  Expires in: 3 days\n');

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

    console.log('✅ Subscription created successfully!\n');
    console.log('Subscription ID:', result.id);
    console.log('Expires at:', new Date(result.expirationDateTime).toLocaleString());
    console.log('\nYou will now receive notifications at:', WEBHOOK_URL);
    console.log('when new emails arrive or existing ones are updated.\n');

    return result;

  } catch (error: any) {
    console.error('❌ Failed to create subscription:', error.message);

    if (error.message.includes('400')) {
      console.log('\nPossible issues:');
      console.log('- Webhook URL is not publicly accessible');
      console.log('- Webhook URL is not HTTPS');
      console.log('- Webhook endpoint doesn\'t respond to validation');
    } else if (error.message.includes('403')) {
      console.log('\nToken doesn\'t have required permissions.');
      console.log('Need: Mail.Read permission');
    } else if (error.message.includes('401')) {
      console.log('\nToken is expired or invalid.');
    }
  }
}

async function listSubscriptions() {
  console.log('\n=== Listing Active Subscriptions ===\n');

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    const subscriptions = data.value;

    if (subscriptions.length === 0) {
      console.log('No active subscriptions found.\n');
      return;
    }

    console.log(`Found ${subscriptions.length} active subscription(s):\n`);

    subscriptions.forEach((sub: any, idx: number) => {
      console.log(`${idx + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Resource: ${sub.resource}`);
      console.log(`   Change type: ${sub.changeType}`);
      console.log(`   Webhook URL: ${sub.notificationUrl}`);
      console.log(`   Expires: ${new Date(sub.expirationDateTime).toLocaleString()}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Failed to list subscriptions:', error.message);
  }
}

async function deleteSubscription(subscriptionId: string) {
  console.log(`\n=== Deleting Subscription ${subscriptionId} ===\n`);

  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log('✅ Subscription deleted successfully!\n');

  } catch (error: any) {
    console.error('❌ Failed to delete subscription:', error.message);
  }
}

// Example webhook server code (you would run this separately)
function exampleWebhookServer() {
  console.log('\n=== Example Webhook Server (Express.js) ===\n');
  console.log(`
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  // Step 1: Validate the subscription (initial setup)
  const validationToken = req.query.validationToken;
  if (validationToken) {
    console.log('Subscription validation request received');
    return res.status(200).send(validationToken);
  }

  // Step 2: Verify client state (optional but recommended)
  const notifications = req.body.value;
  notifications.forEach((notification: any) => {
    if (notification.clientState !== 'SecretClientState123') {
      console.warn('Invalid client state!');
      return;
    }

    console.log('Notification received:');
    console.log('  Change type:', notification.changeType);
    console.log('  Resource:', notification.resource);
    console.log('  Resource data:', notification.resourceData);

    // Step 3: Process the notification
    // Fetch the actual message details if needed
    // fetch(notification.resource, { headers: { Authorization: ... }})
  });

  res.status(202).send(); // Accept the notification
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
  `);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Microsoft Graph Subscriptions (Webhooks)               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (ACCESS_TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
    console.log('\n❌ No access token provided!\n');
    console.log('Set your token:');
    console.log('  export GRAPH_TOKEN="your_token_here"');
    console.log('  npx ts-node create_subscription.ts\n');
    return;
  }

  // List existing subscriptions
  await listSubscriptions();

  // Show example webhook server code
  exampleWebhookServer();

  // Uncomment to create a subscription (requires valid webhook URL)
  // await createMailSubscription();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  To create a subscription, set WEBHOOK_URL and          ║');
  console.log('║  uncomment the createMailSubscription() call above      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main();
