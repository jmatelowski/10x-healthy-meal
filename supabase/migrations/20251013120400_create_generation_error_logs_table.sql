-- Migration: Create generation_error_logs table for tracking AI generation failures
-- Purpose: Log and monitor AI generation errors for debugging and system health monitoring
-- Affected tables: generation_error_logs
-- Dependencies: Requires auth.users table
-- Created: 2025-10-13 12:04:00 UTC

-- Create generation_error_logs table to track AI generation failures
-- This table is critical for:
-- 1. Debugging AI generation issues
-- 2. Monitoring system health and error rates
-- 3. Identifying patterns in failures (specific models, content types, etc.)
-- 4. Providing support and improving user experience
CREATE TABLE generation_error_logs (
  -- Primary key using UUID for better distribution and security
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to Supabase Auth users table
  -- CASCADE delete ensures error logs are removed when user account is deleted
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI model identifier that failed
  -- Helps identify if specific models have higher failure rates
  model VARCHAR(64) NOT NULL,
  
  -- SHA-256 hash of the source recipe title for error pattern analysis
  -- Allows identification of problematic content without storing PII
  source_title_hash CHAR(64) NOT NULL CHECK (source_title_hash ~ '^[0-9a-f]{64}$'),
  
  -- Length of original title for correlation analysis
  -- Helps identify if content length contributes to failures
  source_title_length INTEGER NOT NULL,
  
  -- SHA-256 hash of the source recipe content for error pattern analysis
  -- Enables debugging without compromising user privacy
  source_text_hash CHAR(64) NOT NULL CHECK (source_text_hash ~ '^[0-9a-f]{64}$'),
  
  -- Error code for categorizing different types of failures
  -- Examples: 'TIMEOUT', 'RATE_LIMIT', 'INVALID_RESPONSE', 'MODEL_ERROR'
  error_code VARCHAR(32) NOT NULL,
  
  -- Detailed error message for debugging purposes
  -- Limited to 1000 characters to prevent abuse while providing useful info
  error_message VARCHAR(1000) NOT NULL,
  
  -- Timestamp for tracking when error occurred
  -- Critical for identifying error patterns and system issues over time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security to ensure users can only access their own error logs
-- Note: In practice, error logs might be accessed by admin users for debugging
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view only their own error logs
-- This provides transparency to users about issues with their requests
CREATE POLICY "generation_error_logs_select_policy" ON generation_error_logs
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Allow system to insert error logs for authenticated users
-- This is typically done by backend services, not directly by users
-- The policy ensures error logs can only be created for the authenticated user
CREATE POLICY "generation_error_logs_insert_policy" ON generation_error_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Note: No UPDATE or DELETE policies for error logs
-- Error logs should be immutable for audit purposes
-- Only system administrators should be able to modify error logs if needed

-- Create index on user_id for efficient user-specific error log queries
-- Useful for user support and debugging user-specific issues
CREATE INDEX idx_generation_error_logs_user_id ON generation_error_logs(user_id);

-- Create index on error_code for system monitoring and analytics
-- Enables efficient queries for error rate monitoring and alerting
CREATE INDEX idx_generation_error_logs_error_code ON generation_error_logs(error_code);

-- Create index on created_at for time-based error analysis
-- Useful for identifying error spikes and system health monitoring
CREATE INDEX idx_generation_error_logs_created_at ON generation_error_logs(created_at DESC);
