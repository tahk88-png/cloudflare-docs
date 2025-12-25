'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/catalog/data'
import { ProductGallery } from '@/components/booking/ProductGallery'
import { PriceCard } from '@/components/booking/PriceCard'
import { AvailabilityPicker } from '@/components/booking/AvailabilityPicker'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { ProductTabs } from '@/components/booking/ProductTabs'
import { ProductFAQ } from '@/components/booking/ProductFAQ'
import { BookingSuccess } from '@/components/booking/BookingSuccess'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface ProductPageProps {
  product: Product & { compartmentCount?: number }
}

export function ProductPage({ product }: ProductPageProps) {
  const router = useRouter()
  const [selectedStart, setSelectedStart] = useState<Date | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null)
  const [quote, setQuote] = useState<any>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [booking, setBooking] = useState<any>(null)

  const availability = product.compartmentCount
    ? product.compartmentCount > 1
      ? 'available'
      : 'limited'
    : 'unavailable'

  const handleTimeSelect = async (start: Date, end: Date) => {
    setSelectedStart(start)
    setSelectedEnd(end)
    setIsLoadingQuote(true)

    try {
      const response = await fetch('/api/bookings/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      })

      const data = await response.json()
      setQuote(data)
    } catch (error) {
      console.error('Quote error:', error)
    } finally {
      setIsLoadingQuote(false)
    }
  }

  const handleSubmitBooking = async (userData: {
    email: string
    name: string
    phone: string
  }) => {
    if (!quote || !quote.isAvailable) {
      throw new Error('Valitud aeg pole enam saadaval')
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        compartmentId: quote.compartmentId,
        startAt: selectedStart!.toISOString(),
        endAt: selectedEnd!.toISOString(),
        totalPrice: quote.totalPrice,
        userEmail: userData.email,
        userName: userData.name,
        userPhone: userData.phone,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Broneeringu loomine ebaõnnestus')
    }

    const result = await response.json()
    
    // In production, redirect to payment
    // For now, simulate payment confirmation
    const paymentResponse = await fetch(
      `/api/bookings/${result.booking.id}/confirm-payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: `pi_${Date.now()}`,
          paymentMethod: 'card',
        }),
      }
    )

    const confirmedBooking = await paymentResponse.json()
    setBooking(confirmedBooking.booking)
  }

  if (booking) {
    return (
      <BookingSuccess
        booking={{
          ...booking,
          startAt: new Date(booking.startAt),
          endAt: new Date(booking.endAt),
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Product Header */}
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {product.name}
              </h1>
              <p className="text-neutral-400">{product.shortDescription}</p>
            </div>
            <Badge
              variant={availability === 'available' ? 'success' : availability === 'limited' ? 'warning' : 'muted'}
              className="text-sm px-4 py-2"
            >
              {availability === 'available' && 'Saadaval'}
              {availability === 'limited' && 'Piiratud'}
              {availability === 'unavailable' && 'Pole hetkel'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Gallery & Info */}
          <div className="lg:col-span-2 space-y-8">
            <ProductGallery images={product.images} productName={product.name} />

            <ProductTabs
              description={product.description}
              specs={{
                'Kategooria': product.category?.name || '',
                'Hind': `${product.basePrice}€ / ${product.priceUnit === 'hour' ? 'tund' : 'päev'}`,
                'Saadavus': `${product.compartmentCount || 0} kapi`,
              }}
              included={[
                'Tööriist täisvarustuses',
                'Kasutusjuhend',
                'Põhitarvikud ja lisad',
                '24/7 klienditugi',
              ]}
              rules={[
                'Broneering kehtib valitud aja jooksul',
                'Tööriist tuleb tagastada puhtana ja töökorras',
                'Kahjustuste korral võidakse nõuda hüvitist',
                'Võtmed/ligipääsukood ei tohi edasi anda',
              ]}
            />

            <ProductFAQ />
          </div>

          {/* Right Column - Booking */}
          <div className="space-y-6">
            {/* Price Card */}
            <PriceCard
              basePrice={product.basePrice}
              priceUnit={product.priceUnit as 'hour' | 'day'}
              availability={availability as any}
            />

            {/* Availability Picker */}
            {availability !== 'unavailable' && (
              <Card className="p-6 bg-neutral-900 border-neutral-800">
                <h2 className="text-lg font-semibold mb-4 text-white">
                  Vali aeg
                </h2>
                <AvailabilityPicker
                  productId={product.id}
                  onTimeSelect={handleTimeSelect}
                  priceUnit={product.priceUnit as 'hour' | 'day'}
                />
              </Card>
            )}

            {/* Booking Summary */}
            {selectedStart && selectedEnd && (
              <BookingSummary
                productName={product.name}
                startDate={selectedStart}
                endDate={selectedEnd}
                totalPrice={quote?.totalPrice || null}
                isLoadingQuote={isLoadingQuote}
                onSubmit={handleSubmitBooking}
              />
            )}

            {/* Unavailable Message */}
            {availability === 'unavailable' && (
              <Card className="p-6 bg-orange-500/10 border-orange-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-300 mb-1">
                      Hetkel pole saadaval
                    </h3>
                    <p className="text-sm text-orange-400/80">
                      See tööriist on praegu välja renditud. Kontrolli teisi sarnaseid tööriistu või võta meiega ühendust.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4 z-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-neutral-400">Alates</div>
            <div className="text-xl font-bold text-white">
              {product.basePrice}€ / {product.priceUnit === 'hour' ? 'h' : 'päev'}
            </div>
          </div>
          {selectedStart && selectedEnd && quote ? (
            <a href="#booking-summary" className="btn btn-primary">
              Broneeri
            </a>
          ) : (
            <div className="text-sm text-neutral-500">Vali aeg</div>
          )}
        </div>
      </div>
    </div>
  )
}
