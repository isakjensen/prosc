import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CreateUserButton, EditUserButton } from './AnvandareClient'
import { UserAvatar } from '@/components/layout/user-avatar'

interface PageProps {
  searchParams: Promise<{ q?: string }>
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

export default async function AnvandarePage({ searchParams }: PageProps) {
  const { q } = await searchParams

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {},
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">System</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">Användare</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{users.length} användare totalt</p>
        </div>
        <CreateUserButton />
      </div>

      {/* Search */}
      <form method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Sök efter namn eller e-post…"
          className="flex h-10 w-full max-w-sm rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 hover:bg-gray-50 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:bg-white transition-all dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 dark:focus:border-zinc-500"
        />
      </form>

      {/* Table */}
      <div className="panel-surface">
        {users.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-zinc-500 text-sm">
            Inga användare hittades
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Namn</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500 hidden sm:table-cell">E-post</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Roll</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500 hidden md:table-cell">Skapad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  <span className="sr-only">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={user.avatar}
                        name={user.name}
                        insetPaddingClassName="p-[10%]"
                        className="h-9 w-9 shrink-0 ring-1 ring-gray-100 dark:ring-zinc-800"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/users/${user.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        >
                          {user.name}
                        </Link>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 sm:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-400 hidden sm:table-cell">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={roleVariant[user.role] ?? 'gray'}>
                      {roleLabel[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-zinc-500 hidden md:table-cell">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <EditUserButton user={{ id: user.id, name: user.name, email: user.email, role: user.role }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
