-- Migration: публичные RLS-политики для анонимных пользователей
-- Дата: 2026-04-06
-- Причина: без этих политик анонимные пользователи (инкогнито-режим)
--          не могут читать данные фестиваля — страница регистрации
--          показывала "Регистрация закрыта" даже при открытом статусе.

-- ──────────────────────────────────────────────
-- 1. Таблица festivals — публичное чтение
-- ──────────────────────────────────────────────
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;

-- Все могут читать фестивали (публичные данные для лендинга и формы заявки)
CREATE POLICY IF NOT EXISTS "festivals_select_public"
  ON festivals FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────
-- 2. Таблица categories — публичное чтение
-- ──────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Все могут читать категории (нужно для формы заявки)
CREATE POLICY IF NOT EXISTS "categories_select_public"
  ON categories FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────
-- 3. Таблица nominations — публичное чтение
-- ──────────────────────────────────────────────
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;

-- Все могут читать номинации (нужно для формы заявки)
CREATE POLICY IF NOT EXISTS "nominations_select_public"
  ON nominations FOR SELECT
  USING (true);
