import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { PageLoader } from './ui'

const YEAR = new Date().getFullYear()

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <img src="/favicon.svg" alt="" className="size-8" />
      Driveo
    </Link>
  )
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:text-ink-900'}`

function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const links = (
    <>
      <NavLink to="/cars" className={navLink} onClick={close}>
        Fleet
      </NavLink>
      {user && (
        <NavLink to="/bookings" className={navLink} onClick={close}>
          My bookings
        </NavLink>
      )}
      {user?.role === 'admin' && (
        <NavLink to="/admin" className={navLink} onClick={close}>
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">{links}</nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-ink-600">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={logout} className="btn-ghost py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost py-2">
                Log in
              </Link>
              <Link to="/register" className="btn-dark py-2">
                Sign up
              </Link>
            </>
          )}
        </div>
        <button
          className="grid size-10 cursor-pointer place-items-center rounded-lg border border-ink-200 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t border-ink-100 bg-white p-4 md:hidden">
          {links}
          <div className="mt-2 flex gap-2">
            {user ? (
              <button
                onClick={() => {
                  logout()
                  close()
                }}
                className="btn-ghost flex-1"
              >
                Log out
              </button>
            ) : (
              <>
                <Link to="/login" onClick={close} className="btn-ghost flex-1">
                  Log in
                </Link>
                <Link to="/register" onClick={close} className="btn-dark flex-1">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-24 bg-ink-900 text-ink-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-extrabold text-white">Driveo</p>
          <p className="mt-2 max-w-sm text-sm">
            Clean cars, honest prices, zero counter queues. Book in minutes and pick up at the airport.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Explore</p>
          <ul className="space-y-2">
            <li><Link to="/cars" className="hover:text-white">Our fleet</Link></li>
            <li><Link to="/bookings" className="hover:text-white">My bookings</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Locations</p>
          <p>Delhi · Mumbai · Bengaluru · Goa</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-400">
        © {YEAR} Driveo. All rights reserved.
      </div>
    </footer>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Gate for pages that need a signed-in (optionally admin) user. */
export function RequireAuth({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
