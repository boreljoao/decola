import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-night-900 text-mist-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, rgb(53 115 245 / 0.14), transparent)",
        }}
      />
      <header className="relative z-10 mx-auto w-full max-w-[1240px] px-6 py-6">
        <Link
          href="/"
          style={{ fontFamily: "var(--font-sora)" }}
          className="text-xl font-bold tracking-tight"
        >
          decola<span className="text-electric-400">✦</span>
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-night-850 p-8 shadow-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
