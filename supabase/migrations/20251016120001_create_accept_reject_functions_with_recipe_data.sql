-- Migration: Create RPC functions for accepting and rejecting generations with recipe data
-- Date: 2025-10-16
-- Description: Adds atomic accept_generation and reject_generation functions that handle recipe data

-- Function to accept a generation and create a recipe atomically
CREATE OR REPLACE FUNCTION accept_generation(
  p_user_id uuid,
  p_generation_id uuid,
  p_title varchar(50),
  p_content text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_generation_record RECORD;
  v_recipe_id uuid;
BEGIN
  -- Check if generation exists, belongs to user, and is pending
  SELECT id, source_title_hash, source_text_hash, source_title_length, source_text_length
  INTO v_generation_record
  FROM generations
  WHERE id = p_generation_id 
    AND user_id = p_user_id 
    AND status IS NULL;

  -- If not found or not pending, raise appropriate error
  IF NOT FOUND THEN
    -- Check if generation exists at all for this user
    IF EXISTS (SELECT 1 FROM generations WHERE id = p_generation_id AND user_id = p_user_id) THEN
      -- Generation exists but not pending (already accepted/rejected)
      RAISE EXCEPTION 'Generation already processed' USING ERRCODE = '23505'; -- Unique violation code for 409
    ELSE
      -- Generation doesn't exist or doesn't belong to user
      RAISE EXCEPTION 'Generation not found' USING ERRCODE = '02000'; -- No data found code for 404
    END IF;
  END IF;

  -- Validate input parameters
  IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required' USING ERRCODE = '22023'; -- Invalid parameter value
  END IF;
  
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
    RAISE EXCEPTION 'Content is required' USING ERRCODE = '22023'; -- Invalid parameter value
  END IF;
  
  IF LENGTH(TRIM(p_title)) > 50 THEN
    RAISE EXCEPTION 'Title must be ≤ 50 characters' USING ERRCODE = '22023'; -- Invalid parameter value
  END IF;
  
  IF LENGTH(TRIM(p_content)) > 10000 THEN
    RAISE EXCEPTION 'Content must be ≤ 10000 characters' USING ERRCODE = '22023'; -- Invalid parameter value
  END IF;

  -- Insert new recipe with AI source using the provided recipe data
  INSERT INTO recipes (user_id, title, content, source)
  VALUES (
    p_user_id,
    TRIM(p_title),
    TRIM(p_content),
    'ai'
  )
  RETURNING id INTO v_recipe_id;

  -- Update generation status to accepted
  UPDATE generations
  SET 
    status = 'accepted',
    accepted_recipe_id = v_recipe_id,
    updated_at = NOW()
  WHERE id = p_generation_id;

  RETURN v_recipe_id;
END;
$$;

-- Function to reject a generation
CREATE OR REPLACE FUNCTION reject_generation(
  p_user_id uuid,
  p_generation_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update generation status to rejected, but only if it exists, belongs to user, and is pending
  UPDATE generations
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE id = p_generation_id 
    AND user_id = p_user_id 
    AND status IS NULL;

  -- Check if any row was updated
  IF NOT FOUND THEN
    -- Check if generation exists at all for this user
    IF EXISTS (SELECT 1 FROM generations WHERE id = p_generation_id AND user_id = p_user_id) THEN
      -- Generation exists but not pending (already accepted/rejected)
      RAISE EXCEPTION 'Generation already processed' USING ERRCODE = '23505'; -- Unique violation code for 409
    ELSE
      -- Generation doesn't exist or doesn't belong to user
      RAISE EXCEPTION 'Generation not found' USING ERRCODE = '02000'; -- No data found code for 404
    END IF;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION accept_generation(uuid, uuid, varchar(50), text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_generation(uuid, uuid) TO authenticated;
