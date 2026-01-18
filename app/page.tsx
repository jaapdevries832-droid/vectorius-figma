import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Vectorius UI</h1>
        <p className="text-muted-foreground">Start at the login screen for role-based dashboards.</p>
        <div className="flex items-center justify-center gap-4">
          <Link className="px-4 py-2 rounded-xl bg-primary text-white shadow hover:opacity-90" href="/login">Go to Login</Link>
        </div>
      </div>
    </main>
  )
}
