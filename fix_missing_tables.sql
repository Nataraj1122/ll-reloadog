
-- 1. Create missing email_logs table for notification tracking
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  customer_email TEXT,
  status TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS Policies for email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
DROP POLICY IF EXISTS "Allow public insert to email_logs" ON email_logs;
CREATE POLICY "Allow public insert to email_logs" 
ON email_logs FOR INSERT 
WITH CHECK (true);

-- Allow admins to view logs
DROP POLICY IF EXISTS "Allow admin view email_logs" ON email_logs;
CREATE POLICY "Allow admin view email_logs" 
ON email_logs FOR SELECT 
USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');

-- 3. Verify notifications table has correct policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notifications insert" ON notifications;
CREATE POLICY "Public notifications insert" ON notifications FOR INSERT WITH CHECK (true);
