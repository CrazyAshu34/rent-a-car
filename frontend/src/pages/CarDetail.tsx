import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { CarImage } from '../components/CarCard'
import { ErrorNotice, Field, PageLoader, Spinner } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { addDaysISO, cap, diffDays, formatDate, formatPrice, todayISO } from '../lib/format'
import type { CarDetail as CarDetailT } from '../lib/types'

export default function CarDetail() {
  const { slug = '' } = useParams()
  const { data: car, isPending, error, refetch } = useQuery({
    queryKey: ['car', slug],
    queryFn: () => api.car(slug),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  })

  if (isPending) return <PageLoader />
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        {notFound ? (
          <>
            <h1 className="text-2xl font-extrabold">Car not found</h1>
            <p className="mt-2 text-ink-500">It may have been removed from the fleet.</p>
            <Link to="/cars" className="btn-primary mt-6">Back to fleet</Link>
          </>
        ) : (
          <ErrorNotice message={error.message} onRetry={() => refetch()} />
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/cars" className="text-sm font-semibold text-ink-500 hover:text-ink-900">← All cars</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div>
          <CarImage car={car} className="aspect-16/10 w-full overflow-hidden rounded-3xl" />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{car.make} {car.model}</h1>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{cap(car.category)}</span>
          </div>
          <p className="mt-1 text-ink-500">{car.year} · Pickup at {car.locationName}, {car.city}</p>
          <p className="mt-5 max-w-2xl text-ink-700">{car.description}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Seats', car.seats],
              ['Bags', car.bags],
              ['Gearbox', cap(car.transmission)],
              ['Fuel', cap(car.fuel)],
            ].map(([k, v]) => (
              <div key={k} className="card p-4">
                <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{k}</dt>
                <dd className="mt-1 text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          {car.features.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold">Features</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {car.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-medium">
                    <svg className="size-5 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <BookingPanel car={car} />
      </div>
    </div>
  )
}

function BookingPanel({ car }: { car: CarDetailT }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [sp] = useSearchParams()

  const today = todayISO()
  const [start, setStart] = useState(sp.get('start') || addDaysISO(today, 1))
  const [end, setEnd] = useState(sp.get('end') || addDaysISO(today, 4))

  const days = diffDays(start, end)
  const overlaps = car.bookedRanges.some(([s, e]) => s < end && e > start)
  const validRange = days >= 1 && days <= 30 && start >= today
  const total = days * car.pricePerDay

  const book = useMutation({
    mutationFn: () => api.createBooking({ carId: car.id, startDate: start, endDate: end }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['car', car.slug] })
      navigate('/bookings', { state: { justBooked: true } })
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'car_unavailable') qc.invalidateQueries({ queryKey: ['car', car.slug] })
    },
  })

  const onStart = (v: string) => {
    setStart(v)
    if (v >= end) setEnd(addDaysISO(v, 1))
  }

  const submit = () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    book.mutate()
  }

  return (
    <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
      <p>
        <span className="text-3xl font-extrabold">{formatPrice(car.pricePerDay)}</span>
        <span className="text-ink-500"> / day</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pickup">
          <input type="date" className="input" min={today} value={start} onChange={(e) => onStart(e.target.value)} />
        </Field>
        <Field label="Return">
          <input type="date" className="input" min={addDaysISO(start, 1)} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      {car.bookedRanges.length > 0 && (
        <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
          <p className="mb-1 font-semibold text-ink-800">Already booked</p>
          <ul className="space-y-0.5">
            {car.bookedRanges.slice(0, 4).map(([s, e]) => (
              <li key={s + e}>{formatDate(s)} → {formatDate(e)}</li>
            ))}
          </ul>
        </div>
      )}

      {validRange && !overlaps && (
        <dl className="space-y-2 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">{formatPrice(car.pricePerDay)} × {days} day{days > 1 ? 's' : ''}</dt>
            <dd className="font-semibold">{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-extrabold">{formatPrice(total)}</dd>
          </div>
        </dl>
      )}

      {overlaps && <ErrorNotice message="This car is booked for part of those dates. Try different dates." />}
      {!validRange && <p className="text-sm text-ink-500">Choose a return date 1–30 days after pickup.</p>}
      {book.error && <ErrorNotice message={book.error.message} />}

      <button className="btn-primary w-full py-3" disabled={!validRange || overlaps || book.isPending} onClick={submit}>
        {book.isPending && <Spinner className="size-4" />}
        {user ? 'Reserve now' : 'Log in to reserve'}
      </button>
      <p className="text-center text-xs text-ink-500">Free cancellation before pickup · Pay at the counter</p>
    </aside>
  )
}
