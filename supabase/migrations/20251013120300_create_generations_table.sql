-- Migration: Create generations table for tracking AI recipe generation requests
-- Purpose: Track AI recipe generation attempts, performance metrics, and user acceptance
-- Affected tables: generations
-- Dependencies: Requires auth.users, recipes tables, and generation_status_enum type
-- Created: 2025-10-13 12:03:00 UTC

-- Create generations table to track AI recipe generation requests and outcomes
-- This table serves multiple purposes:
-- 1. Performance monitoring of AI generation requests
-- 2. User behavior analytics (acceptance/rejection rates)
-- 3. Deduplication of similar requests via content hashing
-- 4. Audit trail for AI-generated content
CREATE TABLE generations (
  -- Primary key using UUID for better distribution and security
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to Supabase Auth users table
  -- CASCADE delete ensures generations are removed when user account is deleted
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI model identifier for tracking which model was used
  -- Allows for A/B testing and performance comparison across models
  model VARCHAR(64) NOT NULL,
  
  -- SHA-256 hash of the source recipe title for deduplication and privacy
  -- 64 character hex string ensures we can identify similar requests without storing PII
  source_title_hash CHAR(64) NOT NULL CHECK (source_title_hash ~ '^[0-9a-f]{64}$'),
  
  -- Length of original title for analytics without storing actual content
  source_title_length INTEGER NOT NULL,
  
  -- SHA-256 hash of the source recipe content for deduplication and privacy
  -- Allows identification of identical requests without storing full content
  source_text_hash CHAR(64) NOT NULL CHECK (source_text_hash ~ '^[0-9a-f]{64}$'),
  
  -- Length of original content for analytics and performance monitoring
  source_text_length INTEGER NOT NULL,
  
  -- Generation duration in milliseconds for performance monitoring
  -- Helps identify slow requests and optimize AI processing
  generation_duration INTEGER NOT NULL,
  
  -- Status of the generation request (accepted/rejected/failed)
  -- NULL initially, updated when user makes decision or system fails
  status generation_status_enum NULL,
  
  -- Reference to the recipe created if user accepted the AI suggestion
  -- NULL if rejected or failed, populated when accepted
  -- CASCADE delete ensures referential integrity when recipes are deleted
  accepted_recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Timestamp tracking for audit and analytics
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security to ensure users can only access their own generation data
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view only their own generations
CREATE POLICY "generations_select_policy" ON generations
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert generations for themselves only
CREATE POLICY "generations_insert_policy" ON generations
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own generations
-- Typically used to update status and accepted_recipe_id fields
CREATE POLICY "generations_update_policy" ON generations
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own generations
CREATE POLICY "generations_delete_policy" ON generations
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Create index on user_id for efficient user-specific queries
-- Primary query pattern: "get all generations for user X"
CREATE INDEX idx_generations_user_id ON generations(user_id);

-- Create partial index on status for dashboard analytics
-- Only indexes non-null status values for efficient aggregation queries
-- Used for calculating acceptance/rejection rates and system health metrics
CREATE INDEX idx_generations_status ON generations(status) WHERE status IS NOT NULL;
