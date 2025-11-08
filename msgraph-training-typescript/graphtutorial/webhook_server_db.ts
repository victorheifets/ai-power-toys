// Integrated webhook server with Database + LLM + Multi-Toy Detection

import express from 'express';
import db from './database/db';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// CORS middleware to allow dashboard on port 5273 to fetch from backend on port 3200
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Authorization');
  res.header('Cache-Control', 'no-cache');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

const PORT = process.env.PORT || 3200;
const ACCESS_TOKEN = process.env.GRAPH_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Store for tracking notifications
const notifications: any[] = [];

// Store for Graph API token (in-memory - for production, use database or secure storage)
let storedGraphToken: string = ACCESS_TOKEN;

// Store for SSE clients
const sseClients = new Set<any>();

// ============================================================================
// LLM ANALYSIS FUNCTIONS
// ============================================================================

interface ToyDetection {
  toy_type: 'follow_up' | 'kudos' | 'task' | 'urgent';
  detection_data: any;
  confidence_score: number;
}

/**
 * Analyze email with LLM to detect multiple Power Toys
 * Returns array of detections (can be empty, or contain multiple toys)
 */
async function analyzeEmailWithLLM(email: any): Promise<ToyDetection[]> {
  if (!OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set - using mock analysis');
    return mockMultiToyAnalysis(email);
  }

  const prompt = `
Analyze this email and detect any of these "Power Toys" (action patterns):

1. **Follow-Up Toy**: Email contains action items with deadlines
   - Keywords: "send by Friday", "get back to me", "waiting for", "remind me"

2. **Kudos Toy**: Email mentions achievements or good work
   - Keywords: "great work", "excellent job", "congratulations", "well done"

3. **Task Toy**: Email contains actionable items
   - Keywords: "please do", "can you", "need to", "make sure to"

4. **Urgent Request Toy**: Urgent requests (especially from boss)
   - Keywords: "urgent", "ASAP", "immediately", "by today", "critical"

Email details:
Subject: ${email.subject}
From: ${email.from.emailAddress.address}
Sent: ${email.sentDateTime}
Body: ${email.body.content.substring(0, 1500)}

Return JSON array with ALL detected toys (can be 0, 1, or multiple):
{
  "detections": [
    {
      "toy_type": "follow_up"|"kudos"|"task"|"urgent",
      "detection_data": {
        // For follow_up: {"action": "...", "deadline": "ISO date", "priority": "high|medium|low"}
        // For kudos: {"achievement": "...", "person": "...", "suggested_action": "..."}
        // For task: {"task_description": "...", "priority": "high|medium|low"}
        // For urgent: {"reason": "...", "deadline": "ISO date", "action_needed": "..."}
      },
      "confidence_score": 0.00-1.00
    }
  ]
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI assistant that detects action patterns in emails. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    return analysis.detections || [];

  } catch (error: any) {
    console.error('❌ LLM analysis failed:', error.message);
    console.log('⚠️  Falling back to mock analysis');
    return mockMultiToyAnalysis(email);
  }
}

/**
 * Mock analysis for testing without OpenAI API
 * Detects multiple Power Toys using keyword matching
 */
function mockMultiToyAnalysis(email: any): ToyDetection[] {
  const body = email.body?.content?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';
  const detections: ToyDetection[] = [];

  // Detect Kudos Toy
  if (body.includes('great work') || body.includes('excellent') || body.includes('well done') || body.includes('congratulations')) {
    detections.push({
      toy_type: 'kudos',
      detection_data: {
        achievement: `Work mentioned in: ${email.subject}`,
        person: 'user',
        suggested_action: 'Consider sharing achievement or sending thanks'
      },
      confidence_score: 0.85
    });
  }

  // Detect Follow-Up Toy
  if (body.includes('follow up') || body.includes('get back to me') || body.includes('send') || body.includes('by friday') || body.includes('by monday')) {
    const deadline = body.includes('friday') ? getFutureDate(3) :
                     body.includes('monday') ? getFutureDate(5) :
                     getFutureDate(2);

    detections.push({
      toy_type: 'follow_up',
      detection_data: {
        action: `Follow up on: ${email.subject}`,
        deadline: deadline,
        priority: 'high'
      },
      confidence_score: 0.92
    });
  }

  // Detect Task Toy
  if (body.includes('can you') || body.includes('please') || body.includes('need to') || body.includes('make sure')) {
    detections.push({
      toy_type: 'task',
      detection_data: {
        task_description: `Task from email: ${email.subject}`,
        priority: 'medium'
      },
      confidence_score: 0.78
    });
  }

  // Detect Urgent Toy
  if (body.includes('urgent') || body.includes('asap') || body.includes('immediately') || body.includes('critical') || subject.includes('urgent')) {
    detections.push({
      toy_type: 'urgent',
      detection_data: {
        reason: `Urgent request in: ${email.subject}`,
        deadline: getFutureDate(1),
        action_needed: 'Review and respond immediately'
      },
      confidence_score: 0.91
    });
  }

  return detections;
}

function getFutureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ============================================================================
// SSE BROADCAST FUNCTION
// ============================================================================

function broadcastSSE(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error broadcasting to SSE client:', error);
      sseClients.delete(client);
    }
  });
}

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📬 WEBHOOK REQUEST RECEIVED');
  console.log('='.repeat(80));

  // STEP 1: Handle subscription validation
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
  const notificationList = notificationData.value || [];

  for (const notification of notificationList) {
    console.log('─'.repeat(80));
    console.log('Processing notification:');
    console.log('  Subscription ID:', notification.subscriptionId);
    console.log('  Client State:', notification.clientState);
    console.log('  Change Type:', notification.changeType);
    console.log('  Resource:', notification.resource);
    console.log('');

    // Verify client state (security check)
    const expectedClientState = 'AIPowerToysSecret123';
    if (notification.clientState !== expectedClientState) {
      console.warn('⚠️  WARNING: Invalid client state - skipping');
      continue;
    }

    // Store notification
    notifications.push({
      timestamp: new Date().toISOString(),
      notification
    });

    // STEP 3: Fetch full message from Graph API
    const tokenToUse = storedGraphToken || ACCESS_TOKEN;
    if (!tokenToUse) {
      console.log('ℹ️  No access token - skipping message fetch\n');
      continue;
    }

    try {
      console.log('📥 Fetching full message details from Graph API...');
      const messageUrl = `https://graph.microsoft.com/v1.0/${notification.resource}`;
      const messageResponse = await fetch(messageUrl, {
        headers: { 'Authorization': `Bearer ${tokenToUse}` }
      });

      if (!messageResponse.ok) {
        console.error('❌ Failed to fetch message:', messageResponse.status);
        continue;
      }

      const message = await messageResponse.json();

      console.log('\n✉️  EMAIL DETAILS:');
      console.log('  Subject:', message.subject);
      console.log('  From:', message.from?.emailAddress?.address);
      console.log('  To:', message.toRecipients?.map((r: any) => r.emailAddress.address).join(', '));
      console.log('  Sent:', new Date(message.sentDateTime).toLocaleString());
      console.log('');

      // STEP 4: Save email to database
      console.log('💾 Saving email to database...');
      const savedEmail = await db.insertEmail({
        graph_message_id: message.id,
        user_email: 'heifets@merck.com', // Subscription owner - the mailbox being monitored
        from_email: message.from?.emailAddress?.address || 'unknown',
        subject: message.subject,
        body_preview: message.bodyPreview,
        body_content: message.body.content,
        received_at: new Date(message.receivedDateTime)
      });
      console.log('  Email ID:', savedEmail.id);
      console.log('');

      // STEP 5: Analyze with LLM for multiple Power Toys
      console.log('🤖 AI POWER TOY: Multi-Toy Analysis');
      console.log('─'.repeat(80));
      const detections = await analyzeEmailWithLLM(message);

      console.log(`\n🎯 ANALYSIS RESULTS: Found ${detections.length} Power Toy detection(s)\n`);

      if (detections.length === 0) {
        console.log('ℹ️  No action items detected in this email.');

        // Broadcast email event without detections
        broadcastSSE({
          type: 'new_email',
          data: {
            email_id: savedEmail.id,
            subject: message.subject,
            from: message.from?.emailAddress?.address || 'unknown',
            toy_type: null
          }
        });
        console.log('📡 SSE event broadcasted to clients');
      } else {
        // STEP 6: Save all detections to database
        for (const detection of detections) {
          console.log(`📌 ${detection.toy_type.toUpperCase()} TOY DETECTED`);
          console.log('  Confidence:', detection.confidence_score);
          console.log('  Data:', JSON.stringify(detection.detection_data, null, 4));

          const savedDetection = await db.insertDetection({
            email_id: savedEmail.id!,
            toy_type: detection.toy_type,
            detection_data: detection.detection_data,
            confidence_score: detection.confidence_score,
            status: 'pending'
          });
          console.log('  Detection ID:', savedDetection.id);
          console.log('');

          // Broadcast SSE event for each detection
          broadcastSSE({
            type: 'new_email',
            data: {
              email_id: savedEmail.id,
              subject: message.subject,
              from: message.from?.emailAddress?.address || 'unknown',
              toy_type: detection.toy_type,
              detection_id: savedDetection.id,
              confidence: detection.confidence_score,
              detection_data: detection.detection_data
            }
          });
          console.log(`📡 SSE event broadcasted for ${detection.toy_type} detection`);
        }

        // STEP 7: Mark email as analyzed
        await db.markEmailAsAnalyzed(savedEmail.id!);
        console.log('✅ Email marked as analyzed');
      }

      console.log('─'.repeat(80));

    } catch (error: any) {
      console.error('❌ Error processing message:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  console.log('='.repeat(80));
  console.log('✅ Webhook processing completed\n');

  // STEP 8: Always respond with 202 Accepted
  res.status(202).send();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await db.testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    notificationsReceived: notifications.length,
    database: dbConnected ? 'connected' : 'disconnected',
    sseClients: sseClients.size,
    features: {
      graphAPI: !!ACCESS_TOKEN,
      graphAPIStatus: ACCESS_TOKEN ? 'connected' : 'missing',
      llmAnalysis: !!OPENAI_API_KEY,
      llmStatus: OPENAI_API_KEY ? 'enabled' : 'mock',
      database: dbConnected,
      databaseStatus: dbConnected ? 'connected' : 'disconnected'
    },
    warnings: [
      ...(!ACCESS_TOKEN ? ['⚠️ Graph API token not set - webhooks will be skipped'] : []),
      ...(!OPENAI_API_KEY ? ['ℹ️ Using mock LLM analysis'] : []),
      ...(sseClients.size === 0 ? ['⚠️ No AU clients connected'] : [])
    ]
  });
});

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

  // Add client to the set
  sseClients.add(res);
  console.log(`📡 SSE client connected. Total clients: ${sseClients.size}`);

  // Remove client when connection closes
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`📡 SSE client disconnected. Total clients: ${sseClients.size}`);
  });
});

// Update stored token endpoint
app.post('/api/update-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Clean and store the token
    storedGraphToken = token.trim().replace(/^Bearer\s+/i, '');
    
    console.log('✅ Graph token updated successfully');
    res.json({ success: true, message: 'Token updated successfully' });
  } catch (error: any) {
    console.error('Error updating token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, token } = req.body;

    if (!to || !subject || !body || !token) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, body, token'
      });
    }

    // Clean the token
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

    // Prepare email message
    const emailMessage = {
      message: {
        subject: subject,
        body: {
          contentType: 'Text',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      }
    };

    // Send email via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailMessage)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send email:', errorText);
      
      let errorMessage = 'Failed to send email';
      if (response.status === 403) {
        errorMessage = 'Permission denied. Your token needs Mail.Send permission. Get a new token with Mail.Send scope from Graph Explorer.';
      }
      
      return res.status(response.status).json({
        error: errorMessage,
        details: errorText,
        status: response.status
      });
    }

    console.log(`📧 Email sent successfully to ${to}`);
    res.json({
      success: true,
      message: 'Email sent successfully',
      to,
      subject
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscriptions
app.get('/api/subscriptions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');

    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
app.get('/api/stats/:userEmail', async (req, res) => {
  try {
    const stats = await db.getDashboardStats(req.params.userEmail);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending detections for user
app.get('/api/pending/:userEmail', async (req, res) => {
  try {
    const pending = await db.getPendingDetections(req.params.userEmail);
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get email with full details
app.get('/api/email/:emailId', async (req, res) => {
  try {
    const emailDetails = await db.getEmailWithDetails(parseInt(req.params.emailId));
    res.json(emailDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update detection status
app.patch('/api/detection/:detectionId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.updateDetectionStatus(parseInt(req.params.detectionId), status);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add user action
app.post('/api/action', async (req, res) => {
  try {
    const { detection_id, action_type, action_data } = req.body;
    const action = await db.insertUserAction({
      detection_id,
      action_type,
      action_data,
      result: 'pending'
    });
    res.json(action);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific detection
app.delete('/api/detection/:detectionId', async (req, res) => {
  try {
    const detectionId = parseInt(req.params.detectionId);
    await db.deleteDetection(detectionId);
    res.json({ success: true, message: 'Detection deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all database data
app.post('/api/clear-db', async (req, res) => {
  try {
    await db.clearAllData();
    res.json({ success: true, message: 'All database data cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test notification endpoint - instantly trigger AU notification
app.post('/api/test-notification', async (req, res) => {
  try {
    const { toy_type = 'follow_up', subject, from } = req.body;

    console.log(`🧪 Test notification triggered! Broadcasting to ${sseClients.size} clients`);

    // Broadcast SSE event immediately
    broadcastSSE({
      type: 'new_email',
      data: {
        email_id: 999,
        subject: subject || 'Test Email: Please send Q4 report by Friday',
        from: from || 'test@example.com',
        toy_type: toy_type,
        detection_id: 999,
        confidence: 0.95,
        detection_data: { test: true }
      }
    });

    res.json({ success: true, message: 'Test notification sent to connected clients' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual test/simulation endpoint - fetch and process emails with provided token
app.post('/api/test/simulate', async (req, res) => {
  try {
    let { token, userEmail, count = 10 } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Bearer token is required' });
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Clean the token - remove "Bearer " prefix if it exists
    token = token.trim().replace(/^Bearer\s+/i, '');

    console.log(`\n🧪 TEST MODE: Simulating webhook for ${userEmail} (fetching ${count} emails)...`);

    // Fetch recent messages from Graph API
    const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=${count}&$select=id,subject,from,receivedDateTime,body`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!graphResponse.ok) {
      const error = await graphResponse.text();
      console.error('❌ Graph API error:', error);
      return res.status(graphResponse.status).json({ error: 'Failed to fetch from Graph API', details: error });
    }

    const data = await graphResponse.json();
    const messages = data.value || [];

    console.log(`📥 Fetched ${messages.length} emails`);

    let processed = 0;
    let errors = 0;
    const results = [];

    // Process each message through webhook logic
    for (const message of messages) {
      try {
        console.log(`\n📧 Processing: "${message.subject}"`);

        // Insert email into database
        const email = await db.insertEmail({
          graph_message_id: message.id,
          user_email: userEmail,
          subject: message.subject || '(No subject)',
          from_email: message.from?.emailAddress?.address || 'unknown',
          body_preview: message.body?.content?.substring(0, 500) || '',
          body_content: message.body?.content || null,
          received_at: message.receivedDateTime
        });

        // Analyze with LLM
        const detections = await analyzeEmailWithLLM(message);

        console.log(`   ✅ Found ${detections.length} detections`);

        // Insert detections
        for (const detection of detections) {
          await db.insertDetection({
            email_id: email.id!,
            toy_type: detection.toy_type,
            detection_data: detection.detection_data,
            confidence_score: detection.confidence_score,
            status: 'pending'
          });
        }

        results.push({
          subject: message.subject,
          detections: detections.length
        });

        processed++;
      } catch (err: any) {
        console.error(`   ❌ Error processing email:`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Test simulation complete: ${processed} processed, ${errors} errors\n`);

    res.json({
      success: true,
      fetched: messages.length,
      processed,
      errors,
      results
    });

  } catch (error: any) {
    console.error('❌ Test simulation error:', error);
    res.status(500).json({ error: error.message });
  }
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
        <title>AI Power Toys - Multi-Toy Detection Server</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #2c3e50;
            color: white;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-top: 0; font-size: 28px; }
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
          li { padding: 5px 0; font-size: 14px; }
          code {
            background: rgba(0,0,0,0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
          .toy-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .toy-card {
            background: rgba(255,255,255,0.15);
            padding: 15px;
            border-radius: 10px;
          }
          .toy-card h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 AI Power Toys - Multi-Toy Detection Server</h1>
          <p>Intelligent email analysis with database persistence</p>

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
              ${OPENAI_API_KEY ? '✅' : '⚠️'} LLM Analysis
            </span>
            <span class="feature enabled">
              ✅ PostgreSQL Database
            </span>
            <span class="feature enabled">
              ✅ Multi-Toy Detection
            </span>
          </div>

          <div class="status">
            <h2>🎨 Power Toys</h2>
            <div class="toy-grid">
              <div class="toy-card">
                <h3>📅 Follow-Up Toy</h3>
                <p style="font-size: 13px;">Detects action items with deadlines</p>
              </div>
              <div class="toy-card">
                <h3>🏆 Kudos Toy</h3>
                <p style="font-size: 13px;">Recognizes achievements and good work</p>
              </div>
              <div class="toy-card">
                <h3>✅ Task Toy</h3>
                <p style="font-size: 13px;">Identifies actionable items</p>
              </div>
              <div class="toy-card">
                <h3>⚠️ Urgent Request Toy</h3>
                <p style="font-size: 13px;">Flags urgent requests</p>
              </div>
            </div>
          </div>

          <h2>📋 API Endpoints</h2>
          <ul>
            <li><code>POST /webhook</code> - Main webhook endpoint</li>
            <li><code>GET /health</code> - Health check</li>
            <li><code>GET /api/stats/:userEmail</code> - Dashboard statistics</li>
            <li><code>GET /api/pending/:userEmail</code> - Pending detections</li>
            <li><code>GET /api/email/:emailId</code> - Email details</li>
            <li><code>PATCH /api/detection/:id/status</code> - Update detection status</li>
            <li><code>POST /api/action</code> - Add user action</li>
          </ul>

          <h2>🔗 Setup</h2>
          <ol style="font-size: 14px;">
            <li>Expose with ngrok: <code>ngrok http ${PORT}</code></li>
            <li>Create Graph API subscription with the HTTPS URL</li>
            <li>Send/receive emails to trigger analysis</li>
            <li>View results in React dashboard (coming next)</li>
          </ol>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, async () => {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           AI Power Toys - Multi-Toy Detection Server RUNNING                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`🔑 Graph Token: ${ACCESS_TOKEN ? '✅ Configured' : '❌ Not set'}`);
  console.log(`🤖 OpenAI API: ${OPENAI_API_KEY ? '✅ Configured' : '⚠️  Not set (using mock)'}`);

  // Test database connection
  const dbConnected = await db.testConnection();
  console.log(`💾 Database: ${dbConnected ? '✅ Connected' : '❌ Not connected'}\n`);

  console.log('📋 Available endpoints:');
  console.log(`   POST http://localhost:${PORT}/webhook                 - Main webhook`);
  console.log(`   GET  http://localhost:${PORT}/health                  - Health check`);
  console.log(`   GET  http://localhost:${PORT}/api/stats/:userEmail    - Dashboard stats`);
  console.log(`   GET  http://localhost:${PORT}/api/pending/:userEmail  - Pending detections`);
  console.log(`   GET  http://localhost:${PORT}/                        - Home page\n`);

  console.log('🌐 Next steps:');
  console.log(`   1. Run: ngrok http ${PORT}`);
  console.log('   2. Create Graph API subscription with ngrok HTTPS URL');
  console.log('   3. Send test emails to trigger multi-toy detection\n');
  console.log('⏳ Waiting for webhook notifications...\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down AI Power Toys server...');
  console.log(`📊 Total notifications received: ${notifications.length}`);
  await db.closePool();
  process.exit(0);
});
