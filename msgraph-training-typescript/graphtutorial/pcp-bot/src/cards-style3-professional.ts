import { WorkItemSummary } from './services/adoService';

// STYLE 3: Professional/Corporate - Structured with columns and fact sets

export function createStandupCard(workItems?: WorkItemSummary[]) {
    const workItemChoices = workItems?.map(wi => ({
        title: `#${wi.id} - ${wi.title} [${wi.state}]`,
        value: wi.id
    })) || [];

    const body: any[] = [
        {
            type: 'ColumnSet',
            columns: [
                {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                        {
                            type: 'TextBlock',
                            text: 'DAILY STANDUP REPORT',
                            weight: 'Bolder',
                            size: 'Large'
                        }
                    ]
                },
                {
                    type: 'Column',
                    width: 'auto',
                    items: [
                        {
                            type: 'TextBlock',
                            text: new Date().toLocaleDateString(),
                            horizontalAlignment: 'Right',
                            size: 'Small',
                            isSubtle: true
                        }
                    ]
                }
            ]
        },
        {
            type: 'Container',
            separator: true,
            spacing: 'Medium',
            items: [
                {
                    type: 'ColumnSet',
                    columns: [
                        {
                            type: 'Column',
                            width: '35px',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: '📊',
                                    size: 'Large'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        },
                        {
                            type: 'Column',
                            width: 'stretch',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: 'Previous Day Accomplishments',
                                    weight: 'Bolder'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        }
                    ]
                }
            ]
        }
    ];

    // Yesterday's work section
    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Container',
                items: [
                    {
                        type: 'TextBlock',
                        text: 'ADO Work Items:',
                        weight: 'Bolder',
                        size: 'Small'
                    },
                    {
                        type: 'Input.ChoiceSet',
                        id: 'yesterday_items',
                        isMultiSelect: true,
                        style: 'compact',
                        choices: workItemChoices,
                        spacing: 'Small'
                    }
                ]
            }
        );
    }

    body.push(
        {
            type: 'Container',
            items: [
                {
                    type: 'TextBlock',
                    text: 'Other Activities:',
                    weight: 'Bolder',
                    size: 'Small',
                    spacing: 'Small'
                },
                {
                    type: 'Input.Text',
                    id: 'yesterday_additional',
                    isMultiline: true,
                    placeholder: 'Meetings, research, collaboration...',
                    spacing: 'Small'
                }
            ]
        }
    );

    // Today's plan section
    body.push(
        {
            type: 'Container',
            separator: true,
            spacing: 'Medium',
            items: [
                {
                    type: 'ColumnSet',
                    columns: [
                        {
                            type: 'Column',
                            width: '35px',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: '🎯',
                                    size: 'Large'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        },
                        {
                            type: 'Column',
                            width: 'stretch',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: 'Today\'s Objectives',
                                    weight: 'Bolder'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        }
                    ]
                }
            ]
        }
    );

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Container',
                items: [
                    {
                        type: 'TextBlock',
                        text: 'ADO Work Items:',
                        weight: 'Bolder',
                        size: 'Small'
                    },
                    {
                        type: 'Input.ChoiceSet',
                        id: 'today_items',
                        isMultiSelect: true,
                        style: 'compact',
                        choices: workItemChoices,
                        spacing: 'Small'
                    }
                ]
            }
        );
    }

    body.push(
        {
            type: 'Container',
            items: [
                {
                    type: 'TextBlock',
                    text: 'Other Plans:',
                    weight: 'Bolder',
                    size: 'Small',
                    spacing: 'Small'
                },
                {
                    type: 'Input.Text',
                    id: 'today_additional',
                    isMultiline: true,
                    placeholder: 'Planned activities...',
                    spacing: 'Small'
                }
            ]
        }
    );

    // Blockers section
    body.push(
        {
            type: 'Container',
            separator: true,
            spacing: 'Medium',
            style: 'warning',
            items: [
                {
                    type: 'ColumnSet',
                    columns: [
                        {
                            type: 'Column',
                            width: '35px',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: '⚠️',
                                    size: 'Large'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        },
                        {
                            type: 'Column',
                            width: 'stretch',
                            items: [
                                {
                                    type: 'TextBlock',
                                    text: 'Impediments & Blockers',
                                    weight: 'Bolder',
                                    color: 'Warning'
                                }
                            ],
                            verticalContentAlignment: 'Center'
                        }
                    ]
                }
            ]
        }
    );

    body.push(
        {
            type: 'Container',
            items: [
                {
                    type: 'Input.Toggle',
                    id: 'has_blocker',
                    title: 'Report a blocker or impediment',
                    value: 'false'
                }
            ]
        }
    );

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'Container',
                items: [
                    {
                        type: 'TextBlock',
                        text: 'Affected Work Item:',
                        weight: 'Bolder',
                        size: 'Small',
                        spacing: 'Small'
                    },
                    {
                        type: 'Input.ChoiceSet',
                        id: 'blocked_item',
                        style: 'compact',
                        choices: workItemChoices,
                        spacing: 'Small'
                    }
                ]
            }
        );
    }

    body.push(
        {
            type: 'Container',
            items: [
                {
                    type: 'TextBlock',
                    text: 'Blocker Details:',
                    weight: 'Bolder',
                    size: 'Small',
                    spacing: 'Small'
                },
                {
                    type: 'Input.Text',
                    id: 'blocker_description',
                    isMultiline: true,
                    placeholder: 'Describe the blocker and required assistance...',
                    spacing: 'Small'
                }
            ]
        }
    );

    return {
        type: 'AdaptiveCard',
        version: '1.3',
        body: body,
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit Report',
                data: {
                    verb: 'submitStandup'
                }
            }
        ]
    };
}
