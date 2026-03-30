// src/pages/SessionComplete.tsx — Full-screen gamification completion screen

import { motion, useReducedMotion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusScore } from "@/context/FocusScoreContext";

// ─── SessionComplete ──────────────────────────────────────────────────────────

const SessionComplete = () => {
  const navigate = useNavigate();
  const reduced  = useReducedMotion() ?? false;
  const [params] = useSearchParams();
  const { score, streak } = useFocusScore();

  const duration      = Number(params.get("duration")    ?? "25");
  const taskTitle     = params.get("taskTitle")           ?? "Focus Session";
  const subtaskTitle  = params.get("subtaskTitle")        ?? "";
  const xpGained      = Number(params.get("xp")          ?? String(duration * 2));
  const minutesFocused = Number(params.get("minutes")    ?? String(duration));

  const displayTitle = subtaskTitle || taskTitle;
  const parentTitle  = subtaskTitle ? taskTitle : null;

  // XP progress bar — milestone every 500 pts
  const MILESTONE = 500;
  const currentMilestone  = Math.ceil(Math.max(score, 1) / MILESTONE) * MILESTONE;
  const prevScore          = Math.max(0, score - xpGained);
  const prevPct            = ((prevScore % MILESTONE) / MILESTONE) * 100;
  const currentPct         = ((score % MILESTONE) / MILESTONE) * 100;
  // Handle milestone crossing (prev could be > current visually)
  const startPct = prevScore < score ? prevPct : 0;

  const anim = (delay = 0) =>
    reduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay } };

  return (
    <div className="relative w-screen h-screen bg-[#060410]
                    flex flex-col items-center justify-center
                    px-6 py-10 gap-0 overflow-hidden">

      {/* Green-tinted orbs — different from session purple */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 60% at 50% 40%, rgba(29,158,117,0.30) 0%, transparent 55%),
          radial-gradient(ellipse 55% 45% at 20% 70%, rgba(109,40,217,0.25) 0%, transparent 50%),
          radial-gradient(ellipse 45% 40% at 80% 25%, rgba(124,111,247,0.20) 0%, transparent 48%)
        `,
      }} />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center w-full max-w-[380px]"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Check ring */}
        <motion.div
          initial={reduced ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="w-24 h-24 rounded-full bg-teal-500/15
                     border-2 border-teal-400/40
                     flex items-center justify-center mb-6"
        >
          <CheckCircle2 style={{ width: 40, height: 40 }} className="text-teal-400" />
        </motion.div>

        <motion.h2 {...anim(0.1)}
          className="text-[32px] font-extrabold text-white/92 tracking-tight mb-2">
          Subtask complete!
        </motion.h2>

        <motion.p {...anim(0.15)} className="text-[14px] text-white/45 mb-1.5 line-clamp-2">
          {displayTitle}
        </motion.p>

        {parentTitle && (
          <motion.p {...anim(0.18)} className="text-[12px] text-teal-400/55 mb-8">
            {parentTitle} · moved to Done
          </motion.p>
        )}
        {!parentTitle && <div className="mb-8" />}

        {/* Streak badge */}
        {streak > 0 && (
          <motion.div
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.8, type: "spring", stiffness: 220, damping: 14 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6
                       bg-amber-500/15 border border-amber-400/30"
          >
            <Star style={{ width: 14, height: 14 }} className="text-amber-400" />
            <span className="text-[12px] font-bold text-amber-300">
              Focus Streak · {streak} day{streak > 1 ? "s" : ""}
            </span>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div {...anim(0.3)} className="flex gap-3 w-full mb-6">
          {[
            { val: String(minutesFocused), label: "Minutes",  color: "text-violet-400" },
            { val: `+${xpGained}`,         label: "XP gained", color: "text-teal-400"   },
            { val: String(streak),          label: "Streak",    color: "text-amber-400"  },
          ].map((s) => (
            <div
              key={s.label}
              className="flex-1 py-4 rounded-2xl text-center
                         bg-white/[0.04] border border-white/[0.07]"
            >
              <p className={cn("text-[26px] font-extrabold leading-none mb-1", s.color)}>
                {s.val}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-white/28">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* XP progress bar */}
        <motion.div {...anim(0.35)} className="w-full mb-8">
          <div className="flex justify-between text-[11px] text-white/35 mb-1.5">
            <span>Focus Score</span>
            <span>{score} / {currentMilestone}</span>
          </div>
          <div className="h-[6px] rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #7c6ff7, #5DCAA5)" }}
              initial={{ width: `${startPct}%` }}
              animate={{ width: `${currentPct}%` }}
              transition={{ duration: reduced ? 0 : 1.2, ease: "easeOut", delay: reduced ? 0 : 0.4 }}
            />
          </div>
          <p className="text-[11px] text-teal-400/65 text-right mt-1.5">
            +{xpGained} pts this session
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div {...anim(0.45)} className="flex gap-3 w-full">
          <button
            onClick={() => navigate("/sessions")}
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold cursor-pointer
                       bg-violet-500/20 border border-violet-400/32
                       text-violet-300 hover:bg-violet-500/30
                       transition-all duration-150"
          >
            New session
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold cursor-pointer
                       bg-white/[0.06] border border-white/[0.10]
                       text-white/50 hover:bg-white/[0.11] hover:text-white/75
                       transition-all duration-150"
          >
            Dashboard
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SessionComplete;
