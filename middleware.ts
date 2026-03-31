import createMiddleware from 'next-intl/middleware'
export default createMiddleware({
  locales: ['ru', 'en', 'de', 'uk'],
  defaultLocale: 'ru',
  localePrefix: 'always'
})
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }
