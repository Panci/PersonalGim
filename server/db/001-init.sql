CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'monitor', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  membership_number TEXT UNIQUE,
  phone TEXT,
  objective TEXT,
  level TEXT,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo', 'pendiente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gym_members
  ADD COLUMN IF NOT EXISTS assigned_routine_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_routine_title TEXT;

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id TEXT,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  total_kcal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_kcal >= 0),
  total_volume_kg NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_volume_kg >= 0),
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_sessions_user_started_idx
  ON workout_sessions (user_id, started_at DESC);

-- Routines belong to the signed-in user rather than to a browser. Keeping the
-- complete routine document in JSONB lets the mobile and web clients evolve
-- their nested day/exercise structure without a fragile set of joins.
CREATE TABLE IF NOT EXISTS user_routines (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  routines JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_templates (
  id TEXT PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  subtitle TEXT,
  objective TEXT NOT NULL CHECK (objective IN ('hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general')),
  level TEXT NOT NULL CHECK (level IN ('principiante', 'intermedio', 'avanzado')),
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  routine JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS routine_templates_goal_level_idx
  ON routine_templates (objective, level);

-- The Gemini credential is encrypted by the API before it reaches this table.
-- It is never sent back to mobile/web clients.
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider = 'gemini'),
  encrypted_api_key TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
