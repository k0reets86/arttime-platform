-- Migration: diploma_templates table
-- Created: 2026-04-04

CREATE TABLE IF NOT EXISTS public.diploma_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id   UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'ДИПЛОМ',
  subtitle      TEXT NOT NULL DEFAULT 'ArtTime World Talent Festival',
  body_text     TEXT NOT NULL DEFAULT 'Настоящим подтверждается, что {name} принял(а) участие в номинации «{nomination}» и набрал(а) {score} баллов.',
  director_name TEXT NOT NULL DEFAULT '',
  jury_chair_name TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#5d3fd3',
  secondary_color TEXT NOT NULL DEFAULT '#ffd709',
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Only one template per festival
CREATE UNIQUE INDEX IF NOT EXISTS diploma_templates_festival_id_idx ON public.diploma_templates(festival_id);

-- RLS
ALTER TABLE public.diploma_templates ENABLE ROW LEVEL SECURITY;

-- Admins can read/write their festival's template
CREATE POLICY "Admin full access" ON public.diploma_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.festival_id = diploma_templates.festival_id
        AND u.active = true
    )
  );

-- webhook_logs table (for dashboard alert in Task 4)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id   UUID REFERENCES public.festivals(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed'
  payload       JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_festival_status_idx ON public.webhook_logs(festival_id, status, created_at);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read webhook_logs" ON public.webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.festival_id = webhook_logs.festival_id
        AND u.active = true
    )
  );
