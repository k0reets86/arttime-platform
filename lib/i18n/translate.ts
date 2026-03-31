type I18nField = { ru?: string; en?: string; de?: string; uk?: string } | null | undefined
export function t(field: I18nField, locale: string): string {
  if (!field) return ''
  return (field as Record<string, string>)[locale]
    || field['en']
    || field['ru']
    || Object.values(field).find(Boolean)
    || ''
}
