-- Migration: Create trigger function for automatic updated_at timestamp updates
-- Purpose: Automatically update updated_at columns when rows are modified
-- Affected tables: recipes, generations (any table with updated_at column)
-- Created: 2025-10-13 12:05:00 UTC

-- Create a reusable trigger function to automatically update updated_at timestamps
-- This function can be applied to any table that has an updated_at column
-- It ensures the timestamp is always current when a row is modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the updated_at column to the current timestamp
  -- This ensures accurate tracking of when records were last modified
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the recipes table
-- This ensures updated_at is automatically set whenever a recipe is modified
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply the trigger to the generations table
-- This ensures updated_at is automatically set whenever a generation record is modified
-- Typically happens when status or accepted_recipe_id fields are updated
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
