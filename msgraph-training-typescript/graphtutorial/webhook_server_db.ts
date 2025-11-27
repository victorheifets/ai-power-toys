// Integrated webhook server with Database + LLM + Multi-Toy Detection

import express from 'express';
import db, { pool } from './database/db';
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

// Merck GPT API Configuration
const MERCK_GPT_API_URL = process.env.MERCK_GPT_API_URL || 'https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions';
const MERCK_GPT_API_KEY = process.env.MERCK_GPT_API_KEY || 'JI3xpfhhxJ1ud1AlMScfAV2TgbwQuEh1';

// Store for tracking notifications
const notifications: any[] = [];

// Store for Graph API token (in-memory - for production, use database or secure storage)
let storedGraphToken: string = ACCESS_TOKEN;

// Store for LLM mode setting (in-memory - default to ON)
let llmModeEnabled: boolean = true;

// Store for SSE clients
const sseClients = new Set<any>();

// Track last webhook received timestamp
let lastWebhookReceived: Date | null = null;

// Track webhooks received since server start
let webhooksReceivedCount = 0;

// ============================================================================
// LLM ANALYSIS FUNCTIONS
// ============================================================================

interface ToyDetection {
  toy_type: 'follow_up' | 'kudos' | 'task' | 'urgent' | 'meeting_summary' | 'blocker';
  detection_data: any;
  confidence_score: number;
}

/**
 * Analyze email with LLM to detect multiple Power Toys
 * Returns array of detections (can be empty, or contain multiple toys)
 */
async function analyzeEmailWithLLM(email: any, isOutgoingEmail: boolean = false): Promise<ToyDetection[]> {
  // Check if LLM mode is disabled - use keyword fallback
  if (!llmModeEnabled) {
    console.log('🔧 LLM mode disabled - using keyword-based detection');
    return mockMultiToyAnalysis(email, isOutgoingEmail);
  }

  // Use Merck GPT API if available, otherwise fall back to OpenAI or mock
  const useMerckAPI = !!MERCK_GPT_API_KEY;

  if (!useMerckAPI && !OPENAI_API_KEY) {
    console.log('⚠️  No LLM API configured - using mock analysis');
    return mockMultiToyAnalysis(email, isOutgoingEmail);
  }

  // Check if sender is direct manager
  const senderEmail = email.from?.emailAddress?.address || '';
  const isFromDirectManager = senderEmail.toLowerCase() === 'yosi.ivan@msd.com';

  const prompt = `
You are analyzing an email to detect actionable patterns. Use semantic understanding, not keyword matching.

EMAIL CONTEXT:
Subject: ${email.subject}
From: ${senderEmail}${isFromDirectManager ? ' (DIRECT MANAGER)' : ''}
Sent: ${email.sentDateTime}
Direction: ${isOutgoingEmail ? 'OUTGOING (I sent this email)' : 'INCOMING (I received this email)'}
Body: ${email.body?.content?.substring(0, 1500) || ''}

POWER TOY TYPES TO DETECT:

1. **Follow-Up Toy**:
   - ONLY for OUTGOING emails (emails I sent to others)${isOutgoingEmail ? ' ✓ THIS EMAIL IS OUTGOING' : ' ✗ THIS EMAIL IS INCOMING - DO NOT DETECT FOLLOW-UP'}
   - Detect when I assigned tasks or actions to someone else
   - Look for task delegation, follow-up requests, or action items I assigned
   - Example: "Hi John, can you send me the report by Friday?"

2. **Task Toy**:
   - For INCOMING or OUTGOING emails where someone is asking ME to do something
   - Detect requests, assignments, or action items directed at me
   - Look for the intent of "I need you to do X"
   - Example: "Victor, please review this document by tomorrow"

3. **Kudos Toy**:
   - Detect genuine appreciation, recognition of achievements, or positive feedback
   - Look for semantic meaning of recognition, not just positive words
   - Example: "Your presentation impressed the entire team"

4. **Urgent Toy**:
   - Detect time-sensitive requests requiring immediate attention
   - AUTOMATICALLY detect if from direct manager (${isFromDirectManager ? 'YES - this email IS from direct manager' : 'NO - not from direct manager'})
   - Look for urgency in meaning, not just keywords
   - Example: "We need this resolved before the client call in 2 hours"

IMPORTANT RULES:
- Use SEMANTIC understanding, NOT keyword matching
- Understand INTENT and CONTEXT, not just words
- Follow-Up ONLY for outgoing emails with task assignments
- Task for emails asking ME to do something
- Urgent is automatically triggered if from direct manager OR semantically urgent
- Parse dates in DD/MM/YY format (European)
- Return EMPTY array if no toys detected

Return JSON with ALL detected toys:
{
  "detections": [
    {
      "toy_type": "follow_up"|"kudos"|"task"|"urgent",
      "detection_data": {
        "action": "description of action",
        "deadline": "ISO date or null",
        "priority": "high"|"medium"|"low",
        "reason": "why this toy was detected"
      },
      "confidence_score": 0.0-1.0
    }
  ]
}
`;

  try {
    let response;

    if (useMerckAPI) {
      console.log('🔵 Using Merck GPT API for email analysis');
      response = await fetch(MERCK_GPT_API_URL, {
        method: 'POST',
        headers: {
          'api-key': MERCK_GPT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an AI assistant that detects action patterns in emails. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    } else {
      console.log('🟡 Using OpenAI API for email analysis');
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error (${response.status}): ${error}`);
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
function mockMultiToyAnalysis(email: any, isOutgoingEmail: boolean = false): ToyDetection[] {
  const body = email.body?.content?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';
  const senderEmail = email.from?.emailAddress?.address || '';
  const isFromDirectManager = senderEmail.toLowerCase() === 'yosi.ivan@msd.com';
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

  // Detect Follow-Up Toy (ONLY for outgoing emails with task assignments)
  if (isOutgoingEmail && (subject.includes('follow') || body.includes('follow up') || body.includes('follow-up') || body.includes('followup') || body.includes('get back to me') || body.includes('send') || body.includes('by friday') || body.includes('by monday') || body.includes('can you') || body.includes('please send'))) {
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

  // Detect Urgent Toy (from direct manager OR urgent keywords)
  if (isFromDirectManager || body.includes('urgent') || body.includes('asap') || body.includes('immediately') || body.includes('critical') || subject.includes('urgent')) {
    detections.push({
      toy_type: 'urgent',
      detection_data: {
        reason: isFromDirectManager ? `Email from direct manager: ${email.subject}` : `Urgent request in: ${email.subject}`,
        deadline: getFutureDate(1),
        action_needed: 'Review and respond immediately'
      },
      confidence_score: isFromDirectManager ? 0.95 : 0.91
    });
  }

  return detections;
}

function getFutureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ============================================================================
// TEAMS MESSAGE BLOCKER ANALYSIS
// ============================================================================

/**
 * Analyze Teams channel message to detect blockers
 * Returns blocker detection if found, otherwise null
 */
async function analyzeTeamsMessageForBlocker(message: any): Promise<ToyDetection | null> {
  const messageContent = message.body?.content?.toLowerCase() || '';
  const plainText = message.body?.content?.replace(/<[^>]*>/g, '') || ''; // Strip HTML tags
  const senderName = message.from?.user?.displayName || 'Unknown';
  const senderEmail = message.from?.user?.userIdentityType || '';

  // Check if LLM mode is enabled
  if (!llmModeEnabled) {
    console.log('🔧 LLM mode disabled - using keyword-based blocker detection');
    return mockBlockerAnalysis(messageContent, plainText, senderName);
  }

  // Use LLM for blocker detection
  const useMerckAPI = !!MERCK_GPT_API_KEY;

  if (!useMerckAPI && !OPENAI_API_KEY) {
    console.log('⚠️  No LLM API configured - using mock blocker analysis');
    return mockBlockerAnalysis(messageContent, plainText, senderName);
  }

  const prompt = `
Analyze this Teams channel message to detect if someone is reporting a BLOCKER.

MESSAGE CONTEXT:
From: ${senderName}
Content: ${plainText}

BLOCKER DETECTION CRITERIA:
- Someone is blocked from making progress on their work
- Someone is waiting for something/someone before they can proceed
- Technical issues preventing work (deployment failures, build errors, access issues)
- Dependencies on other people/teams that are causing delays
- Critical resources unavailable

KEYWORDS (but use semantic understanding, not just keyword matching):
- "blocked", "blocker", "can't proceed", "waiting on", "waiting for"
- "stuck", "impediment", "dependency", "need help", "blocked by"
- "can't continue", "unable to", "need access", "permission denied"

Return JSON:
{
  "is_blocker": true/false,
  "blocker_type": "technical"|"dependency"|"access"|"resource"|"other",
  "blocker_description": "short description of what is blocking",
  "blocked_person": "${senderName}",
  "confidence_score": 0.0-1.0
}

If NO blocker detected, return: {"is_blocker": false, "confidence_score": 0.0}
`;

  try {
    let response;

    if (useMerckAPI) {
      console.log('🔵 Using Merck GPT API for blocker analysis');
      response = await fetch(MERCK_GPT_API_URL, {
        method: 'POST',
        headers: {
          'api-key': MERCK_GPT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an AI assistant that detects blockers in Teams messages. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    } else {
      // OpenAI fallback
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an AI assistant that detects blockers in Teams messages. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    }

    if (!response.ok) {
      console.error('LLM API error:', response.status, await response.text());
      return mockBlockerAnalysis(messageContent, plainText, senderName);
    }

    const data: any = await response.json();
    const content = useMerckAPI ? data.choices[0].message.content : data.choices[0].message.content;
    const result = JSON.parse(content);

    if (result.is_blocker && result.confidence_score > 0.6) {
      return {
        toy_type: 'blocker',
        detection_data: {
          blocker_type: result.blocker_type,
          blocker_description: result.blocker_description,
          blocked_person: result.blocked_person || senderName,
          message_link: message.webUrl || null,
          detected_at: new Date().toISOString()
        },
        confidence_score: result.confidence_score
      };
    }

    return null; // No blocker detected

  } catch (error) {
    console.error('Error analyzing Teams message for blocker:', error);
    return mockBlockerAnalysis(messageContent, plainText, senderName);
  }
}

/**
 * Mock blocker analysis using keyword matching
 */
function mockBlockerAnalysis(messageContent: string, plainText: string, senderName: string): ToyDetection | null {
  const blockerKeywords = ['blocked', 'blocker', 'can\'t proceed', 'waiting on', 'waiting for', 'stuck', 'impediment', 'dependency', 'need help', 'blocked by', 'can\'t continue', 'unable to', 'need access', 'permission denied'];

  const hasBlockerKeyword = blockerKeywords.some(keyword => messageContent.includes(keyword));

  if (hasBlockerKeyword) {
    // Try to extract blocker type
    let blockerType = 'other';
    if (messageContent.includes('access') || messageContent.includes('permission')) {
      blockerType = 'access';
    } else if (messageContent.includes('waiting') || messageContent.includes('dependency')) {
      blockerType = 'dependency';
    } else if (messageContent.includes('error') || messageContent.includes('failed') || messageContent.includes('build')) {
      blockerType = 'technical';
    }

    return {
      toy_type: 'blocker',
      detection_data: {
        blocker_type: blockerType,
        blocker_description: plainText.substring(0, 200), // First 200 chars
        blocked_person: senderName,
        message_link: null,
        detected_at: new Date().toISOString()
      },
      confidence_score: 0.75
    };
  }

  return null;
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

// Handle subscription validation (GET request from Microsoft Graph)
app.get('/webhook', (req, res) => {
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUBSCRIPTION VALIDATION REQUEST');
    console.log('='.repeat(80));
    console.log('Validation token:', validationToken.substring(0, 50) + '...');
    console.log('Responding with validation token...\n');
    return res.status(200).send(validationToken);
  }
  res.status(400).send('Missing validationToken');
});

// Main webhook endpoint (POST request for notifications)
app.post('/webhook', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📬 WEBHOOK REQUEST RECEIVED');
  console.log('='.repeat(80));

  // STEP 1: Handle subscription validation (can come as POST with query param)
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    console.log('✅ Subscription validation request (POST)');
    console.log('Validation token:', validationToken.substring(0, 50) + '...');
    console.log('Responding with validation token...\n');
    return res.status(200).send(validationToken);
  }

  // STEP 2: Process change notifications
  console.log('📧 CHANGE NOTIFICATION RECEIVED\n');

  // Update last webhook received timestamp
  lastWebhookReceived = new Date();
  webhooksReceivedCount++;

  const notificationData = req.body;
  console.log('Request body:', JSON.stringify(notificationData, null, 2));

  if (!notificationData || !notificationData.value) {
    console.error('❌ Invalid notification data - missing value array');
    console.log('Full request:', {
      headers: req.headers,
      body: req.body,
      query: req.query
    });
    return res.status(400).send('Invalid notification format');
  }

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

      // STEP 4: Save email to database (ON CONFLICT will handle duplicates)
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
      console.log('  Graph Message ID:', savedEmail.graph_message_id);
      console.log('');

      // STEP 4.5: Check if email is already being analyzed or completed (race condition protection)
      if (savedEmail.analyzed_at) {
        console.log(`⏭️  Email already analyzed at ${savedEmail.analyzed_at}`);
        console.log('  Skipping duplicate analysis (race condition prevented)');
        console.log('─'.repeat(80));
        continue;
      }

      // Mark email as being analyzed RIGHT NOW to prevent other webhooks from processing it
      await pool.query(
        'UPDATE emails SET analyzed_at = NOW() WHERE id = $1 AND analyzed_at IS NULL',
        [savedEmail.id]
      );
      console.log('🔒 Email locked for analysis');
      console.log('');

      // STEP 5: Analyze with LLM for multiple Power Toys
      console.log('🤖 AI POWER TOY: Multi-Toy Analysis');
      console.log('─'.repeat(80));

      // Detect if email is outgoing (from the monitored user)
      const userEmail = 'victor.heifets@msd.com';
      const isOutgoingEmail = message.from?.emailAddress?.address?.toLowerCase() === userEmail.toLowerCase();
      console.log(`  Email direction: ${isOutgoingEmail ? 'OUTGOING (sent by user)' : 'INCOMING (received by user)'}`);

      const detections = await analyzeEmailWithLLM(message, isOutgoingEmail);

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
        console.log('✅ Email processing completed (no detections)');
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
              detection_data: detection.detection_data,
              graph_message_id: message.id,
              body_preview: message.bodyPreview || message.body?.content?.substring(0, 1000) || '',
              is_outgoing: isOutgoingEmail
            }
          });
          console.log(`📡 SSE event broadcasted for ${detection.toy_type} detection`);

          // Create notification for AU client
          const toyIcons: Record<string, string> = {
            'follow_up': '⏰',
            'kudos': '🌟',
            'task': '✅',
            'urgent': '🚨',
            'meeting_summary': '📋'
          };

          const toyTitles: Record<string, string> = {
            'follow_up': 'Follow-Up Reminder',
            'kudos': 'Kudos Detected',
            'task': 'New Task',
            'urgent': 'Urgent Item',
            'meeting_summary': 'Meeting Summary'
          };

          const notifMessage = detection.toy_type === 'follow_up'
            ? `${detection.detection_data.action}`
            : detection.toy_type === 'kudos'
            ? `${detection.detection_data.achievement || 'Great work recognized!'}`
            : detection.toy_type === 'task'
            ? `${detection.detection_data.task_description || 'New task detected'}`
            : detection.toy_type === 'urgent'
            ? `${detection.detection_data.reason || 'Urgent action needed'}`
            : 'New notification';

          await pool.query(
            `INSERT INTO notifications (user_email, detection_id, notification_type, title, message, status, action_buttons, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              savedEmail.user_email,
              savedDetection.id,
              detection.toy_type,
              toyTitles[detection.toy_type] || detection.toy_type,
              notifMessage,
              'unread',
              JSON.stringify([{ label: 'View', action: 'view' }]),
              JSON.stringify({
                subject: message.subject,
                from: message.from?.emailAddress?.address || 'unknown',
                received_at: message.receivedDateTime,
                graph_message_id: message.id
              })
            ]
          );
          console.log(`📬 Notification created for detection ID ${savedDetection.id}`);
        }

        console.log('✅ Email processing completed');
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
  const hasToken = !!(storedGraphToken || ACCESS_TOKEN);

  // Check subscriptions
  let subscriptions: any[] = [];
  let subscriptionWarnings: string[] = [];

  if (hasToken) {
    try {
      const cleanToken = (storedGraphToken || ACCESS_TOKEN).trim().replace(/^Bearer\s+/i, '');
      const subResponse = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        subscriptions = subData.value || [];

        // Check each subscription
        for (const sub of subscriptions) {
          const expiresAt = new Date(sub.expirationDateTime);
          const now = new Date();
          const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntilExpiry < 0) {
            subscriptionWarnings.push(`⚠️ Subscription expired: ${sub.resource}`);
          } else if (hoursUntilExpiry < 12) {
            subscriptionWarnings.push(`⚠️ Subscription expires in ${Math.round(hoursUntilExpiry)}h: ${sub.resource}`);
          }
        }

        if (subscriptions.length === 0) {
          subscriptionWarnings.push('⚠️ No active subscriptions found');
        }
      }
    } catch (err) {
      console.error('Error fetching subscriptions for health check:', err);
    }
  }

  // Check last webhook timestamp
  const webhookWarnings: string[] = [];
  if (lastWebhookReceived) {
    const minutesSinceLastWebhook = (Date.now() - lastWebhookReceived.getTime()) / (1000 * 60);
    if (minutesSinceLastWebhook > 60) {
      webhookWarnings.push(`⚠️ No webhooks received in ${Math.round(minutesSinceLastWebhook)} minutes`);
    }
  } else if (subscriptions.length > 0) {
    webhookWarnings.push('ℹ️ No webhooks received yet (server just started?)');
  }

  // Build diagnostics array for display
  const diagnostics: any[] = [];

  if (!hasToken) {
    diagnostics.push({
      component: 'Graph API',
      severity: 'ERROR',
      issue: 'Access token not configured',
      impact: 'Incoming webhooks cannot fetch email content',
      action: 'Go to Settings → paste token → click Apply Token'
    });
  }

  if (!MERCK_GPT_API_KEY && !OPENAI_API_KEY) {
    diagnostics.push({
      component: 'AI Detection',
      severity: 'WARNING',
      issue: 'No LLM API configured (Merck GPT or OpenAI)',
      impact: 'Using keyword-based mock detection instead of AI',
      action: 'Set MERCK_GPT_API_KEY or OPENAI_API_KEY environment variable for better detection'
    });
  } else if (MERCK_GPT_API_KEY) {
    diagnostics.push({
      component: 'AI Detection',
      severity: 'SUCCESS',
      issue: 'Using Merck GPT API',
      impact: 'Full AI-powered detection enabled',
      action: 'All systems operational'
    });
  }

  if (sseClients.size === 0) {
    diagnostics.push({
      component: 'AU Client',
      severity: 'WARNING',
      issue: 'No AU clients connected',
      impact: 'Power Toy notifications will not appear on desktop',
      action: 'Start the AU client: cd client-agent && npm run dev'
    });
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    notificationsReceived: webhooksReceivedCount,
    database: dbConnected ? 'connected' : 'disconnected',
    sseClients: sseClients.size,
    lastWebhookReceived: lastWebhookReceived ? lastWebhookReceived.toISOString() : null,
    subscriptions: {
      count: subscriptions.length,
      details: subscriptions.map(sub => ({
        id: sub.id,
        resource: sub.resource,
        notificationUrl: sub.notificationUrl,
        expirationDateTime: sub.expirationDateTime
      }))
    },
    features: {
      graphAPI: hasToken,
      graphAPIStatus: hasToken ? 'connected' : 'missing',
      llmAnalysis: !!(MERCK_GPT_API_KEY || OPENAI_API_KEY),
      llmStatus: MERCK_GPT_API_KEY ? 'merck-gpt' : (OPENAI_API_KEY ? 'openai' : 'mock'),
      llmProvider: MERCK_GPT_API_KEY ? 'Merck GPT' : (OPENAI_API_KEY ? 'OpenAI' : 'Mock'),
      database: dbConnected,
      databaseStatus: dbConnected ? 'connected' : 'disconnected'
    },
    warnings: [
      ...(!hasToken ? ['⚠️ Graph API token not set - webhooks will be skipped'] : []),
      ...(!MERCK_GPT_API_KEY && !OPENAI_API_KEY ? ['⚠️ No LLM API configured - using mock detection'] : []),
      ...(MERCK_GPT_API_KEY ? ['✅ Using Merck GPT API for AI detection'] : []),
      ...(sseClients.size === 0 ? ['⚠️ No AU clients connected'] : []),
      ...subscriptionWarnings,
      ...webhookWarnings
    ],
    diagnostics
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

// Get LLM mode configuration
app.get('/api/config/llm-mode', (req, res) => {
  res.json({
    llmMode: llmModeEnabled,
    description: llmModeEnabled
      ? 'LLM semantic analysis enabled (Merck GPT-5)'
      : 'Keyword-based detection fallback active'
  });
});

// Update LLM mode configuration
app.post('/api/config/llm-mode', (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled field must be boolean' });
    }

    llmModeEnabled = enabled;
    console.log(`🔧 LLM mode ${enabled ? 'ENABLED' : 'DISABLED'} - Using ${enabled ? 'semantic analysis' : 'keyword detection'}`);

    res.json({
      success: true,
      llmMode: llmModeEnabled,
      message: `LLM mode ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error: any) {
    console.error('Error updating LLM mode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create calendar event endpoint (for Follow-Up toy "Open Scheduler" action)
app.post('/api/create-calendar-event', async (req, res) => {
  try {
    const { subject, body, startDateTime, endDateTime } = req.body;

    if (!subject || !startDateTime || !endDateTime) {
      return res.status(400).json({
        error: 'Missing required fields: subject, startDateTime, endDateTime'
      });
    }

    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({ error: 'No Graph token available' });
    }

    // Clean the token
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

    // Prepare calendar event
    const calendarEvent = {
      subject: subject,
      body: {
        contentType: 'Text',
        content: body || ''
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      }
    };

    // Create event via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendarEvent)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create calendar event:', errorText);
      return res.status(response.status).json({
        error: 'Failed to create calendar event',
        details: errorText
      });
    }

    const eventData = await response.json();
    console.log('✅ Calendar event created:', eventData.webLink);

    res.json({
      success: true,
      event: eventData,
      webLink: eventData.webLink,
      message: 'Calendar event created successfully'
    });

  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email web link endpoint (for Urgent toy "Open Email" action)
// Get email data by Graph message ID
app.get('/api/email/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const email = await db.getEmailByGraphId(messageId);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error: any) {
    console.error('Error getting email:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/email-weblink/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({ error: 'No Graph token available' });
    }

    // Clean the token
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');

    // Get message with webLink via Microsoft Graph API
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=webLink,subject`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get email webLink:', errorText);
      return res.status(response.status).json({
        error: 'Failed to get email webLink',
        details: errorText
      });
    }

    const emailData = await response.json();
    console.log('✅ Email webLink retrieved:', emailData.webLink);

    res.json({
      success: true,
      webLink: emailData.webLink,
      subject: emailData.subject
    });

  } catch (error: any) {
    console.error('Error getting email webLink:', error);
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

// Send meeting summary email endpoint
app.post('/api/send-meeting-summary', async (req, res) => {
  try {
    const { meetingData } = req.body;

    if (!meetingData) {
      return res.status(400).json({
        error: 'Missing required field: meetingData'
      });
    }

    // Use stored token
    if (!storedGraphToken) {
      return res.status(400).json({
        error: 'No Graph token configured. Please set token in dashboard settings.'
      });
    }

    const cleanToken = storedGraphToken.trim().replace(/^Bearer\s+/i, '');

    // Format email body with meeting summary, transcript, and action items
    const emailBody = `
Meeting Summary: ${meetingData.meeting_title}

Time: ${new Date(meetingData.start_time).toLocaleString()} - ${new Date(meetingData.end_time).toLocaleString()}

=== SUMMARY ===
${meetingData.summary}

=== ACTION ITEMS ===
${meetingData.action_items.map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}

=== TRANSCRIPT ===
${meetingData.transcript}

---
This summary was automatically generated by AI Power Toys.
    `.trim();

    // Prepare email message with all attendees as recipients
    const toRecipients = meetingData.attendees.map((attendee: any) => ({
      emailAddress: {
        name: attendee.name,
        address: attendee.email
      }
    }));

    const emailMessage = {
      message: {
        subject: `Meeting Summary: ${meetingData.meeting_title}`,
        body: {
          contentType: 'Text',
          content: emailBody
        },
        toRecipients: toRecipients
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
      console.error('Failed to send meeting summary:', errorText);

      let errorMessage = 'Failed to send meeting summary email';
      if (response.status === 403) {
        errorMessage = 'Permission denied. Your token needs Mail.Send permission.';
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: errorText,
        status: response.status
      });
    }

    console.log(`📧 Meeting summary sent successfully to ${meetingData.attendees.length} attendees`);
    res.json({
      success: true,
      message: 'Meeting summary email sent successfully',
      recipients: meetingData.attendees.map((a: any) => a.email),
      subject: `Meeting Summary: ${meetingData.meeting_title}`
    });

  } catch (error: any) {
    console.error('Error sending meeting summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Teams and channels
app.get('/api/teams/channels', async (req, res) => {
  try {
    if (!storedGraphToken) {
      return res.status(400).json({ error: 'No Graph token configured. Please set token in dashboard settings.' });
    }

    const cleanToken = storedGraphToken.trim().replace(/^Bearer\s+/i, '');

    // Get all teams the user is a member of
    const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text();
      return res.status(teamsResponse.status).json({ error: errorText });
    }

    const teamsData: any = await teamsResponse.json();
    const teams = teamsData.value || [];

    // For each team, get its channels
    const teamsWithChannels = await Promise.all(
      teams.map(async (team: any) => {
        try {
          const channelsResponse = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.id}/channels`, {
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (channelsResponse.ok) {
            const channelsData: any = await channelsResponse.json();
            return {
              id: team.id,
              displayName: team.displayName,
              description: team.description,
              channels: channelsData.value || []
            };
          } else {
            return {
              id: team.id,
              displayName: team.displayName,
              description: team.description,
              channels: [],
              error: 'Failed to fetch channels'
            };
          }
        } catch (err) {
          return {
            id: team.id,
            displayName: team.displayName,
            description: team.description,
            channels: [],
            error: 'Failed to fetch channels'
          };
        }
      })
    );

    res.json({ teams: teamsWithChannels });

  } catch (error: any) {
    console.error('Error fetching Teams channels:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to Teams channel
app.post('/api/teams/subscribe', async (req, res) => {
  try {
    const { teamId, channelId, notificationUrl } = req.body;

    if (!teamId || !channelId || !notificationUrl) {
      return res.status(400).json({
        error: 'Missing required fields: teamId, channelId, notificationUrl'
      });
    }

    if (!storedGraphToken) {
      return res.status(400).json({
        error: 'No Graph token configured. Please set token in dashboard settings.'
      });
    }

    const cleanToken = storedGraphToken.trim().replace(/^Bearer\s+/i, '');

    // Create subscription for Teams channel messages
    const expirationDateTime = new Date();
    expirationDateTime.setHours(expirationDateTime.getHours() + 1); // 1 hour max for Teams messages

    const subscriptionData = {
      changeType: 'created',
      notificationUrl: notificationUrl,
      resource: `/teams/${teamId}/channels/${channelId}/messages`,
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: 'AIPowerToysSecret123'
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create Teams subscription:', errorText);
      return res.status(response.status).json({
        error: 'Failed to create Teams subscription',
        details: errorText
      });
    }

    const data = await response.json();
    console.log(`✅ Teams channel subscription created! ID: ${data.id}`);

    res.json({
      success: true,
      message: 'Teams channel subscription created successfully',
      subscription: data
    });

  } catch (error: any) {
    console.error('Error creating Teams subscription:', error);
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

// Create subscription for Inbox (incoming emails)
app.post('/api/subscribe-inbox', async (req, res) => {
  try {
    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: 'No Graph token available. Please set token in dashboard first.' });
    }

    const notificationUrl = req.body.notificationUrl || 'https://sun-opt-schemes-truck.trycloudflare.com/webhook';

    const subscription = {
      changeType: 'created',
      notificationUrl: notificationUrl,
      resource: '/me/messages',  // All messages (inbox + sent)
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      clientState: 'AIPowerToysSecret123'
    };

    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creating subscription:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    console.log('✅ Inbox subscription created:', result.id);
    res.json({
      success: true,
      subscription: result,
      message: 'Inbox subscription created successfully. You will now receive webhooks for all emails.'
    });
  } catch (error: any) {
    console.error('❌ Failed to create Inbox subscription:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create subscription for Sent Items
app.post('/api/subscribe-sent-items', async (req, res) => {
  try {
    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: 'No Graph token available. Please set token in dashboard first.' });
    }

    const subscription = {
      changeType: 'created',
      notificationUrl: 'https://spoke-promotions-pub-rock.trycloudflare.com/webhook',
      resource: '/me/mailFolders/sentitems/messages',
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      clientState: 'AIPowerToysSecret123'
    };

    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    console.log('✅ Sent Items subscription created:', result.id);
    res.json({
      success: true,
      subscription: result,
      message: 'Sent Items subscription created successfully. You will now receive webhooks for outgoing emails.'
    });
  } catch (error: any) {
    console.error('❌ Failed to create Sent Items subscription:', error.message);
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

// Get notifications for user
app.get('/api/notifications', async (req, res) => {
  try {
    const userEmail = req.query.userEmail as string;
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail query parameter is required' });
    }

    const result = await pool.query(
      `SELECT n.*,
              e.subject as email_subject,
              e.from_email,
              e.received_at,
              d.toy_type,
              d.confidence_score
       FROM notifications n
       JOIN power_toy_detections d ON n.detection_id = d.id
       JOIN emails e ON d.email_id = e.id
       WHERE n.user_email = $1
       ORDER BY n.created_at DESC`,
      [userEmail]
    );

    res.json({ notifications: result.rows });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread notifications for user
app.get('/api/notifications/unread', async (req, res) => {
  try {
    const userEmail = req.query.userEmail as string;
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail query parameter is required' });
    }

    const result = await pool.query(
      `SELECT n.*,
              e.subject as email_subject,
              e.from_email,
              e.received_at,
              d.toy_type,
              d.confidence_score
       FROM notifications n
       JOIN power_toy_detections d ON n.detection_id = d.id
       JOIN emails e ON d.email_id = e.id
       WHERE n.user_email = $1 AND n.status = 'unread'
       ORDER BY n.created_at DESC`,
      [userEmail]
    );

    res.json({ unread: result.rows });
  } catch (error: any) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update notification status (mark as read, dismissed, etc.)
app.patch('/api/notifications/:notificationId', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const { status } = req.body;

    const validStatuses = ['unread', 'read', 'dismissed', 'snoozed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updateField = status === 'read' ? 'read_at' :
                       status === 'dismissed' ? 'dismissed_at' : null;

    let query = `UPDATE notifications SET status = $1`;
    const params: any[] = [status, notificationId];

    if (updateField) {
      query += `, ${updateField} = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = $2`;

    await pool.query(query, params);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification:', error);
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
        detection_data: { test: true },
        graph_message_id: 'test-message-id-999',
        body_preview: 'This is a test email body for the follow-up reminder. Please complete the Q4 report and send it to me by end of day Friday. The report should include all quarterly metrics, performance analysis, and forecasts for next quarter. Let me know if you have any questions or need additional information.',
        is_outgoing: toy_type === 'follow_up' // Follow-up is for outgoing emails
      }
    });

    res.json({ success: true, message: 'Test notification sent to connected clients' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test meeting summary notification endpoint
app.post('/api/test-meeting-summary', async (req, res) => {
  try {
    console.log(`📝 Test meeting summary notification triggered! Broadcasting to ${sseClients.size} clients`);

    // Mock meeting data
    const mockMeetingData = {
      meeting_id: 'test-meeting-123',
      meeting_title: 'Q4 Planning Discussion',
      attendees: [
        { name: 'Victor Heifets', email: 'victor.heifets@msd.com' },
        { name: 'John Doe', email: 'john.doe@msd.com' },
        { name: 'Jane Smith', email: 'jane.smith@msd.com' }
      ],
      start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      end_time: new Date().toISOString(),
      transcript: `
[00:02] Victor Heifets: Good morning everyone. Let's discuss our Q4 planning.
[00:05] John Doe: Thanks for organizing this. I have my notes ready.
[00:08] Jane Smith: Great, I'm ready as well.
[00:12] Victor Heifets: First topic - project timeline. John, can you update us?
[00:15] John Doe: Sure. The development phase should wrap up by October 15th.
[00:20] Jane Smith: That works for us on the marketing side.
[00:25] Victor Heifets: Perfect. Next, budget allocation...
      `.trim(),
      summary: `Team discussed Q4 planning with focus on project timelines and budget. Key decisions:
- Development phase target: October 15th
- Marketing team aligned with timeline
- Budget review scheduled for next week`,
      action_items: [
        'John to finalize development timeline by Oct 15',
        'Jane to prepare marketing campaign materials',
        'Victor to schedule budget review meeting'
      ]
    };

    // Broadcast SSE event immediately
    broadcastSSE({
      type: 'new_email',
      data: {
        email_id: 998,
        subject: `Meeting Summary: ${mockMeetingData.meeting_title}`,
        from: 'teams-bot@microsoft.com',
        toy_type: 'meeting_summary',
        detection_id: 998,
        confidence: 1.0,
        detection_data: mockMeetingData,
        graph_message_id: 'test-meeting-message-998',
        body_preview: mockMeetingData.summary,
        is_outgoing: false
      }
    });

    res.json({ success: true, message: 'Meeting summary notification sent to connected clients', data: mockMeetingData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test blocker notification endpoint
app.post('/api/test-blocker', async (req, res) => {
  try {
    console.log(`🚧 Test blocker notification triggered! Broadcasting to ${sseClients.size} clients`);

    // Mock blocker data
    const mockBlockerData = {
      blocker_type: 'technical',
      blocker_description: 'Deployment to production is failing due to authentication error. Build succeeds locally but fails in CI/CD pipeline. Waiting for DevOps team to check credentials.',
      blocked_person: 'John Doe',
      message_link: 'https://teams.microsoft.com/l/message/19:abc123@thread.tacv2/1234567890',
      detected_at: new Date().toISOString()
    };

    // Broadcast SSE event immediately
    broadcastSSE({
      type: 'new_email',
      data: {
        email_id: 997,
        subject: `🚧 Blocker: ${mockBlockerData.blocker_description.substring(0, 50)}...`,
        from: mockBlockerData.blocked_person,
        toy_type: 'blocker',
        detection_id: 997,
        confidence: 0.85,
        detection_data: mockBlockerData,
        graph_message_id: 'test-blocker-message-997',
        body_preview: mockBlockerData.blocker_description,
        is_outgoing: false
      }
    });

    res.json({ success: true, message: 'Blocker notification sent to connected clients', data: mockBlockerData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Teams channel message webhook endpoint
app.post('/webhook/teams', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('💬 TEAMS WEBHOOK REQUEST RECEIVED');
  console.log('='.repeat(80));

  // STEP 1: Handle subscription validation
  if (req.query?.validationToken) {
    const validationToken = req.query.validationToken as string;
    console.log('✅ Validation request - returning token');
    return res.status(200).send(validationToken);
  }

  // STEP 2: Verify client state
  const notifications = req.body?.value || [];
  if (notifications.length === 0) {
    console.log('⚠️  No notifications in request body');
    return res.status(202).json({ message: 'No notifications to process' });
  }

  console.log(`📬 Processing ${notifications.length} Teams notification(s)`);

  // STEP 3: Process each notification
  for (const notification of notifications) {
    try {
      const clientState = notification.clientState;
      if (clientState !== 'AIPowerToysSecret123') {
        console.log(`⚠️  Client state mismatch: expected "AIPowerToysSecret123", got "${clientState}"`);
        continue;
      }

      // Get message details from Graph API
      const messageUrl = notification.resource;
      console.log(`📥 Fetching Teams message: ${messageUrl}`);

      if (!storedGraphToken) {
        console.log('⚠️  No Graph token configured, skipping');
        continue;
      }

      const messageResponse = await fetch(`https://graph.microsoft.com/v1.0${messageUrl}`, {
        headers: {
          'Authorization': `Bearer ${storedGraphToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!messageResponse.ok) {
        console.error('Failed to fetch Teams message:', messageResponse.status);
        continue;
      }

      const message = await messageResponse.json();
      console.log(`💬 Teams message from: ${message.from?.user?.displayName}`);
      console.log(`Content preview: ${message.body?.content?.substring(0, 100)}...`);

      // Analyze for blocker
      const blockerDetection = await analyzeTeamsMessageForBlocker(message);

      if (blockerDetection) {
        console.log(`🚧 BLOCKER DETECTED! Type: ${blockerDetection.detection_data.blocker_type}, Confidence: ${blockerDetection.confidence_score}`);

        // Broadcast SSE notification
        broadcastSSE({
          type: 'new_email',
          data: {
            email_id: Date.now(),
            subject: `🚧 Blocker: ${blockerDetection.detection_data.blocker_description.substring(0, 50)}...`,
            from: blockerDetection.detection_data.blocked_person,
            toy_type: 'blocker',
            detection_id: Date.now(),
            confidence: blockerDetection.confidence_score,
            detection_data: blockerDetection.detection_data,
            graph_message_id: message.id,
            body_preview: blockerDetection.detection_data.blocker_description,
            is_outgoing: false
          }
        });

        console.log('✅ Blocker notification sent to connected clients');
      } else {
        console.log('ℹ️  No blocker detected in this message');
      }

    } catch (error: any) {
      console.error('Error processing Teams notification:', error);
    }
  }

  res.status(202).json({ message: 'Teams notifications processed' });
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

// Custom Toys API Endpoints
// Get all custom toys for a user
app.get('/api/custom-toys/:userEmail', async (req, res) => {
  try {
    const customToys = await db.getCustomToys(req.params.userEmail);
    res.json(customToys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new custom toy
app.post('/api/custom-toys', async (req, res) => {
  try {
    const { user_email, toy_name, icon, user_description, action_type, action_config, enabled } = req.body;

    if (!user_email || !toy_name || !user_description || !action_type || !action_config) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const customToy = await db.insertCustomToy({
      user_email,
      toy_name,
      icon: icon || '⏰',
      user_description,
      action_type,
      action_config,
      enabled: enabled !== undefined ? enabled : true
    });

    res.json(customToy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update custom toy
app.put('/api/custom-toys/:id', async (req, res) => {
  try {
    const { toy_name, icon, user_description, action_type, action_config, enabled } = req.body;

    const updated = await db.updateCustomToy(parseInt(req.params.id), {
      toy_name,
      icon,
      user_description,
      action_type,
      action_config,
      enabled
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete custom toy
app.delete('/api/custom-toys/:id', async (req, res) => {
  try {
    await db.deleteCustomToy(parseInt(req.params.id));
    res.json({ success: true, message: 'Custom toy deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test custom toy with sample email
app.post('/api/custom-toys/test', async (req, res) => {
  try {
    const { user_description, test_email, token } = req.body;

    if (!user_description || !test_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse test email (simple format: From/Subject/Body)
    const emailLines = test_email.split('\n');
    const mockEmail = {
      from: { emailAddress: { address: 'unknown' } },
      subject: 'Test Email',
      body: { content: test_email },
      sentDateTime: new Date().toISOString()
    };

    // Extract From and Subject if provided
    for (const line of emailLines) {
      if (line.toLowerCase().startsWith('from:')) {
        mockEmail.from.emailAddress.address = line.substring(5).trim();
      } else if (line.toLowerCase().startsWith('subject:')) {
        mockEmail.subject = line.substring(8).trim();
      }
    }

    // Call LLM to test if email matches description
    const prompt = `
You are testing a custom email detection rule.

User's detection rule: "${user_description}"

Test email:
From: ${mockEmail.from.emailAddress.address}
Subject: ${mockEmail.subject}
Body: ${mockEmail.body.content}

Does this email match the user's description?

Return JSON:
{
  "match": true/false,
  "analysis": "Brief explanation of why it matches or doesn't match"
}
`;

    const useMerckAPI = !!MERCK_GPT_API_KEY;

    if (!useMerckAPI && !OPENAI_API_KEY) {
      // Mock analysis for testing
      const lowerDesc = user_description.toLowerCase();
      const lowerEmail = test_email.toLowerCase();

      const keywords = lowerDesc.match(/\b\w+\b/g) || [];
      const matchCount = keywords.filter((kw: string) => kw.length > 3 && lowerEmail.includes(kw)).length;
      const match = matchCount >= 2;

      return res.json({
        match,
        analysis: match
          ? `This email appears to match your description. Found ${matchCount} matching keywords.`
          : `This email doesn't match your description well. Only ${matchCount} matching keywords found.`
      });
    }

    // Call LLM API (Merck or OpenAI)
    let response;
    if (useMerckAPI) {
      response = await fetch(MERCK_GPT_API_URL, {
        method: 'POST',
        headers: {
          'api-key': MERCK_GPT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are testing email detection rules. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    } else {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are testing email detection rules. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    }

    if (!response.ok) {
      throw new Error('LLM API call failed');
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TASK MANAGEMENT API ENDPOINTS
// ============================================================================

import taskDB from './database/tasks';

// Get all tasks with filters
app.get('/api/tasks/:userEmail', async (req, res) => {
  try {
    const filters: any = {};

    // Parse query parameters
    if (req.query.status) {
      filters.status = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
    }
    if (req.query.task_type) {
      filters.task_type = Array.isArray(req.query.task_type) ? req.query.task_type : [req.query.task_type];
    }
    if (req.query.priority) {
      filters.priority = Array.isArray(req.query.priority) ? req.query.priority : [req.query.priority];
    }
    if (req.query.source) {
      filters.source = Array.isArray(req.query.source) ? req.query.source : [req.query.source];
    }
    if (req.query.timeframe) {
      filters.timeframe = req.query.timeframe as string;
    }
    if (req.query.search) {
      filters.search = req.query.search as string;
    }
    if (req.query.include_deleted === 'true') {
      filters.include_deleted = true;
    }

    const tasks = await taskDB.getTasks(req.params.userEmail, filters);
    res.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single task by ID
app.get('/api/tasks/:userEmail/:taskId', async (req, res) => {
  try {
    const task = await taskDB.getTaskById(parseInt(req.params.taskId));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new manual task
app.post('/api/tasks', async (req, res) => {
  try {
    const { user_email, title, notes, due_date, priority, input_method, raw_input, llm_enabled } = req.body;

    if (!user_email || !title) {
      return res.status(400).json({ error: 'user_email and title are required' });
    }

    let taskData: any = {
      user_email,
      title,
      notes,
      due_date: due_date ? new Date(due_date) : null,
      priority: priority || 'medium',
      input_method,
      raw_input,
      task_type: 'manual',
      source: 'manual',
      status: 'pending'
    };

    // If LLM parsing is enabled, parse the raw input
    // Create task IMMEDIATELY for instant response
    const newTask = await taskDB.createTask(taskData);

    // Respond to user right away (don't wait for LLM)
    res.json(newTask);

    // Broadcast initial SSE event
    broadcastSSE({
      type: 'task_created',
      data: newTask
    });

    // If LLM parsing is enabled, parse in BACKGROUND (non-blocking)
    if (llm_enabled && raw_input) {
      console.log('🤖 LLM parsing in background for:', raw_input);
      
      // Don't await - parse asynchronously
      taskDB.parseLLM(raw_input, user_email).then(async (llmResult) => {
        console.log('✅ LLM parsing completed:', llmResult);
        
        // Update task with LLM results
        const updates: any = {
          title: llmResult.title,
          due_date: llmResult.due_date ? new Date(llmResult.due_date) : null,
          priority: llmResult.priority,
          task_type: llmResult.task_type,
          mentioned_people: llmResult.mentioned_people,
          tags: llmResult.tags,
          llm_parsed_data: llmResult
        };
        
        await taskDB.updateTask(newTask.id!, updates);
        
        // Broadcast update to clients
        broadcastSSE({
          type: 'task_updated',
          data: { ...newTask, ...updates }
        });
      }).catch((error) => {
        console.error('❌ LLM parsing failed (task already created):', error.message);
      });
    }
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Parse natural language with LLM (without creating task)
app.post('/api/tasks/parse', async (req, res) => {
  try {
    const { text, user_email } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const llmResult = await taskDB.parseLLM(text, user_email || 'unknown');
    res.json(llmResult);
  } catch (error: any) {
    console.error('Error parsing with LLM:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task
app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const { title, notes, due_date, priority, status, toy_type, mentioned_people, tags, reparse_with_llm } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (notes !== undefined) updates.notes = notes;
    if (due_date !== undefined) updates.due_date = due_date ? new Date(due_date) : null;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (toy_type !== undefined) updates.toy_type = toy_type;
    if (mentioned_people !== undefined) updates.mentioned_people = mentioned_people;
    if (tags !== undefined) updates.tags = tags;

    // Re-parse with LLM if requested
    if (reparse_with_llm && title) {
      const task = await taskDB.getTaskById(parseInt(req.params.taskId));
      if (task && task.raw_input) {
        const llmResult = await taskDB.parseLLM(title, 'unknown');
        updates.llm_parsed_data = llmResult;
        updates.due_date = llmResult.due_date ? new Date(llmResult.due_date) : null;
        updates.priority = llmResult.priority;
        updates.mentioned_people = llmResult.mentioned_people;
        updates.tags = llmResult.tags;
      }
    }

    const updatedTask = await taskDB.updateTask(parseInt(req.params.taskId), updates);

    // Broadcast SSE event
    broadcastSSE({
      type: 'task_updated',
      data: updatedTask
    });

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete task
app.post('/api/tasks/:taskId/complete', async (req, res) => {
  try {
    await taskDB.completeTask(parseInt(req.params.taskId));

    // Broadcast SSE event
    broadcastSSE({
      type: 'task_completed',
      data: { task_id: parseInt(req.params.taskId) }
    });

    res.json({ success: true, message: 'Task completed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Snooze task
app.post('/api/tasks/:taskId/snooze', async (req, res) => {
  try {
    const { duration } = req.body;

    if (!duration) {
      return res.status(400).json({ error: 'duration is required (1h, 4h, tomorrow, next_week, or ISO timestamp)' });
    }

    await taskDB.snoozeTask(parseInt(req.params.taskId), duration);

    // Broadcast SSE event
    broadcastSSE({
      type: 'task_snoozed',
      data: { task_id: parseInt(req.params.taskId), duration }
    });

    res.json({ success: true, message: 'Task snoozed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task (soft delete)
app.delete('/api/tasks/:taskId', async (req, res) => {
  try {
    await taskDB.deleteTask(parseInt(req.params.taskId));

    // Broadcast SSE event
    broadcastSSE({
      type: 'task_deleted',
      data: { task_id: parseInt(req.params.taskId) }
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore deleted task
app.post('/api/tasks/:taskId/restore', async (req, res) => {
  try {
    await taskDB.restoreTask(parseInt(req.params.taskId));
    res.json({ success: true, message: 'Task restored' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations
app.post('/api/tasks/bulk', async (req, res) => {
  try {
    const { task_ids, action, params } = req.body;

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({ error: 'task_ids array is required' });
    }

    if (!action || !['complete', 'delete', 'snooze'].includes(action)) {
      return res.status(400).json({ error: 'action must be complete, delete, or snooze' });
    }

    await taskDB.bulkUpdateTasks(task_ids, action, params);

    // Broadcast SSE event
    broadcastSSE({
      type: 'tasks_bulk_update',
      data: { task_ids, action }
    });

    res.json({ success: true, message: `${task_ids.length} tasks ${action}d` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get task statistics
app.get('/api/tasks/:userEmail/stats', async (req, res) => {
  try {
    const stats = await taskDB.getTaskStats(req.params.userEmail);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calendar API - Create follow-up event with email attachment
app.post('/api/calendar/create-follow-up', async (req, res) => {
  try {
    const { emailSubject, graphMessageId, userEmail } = req.body;

    if (!graphMessageId) {
      return res.status(400).json({ error: 'graphMessageId is required' });
    }

    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({ error: 'No Graph token available' });
    }

    // Calculate date: 1 week from now at 8:00 AM, 30 minutes duration
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    startDate.setHours(8, 0, 0, 0); // 8:00 AM

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30); // 30 minutes duration

    // Format dates for Graph API (ISO 8601)
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    // Create calendar event with email attachment
    const event = {
      subject: `Follow-up: ${emailSubject}`,
      body: {
        contentType: 'HTML',
        content: `<p>Follow-up meeting regarding email: <strong>${emailSubject}</strong></p>`
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      },
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
      singleValueExtendedProperties: [{
        id: 'String {66f5a359-4659-4830-9070-00047ec6ac6e} Name EmailMessageId',
        value: graphMessageId
      }]
    };

    console.log(`📅 Creating calendar event: "${event.subject}" on ${startDate.toLocaleString()}`);

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Graph API error:', error);
      return res.status(response.status).json({ error: `Graph API error: ${error}` });
    }

    const createdEvent = await response.json();
    console.log('✅ Calendar event created:', createdEvent.id);

    res.json({
      success: true,
      event: createdEvent,
      webLink: createdEvent.webLink
    });

  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email content by Graph message ID
app.get('/api/email/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const token = storedGraphToken || ACCESS_TOKEN;
    if (!token) {
      return res.status(401).json({ error: 'No Graph token available' });
    }

    // Fetch the email content from Graph API
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: `Graph API error: ${error}` });
    }

    const message = await response.json();

    // Extract plain text or HTML content
    const emailContent = message.body?.content || '';
    const contentType = message.body?.contentType || 'text';

    res.json({
      success: true,
      subject: message.subject,
      from: message.from?.emailAddress?.address || 'unknown',
      content: emailContent,
      contentType: contentType,
      receivedDateTime: message.receivedDateTime
    });

  } catch (error: any) {
    console.error('Error fetching email content:', error);
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
            <span class="feature ${MERCK_GPT_API_KEY || OPENAI_API_KEY ? 'enabled' : 'disabled'}">
              ${MERCK_GPT_API_KEY ? '✅ Merck GPT' : (OPENAI_API_KEY ? '✅ OpenAI' : '⚠️ Mock')}
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

  // Show LLM status
  if (MERCK_GPT_API_KEY) {
    console.log(`🤖 LLM Provider: ✅ Merck GPT API (${MERCK_GPT_API_URL})`);
  } else if (OPENAI_API_KEY) {
    console.log(`🤖 LLM Provider: ✅ OpenAI GPT-4`);
  } else {
    console.log(`🤖 LLM Provider: ⚠️  Mock (keyword-based detection)`);
  }

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
