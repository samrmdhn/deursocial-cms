-- ══════════════════════════════════════════════════════════════
-- CMS Tables Migration
-- Creates tables needed for the Admin/EO CMS
-- ══════════════════════════════════════════════════════════════

-- Roles table (if not exists)
CREATE TABLE IF NOT EXISTS ir_roles (
    id BIGSERIAL PRIMARY KEY,
    roles_name VARCHAR(100) NOT NULL,
    created_at BIGINT,
    updated_at BIGINT
);

-- Insert default roles if empty
INSERT INTO ir_roles (id, roles_name, created_at) VALUES
    (1, 'admin', EXTRACT(EPOCH FROM NOW())::BIGINT),
    (2, 'eo', EXTRACT(EPOCH FROM NOW())::BIGINT)
ON CONFLICT (id) DO NOTHING;

-- Users Admin table - links users to roles (admin/eo)
CREATE TABLE IF NOT EXISTS ir_users_admin (
    id BIGSERIAL PRIMARY KEY,
    roles_id BIGINT NOT NULL REFERENCES ir_roles(id),
    event_organizers_id BIGINT REFERENCES ir_event_organizers(id),
    users_id BIGINT REFERENCES ir_users(id),
    created_at BIGINT,
    updated_at BIGINT
);

-- Featured Ads table - for homepage ads (rounded/banner)
CREATE TABLE IF NOT EXISTS ir_featured_ads (
    id BIGSERIAL PRIMARY KEY,
    content_details_id BIGINT NOT NULL REFERENCES ir_content_details(id),
    format VARCHAR(20) NOT NULL DEFAULT 'rounded',  -- 'rounded' or 'banner'
    image VARCHAR(500) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    created_at BIGINT,
    updated_at BIGINT
);

-- Enable RLS on new tables
ALTER TABLE ir_users_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE ir_featured_ads ENABLE ROW LEVEL SECURITY;

-- Create policies for read access (anon key used by CMS)
CREATE POLICY "Allow all access for authenticated" ON ir_users_admin FOR ALL USING (true);
CREATE POLICY "Allow all access for authenticated" ON ir_featured_ads FOR ALL USING (true);
CREATE POLICY "Allow all access for authenticated" ON ir_roles FOR ALL USING (true);
