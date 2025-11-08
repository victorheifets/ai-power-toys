// Local Webhook Server for Microsoft Graph Subscriptions
// Receives real-time notifications for mail events

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3200;
const ACCESS_TOKEN = process.env.GRAPH_TOKEN || '';

// Store for tracking notifications
const notifications: any[] = [];

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('📬 WEBHOOK REQUEST RECEIVED');
  console.log('='.repeat(60));

  // STEP 1: Handle subscription validation (happens when creating subscription)
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    console.log('✅ Subscription validation request');
    console.log('Validation token:', validationToken.substring(0, 50) + '...');
    console.log('Responding with validation token...\n');
    return res.status(200).send(validationToken);
  }

  // STEP 2: Process change notifications
  console.log('📧 CHANGE NOTIFICATION RECEIVED\n');

  const notificationData = req.body;
  console.log('Full notification body:');
  console.log(JSON.stringify(notificationData, null, 2));
  console.log('');

  const notificationList = notificationData.value || [];

  for (const notification of notificationList) {
    console.log('─'.repeat(60));
    console.log('Processing notification:');
    console.log('  Subscription ID:', notification.subscriptionId);
    console.log('  Client State:', notification.clientState);
    console.log('  Change Type:', notification.changeType);
    console.log('  Resource:', notification.resource);
    console.log('  Tenant ID:', notification.tenantId);
    console.log('');

    // Verify client state (security check)
    const expectedClientState = 'MySecretState456';
    if (notification.clientState !== expectedClientState) {
      console.warn('⚠️  WARNING: Invalid client state!');
      console.warn('  Expected:', expectedClientState);
      console.warn('  Received:', notification.clientState);
      continue;
    }

    // Store notification
    notifications.push({
      timestamp: new Date().toISOString(),
      notification
    });

    // STEP 3: Fetch full message details
    if (ACCESS_TOKEN) {
      console.log('📥 Fetching full message details...');
      try {
        const messageUrl = `https://graph.microsoft.com/v1.0/${notification.resource}`;
        const messageResponse = await fetch(messageUrl, {
          headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        if (messageResponse.ok) {
          const message = await messageResponse.json();
          console.log('');
          console.log('✉️  EMAIL DETAILS:');
          console.log('  Subject:', message.subject);
          console.log('  From:', message.from?.emailAddress?.address);
          console.log('  To:', message.toRecipients?.map((r: any) => r.emailAddress.address).join(', '));
          console.log('  Sent:', new Date(message.sentDateTime).toLocaleString());
          console.log('  Has Attachments:', message.hasAttachments);
          console.log('  Importance:', message.importance);
          console.log('');

          // You can do whatever you want with the message here:
          // - Save to database
          // - Trigger workflows
          // - Send to analytics
          // - Forward to another system
          // - etc.

        } else {
          console.error('❌ Failed to fetch message:', messageResponse.status);
        }
      } catch (error: any) {
        console.error('❌ Error fetching message:', error.message);
      }
    } else {
      console.log('ℹ️  No access token provided - skipping message fetch');
      console.log('   Set GRAPH_TOKEN to enable full message retrieval\n');
    }
  }

  console.log('='.repeat(60));
  console.log('✅ Notification processed successfully\n');

  // STEP 4: Always respond with 202 Accepted
  res.status(202).send();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    notificationsReceived: notifications.length
  });
});

// View all received notifications
app.get('/notifications', (req, res) => {
  res.json({
    total: notifications.length,
    notifications: notifications
  });
});

// Home page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Graph Webhook Server</title></head>
      <body style="font-family: sans-serif; padding: 40px;">
        <h1>📬 Microsoft Graph Webhook Server</h1>
        <p>Server is running and ready to receive notifications!</p>
        <h2>Endpoints:</h2>
        <ul>
          <li><strong>POST /webhook</strong> - Main webhook endpoint</li>
          <li><strong>GET /health</strong> - Health check</li>
          <li><strong>GET /notifications</strong> - View received notifications</li>
        </ul>
        <h2>Status:</h2>
        <p>✅ Server is running on port ${PORT}</p>
        <p>📊 Notifications received: ${notifications.length}</p>
        <p>🔑 Access token configured: ${ACCESS_TOKEN ? '✅ Yes' : '❌ No'}</p>
        <h2>Next Steps:</h2>
        <ol>
          <li>Expose this server with ngrok: <code>ngrok http ${PORT}</code></li>
          <li>Copy the HTTPS URL from ngrok</li>
          <li>Create subscription using that URL</li>
          <li>Send/receive emails to trigger notifications!</li>
        </ol>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Microsoft Graph Webhook Server - RUNNING            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`🔑 Access token: ${ACCESS_TOKEN ? '✅ Configured' : '❌ Not set'}\n`);
  console.log('📋 Available endpoints:');
  console.log(`   POST http://localhost:${PORT}/webhook      - Main webhook`);
  console.log(`   GET  http://localhost:${PORT}/health       - Health check`);
  console.log(`   GET  http://localhost:${PORT}/notifications - View notifications`);
  console.log(`   GET  http://localhost:${PORT}               - Home page\n`);
  console.log('🌐 Next step: Expose with ngrok');
  console.log(`   Run in another terminal: ngrok http ${PORT}`);
  console.log('   Then copy the HTTPS URL to use in subscription\n');
  console.log('⏳ Waiting for webhook notifications...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down webhook server...');
  console.log(`📊 Total notifications received: ${notifications.length}`);
  process.exit(0);
});
