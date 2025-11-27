-- PCP Bot Database Schema

-- Bot Commands Configuration
CREATE TABLE IF NOT EXISTS bot_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL UNIQUE,
    description TEXT,
    card_template_id INTEGER,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Adaptive Card Templates
CREATE TABLE IF NOT EXISTS card_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    card_json TEXT NOT NULL,
    version TEXT DEFAULT '1.2',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Responses (Standup/EOD submissions)
CREATE TABLE IF NOT EXISTS user_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    command_id INTEGER,
    response_type TEXT, -- 'standup' or 'eod'
    response_data TEXT, -- JSON of card submission
    work_items TEXT, -- JSON array of ADO work item IDs
    has_blocker BOOLEAN DEFAULT 0,
    group_session_id INTEGER, -- Link to group standup session if part of one
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (command_id) REFERENCES bot_commands(id),
    FOREIGN KEY (group_session_id) REFERENCES group_standup_sessions(id)
);

-- Blockers
CREATE TABLE IF NOT EXISTS blockers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    work_item_id TEXT NOT NULL,
    work_item_title TEXT,
    blocker_description TEXT,
    tl_user_id TEXT,
    tl_name TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'resolved'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolution_notes TEXT
);

-- ADO Work Items Cache
CREATE TABLE IF NOT EXISTS ado_work_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_item_id TEXT NOT NULL UNIQUE,
    title TEXT,
    assigned_to TEXT,
    state TEXT,
    work_item_type TEXT,
    area_path TEXT,
    iteration_path TEXT,
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_data TEXT -- JSON of full work item
);

-- Team Configuration
CREATE TABLE IF NOT EXISTS team_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL UNIQUE,
    team_name TEXT,
    channel_id TEXT,
    group_conversation_id TEXT, -- Group chat ID for posting summaries
    group_conversation_ref TEXT, -- JSON conversation reference for proactive messaging
    ado_organization TEXT,
    ado_project TEXT,
    ado_pat TEXT, -- Personal Access Token (encrypted)
    standup_time TEXT DEFAULT '09:00',
    eod_time TEXT DEFAULT '17:00',
    timezone TEXT DEFAULT 'UTC',
    tl_user_id TEXT,
    tl_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    conversation_ref TEXT, -- JSON conversation reference for 1:1 DMs
    is_active BOOLEAN DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES team_config(team_id)
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER,
    team_id TEXT,
    cron_expression TEXT,
    enabled BOOLEAN DEFAULT 1,
    last_run DATETIME,
    next_run DATETIME,
    FOREIGN KEY (command_id) REFERENCES bot_commands(id)
);

-- LLM Generated Stories
CREATE TABLE IF NOT EXISTS llm_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    original_input TEXT,
    generated_title TEXT,
    generated_description TEXT,
    acceptance_criteria TEXT,
    story_points INTEGER,
    ado_work_item_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User PATs (Personal Access Tokens for ADO)
CREATE TABLE IF NOT EXISTS user_pats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    user_name TEXT,
    user_email TEXT,
    ado_pat TEXT NOT NULL, -- User's personal ADO PAT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Group Standup Sessions
CREATE TABLE IF NOT EXISTS group_standup_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL, -- Teams group chat/channel ID
    conversation_name TEXT,
    triggered_by_user_id TEXT,
    triggered_by_user_name TEXT,
    session_type TEXT DEFAULT 'standup', -- 'standup' or 'eod'
    status TEXT DEFAULT 'active', -- 'active', 'completed'
    total_participants INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Group Session Participants
CREATE TABLE IF NOT EXISTS group_session_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    dm_sent BOOLEAN DEFAULT 0,
    dm_sent_at DATETIME,
    response_received BOOLEAN DEFAULT 0,
    response_id INTEGER, -- References user_responses.id
    FOREIGN KEY (session_id) REFERENCES group_standup_sessions(id),
    FOREIGN KEY (response_id) REFERENCES user_responses(id)
);

-- Insert default commands
INSERT OR IGNORE INTO bot_commands (name, trigger, description) VALUES
    ('Daily Standup', 'standup', 'Daily standup check-in'),
    ('End of Day', 'eod', 'End of day check-in'),
    ('Create User Story', 'create-us', 'Create a user story with LLM assistance'),
    ('Status Update', 'status', 'Quick status update for a work item'),
    ('Report Blocker', 'block', 'Report a blocker for a work item'),
    ('Help', 'help', 'Show all available commands');
