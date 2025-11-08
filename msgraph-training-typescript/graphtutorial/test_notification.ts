// Test sending a system notification

import { sendSystemNotification } from './teams_notifier';

async function testNotification() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Testing Teams System Notification                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const GRAPH_TOKEN = process.env.GRAPH_TOKEN || '';
  const TEAMS_APP_ID = process.env.TEAMS_APP_ID || '';

  if (!GRAPH_TOKEN) {
    console.log('❌ GRAPH_TOKEN not set!\n');
    console.log('Set your token:');
    console.log('  export GRAPH_TOKEN="your_token_here"');
    console.log('  npx ts-node test_notification.ts\n');
    return;
  }

  if (!TEAMS_APP_ID) {
    console.log('⚠️  TEAMS_APP_ID not set!\n');
    console.log('To enable system notifications, you need to:');
    console.log('  1. Register a Teams app at https://dev.teams.microsoft.com/');
    console.log('  2. Copy the App ID');
    console.log('  3. export TEAMS_APP_ID="your_app_id"');
    console.log('  4. Add TeamsActivity.Send permission\n');
    console.log('For now, will test with placeholder...\n');
  }

  try {
    console.log('🧪 Sending test notification...\n');

    await sendSystemNotification({
      userEmail: 'heifets@merck.com',
      emailSubject: 'Q4 Budget Review Meeting',
      actionItem: 'Send budget proposal to Sarah by Friday',
      suggestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      originalEmailId: 'test-email-id-123'
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('='.repeat(60));
    console.log('\nCheck your:');
    console.log('  1. 📬 Windows/Mac notification center (bottom-right corner)');
    console.log('  2. 📱 Teams activity feed');
    console.log('  3. 🖱️  Click the notification to open Teams with details\n');

    console.log('Expected notification:');
    console.log('─'.repeat(60));
    console.log('📬 Follow-Up Power Toy\n');
    console.log('Follow-up needed: Send budget proposal to Sarah by Friday\n');
    console.log('Email: Q4 Budget Review Meeting');
    console.log('Suggested: ' + new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString());
    console.log('\n[Click to create reminder]');
    console.log('─'.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);

    if (error.message.includes('403')) {
      console.log('\n🔍 Permission issue:');
      console.log('  - Your token needs TeamsActivity.Send permission');
      console.log('  - Go to Azure Portal → App Registration → API Permissions');
      console.log('  - Add Microsoft Graph → TeamsActivity.Send');
      console.log('  - Grant admin consent\n');
    } else if (error.message.includes('404')) {
      console.log('\n🔍 Teams app not configured:');
      console.log('  - Register Teams app at https://dev.teams.microsoft.com/');
      console.log('  - Create manifest.json (see TEAMS_SYSTEM_NOTIFICATIONS.md)');
      console.log('  - Upload to Teams and install\n');
    } else if (error.message.includes('401')) {
      console.log('\n🔍 Token expired:');
      console.log('  - Get new token from Graph Explorer');
      console.log('  - export GRAPH_TOKEN="new_token"\n');
    }
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  See TEAMS_SYSTEM_NOTIFICATIONS.md for full setup       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

testNotification();
