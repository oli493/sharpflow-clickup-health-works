export default function WorkspacesPage({
  searchParams,
}: {
  searchParams: { connection?: string }
}) {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-items-center px-6">
      <div className="card w-full p-10 text-center">
        <img src="/brand/logo-wordmark.png" alt="Sharpflow" className="mx-auto h-8 w-auto" />
        <h1 className="mt-8 font-display text-2xl font-semibold text-brand-ink">Workspace connected</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-txt-muted">
          Choose the workspace to analyse. (Workspace picker + audit configuration are wired to the
          connection in this phase.)
        </p>
        {searchParams.connection && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-txt-faint">
            connection {searchParams.connection}
          </p>
        )}
      </div>
    </main>
  )
}
