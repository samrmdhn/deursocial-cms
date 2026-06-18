-- ══════════════════════════════════════════════════════════════
-- Migration 002: Check-in badge, user badge FK, EO draft data
-- ══════════════════════════════════════════════════════════════

-- 1. Link a reward badge to an event's check-in config (optional)
ALTER TABLE ir_event_qr_config
  ADD COLUMN IF NOT EXISTS checkin_badge_id INTEGER NULL REFERENCES ir_badges(id);

-- 2. Allow ir_user_badges to reference a catalog badge (event_checkin type)
ALTER TABLE ir_user_badges
  ADD COLUMN IF NOT EXISTS badge_id INTEGER NULL REFERENCES ir_badges(id);

-- 3. Stage EO edits as a draft; live columns unchanged until admin approves
ALTER TABLE ir_content_details
  ADD COLUMN IF NOT EXISTS draft_data JSONB NULL;
