import { prisma } from '@/lib/db'
import InstallningarForm from './InstallningarForm'

const SETTING_KEYS = [
  { key: 'company_name', label: 'Företagsnamn', placeholder: 'Mitt Företag AB' },
  { key: 'company_org_number', label: 'Organisationsnummer', placeholder: '556123-4567' },
  { key: 'company_address', label: 'Adress', placeholder: 'Storgatan 1' },
  { key: 'company_city', label: 'Stad', placeholder: 'Stockholm' },
  { key: 'quote_prefix', label: 'Offertprefix', placeholder: 'Q' },
  { key: 'contract_prefix', label: 'Avtalsprefix', placeholder: 'A' },
  { key: 'invoice_prefix', label: 'Fakturaprefix', placeholder: 'F' },
  { key: 'default_tax', label: 'Standard moms (%)', placeholder: '25' },
]

export default async function InstallningarPage() {
  const settings = await prisma.systemSetting.findMany()

  const settingMap: Record<string, string> = {}
  for (const s of settings) {
    settingMap[s.key] = s.value
  }

  const initialValues = SETTING_KEYS.map((k) => ({
    ...k,
    value: settingMap[k.key] ?? '',
  }))

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">System</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Inställningar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hantera systeminställningar</p>
        </div>
      </div>

      <InstallningarForm settings={initialValues} />
    </div>
  )
}
