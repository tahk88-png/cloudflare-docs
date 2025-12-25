'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2, CheckCircle } from 'lucide-react'

interface BookingSummaryProps {
  productName: string
  startDate: Date | null
  endDate: Date | null
  totalPrice: number | null
  isLoadingQuote: boolean
  onSubmit: (data: { email: string; name: string; phone: string }) => Promise<void>
}

export function BookingSummary({
  productName,
  startDate,
  endDate,
  totalPrice,
  isLoadingQuote,
  onSubmit,
}: BookingSummaryProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email && name && startDate && endDate && totalPrice && !isLoadingQuote

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({ email, name, phone })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broneeringu loomine ebaõnnestus')
    } finally {
      setIsSubmitting(false)
    }
  }

  const durationHours = startDate && endDate
    ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    : 0

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-xl text-white">Broneeringu kokkuvõte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Info */}
        <div>
          <h3 className="font-medium text-white">{productName}</h3>
          {startDate && endDate ? (
            <div className="mt-2 space-y-1 text-sm text-neutral-400">
              <div>Algus: {format(startDate, 'dd.MM.yyyy HH:mm')}</div>
              <div>Lõpp: {format(endDate, 'dd.MM.yyyy HH:mm')}</div>
              <div>Kestus: {durationHours < 24 ? `${durationHours}h` : `${Math.ceil(durationHours / 24)} päeva`}</div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 mt-2">Vali aeg, et näha hinda</p>
          )}
        </div>

        <Separator className="bg-neutral-800" />

        {/* Price Breakdown */}
        <div className="space-y-2">
          {isLoadingQuote ? (
            <>
              <Skeleton className="h-4 w-full bg-neutral-800" />
              <Skeleton className="h-4 w-2/3 bg-neutral-800" />
            </>
          ) : totalPrice !== null ? (
            <>
              <div className="flex justify-between text-sm text-neutral-400">
                <span>Rendihind</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-400">
                <span>KM 22%</span>
                <span>{(totalPrice * 0.22).toFixed(2)}€</span>
              </div>
              <Separator className="bg-neutral-800" />
              <div className="flex justify-between font-bold text-white text-lg">
                <span>Kokku</span>
                <span>{(totalPrice * 1.22).toFixed(2)}€</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Vali aeg, et näha hinda</p>
          )}
        </div>

        <Separator className="bg-neutral-800" />

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-neutral-300">
              E-post *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sinu@email.ee"
              required
              className="mt-1 bg-neutral-800 border-neutral-700"
            />
          </div>

          <div>
            <Label htmlFor="name" className="text-neutral-300">
              Nimi *
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Eesnimi Perekonnanimi"
              required
              className="mt-1 bg-neutral-800 border-neutral-700"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-neutral-300">
              Telefon (valikuline)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+372 5XXX XXXX"
              className="mt-1 bg-neutral-800 border-neutral-700"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full h-12 text-base font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Broneeritakse...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Kinnita broneering
              </>
            )}
          </Button>

          <p className="text-xs text-neutral-500 text-center">
            Klikkides nõustud{' '}
            <a href="/tingimused" className="text-accent hover:underline">
              kasutustingimustega
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
