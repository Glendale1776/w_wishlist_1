import Link from "next/link";

export default function AuthPage({
  searchParams
}: {
  searchParams?: { returnTo?: string };
}) {
  const returnTo =
    typeof searchParams?.returnTo === "string" && searchParams.returnTo.startsWith("/")
      ? searchParams.returnTo
      : "/app";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink/75">
          Continue to manage your wishlists. After login, you will return to your requested page.
        </p>

        <form className="mt-6 space-y-4" action={returnTo} method="get">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-line bg-white px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-white px-3 py-2"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-2 font-semibold text-white transition hover:opacity-90"
          >
            Continue
          </button>
        </form>

        <div className="mt-4 text-sm text-ink/70">
          <span>No account yet? </span>
          <Link className="font-medium text-accent underline" href={`/auth?returnTo=${encodeURIComponent(returnTo)}`}>
            Create one
          </Link>
        </div>
      </section>
    </main>
  );
}
