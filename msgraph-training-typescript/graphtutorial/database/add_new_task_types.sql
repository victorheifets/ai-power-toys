-- Migration: Add meeting_summary and blocker task types
-- Date: 2025-11-19
-- Description: Expands task_type constraint to include meeting_summary and blocker

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;

-- Add new constraint with additional types
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IN ('follow_up', 'task', 'urgent', 'kudos', 'manual', 'meeting_summary', 'blocker'));
