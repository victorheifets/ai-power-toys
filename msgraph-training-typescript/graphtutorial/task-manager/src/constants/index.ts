// API and application configuration constants

export const API_BASE = '/api';
export const SSE_URL = 'http://localhost:3200/api/events';
export const SSE_RECONNECT_DELAY = 5000;

export const DEFAULT_USER_EMAIL = 'heifets@merck.com';

export const MOBILE_BREAKPOINT = 768;

export const DEFAULT_FILTERS = {
  status: ['pending'] as string[],
  task_type: [] as string[],
  priority: [] as string[],
  source: [] as string[],
  timeframe: 'all' as const,
  search: ''
};

export const STORAGE_KEYS = {
  USER_EMAIL: 'userEmail',
  LLM_ENABLED: 'llmEnabled',
  TASK_FILTERS: 'taskFilters'
} as const;

export const SSE_TASK_EVENTS = [
  'task_created',
  'task_updated',
  'task_completed',
  'task_deleted',
  'task_snoozed',
  'tasks_bulk_update'
] as const;
