-- FocusNest Database Schema 


BEGIN;

-- 1. USERS (parent table - no dependencies)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ,
    is_consented_core BOOLEAN NOT NULL DEFAULT FALSE,
    is_consented_ai BOOLEAN NOT NULL DEFAULT FALSE,
    is_consented_spotify BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. ACCOUNT (depends on users)
CREATE TABLE IF NOT EXISTS public.account (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    encrypted_email BYTEA NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. REFRESH TOKENS (depends on users)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    device_hint TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);

-- 4. TASKS (depends on users)
CREATE TABLE IF NOT EXISTS public.tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    task_name BYTEA NOT NULL,
    task_status VARCHAR(50) NOT NULL DEFAULT 'Backlog'
        CHECK (task_status IN ('Backlog', 'Ready', 'Doing', 'Done')),
    energy_level VARCHAR(20) NOT NULL CHECK (energy_level IN ('Low', 'High')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUBTASKS (depends on tasks)
CREATE TABLE IF NOT EXISTS public.subtasks (
    subtask_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    subtask_name BYTEA NOT NULL,
    subtask_status VARCHAR(50) NOT NULL DEFAULT 'Backlog'
        CHECK (subtask_status IN ('Backlog', 'Ready', 'Doing', 'Done')),
    energy_level VARCHAR(20) NOT NULL CHECK (energy_level IN ('Low', 'High')),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. SESSION (depends on users + tasks)
DO $$ BEGIN
    CREATE TYPE reflection_type AS ENUM ('Distraction', 'Low Energy', 'External');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.session (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    reflection_type reflection_type,
    reflection_content BYTEA,
    outcome TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_active ON public.session(is_active);

-- 7. CHAT SESSIONS (depends on users)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    chat_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- 8. CHAT MESSAGES (depends on chat_sessions)
DO $$ BEGIN
    CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_messages (
    chat_message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(chat_session_id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content BYTEA NOT NULL,
    token_count INTEGER NOT NULL CHECK (token_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. SPOTIFY ACCOUNTS (depends on users)
CREATE TABLE IF NOT EXISTS public.spotify_accounts (
    spotify_acc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    spotify_user_id BYTEA NOT NULL,
    access_token BYTEA NOT NULL,
    refresh_token BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT
);

-- 10. SYSTEM PROMPTS (no dependencies)
CREATE TABLE IF NOT EXISTS public.system_prompts (
    key TEXT PRIMARY KEY,
    prompt TEXT NOT NULL
);

-- 11. CONSENT AUDIT LOG (depends on users)
DO $$ BEGIN
    CREATE TYPE consent_category AS ENUM ('core', 'ai', 'spotify');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.consent_audit_log (
    consent_audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    policy_version TEXT NOT NULL,
    consent_type consent_category NOT NULL,
    consent_value BOOLEAN NOT NULL,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_user_type ON public.consent_audit_log(user_id, consent_type);

-- 12. OPENAI USAGE (depends on users + chat_sessions)
CREATE TABLE IF NOT EXISTS public.openai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(chat_session_id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    request_ip_hashed TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_openai_usage_user ON public.openai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_openai_usage_created ON public.openai_usage(created_at);

COMMIT;