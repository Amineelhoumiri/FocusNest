import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings2, Zap, Volume2, Wind, Brain, Music, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "focusnest_settings";

const defaultPrefs = {
  reduceAnimations: false,
  completionSounds: true,
  breathingWidget: true,
};

function loadPrefs() {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultPrefs;
  }
}

// Exported so Sessions.tsx and other pages can read preferences
export function getSettings() {
  return loadPrefs();
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle = ({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`w-12 h-7 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50
      ${enabled ? "bg-primary" : "bg-muted-foreground/20"}
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    aria-pressed={enabled}
  >
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="w-5 h-5 rounded-full bg-white shadow absolute top-1"
      style={{ left: enabled ? "calc(100% - 24px)" : "4px" }}
    />
  </button>
);

// ─── Section ──────────────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{title}</h2>
    <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/40">
      {children}
    </div>
  </div>
);

const SettingRow = ({
  icon: Icon,
  iconColor,
  label,
  description,
  right,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  description?: string;
  right: React.ReactNode;
}) => (
  <div className="flex items-center justify-between p-4 gap-4">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
    <div className="shrink-0">{right}</div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { user, updateLocalUser } = useAuth();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [savingConsent, setSavingConsent] = useState<string | null>(null);

  // Persist appearance prefs to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = (key: keyof typeof defaultPrefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleConsentToggle = async (
    field: "is_consented_ai" | "is_consented_spotify"
  ) => {
    if (!user) return;
    const newValue = !user[field];
    setSavingConsent(field);
    try {
      const res = await fetch("/api/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) throw new Error();
      updateLocalUser({ [field]: newValue });
      toast.success(newValue ? "Consent granted." : "Consent withdrawn.");
    } catch {
      toast.error("Failed to update consent.");
    } finally {
      setSavingConsent(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-foreground" />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        </div>

        {/* ── Appearance ── */}
        <Section title="Appearance & Experience">
          <SettingRow
            icon={Zap}
            iconColor="bg-primary/15 text-primary"
            label="Reduce Animations"
            description="Minimise motion effects throughout the app"
            right={<Toggle enabled={prefs.reduceAnimations} onChange={() => toggle("reduceAnimations")} />}
          />
          <SettingRow
            icon={Volume2}
            iconColor="bg-blue-500/15 text-blue-500"
            label="Completion Sounds"
            description="Play a sound when you complete a task"
            right={<Toggle enabled={prefs.completionSounds} onChange={() => toggle("completionSounds")} />}
          />
          <SettingRow
            icon={Wind}
            iconColor="bg-emerald-500/15 text-emerald-500"
            label="Breathing Widget"
            description="Show the guided breathing box during focus sessions"
            right={<Toggle enabled={prefs.breathingWidget} onChange={() => toggle("breathingWidget")} />}
          />
        </Section>

        {/* ── Privacy / Consent ── */}
        <Section title="Data & Privacy">
          <SettingRow
            icon={Brain}
            iconColor="bg-ai-purple/15 text-ai-purple"
            label="AI Features (OpenAI)"
            description="Allow FocusNest to send your tasks to OpenAI for breakdown and coaching"
            right={
              <Toggle
                enabled={user?.is_consented_ai ?? false}
                onChange={() => handleConsentToggle("is_consented_ai")}
                disabled={savingConsent === "is_consented_ai"}
              />
            }
          />
          <SettingRow
            icon={Music}
            iconColor="bg-emerald-500/15 text-emerald-500"
            label="Spotify Integration"
            description="Allow FocusNest to connect to your Spotify account for focus playlists"
            right={
              <Toggle
                enabled={user?.is_consented_spotify ?? false}
                onChange={() => handleConsentToggle("is_consented_spotify")}
                disabled={savingConsent === "is_consented_spotify"}
              />
            }
          />
        </Section>

        {/* ── Account shortcut ── */}
        <Section title="Account">
          <a href="/profile">
            <SettingRow
              icon={Settings2}
              iconColor="bg-muted text-muted-foreground"
              label="Profile & Security"
              description="Edit your name, photo, password, and manage your account"
              right={<ChevronRight className="w-4 h-4 text-muted-foreground" />}
            />
          </a>
        </Section>

        <p className="text-xs text-muted-foreground text-center px-4 pb-4">
          Appearance preferences are stored locally on this device only. Consent settings apply to your account on all devices.
        </p>

      </motion.div>
    </div>
  );
};

export default SettingsPage;
