const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')
const TIMEOUT_MS = 15000

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Query = Record<string, string | number | undefined | null>

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BASE_URL}/${path.replace(/^\//, '')}`, window.location.origin)
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
  opts: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => controller.abort())
  try {
    const res = await fetch(buildUrl(path, opts.query), {
      method,
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
    if (res.status === 204) return undefined as T
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(errorMessage(body, res.status), res.status)
    return body as T
  } catch (e) {
    if (e instanceof ApiError || opts.signal?.aborted) throw e
    throw toApiError(e)
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, { body }),
  delete: (path: string) => request<void>('DELETE', path),
  /** Все элементы пагинированного списка DRF. */
  list: async <T>(path: string, query?: Query, signal?: AbortSignal): Promise<T[]> => {
    const results: T[] = []
    let pageNumber = 1
    let next: string | null
    do {
      const page = await request<{ results: T[]; next: string | null }>('GET', path, {
        query: { ...query, page_size: 1000, page: pageNumber++ },
        signal,
      })
      results.push(...page.results)
      next = page.next
    } while (next)
    return results
  },
}

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
