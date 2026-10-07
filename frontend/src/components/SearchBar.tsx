import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { addDaysISO, todayISO } from '../lib/format'
import { Field } from './ui'

export function SearchBar() {
  const navigate = useNavigate()
  const today = todayISO()
  const [locationId, setLocationId] = useState('')
  const [start, setStart] = useState(addDaysISO(today, 1))
  const [end, setEnd] = useState(addDaysISO(today, 4))
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: api.locations, staleTime: Infinity })

  const onStart = (v: string) => {
    setStart(v)
    if (v >= end) setEnd(addDaysISO(v, 1))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams({ start, end })
    if (locationId) p.set('locationId', locationId)
    navigate(`/cars?${p}`)
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-4 sm:p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
      <Field label="Pickup location">
        <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Any location</option>
          {locations?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.city} — {l.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Pickup date">
        <input type="date" className="input" min={today} value={start} onChange={(e) => onStart(e.target.value)} required />
      </Field>
      <Field label="Return date">
        <input type="date" className="input" min={addDaysISO(start, 1)} value={end} onChange={(e) => setEnd(e.target.value)} required />
      </Field>
      <button type="submit" className="btn-primary h-[42px] px-7">
        Search cars
      </button>
    </form>
  )
}
