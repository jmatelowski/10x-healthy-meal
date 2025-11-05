-- Migration: Enable Row Level Security policies for production deployment
-- Purpose: Re-enable RLS with secure policies for all tables after development phase
-- Affected tables: recipes, user_diet_preferences, generations, generation_error_logs
-- Security Impact: Critical - This migration implements data access controls
-- Special Considerations:
--   - Policies ensure users can only access their own data
--   - Anonymous users have no access to any tables
--   - All policies are granular per operation type and role
-- Created: 2025-11-05 12:23:18 UTC

-- IMPORTANT SECURITY NOTICE:
-- This migration enables Row Level Security (RLS) with policies that restrict
-- data access to authenticated users only. Each user can only access their
-- own records. Anonymous users have no access to any data.
-- This is essential for production security and data privacy compliance.

-- ========================================
-- RECIPES TABLE RLS POLICIES
-- ========================================

-- Enable Row Level Security on recipes table
-- This ensures users can only access recipes they own
alter table recipes enable row level security;

-- RLS Policy: Allow authenticated users to view only their own recipes
-- Rationale: Users should only see recipes they created or were generated for them
-- Security: Prevents data leakage between users
create policy "recipes_select_policy" on recipes
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert recipes for themselves only
-- Rationale: Users can create new recipes, but only associated with their account
-- Security: Prevents users from creating recipes for other users
create policy "recipes_insert_policy" on recipes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own recipes
-- Rationale: Users need to edit their recipes, but not others' recipes
-- Security: Maintains data integrity and prevents unauthorized modifications
create policy "recipes_update_policy" on recipes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own recipes
-- Rationale: Users can remove their own recipes, but not others' recipes
-- Security: Prevents accidental or malicious deletion of other users' data
create policy "recipes_delete_policy" on recipes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ========================================
-- USER_DIET_PREFERENCES TABLE RLS POLICIES
-- ========================================

-- Enable Row Level Security on user_diet_preferences table
-- This ensures users can only access their own dietary preferences
alter table user_diet_preferences enable row level security;

-- RLS Policy: Allow authenticated users to view only their own dietary preferences
-- Rationale: Dietary preferences are personal and should not be shared
-- Security: Protects user privacy regarding health and dietary information
create policy "user_diet_preferences_select_policy" on user_diet_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert preferences for themselves only
-- Rationale: Users can set their own dietary preferences
-- Security: Prevents users from modifying other users' preferences
create policy "user_diet_preferences_insert_policy" on user_diet_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own preferences
-- Rationale: Users may need to change their preferences over time
-- Security: Maintains user control over their own data
create policy "user_diet_preferences_update_policy" on user_diet_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own preferences
-- Rationale: Users can remove preferences they no longer want
-- Security: Prevents unauthorized removal of other users' preferences
create policy "user_diet_preferences_delete_policy" on user_diet_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ========================================
-- GENERATIONS TABLE RLS POLICIES
-- ========================================

-- Enable Row Level Security on generations table
-- This ensures users can only access their own AI generation history
alter table generations enable row level security;

-- RLS Policy: Allow authenticated users to view only their own generations
-- Rationale: Generation history is personal and contains usage analytics
-- Security: Prevents users from seeing others' AI usage patterns
create policy "generations_select_policy" on generations
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert generations for themselves only
-- Rationale: System creates generation records when processing AI requests
-- Security: Ensures generation tracking is attributed to correct user
create policy "generations_insert_policy" on generations
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update only their own generations
-- Rationale: Users need to accept/reject AI suggestions, updating status
-- Security: Prevents interference with other users' generation processes
create policy "generations_update_policy" on generations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete only their own generations
-- Rationale: Users may want to clear their generation history
-- Security: Maintains user control over their own data
create policy "generations_delete_policy" on generations
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ========================================
-- GENERATION_ERROR_LOGS TABLE RLS POLICIES
-- ========================================

-- Enable Row Level Security on generation_error_logs table
-- This ensures users can only access their own error logs
alter table generation_error_logs enable row level security;

-- RLS Policy: Allow authenticated users to view only their own error logs
-- Rationale: Error logs may contain sensitive information about failed requests
-- Security: Provides transparency while maintaining privacy
create policy "generation_error_logs_select_policy" on generation_error_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow system to insert error logs for authenticated users
-- Rationale: Backend services log errors when AI generation fails
-- Security: Ensures error logs are properly attributed to the requesting user
-- Note: No UPDATE or DELETE policies - error logs should be immutable for audit purposes
create policy "generation_error_logs_insert_policy" on generation_error_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- SECURITY VALIDATION COMPLETE
-- All tables now have Row Level Security enabled with comprehensive policies
-- Anonymous users: No access to any data
-- Authenticated users: Full CRUD access to their own data only
-- This provides strong security while maintaining user functionality
