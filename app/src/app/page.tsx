export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-6">
      <div className="card w-full p-10 text-center">
        <img src="/brand/logo-wordmark.png" alt="Sharpflow" className="mx-auto h-8 w-auto" />
        <h1 className="mt-8 font-display text-3xl font-semibold text-brand-ink">
          Free ClickUp health check
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-txt-muted">
          Connect your ClickUp workspace and get a free automated health check. See practical
          improvements related to your structure, workflow, data, operations, adoption and
          utilisation.
        </p>
        <a href="/api/clickup/oauth" className="btn-primary btn-arrow pr-2.5 mt-8">
          Connect ClickUp
        </a>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-txt-faint">
          Read-only · OAuth
        </p>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">
              Dev only · ClickUp OAuth is currently broken on ClickUp's side
            </p>
            <a
              href="/api/clickup/dev-connect"
              className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-magenta hover:underline"
            >
              Connect with personal token
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
