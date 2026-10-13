import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h1 className="text-4xl font-bold font-serif text-accent-custom">404</h1>
      <h2 className="text-lg font-semibold text-ink">Page Not Found</h2>
      <p className="text-xs text-ink-3 max-w-sm">
        The requested account or page could not be located in the TCL Recovery system.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-ink text-surface rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

