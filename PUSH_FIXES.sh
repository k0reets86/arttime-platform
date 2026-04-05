#!/bin/bash
# Запусти этот скрипт из папки ArtTime/platform чтобы закоммитить и запушить все исправления

echo "=== ArtTime: Применение исправлений admin панели ==="
echo ""

# Проверяем что мы в правильной папке
if [ ! -f "package.json" ] || ! grep -q "arttime" package.json 2>/dev/null; then
  echo "ОШИБКА: Запускай скрипт из папки arttime-platform"
  exit 1
fi

echo "Статус изменённых файлов:"
git status --short

echo ""
echo "Добавляем все изменения..."
git add app/\[locale\]/admin/applications/\[id\]/page.tsx
git add app/\[locale\]/admin/program/page.tsx  
git add app/api/admin/judges/invite/route.ts
git add app/api/admin/users/route.ts
git add components/admin/AdminSidebar.tsx
git add components/admin/ApplicationChat.tsx
git add components/admin/ApplicationEditForm.tsx
git add lib/auth/requireRole.ts

echo ""
echo "Создаём коммит..."
git commit -m "fix: исправление 6 багов admin панели + новые роли

- ApplicationChat: убрали auto-scroll всей страницы, добавили Supabase Realtime
- ApplicationEditForm: исправлено отображение поля notes (тех.требования)
- ApplicationDetailPage: исправлены поля notes и initialData формы
- judges/invite route: исправлен adminClient для вставки в users (bypass RLS)
- requireRole: добавлены роли stage_admin и music_manager
- users/route: добавлены stage_admin и music_manager в allowedRoles
- AdminSidebar: поддержка staff ролей + Программа видна всем staff
- program/page: доступ для stage_admin и music_manager, фикс nominations запроса"

echo ""
echo "Пушим на GitHub..."
git push origin main

echo ""
echo "=== Готово! Vercel задеплоит автоматически ==="
