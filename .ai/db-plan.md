# HealthyMeal – PostgreSQL Schema (MVP)

## 1. Tables

### 1.0 users

This table is managed by Supabase Auth

| Column             | Type        | Constraints     |
| ------------------ | ----------- | --------------- |
| id                 | UUID        | PRIMARY KEY     |
| email              | TEXT        | UNIQUE NOT NULL |
| created_at         | TIMESTAMPTZ | DEFAULT now()   |
| encrypted_password | VARCHAR     | NOT NULL        |
| confirmed_at       | TIMESTAMPTZ | NULL            |

### 1.1 recipes

| Column     | Type        | Constraints                                          |
| ---------- | ----------- | ---------------------------------------------------- |
| id         | UUID        | PRIMARY KEY DEFAULT gen_random_uuid()                |
| user_id    | UUID        | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE |
| title      | VARCHAR(50) | NOT NULL                                             |
| content    | TEXT        | NOT NULL CHECK (char_length(content) <= 10000)       |
| source     | VARCHAR(16) | NOT NULL CHECK (source IN ('manual','ai'))           |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                               |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                               |

### 1.2 user_diet_preferences

| Column     | Type           | Constraints                                          |
| ---------- | -------------- | ---------------------------------------------------- |
| user_id    | UUID           | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE |
| diet_pref  | diet_pref_enum | NOT NULL                                             |
| created_at | TIMESTAMPTZ    | NOT NULL DEFAULT now()                               |

PRIMARY KEY (user_id, diet_pref)

### 1.3 generations

| Column              | Type                   | Constraints                                           |
| ------------------- | ---------------------- | ----------------------------------------------------- |
| id                  | UUID                   | PRIMARY KEY DEFAULT gen_random_uuid()                 |
| user_id             | UUID                   | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE  |
| model               | VARCHAR(64)            | NOT NULL                                              |
| source_title_hash   | CHAR(64)               | NOT NULL CHECK (source_title_hash ~ '^[0-9a-f]{64}$') |
| source_title_length | INTEGER                | NOT NULL                                              |
| source_text_hash    | CHAR(64)               | NOT NULL CHECK (source_text_hash ~ '^[0-9a-f]{64}$')  |
| source_text_length  | INTEGER                | NOT NULL                                              |
| generation_duration | INTEGER                | NOT NULL /_ milliseconds _/                           |
| status              | generation_status_enum | NULL                                                  |
| accepted_recipe_id  | UUID                   | REFERENCES recipes(id) ON DELETE CASCADE              |
| created_at          | TIMESTAMPTZ            | NOT NULL DEFAULT now()                                |
| updated_at          | TIMESTAMPTZ            | NOT NULL DEFAULT now()                                |

### 1.4 generation_error_logs

| Column              | Type          | Constraints                                           |
| ------------------- | ------------- | ----------------------------------------------------- |
| id                  | UUID          | PRIMARY KEY DEFAULT gen_random_uuid()                 |
| user_id             | UUID          | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE  |
| model               | VARCHAR(64)   | NOT NULL                                              |
| source_title_hash   | CHAR(64)      | NOT NULL CHECK (source_title_hash ~ '^[0-9a-f]{64}$') |
| source_title_length | INTEGER       | NOT NULL                                              |
| source_text_hash    | CHAR(64)      | NOT NULL CHECK (source_text_hash ~ '^[0-9a-f]{64}$')  |
| error_code          | VARCHAR(32)   | NOT NULL                                              |
| error_message       | VARCHAR(1000) | NOT NULL                                              |
| created_at          | TIMESTAMPTZ   | NOT NULL DEFAULT now()                                |

## 2. Types

```sql
CREATE TYPE diet_pref_enum AS ENUM (
  'vegetarian',
  'vegan',
  'gluten_free',
  'diabetes',
  'nut_allergy',
  'low_fodmap'
);

CREATE TYPE generation_status_enum AS ENUM ('accepted','rejected','failed');
```

## 3. Relationships

1. auth.users (1) —— (∞) recipes via recipes.user_id
2. auth.users (1) —— (∞) generations via generations.user_id
3. auth.users (1) —— (∞) generation_error_logs via generation_error_logs.user_id
4. auth.users (1) —— (∞) user_diet_preferences via user_diet_preferences.user_id
5. recipes (1) —— (0..1) generations via generations.accepted_recipe_id
6. user_diet_preferences implements a many-to-many between auth.users and diet_pref_enum

## 4. Indices

| Table                 | Index                          | Columns                           | Notes                                   |
| --------------------- | ------------------------------ | --------------------------------- | --------------------------------------- |
| user_diet_preferences | idx_user_diet_preferences_user | (user_id)                         | speeds up fetching preferences for user |
| generations           | idx_generations_user           | (user_id)                         |                                         |
| generation_error_logs | idx_gen_error_logs_user        | (user_id)                         |                                         |
| generations           | idx_generations_status         | (status) WHERE status IS NOT NULL | partial index for dashboard stats       |

(Primary keys and foreign keys create implicit B-tree indexes on their columns.)

## 5. Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_diet_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;

-- Policies: only owners may operate on their rows
CREATE POLICY "Recipes are viewable by owner only"
  ON recipes FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Recipes are modifiable by owner only"
  ON recipes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Diet prefs viewable by owner"
  ON user_diet_preferences FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Diet prefs modifiable by owner"
  ON user_diet_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Generations viewable by owner"
  ON generations FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Generations modifiable by owner"
  ON generations FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Error logs viewable by owner"
  ON generation_error_logs FOR SELECT USING (user_id = auth.uid());

-- Error logs are insert-only from backend
CREATE POLICY "Insert error logs"
  ON generation_error_logs FOR INSERT WITH CHECK (user_id = auth.uid());
```

## 6. Additional Notes

- All timestamps use `now()` in UTC and are immutable except `updated_at`, which should be updated via triggers.
- The `accept_generation(suggestion_id UUID)` RPC performs, in a single transaction:
  1. Inserts a new `recipes` row (source='ai').
  2. Updates the matching `generations` row, setting `status='accepted'` and `accepted_recipe_id`.
- Enum values are seeded via migrations; changes require a new migration.
- Foreign keys are declared `ON DELETE CASCADE` to automatically clean up dependent data when a user is removed via Supabase.
