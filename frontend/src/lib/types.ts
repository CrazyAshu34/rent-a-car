export type Category = 'economy' | 'sedan' | 'suv' | 'luxury' | 'van' | 'electric'
export type Transmission = 'manual' | 'automatic'
export type Fuel = 'petrol' | 'diesel' | 'electric' | 'hybrid'

export interface Car {
  id: number
  slug: string
  make: string
  model: string
  year: number
  category: Category
  transmission: Transmission
  fuel: Fuel
  seats: number
  bags: number
  /** minor currency units (paise) */
  pricePerDay: number
  imageUrl: string
  description: string
  features: string[]
  locationId: number
  locationName: string
  city: string
  active: boolean
}

export interface CarDetail extends Car {
  bookedRanges: [string, string][]
}

export interface Location {
  id: number
  name: string
  city: string
  address: string
}

export interface User {
  id: number
  name: string
  email: string
  phone: string
  role: 'customer' | 'admin'
}

export interface Booking {
  id: number
  carId: number
  carName: string
  carSlug: string
  carImageUrl: string
  locationName: string
  city: string
  startDate: string
  endDate: string
  days: number
  totalPrice: number
  status: 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
  userName?: string
  userEmail?: string
}

export interface CarFilters {
  q?: string
  category?: string
  transmission?: string
  fuel?: string
  seats?: string
  maxPrice?: string
  locationId?: string
  start?: string
  end?: string
  sort?: string
}

export type CarInput = Omit<Car, 'id' | 'slug' | 'locationName' | 'city'>
