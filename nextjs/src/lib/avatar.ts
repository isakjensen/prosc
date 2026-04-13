/** Public path to the default profile / branding image */
export const DEFAULT_AVATAR_URL = "/icons/devil.png"

export function resolveAvatarUrl(avatar: string | null | undefined): string {
  const v = avatar?.trim()
  return v ? v : DEFAULT_AVATAR_URL
}
