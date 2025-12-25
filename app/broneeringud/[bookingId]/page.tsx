import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
// @ts-ignore - date-fns locale may not have types
import { et } from 'date-fns/locale/et' || {}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface BookingConfirmationPageProps {
  params: Promise<{ bookingId: string }>
}

export async function generateMetadata({
  params,
}: BookingConfirmationPageProps): Promise<Metadata> {
  const { bookingId } = await params
  return {
    title: `Broneering kinnitatud - ${bookingId} - Rentbox.ee`,
  }
}

export default async function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const { bookingId } = await params
  
  // TODO: Fetch booking from database
  // const booking = await getBookingById(bookingId)
  
  // Mock data for now
  const booking = {
    id: bookingId,
    productName: 'Makita akupuur',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    status: 'confirmed' as const,
    compartmentLabel: 'Kapp 1',
    lockerLocation: 'Tallinn, Kesklinna',
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="text-center">
            <div className="mb-4 text-6xl">✓</div>
            <CardTitle className="text-3xl font-semibold">Broneering kinnitatud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-[var(--bg)] p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-[var(--muted)]">Tööriist</div>
                  <div className="text-lg font-semibold">{booking.productName}</div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm font-medium text-[var(--muted)]">Algus</div>
                  <div className="text-lg">
                    {format(booking.startsAt, 'EEEE, d. MMMM yyyy HH:mm', { locale: et })}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-[var(--muted)]">Lõpp</div>
                  <div className="text-lg">
                    {format(booking.endsAt, 'EEEE, d. MMMM yyyy HH:mm', { locale: et })}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm font-medium text-[var(--muted)]">Asukoht</div>
                  <div className="text-lg">{booking.lockerLocation}</div>
                  <div className="text-sm text-[var(--muted)]">{booking.compartmentLabel}</div>
                </div>
                
                <div>
                  <Badge variant="success">Kinnitatud</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Järgmised sammud</h3>
              <ol className="list-inside list-decimal space-y-2 text-[var(--muted)]">
                <li>Mine valitud asukohta</li>
                <li>Avage kapp mobiilirakendusega</li>
                <li>Võta tööriist kapist</li>
                <li>Tagasta tööriist pärast kasutamist</li>
              </ol>
            </div>
            
            <Separator />
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/tooriistad">Vaata teisi tööriistu</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/broneeringud">Minu broneeringud</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
