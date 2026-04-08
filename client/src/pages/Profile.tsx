import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Calendar, Camera, Save, Shield, Phone,
  X, KeyRound, Download, Trash2, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Field = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      {label}
    </label>
    {children}
  </div>
);

type Tab = "personal" | "security" | "data";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "personal",  label: "Personal",  icon: User     },
  { key: "security",  label: "Security",  icon: Shield   },
  { key: "data",      label: "Data",      icon: Download },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Profile = () => {
  const { user, updateLocalUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "", date_of_birth: "", phone_number: "", profile_photo_url: "",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [showNukeModal, setShowNukeModal] = useState(false);
  const [nukePassword, setNukePassword] = useState("");
  const [isNuking, setIsNuking] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        date_of_birth: user.date_of_birth
          ? new Date(user.date_of_birth).toISOString().split("T")[0]
          : "",
        phone_number: user.phone_number || "",
        profile_photo_url: user.profile_photo_url || "",
      });

    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updatedUser = await res.json();
      updateLocalUser(updatedUser);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error("Failed to save profile.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      setIsChangingPassword(true);
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change password");
      toast.success("Password changed.");
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/users/me/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `focusnest-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported.");
    } catch {
      toast.error("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNukeAccount = async () => {
    if (!nukePassword.trim()) {
      toast.error("Enter your password to confirm.");
      return;
    }
    setIsNuking(true);
    try {
      const res = await fetch("/api/users/me/nuke", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nukePassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete account");
      }
      toast.success("Account deleted.");
      window.location.href = "/";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setIsNuking(false);
      setShowNukeModal(false);
      setNukePassword("");
    }
  };

  if (!user) return null;

  const initials = user.full_name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── Profile Header ── */}
        <div className="flex items-start gap-5 mb-8 pb-7 border-b border-border/60">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-primary/10 border border-border/60 flex items-center justify-center shadow-sm">
              {formData.profile_photo_url ? (
                <img src={formData.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">{initials}</span>
              )}
            </div>
            <label
              htmlFor="photoUpload"
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
            </label>
            <input id="photoUpload" type="text" className="sr-only" aria-hidden="true" />
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-xl font-semibold text-foreground truncate leading-tight">
              {user.full_name}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {user.email}
            </p>
            {user.is_admin && (
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2 py-0.5 rounded-md">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>

          {/* Save button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            disabled={isSaving}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </motion.button>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-0.5 p-1 rounded-xl bg-muted/80 mb-6 w-fit border border-border/40">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer",
                activeTab === key
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.14 }}
          >
            {/* Personal */}
            {activeTab === "personal" && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Personal Details
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Full Name" icon={User}>
                      <Input
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="h-11 bg-background border-border/60 focus-visible:ring-primary/30"
                      />
                    </Field>
                    <Field label="Date of Birth" icon={Calendar}>
                      <Input
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className="h-11 bg-background border-border/60 focus-visible:ring-primary/30 [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                    </Field>
                    <Field label="Phone Number" icon={Phone}>
                      <Input
                        name="phone_number"
                        type="tel"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className="h-11 bg-background border-border/60 focus-visible:ring-primary/30"
                      />
                    </Field>
                    <Field label="Profile Photo URL" icon={Camera}>
                      <Input
                        id="photoUpload"
                        name="profile_photo_url"
                        value={formData.profile_photo_url}
                        onChange={handleChange}
                        placeholder="https://example.com/photo.jpg"
                        className="h-11 bg-background border-border/60 focus-visible:ring-primary/30"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Security Settings
                  </h2>
                  <div className="flex items-center justify-between gap-6 py-4 border-t border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Password</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Use a strong, unique password you don't reuse elsewhere.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordModal(true)}
                      className="shrink-0 h-9 text-sm border-border/60 hover:bg-muted/60 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data */}
            {activeTab === "data" && (
              <div className="space-y-3">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-6 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-500" />
                        Export My Data
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Download all your tasks, sessions, and profile as JSON (GDPR).
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="shrink-0 h-9 text-sm border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10 cursor-pointer"
                    >
                      {isExporting ? "Exporting…" : "Download JSON"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-500/20 shadow-sm">
                  <CardContent className="p-6 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Delete Account
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete your account and all data. This cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowNukeModal(true)}
                      className="shrink-0 h-9 text-sm border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {showNukeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowNukeModal(false); setNukePassword(""); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="bg-background border border-red-200 dark:border-red-500/20 shadow-xl rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Delete Account
                </h2>
                <button
                  onClick={() => { setShowNukeModal(false); setNukePassword(""); }}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                This will permanently delete your account, tasks, sessions, and all associated data.{" "}
                <strong className="text-foreground">This cannot be undone.</strong> Enter your password to confirm.
              </p>
              <div className="space-y-3">
                <Input
                  type="password"
                  value={nukePassword}
                  onChange={e => setNukePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 border-red-200 dark:border-red-500/30 focus-visible:ring-red-500/30"
                  onKeyDown={e => e.key === "Enter" && handleNukeAccount()}
                />
                <Button
                  onClick={handleNukeAccount}
                  disabled={isNuking || !nukePassword.trim()}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold border-0 cursor-pointer"
                >
                  {isNuking ? "Deleting…" : "Yes, permanently delete my account"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="bg-background border border-border/60 shadow-xl rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" /> Update Password
                </h2>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mb-5">
                {[
                  { key: "currentPassword", label: "Current Password", placeholder: "Enter current password" },
                  { key: "newPassword",     label: "New Password",     placeholder: "At least 8 characters"  },
                  { key: "confirmPassword", label: "Confirm Password", placeholder: "Type exactly as above"   },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
                    <Input
                      type="password"
                      value={passwordData[key as keyof typeof passwordData]}
                      onChange={e => setPasswordData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="h-11 bg-muted/40 border-border/60 focus-visible:ring-primary/30"
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !passwordData.currentPassword ||
                  !passwordData.newPassword ||
                  !passwordData.confirmPassword
                }
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer"
              >
                {isChangingPassword ? "Updating…" : "Update Password"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
