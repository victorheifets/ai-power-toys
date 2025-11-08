// Enhanced webhook server with LLM integration and Teams notifications

import express from 'express';
import { processEmailForFollowUp } from './orchestrator';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3200;
const ACCESS_TOKEN = process.env.GRAPH_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

          // STEP 4: Process with LLM and send Teams notification if action items found
          console.log('🤖 AI POWER TOY: Follow-Up Analysis');
          console.log('─'.repeat(60));
          await processEmailForFollowUp(message);

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

  // STEP 5: Always respond with 202 Accepted
  res.status(202).send();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    notificationsReceived: notifications.length,
    features: {
      llmAnalysis: !!OPENAI_API_KEY,
      teamsNotifications: !!process.env.TEAMS_APP_ID
    }
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
      <head>
        <title>AI Power Toys - Follow-Up Bot</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-top: 0; }
          .status {
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .feature {
            display: inline-block;
            padding: 8px 15px;
            margin: 5px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            font-size: 14px;
          }
          .enabled { background: #10b981; }
          .disabled { background: #ef4444; }
          ul { list-style: none; padding: 0; }
          li { padding: 8px 0; }
          code {
            background: rgba(0,0,0,0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 AI Power Toys - Follow-Up Bot</h1>
          <p>Intelligent email analysis with Teams notifications</p>

          <div class="status">
            <h2>🚀 Server Status</h2>
            <p>✅ Running on port ${PORT}</p>
            <p>📊 Notifications received: ${notifications.length}</p>
          </div>

          <div class="status">
            <h2>🔧 Features</h2>
            <span class="feature ${ACCESS_TOKEN ? 'enabled' : 'disabled'}">
              ${ACCESS_TOKEN ? '✅' : '❌'} Graph API
            </span>
            <span class="feature ${OPENAI_API_KEY ? 'enabled' : 'disabled'}">
              ${OPENAI_API_KEY ? '✅' : '❌'} LLM Analysis
            </span>
            <span class="feature ${process.env.TEAMS_APP_ID ? 'enabled' : 'disabled'}">
              ${process.env.TEAMS_APP_ID ? '✅' : '❌'} Teams Notifications
            </span>
          </div>

          <h2>📋 Endpoints</h2>
          <ul>
            <li><strong>POST /webhook</strong> - Main webhook endpoint</li>
            <li><strong>GET /health</strong> - Health check</li>
            <li><strong>GET /notifications</strong> - View received notifications</li>
          </ul>

          <h2>🎯 How It Works</h2>
          <ol>
            <li>📧 Email sent → Webhook receives notification</li>
            <li>🤖 LLM analyzes email for action items</li>
            <li>📬 System notification appears (bottom-right corner)</li>
            <li>✅ User clicks → Teams opens with options</li>
          </ol>

          <h2>🔗 Next Steps</h2>
          <ol>
            <li>Expose this server: <code>ngrok http ${PORT}</code></li>
            <li>Copy the HTTPS URL from ngrok</li>
            <li>Create subscription using that URL</li>
            <li>Send/receive emails to trigger notifications!</li>
          </ol>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     AI Power Toys - Follow-Up Bot RUNNING               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`🔑 Access token: ${ACCESS_TOKEN ? '✅ Configured' : '❌ Not set'}`);
  console.log(`🤖 OpenAI API: ${OPENAI_API_KEY ? '✅ Configured' : '⚠️  Not set (will use mock analysis)'}`);
  console.log(`📬 Teams App: ${process.env.TEAMS_APP_ID ? '✅ Configured' : '⚠️  Not set'}\n`);
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
  console.log('\n\n🛑 Shutting down AI Power Toys server...');
  console.log(`📊 Total notifications received: ${notifications.length}`);
  process.exit(0);
});
