-- Migration: Disable RLS policies for development environment
-- Purpose: Temporarily disable Row Level Security for easier development and testing
-- WARNING: This should ONLY be used in development environments, NEVER in production
-- Created: 2025-10-13 12:06:00 UTC

-- IMPORTANT: This migration disables security features for development convenience
-- Make sure to re-enable RLS policies before deploying to production

-- Disable Row Level Security on all tables
-- This allows unrestricted access to all data during development
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_diet_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE generations DISABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies to clean up
-- This ensures no policies are left in an inconsistent state

-- Drop recipes table policies
DROP POLICY IF EXISTS "recipes_select_policy" ON recipes;
DROP POLICY IF EXISTS "recipes_insert_policy" ON recipes;
DROP POLICY IF EXISTS "recipes_update_policy" ON recipes;
DROP POLICY IF EXISTS "recipes_delete_policy" ON recipes;

-- Drop user_diet_preferences table policies
DROP POLICY IF EXISTS "user_diet_preferences_select_policy" ON user_diet_preferences;
DROP POLICY IF EXISTS "user_diet_preferences_insert_policy" ON user_diet_preferences;
DROP POLICY IF EXISTS "user_diet_preferences_update_policy" ON user_diet_preferences;
DROP POLICY IF EXISTS "user_diet_preferences_delete_policy" ON user_diet_preferences;

-- Drop generations table policies
DROP POLICY IF EXISTS "generations_select_policy" ON generations;
DROP POLICY IF EXISTS "generations_insert_policy" ON generations;
DROP POLICY IF EXISTS "generations_update_policy" ON generations;
DROP POLICY IF EXISTS "generations_delete_policy" ON generations;

-- Drop generation_error_logs table policies
DROP POLICY IF EXISTS "generation_error_logs_select_policy" ON generation_error_logs;
DROP POLICY IF EXISTS "generation_error_logs_insert_policy" ON generation_error_logs;
