import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">Lehte ei leitud</h2>
        <p className="text-muted-foreground">
          Otsitud lehte ei eksisteeri. Kontrolli aadressi või mine tagasi avalehele.
        </p>
        <Button size="lg" asChild>
          <Link href="/tooriistad">
            Tagasi avalehele
          </Link>
        </Button>
      </div>
    </div>
  )
}
