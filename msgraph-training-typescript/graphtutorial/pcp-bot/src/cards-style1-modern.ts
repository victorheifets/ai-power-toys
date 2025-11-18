import { WorkItemSummary } from './services/adoService';

// STYLE 1: Modern/Vibrant - Colorful sections with containers and better spacing

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
