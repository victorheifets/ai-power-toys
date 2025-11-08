// Use manually extracted access token from Graph Explorer
// This bypasses all authentication - you just paste the token

// HOW TO GET TOKEN:
// 1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
// 2. Sign in with heifets@merck.com
// 3. Open Developer Tools (F12) → Network tab
// 4. Make any API call in Graph Explorer
// 5. Click the request → Headers → Copy Authorization header
// 6. Paste the token below (the part after "Bearer ")

const ACCESS_TOKEN = process.env.GRAPH_TOKEN || 'PASTE_YOUR_TOKEN_HERE';

async function getUserInfo() {
  console.log('\n=== Getting User Info ===\n');

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const user = await response.json();
    console.log('User Details:');
    console.log('  Name:', user.displayName);
    console.log('  Email:', user.mail || user.userPrincipalName);
    console.log('  Job Title:', user.jobTitle || 'N/A');
    console.log('  Office:', user.officeLocation || 'N/A');

    return user;
  } catch (error: any) {
    console.error('Failed to get user info:', error.message);
    throw error;
  }
}

async function listInbox() {
  console.log('\n=== Listing Inbox (Latest 10 Messages) ===\n');

  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=from,subject,receivedDateTime,isRead&$top=10&$orderby=receivedDateTime DESC',
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    const messages = data.value;

    if (messages.length === 0) {
      console.log('No messages in inbox.');
      return;
    }

    messages.forEach((msg: any, idx: number) => {
      const from = msg.from?.emailAddress?.name || 'Unknown';
      const date = new Date(msg.receivedDateTime).toLocaleString();
      const status = msg.isRead ? '✓ Read' : '✉️  Unread';
      console.log(`${idx + 1}. ${msg.subject || '(No subject)'}`);
      console.log(`   From: ${from}`);
      console.log(`   Date: ${date}`);
      console.log(`   Status: ${status}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('Failed to list inbox:', error.message);
    throw error;
  }
}

async function sendTestEmail(userEmail: string) {
  console.log('\n=== Sending Test Email ===\n');

  try {
    const mail = {
      message: {
        subject: 'Test Email from TypeScript + Graph API',
        body: {
          contentType: 'Text',
          content: 'Hello! This is a test email sent using a manually extracted access token from Graph Explorer.'
        },
        toRecipients: [
          {
            emailAddress: {
              address: userEmail
            }
          }
        ]
      }
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mail)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log(`✅ Email sent successfully to ${userEmail}!`);

  } catch (error: any) {
    console.error('Failed to send email:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Microsoft Graph API - Manual Token Mode                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Check if token is provided
  if (ACCESS_TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
    console.log('\n❌ No access token provided!\n');
    console.log('INSTRUCTIONS:');
    console.log('1. Go to: https://developer.microsoft.com/en-us/graph/graph-explorer');
    console.log('2. Sign in with heifets@merck.com');
    console.log('3. Open Developer Tools (F12) → Network tab');
    console.log('4. Make any API call (e.g., GET /me)');
    console.log('5. Click the request → Headers → Copy the Authorization header');
    console.log('6. Run this script with the token:\n');
    console.log('   export GRAPH_TOKEN="your_token_here"');
    console.log('   npx ts-node use_manual_token.ts\n');
    console.log('OR edit this file and paste the token in the ACCESS_TOKEN variable.\n');
    return;
  }

  // Validate token format
  if (!ACCESS_TOKEN.startsWith('eyJ')) {
    console.log('\n⚠️  Warning: Token doesn\'t look like a JWT token (should start with "eyJ")');
    console.log('Make sure you copied just the token, not "Bearer " prefix\n');
  }

  try {
    // Get user info
    const user = await getUserInfo();

    // List inbox
    await listInbox();

    // Send test email
    console.log('\n📧 Sending test email to yourself...\n');
    await sendTestEmail(user.mail || user.userPrincipalName);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('401')) {
      console.log('\nToken is expired or invalid. Get a new one from Graph Explorer.');
    } else if (error.message.includes('403')) {
      console.log('\nToken doesn\'t have required permissions.');
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Done! Token is valid for ~1 hour.                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main();
