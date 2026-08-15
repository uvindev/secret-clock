"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="system-page">
      <p>WORKBENCH ERROR</p>
      <h1>The audit stopped.</h1>
      <p>
        The imported metadata remains in this tab. Retry the view or reload to
        clear it.
      </p>
      <button onClick={reset}>Retry audit view</button>
    </main>
  );
}
