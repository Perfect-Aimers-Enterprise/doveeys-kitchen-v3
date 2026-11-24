import { brandConfig } from "@/config";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg-2 px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <p className="mb-8 text-center font-heading text-3xl font-semibold tracking-wide text-green-deep">{brandConfig.name}</p>
        <section className="rounded-lg border border-border bg-card p-6 sm:p-8">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {intro && <p className="mt-2 text-sm leading-6 text-text-2">{intro}</p>}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
