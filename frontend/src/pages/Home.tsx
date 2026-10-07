import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { CarCard, CarCardSkeleton } from '../components/CarCard'
import { SearchBar } from '../components/SearchBar'
import { ErrorNotice } from '../components/ui'

const steps = [
  { n: '01', title: 'Pick your dates', body: 'Search by city and dates — you only see cars that are actually free.' },
  { n: '02', title: 'Choose a car', body: 'Transparent daily pricing. No hidden fees, no counter upsell.' },
  { n: '03', title: 'Book instantly', body: 'Confirmation in seconds. Walk up to your car at the airport and go.' },
]

const perks = [
  { title: 'Instant confirmation', body: 'No waiting on approvals — your booking is confirmed the moment you reserve.' },
  { title: 'Free cancellation', body: 'Plans changed? Cancel any time before pickup with a single click.' },
  { title: 'Airport pickup', body: 'Cars waiting at major airports in Delhi, Mumbai, Bengaluru and Goa.' },
  { title: 'Well-kept fleet', body: 'Late-model cars, serviced and sanitised between every rental.' },
]

export default function Home() {
  const { data: cars, isPending, error, refetch } = useQuery({
    queryKey: ['cars', 'featured'],
    queryFn: () => api.cars({ sort: 'newest' }),
    select: (all) => all.slice(0, 6),
  })

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink-900 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_80%_-10%,rgb(255_107_44/0.35),transparent),radial-gradient(40rem_24rem_at_0%_100%,rgb(99_102_241/0.25),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-36 sm:px-6 sm:pt-24 sm:pb-44">
          <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-400">
            Now in Delhi · Mumbai · Bengaluru · Goa
          </p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            The right car, <span className="text-brand-500">right when you land.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-300">
            From city hatchbacks to luxury sedans. Compare prices, book in under a minute and skip the counter.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/cars" className="btn-primary px-6 py-3">
              Browse the fleet
            </Link>
            <a href="#how" className="btn border border-white/20 px-6 py-3 text-white hover:bg-white/10">
              How it works
            </a>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-24 max-w-5xl px-4 sm:px-6">
        <SearchBar />
      </div>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Featured cars</h2>
            <p className="mt-1 text-ink-500">Fresh additions to the fleet.</p>
          </div>
          <Link to="/cars" className="text-sm font-semibold text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {error ? (
          <ErrorNotice message={error.message} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isPending
              ? Array.from({ length: 3 }, (_, i) => <CarCardSkeleton key={i} />)
              : cars.map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        )}
      </section>

      <section id="how" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Rent in three steps</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card p-6">
              <span className="text-sm font-extrabold text-brand-500">{s.n}</span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl bg-ink-900 p-8 text-white sm:p-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Why Driveo</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p) => (
              <div key={p.title}>
                <div className="mb-3 h-1 w-8 rounded bg-brand-500" />
                <h3 className="font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-ink-300">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
