'use client'

import { useTranslations } from 'next-intl'
import type { WizardData } from '../ApplyWizard'
import { CheckCircle, Users, Car, BedDouble, Utensils, Info } from 'lucide-react'

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
  locale: string
}

// ──────────────────────────────────────────────
// Тарифная сетка: цена за ОДНОГО участника
// ──────────────────────────────────────────────
const PARTICIPATION_TIERS: Array<{ max: number; price: number; label: string }> = [
  { max: 1,        price: 100, label: '1 участник'       },
  { max: 2,        price: 90,  label: '2 участника'       },
  { max: 3,        price: 80,  label: '3 участника'       },
  { max: 4,        price: 70,  label: '4 участника'       },
  { max: 5,        price: 60,  label: '5 участников'      },
  { max: Infinity, price: 50,  label: '6 и более участников' },
]

function getPricePerPerson(count: number): number {
  const tier = PARTICIPATION_TIERS.find(t => count <= t.max)
  return tier ? tier.price : 50
}

// ──────────────────────────────────────────────
// Дополнительные опции
// ──────────────────────────────────────────────
interface Option {
  key: keyof PricingOptions
  icon: React.ElementType
  labelRu: string
  labelEn: string
  labelDe: string
  labelUk: string
  pricePerPerson: number
}

const OPTIONS: Option[] = [
  {
    key: 'transfer',
    icon: Car,
    labelRu: 'Трансфер из Дортмунда',
    labelEn: 'Transfer from Dortmund',
    labelDe: 'Transfer aus Dortmund',
    labelUk: 'Трансфер з Дортмунду',
    pricePerPerson: 10,
  },
  {
    key: 'accommodation',
    icon: BedDouble,
    labelRu: 'Проживание',
    labelEn: 'Accommodation',
    labelDe: 'Unterkunft',
    labelUk: 'Проживання',
    pricePerPerson: 50,
  },
  {
    key: 'meals',
    icon: Utensils,
    labelRu: 'Питание',
    labelEn: 'Meals',
    labelDe: 'Mahlzeiten',
    labelUk: 'Харчування',
    pricePerPerson: 20,
  },
]

export interface PricingOptions {
  transfer: boolean
  accommodation: boolean
  meals: boolean
}

function getLabel(opt: Option, locale: string): string {
  switch (locale) {
    case 'en': return opt.labelEn
    case 'de': return opt.labelDe
    case 'uk': return opt.labelUk
    default:   return opt.labelRu
  }
}

export default function Step4Packages({ data, updateData, locale }: Props) {
  const t = useTranslations('application')

  // Кол-во участников: для соло = 1, для группы = max(1, members.length)
  const participantCount = data.applicantType === 'solo'
    ? 1
    : Math.max(1, data.members.filter(m => m.full_name.trim()).length)

  const pricePerPerson = getPricePerPerson(participantCount)
  const baseTotal = pricePerPerson * participantCount

  const opts: PricingOptions = data.pricingOptions ?? { transfer: false, accommodation: false, meals: false }

  const toggleOption = (key: keyof PricingOptions) => {
    updateData({ pricingOptions: { ...opts, [key]: !opts[key] } })
  }

  // Сумма допопций
  const optionsTotal = OPTIONS.reduce((sum, opt) => {
    return sum + (opts[opt.key] ? opt.pricePerPerson * participantCount : 0)
  }, 0)

  const grandTotal = baseTotal + optionsTotal

  // Метка тира
  const tierLabel = PARTICIPATION_TIERS.find(t => participantCount <= t.max)?.label ?? '6 и более'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step4')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step4_desc')}</p>
      </div>

      {/* ── Базовый пакет — Участие ── */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 shadow-radiant space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-headline font-bold text-lg text-on-surface">
            {locale === 'en' ? 'Participation' : locale === 'de' ? 'Teilnahme' : locale === 'uk' ? 'Участь' : 'Участие'}
          </span>
          <span className="ml-auto font-bold text-primary text-lg">{pricePerPerson} € / чел.</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            {tierLabel} — {pricePerPerson} € × {participantCount} = <strong className="text-on-surface">{baseTotal} €</strong>
          </span>
        </div>

        {/* Тарифная таблица */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
          {PARTICIPATION_TIERS.map((tier, i) => {
            const isActive = participantCount <= tier.max &&
              (i === 0 || participantCount > PARTICIPATION_TIERS[i - 1].max)
            return (
              <div
                key={i}
                className={`rounded-lg p-2 text-center text-xs border transition-all ${
                  isActive
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-sm'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <div className="font-semibold">{tier.price}€</div>
                <div className="opacity-70">{tier.max === Infinity ? '6+' : `${tier.max} чел`}</div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <CheckCircle className="w-3.5 h-3.5 text-primary" />
          <span>Включено в базовый пакет</span>
        </div>
      </div>

      {/* ── Дополнительные опции ── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-on-surface">
          {locale === 'en' ? 'Additional options' : locale === 'de' ? 'Zusatzoptionen' : locale === 'uk' ? 'Додаткові опції' : 'Дополнительные опции'}
        </p>

        {OPTIONS.map(opt => {
          const selected = opts[opt.key]
          const Icon = opt.icon
          return (
            <div
              key={opt.key}
              onClick={() => toggleOption(opt.key)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected
                  ? 'border-primary bg-primary/5 shadow-radiant'
                  : 'border-outline-variant/40 hover:border-primary/30 hover:bg-surface-container-low'
              }`}
            >
              {/* Checkbox visual */}
              <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                selected ? 'bg-primary border-primary' : 'border-outline-variant'
              }`}>
                {selected && <CheckCircle className="w-3 h-3 text-on-primary" />}
              </div>

              <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-primary' : 'text-on-surface-variant'}`} />

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-on-surface text-sm">{getLabel(opt, locale)}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  +{opt.pricePerPerson} € × {participantCount} {locale === 'en' ? 'person(s)' : 'чел.'} = +{opt.pricePerPerson * participantCount} €
                </div>
              </div>

              <span className={`font-bold text-sm shrink-0 ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>
                +{opt.pricePerPerson * participantCount} €
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Итог ── */}
      <div className="pt-4 border-t border-outline-variant/20 space-y-2">
        {/* Разбивка */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>Участие ({participantCount} × {pricePerPerson} €)</span>
            <span>{baseTotal} €</span>
          </div>
          {OPTIONS.map(opt => opts[opt.key] && (
            <div key={opt.key} className="flex justify-between text-sm text-on-surface-variant">
              <span>{getLabel(opt, locale)} ({participantCount} × {opt.pricePerPerson} €)</span>
              <span>+{opt.pricePerPerson * participantCount} €</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
          <span className="font-headline font-bold text-on-surface text-base">
            {locale === 'en' ? 'Total' : locale === 'de' ? 'Gesamt' : locale === 'uk' ? 'Разом' : 'Итого'}
          </span>
          <span className="font-headline text-3xl font-black text-primary">{grandTotal} €</span>
        </div>
      </div>
    </div>
  )
}
