"use strict";
// Integrated webhook server with Database + LLM + Multi-Toy Detection
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
var express_1 = require("express");
var db_1 = require("./database/db");
var node_fetch_1 = require("node-fetch");
var app = (0, express_1["default"])();
app.use(express_1["default"].json());
// CORS middleware to allow dashboard on port 5273 to fetch from backend on port 3200
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
var PORT = process.env.PORT || 3200;
var ACCESS_TOKEN = process.env.GRAPH_TOKEN || '';
var OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Store for tracking notifications
var notifications = [];
// Store for Graph API token (in-memory - for production, use database or secure storage)
var storedGraphToken = ACCESS_TOKEN;
/**
 * Analyze email with LLM to detect multiple Power Toys
 * Returns array of detections (can be empty, or contain multiple toys)
 */
function analyzeEmailWithLLM(email) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, response, error, result, analysis, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!OPENAI_API_KEY) {
                        console.log('⚠️  OPENAI_API_KEY not set - using mock analysis');
                        return [2 /*return*/, mockMultiToyAnalysis(email)];
                    }
                    prompt = "\nAnalyze this email and detect any of these \"Power Toys\" (action patterns):\n\n1. **Follow-Up Toy**: Email contains action items with deadlines\n   - Keywords: \"send by Friday\", \"get back to me\", \"waiting for\", \"remind me\"\n\n2. **Kudos Toy**: Email mentions achievements or good work\n   - Keywords: \"great work\", \"excellent job\", \"congratulations\", \"well done\"\n\n3. **Task Toy**: Email contains actionable items\n   - Keywords: \"please do\", \"can you\", \"need to\", \"make sure to\"\n\n4. **Urgent Request Toy**: Urgent requests (especially from boss)\n   - Keywords: \"urgent\", \"ASAP\", \"immediately\", \"by today\", \"critical\"\n\nEmail details:\nSubject: ".concat(email.subject, "\nFrom: ").concat(email.from.emailAddress.address, "\nSent: ").concat(email.sentDateTime, "\nBody: ").concat(email.body.content.substring(0, 1500), "\n\nReturn JSON array with ALL detected toys (can be 0, 1, or multiple):\n{\n  \"detections\": [\n    {\n      \"toy_type\": \"follow_up\"|\"kudos\"|\"task\"|\"urgent\",\n      \"detection_data\": {\n        // For follow_up: {\"action\": \"...\", \"deadline\": \"ISO date\", \"priority\": \"high|medium|low\"}\n        // For kudos: {\"achievement\": \"...\", \"person\": \"...\", \"suggested_action\": \"...\"}\n        // For task: {\"task_description\": \"...\", \"priority\": \"high|medium|low\"}\n        // For urgent: {\"reason\": \"...\", \"deadline\": \"ISO date\", \"action_needed\": \"...\"}\n      },\n      \"confidence_score\": 0.00-1.00\n    }\n  ]\n}\n");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, (0, node_fetch_1["default"])('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(OPENAI_API_KEY),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: 'gpt-4',
                                messages: [
                                    { role: 'system', content: 'You are an AI assistant that detects action patterns in emails. Return only valid JSON.' },
                                    { role: 'user', content: prompt }
                                ],
                                response_format: { type: 'json_object' }
                            })
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    error = _a.sent();
                    throw new Error("OpenAI API error: ".concat(error));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    result = _a.sent();
                    analysis = JSON.parse(result.choices[0].message.content);
                    return [2 /*return*/, analysis.detections || []];
                case 6:
                    error_1 = _a.sent();
                    console.error('❌ LLM analysis failed:', error_1.message);
                    console.log('⚠️  Falling back to mock analysis');
                    return [2 /*return*/, mockMultiToyAnalysis(email)];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Mock analysis for testing without OpenAI API
 * Detects multiple Power Toys using keyword matching
 */
function mockMultiToyAnalysis(email) {
    var _a, _b, _c;
    var body = ((_b = (_a = email.body) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
    var subject = ((_c = email.subject) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || '';
    var detections = [];
    // Detect Kudos Toy
    if (body.includes('great work') || body.includes('excellent') || body.includes('well done') || body.includes('congratulations')) {
        detections.push({
            toy_type: 'kudos',
            detection_data: {
                achievement: "Work mentioned in: ".concat(email.subject),
                person: 'user',
                suggested_action: 'Consider sharing achievement or sending thanks'
            },
            confidence_score: 0.85
        });
    }
    // Detect Follow-Up Toy
    if (body.includes('follow up') || body.includes('get back to me') || body.includes('send') || body.includes('by friday') || body.includes('by monday')) {
        var deadline = body.includes('friday') ? getFutureDate(3) :
            body.includes('monday') ? getFutureDate(5) :
                getFutureDate(2);
        detections.push({
            toy_type: 'follow_up',
            detection_data: {
                action: "Follow up on: ".concat(email.subject),
                deadline: deadline,
                priority: 'high'
            },
            confidence_score: 0.92
        });
    }
    // Detect Task Toy
    if (body.includes('can you') || body.includes('please') || body.includes('need to') || body.includes('make sure')) {
        detections.push({
            toy_type: 'task',
            detection_data: {
                task_description: "Task from email: ".concat(email.subject),
                priority: 'medium'
            },
            confidence_score: 0.78
        });
    }
    // Detect Urgent Toy
    if (body.includes('urgent') || body.includes('asap') || body.includes('immediately') || body.includes('critical') || subject.includes('urgent')) {
        detections.push({
            toy_type: 'urgent',
            detection_data: {
                reason: "Urgent request in: ".concat(email.subject),
                deadline: getFutureDate(1),
                action_needed: 'Review and respond immediately'
            },
            confidence_score: 0.91
        });
    }
    return detections;
}
function getFutureDate(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================
// Main webhook endpoint
app.post('/webhook', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var validationToken, notificationData, notificationList, _i, notificationList_1, notification, expectedClientState, messageUrl, messageResponse, message, savedEmail, detections, _a, detections_1, detection, savedDetection, error_2;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                console.log('\n' + '='.repeat(80));
                console.log('📬 WEBHOOK REQUEST RECEIVED');
                console.log('='.repeat(80));
                validationToken = req.query.validationToken;
                if (validationToken) {
                    console.log('✅ Subscription validation request');
                    console.log('Validation token:', validationToken.substring(0, 50) + '...');
                    console.log('Responding with validation token...\n');
                    return [2 /*return*/, res.status(200).send(validationToken)];
                }
                // STEP 2: Process change notifications
                console.log('📧 CHANGE NOTIFICATION RECEIVED\n');
                notificationData = req.body;
                notificationList = notificationData.value || [];
                _i = 0, notificationList_1 = notificationList;
                _g.label = 1;
            case 1:
                if (!(_i < notificationList_1.length)) return [3 /*break*/, 16];
                notification = notificationList_1[_i];
                console.log('─'.repeat(80));
                console.log('Processing notification:');
                console.log('  Subscription ID:', notification.subscriptionId);
                console.log('  Client State:', notification.clientState);
                console.log('  Change Type:', notification.changeType);
                console.log('  Resource:', notification.resource);
                console.log('');
                expectedClientState = 'MySecretState456';
                if (notification.clientState !== expectedClientState) {
                    console.warn('⚠️  WARNING: Invalid client state - skipping');
                    return [3 /*break*/, 15];
                }
                // Store notification
                notifications.push({
                    timestamp: new Date().toISOString(),
                    notification: notification
                });
                // STEP 3: Fetch full message from Graph API
                if (!ACCESS_TOKEN) {
                    console.log('ℹ️  No access token - skipping message fetch\n');
                    return [3 /*break*/, 15];
                }
                _g.label = 2;
            case 2:
                _g.trys.push([2, 14, , 15]);
                console.log('📥 Fetching full message details from Graph API...');
                messageUrl = "https://graph.microsoft.com/v1.0/".concat(notification.resource);
                return [4 /*yield*/, (0, node_fetch_1["default"])(messageUrl, {
                        headers: { 'Authorization': "Bearer ".concat(ACCESS_TOKEN) }
                    })];
            case 3:
                messageResponse = _g.sent();
                if (!messageResponse.ok) {
                    console.error('❌ Failed to fetch message:', messageResponse.status);
                    return [3 /*break*/, 15];
                }
                return [4 /*yield*/, messageResponse.json()];
            case 4:
                message = _g.sent();
                console.log('\n✉️  EMAIL DETAILS:');
                console.log('  Subject:', message.subject);
                console.log('  From:', (_c = (_b = message.from) === null || _b === void 0 ? void 0 : _b.emailAddress) === null || _c === void 0 ? void 0 : _c.address);
                console.log('  To:', (_d = message.toRecipients) === null || _d === void 0 ? void 0 : _d.map(function (r) { return r.emailAddress.address; }).join(', '));
                console.log('  Sent:', new Date(message.sentDateTime).toLocaleString());
                console.log('');
                // STEP 4: Save email to database
                console.log('💾 Saving email to database...');
                return [4 /*yield*/, db_1["default"].insertEmail({
                        graph_message_id: message.id,
                        user_email: ((_f = (_e = message.toRecipients[0]) === null || _e === void 0 ? void 0 : _e.emailAddress) === null || _f === void 0 ? void 0 : _f.address) || 'unknown@merck.com',
                        from_email: message.from.emailAddress.address,
                        subject: message.subject,
                        body_preview: message.bodyPreview,
                        body_content: message.body.content,
                        received_at: new Date(message.receivedDateTime)
                    })];
            case 5:
                savedEmail = _g.sent();
                console.log('  Email ID:', savedEmail.id);
                console.log('');
                // STEP 5: Analyze with LLM for multiple Power Toys
                console.log('🤖 AI POWER TOY: Multi-Toy Analysis');
                console.log('─'.repeat(80));
                return [4 /*yield*/, analyzeEmailWithLLM(message)];
            case 6:
                detections = _g.sent();
                console.log("\n\uD83C\uDFAF ANALYSIS RESULTS: Found ".concat(detections.length, " Power Toy detection(s)\n"));
                if (!(detections.length === 0)) return [3 /*break*/, 7];
                console.log('ℹ️  No action items detected in this email.');
                return [3 /*break*/, 13];
            case 7:
                _a = 0, detections_1 = detections;
                _g.label = 8;
            case 8:
                if (!(_a < detections_1.length)) return [3 /*break*/, 11];
                detection = detections_1[_a];
                console.log("\uD83D\uDCCC ".concat(detection.toy_type.toUpperCase(), " TOY DETECTED"));
                console.log('  Confidence:', detection.confidence_score);
                console.log('  Data:', JSON.stringify(detection.detection_data, null, 4));
                return [4 /*yield*/, db_1["default"].insertDetection({
                        email_id: savedEmail.id,
                        toy_type: detection.toy_type,
                        detection_data: detection.detection_data,
                        confidence_score: detection.confidence_score,
                        status: 'pending'
                    })];
            case 9:
                savedDetection = _g.sent();
                console.log('  Detection ID:', savedDetection.id);
                console.log('');
                _g.label = 10;
            case 10:
                _a++;
                return [3 /*break*/, 8];
            case 11: 
            // STEP 7: Mark email as analyzed
            return [4 /*yield*/, db_1["default"].markEmailAsAnalyzed(savedEmail.id)];
            case 12:
                // STEP 7: Mark email as analyzed
                _g.sent();
                console.log('✅ Email marked as analyzed');
                _g.label = 13;
            case 13:
                console.log('─'.repeat(80));
                return [3 /*break*/, 15];
            case 14:
                error_2 = _g.sent();
                console.error('❌ Error processing message:', error_2.message);
                console.error('Stack:', error_2.stack);
                return [3 /*break*/, 15];
            case 15:
                _i++;
                return [3 /*break*/, 1];
            case 16:
                console.log('='.repeat(80));
                console.log('✅ Webhook processing completed\n');
                // STEP 8: Always respond with 202 Accepted
                res.status(202).send();
                return [2 /*return*/];
        }
    });
}); });
// Health check endpoint
app.get('/health', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dbConnected;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1["default"].testConnection()];
            case 1:
                dbConnected = _a.sent();
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    notificationsReceived: notifications.length,
                    database: dbConnected ? 'connected' : 'disconnected',
                    features: {
                        graphAPI: !!ACCESS_TOKEN,
                        llmAnalysis: !!OPENAI_API_KEY,
                        database: dbConnected
                    }
                });
                return [2 /*return*/];
        }
    });
}); });
// Get dashboard stats
app.get('/api/stats/:userEmail', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1["default"].getDashboardStats(req.params.userEmail)];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get pending detections for user
app.get('/api/pending/:userEmail', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var pending, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1["default"].getPendingDetections(req.params.userEmail)];
            case 1:
                pending = _a.sent();
                res.json(pending);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get email with full details
app.get('/api/email/:emailId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var emailDetails, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1["default"].getEmailWithDetails(parseInt(req.params.emailId))];
            case 1:
                emailDetails = _a.sent();
                res.json(emailDetails);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Update detection status
app.patch('/api/detection/:detectionId/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_1, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                status_1 = req.body.status;
                return [4 /*yield*/, db_1["default"].updateDetectionStatus(parseInt(req.params.detectionId), status_1)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Add user action
app.post('/api/action', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, detection_id, action_type, action_data, action, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, detection_id = _a.detection_id, action_type = _a.action_type, action_data = _a.action_data;
                return [4 /*yield*/, db_1["default"].insertUserAction({
                        detection_id: detection_id,
                        action_type: action_type,
                        action_data: action_data,
                        result: 'pending'
                    })];
            case 1:
                action = _b.sent();
                res.json(action);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Delete a specific detection
app["delete"]('/api/detection/:detectionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var detectionId, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                detectionId = parseInt(req.params.detectionId);
                return [4 /*yield*/, db_1["default"].deleteDetection(detectionId)];
            case 1:
                _a.sent();
                res.json({ success: true, message: 'Detection deleted successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                res.status(500).json({ error: error_8.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Clear all database data
app.post('/api/clear-db', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1["default"].clearAllData()];
            case 1:
                _a.sent();
                res.json({ success: true, message: 'All database data cleared successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                res.status(500).json({ error: error_9.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Manual test/simulation endpoint - fetch and process emails with provided token
app.post('/api/test/simulate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, token, userEmail, _b, count, graphResponse, error, data, messages, processed, errors, results, _i, messages_1, message, email, detections, _c, detections_2, detection, err_1, error_10;
    var _d, _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 16, , 17]);
                _a = req.body, token = _a.token, userEmail = _a.userEmail, _b = _a.count, count = _b === void 0 ? 10 : _b;
                if (!token) {
                    return [2 /*return*/, res.status(400).json({ error: 'Bearer token is required' })];
                }
                if (!userEmail) {
                    return [2 /*return*/, res.status(400).json({ error: 'User email is required' })];
                }
                // Clean the token - remove "Bearer " prefix if it exists
                token = token.trim().replace(/^Bearer\s+/i, '');
                console.log("\n\uD83E\uDDEA TEST MODE: Simulating webhook for ".concat(userEmail, " (fetching ").concat(count, " emails)..."));
                return [4 /*yield*/, (0, node_fetch_1["default"])("https://graph.microsoft.com/v1.0/me/messages?$top=".concat(count, "&$select=id,subject,from,receivedDateTime,body"), {
                        headers: {
                            'Authorization': "Bearer ".concat(token),
                            'Content-Type': 'application/json'
                        }
                    })];
            case 1:
                graphResponse = _j.sent();
                if (!!graphResponse.ok) return [3 /*break*/, 3];
                return [4 /*yield*/, graphResponse.text()];
            case 2:
                error = _j.sent();
                console.error('❌ Graph API error:', error);
                return [2 /*return*/, res.status(graphResponse.status).json({ error: 'Failed to fetch from Graph API', details: error })];
            case 3: return [4 /*yield*/, graphResponse.json()];
            case 4:
                data = _j.sent();
                messages = data.value || [];
                console.log("\uD83D\uDCE5 Fetched ".concat(messages.length, " emails"));
                processed = 0;
                errors = 0;
                results = [];
                _i = 0, messages_1 = messages;
                _j.label = 5;
            case 5:
                if (!(_i < messages_1.length)) return [3 /*break*/, 15];
                message = messages_1[_i];
                _j.label = 6;
            case 6:
                _j.trys.push([6, 13, , 14]);
                console.log("\n\uD83D\uDCE7 Processing: \"".concat(message.subject, "\""));
                return [4 /*yield*/, db_1["default"].insertEmail({
                        graph_message_id: message.id,
                        user_email: userEmail,
                        subject: message.subject || '(No subject)',
                        from_email: ((_e = (_d = message.from) === null || _d === void 0 ? void 0 : _d.emailAddress) === null || _e === void 0 ? void 0 : _e.address) || 'unknown',
                        body_preview: ((_g = (_f = message.body) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.substring(0, 500)) || '',
                        body_content: ((_h = message.body) === null || _h === void 0 ? void 0 : _h.content) || null,
                        received_at: message.receivedDateTime
                    })];
            case 7:
                email = _j.sent();
                return [4 /*yield*/, analyzeEmailWithLLM(message)];
            case 8:
                detections = _j.sent();
                console.log("   \u2705 Found ".concat(detections.length, " detections"));
                _c = 0, detections_2 = detections;
                _j.label = 9;
            case 9:
                if (!(_c < detections_2.length)) return [3 /*break*/, 12];
                detection = detections_2[_c];
                return [4 /*yield*/, db_1["default"].insertDetection({
                        email_id: email.id,
                        toy_type: detection.toy_type,
                        detection_data: detection.detection_data,
                        confidence_score: detection.confidence_score,
                        status: 'pending'
                    })];
            case 10:
                _j.sent();
                _j.label = 11;
            case 11:
                _c++;
                return [3 /*break*/, 9];
            case 12:
                results.push({
                    subject: message.subject,
                    detections: detections.length
                });
                processed++;
                return [3 /*break*/, 14];
            case 13:
                err_1 = _j.sent();
                console.error("   \u274C Error processing email:", err_1.message);
                errors++;
                return [3 /*break*/, 14];
            case 14:
                _i++;
                return [3 /*break*/, 5];
            case 15:
                console.log("\n\u2705 Test simulation complete: ".concat(processed, " processed, ").concat(errors, " errors\n"));
                res.json({
                    success: true,
                    fetched: messages.length,
                    processed: processed,
                    errors: errors,
                    results: results
                });
                return [3 /*break*/, 17];
            case 16:
                error_10 = _j.sent();
                console.error('❌ Test simulation error:', error_10);
                res.status(500).json({ error: error_10.message });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// View all received notifications
app.get('/notifications', function (req, res) {
    res.json({
        total: notifications.length,
        notifications: notifications
    });
});
// Home page
app.get('/', function (req, res) {
    res.send("\n    <html>\n      <head>\n        <title>AI Power Toys - Multi-Toy Detection Server</title>\n        <style>\n          body {\n            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n            padding: 40px;\n            background: #2c3e50;\n            color: white;\n          }\n          .container {\n            max-width: 900px;\n            margin: 0 auto;\n            background: rgba(255,255,255,0.1);\n            padding: 30px;\n            border-radius: 15px;\n            backdrop-filter: blur(10px);\n          }\n          h1 { margin-top: 0; font-size: 28px; }\n          .status {\n            background: rgba(255,255,255,0.2);\n            padding: 15px;\n            border-radius: 10px;\n            margin: 20px 0;\n          }\n          .feature {\n            display: inline-block;\n            padding: 8px 15px;\n            margin: 5px;\n            background: rgba(255,255,255,0.2);\n            border-radius: 20px;\n            font-size: 14px;\n          }\n          .enabled { background: #10b981; }\n          .disabled { background: #ef4444; }\n          ul { list-style: none; padding: 0; }\n          li { padding: 5px 0; font-size: 14px; }\n          code {\n            background: rgba(0,0,0,0.3);\n            padding: 2px 8px;\n            border-radius: 4px;\n            font-family: 'Courier New', monospace;\n            font-size: 12px;\n          }\n          .toy-grid {\n            display: grid;\n            grid-template-columns: repeat(2, 1fr);\n            gap: 15px;\n            margin: 20px 0;\n          }\n          .toy-card {\n            background: rgba(255,255,255,0.15);\n            padding: 15px;\n            border-radius: 10px;\n          }\n          .toy-card h3 {\n            margin: 0 0 10px 0;\n            font-size: 16px;\n          }\n        </style>\n      </head>\n      <body>\n        <div class=\"container\">\n          <h1>\uD83E\uDD16 AI Power Toys - Multi-Toy Detection Server</h1>\n          <p>Intelligent email analysis with database persistence</p>\n\n          <div class=\"status\">\n            <h2>\uD83D\uDE80 Server Status</h2>\n            <p>\u2705 Running on port ".concat(PORT, "</p>\n            <p>\uD83D\uDCCA Notifications received: ").concat(notifications.length, "</p>\n          </div>\n\n          <div class=\"status\">\n            <h2>\uD83D\uDD27 Features</h2>\n            <span class=\"feature ").concat(ACCESS_TOKEN ? 'enabled' : 'disabled', "\">\n              ").concat(ACCESS_TOKEN ? '✅' : '❌', " Graph API\n            </span>\n            <span class=\"feature ").concat(OPENAI_API_KEY ? 'enabled' : 'disabled', "\">\n              ").concat(OPENAI_API_KEY ? '✅' : '⚠️', " LLM Analysis\n            </span>\n            <span class=\"feature enabled\">\n              \u2705 PostgreSQL Database\n            </span>\n            <span class=\"feature enabled\">\n              \u2705 Multi-Toy Detection\n            </span>\n          </div>\n\n          <div class=\"status\">\n            <h2>\uD83C\uDFA8 Power Toys</h2>\n            <div class=\"toy-grid\">\n              <div class=\"toy-card\">\n                <h3>\uD83D\uDCC5 Follow-Up Toy</h3>\n                <p style=\"font-size: 13px;\">Detects action items with deadlines</p>\n              </div>\n              <div class=\"toy-card\">\n                <h3>\uD83C\uDFC6 Kudos Toy</h3>\n                <p style=\"font-size: 13px;\">Recognizes achievements and good work</p>\n              </div>\n              <div class=\"toy-card\">\n                <h3>\u2705 Task Toy</h3>\n                <p style=\"font-size: 13px;\">Identifies actionable items</p>\n              </div>\n              <div class=\"toy-card\">\n                <h3>\u26A0\uFE0F Urgent Request Toy</h3>\n                <p style=\"font-size: 13px;\">Flags urgent requests</p>\n              </div>\n            </div>\n          </div>\n\n          <h2>\uD83D\uDCCB API Endpoints</h2>\n          <ul>\n            <li><code>POST /webhook</code> - Main webhook endpoint</li>\n            <li><code>GET /health</code> - Health check</li>\n            <li><code>GET /api/stats/:userEmail</code> - Dashboard statistics</li>\n            <li><code>GET /api/pending/:userEmail</code> - Pending detections</li>\n            <li><code>GET /api/email/:emailId</code> - Email details</li>\n            <li><code>PATCH /api/detection/:id/status</code> - Update detection status</li>\n            <li><code>POST /api/action</code> - Add user action</li>\n          </ul>\n\n          <h2>\uD83D\uDD17 Setup</h2>\n          <ol style=\"font-size: 14px;\">\n            <li>Expose with ngrok: <code>ngrok http ").concat(PORT, "</code></li>\n            <li>Create Graph API subscription with the HTTPS URL</li>\n            <li>Send/receive emails to trigger analysis</li>\n            <li>View results in React dashboard (coming next)</li>\n          </ol>\n        </div>\n      </body>\n    </html>\n  "));
});
// Start server
app.listen(PORT, function () { return __awaiter(void 0, void 0, void 0, function () {
    var dbConnected;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
                console.log('║           AI Power Toys - Multi-Toy Detection Server RUNNING                ║');
                console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
                console.log("\uD83D\uDE80 Server listening on http://localhost:".concat(PORT));
                console.log("\uD83D\uDD11 Graph Token: ".concat(ACCESS_TOKEN ? '✅ Configured' : '❌ Not set'));
                console.log("\uD83E\uDD16 OpenAI API: ".concat(OPENAI_API_KEY ? '✅ Configured' : '⚠️  Not set (using mock)'));
                return [4 /*yield*/, db_1["default"].testConnection()];
            case 1:
                dbConnected = _a.sent();
                console.log("\uD83D\uDCBE Database: ".concat(dbConnected ? '✅ Connected' : '❌ Not connected', "\n"));
                console.log('📋 Available endpoints:');
                console.log("   POST http://localhost:".concat(PORT, "/webhook                 - Main webhook"));
                console.log("   GET  http://localhost:".concat(PORT, "/health                  - Health check"));
                console.log("   GET  http://localhost:".concat(PORT, "/api/stats/:userEmail    - Dashboard stats"));
                console.log("   GET  http://localhost:".concat(PORT, "/api/pending/:userEmail  - Pending detections"));
                console.log("   GET  http://localhost:".concat(PORT, "/                        - Home page\n"));
                console.log('🌐 Next steps:');
                console.log("   1. Run: ngrok http ".concat(PORT));
                console.log('   2. Create Graph API subscription with ngrok HTTPS URL');
                console.log('   3. Send test emails to trigger multi-toy detection\n');
                console.log('⏳ Waiting for webhook notifications...\n');
                return [2 /*return*/];
        }
    });
}); });
// Graceful shutdown
process.on('SIGINT', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('\n\n🛑 Shutting down AI Power Toys server...');
                console.log("\uD83D\uDCCA Total notifications received: ".concat(notifications.length));
                return [4 /*yield*/, db_1["default"].closePool()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
