import { redirect } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Add authentication check
  // const session = await getServerSession()
  // if (!session || !session.user.isAdmin) {
  //   redirect('/')
  // }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold">Rentbox Admin</h1>
        </div>
      </div>
      {children}
    </div>
  )
}
