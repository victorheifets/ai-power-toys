import { WorkItemSummary } from './services/adoService';

// STYLE 2: Minimal/Clean - Simple, no colors, clean lines

export function createStandupCard(workItems?: WorkItemSummary[]) {
    const workItemChoices = workItems?.map(wi => ({
        title: `#${wi.id} - ${wi.title} [${wi.state}]`,
        value: wi.id
    })) || [];

    const body: any[] = [
        {
            type: 'TextBlock',
            text: 'Daily Standup',
            weight: 'Bolder',
            size: 'ExtraLarge'
        },
        {
            type: 'TextBlock',
            text: '─────────────────────',
            spacing: 'None',
            isSubtle: true
        },
        {
            type: 'TextBlock',
            text: 'Yesterday',
            weight: 'Bolder',
            size: 'Medium',
            spacing: 'Medium'
        }
    ];

    // Yesterday's work section
    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: 'Work items:',
                wrap: true,
                size: 'Small'
            },
            {
                type: 'Input.ChoiceSet',
                id: 'yesterday_items',
                isMultiSelect: true,
                style: 'expanded',
                choices: workItemChoices
            }
        );
    }

    body.push(
        {
            type: 'TextBlock',
            text: 'Additional work:',
            wrap: true,
            size: 'Small',
            spacing: 'Small'
        },
        {
            type: 'Input.Text',
            id: 'yesterday_additional',
            isMultiline: true,
            placeholder: 'Type here...'
        }
    );

    // Today's plan section
    body.push(
        {
            type: 'TextBlock',
            text: 'Today',
            weight: 'Bolder',
            size: 'Medium',
            spacing: 'Large'
        }
    );

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: 'Work items:',
                wrap: true,
                size: 'Small'
            },
            {
                type: 'Input.ChoiceSet',
                id: 'today_items',
                isMultiSelect: true,
                style: 'expanded',
                choices: workItemChoices
            }
        );
    }

    body.push(
        {
            type: 'TextBlock',
            text: 'Additional plans:',
            wrap: true,
            size: 'Small',
            spacing: 'Small'
        },
        {
            type: 'Input.Text',
            id: 'today_additional',
            isMultiline: true,
            placeholder: 'Type here...'
        }
    );

    // Blockers section
    body.push(
        {
            type: 'TextBlock',
            text: 'Blockers',
            weight: 'Bolder',
            size: 'Medium',
            spacing: 'Large'
        },
        {
            type: 'Input.Toggle',
            id: 'has_blocker',
            title: 'I have a blocker',
            value: 'false'
        }
    );

    if (workItems && workItems.length > 0) {
        body.push(
            {
                type: 'TextBlock',
                text: 'Blocked item:',
                wrap: true,
                size: 'Small',
                spacing: 'Small'
            },
            {
                type: 'Input.ChoiceSet',
                id: 'blocked_item',
                style: 'compact',
                choices: workItemChoices
            }
        );
    }

    body.push(
        {
            type: 'TextBlock',
            text: 'Description:',
            wrap: true,
            size: 'Small',
            spacing: 'Small'
        },
        {
            type: 'Input.Text',
            id: 'blocker_description',
            isMultiline: true,
            placeholder: 'Type here...'
        }
    );

    return {
        type: 'AdaptiveCard',
        version: '1.2',
        body: body,
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: {
                    verb: 'submitStandup'
                }
            }
        ]
    };
}
