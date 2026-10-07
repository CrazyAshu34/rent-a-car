import { Link, useLocation } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { CarImage } from '../components/CarCard'
import { EmptyState, ErrorNotice, PageLoader, StatusBadge } from '../components/ui'
import { formatDate, formatPrice, todayISO } from '../lib/format'

export default function MyBookings() {
  const justBooked = (useLocation().state as { justBooked?: boolean } | null)?.justBooked
  const qc = useQueryClient()
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['bookings', 'mine'], queryFn: api.myBookings })

  const cancel = useMutation({
    mutationFn: (id: number) => api.cancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const today = todayISO()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">My bookings</h1>

      {justBooked && (
        <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          🎉 Booking confirmed! Show your name at the pickup desk.
        </div>
      )}
      {cancel.error && <div className="mt-6"><ErrorNotice message={cancel.error.message} /></div>}

      <div className="mt-8 space-y-4">
        {isPending ? (
          <PageLoader />
        ) : error ? (
          <ErrorNotice message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            body="When you reserve a car it will show up here."
            action={<Link to="/cars" className="btn-primary">Browse cars</Link>}
          />
        ) : (
          data.map((b) => (
            <article key={b.id} className="card flex flex-col overflow-hidden sm:flex-row">
              <CarImage
                car={{ imageUrl: b.carImageUrl, make: b.carName, model: '', category: 'economy' }}
                className="h-40 w-full sm:h-auto sm:w-56"
              />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/cars/${b.carSlug}`} className="text-lg font-bold hover:text-brand-600">{b.carName}</Link>
                    <p className="text-sm text-ink-500">{b.locationName}, {b.city}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm text-ink-700">
                  {formatDate(b.startDate)} → {formatDate(b.endDate)} · {b.days} day{b.days > 1 ? 's' : ''}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <p className="text-lg font-extrabold">{formatPrice(b.totalPrice)}</p>
                  {b.status === 'confirmed' && b.startDate >= today && (
                    <button
                      className="btn-ghost py-2 text-red-700 hover:border-red-200 hover:bg-red-50"
                      disabled={cancel.isPending && cancel.variables === b.id}
                      onClick={() => confirm('Cancel this booking?') && cancel.mutate(b.id)}
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
