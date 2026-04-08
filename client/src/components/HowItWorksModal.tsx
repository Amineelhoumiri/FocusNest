import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FinchBird } from "@/components/finch-bird";
import { ListChecks, Sparkles, Play, Music2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Two ways to load your board",
    body: "Add tasks yourself on the Tasks page, or paste something overwhelming into Chat. Finch breaks it into subtasks you can review.",
    icon: ListChecks,
  },
  {
    title: "Finch parses — you accept",
    body: "When the steps feel right, tap Accept. Your parent task and subtasks land on the Kanban instantly (Backlog). Edit or drag them anytime.",
    icon: Sparkles,
  },
  {
    title: "One focus at a time",
    body: "Keep a single item in Doing. Open Sessions to focus on that subtask, run a timer, and use Music while you work.",
    icon: Play,
  },
  {
    title: "Music while you focus",
    body: "Curated focus playlists are a tap away on the Music page during or outside sessions.",
    icon: Music2,
  },
];

type HowItWorksModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  const [step, setStep] = React.useState(0);
  const reduced = useReducedMotion() ?? false;

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[420px] gap-0 overflow-hidden border-border/60 p-0 sm:rounded-2xl",
          "bg-background/95 backdrop-blur-xl"
        )}
      >
        <div className="relative px-6 pt-7 pb-5">
          <motion.div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-[#3d2e9e] shadow-lg shadow-violet-500/25"
            initial={reduced ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            <FinchBird size={28} variant="white" />
          </motion.div>

          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg font-bold tracking-tight">How FocusNest works</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quick tour with Finch — built for ADHD-friendly planning.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 px-6 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setStep(i)}
              className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <motion.span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            </button>
          ))}
        </div>

        <div className="border-t border-border/50 px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="flex gap-3"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[13px] font-semibold leading-snug text-foreground">{s.title}</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
            {!isLast ? (
              <motion.button
                type="button"
                onClick={() => setStep((x) => Math.min(x + 1, STEPS.length - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                whileTap={reduced ? undefined : { scale: 0.97 }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                whileTap={reduced ? undefined : { scale: 0.97 }}
              >
                Got it
              </motion.button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
