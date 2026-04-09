import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Scale, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type MetaRow = { label: string; value: string };

export type LegalTocItem = { id: string; label: string };

type LegalLayoutProps = {
  title: string;
  subtitle?: string;
  meta: MetaRow[];
  children: ReactNode;
  toc?: LegalTocItem[];
};

/**
 * Left-aligned policy layout (typical Terms / Privacy page), not a centered “card”.
 */
export function LegalLayout({
  title,
  subtitle,
  meta,
  children,
  toc,
}: LegalLayoutProps) {
  const location = useLocation();
  const isTerms = location.pathname === "/terms";
  const isPrivacy = location.pathname === "/privacy";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Home
          </Link>

          <nav
            className="flex items-center gap-1 border border-border/60 bg-muted/30 p-1"
            aria-label="Legal documents"
          >
            <Link
              to="/terms"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isTerms
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Terms
              </span>
            </Link>
            <Link
              to="/privacy"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isPrivacy
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Privacy
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-12 2xl:px-16">
        {/* Full-width document: uses viewport minus horizontal padding */}
        <div className="w-full">
          <article>
            <header className="border-b border-border pb-8">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 max-w-none text-base leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}

              <dl className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-3">
                {meta.map(({ label, value }) => (
                  <div key={label} className="text-sm">
                    <dt className="font-semibold text-foreground">{label}</dt>
                    <dd className="mt-0.5 text-muted-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </header>

            {toc && toc.length > 0 ? (
              <div className="border-b border-border py-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  On this page
                </p>
                <nav aria-label="Section navigation" className="flex flex-wrap gap-2">
                  {toc.map(({ id, label }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1 text-xs text-foreground hover:border-primary/40 hover:bg-primary/[0.04]"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
            ) : null}

            <div
              className={cn(
                "pt-8",
                toc &&
                  toc.length > 0 &&
                  "lg:grid lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:pt-10 xl:gap-12 2xl:gap-16",
              )}
            >
              {toc && toc.length > 0 ? (
                <>
                  <aside className="mb-10 hidden lg:block">
                    <nav
                      aria-label="Table of contents"
                      className="sticky top-24 space-y-1 border-l border-border pl-4 text-sm"
                    >
                      {toc.map(({ id, label }) => (
                        <a
                          key={id}
                          href={`#${id}`}
                          className="block py-1 text-muted-foreground hover:text-foreground"
                        >
                          {label}
                        </a>
                      ))}
                    </nav>
                  </aside>
                  <div className="legal-doc not-prose min-w-0">{children}</div>
                </>
              ) : (
                <div className="legal-doc not-prose min-w-0">{children}</div>
              )}
            </div>
          </article>

          <p className="mt-12 border-t border-border pt-8 text-sm text-muted-foreground">
            Questions?{" "}
            <a
              href="mailto:6elhom71@solent.ac.uk"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              6elhom71@solent.ac.uk
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
