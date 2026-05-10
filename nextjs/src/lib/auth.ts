import NextAuth from 'next-auth'
import Discord from 'next-auth/providers/discord'
import { prisma } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/avatar'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'discord') return true

      const discordId = account.providerAccountId
      const email = user.email ?? `discord_${discordId}@discord.local`
      const name = user.name ?? 'Discord-användare'

      const existing = await prisma.user.findFirst({
        where: { OR: [{ discordId }, { email }] },
      })

      const discordImage = user.image ?? null

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(!existing.discordId && { discordId }),
            ...(discordImage && { avatar: discordImage }),
          },
        })
        user.id = existing.id
        ;(user as { role?: string }).role = existing.role
        ;(user as { themePreference?: string }).themePreference =
          existing.themePreference === 'DARK' ? 'dark' : 'light'
        user.image = discordImage ?? resolveAvatarUrl(existing.avatar) ?? undefined
        return true
      }

      // Ny Discord-användare — skapa konto automatiskt
      const created = await prisma.user.create({
        data: { discordId, email, name, avatar: discordImage },
      })
      user.id = created.id
      ;(user as { role?: string }).role = created.role
      ;(user as { themePreference?: string }).themePreference = 'light'
      return true
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.picture = (user as { image?: string | null }).image ?? undefined
        token.themePreference =
          (user as { themePreference?: 'light' | 'dark' }).themePreference ?? 'light'
      }
      if (trigger === 'update' && session?.themePreference) {
        token.themePreference = session.themePreference as 'light' | 'dark'
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.image =
          (token.picture as string | undefined) ?? undefined
        session.user.themePreference =
          (token.themePreference as 'light' | 'dark' | undefined) ?? 'light'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
