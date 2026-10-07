import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { Layout, RequireAuth } from './components/Layout'
import { PageLoader } from './components/ui'
import { ApiError } from './lib/api'
import Home from './pages/Home'
import { Login, Register } from './pages/AuthPages'

const Fleet = lazy(() => import('./pages/Fleet'))
const CarDetail = lazy(() => import('./pages/CarDetail'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const Admin = lazy(() => import('./pages/Admin'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (4xx); they won't fix themselves.
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
})

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-500">404</p>
      <p className="mt-3 text-ink-500">That page took a wrong turn.</p>
      <Link to="/" className="btn-primary mt-6">Back home</Link>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="cars" element={<Fleet />} />
                <Route path="cars/:slug" element={<CarDetail />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route element={<RequireAuth />}>
                  <Route path="bookings" element={<MyBookings />} />
                </Route>
                <Route element={<RequireAuth admin />}>
                  <Route path="admin" element={<Admin />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
