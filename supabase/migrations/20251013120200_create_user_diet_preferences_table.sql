-- Migration: Create user_diet_preferences table for storing user dietary preferences
-- Purpose: Implement many-to-many relationship between users and dietary preferences
-- Affected tables: user_diet_preferences
-- Dependencies: Requires auth.users table and diet_pref_enum type
-- Created: 2025-10-13 12:02:00 UTC

-- Create user_diet_preferences table to store user dietary restrictions and preferences
-- This table implements a many-to-many relationship between users and dietary preferences
-- allowing users to have multiple dietary restrictions simultaneously
CREATE TABLE user_diet_preferences (
  -- Foreign key to Supabase Auth users table
  -- CASCADE delete ensures preferences are removed when user account is deleted
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dietary preference using the custom enum type
  -- This ensures only valid dietary preferences can be stored
  diet_pref diet_pref_enum NOT NULL,
  
  -- Timestamp for tracking when preference was added
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Composite primary key prevents duplicate user-preference combinations
  -- This ensures a user cannot have the same dietary preference recorded multiple times
  PRIMARY KEY (user_id, diet_pref)
);

-- Enable Row Level Security to ensure users can only access their own preferences
ALTER TABLE user_diet_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view only their own dietary preferences
CREATE POLICY "user_diet_preferences_select_policy" ON user_diet_preferences
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert preferences for themselves only
CREATE POLICY "user_diet_preferences_insert_policy" ON user_diet_preferences
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own preferences
-- Note: Updates are rare since this is typically insert/delete operations
CREATE POLICY "user_diet_preferences_update_policy" ON user_diet_preferences
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own preferences
CREATE POLICY "user_diet_preferences_delete_policy" ON user_diet_preferences
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Create index on user_id for efficient user-specific preference lookups
-- This is the primary query pattern: "get all preferences for user X"
CREATE INDEX idx_user_diet_preferences_user_id ON user_diet_preferences(user_id);
