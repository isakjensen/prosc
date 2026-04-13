import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { resolveAvatarUrl } from '@/lib/avatar'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-post', type: 'email' },
        password: { label: 'Lösenord', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: resolveAvatarUrl(user.avatar),
          themePreference:
            user.themePreference === 'DARK' ? ('dark' as const) : ('light' as const),
        }
      },
    }),
  ],
  callbacks: {
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
          (token.picture as string | undefined) ?? resolveAvatarUrl(null)
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
