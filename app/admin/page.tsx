import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight">Admin juhtpaneel</h2>
        <p className="mt-2 text-[var(--muted)]">Halda kategooriaid, tooteid ja broneeringuid</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Kategooriad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Halda tööriistade kategooriaid
            </p>
            <Button asChild>
              <Link href="/admin/categories">Ava kategooriad</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Tööriistad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Halda tööriistu ja hindu
            </p>
            <Button asChild>
              <Link href="/admin/products">Ava tööriistad</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Broneeringud</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Vaata ja halda broneeringuid
            </p>
            <Button asChild>
              <Link href="/admin/bookings">Ava broneeringud</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Kapid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Halda kappe ja kompartemente
            </p>
            <Button asChild>
              <Link href="/admin/compartments">Ava kapid</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
