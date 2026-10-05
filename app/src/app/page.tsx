export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-6">
      <div className="card w-full p-10 text-center">
        <img src="/brand/logo-wordmark.png" alt="Sharpflow" className="mx-auto h-8 w-auto" />
        <h1 className="mt-8 font-display text-3xl font-semibold text-brand-ink">
          ClickUp Health
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-txt-muted">
          Connect your ClickUp workspace and get an automated health assessment — structure,
          workflow, data quality, operations, adoption and utilisation.
        </p>
        <a href="/api/clickup/oauth" className="btn-primary mt-8">
          Connect ClickUp
        </a>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-txt-faint">
          Read-only · OAuth
        </p>
      </div>
    </main>
  )
}
