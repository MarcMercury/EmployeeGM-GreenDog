-- Create API Error Tracking System Tables
-- Allows production monitoring of all API calls and failures

CREATE TABLE IF NOT EXISTS api_error_logs (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  request_body TEXT,
  response_body TEXT,
  duration_ms INT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_api_errors_endpoint ON api_error_logs(endpoint);
CREATE INDEX idx_api_errors_status ON api_error_logs(status_code);
CREATE INDEX idx_api_errors_timestamp ON api_error_logs(timestamp DESC);
CREATE INDEX idx_api_errors_user ON api_error_logs(user_id);
CREATE INDEX idx_api_errors_method_endpoint ON api_error_logs(method, endpoint);

-- Create rollup table for daily error trends
CREATE TABLE IF NOT EXISTS api_error_trends (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  error_count INT DEFAULT 1,
  avg_duration_ms INT,
  unique_users INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, endpoint, method, status_code)
);

CREATE INDEX idx_error_trends_date ON api_error_trends(date DESC);
CREATE INDEX idx_error_trends_endpoint ON api_error_trends(endpoint);

-- Create table for missing endpoints (auto-detected)
CREATE TABLE IF NOT EXISTS missing_endpoints (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_count INT DEFAULT 1,
  reported BOOLEAN DEFAULT false,
  reported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_missing_endpoints_reported ON missing_endpoints(reported);

-- RLS Policies for api_error_logs
ALTER TABLE api_error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all error logs
CREATE POLICY "admin_read_all_errors" ON api_error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Users can read their own errors
CREATE POLICY "user_read_own_errors" ON api_error_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert
CREATE POLICY "service_insert_errors" ON api_error_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS for trends (read-only for admins)
ALTER TABLE api_error_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_trends" ON api_error_trends
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- RLS for missing endpoints
ALTER TABLE missing_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_missing" ON missing_endpoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Function to update trends (called nightly)
CREATE OR REPLACE FUNCTION refresh_api_error_trends()
RETURNS void AS $$
BEGIN
  INSERT INTO api_error_trends (date, endpoint, method, status_code, error_count, avg_duration_ms, unique_users)
  SELECT
    DATE(timestamp) as date,
    endpoint,
    method,
    status_code,
    COUNT(*) as error_count,
    ROUND(AVG(duration_ms)) as avg_duration_ms,
    COUNT(DISTINCT user_id) as unique_users
  FROM api_error_logs
  WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY DATE(timestamp), endpoint, method, status_code
  ON CONFLICT (date, endpoint, method, status_code)
  DO UPDATE SET
    error_count = EXCLUDED.error_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    unique_users = EXCLUDED.unique_users;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and track missing endpoints
CREATE OR REPLACE FUNCTION track_missing_endpoint(p_endpoint TEXT, p_method TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO missing_endpoints (endpoint, error_count)
  VALUES (p_endpoint, 1)
  ON CONFLICT (endpoint)
  DO UPDATE SET
    error_count = missing_endpoints.error_count + 1,
    last_seen = now();
END;
$$ LANGUAGE plpgsql;
