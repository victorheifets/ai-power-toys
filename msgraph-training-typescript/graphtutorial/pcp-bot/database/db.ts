import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as fs from 'fs';
import * as path from 'path';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
    if (db) {
        return db;
    }

    const dbPath = path.join(__dirname, 'pcp_bot.db');
    const schemaPath = path.join(__dirname, 'schema.sql');

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Run schema if database is new
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await db.exec(schema);
        console.log('✅ Database initialized');
    }

    return db;
}

export async function getDatabase(): Promise<Database> {
    if (!db) {
        return await initDatabase();
    }
    return db;
}

// User Responses
export async function saveUserResponse(data: {
    userId: string;
    userName: string;
    responseType: string;
    responseData: any;
    workItems?: string[];
    hasBlocker?: boolean;
    groupSessionId?: number;
}): Promise<number> {
    const database = await getDatabase();
    const result = await database.run(
        `INSERT INTO user_responses
        (user_id, user_name, response_type, response_data, work_items, has_blocker, group_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        data.userId,
        data.userName,
        data.responseType,
        JSON.stringify(data.responseData),
        JSON.stringify(data.workItems || []),
        data.hasBlocker ? 1 : 0,
        data.groupSessionId || null
    );
    return result.lastID!;
}

export async function getUserResponses(userId: string, responseType?: string, limit: number = 10) {
    const database = await getDatabase();
    let query = 'SELECT * FROM user_responses WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (responseType) {
        query += ' AND response_type = ?';
        params.push(responseType);
    }
    
    query += ' ORDER BY submitted_at DESC LIMIT ?';
    params.push(limit);
    
    return await database.all(query, ...params);
}

// Blockers
export async function saveBlocker(data: {
    userId: string;
    userName: string;
    workItemId: string;
    workItemTitle: string;
    blockerDescription: string;
    tlUserId?: string;
    tlName?: string;
}): Promise<number> {
    const database = await getDatabase();
    const result = await database.run(
        `INSERT INTO blockers 
        (user_id, user_name, work_item_id, work_item_title, blocker_description, tl_user_id, tl_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        data.userId,
        data.userName,
        data.workItemId,
        data.workItemTitle,
        data.blockerDescription,
        data.tlUserId || null,
        data.tlName || null
    );
    return result.lastID!;
}

export async function getActiveBlockers(teamId?: string) {
    const database = await getDatabase();
    return await database.all(
        `SELECT * FROM blockers WHERE status = 'active' ORDER BY created_at DESC`
    );
}

export async function resolveBlocker(blockerId: number, resolutionNotes?: string) {
    const database = await getDatabase();
    await database.run(
        `UPDATE blockers SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolution_notes = ? WHERE id = ?`,
        resolutionNotes || null,
        blockerId
    );
}

// ADO Work Items Cache
export async function cacheWorkItem(data: {
    workItemId: string;
    title: string;
    assignedTo: string;
    state: string;
    workItemType: string;
    areaPath?: string;
    iterationPath?: string;
    rawData: any;
}) {
    const database = await getDatabase();
    await database.run(
        `INSERT OR REPLACE INTO ado_work_items 
        (work_item_id, title, assigned_to, state, work_item_type, area_path, iteration_path, raw_data, last_synced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        data.workItemId,
        data.title,
        data.assignedTo,
        data.state,
        data.workItemType,
        data.areaPath || null,
        data.iterationPath || null,
        JSON.stringify(data.rawData)
    );
}

export async function getCachedWorkItems(assignedTo: string) {
    const database = await getDatabase();
    return await database.all(
        `SELECT * FROM ado_work_items WHERE assigned_to = ? ORDER BY last_synced DESC`,
        assignedTo
    );
}

// Team Configuration
export async function getTeamConfig(teamId: string) {
    const database = await getDatabase();
    return await database.get(
        `SELECT * FROM team_config WHERE team_id = ?`,
        teamId
    );
}

export async function saveTeamConfig(data: {
    teamId: string;
    teamName: string;
    channelId?: string;
    adoOrganization?: string;
    adoProject?: string;
    adoPat?: string;
    standupTime?: string;
    eodTime?: string;
    timezone?: string;
    tlUserId?: string;
    tlName?: string;
}) {
    const database = await getDatabase();
    await database.run(
        `INSERT OR REPLACE INTO team_config 
        (team_id, team_name, channel_id, ado_organization, ado_project, ado_pat, standup_time, eod_time, timezone, tl_user_id, tl_name, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        data.teamId,
        data.teamName,
        data.channelId || null,
        data.adoOrganization || null,
        data.adoProject || null,
        data.adoPat || null,
        data.standupTime || '09:00',
        data.eodTime || '17:00',
        data.timezone || 'UTC',
        data.tlUserId || null,
        data.tlName || null
    );
}

// LLM Stories
export async function saveLLMStory(data: {
    userId: string;
    originalInput: string;
    generatedTitle: string;
    generatedDescription: string;
    acceptanceCriteria: string;
    storyPoints?: number;
    adoWorkItemId?: string;
}) {
    const database = await getDatabase();
    const result = await database.run(
        `INSERT INTO llm_stories 
        (user_id, original_input, generated_title, generated_description, acceptance_criteria, story_points, ado_work_item_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        data.userId,
        data.originalInput,
        data.generatedTitle,
        data.generatedDescription,
        data.acceptanceCriteria,
        data.storyPoints || null,
        data.adoWorkItemId || null
    );
    return result.lastID!;
}

export async function getBotCommands() {
    const database = await getDatabase();
    return await database.all(
        `SELECT * FROM bot_commands WHERE enabled = 1 ORDER BY name`
    );
}

// User PATs
export async function saveUserPAT(data: {
    userId: string;
    userName: string;
    userEmail?: string;
    adoPat: string;
}) {
    const database = await getDatabase();
    await database.run(
        `INSERT OR REPLACE INTO user_pats (user_id, user_name, user_email, ado_pat, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        data.userId,
        data.userName,
        data.userEmail || null,
        data.adoPat
    );
}

export async function getUserPAT(userId: string) {
    const database = await getDatabase();
    return await database.get(
        `SELECT * FROM user_pats WHERE user_id = ?`,
        userId
    );
}

// Group Standup Sessions
export async function createGroupSession(data: {
    conversationId: string;
    conversationName?: string;
    triggeredByUserId: string;
    triggeredByUserName: string;
    sessionType: 'standup' | 'eod';
    participantCount: number;
}): Promise<number> {
    const database = await getDatabase();
    const result = await database.run(
        `INSERT INTO group_standup_sessions
        (conversation_id, conversation_name, triggered_by_user_id, triggered_by_user_name, session_type, total_participants)
        VALUES (?, ?, ?, ?, ?, ?)`,
        data.conversationId,
        data.conversationName || null,
        data.triggeredByUserId,
        data.triggeredByUserName,
        data.sessionType,
        data.participantCount
    );
    return result.lastID!;
}

export async function addSessionParticipant(data: {
    sessionId: number;
    userId: string;
    userName: string;
}) {
    const database = await getDatabase();
    await database.run(
        `INSERT INTO group_session_participants (session_id, user_id, user_name)
        VALUES (?, ?, ?)`,
        data.sessionId,
        data.userId,
        data.userName
    );
}

export async function markDMSent(sessionId: number, userId: string) {
    const database = await getDatabase();
    await database.run(
        `UPDATE group_session_participants
        SET dm_sent = 1, dm_sent_at = CURRENT_TIMESTAMP
        WHERE session_id = ? AND user_id = ?`,
        sessionId,
        userId
    );
}

export async function markResponseReceived(sessionId: number, userId: string, responseId: number) {
    const database = await getDatabase();
    await database.run(
        `UPDATE group_session_participants
        SET response_received = 1, response_id = ?
        WHERE session_id = ? AND user_id = ?`,
        responseId,
        sessionId,
        userId
    );

    // Update session responses count
    await database.run(
        `UPDATE group_standup_sessions
        SET responses_received = responses_received + 1
        WHERE id = ?`,
        sessionId
    );
}

export async function getGroupSession(sessionId: number) {
    const database = await getDatabase();
    return await database.get(
        `SELECT * FROM group_standup_sessions WHERE id = ?`,
        sessionId
    );
}

export async function getActiveGroupSession(conversationId: string, sessionType: string) {
    const database = await getDatabase();
    return await database.get(
        `SELECT * FROM group_standup_sessions
        WHERE conversation_id = ? AND session_type = ? AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`,
        conversationId,
        sessionType
    );
}

export async function getSessionParticipants(sessionId: number) {
    const database = await getDatabase();
    return await database.all(
        `SELECT * FROM group_session_participants WHERE session_id = ?`,
        sessionId
    );
}

export async function getSessionResponses(sessionId: number) {
    const database = await getDatabase();
    return await database.all(
        `SELECT ur.*
        FROM user_responses ur
        JOIN group_session_participants gsp ON ur.id = gsp.response_id
        WHERE gsp.session_id = ?
        ORDER BY ur.submitted_at ASC`,
        sessionId
    );
}

export async function completeGroupSession(sessionId: number) {
    const database = await getDatabase();
    await database.run(
        `UPDATE group_standup_sessions
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        sessionId
    );
}

export async function getTodaysStandupResponses() {
    const database = await getDatabase();
    return await database.all(
        `SELECT *
        FROM user_responses
        WHERE response_type = 'standup'
        AND DATE(submitted_at) = DATE('now')
        ORDER BY submitted_at DESC`
    );
}

// Team Members Management
export async function addTeamMember(data: {
    teamId: string;
    userId: string;
    userName: string;
    userEmail?: string;
    conversationRef?: string;
}) {
    const database = await getDatabase();
    return await database.run(
        `INSERT INTO team_members (team_id, user_id, user_name, user_email, conversation_ref)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(team_id, user_id) DO UPDATE SET
            user_name = excluded.user_name,
            user_email = excluded.user_email,
            conversation_ref = excluded.conversation_ref`,
        [data.teamId, data.userId, data.userName, data.userEmail || null, data.conversationRef || null]
    );
}

export async function getTeamMembers(teamId: string, activeOnly: boolean = true) {
    const database = await getDatabase();
    const query = activeOnly
        ? `SELECT * FROM team_members WHERE team_id = ? AND is_active = 1`
        : `SELECT * FROM team_members WHERE team_id = ?`;
    return await database.all(query, [teamId]);
}

export async function updateTeamMemberConversationRef(teamId: string, userId: string, conversationRef: string) {
    const database = await getDatabase();
    return await database.run(
        `UPDATE team_members
        SET conversation_ref = ?
        WHERE team_id = ? AND user_id = ?`,
        [conversationRef, teamId, userId]
    );
}

export async function deactivateTeamMember(teamId: string, userId: string) {
    const database = await getDatabase();
    return await database.run(
        `UPDATE team_members
        SET is_active = 0
        WHERE team_id = ? AND user_id = ?`,
        [teamId, userId]
    );
}

export async function updateGroupChatRef(teamId: string, groupConversationId: string, groupConversationRef: string) {
    const database = await getDatabase();
    return await database.run(
        `UPDATE team_config
        SET group_conversation_id = ?, group_conversation_ref = ?
        WHERE team_id = ?`,
        [groupConversationId, groupConversationRef, teamId]
    );
}
