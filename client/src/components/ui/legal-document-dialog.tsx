import { useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LegalDocumentDialogProps = {
  title: string;
  /** Full page path for “read full document” link */
  fullPageHref: "/terms" | "/privacy";
  /** Shown on the trigger before the user has accepted */
  triggerLabel: string;
  agreed: boolean;
  onAgreed: () => void;
  /** Optional: accent for header strip (FocusNest brand) */
  accent?: "violet" | "teal";
  children: ReactNode;
};

/**
 * Scroll-to-end gate + “I agree” — same interaction pattern as common signup modals,
 * styled for FocusNest (primary / teal accents, rounded shell).
 */
export function LegalDocumentDialog({
  title,
  fullPageHref,
  triggerLabel,
  agreed,
  onAgreed,
  accent = "violet",
  children,
}: LegalDocumentDialogProps) {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHasReadToBottom(false);
      requestAnimationFrame(() => {
        const el = contentRef.current;
        if (el) {
          el.scrollTop = 0;
          const max = el.scrollHeight - el.clientHeight;
          if (max <= 4) setHasReadToBottom(true);
        }
      });
    }
  };

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const max = scrollHeight - clientHeight;
    if (max <= 4) {
      setHasReadToBottom(true);
      return;
    }
    if (scrollTop / max >= 0.99) setHasReadToBottom(true);
  };

  const headerTint =
    accent === "teal"
      ? "from-teal-500/[0.12] via-background to-cyan-500/[0.06] dark:from-teal-500/[0.15]"
      : "from-primary/[0.14] via-background to-violet-500/[0.06] dark:from-primary/[0.18]";

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-10 rounded-xl border-border/70 bg-card/50 text-[13px] font-semibold shadow-sm transition-all",
            "hover:border-primary/35 hover:bg-primary/[0.06]",
            agreed &&
              "border-emerald-500/45 bg-emerald-500/[0.08] text-emerald-700 hover:border-emerald-500/55 dark:text-emerald-400",
          )}
        >
          {agreed ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              {triggerLabel}
            </>
          ) : (
            triggerLabel
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(640px,82vh)] sm:max-w-lg",
          "[&>button]:right-3.5 [&>button]:top-3.5 [&>button]:rounded-lg [&>button]:border [&>button]:border-border/50 [&>button]:bg-background/90",
        )}
      >
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle
            className={cn(
              "border-b border-border/50 bg-gradient-to-r px-6 py-4 font-display text-base tracking-tight md:text-lg",
              headerTint,
            )}
          >
            {title}
          </DialogTitle>
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="max-h-[min(420px,52vh)] overflow-y-auto overscroll-contain sm:max-h-[min(440px,56vh)]"
          >
            <DialogDescription asChild>
              <div className="px-6 py-4">
                <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
                  Summary for quick reading. The full legal text is always on{" "}
                  <Link
                    to={fullPageHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    this page
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                  </Link>
                  .
                </p>
                <div className="space-y-5 text-[13px] leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
                  {children}
                </div>
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-3 border-t border-border/50 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0 dark:bg-muted/10">
          {!hasReadToBottom ? (
            <span className="grow text-center text-xs text-muted-foreground sm:text-left">
              Scroll to the bottom to enable <span className="font-medium text-foreground">I agree</span>.
            </span>
          ) : (
            <span className="grow text-center text-xs text-emerald-600 dark:text-emerald-400 sm:text-left">
              You can confirm below.
            </span>
          )}
          <div className="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-xl">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                type="button"
                size="sm"
                disabled={!hasReadToBottom}
                className="rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 disabled:shadow-none"
                onClick={() => {
                  onAgreed();
                }}
              >
                I agree
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
