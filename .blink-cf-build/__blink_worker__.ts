
import __USER_APP__ from './index.ts'

export default {
  async fetch(request: Request, env: Record<string, string>, ctx: ExecutionContext): Promise<Response> {
    if (!globalThis.__blink_env_init__) {
      const _env = env
      globalThis.Deno = {
        env: {
          get: (k: string) => _env[k] ?? null,
          toObject: () => ({ ..._env }),
        },
        serve: () => {},
      }
      globalThis.__blink_env_init__ = true
    }

    const __start = Date.now()
    const __url = new URL(request.url)
    let __response: Response
    let __error: string | undefined
    const __reqClone = request.clone()

    try {
      __response = await __USER_APP__.fetch(request, env, ctx)
    } catch (__err) {
      __error = __err instanceof Error ? __err.message : String(__err)
      __response = new Response(JSON.stringify({ error: __error }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    const __resClone = __response.clone()

    // Resolve function_slug from route map (path segment → slug) for per-route attribution
    const __routeMap: Record<string, string> = JSON.parse(env.BLINK_ROUTE_MAP || '{}')
    const __parts = __url.pathname.split('/').filter(Boolean)
    const __seg = __parts[0] === 'api' ? __parts[1] : __parts[0]
    const __slug = (__seg && __routeMap[__seg]) || env.BLINK_ENTRY_SLUG || 'index'

    const __logUrl = `${env.BLINK_APP_URL || 'https://core.blink.new'}/api/analytics/fn-log`
    ctx.waitUntil((async () => {
      const __REDACT_KEYS = ['authorization','cookie','set-cookie','x-api-key','x-secret-key','blink-secret-key']
      const __redactHeaders = (h: Headers) => {
        const obj: Record<string, string> = {}
        h.forEach((v, k) => { obj[k] = __REDACT_KEYS.includes(k.toLowerCase()) ? '[REDACTED]' : v })
        return obj
      }

      const __resContentType = __response.headers.get('content-type') || ''
      const __isStreaming = __response.headers.get('transfer-encoding') === 'chunked' || __resContentType.includes('text/event-stream')
      const __isTextual = __resContentType.startsWith('text/') || __resContentType.includes('application/json') || __resContentType.includes('application/xml') || __resContentType === ''

      const __reqBody = await __reqClone.text().catch(() => null)
      const __resBody = __isStreaming ? '[streaming]' : !__isTextual ? '[binary]' : await __resClone.text().catch(() => null)

      await fetch(__logUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${env.RUNTIME_SECRET || ''}`,
        },
        body: JSON.stringify({
          project_id: env.BLINK_PROJECT_ID || '',
          function_slug: __slug,
          method: request.method,
          path: __url.pathname,
          status_code: __response.status,
          latency_ms: Date.now() - __start,
          error: __error || null,
          timestamp: new Date().toISOString(),
          request_headers: JSON.stringify(__redactHeaders(request.headers)).slice(0, 4096),
          request_body: (__reqBody || '').slice(0, 4096),
          response_headers: JSON.stringify(__redactHeaders(__response.headers)).slice(0, 4096),
          response_body: (__resBody || '').slice(0, 4096),
        }),
      }).catch(() => {})
    })())

    return __response
  },
} satisfies ExportedHandler<Record<string, string>>
