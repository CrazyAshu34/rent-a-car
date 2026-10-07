import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { CarCard, CarCardSkeleton } from '../components/CarCard'
import { EmptyState, ErrorNotice } from '../components/ui'
import { cap, formatDate, toMinor } from '../lib/format'
import type { CarFilters } from '../lib/types'

const CATEGORIES = ['economy', 'sedan', 'suv', 'luxury', 'van', 'electric']
const PRICE_CAPS = [2500, 4000, 6000, 10000, 20000]

export default function Fleet() {
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  // Debounce the free-text search so we don't fire a request per keystroke.
  const [q, setQ] = useState(get('q'))
  useEffect(() => {
    const t = setTimeout(() => q !== get('q') && set({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const filters: CarFilters = {
    q: get('q'),
    category: get('category'),
    transmission: get('transmission'),
    fuel: get('fuel'),
    seats: get('seats'),
    maxPrice: get('maxPrice'),
    locationId: get('locationId'),
    start: get('start'),
    end: get('end'),
    sort: get('sort'),
  }

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: api.locations, staleTime: Infinity })
  const { data: cars, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ['cars', filters],
    queryFn: () => api.cars(filters),
    placeholderData: keepPreviousData,
  })

  const hasDates = filters.start && filters.end
  const carQuery = hasDates ? `?start=${filters.start}&end=${filters.end}` : ''
  const activeCount = ['q', 'category', 'transmission', 'fuel', 'seats', 'maxPrice', 'locationId'].filter(get).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Our fleet</h1>
      {hasDates && (
        <p className="mt-1 text-ink-500">
          Available {formatDate(filters.start!)} → {formatDate(filters.end!)}{' '}
          <button onClick={() => set({ start: '', end: '' })} className="cursor-pointer font-semibold text-brand-600 hover:underline">
            Clear dates
          </button>
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside className="card h-fit space-y-5 p-5 lg:sticky lg:top-24">
          <div>
            <label className="label" htmlFor="q">Search</label>
            <input id="q" className="input" placeholder="Make or model" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select label="Location" value={get('locationId')} onChange={(v) => set({ locationId: v })}>
            <option value="">All locations</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.city} — {l.name}</option>
            ))}
          </Select>
          <Select label="Category" value={get('category')} onChange={(v) => set({ category: v })}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
          </Select>
          <Select label="Transmission" value={get('transmission')} onChange={(v) => set({ transmission: v })}>
            <option value="">Any</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </Select>
          <Select label="Fuel" value={get('fuel')} onChange={(v) => set({ fuel: v })}>
            <option value="">Any</option>
            {['petrol', 'diesel', 'electric', 'hybrid'].map((f) => <option key={f} value={f}>{cap(f)}</option>)}
          </Select>
          <Select label="Seats" value={get('seats')} onChange={(v) => set({ seats: v })}>
            <option value="">Any</option>
            {[4, 5, 7].map((n) => <option key={n} value={n}>{n}+ seats</option>)}
          </Select>
          <Select label="Max price / day" value={get('maxPrice')} onChange={(v) => set({ maxPrice: v })}>
            <option value="">No limit</option>
            {PRICE_CAPS.map((p) => (
              <option key={p} value={toMinor(p)}>Up to ₹{p.toLocaleString('en-IN')}</option>
            ))}
          </Select>
          {activeCount > 0 && (
            <button
              className="btn-ghost w-full"
              onClick={() => {
                setQ('')
                set({ q: '', category: '', transmission: '', fuel: '', seats: '', maxPrice: '', locationId: '' })
              }}
            >
              Reset filters ({activeCount})
            </button>
          )}
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{cars ? `${cars.length} car${cars.length === 1 ? '' : 's'}` : ' '}</p>
            <select
              aria-label="Sort"
              className="input w-auto"
              value={get('sort')}
              onChange={(e) => set({ sort: e.target.value })}
            >
              <option value="">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {error ? (
            <ErrorNotice message={error.message} onRetry={() => refetch()} />
          ) : isPending ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CarCardSkeleton key={i} />)}
            </div>
          ) : cars.length === 0 ? (
            <EmptyState title="No cars match" body="Try widening your filters or choosing different dates." />
          ) : (
            <div className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
              {cars.map((c) => <CarCard key={c.id} car={c} query={carQuery} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Select({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  )
}
