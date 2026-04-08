import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type MetaRow = { label: string; value: string };

type LegalLayoutProps = {
  title: string;
  meta: MetaRow[];
  children: ReactNode;
};

export function LegalLayout({ title, meta, children }: LegalLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Home
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link
              to="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <article className="rounded-2xl border border-border/50 bg-card/35 p-6 shadow-sm backdrop-blur-sm md:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          <dl className="mt-5 space-y-1 border-b border-border/40 pb-6 text-sm">
            {meta.map(({ label, value }) => (
              <div key={label}>
                <dt className="inline font-medium text-foreground/85">{label}:</dt>{" "}
                <dd className="inline text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <div
            className="prose prose-sm mt-8 max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:text-sm"
          >
            {children}
          </div>
        </article>
      </main>
    </div>
  );
}
