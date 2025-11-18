import axios from 'axios';

const BOT_URL = 'http://localhost:3978/api/messages';

interface BotMessage {
    type: string;
    from: {
        id: string;
        name: string;
    };
    conversation: {
        id: string;
    };
    text?: string;
    value?: any;
}

async function sendMessage(text: string, value?: any): Promise<void> {
    const message: BotMessage = {
        type: 'message',
        from: {
            id: 'test-user-123',
            name: 'victor.heifets@merck.com'
        },
        conversation: {
            id: 'test-conversation-123'
        },
        text,
        value
    };

    try {
        const response = await axios.post(BOT_URL, message);
        console.log(`✅ Message sent: "${text}"`);
        console.log(`   Response status: ${response.status}`);
    } catch (error: any) {
        console.error(`❌ Error sending message: "${text}"`);
        console.error(`   Error: ${error.message}`);
        if (error.response) {
            console.error(`   Response: ${JSON.stringify(error.response.data)}`);
        }
    }
}

async function runTests() {
    console.log('🧪 Starting PCP Bot Tests\n');

    // Test 1: Set email
    console.log('Test 1: Set user email');
    await sendMessage('/set-email victor.heifets@merck.com');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Test ADO connection
    console.log('\nTest 2: Test ADO connection');
    await sendMessage('/test-ado');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Create user story with LLM
    console.log('\nTest 3: Start user story creation');
    await sendMessage('/create-us');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Provide story input
    console.log('\nTest 4: Provide story details');
    await sendMessage('Add dropdown selector | Create a dropdown component for selecting options in the UI');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 5: Create in ADO (simulate card action)
    console.log('\nTest 5: Create story in ADO');
    await sendMessage('', {
        action: 'create_in_ado',
        story: {
            title: 'As a user, I want to select options from a dropdown, so that I can choose from predefined values',
            description: 'Given a form with a dropdown field\nWhen the user clicks on the dropdown\nThen a list of options should appear\nAnd the user can select one option',
            acceptanceCriteria: '["User can click dropdown", "Options are displayed", "Selection updates the form"]',
            storyPoints: 3
        }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ All tests completed!');
    console.log('\n📊 Check the bot logs for results');
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
