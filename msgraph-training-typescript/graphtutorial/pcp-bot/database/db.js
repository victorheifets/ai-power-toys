"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDatabase = getDatabase;
exports.saveUserResponse = saveUserResponse;
exports.getUserResponses = getUserResponses;
exports.saveBlocker = saveBlocker;
exports.getActiveBlockers = getActiveBlockers;
exports.resolveBlocker = resolveBlocker;
exports.cacheWorkItem = cacheWorkItem;
exports.getCachedWorkItems = getCachedWorkItems;
exports.getTeamConfig = getTeamConfig;
exports.saveTeamConfig = saveTeamConfig;
exports.saveLLMStory = saveLLMStory;
exports.getBotCommands = getBotCommands;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let db = null;
async function initDatabase() {
    if (db) {
        return db;
    }
    const dbPath = path.join(__dirname, 'pcp_bot.db');
    const schemaPath = path.join(__dirname, 'schema.sql');
    db = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
    });
    // Run schema if database is new
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await db.exec(schema);
        console.log('✅ Database initialized');
    }
    return db;
}
async function getDatabase() {
    if (!db) {
        return await initDatabase();
    }
    return db;
}
// User Responses
async function saveUserResponse(data) {
    const database = await getDatabase();
    const result = await database.run(`INSERT INTO user_responses 
        (user_id, user_name, response_type, response_data, work_items, has_blocker) 
        VALUES (?, ?, ?, ?, ?, ?)`, data.userId, data.userName, data.responseType, JSON.stringify(data.responseData), JSON.stringify(data.workItems || []), data.hasBlocker ? 1 : 0);
    return result.lastID;
}
async function getUserResponses(userId, responseType, limit = 10) {
    const database = await getDatabase();
    let query = 'SELECT * FROM user_responses WHERE user_id = ?';
    const params = [userId];
    if (responseType) {
        query += ' AND response_type = ?';
        params.push(responseType);
    }
    query += ' ORDER BY submitted_at DESC LIMIT ?';
    params.push(limit);
    return await database.all(query, ...params);
}
// Blockers
async function saveBlocker(data) {
    const database = await getDatabase();
    const result = await database.run(`INSERT INTO blockers 
        (user_id, user_name, work_item_id, work_item_title, blocker_description, tl_user_id, tl_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, data.userId, data.userName, data.workItemId, data.workItemTitle, data.blockerDescription, data.tlUserId || null, data.tlName || null);
    return result.lastID;
}
async function getActiveBlockers(teamId) {
    const database = await getDatabase();
    return await database.all(`SELECT * FROM blockers WHERE status = 'active' ORDER BY created_at DESC`);
}
async function resolveBlocker(blockerId, resolutionNotes) {
    const database = await getDatabase();
    await database.run(`UPDATE blockers SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolution_notes = ? WHERE id = ?`, resolutionNotes || null, blockerId);
}
// ADO Work Items Cache
async function cacheWorkItem(data) {
    const database = await getDatabase();
    await database.run(`INSERT OR REPLACE INTO ado_work_items 
        (work_item_id, title, assigned_to, state, work_item_type, area_path, iteration_path, raw_data, last_synced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, data.workItemId, data.title, data.assignedTo, data.state, data.workItemType, data.areaPath || null, data.iterationPath || null, JSON.stringify(data.rawData));
}
async function getCachedWorkItems(assignedTo) {
    const database = await getDatabase();
    return await database.all(`SELECT * FROM ado_work_items WHERE assigned_to = ? ORDER BY last_synced DESC`, assignedTo);
}
// Team Configuration
async function getTeamConfig(teamId) {
    const database = await getDatabase();
    return await database.get(`SELECT * FROM team_config WHERE team_id = ?`, teamId);
}
async function saveTeamConfig(data) {
    const database = await getDatabase();
    await database.run(`INSERT OR REPLACE INTO team_config 
        (team_id, team_name, channel_id, ado_organization, ado_project, ado_pat, standup_time, eod_time, timezone, tl_user_id, tl_name, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, data.teamId, data.teamName, data.channelId || null, data.adoOrganization || null, data.adoProject || null, data.adoPat || null, data.standupTime || '09:00', data.eodTime || '17:00', data.timezone || 'UTC', data.tlUserId || null, data.tlName || null);
}
// LLM Stories
async function saveLLMStory(data) {
    const database = await getDatabase();
    const result = await database.run(`INSERT INTO llm_stories 
        (user_id, original_input, generated_title, generated_description, acceptance_criteria, story_points, ado_work_item_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, data.userId, data.originalInput, data.generatedTitle, data.generatedDescription, data.acceptanceCriteria, data.storyPoints || null, data.adoWorkItemId || null);
    return result.lastID;
}
async function getBotCommands() {
    const database = await getDatabase();
    return await database.all(`SELECT * FROM bot_commands WHERE enabled = 1 ORDER BY name`);
}
