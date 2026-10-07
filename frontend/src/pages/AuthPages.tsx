import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ErrorNotice, Field, Spinner } from '../components/ui'

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="card w-full p-7 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>
      </div>
    </div>
  )
}

function useRedirectTarget() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return from && from.startsWith('/') ? from : '/'
}

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(target, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      title="Welcome back"
      subtitle="Log in to manage your bookings."
      footer={<>New here? <Link to="/register" state={{ from: target }} className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorNotice message={error} />}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy && <Spinner className="size-4" />} Log in
        </button>
      </form>
    </Shell>
  )
}

export function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={target} replace />

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register(form)
      navigate(target, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      title="Create your account"
      subtitle="Book your first car in under a minute."
      footer={<>Already registered? <Link to="/login" state={{ from: target }} className="font-semibold text-brand-600 hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <input className="input" autoComplete="name" required minLength={2} maxLength={100} {...field('name')} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required {...field('email')} />
        </Field>
        <Field label="Phone (optional)">
          <input className="input" type="tel" autoComplete="tel" maxLength={30} {...field('phone')} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={72} {...field('password')} />
        </Field>
        {error && <ErrorNotice message={error} />}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy && <Spinner className="size-4" />} Create account
        </button>
      </form>
    </Shell>
  )
}
