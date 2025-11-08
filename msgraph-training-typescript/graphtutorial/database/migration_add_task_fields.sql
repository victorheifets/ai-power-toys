-- Migration: Add Task Management Fields
-- Date: 2025-11-08
-- Description: Adds fields for standalone task manager functionality

-- Add new columns to power_toy_detections for task management
ALTER TABLE power_toy_detections
  ADD COLUMN IF NOT EXISTS title TEXT,                    -- Extracted/user title
  ADD COLUMN IF NOT EXISTS notes TEXT,                    -- User notes
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,            -- Parsed due date
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium', -- low/medium/high
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP,       -- Wake up time
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'email', -- 'email' | 'manual'
  ADD COLUMN IF NOT EXISTS input_method VARCHAR(10),      -- 'text' | 'voice' | NULL
  ADD COLUMN IF NOT EXISTS raw_input TEXT,                -- Original natural language input
  ADD COLUMN IF NOT EXISTS llm_parsed_data JSONB,         -- Full LLM extraction result
  ADD COLUMN IF NOT EXISTS mentioned_people TEXT[],       -- Array of people mentioned
  ADD COLUMN IF NOT EXISTS tags TEXT[],                   -- Array of tags/keywords
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,        -- Completion time
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,          -- Soft delete timestamp
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false; -- Soft delete flag

-- Update constraint to include 'completed' status
ALTER TABLE power_toy_detections DROP CONSTRAINT IF EXISTS detections_status_check;
ALTER TABLE power_toy_detections ADD CONSTRAINT detections_status_check CHECK (
  status IN ('pending', 'actioned', 'dismissed', 'snoozed', 'completed')
);

-- Update constraint to include manual task types
ALTER TABLE power_toy_detections DROP CONSTRAINT IF EXISTS detections_toy_type_check;
ALTER TABLE power_toy_detections ADD CONSTRAINT detections_toy_type_check CHECK (
  toy_type IN ('follow_up', 'kudos', 'task', 'urgent', 'manual')
);

-- Add constraint for priority values
ALTER TABLE power_toy_detections DROP CONSTRAINT IF EXISTS detections_priority_check;
ALTER TABLE power_toy_detections ADD CONSTRAINT detections_priority_check CHECK (
  priority IN ('low', 'medium', 'high')
);

-- Make email_id nullable for manual tasks
ALTER TABLE power_toy_detections ALTER COLUMN email_id DROP NOT NULL;

-- Create new indexes for task management queries
CREATE INDEX IF NOT EXISTS idx_detections_due_date ON power_toy_detections(due_date)
  WHERE due_date IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_detections_snoozed ON power_toy_detections(snoozed_until)
  WHERE snoozed_until IS NOT NULL AND status = 'snoozed' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_detections_completed ON power_toy_detections(completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_detections_source ON power_toy_detections(source);

CREATE INDEX IF NOT EXISTS idx_detections_priority ON power_toy_detections(priority);

CREATE INDEX IF NOT EXISTS idx_detections_not_deleted ON power_toy_detections(is_deleted)
  WHERE is_deleted = false;

-- Create index for full-text search on title and notes
CREATE INDEX IF NOT EXISTS idx_detections_title_search ON power_toy_detections USING gin(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_detections_notes_search ON power_toy_detections USING gin(to_tsvector('english', COALESCE(notes, '')));

-- Add comments
COMMENT ON COLUMN power_toy_detections.title IS 'Task title - extracted from LLM or user input';
COMMENT ON COLUMN power_toy_detections.notes IS 'User-editable notes for the task';
COMMENT ON COLUMN power_toy_detections.due_date IS 'Parsed due date from natural language or manual input';
COMMENT ON COLUMN power_toy_detections.priority IS 'Task priority: low, medium, or high';
COMMENT ON COLUMN power_toy_detections.snoozed_until IS 'Timestamp when snoozed task should reappear';
COMMENT ON COLUMN power_toy_detections.source IS 'Task source: email (from webhook) or manual (user created)';
COMMENT ON COLUMN power_toy_detections.input_method IS 'How manual task was created: text or voice';
COMMENT ON COLUMN power_toy_detections.raw_input IS 'Original natural language input before LLM parsing';
COMMENT ON COLUMN power_toy_detections.llm_parsed_data IS 'Complete LLM parsing result with all extracted entities';
COMMENT ON COLUMN power_toy_detections.mentioned_people IS 'Array of people mentioned in the task (e.g., ["Yan", "Sarah"])';
COMMENT ON COLUMN power_toy_detections.tags IS 'Array of extracted tags/keywords (e.g., ["work plan", "project"])';
COMMENT ON COLUMN power_toy_detections.completed_at IS 'Timestamp when task was marked complete';
COMMENT ON COLUMN power_toy_detections.deleted_at IS 'Timestamp when task was soft-deleted';
COMMENT ON COLUMN power_toy_detections.is_deleted IS 'Soft delete flag - deleted tasks are hidden but recoverable';

-- Sample manual task data for testing
INSERT INTO power_toy_detections
  (email_id, toy_type, title, due_date, priority, source, input_method, raw_input, status, detection_data)
VALUES
  (NULL, 'manual', 'Call Yan about work plan', NOW() + INTERVAL '7 days', 'high', 'manual', 'voice',
   'call to yan and speak about work plan by next week', 'pending',
   '{"mentioned_people": ["Yan"], "tags": ["work plan"], "task_type": "call"}');

INSERT INTO power_toy_detections
  (email_id, toy_type, title, due_date, priority, source, input_method, raw_input, status, detection_data, tags)
VALUES
  (NULL, 'manual', 'Review project proposal', NOW() + INTERVAL '2 days', 'medium', 'manual', 'text',
   'review project proposal by wednesday', 'pending',
   '{"task_type": "review"}', ARRAY['project', 'proposal']);

-- Update existing email-based detections to have source='email' and extract titles
UPDATE power_toy_detections SET source = 'email' WHERE source IS NULL;

UPDATE power_toy_detections SET
  title = COALESCE(
    detection_data->>'action',
    detection_data->>'task_description',
    detection_data->>'achievement',
    detection_data->>'action_needed'
  ),
  due_date = CASE
    WHEN detection_data->>'deadline' IS NOT NULL
    THEN (detection_data->>'deadline')::timestamp
    ELSE NULL
  END,
  priority = COALESCE(detection_data->>'priority', 'medium')
WHERE title IS NULL AND source = 'email';

COMMENT ON TABLE power_toy_detections IS 'Stores AI-detected patterns from emails AND manually created tasks';
