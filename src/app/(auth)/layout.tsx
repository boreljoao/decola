import Link from "next/link";
import { Aurora, DotGrid } from "@/components/marketing/aurora";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-night-900 text-mist-100">
      <div className="fixed inset-0">
        <Aurora />
        <DotGrid />
      </div>
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
        <div className="gradient-border w-full max-w-md rounded-2xl bg-night-850/80 p-8 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
