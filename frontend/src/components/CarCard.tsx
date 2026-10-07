import { Link } from 'react-router'
import { cap, formatPrice } from '../lib/format'
import type { Car } from '../lib/types'

export function CarImage({ car, className = '' }: { car: Pick<Car, 'imageUrl' | 'make' | 'model' | 'category'>; className?: string }) {
  if (car.imageUrl) {
    return (
      <img
        src={car.imageUrl}
        alt={`${car.make} ${car.model}`}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    )
  }
  // Fallback artwork when no photo has been uploaded for the car.
  return (
    <div
      role="img"
      aria-label={`${car.make} ${car.model}`}
      className={`grid place-items-center bg-linear-to-br from-ink-100 via-ink-50 to-brand-100 ${className}`}
    >
      <svg viewBox="0 0 120 56" className="w-2/5 text-ink-800/80" fill="currentColor" aria-hidden>
        <path d="M8 38l6-17a8 8 0 0 1 7.5-5.3h57A8 8 0 0 1 86 21l6 17h11a4 4 0 0 1 4 4v6a2 2 0 0 1-2 2h-8a8 8 0 0 1-16 0H43a8 8 0 0 1-16 0H14a2 2 0 0 1-2-2v-6a4 4 0 0 1 4-4h-8Zm17-12-3.7 10h77.4L95 26H25Z" opacity=".9" />
        <circle cx="35" cy="48" r="5.5" fill="#fff" />
        <circle cx="87" cy="48" r="5.5" fill="#fff" />
      </svg>
    </div>
  )
}

const Spec = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-lg bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600">{children}</span>
)

export function CarCard({ car, query = '' }: { car: Car; query?: string }) {
  return (
    <Link
      to={`/cars/${car.slug}${query}`}
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative">
        <CarImage car={car} className="aspect-16/10 w-full transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-800 backdrop-blur">
          {cap(car.category)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            {car.make} {car.model}
          </h3>
          <p className="text-sm text-ink-500">
            {car.year} · {car.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Spec>{car.seats} seats</Spec>
          <Spec>{cap(car.transmission)}</Spec>
          <Spec>{cap(car.fuel)}</Spec>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <p>
            <span className="text-xl font-extrabold">{formatPrice(car.pricePerDay)}</span>
            <span className="text-sm text-ink-500"> / day</span>
          </p>
          <span className="text-sm font-semibold text-brand-600 transition group-hover:translate-x-0.5">View →</span>
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="aspect-16/10 animate-pulse bg-ink-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
        <div className="h-8 w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  )
}
