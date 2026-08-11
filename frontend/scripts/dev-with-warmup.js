const { spawn } = require('node:child_process')
const http = require('node:http')
const https = require('node:https')

const port = process.env.PORT || '3000'
const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://127.0.0.1:${port}`
const warmupRoutes = ['/', '/chat', '/settings', '/admin/users', '/admin/models', '/admin/usage-logs']
const maxAttempts = 60
const retryDelayMs = 1000

const nextProcess = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: process.env,
})

let shuttingDown = false
let resolvedBaseUrl = configuredBaseUrl

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function updateResolvedBaseUrlFromOutput(chunk) {
  const output = chunk.toString()
  const localUrlMatch = output.match(/- Local:\s+(https?:\/\/[^\s]+)/)
  if (localUrlMatch?.[1]) {
    resolvedBaseUrl = normalizeBaseUrl(localUrlMatch[1])
    return
  }

  const portFallbackMatch = output.match(/using available port (\d+) instead/i)
  if (portFallbackMatch?.[1]) {
    const fallbackUrl = new URL(configuredBaseUrl)
    fallbackUrl.port = portFallbackMatch[1]
    resolvedBaseUrl = normalizeBaseUrl(fallbackUrl.toString())
  }
}

nextProcess.stdout?.on('data', updateResolvedBaseUrlFromOutput)
nextProcess.stderr?.on('data', updateResolvedBaseUrlFromOutput)

function requestUrl(url) {
  const client = url.startsWith('https:') ? https : http

  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      {
        headers: {
          'x-dev-warmup': '1',
        },
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      },
    )

    req.on('error', reject)
  })
}

async function waitForServer() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (shuttingDown) {
      return false
    }

    try {
      await requestUrl(`${resolvedBaseUrl}/`)
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  return false
}

async function warmRoutes() {
  const ready = await waitForServer()

  if (!ready || shuttingDown) {
    return
  }

  console.log(`\n[dev-warmup] Warming ${warmupRoutes.length} routes...`)

  for (const route of warmupRoutes) {
    if (shuttingDown) {
      return
    }

    try {
      const status = await requestUrl(`${resolvedBaseUrl}${route}`)
      console.log(`[dev-warmup] ${route} -> ${status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[dev-warmup] Failed to warm ${route}: ${message}`)
    }
  }

  console.log('[dev-warmup] Warmup complete.')
}

function shutdown(signal) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  if (!nextProcess.killed) {
    nextProcess.kill(signal)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

nextProcess.on('exit', (code, signal) => {
  shuttingDown = true
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

void warmRoutes()