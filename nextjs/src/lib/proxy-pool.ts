type ProxyConfig = { server: string; username: string; password: string }

export function getRandomProxy(): ProxyConfig | undefined {
  const server = process.env.PROXY_SERVER?.trim()
  const username = process.env.PROXY_USERNAME?.trim()
  const password = process.env.PROXY_PASSWORD?.trim()
  if (!server || !username || !password) return undefined
  return { server, username, password }
}

export function clearProxyCache() {
  // no-op — rotating proxy has no cache
}
