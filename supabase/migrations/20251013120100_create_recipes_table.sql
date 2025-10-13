-- Migration: Create recipes table for storing user recipes
-- Purpose: Store both manually entered and AI-generated recipes with proper user ownership
-- Affected tables: recipes
-- Dependencies: Requires Supabase Auth (auth.users table)
-- Created: 2025-10-13 12:01:00 UTC

-- Create the recipes table to store user recipes
-- This table holds both manually entered recipes and AI-generated recipe modifications
CREATE TABLE recipes (
  -- Primary key using UUID for better distribution and security
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to Supabase Auth users table
  -- CASCADE delete ensures recipes are removed when user account is deleted
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recipe title with reasonable length limit (50 characters)
  title VARCHAR(50) NOT NULL,
  
  -- Recipe content with 10,000 character limit to prevent abuse
  -- This should be sufficient for detailed recipes while maintaining performance
  content TEXT NOT NULL CHECK (char_length(content) <= 10000),
  
  -- Source tracking: distinguishes between manual entry and AI generation
  -- Helps with analytics and user experience differentiation
  source VARCHAR(16) NOT NULL CHECK (source IN ('manual', 'ai')),
  
  -- Timestamp tracking for audit and sorting purposes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security to ensure users can only access their own recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view only their own recipes
CREATE POLICY "recipes_select_policy" ON recipes
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert recipes for themselves only
CREATE POLICY "recipes_insert_policy" ON recipes
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own recipes
CREATE POLICY "recipes_update_policy" ON recipes
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own recipes
CREATE POLICY "recipes_delete_policy" ON recipes
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Create index on user_id for efficient user-specific queries
-- This is the most common query pattern for this table
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Create index on created_at for chronological sorting
-- Useful for displaying recipes in creation order
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
