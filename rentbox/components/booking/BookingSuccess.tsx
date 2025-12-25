'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MapPin, Key } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface BookingSuccessProps {
  booking: {
    id: string
    productName: string
    startAt: Date
    endAt: Date
    totalPrice: number
    accessCode?: string
    lockerName: string
    lockerLocation: string
  }
}

export function BookingSuccess({ booking }: BookingSuccessProps) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white mb-2">
              Broneering kinnitatud!
            </CardTitle>
            <p className="text-neutral-400">
              Kinnitus saadetakse e-postile
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Booking Details */}
          <div className="space-y-4 p-4 bg-neutral-800/50 rounded-lg">
            <div>
              <h3 className="font-semibold text-white text-lg mb-2">
                {booking.productName}
              </h3>
              <p className="text-sm text-neutral-500">
                Broneeringu number: {booking.id}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <div className="text-sm text-neutral-300">
                  {format(booking.startAt, 'dd.MM.yyyy HH:mm')} -{' '}
                  {format(booking.endAt, 'dd.MM.yyyy HH:mm')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <div className="text-sm font-medium text-white">
                  {booking.lockerName}
                </div>
                <div className="text-sm text-neutral-400">
                  {booking.lockerLocation}
                </div>
              </div>
            </div>

            {booking.accessCode && (
              <div className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <Key className="h-5 w-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-1">
                    Juurdepääsukood
                  </div>
                  <div className="text-2xl font-bold text-accent tracking-wider">
                    {booking.accessCode}
                  </div>
                  <div className="text-xs text-neutral-400 mt-2">
                    Kasuta seda koodi nutikapi avamiseks
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-700">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-neutral-300">Kokku makstud</span>
                <span className="text-white">{(booking.totalPrice * 1.22).toFixed(2)}€</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Sisaldab KM 22%
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <h4 className="font-medium text-white">Järgmised sammud:</h4>
            <ol className="space-y-2 text-sm text-neutral-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Kontrolli oma e-posti – saatsime broneeringu kinnituse ja juhised</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Mine nutikapi juurde broneeringu algusajal</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Sisesta juurdepääsukood ekraanile</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Võta tööriist välja ja kasuta!</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span>Tagasta tööriist samasse kappi enne broneeringu lõppu</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link href="/tooriistad">
                Vaata teisi tööriistu
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/bookings/${booking.id}`}>
                Vaata broneeringut
              </Link>
            </Button>
          </div>

          {/* Support */}
          <div className="text-center pt-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-400">
              Küsimused? Võta ühendust:{' '}
              <a href="mailto:info@rentbox.ee" className="text-accent hover:underline">
                info@rentbox.ee
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
