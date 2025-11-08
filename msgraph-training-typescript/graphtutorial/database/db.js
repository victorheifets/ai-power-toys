"use strict";
// Database connection and query functions for AI Power Toys
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.pool = exports.clearAllData = exports.deleteDetection = exports.closePool = exports.testConnection = exports.getDashboardStats = exports.getEmailWithDetails = exports.getActionsByDetection = exports.updateActionResult = exports.insertUserAction = exports.getDetectionById = exports.updateDetectionStatus = exports.getPendingDetections = exports.getDetectionsByEmail = exports.insertDetection = exports.markEmailAsAnalyzed = exports.getRecentEmails = exports.getEmailById = exports.getEmailByGraphId = exports.insertEmail = void 0;
var pg_1 = require("pg");
// ============================================================================
// DATABASE CONNECTION
// ============================================================================
var pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_power_toys',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});
exports.pool = pool;
// Test connection
pool.on('connect', function () {
    console.log('✅ Connected to PostgreSQL database');
});
pool.on('error', function (err) {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});
// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================
/**
 * Insert a new email into the database
 * Returns the inserted email with its ID
 */
function insertEmail(email) {
    return __awaiter(this, void 0, void 0, function () {
        var query, values, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    INSERT INTO emails (\n      graph_message_id, user_email, from_email, subject,\n      body_preview, body_content, received_at, analyzed_at\n    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n    ON CONFLICT (graph_message_id) DO NOTHING\n    RETURNING *;\n  ";
                    values = [
                        email.graph_message_id,
                        email.user_email,
                        email.from_email,
                        email.subject,
                        email.body_preview,
                        email.body_content,
                        email.received_at,
                        email.analyzed_at || null
                    ];
                    return [4 /*yield*/, pool.query(query, values)];
                case 1:
                    result = _a.sent();
                    if (!(result.rows.length === 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, getEmailByGraphId(email.graph_message_id)];
                case 2: 
                // Email already exists, fetch it
                return [2 /*return*/, _a.sent()];
                case 3: return [2 /*return*/, result.rows[0]];
            }
        });
    });
}
exports.insertEmail = insertEmail;
/**
 * Get email by Graph message ID
 */
function getEmailByGraphId(graphMessageId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'SELECT * FROM emails WHERE graph_message_id = $1;';
                    return [4 /*yield*/, pool.query(query, [graphMessageId])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0] || null];
            }
        });
    });
}
exports.getEmailByGraphId = getEmailByGraphId;
/**
 * Get email by internal ID
 */
function getEmailById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'SELECT * FROM emails WHERE id = $1;';
                    return [4 /*yield*/, pool.query(query, [id])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0] || null];
            }
        });
    });
}
exports.getEmailById = getEmailById;
/**
 * Get recent emails for a user
 */
function getRecentEmails(userEmail, limit) {
    if (limit === void 0) { limit = 50; }
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT * FROM emails\n    WHERE user_email = $1\n    ORDER BY received_at DESC\n    LIMIT $2;\n  ";
                    return [4 /*yield*/, pool.query(query, [userEmail, limit])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
exports.getRecentEmails = getRecentEmails;
/**
 * Update email's analyzed_at timestamp
 */
function markEmailAsAnalyzed(emailId) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'UPDATE emails SET analyzed_at = CURRENT_TIMESTAMP WHERE id = $1;';
                    return [4 /*yield*/, pool.query(query, [emailId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.markEmailAsAnalyzed = markEmailAsAnalyzed;
// ============================================================================
// POWER TOY DETECTION FUNCTIONS
// ============================================================================
/**
 * Insert a Power Toy detection
 */
function insertDetection(detection) {
    return __awaiter(this, void 0, void 0, function () {
        var query, values, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    INSERT INTO power_toy_detections (\n      email_id, toy_type, detection_data, confidence_score, status\n    ) VALUES ($1, $2, $3, $4, $5)\n    RETURNING *;\n  ";
                    values = [
                        detection.email_id,
                        detection.toy_type,
                        JSON.stringify(detection.detection_data),
                        detection.confidence_score || null,
                        detection.status || 'pending'
                    ];
                    return [4 /*yield*/, pool.query(query, values)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0]];
            }
        });
    });
}
exports.insertDetection = insertDetection;
/**
 * Get all detections for an email
 */
function getDetectionsByEmail(emailId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT * FROM power_toy_detections\n    WHERE email_id = $1\n    ORDER BY created_at ASC;\n  ";
                    return [4 /*yield*/, pool.query(query, [emailId])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
exports.getDetectionsByEmail = getDetectionsByEmail;
/**
 * Get pending detections for a user (across all their emails)
 */
function getPendingDetections(userEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT\n      e.*,\n      json_agg(\n        json_build_object(\n          'id', ptd.id,\n          'toy_type', ptd.toy_type,\n          'detection_data', ptd.detection_data,\n          'confidence_score', ptd.confidence_score,\n          'status', ptd.status,\n          'created_at', ptd.created_at,\n          'updated_at', ptd.updated_at\n        )\n      ) as detections\n    FROM emails e\n    INNER JOIN power_toy_detections ptd ON e.id = ptd.email_id\n    WHERE e.user_email = $1 AND ptd.status = 'pending'\n    GROUP BY e.id\n    ORDER BY e.received_at DESC;\n  ";
                    return [4 /*yield*/, pool.query(query, [userEmail])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
exports.getPendingDetections = getPendingDetections;
/**
 * Update detection status
 */
function updateDetectionStatus(detectionId, status) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'UPDATE power_toy_detections SET status = $1 WHERE id = $2;';
                    return [4 /*yield*/, pool.query(query, [status, detectionId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.updateDetectionStatus = updateDetectionStatus;
/**
 * Get detection by ID
 */
function getDetectionById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'SELECT * FROM power_toy_detections WHERE id = $1;';
                    return [4 /*yield*/, pool.query(query, [id])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0] || null];
            }
        });
    });
}
exports.getDetectionById = getDetectionById;
// ============================================================================
// USER ACTION FUNCTIONS
// ============================================================================
/**
 * Insert a user action
 */
function insertUserAction(action) {
    return __awaiter(this, void 0, void 0, function () {
        var query, values, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    INSERT INTO user_actions (\n      detection_id, action_type, action_data, result, error_message\n    ) VALUES ($1, $2, $3, $4, $5)\n    RETURNING *;\n  ";
                    values = [
                        action.detection_id,
                        action.action_type,
                        action.action_data ? JSON.stringify(action.action_data) : null,
                        action.result || 'pending',
                        action.error_message || null
                    ];
                    return [4 /*yield*/, pool.query(query, values)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0]];
            }
        });
    });
}
exports.insertUserAction = insertUserAction;
/**
 * Update user action result
 */
function updateActionResult(actionId, result, errorMessage) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    UPDATE user_actions\n    SET result = $1, error_message = $2\n    WHERE id = $3;\n  ";
                    return [4 /*yield*/, pool.query(query, [result, errorMessage || null, actionId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.updateActionResult = updateActionResult;
/**
 * Get actions for a detection
 */
function getActionsByDetection(detectionId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT * FROM user_actions\n    WHERE detection_id = $1\n    ORDER BY executed_at DESC;\n  ";
                    return [4 /*yield*/, pool.query(query, [detectionId])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
exports.getActionsByDetection = getActionsByDetection;
// ============================================================================
// COMPLEX QUERIES
// ============================================================================
/**
 * Get email with all its detections and actions
 */
function getEmailWithDetails(emailId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT\n      e.*,\n      json_agg(\n        DISTINCT jsonb_build_object(\n          'id', ptd.id,\n          'toy_type', ptd.toy_type,\n          'detection_data', ptd.detection_data,\n          'confidence_score', ptd.confidence_score,\n          'status', ptd.status,\n          'created_at', ptd.created_at,\n          'actions', (\n            SELECT json_agg(\n              json_build_object(\n                'id', ua.id,\n                'action_type', ua.action_type,\n                'action_data', ua.action_data,\n                'result', ua.result,\n                'executed_at', ua.executed_at\n              )\n            )\n            FROM user_actions ua\n            WHERE ua.detection_id = ptd.id\n          )\n        )\n      ) FILTER (WHERE ptd.id IS NOT NULL) as detections\n    FROM emails e\n    LEFT JOIN power_toy_detections ptd ON e.id = ptd.email_id\n    WHERE e.id = $1\n    GROUP BY e.id;\n  ";
                    return [4 /*yield*/, pool.query(query, [emailId])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0] || null];
            }
        });
    });
}
exports.getEmailWithDetails = getEmailWithDetails;
/**
 * Get dashboard stats for a user
 */
function getDashboardStats(userEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT\n      COUNT(DISTINCT e.id) as total_emails,\n      COUNT(ptd.id) as total_detections,\n      COUNT(ptd.id) FILTER (WHERE ptd.status = 'pending') as pending_detections,\n      COUNT(ptd.id) FILTER (WHERE ptd.status = 'actioned') as actioned_detections,\n      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'follow_up') as follow_up_count,\n      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'kudos') as kudos_count,\n      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'task') as task_count,\n      COUNT(ptd.id) FILTER (WHERE ptd.toy_type = 'urgent') as urgent_count\n    FROM emails e\n    LEFT JOIN power_toy_detections ptd ON e.id = ptd.email_id\n    WHERE e.user_email = $1;\n  ";
                    return [4 /*yield*/, pool.query(query, [userEmail])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0]];
            }
        });
    });
}
exports.getDashboardStats = getDashboardStats;
// ============================================================================
// DATABASE UTILITIES
// ============================================================================
/**
 * Test database connection
 */
function testConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, pool.query('SELECT NOW();')];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_1 = _a.sent();
                    console.error('Database connection test failed:', error_1);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.testConnection = testConnection;
/**
 * Close all database connections
 */
function closePool() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.end()];
                case 1:
                    _a.sent();
                    console.log('Database connection pool closed');
                    return [2 /*return*/];
            }
        });
    });
}
exports.closePool = closePool;
/**
 * Delete a specific detection by ID
 */
function deleteDetection(detectionId) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = 'DELETE FROM power_toy_detections WHERE id = $1;';
                    return [4 /*yield*/, pool.query(query, [detectionId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteDetection = deleteDetection;
/**
 * Clear all database data (emails, detections, actions)
 * WARNING: This will delete ALL data from the database!
 */
function clearAllData() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Delete in correct order due to foreign key constraints
                return [4 /*yield*/, pool.query('DELETE FROM user_actions;')];
                case 1:
                    // Delete in correct order due to foreign key constraints
                    _a.sent();
                    return [4 /*yield*/, pool.query('DELETE FROM power_toy_detections;')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, pool.query('DELETE FROM emails;')];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.clearAllData = clearAllData;
exports["default"] = {
    // Email functions
    insertEmail: insertEmail,
    getEmailByGraphId: getEmailByGraphId,
    getEmailById: getEmailById,
    getRecentEmails: getRecentEmails,
    markEmailAsAnalyzed: markEmailAsAnalyzed,
    // Detection functions
    insertDetection: insertDetection,
    getDetectionsByEmail: getDetectionsByEmail,
    getPendingDetections: getPendingDetections,
    updateDetectionStatus: updateDetectionStatus,
    getDetectionById: getDetectionById,
    deleteDetection: deleteDetection,
    // Action functions
    insertUserAction: insertUserAction,
    updateActionResult: updateActionResult,
    getActionsByDetection: getActionsByDetection,
    // Complex queries
    getEmailWithDetails: getEmailWithDetails,
    getDashboardStats: getDashboardStats,
    // Utilities
    testConnection: testConnection,
    closePool: closePool,
    clearAllData: clearAllData
};
