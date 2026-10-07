import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ErrorNotice, Field, PageLoader, Spinner, StatusBadge } from '../components/ui'
import { cap, formatDate, formatPrice, toMinor } from '../lib/format'
import type { Car, CarInput } from '../lib/types'

type Tab = 'bookings' | 'cars'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('bookings')
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
      <div className="mt-6 inline-flex rounded-xl bg-ink-100 p-1" role="tablist">
        {(['bookings', 'cars'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === t ? 'bg-white shadow-sm' : 'text-ink-600'}`}
          >
            {cap(t)}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === 'bookings' ? <BookingsTable /> : <CarsManager />}</div>
    </div>
  )
}

function BookingsTable() {
  const qc = useQueryClient()
  const { data, isPending, error } = useQuery({ queryKey: ['bookings', 'all'], queryFn: api.admin.bookings })
  const cancel = useMutation({
    mutationFn: api.cancelBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })

  if (isPending) return <PageLoader />
  if (error) return <ErrorNotice message={error.message} />

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-ink-100 text-xs tracking-wide text-ink-500 uppercase">
          <tr>
            {['#', 'Customer', 'Car', 'Dates', 'Total', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {data.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3 text-ink-500">{b.id}</td>
              <td className="px-4 py-3">
                <p className="font-semibold">{b.userName}</p>
                <p className="text-xs text-ink-500">{b.userEmail}</p>
              </td>
              <td className="px-4 py-3">{b.carName}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.startDate)} → {formatDate(b.endDate)}</td>
              <td className="px-4 py-3 font-semibold">{formatPrice(b.totalPrice)}</td>
              <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              <td className="px-4 py-3 text-right">
                {b.status === 'confirmed' && (
                  <button
                    className="cursor-pointer font-semibold text-red-700 hover:underline"
                    onClick={() => confirm(`Cancel booking #${b.id}?`) && cancel.mutate(b.id)}
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-500">No bookings yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const blank = (locationId: number): CarInput => ({
  make: '', model: '', year: new Date().getFullYear(), category: 'economy', transmission: 'manual',
  fuel: 'petrol', seats: 5, bags: 2, pricePerDay: 0, imageUrl: '', description: '', features: [],
  locationId, active: true,
})

function CarsManager() {
  const qc = useQueryClient()
  const { data: cars, isPending, error } = useQuery({ queryKey: ['admin', 'cars'], queryFn: api.admin.cars })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: api.locations, staleTime: Infinity })
  const [editing, setEditing] = useState<{ id: number | null; value: CarInput } | null>(null)

  const save = useMutation({
    mutationFn: ({ id, value }: { id: number | null; value: CarInput }) =>
      id ? api.admin.updateCar(id, value) : api.admin.createCar(value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cars'] })
      qc.invalidateQueries({ queryKey: ['cars'] })
      setEditing(null)
    },
  })

  if (isPending) return <PageLoader />
  if (error) return <ErrorNotice message={error.message} />

  const edit = (c: Car) => setEditing({ id: c.id, value: { ...c } })

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" disabled={!locations?.length} onClick={() => setEditing({ id: null, value: blank(locations![0].id) })}>
          + Add car
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs tracking-wide text-ink-500 uppercase">
            <tr>{['Car', 'Category', 'Location', 'Price / day', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {cars.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{c.make} {c.model} <span className="font-normal text-ink-500">{c.year}</span></td>
                <td className="px-4 py-3">{cap(c.category)}</td>
                <td className="px-4 py-3">{c.city}</td>
                <td className="px-4 py-3">{formatPrice(c.pricePerDay)}</td>
                <td className="px-4 py-3">{c.active ? 'Active' : <span className="text-ink-400">Hidden</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button className="cursor-pointer font-semibold text-brand-600 hover:underline" onClick={() => edit(c)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CarForm
          key={editing.id ?? 'new'}
          initial={editing.value}
          isNew={editing.id === null}
          locations={locations ?? []}
          busy={save.isPending}
          error={save.error?.message}
          onCancel={() => { save.reset(); setEditing(null) }}
          onSubmit={(value) => save.mutate({ id: editing.id, value })}
        />
      )}
    </>
  )
}

function CarForm({
  initial, isNew, locations, busy, error, onSubmit, onCancel,
}: {
  initial: CarInput; isNew: boolean; locations: { id: number; city: string; name: string }[]
  busy: boolean; error?: string; onSubmit: (v: CarInput) => void; onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  // price is edited in major units (₹) and stored in minor units (paise)
  const [price, setPrice] = useState(String(initial.pricePerDay / 100 || ''))
  const [features, setFeatures] = useState(initial.features.join(', '))
  const set = <K extends keyof CarInput>(k: K, val: CarInput[K]) => setV((p) => ({ ...p, [k]: val }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...v,
      pricePerDay: toMinor(Number(price)),
      features: features.split(',').map((s) => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-900/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card w-full max-w-2xl space-y-4 p-6">
        <h2 className="text-xl font-extrabold">{isNew ? 'Add car' : 'Edit car'}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Make"><input className="input" required value={v.make} onChange={(e) => set('make', e.target.value)} /></Field>
          <Field label="Model"><input className="input" required value={v.model} onChange={(e) => set('model', e.target.value)} /></Field>
          <Field label="Year"><input className="input" type="number" required min={1990} value={v.year} onChange={(e) => set('year', +e.target.value)} /></Field>
          <Field label="Category">
            <select className="input" value={v.category} onChange={(e) => set('category', e.target.value as CarInput['category'])}>
              {['economy', 'sedan', 'suv', 'luxury', 'van', 'electric'].map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select>
          </Field>
          <Field label="Transmission">
            <select className="input" value={v.transmission} onChange={(e) => set('transmission', e.target.value as CarInput['transmission'])}>
              <option value="manual">Manual</option><option value="automatic">Automatic</option>
            </select>
          </Field>
          <Field label="Fuel">
            <select className="input" value={v.fuel} onChange={(e) => set('fuel', e.target.value as CarInput['fuel'])}>
              {['petrol', 'diesel', 'electric', 'hybrid'].map((f) => <option key={f} value={f}>{cap(f)}</option>)}
            </select>
          </Field>
          <Field label="Seats"><input className="input" type="number" min={1} max={20} required value={v.seats} onChange={(e) => set('seats', +e.target.value)} /></Field>
          <Field label="Bags"><input className="input" type="number" min={0} max={20} required value={v.bags} onChange={(e) => set('bags', +e.target.value)} /></Field>
          <Field label="Price / day (₹)"><input className="input" type="number" min={1} step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Location">
            <select className="input" value={v.locationId} onChange={(e) => set('locationId', +e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.city} — {l.name}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Image URL (https)"><input className="input" type="url" pattern="https://.*" value={v.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></Field>
          </div>
        </div>
        <Field label="Description"><textarea className="input min-h-20" value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Features" hint="Comma separated"><input className="input" value={features} onChange={(e) => setFeatures(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-brand-500" checked={v.active} onChange={(e) => set('active', e.target.checked)} />
          Visible to customers
        </label>
        {error && <ErrorNotice message={error} />}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />} Save</button>
        </div>
      </form>
    </div>
  )
}
