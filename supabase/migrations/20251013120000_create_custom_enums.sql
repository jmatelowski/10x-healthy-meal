-- Migration: Create custom enum types for HealthyMeal application
-- Purpose: Define diet preference and generation status enums used across multiple tables
-- Created: 2025-10-13 12:00:00 UTC

-- Create enum for dietary preferences
-- This enum defines the supported dietary restrictions and preferences
-- that users can select to customize recipe modifications
CREATE TYPE diet_pref_enum AS ENUM (
  'vegetarian',    -- excludes meat and fish
  'vegan',         -- excludes all animal products
  'gluten_free',   -- excludes gluten-containing ingredients
  'diabetes',      -- optimized for diabetic dietary needs
  'nut_allergy',   -- excludes nuts and nut-based ingredients
  'low_fodmap'     -- excludes high-fodmap ingredients for digestive health
);

-- Create enum for AI generation status tracking
-- This enum tracks the lifecycle status of AI recipe generation requests
CREATE TYPE generation_status_enum AS ENUM (
  'accepted',  -- user accepted the AI-generated recipe suggestion
  'rejected',  -- user rejected the AI-generated recipe suggestion
  'failed'     -- AI generation process failed due to technical issues
);
