import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import ProfilTabs from './ProfilTabs'
import ProfilForm from './ProfilForm'
import { UserAvatar } from '@/components/layout/user-avatar'
import {
  parseSystemLogMessage,
  systemLogEntityHref,
  systemLogEntityLabel,
} from '@/lib/system-log-display'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Medlem',
}

const roleVariant: Record<string, 'danger' | 'warning' | 'gray'> = {
  ADMIN: 'danger',
  MANAGER: 'warning',
  MEMBER: 'gray',
}

const activityTypeLabel: Record<string, string> = {
  CREATED: 'Skapade',
  UPDATED: 'Uppdaterade',
  STAGE_CHANGED: 'Ändrade fas',
  EMAIL_SENT: 'Skickade e-post',
  CALL_MADE: 'Ringde',
  MEETING_SCHEDULED: 'Bokade möte',
  FILE_UPLOADED: 'Laddade upp fil',
  CONTRACT_SIGNED: 'Signerade avtal',
  QUOTE_SENT: 'Skickade offert',
  INVOICE_SENT: 'Skickade faktura',
  PAYMENT_RECEIVED: 'Mottog betalning',
  TASK_COMPLETED: 'Slutförde uppgift',
  MILESTONE_REACHED: 'Nådde milstolpe',
  NOTE_ADDED: 'Lade till anteckning',
}

export default async function ProfilPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const sp = await searchParams
  const tab = sp.tab ?? 'oversikt'

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          activities: true,
          systemLogs: true,
          tasks: true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const lastActivity = await prisma.activity.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const tabs = [
    { key: 'oversikt', label: 'Översikt' },
    { key: 'aktivitet', label: 'Aktivitet' },
    { key: 'redigera', label: 'Redigera profil' },
  ]

  const rb = roleVariant[user.role] ?? 'gray'
  const rl = roleLabel[user.role] ?? user.role

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <UserAvatar
            src={user.avatar}
            name={user.name}
            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 ring-2 ring-gray-100 dark:ring-zinc-800"
          />
          <div className="min-w-0">
            <p className="page-kicker">Konto</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">Min profil</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{user.email}</p>
          </div>
        </div>
        <Badge variant={rb}>{rl}</Badge>
      </div>

      {/* Tabs */}
      <ProfilTabs tabs={tabs} activeTab={tab} />

      {/* Översikt */}
      {tab === 'oversikt' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profilinformation</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Namn', value: user.name },
                { label: 'E-post', value: user.email },
                { label: 'Roll', value: rl },
                { label: 'Skapad', value: formatDate(user.createdAt) },
                { label: 'Senast uppdaterad', value: formatDate(user.updatedAt) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500 dark:text-zinc-400 shrink-0">{row.label}</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right">{row.value ?? '–'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Statistik</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Aktiviteter', value: user._count.activities },
                { label: 'Systemloggar', value: user._count.systemLogs },
                { label: 'Uppgifter', value: user._count.tasks },
                { label: 'Senaste aktivitet', value: lastActivity ? formatDateTime(lastActivity.createdAt) : 'Ingen' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-zinc-400">{label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aktivitet */}
      {tab === 'aktivitet' && <ProfilActivityLog userId={user.id} />}

      {/* Redigera */}
      {tab === 'redigera' && (
        <ProfilForm user={{ name: user.name, email: user.email }} />
      )}
    </div>
  )
}

async function ProfilActivityLog({ userId }: { userId: string }) {
  const [activities, systemLogs] = await Promise.all([
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.systemLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const combined = [
    ...activities.map((a) => ({
      id: a.id,
      date: a.createdAt,
      type: 'activity' as const,
      title: activityTypeLabel[a.type] ?? a.type,
      description: a.title,
      entity: a.customer?.name ?? null,
      entityHref: a.customer ? `/kunder/${a.customer.id}` : null,
    })),
    ...systemLogs.map((l) => ({
      id: l.id,
      date: l.createdAt,
      type: 'log' as const,
      title: l.action,
      description: parseSystemLogMessage(l.details),
      entity: systemLogEntityLabel(l.entityType, l.entityId),
      entityHref: systemLogEntityHref(l.entityType, l.entityId),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 50)

  return (
    <div className="panel-surface">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Min aktivitetslogg</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Dina senaste aktiviteter och systemhändelser
        </p>
      </div>
      {combined.length === 0 ? (
        <div className="p-10 text-center text-gray-400 dark:text-zinc-500 text-sm">
          Ingen aktivitet registrerad
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {combined.map((item) => (
            <div key={item.id} className="px-6 py-4 flex items-start gap-4">
              <div className="shrink-0 mt-0.5">
                <span className={`inline-block h-2 w-2 rounded-full ${item.type === 'activity' ? 'bg-blue-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate">{item.description}</p>
                )}
                {item.entity && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {item.entityHref ? (
                      <Link href={item.entityHref} className="hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                        {item.entity}
                      </Link>
                    ) : (
                      item.entity
                    )}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">
                {formatDateTime(item.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
