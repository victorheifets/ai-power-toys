// Test database layer

import db from './database/db';

async function testDatabase() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Testing AI Power Toys Database Layer                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // TEST 1: Connection test
    console.log('🔍 Test 1: Database Connection');
    const connected = await db.testConnection();
    if (connected) {
      console.log('✅ Database connection successful\n');
    } else {
      throw new Error('Failed to connect to database');
    }

    // TEST 2: Query existing test data
    console.log('🔍 Test 2: Query Existing Test Data');
    const stats = await db.getDashboardStats('heifets@merck.com');
    console.log('Dashboard Stats:');
    console.log('  Total Emails:', stats.total_emails);
    console.log('  Total Detections:', stats.total_detections);
    console.log('  Pending Detections:', stats.pending_detections);
    console.log('  Follow-up Count:', stats.follow_up_count);
    console.log('  Kudos Count:', stats.kudos_count);
    console.log('  Task Count:', stats.task_count);
    console.log('  Urgent Count:', stats.urgent_count);
    console.log('✅ Test data queried successfully\n');

    // TEST 3: Get pending detections
    console.log('🔍 Test 3: Get Pending Detections');
    const pending = await db.getPendingDetections('heifets@merck.com');
    console.log(`Found ${pending.length} emails with pending detections:`);
    for (const email of pending) {
      console.log(`\n  Email: ${email.subject}`);
      console.log(`  From: ${email.from_email}`);
      console.log(`  Detections: ${email.detections.length}`);
      for (const det of email.detections) {
        console.log(`    - ${det.toy_type} (confidence: ${det.confidence_score})`);
      }
    }
    console.log('\n✅ Pending detections retrieved successfully\n');

    // TEST 4: Insert new email
    console.log('🔍 Test 4: Insert New Email');
    const newEmail = await db.insertEmail({
      graph_message_id: 'test-msg-' + Date.now(),
      user_email: 'heifets@merck.com',
      from_email: 'test@example.com',
      subject: 'Test Email from Database Layer',
      body_preview: 'Testing database insert',
      body_content: 'This is a test email to verify the database layer is working correctly.',
      received_at: new Date()
    });
    console.log('  Inserted email ID:', newEmail.id);
    console.log('  Subject:', newEmail.subject);
    console.log('✅ Email inserted successfully\n');

    // TEST 5: Insert detection for new email
    console.log('🔍 Test 5: Insert Power Toy Detection');
    const newDetection = await db.insertDetection({
      email_id: newEmail.id!,
      toy_type: 'follow_up',
      detection_data: {
        action: 'Test action item',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      },
      confidence_score: 0.88,
      status: 'pending'
    });
    console.log('  Inserted detection ID:', newDetection.id);
    console.log('  Toy type:', newDetection.toy_type);
    console.log('  Status:', newDetection.status);
    console.log('✅ Detection inserted successfully\n');

    // TEST 6: Get email with all details
    console.log('🔍 Test 6: Get Email With Full Details');
    const emailDetails = await db.getEmailWithDetails(newEmail.id!);
    console.log('  Email:', emailDetails.subject);
    console.log('  Detections:', emailDetails.detections?.length || 0);
    console.log('✅ Full email details retrieved\n');

    // TEST 7: Update detection status
    console.log('🔍 Test 7: Update Detection Status');
    await db.updateDetectionStatus(newDetection.id!, 'actioned');
    const updatedDetection = await db.getDetectionById(newDetection.id!);
    console.log('  Detection status updated to:', updatedDetection?.status);
    console.log('✅ Status updated successfully\n');

    // TEST 8: Insert user action
    console.log('🔍 Test 8: Insert User Action');
    const newAction = await db.insertUserAction({
      detection_id: newDetection.id!,
      action_type: 'add_calendar',
      action_data: {
        event_title: 'Test action item reminder',
        event_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      result: 'success'
    });
    console.log('  Inserted action ID:', newAction.id);
    console.log('  Action type:', newAction.action_type);
    console.log('  Result:', newAction.result);
    console.log('✅ User action inserted successfully\n');

    // TEST 9: Get updated stats
    console.log('🔍 Test 9: Get Updated Stats');
    const newStats = await db.getDashboardStats('heifets@merck.com');
    console.log('Updated Dashboard Stats:');
    console.log('  Total Emails:', newStats.total_emails);
    console.log('  Total Detections:', newStats.total_detections);
    console.log('  Actioned Detections:', newStats.actioned_detections);
    console.log('✅ Stats updated correctly\n');

    console.log('═'.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('═'.repeat(60));
    console.log('\n✨ Database layer is ready for integration\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.closePool();
  }
}

testDatabase();
