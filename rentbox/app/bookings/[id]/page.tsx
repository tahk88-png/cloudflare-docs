import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBooking } from '@/lib/api/bookings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MapPin, Key, ChevronRight, Home } from 'lucide-react'
import { format } from 'date-fns'

interface BookingPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  return {
    title: 'Broneering | Rentbox.ee',
    description: 'Vaata oma broneeringu detaile',
  }
}

export default async function BookingPage({ params }: BookingPageProps) {
  const booking = await getBooking(params.id)

  if (!booking) {
    notFound()
  }

  const statusConfig: Record<string, { label: string; variant: any; description: string }> = {
    pending: {
      label: 'Ootel',
      variant: 'warning' as const,
      description: 'Ootab makse kinnitust',
    },
    paid: {
      label: 'Kinnitatud',
      variant: 'success' as const,
      description: 'Makse on tehtud',
    },
    active: {
      label: 'Aktiivne',
      variant: 'default' as const,
      description: 'Broneering on aktiivne',
    },
    completed: {
      label: 'Lõppenud',
      variant: 'muted' as const,
      description: 'Broneering on lõppenud',
    },
    cancelled: {
      label: 'Tühistatud',
      variant: 'destructive' as const,
      description: 'Broneering on tühistatud',
    },
    expired: {
      label: 'Aegunud',
      variant: 'muted' as const,
      description: 'Broneering on aegunud',
    },
  }

  const status = statusConfig[booking.status] || statusConfig.pending

  return (
    <main className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Broneering</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">Broneering</CardTitle>
                <Badge variant={status.variant} className="text-sm">
                  {status.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Booking Details */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{booking.product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Broneeringu number: {booking.id}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <div className="text-sm text-foreground">
                      {format(new Date(booking.startAt), 'dd.MM.yyyy HH:mm')} -{' '}
                      {format(new Date(booking.endAt), 'dd.MM.yyyy HH:mm')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{booking.compartment.locker.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.compartment.locker.locationText}
                    </div>
                  </div>
                </div>

                {booking.accessCode && booking.status !== 'cancelled' && (
                  <div className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                    <Key className="h-5 w-5 text-accent mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">Juurdepääsukood</div>
                      <div className="text-2xl font-bold text-accent tracking-wider">
                        {booking.accessCode}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Kasuta seda koodi nutikapi avamiseks
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Kokku makstud</span>
                    <span>{(booking.totalPrice * 1.22).toFixed(2)}€</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Sisaldab KM 22%</p>
                </div>
              </div>

              {/* Instructions */}
              {booking.instructions && booking.status !== 'cancelled' && (
                <div>
                  <h4 className="font-medium mb-3">Juhised</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-lg">
                    {booking.instructions}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button asChild className="flex-1">
                  <Link href="/tooriistad">Vaata teisi tööriistu</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href={`/tooriistad/${booking.product.slug}`}>
                    Vaata toodet
                  </Link>
                </Button>
              </div>

              {/* Support */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Küsimused? Võta ühendust:{' '}
                  <a href="mailto:info@rentbox.ee" className="text-accent hover:underline">
                    info@rentbox.ee
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
