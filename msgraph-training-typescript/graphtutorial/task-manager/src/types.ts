// Type definitions for Task Manager

export type Task = {
  id: number;
  user_email: string;

  // Content
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';

  // Categorization
  task_type: 'follow_up' | 'kudos' | 'task' | 'urgent' | 'manual' | 'meeting_summary' | 'blocker';

  // Management
  status: 'pending' | 'completed' | 'dismissed' | 'snoozed';
  snoozed_until?: string | null;
  completed_at?: string | null;

  // Source tracking
  source: 'email' | 'manual';
  source_detection_id?: number | null;
  source_email_id?: number | null;

  // Voice/LLM
  input_method?: 'text' | 'voice' | null;
  raw_input?: string | null;
  llm_parsed_data?: any | null;
  mentioned_people?: string[] | null;
  tags?: string[] | null;

  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;

  // Joined fields from email
  email_subject?: string | null;
  email_from?: string | null;
  email_body_preview?: string | null;
};

export type TaskFilters = {
  status: string[];
  task_type: string[];
  priority: string[];
  source: string[];
  timeframe: 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date';
  search: string;
};

export type TaskStats = {
  pending_count: number;
  completed_count: number;
  snoozed_count: number;
  overdue_count: number;
  today_count: number;
  email_tasks_count: number;
  manual_tasks_count: number;
};

export type LLMParseResult = {
  title: string;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';
  task_type: 'task' | 'follow_up' | 'urgent' | 'manual';
  mentioned_people?: string[];
  tags?: string[];
  extracted_entities?: any;
  confidence?: number;
};

export type VoiceLanguage = 'en-US' | 'he-IL' | 'ru-RU';
