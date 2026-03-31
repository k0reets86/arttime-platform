import { makeAdminCrud } from '@/lib/api/adminCrud'

const crud = makeAdminCrud('categories', ['name_i18n', 'active', 'sort_order'])
export const POST = crud.POST
export const PATCH = crud.PATCH
export const DELETE = crud.DELETE
