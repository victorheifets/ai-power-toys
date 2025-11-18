import { WorkItemSummary } from './services/adoService';

// MODERN STYLE: Vibrant colorful sections with enhanced contrast
export function createStandupCard(workItems?: WorkItemSummary[]) {
    const workItemChoices = workItems?.map(wi => ({
        title: `#${wi.id} - ${wi.title} [${wi.state}]`,
        value: wi.id
    })) || [];

    const body: any[] = [
        {
            type: 'Container',
            style: 'emphasis',
            bleed: true,
            separator: true,
            items: [
                {
                    type: 'ColumnSet',
                    columns: [
                        {
                            type: 'Column',
                            width: 'auto',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: '📋',
                                    size: 'ExtraLarge'
                                }
                            ]
                        },
                        {
                            type: 'Column',
                            width: 'stretch',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: 'Daily Standup',
                                    weight: 'Bolder',
                                    size: 'Large'
                                },
                                {
                                    type: 'TextBlock',
                                    text: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                                    size: 'Small',
                                    color: 'Accent',
                                    spacing: 'None'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            type: 'Container',
            spacing: 'Medium',
            style: 'good',
            bleed: true,
            separator: true,
            items: [
                {
                    type: 'TextBlock',
                    text: '✅ Yesterday',
                    weight: 'Bolder',
                    size: 'Medium',
                    color: 'Good'
                },
                {
                    type: 'TextBlock',
                    text: 'What did you accomplish?',
                    wrap: true,
                    size: 'Small',
                    spacing: 'Small',
                    isSubtle: true
                }
            ]
        }
    ];

    // Yesterday's work section
    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Input.ChoiceSet',
                id: 'yesterday_items',
                isMultiSelect: true,
                style: 'compact',
                choices: workItemChoices,
                placeholder: 'Select work items...'
            }
        );
    }

    body.push(
        {
            type: 'Input.Text',
            id: 'yesterday_additional',
            isMultiline: true,
            placeholder: 'Other tasks, meetings, research...',
            spacing: 'Small'
        }
    );

    // Today's plan section
    body.push({
        type: 'Container',
        spacing: 'Medium',
        style: 'accent',
        bleed: true,
        separator: true,
        items: [
            {
                type: 'TextBlock',
                text: '🎯 Today',
                weight: 'Bolder',
                size: 'Medium',
                color: 'Accent'
            },
            {
                type: 'TextBlock',
                text: 'What are you planning to do?',
                wrap: true,
                size: 'Small',
                spacing: 'Small',
                isSubtle: true
            }
        ]
    });

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Input.ChoiceSet',
                id: 'today_items',
                isMultiSelect: true,
                style: 'compact',
                choices: workItemChoices,
                placeholder: 'Select work items...'
            }
        );
    }

    body.push(
        {
            type: 'Input.Text',
            id: 'today_additional',
            isMultiline: true,
            placeholder: 'Other planned activities...',
            spacing: 'Small'
        }
    );

    // Blockers section
    body.push({
        type: 'Container',
        spacing: 'Medium',
        style: 'attention',
        bleed: true,
        separator: true,
        items: [
            {
                type: 'TextBlock',
                text: '🚫 Blockers',
                weight: 'Bolder',
                size: 'Medium',
                color: 'Attention'
            },
            {
                type: 'TextBlock',
                text: 'Is anything preventing your progress?',
                wrap: true,
                size: 'Small',
                spacing: 'Small',
                isSubtle: true
            }
        ]
    });

    body.push(
        {
            type: 'Input.Toggle',
            id: 'has_blocker',
            title: 'Yes, I have a blocker',
            value: 'false',
            spacing: 'Small'
        }
    );

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Input.ChoiceSet',
                id: 'blocked_item',
                style: 'compact',
                choices: workItemChoices,
                placeholder: 'Which work item?',
                spacing: 'Small'
            }
        );
    }

    body.push(
        {
            type: 'Input.Text',
            id: 'blocker_description',
            isMultiline: true,
            placeholder: 'Describe the blocker and what help you need...',
            spacing: 'Small'
        }
    );

    return {
        type: 'AdaptiveCard',
        version: '1.5',
        body: body,
        actions: [
            {
                type: 'Action.Submit',
                title: '✅ Submit Standup',
                style: 'positive',
                data: {
                    verb: 'submitStandup'
                }
            }
        ]
    };
}

export function createEODCard(workItems?: WorkItemSummary[], todaysPlan?: string[]) {
    const workItemChoices = workItems?.map(wi => ({
        title: `#${wi.id} - ${wi.title} [${wi.state}]`,
        value: wi.id
    })) || [];

    const body: any[] = [
        {
            type: 'TextBlock',
            text: '🌙 End of Day Check-in',
            weight: 'Bolder',
            size: 'Large'
        }
    ];

    // Show today's plan for reference
    if (todaysPlan && todaysPlan.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: '📋 Today\'s Plan (from morning):',
                weight: 'Bolder',
                wrap: true,
                size: 'Small'
            }
        );
        todaysPlan.forEach(item => {
            body.push({
                type: 'TextBlock',
                text: `• ${item}`,
                wrap: true,
                size: 'Small'
            });
        });
    }

    // Completed work section
    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: '✅ What did you complete today?',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'Input.ChoiceSet',
                id: 'completed_items',
                isMultiSelect: true,
                style: 'compact',
                choices: workItemChoices
            }
        );
    }

    body.push(
        {
            type: 'TextBlock',
            text: 'Additional accomplishments:',
            wrap: true,
            size: 'Small'
        },
        {
            type: 'Input.Text',
            id: 'completed_additional',
            isMultiline: true,
            placeholder: 'Other completed tasks...'
        }
    );

    // Tomorrow's plan section
    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: '📅 Plans for tomorrow?',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'Input.ChoiceSet',
                id: 'tomorrow_items',
                isMultiSelect: true,
                style: 'compact',
                choices: workItemChoices
            }
        );
    }

    body.push(
        {
            type: 'TextBlock',
            text: 'Additional plans:',
            wrap: true,
            size: 'Small'
        },
        {
            type: 'Input.Text',
            id: 'tomorrow_additional',
            isMultiline: true,
            placeholder: 'Other planned activities...'
        },
        {
            type: 'TextBlock',
            text: '💭 Reflection',
            weight: 'Bolder',
            wrap: true
        },
        {
            type: 'Input.Text',
            id: 'reflection',
            isMultiline: true,
            placeholder: 'What went well? What could be improved?'
        }
    );

    return {
        type: 'AdaptiveCard',
        version: '1.2',
        body: body,
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit EOD',
                data: {
                    verb: 'submitEOD'
                }
            }
        ]
    };
}

export function createBlockerAlertCard(blocker: {
    userName: string;
    workItemId: string;
    workItemTitle: string;
    description: string;
    blockedSince: string;
}) {
    return {
        type: 'AdaptiveCard',
        version: '1.2',
        body: [
            {
                type: 'TextBlock',
                text: '🚫 Blocker Alert',
                weight: 'Bolder',
                size: 'Large',
                color: 'Attention'
            },
            {
                type: 'FactSet',
                facts: [
                    {
                        title: 'Team Member:',
                        value: blocker.userName
                    },
                    {
                        title: 'Work Item:',
                        value: `#${blocker.workItemId} - ${blocker.workItemTitle}`
                    },
                    {
                        title: 'Blocked Since:',
                        value: blocker.blockedSince
                    }
                ]
            },
            {
                type: 'TextBlock',
                text: 'Blocker Description:',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'TextBlock',
                text: blocker.description,
                wrap: true,
                color: 'Attention'
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: '💬 Chat with Team Member',
                data: {
                    verb: 'chatWithMember',
                    workItemId: blocker.workItemId
                }
            },
            {
                type: 'Action.OpenUrl',
                title: '👀 View in ADO',
                url: `https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_workitems/edit/${blocker.workItemId}`
            },
            {
                type: 'Action.Submit',
                title: '✅ Mark Resolved',
                data: {
                    verb: 'resolveBlocker',
                    workItemId: blocker.workItemId
                }
            }
        ]
    };
}

export function createStoryEnhancementCard(original: any, enhanced: any) {
    return {
        type: 'AdaptiveCard',
        version: '1.2',
        body: [
            {
                type: 'TextBlock',
                text: '✨ AI-Enhanced User Story',
                weight: 'Bolder',
                size: 'Large'
            },
            {
                type: 'TextBlock',
                text: 'Enhanced Title:',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'TextBlock',
                text: enhanced.title,
                wrap: true,
                color: 'Good'
            },
            {
                type: 'TextBlock',
                text: 'Description:',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'TextBlock',
                text: enhanced.description,
                wrap: true
            },
            {
                type: 'TextBlock',
                text: 'Acceptance Criteria:',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'TextBlock',
                text: enhanced.acceptanceCriteria,
                wrap: true
            },
            {
                type: 'FactSet',
                facts: [
                    {
                        title: 'Estimated Story Points:',
                        value: enhanced.storyPoints.toString()
                    }
                ]
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: '✏️ Edit',
                data: {
                    verb: 'editStory',
                    story: enhanced
                }
            },
            {
                type: 'Action.Submit',
                title: '🔄 Regenerate',
                data: {
                    verb: 'regenerateStory',
                    original: original
                }
            },
            {
                type: 'Action.Submit',
                title: '✅ Create in ADO',
                data: {
                    verb: 'createInADO',
                    story: enhanced
                }
            }
        ]
    };
}
