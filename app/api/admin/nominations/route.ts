import { makeAdminCrud } from '@/lib/api/adminCrud'

const crud = makeAdminCrud('nominations', [
  'name_i18n', 'category_id', 'min_age', 'max_age',
  'score_min', 'score_max', 'results_formula', 'active', 'sort_order',
])
export const POST = crud.POST
export const PATCH = crud.PATCH
export const DELETE = crud.DELETE
