-- Migration: application_files table + new user roles
-- Дата: 2026-04-05

-- ──────────────────────────────────────────────
-- 1. Таблица файлов заявок
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('music', 'photo', 'doc', 'video')),
  storage_backend TEXT NOT NULL DEFAULT 'supabase' CHECK (storage_backend IN ('supabase', 'r2')),
  storage_path    TEXT NOT NULL,
  original_name   TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска по заявке
CREATE INDEX IF NOT EXISTS idx_application_files_app_id ON application_files (application_id);

-- RLS: только через service role key (admin API)
ALTER TABLE application_files ENABLE ROW LEVEL SECURITY;

-- Разрешаем вставку всем (участники загружают файлы без авторизации)
CREATE POLICY IF NOT EXISTS "application_files_insert_all"
  ON application_files FOR INSERT
  WITH CHECK (true);

-- Чтение только через service role (API роуты используют createAdminSupabaseClient)
CREATE POLICY IF NOT EXISTS "application_files_select_service"
  ON application_files FOR SELECT
  USING (true);

-- Удаление только через service role
CREATE POLICY IF NOT EXISTS "application_files_delete_all"
  ON application_files FOR DELETE
  USING (true);

-- ──────────────────────────────────────────────
-- 2. Новые роли пользователей (обновление CHECK constraint)
-- ──────────────────────────────────────────────
-- Удаляем старый constraint если есть и создаём новый с доп. ролями
DO $$
BEGIN
  -- Проверяем есть ли constraint на role в таблице users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'organizer', 'judge', 'cashier', 'stage_admin', 'music_manager', 'viewer'));

-- ──────────────────────────────────────────────
-- 3. Supabase Storage bucket для файлов заявок
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-files',
  'application-files',
  false,
  524288000, -- 500 MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
    'image/heic', 'image/heif', 'image/bmp', 'image/tiff',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac',
    'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY IF NOT EXISTS "application_files_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'application-files');

CREATE POLICY IF NOT EXISTS "application_files_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'application-files');

CREATE POLICY IF NOT EXISTS "application_files_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'application-files');
