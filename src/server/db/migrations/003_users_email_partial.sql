-- The default UNIQUE(email) blocks ALL duplicates, including deleted users —
-- so a soft-deleted email could never be reused. This scopes uniqueness to
-- ACTIVE users only, freeing the email the moment a user is deleted.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_idx
  ON users (email) WHERE deleted_at IS NULL;