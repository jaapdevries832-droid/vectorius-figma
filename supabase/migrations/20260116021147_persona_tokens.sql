-- Persona tokens for AI agent testing
-- These tokens allow AI agents (like ChatGPT) to authenticate as test personas
-- via magic links without going through the normal login flow.

CREATE TABLE persona_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,           -- The magic link token (random string)
  user_id UUID NOT NULL,                -- Which test user to sign in as
  persona_name TEXT NOT NULL,           -- e.g., "maya-7th-grader", "sarah-parent"
  role TEXT NOT NULL,                   -- "student", "parent", "advisor"
  expires_at TIMESTAMPTZ NOT NULL,      -- Token expiration timestamp
  used_at TIMESTAMPTZ,                  -- When token was used (null = unused)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_persona_tokens_token ON persona_tokens(token);

-- Index for cleanup queries (find expired tokens)
CREATE INDEX idx_persona_tokens_expires ON persona_tokens(expires_at);

-- RLS: No public access - only service role can read/write
-- This is intentional: tokens are managed server-side only
ALTER TABLE persona_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = deny all for anon/authenticated users
-- Only service_role key can access this table

COMMENT ON TABLE persona_tokens IS 'Magic link tokens for AI persona testing. Service role access only.';
