export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  const v = avatar?.trim()
  return v || null
}
