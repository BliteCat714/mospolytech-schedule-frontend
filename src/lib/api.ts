import { isMockMode } from './dataSource'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/schedule').replace(/\/$/, '')
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

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (isMockMode) {
    const { mockRequest } = await import('../mocks/api')
    opts.signal?.throwIfAborted()
    return mockRequest<T>(method, path, opts)
  }
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
    if (e instanceof ApiError) throw e
    if (opts.signal?.aborted) throw e
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError('Сервер не ответил вовремя. Попробуйте ещё раз.', 0)
    }
    throw new ApiError('Нет связи с сервером. Проверьте подключение.', 0)
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
