'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, Star } from 'lucide-react'

interface Category {
  id: string; name_i18n: Record<string, string>; active: boolean; sort_order: number
}
interface Nomination {
  id: string; name_i18n: Record<string, string>; category_id: string
  min_age?: number; max_age?: number; active: boolean; sort_order: number
  score_min: number; score_max: number; results_formula: string
}
interface Criterion {
  id: string; name_i18n: Record<string, string>; nomination_id: string
  weight: number; max_score: number; sort_order: number
}
interface Props {
  festivalId: string
  categories: Category[]
  nominations: Nomination[]
  criteria: Criterion[]
  locale: string
}

type ModalMode = 'cat_new' | 'cat_edit' | 'nom_new' | 'nom_edit' | 'crit_new' | null

export default function CategoriesEditor({ festivalId, categories, nominations, criteria, locale }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<any>(null)
  const [parentId, setParentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  // Generic CRUD call
  const save = async (url: string, method: string, body: object) => {
    setLoading(true); setError('')
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Ошибка'); return false }
    router.refresh(); setModalMode(null); setEditing(null)
    return true
  }

  const del = async (url: string) => {
    if (!confirm('Удалить?')) return
    setLoading(true)
    await fetch(url, { method: 'DELETE' })
    setLoading(false); router.refresh()
  }

  // Category form
  const [catForm, setCatForm] = useState({ name_ru: '', name_en: '', active: true, sort_order: 0 })
  const openCatNew = () => { setCatForm({ name_ru: '', name_en: '', active: true, sort_order: categories.length }); setModalMode('cat_new') }
  const openCatEdit = (c: Category) => {
    setCatForm({ name_ru: c.name_i18n.ru || '', name_en: c.name_i18n.en || '', active: c.active, sort_order: c.sort_order })
    setEditing(c); setModalMode('cat_edit')
  }
  const saveCat = async () => {
    const body = {
      festival_id: festivalId,
      name_i18n: { ru: catForm.name_ru, en: catForm.name_en },
      active: catForm.active,
      sort_order: catForm.sort_order,
    }
    if (modalMode === 'cat_new') await save('/api/admin/categories', 'POST', body)
    else await save(`/api/admin/categories?id=${editing.id}`, 'PATCH', body)
  }

  // Nomination form
  const [nomForm, setNomForm] = useState({
    name_ru: '', name_en: '', min_age: '', max_age: '',
    score_min: '0', score_max: '100', results_formula: 'mean', active: true, sort_order: 0,
  })
  const openNomNew = (catId: string) => {
    const catNoms = nominations.filter(n => n.category_id === catId)
    setNomForm({ name_ru: '', name_en: '', min_age: '', max_age: '', score_min: '0', score_max: '100', results_formula: 'mean', active: true, sort_order: catNoms.length })
    setParentId(catId); setModalMode('nom_new')
  }
  const openNomEdit = (n: Nomination) => {
    setNomForm({
      name_ru: n.name_i18n.ru || '', name_en: n.name_i18n.en || '',
      min_age: n.min_age ? String(n.min_age) : '',
      max_age: n.max_age ? String(n.max_age) : '',
      score_min: String(n.score_min), score_max: String(n.score_max),
      results_formula: n.results_formula || 'mean',
      active: n.active, sort_order: n.sort_order,
    })
    setEditing(n); setModalMode('nom_edit')
  }
  const saveNom = async () => {
    const body = {
      festival_id: festivalId,
      category_id: modalMode === 'nom_new' ? parentId : editing.category_id,
      name_i18n: { ru: nomForm.name_ru, en: nomForm.name_en },
      min_age: nomForm.min_age ? parseInt(nomForm.min_age, 10) : null,
      max_age: nomForm.max_age ? parseInt(nomForm.max_age, 10) : null,
      score_min: parseFloat(nomForm.score_min),
      score_max: parseFloat(nomForm.score_max),
      results_formula: nomForm.results_formula,
      active: nomForm.active, sort_order: nomForm.sort_order,
    }
    if (modalMode === 'nom_new') await save('/api/admin/nominations', 'POST', body)
    else await save(`/api/admin/nominations?id=${editing.id}`, 'PATCH', body)
  }

  // Criterion form
  const [critForm, setCritForm] = useState({ name_ru: '', name_en: '', weight: '1', max_score: '10', sort_order: 0 })
  const openCritNew = (nomId: string) => {
    const nomCrit = criteria.filter(c => c.nomination_id === nomId)
    setCritForm({ name_ru: '', name_en: '', weight: '1', max_score: '10', sort_order: nomCrit.length })
    setParentId(nomId); setModalMode('crit_new')
  }
  const saveCrit = async () => {
    const body = {
      festival_id: festivalId,
      nomination_id: parentId,
      name_i18n: { ru: critForm.name_ru, en: critForm.name_en },
      weight: parseFloat(critForm.weight),
      max_score: parseFloat(critForm.max_score),
      sort_order: critForm.sort_order,
    }
    await save('/api/admin/criteria', 'POST', body)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
        <h2 className="font-headline font-semibold text-on-surface">Категории и номинации</h2>
        <Button size="sm" onClick={openCatNew} className="primary-gradient text-on-primary">
          <Plus className="w-4 h-4 mr-1.5" /> Добавить категорию
        </Button>
      </div>

      <div className="divide-y divide-outline-variant/10">
        {categories.length === 0 && (
          <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
            Категорий пока нет. Создайте первую.
          </div>
        )}
        {categories.map(cat => {
          const catNoms = nominations.filter(n => n.category_id === cat.id)
          const isOpen = expanded[cat.id]
          return (
            <div key={cat.id}>
              {/* Category row */}
              <div className="flex items-center gap-3 px-6 py-3 hover:bg-surface-container-low group">
                <button onClick={() => toggle(cat.id)} className="shrink-0">
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                    : <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                  }
                </button>
                <div className="flex-1">
                  <span className="font-medium text-on-surface">{getI18n(cat.name_i18n)}</span>
                  {cat.name_i18n.en && cat.name_i18n.en !== cat.name_i18n.ru && (
                    <span className="text-xs text-on-surface-variant ml-2">{cat.name_i18n.en}</span>
                  )}
                </div>
                <Badge variant={cat.active ? 'success' : 'secondary'}>
                  {cat.active ? 'Активна' : 'Скрыта'}
                </Badge>
                <span className="text-xs text-on-surface-variant">{catNoms.length} ном.</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openNomNew(cat.id)} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary" title="Добавить номинацию">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openCatEdit(cat)} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(`/api/admin/categories?id=${cat.id}`)} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Nominations */}
              {isOpen && (
                <div className="bg-surface-container-low/40">
                  {catNoms.length === 0 && (
                    <div className="px-14 py-3 text-sm text-on-surface-variant italic">
                      Номинаций нет —{' '}
                      <button onClick={() => openNomNew(cat.id)} className="text-primary hover:underline">добавить</button>
                    </div>
                  )}
                  {catNoms.map(nom => {
                    const nomCrit = criteria.filter(c => c.nomination_id === nom.id)
                    return (
                      <div key={nom.id} className="pl-12">
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant/10 hover:bg-surface-container-low group/nom">
                          <Star className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-on-surface">{getI18n(nom.name_i18n)}</span>
                            {nom.min_age || nom.max_age ? (
                              <span className="text-xs text-on-surface-variant ml-2">
                                {nom.min_age ?? '?'}–{nom.max_age ?? '∞'} лет
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs text-on-surface-variant">{nom.score_min}–{nom.score_max} балл</span>
                          <span className="text-xs text-on-surface-variant">{nomCrit.length} крит.</span>
                          <Badge variant={nom.active ? 'success' : 'secondary'} className="text-[10px]">
                            {nom.active ? 'Акт.' : 'Скр.'}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover/nom:opacity-100 transition-opacity">
                            <button onClick={() => openCritNew(nom.id)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary" title="Добавить критерий">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => openNomEdit(nom)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => del(`/api/admin/nominations?id=${nom.id}`)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Criteria */}
                        {nomCrit.map(crit => (
                          <div key={crit.id} className="flex items-center gap-3 px-8 py-1.5 text-xs text-on-surface-variant border-b border-outline-variant/5 hover:bg-surface-container-low group/crit">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0" />
                            <span className="flex-1">{getI18n(crit.name_i18n)}</span>
                            <span>макс. {crit.max_score}</span>
                            <span>вес ×{crit.weight}</span>
                            <button
                              onClick={() => del(`/api/admin/criteria?id=${crit.id}`)}
                              className="opacity-0 group-hover/crit:opacity-100 p-0.5 rounded hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <div className="px-6 py-3 text-sm text-red-500 border-t border-outline-variant/10">{error}</div>}

      {/* Category modal */}
      <Dialog open={modalMode === 'cat_new' || modalMode === 'cat_edit'} onOpenChange={() => setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'cat_new' ? 'Новая категория' : 'Редактировать категорию'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Название (RU)</label>
              <Input value={catForm.name_ru} onChange={e => setCatForm(f => ({ ...f, name_ru: e.target.value }))} placeholder="Хореография" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Название (EN)</label>
              <Input value={catForm.name_en} onChange={e => setCatForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Choreography" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cat-active" checked={catForm.active} onChange={e => setCatForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              <label htmlFor="cat-active" className="text-sm">Активна</label>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={saveCat} disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setModalMode(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nomination modal */}
      <Dialog open={modalMode === 'nom_new' || modalMode === 'nom_edit'} onOpenChange={() => setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'nom_new' ? 'Новая номинация' : 'Редактировать номинацию'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Название (RU)</label>
                <Input value={nomForm.name_ru} onChange={e => setNomForm(f => ({ ...f, name_ru: e.target.value }))} placeholder="Классический танец" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Название (EN)</label>
                <Input value={nomForm.name_en} onChange={e => setNomForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Classical Dance" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Возраст от</label>
                <Input type="number" value={nomForm.min_age} onChange={e => setNomForm(f => ({ ...f, min_age: e.target.value }))} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Возраст до</label>
                <Input type="number" value={nomForm.max_age} onChange={e => setNomForm(f => ({ ...f, max_age: e.target.value }))} placeholder="90" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Мин. балл</label>
                <Input type="number" value={nomForm.score_min} onChange={e => setNomForm(f => ({ ...f, score_min: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Макс. балл</label>
                <Input type="number" value={nomForm.score_max} onChange={e => setNomForm(f => ({ ...f, score_max: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Формула расчёта результата</label>
                <select
                  value={nomForm.results_formula}
                  onChange={e => setNomForm(f => ({ ...f, results_formula: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm"
                >
                  <option value="mean">Среднее (mean)</option>
                  <option value="weighted_mean">Взвешенное среднее</option>
                  <option value="sum">Сумма (sum)</option>
                  <option value="median">Медиана (median)</option>
                  <option value="trimmed_mean">Усечённое среднее (без мин/макс)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="nom-active" checked={nomForm.active} onChange={e => setNomForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              <label htmlFor="nom-active" className="text-sm">Активна</label>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={saveNom} disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setModalMode(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Criterion modal */}
      <Dialog open={modalMode === 'crit_new'} onOpenChange={() => setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый критерий оценки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Название (RU)</label>
              <Input value={critForm.name_ru} onChange={e => setCritForm(f => ({ ...f, name_ru: e.target.value }))} placeholder="Техника исполнения" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Название (EN)</label>
              <Input value={critForm.name_en} onChange={e => setCritForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Technical execution" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Максимальный балл</label>
                <Input type="number" value={critForm.max_score} onChange={e => setCritForm(f => ({ ...f, max_score: e.target.value }))} min="1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Вес критерия</label>
                <Input type="number" value={critForm.weight} onChange={e => setCritForm(f => ({ ...f, weight: e.target.value }))} min="0.1" step="0.1" />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={saveCrit} disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
              </Button>
              <Button variant="outline" onClick={() => setModalMode(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
