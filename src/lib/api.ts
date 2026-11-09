const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')
const TIMEOUT_MS = 15000
let adminAuthorization: string | null = null

export function setAdminCredentials(username: string, password: string): void {
  const target = new URL(BASE_URL, window.location.origin)
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    throw new Error('Для входа администратора требуется HTTPS.')
  }
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  adminAuthorization = `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`
}
export function clearAdminCredentials(): void { adminAuthorization = null }


export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type Query = Record<string, string | number | undefined | null>

export interface RequestOptions {
  headers?: Record<string, string>
  timeoutMs?: number
}

function buildUrl(path: string, query?: Query, baseUrl = BASE_URL): string {
  const url = new URL(`${baseUrl}/${path.replace(/^\//, '')}`, window.location.origin)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url.toString()
}

/** Достаёт читаемое сообщение из тела ошибки DRF ({detail}, {field: [..]}, список). */
function errorMessage(body: unknown, status: number): string {
  const flatten = (v: unknown): string[] => {
    if (typeof v === 'string') return [v]
    if (Array.isArray(v)) return v.flatMap(flatten)
    if (v && typeof v === 'object') return Object.values(v).flatMap(flatten)
    return []
  }
  const text = flatten(body).join(' ')
  return text || `Ошибка сервера (${status})`
}

/** Превращает ошибку сети/таймаута в ApiError с читаемым сообщением. */
function toApiError(e: unknown): ApiError {
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ApiError('Сервер не ответил вовремя. Попробуйте ещё раз.', 0)
  }
  return new ApiError('Нет связи с сервером. Проверьте подключение.', 0)
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions & { query?: Query; body?: unknown; signal?: AbortSignal; baseUrl?: string } = {},
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => controller.abort())
  try {
    const res = await fetch(buildUrl(path, opts.query, opts.baseUrl), {
      method,
      headers: { ...(adminAuthorization ? { Authorization: adminAuthorization } : {}), ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
    if (res.status === 204) return undefined as T
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(errorMessage(body, res.status), res.status, body)
    return body as T
  } catch (e) {
    if (e instanceof ApiError || opts.signal?.aborted) throw e
    throw toApiError(e)
  } finally {
    clearTimeout(timer)
  }
}

export function createApi(baseUrl = BASE_URL) {
  return {
    get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
      request<T>('GET', path, { query, signal, baseUrl }),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>('POST', path, { ...options, body, baseUrl }),
    patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>('PATCH', path, { ...options, body, baseUrl }),
    delete: (path: string) => request<void>('DELETE', path, { baseUrl }),
    /** Все элементы пагинированного списка DRF. */
    list: async <T>(path: string, query?: Query, signal?: AbortSignal): Promise<T[]> => {
      const results: T[] = []
      let pageNumber = 1
      let next: string | null
      do {
        const page = await request<{ results: T[]; next: string | null }>('GET', path, {
          query: { ...query, page_size: 1000, page: pageNumber++ },
          signal, baseUrl,
        })
        results.push(...page.results)
        next = page.next
      } while (next)
      return results
    },
  }
}

export const api = createApi()
export const dpoApi = createApi(import.meta.env.DEV ? '/__dpo-api' : BASE_URL)

export function errText(e: unknown): string {
  return e instanceof Error ? e.message : 'Неизвестная ошибка'
}

/** Скачивает файл с API (например, календарь .ics) в загрузки браузера. */
export async function downloadFile(path: string, query: Query, filename: string): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(buildUrl(path, query), { signal: controller.signal })
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null)
      throw new ApiError(errorMessage(body, res.status), res.status)
    }
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw toApiError(e)
  } finally {
    clearTimeout(timer)
  }
}
