import { makeAdminCrud } from '@/lib/api/adminCrud'

const crud = makeAdminCrud('criteria', [
  'name_i18n', 'nomination_id', 'weight', 'max_score', 'sort_order',
])
export const POST = crud.POST
export const PATCH = crud.PATCH
export const DELETE = crud.DELETE
