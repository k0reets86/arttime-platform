import { makeAdminCrud } from '@/lib/api/adminCrud'

const crud = makeAdminCrud('packages', [
  'name_i18n', 'description_i18n', 'price', 'currency',
  'max_quantity', 'active', 'sort_order',
])
export const POST = crud.POST
export const PATCH = crud.PATCH
export const DELETE = crud.DELETE
