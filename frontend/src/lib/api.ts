import type {
  Booking,
  Car,
  CarDetail,
  CarFilters,
  CarInput,
  Location,
  User,
} from './types'

const TOKEN_KEY = 'driveo.token'

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable (private mode) — session just won't persist */
    }
  },
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Called when the server rejects our token so the UI can drop the session.
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'unknown',
      data?.error?.message ?? 'Something went wrong. Please try again.',
    )
  }
  return data as T
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

const qs = (params: object) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', json('POST', { email, password })),
  register: (b: { name: string; email: string; phone: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', json('POST', b)),
  me: () => request<User>('/me'),

  locations: () => request<Location[]>('/locations'),
  cars: (f: CarFilters = {}) => request<Car[]>(`/cars${qs(f)}`),
  car: (slug: string) => request<CarDetail>(`/cars/${encodeURIComponent(slug)}`),

  createBooking: (b: { carId: number; startDate: string; endDate: string }) =>
    request<Booking>('/bookings', json('POST', b)),
  myBookings: () => request<Booking[]>('/bookings'),
  cancelBooking: (id: number) => request<Booking>(`/bookings/${id}/cancel`, json('POST')),

  admin: {
    bookings: () => request<Booking[]>('/admin/bookings'),
    cars: () => request<Car[]>('/admin/cars'),
    createCar: (c: CarInput) => request<Car>('/admin/cars', json('POST', c)),
    updateCar: (id: number, c: CarInput) => request<Car>(`/admin/cars/${id}`, json('PUT', c)),
  },
}
