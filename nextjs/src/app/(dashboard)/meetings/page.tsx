import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import CreateMeetingButton from './CreateMeetingButton'

export default async function MotenPage() {
  const now = new Date()

  const [upcoming, past, customers, projects] = await Promise.all([
    prisma.meeting.findMany({
      where: { startTime: { gte: now } },
      include: { customer: true, project: true, attendees: { include: { user: true, contact: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.meeting.findMany({
      where: { startTime: { lt: now } },
      include: { customer: true, project: true, attendees: { include: { user: true, contact: true } } },
      orderBy: { startTime: 'desc' },
      take: 20,
    }),
    prisma.customer.findMany({
      where: { stage: { in: ['PROSPECT', 'CUSTOMER'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  function MeetingCard({ meeting }: { meeting: (typeof upcoming)[0] }) {
    const attendeeNames = meeting.attendees
      .map((a) => a.user?.name ?? (a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : null))
      .filter(Boolean)
      .join(', ')

    return (
      <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
        <div className="text-center min-w-[48px]">
          <p className="text-xs text-gray-500">
            {new Date(meeting.startTime).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {new Date(meeting.startTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm">{meeting.title}</h3>
          {meeting.location && (
            <p className="text-xs text-gray-500 mt-0.5">{meeting.location}</p>
          )}
          {(meeting.customer || meeting.project) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {meeting.customer && (
                <Link
                  href={`/customers/${meeting.customer.id}`}
                  className="inline-flex text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  {meeting.customer.name}
                </Link>
              )}
              {meeting.project && (
                <Link
                  href={`/projects/${meeting.project.id}`}
                  className="inline-flex text-[10px] px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 transition-colors"
                >
                  {meeting.project.name}
                </Link>
              )}
            </div>
          )}
          {attendeeNames && (
            <p className="text-xs text-gray-400 mt-0.5">{attendeeNames}</p>
          )}
          {meeting.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meeting.description}</p>
          )}
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)} min
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Arbete</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Möten</h1>
          <p className="text-sm text-gray-500 mt-0.5">{upcoming.length} kommande möten</p>
        </div>
        <CreateMeetingButton customers={customers} projects={projects} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Kommande möten</h2>
            <Badge variant="info">{upcoming.length}</Badge>
          </div>
          <div className="px-6">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 py-6">Inga kommande möten</p>
            ) : (
              upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)
            )}
          </div>
        </div>

        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Tidigare möten</h2>
            <Badge variant="gray">{past.length}</Badge>
          </div>
          <div className="px-6">
            {past.length === 0 ? (
              <p className="text-sm text-gray-400 py-6">Inga tidigare möten</p>
            ) : (
              past.map((m) => <MeetingCard key={m.id} meeting={m} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
