import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-8 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            Welcome to Artist OS
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Artist OS runs an autonomous agent inside a Vercel Sandbox and persists its workspace in Vercel Blob snapshots.
            The main entry point is <code className="bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1 text-sm">/api/artist-os/query</code>.
            <br />
            See the interactive console to try the multi-turn agent or inspect runs in real-time.
          </p>
        </div>
        <div className="mt-20 flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-zinc-100 dark:text-black px-5 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 md:w-[220px] shadow"
            href="/artist-os-console"
          >
            Open Artist OS Console
          </Link>
        </div>
      </main>
    </div>
  );
}
