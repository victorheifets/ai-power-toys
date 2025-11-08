// Orchestrator - Integrates LLM analysis with Teams notifications

import { sendSystemNotification } from './teams_notifier';

interface EmailAnalysis {
  subject: string;
  from: string;
  sentDate: string;
  actionItems: {
    description: string;
    suggestedFollowUpDate: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  emailId: string;
}

async function processEmailForFollowUp(email: any) {
  console.log('\n' + '─'.repeat(60));
  console.log('📧 Processing email for follow-up detection...');
  console.log('─'.repeat(60));
  console.log('Subject:', email.subject);
  console.log('From:', email.from?.emailAddress?.address);
  console.log('');

  try {
    // STEP 1: Analyze with LLM
    console.log('🤖 Analyzing email with LLM...');
    const analysis = await analyzeEmailWithLLM(email);

    // STEP 2: If action items found, send notification
    if (analysis.actionItems.length > 0) {
      console.log(`🎯 Found ${analysis.actionItems.length} action item(s)!\n`);

      for (const actionItem of analysis.actionItems) {
        console.log('Action Item:');
        console.log('  Description:', actionItem.description);
        console.log('  Suggested Date:', actionItem.suggestedFollowUpDate);
        console.log('  Priority:', actionItem.priority);
        console.log('');

        // Send system popup notification
        await sendSystemNotification({
          userEmail: email.from.emailAddress.address,
          emailSubject: email.subject,
          actionItem: actionItem.description,
          suggestedDate: actionItem.suggestedFollowUpDate,
          originalEmailId: email.id
        });

        console.log(`✅ Notification sent for: ${actionItem.description}\n`);
      }
    } else {
      console.log('ℹ️  No action items detected in this email.\n');
    }

  } catch (error: any) {
    console.error('❌ Error processing email:', error.message);
  }

  console.log('─'.repeat(60) + '\n');
}

async function analyzeEmailWithLLM(email: any): Promise<EmailAnalysis> {
  // This will call OpenAI/Claude to extract action items
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  if (!OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set - using mock analysis');
    return mockAnalysis(email);
  }

  const prompt = `
Analyze this email and extract any action items that need follow-up:

Subject: ${email.subject}
From: ${email.from.emailAddress.address}
Sent: ${email.sentDateTime}
Body: ${email.body.content.substring(0, 1000)}

Extract:
1. Action items that need follow-up (things the sender should do)
2. Suggested follow-up date for each (use ISO format)
3. Priority (high/medium/low)

Return as JSON with this structure:
{
  "actionItems": [
    {
      "description": "string",
      "suggestedFollowUpDate": "ISO date string",
      "priority": "high|medium|low"
    }
  ]
}

If no action items, return empty array.
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
          { role: 'system', content: 'You are an assistant that extracts action items from emails. Return only valid JSON.' },
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

    return {
      subject: email.subject,
      from: email.from.emailAddress.address,
      sentDate: email.sentDateTime,
      emailId: email.id,
      actionItems: analysis.actionItems || []
    };

  } catch (error: any) {
    console.error('❌ LLM analysis failed:', error.message);
    console.log('⚠️  Falling back to mock analysis');
    return mockAnalysis(email);
  }
}

// Mock analysis for testing without OpenAI API
function mockAnalysis(email: any): EmailAnalysis {
  // Simple keyword-based detection for testing
  const body = email.body?.content?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';

  const actionItems = [];

  // Detect common action phrases
  if (body.includes('follow up') || body.includes('get back to me') || body.includes('let me know')) {
    actionItems.push({
      description: 'Follow up on: ' + email.subject,
      suggestedFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      priority: 'medium' as const
    });
  }

  if (body.includes('urgent') || body.includes('asap') || body.includes('immediately')) {
    actionItems.push({
      description: 'Urgent response needed: ' + email.subject,
      suggestedFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      priority: 'high' as const
    });
  }

  if (body.includes('deadline') || body.includes('by friday') || body.includes('due date')) {
    actionItems.push({
      description: 'Check deadline for: ' + email.subject,
      suggestedFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      priority: 'high' as const
    });
  }

  return {
    subject: email.subject,
    from: email.from.emailAddress.address,
    sentDate: email.sentDateTime,
    emailId: email.id,
    actionItems
  };
}

export { processEmailForFollowUp, EmailAnalysis };
