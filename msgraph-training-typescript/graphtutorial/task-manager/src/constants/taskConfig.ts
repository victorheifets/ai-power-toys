// Task type, priority, and status configurations

export const TASK_TYPES = {
  follow_up: { emoji: '📤', label: 'Follow-Up', color: '#6264A7' },
  task: { emoji: '✅', label: 'Task', color: '#3498db' },
  kudos: { emoji: '🏆', label: 'Kudos', color: '#f39c12' },
  urgent: { emoji: '⚠️', label: 'Urgent', color: '#e74c3c' },
  meeting_summary: { emoji: '📝', label: 'Meeting Summary', color: '#2ecc71' },
  blocker: { emoji: '🚧', label: 'Blocker', color: '#e67e22' },
  manual: { emoji: '✍️', label: 'Manual', color: '#9b59b6' }
} as const;

export const PRIORITIES = {
  high: { emoji: '🔴', label: 'High', order: 3 },
  medium: { emoji: '🟡', label: 'Medium', order: 2 },
  low: { emoji: '🟢', label: 'Low', order: 1 }
} as const;

export const STATUSES = {
  pending: { label: 'Pending' },
  completed: { label: 'Completed' },
  snoozed: { label: 'Snoozed' },
  dismissed: { label: 'Dismissed' }
} as const;

export const SOURCES = {
  email: { emoji: '📧', label: 'Email' },
  manual: { emoji: '✍️', label: 'Manual' }
} as const;

export const TIMEFRAMES = {
  all: 'All Time',
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  later: 'Later',
  no_date: 'No Due Date'
} as const;

export const SNOOZE_DURATIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '3h', label: '3 Hours' },
  { value: '1d', label: 'Tomorrow' },
  { value: '1w', label: 'Next Week' }
] as const;

// Test task configurations for the test panel
export const TEST_TASKS = [
  {
    type: 'follow_up',
    title: 'Follow up on Q4 Planning Discussion',
    description: 'Review meeting notes and schedule follow-up discussion with team about Q4 planning items',
    priority: 'medium' as const
  },
  {
    type: 'task',
    title: 'Review Q4 Planning Discussion notes',
    description: 'Go through meeting summary and action items from Q4 planning discussion',
    priority: 'medium' as const
  },
  {
    type: 'kudos',
    title: 'Recognition: Q4 Planning Presentation',
    description: 'Great work on the Q4 planning presentation! The team really appreciated your insights.',
    priority: 'low' as const
  },
  {
    type: 'urgent',
    title: 'URGENT: Q4 Budget Approval',
    description: 'Need your input on Q4 budget by EOD today. Review and approve budget proposal immediately.',
    priority: 'high' as const
  },
  {
    type: 'meeting_summary',
    title: 'Meeting Summary: Q4 Planning Discussion',
    description: 'Review and distribute meeting summary from Q4 planning session with action items and next steps',
    priority: 'medium' as const
  },
  {
    type: 'blocker',
    title: 'BLOCKER: Resource Allocation',
    description: 'Team member blocked on resource allocation for Q4 project. Needs manager approval to proceed.',
    priority: 'high' as const
  }
] as const;
