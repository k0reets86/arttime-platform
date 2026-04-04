-- ============================================================
-- Чат между администраторами и участниками
-- ============================================================
CREATE TABLE IF NOT EXISTS application_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('admin', 'participant')),
  sender_name   TEXT NOT NULL DEFAULT '',
  message       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_messages_application ON application_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_app_messages_created ON application_messages(created_at);

-- ============================================================
-- Назначение внимания конкретного администратора
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_attention (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  assigned_to     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note            TEXT,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_attention_application ON admin_attention(application_id);
CREATE INDEX IF NOT EXISTS idx_admin_attention_assigned_to ON admin_attention(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_attention_resolved ON admin_attention(is_resolved);

-- RLS
ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_attention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_messages"   ON application_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_messages" ON application_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_read_attention"  ON admin_attention FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_attention" ON admin_attention FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_attention" ON admin_attention FOR UPDATE USING (auth.role() = 'authenticated');
