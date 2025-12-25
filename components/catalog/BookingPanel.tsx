import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function BookingPanel({ price, unit }: { price: number, unit: string }) {
  return (
    <Card className="border-[var(--accent)] border-2">
      <CardHeader>
        <CardTitle className="text-xl">Broneerimine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
            <span className="text-[var(--muted)]">Hind</span>
            <span className="text-2xl font-bold">{price.toFixed(2)}€ <span className="text-sm font-normal text-[var(--muted)]">/ {unit}</span></span>
        </div>
        
        <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm">
            ✅ Saadaval kohe rentimiseks
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Vali rendiperiood</label>
            <div className="grid grid-cols-2 gap-2">
                 {/* Mock date picker inputs */}
                 <div className="border p-2 rounded text-center text-sm">Algus</div>
                 <div className="border p-2 rounded text-center text-sm">Lõpp</div>
            </div>
        </div>

        <Button className="w-full h-12 text-lg">Broneeri kohe</Button>
        <p className="text-xs text-center text-[var(--muted)]">Tasumine toimub turvaliselt pangalingiga.</p>
      </CardContent>
    </Card>
  )
}
