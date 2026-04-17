#!/usr/bin/env node
/**
 * Apply Migration 105: Slack Sync System
 * Connects directly to Supabase PostgreSQL via the transaction pooler (IPv4).
 */
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres.uekumyupkhnpjpdcjfxb:A7aJ3YY@7Zk9w@aws-0-us-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

// Break migration into individual statements for sequential execution
const statements = [
  // 1. Add slack_status to employees
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS slack_status TEXT DEFAULT 'unlinked'`,
  `COMMENT ON COLUMN employees.slack_status IS 'Slack integration status: linked, unlinked, deactivated, pending_review, mismatch'`,

  // 2. Add slack_status to profiles
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_status TEXT DEFAULT 'unlinked'`,
  `COMMENT ON COLUMN profiles.slack_status IS 'Slack integration status: linked, unlinked, deactivated, pending_review, mismatch'`,

  // 3. Add last_slack_sync timestamps
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_slack_sync TIMESTAMPTZ`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_slack_sync TIMESTAMPTZ`,
  `COMMENT ON COLUMN employees.last_slack_sync IS 'Last successful Slack sync timestamp'`,
  `COMMENT ON COLUMN profiles.last_slack_sync IS 'Last successful Slack sync timestamp'`,

  // 4. Slack sync logs table
  `CREATE TABLE IF NOT EXISTS slack_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_employees INTEGER DEFAULT 0,
    matched_count INTEGER DEFAULT 0,
    new_links_count INTEGER DEFAULT 0,
    deactivated_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    pending_review_count INTEGER DEFAULT 0,
    error_details JSONB,
    summary JSONB,
    triggered_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_slack_sync_logs_started_at ON slack_sync_logs(started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_slack_sync_logs_status ON slack_sync_logs(status)`,

  // 5. Slack sync conflicts table
  `CREATE TABLE IF NOT EXISTS slack_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    conflict_type TEXT NOT NULL,
    employee_email TEXT,
    slack_user_id TEXT,
    slack_email TEXT,
    slack_display_name TEXT,
    details JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_status ON slack_sync_conflicts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_employee ON slack_sync_conflicts(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_type ON slack_sync_conflicts(conflict_type)`,

  // 6. Notification triggers table
  `CREATE TABLE IF NOT EXISTS notification_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    event_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    channel_target TEXT,
    send_dm BOOLEAN DEFAULT false,
    message_template TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notification_triggers_event ON notification_triggers(event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_triggers_active ON notification_triggers(is_active) WHERE is_active = true`,

  // 7. Notification queue table
  `CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID REFERENCES notification_triggers(id) ON DELETE SET NULL,
    channel TEXT,
    slack_user_id TEXT,
    message TEXT NOT NULL,
    blocks JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(status, scheduled_for) WHERE status = 'pending'`,
  `CREATE INDEX IF NOT EXISTS idx_notification_queue_created ON notification_queue(created_at DESC)`,

  // 8. Seed default notification triggers
  `INSERT INTO notification_triggers (name, event_type, description, channel_target, send_dm, message_template) VALUES
    ('New Employee Onboarding', 'employee_onboarding', 'Notification when a new employee starts onboarding', '#new-hires', false, '🎉 Welcome {{employee_name}} to the team! They are joining as {{position}} starting {{start_date}}.'),
    ('Visitor Arrival', 'visitor_arrival', 'Notification when a visitor/shadow arrives', '#visitors', false, '👋 {{visitor_name}} has arrived for their {{visit_type}} visit. Contact: {{coordinator}}'),
    ('Schedule Published', 'schedule_published', 'Notification when a new schedule is published', '#schedule', false, '📅 New schedule published for {{period}}. Check your assignments!'),
    ('Time Off Approved', 'time_off_approved', 'Notification when time off is approved', NULL, true, '✅ Your time off request for {{dates}} has been approved!'),
    ('Time Off Requested', 'time_off_requested', 'Notification to manager when time off is requested', NULL, true, '📝 {{employee_name}} has requested time off for {{dates}}. Please review.'),
    ('Training Completed', 'training_completed', 'Notification when employee completes training', '#training', false, '🏆 {{employee_name}} has completed training: {{training_name}}'),
    ('Certification Expiring', 'certification_expiring', 'Alert for expiring certifications', NULL, true, '⚠️ Your {{certification_name}} certification expires on {{expiry_date}}. Please renew.')
  ON CONFLICT (name) DO NOTHING`,

  // 9. Enable RLS
  `ALTER TABLE slack_sync_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE slack_sync_conflicts ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY`,

  // 10. RLS Policies - sync logs
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view sync logs' AND tablename = 'slack_sync_logs') THEN
      CREATE POLICY "Admins can view sync logs" ON slack_sync_logs FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
      );
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert sync logs' AND tablename = 'slack_sync_logs') THEN
      CREATE POLICY "System can insert sync logs" ON slack_sync_logs FOR INSERT WITH CHECK (true);
    END IF;
  END $$`,

  // 11. RLS Policies - sync conflicts
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view conflicts' AND tablename = 'slack_sync_conflicts') THEN
      CREATE POLICY "Admins can view conflicts" ON slack_sync_conflicts FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
      );
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update conflicts' AND tablename = 'slack_sync_conflicts') THEN
      CREATE POLICY "Admins can update conflicts" ON slack_sync_conflicts FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
      );
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert conflicts' AND tablename = 'slack_sync_conflicts') THEN
      CREATE POLICY "System can insert conflicts" ON slack_sync_conflicts FOR INSERT WITH CHECK (true);
    END IF;
  END $$`,

  // 12. RLS Policies - notification triggers
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view notification triggers' AND tablename = 'notification_triggers') THEN
      CREATE POLICY "Anyone can view notification triggers" ON notification_triggers FOR SELECT USING (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage notification triggers' AND tablename = 'notification_triggers') THEN
      CREATE POLICY "Admins can manage notification triggers" ON notification_triggers FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
      );
    END IF;
  END $$`,

  // 13. RLS Policies - notification queue
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view notification queue' AND tablename = 'notification_queue') THEN
      CREATE POLICY "Admins can view notification queue" ON notification_queue FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
      );
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can manage notification queue' AND tablename = 'notification_queue') THEN
      CREATE POLICY "System can manage notification queue" ON notification_queue FOR ALL WITH CHECK (true);
    END IF;
  END $$`,

  // 14. Updated_at trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql`,

  // 15. Attach triggers
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_slack_sync_conflicts_updated_at') THEN
      CREATE TRIGGER update_slack_sync_conflicts_updated_at BEFORE UPDATE ON slack_sync_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_notification_triggers_updated_at') THEN
      CREATE TRIGGER update_notification_triggers_updated_at BEFORE UPDATE ON notification_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END $$`,
]

console.log('🔄 Applying Migration 105: Slack Sync System\n')
console.log(`   Target: aws-0-us-west-1.pooler.supabase.com (uekumyupkhnpjpdcjfxb)`)
console.log(`   Statements: ${statements.length}\n`)

try {
  await client.connect()
  console.log('✅ Connected to database\n')
} catch (err) {
  console.error('❌ Connection failed:', err.message)
  process.exit(1)
}

let success = 0
let failed = 0

for (let i = 0; i < statements.length; i++) {
  const sql = statements[i]
  const label = sql.substring(0, 70).replace(/\n/g, ' ').trim()
  process.stdout.write(`  [${i + 1}/${statements.length}] ${label}... `)

  try {
    await client.query(sql)
    console.log('✅')
    success++
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log('⏭️  (already exists)')
      success++
    } else {
      console.log(`❌ ${err.message}`)
      failed++
    }
  }
}

await client.end()

console.log(`\n${'='.repeat(60)}`)
console.log(`Migration 105 complete: ${success} succeeded, ${failed} failed out of ${statements.length}`)

if (failed === 0) {
  console.log('\n🎉 All Slack sync tables and notification system ready!')
  console.log('   Next: Go to Admin → Slack in the app to run health check & user sync')
} else {
  console.log('\n⚠️  Some statements failed. Review errors above.')
}
