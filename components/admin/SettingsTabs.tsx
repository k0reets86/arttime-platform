'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import FestivalSettingsForm from './FestivalSettingsForm'
import CategoriesEditor from './CategoriesEditor'
import PackagesEditor from './PackagesEditor'
import DiplomaTemplateEditor from './DiplomaTemplateEditor'
import { Settings, Tag, Package, Award } from 'lucide-react'

interface Props {
  festivalId: string
  locale: string
  festival: any
  categories: any[]
  nominations: any[]
  criteria: any[]
  packages: any[]
  diplomaTemplate: any | null
}

export default function SettingsTabs({
  festivalId, locale, festival,
  categories, nominations, criteria, packages,
  diplomaTemplate,
}: Props) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="general" className="flex items-center gap-1.5">
          <Settings className="w-4 h-4" /> Фестиваль
        </TabsTrigger>
        <TabsTrigger value="categories" className="flex items-center gap-1.5">
          <Tag className="w-4 h-4" /> Категории
        </TabsTrigger>
        <TabsTrigger value="packages" className="flex items-center gap-1.5">
          <Package className="w-4 h-4" /> Пакеты
        </TabsTrigger>
        <TabsTrigger value="diplomas" className="flex items-center gap-1.5">
          <Award className="w-4 h-4" /> Дипломы
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <FestivalSettingsForm festival={festival} locale={locale} />
      </TabsContent>

      <TabsContent value="categories">
        <CategoriesEditor
          festivalId={festivalId}
          categories={categories}
          nominations={nominations}
          criteria={criteria}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="packages">
        <PackagesEditor
          festivalId={festivalId}
          packages={packages}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="diplomas">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant border border-outline-variant/10">
          <div className="mb-6">
            <h2 className="font-headline font-semibold text-on-surface text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Шаблон диплома
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Настройте внешний вид дипломов для участников фестиваля.
              Используйте плейсхолдеры <code className="text-primary">{'{name}'}</code>,{' '}
              <code className="text-primary">{'{nomination}'}</code>,{' '}
              <code className="text-primary">{'{score}'}</code> в тексте.
            </p>
          </div>
          <DiplomaTemplateEditor
            festivalId={festivalId}
            initialTemplate={diplomaTemplate}
            locale={locale}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
