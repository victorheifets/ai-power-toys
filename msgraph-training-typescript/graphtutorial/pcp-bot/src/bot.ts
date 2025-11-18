import { ActivityHandler, TurnContext, ConversationState, UserState, CardFactory, InvokeResponse } from 'botbuilder';
import { createStandupCard, createEODCard } from './cards';

export class PCPBot extends ActivityHandler {
    private conversationState: ConversationState;
    private userState: UserState;

    constructor(conversationState: ConversationState, userState: UserState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;

        // Handle member added (bot or user joins conversation)
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded || [];
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity('👋 Welcome to PCP Bot! I help with daily standups and EOD check-ins.');
                    await context.sendActivity('Type "standup" for daily standup or "eod" for end-of-day check-in.');
                }
            }
            await next();
        });

        // Handle messages
        this.onMessage(async (context, next) => {
            const text = context.activity.text?.toLowerCase().trim() || '';

            // Check if this is a card submission
            if (context.activity.value) {
                const value = context.activity.value;

                if (value.verb === 'submitStandup') {
                    const msg = '✅ **Standup Submitted**\n\n' +
                        '**Yesterday:** ' + (value.yesterday || 'N/A') + '\n' +
                        '**Today:** ' + (value.today || 'N/A') + '\n' +
                        '**Blockers:** ' + (value.blockers || 'None');
                    await context.sendActivity(msg);
                } else if (value.verb === 'submitEOD') {
                    const msg = '✅ **EOD Check-in Submitted**\n\n' +
                        '**Completed:** ' + (value.completed || 'N/A') + '\n' +
                        '**Tomorrow:** ' + (value.tomorrow || 'N/A') + '\n' +
                        '**Notes:** ' + (value.notes || 'None');
                    await context.sendActivity(msg);
                }
            } else if (text.includes('standup')) {
                const card = createStandupCard();
                await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
            } else if (text.includes('eod')) {
                const card = createEODCard();
                await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
            } else if (text.includes('help')) {
                const helpText = '**PCP Bot Commands:**\n\n' +
                    '- `standup` - Start daily standup check-in\n' +
                    '- `eod` - Start end-of-day check-in\n' +
                    '- `help` - Show this help message';
                await context.sendActivity(helpText);
            } else {
                await context.sendActivity('Type "standup", "eod", or "help"');
            }

            await next();
        });
    }

    async run(context: TurnContext): Promise<void> {
        await super.run(context);

        // Save state changes
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}
