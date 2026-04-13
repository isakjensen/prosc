import 'next-auth'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: string
      themePreference: 'light' | 'dark'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    themePreference?: 'light' | 'dark'
  }
}
