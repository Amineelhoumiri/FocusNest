import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Calendar, MapPin, Camera, Save, Shield, Phone, Home, Building, Map, Flag, X, KeyRound, Download, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Profile = () => {
    const { user, updateLocalUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    const [addressParts, setAddressParts] = useState({
        street: "",
        city: "",
        county: "",
        postcode: "",
        country: ""
    });

    const [formData, setFormData] = useState({
        full_name: "",
        date_of_birth: "",
        phone_number: "",
        profile_photo_url: "",
    });

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [isExporting, setIsExporting] = useState(false);
    const [showNukeModal, setShowNukeModal] = useState(false);
    const [nukePassword, setNukePassword] = useState("");
    const [isNuking, setIsNuking] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || "",
                date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : "",
                phone_number: user.phone_number || "",
                profile_photo_url: user.profile_photo_url || "",
            });

            // Parse address JSON strictly if it looks like JSON, otherwise fallback
            if (user.address) {
                try {
                    const parsed = JSON.parse(user.address);
                    setAddressParts({
                        street: parsed.street || "",
                        city: parsed.city || "",
                        county: parsed.county || "",
                        postcode: parsed.postcode || "",
                        country: parsed.country || ""
                    });
                } catch (e) {
                    setAddressParts({ street: user.address, city: "", county: "", postcode: "", country: "" });
                }
            }
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddressParts((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (passwordData.newPassword.length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
        }

        try {
            setIsChangingPassword(true);
            const res = await fetch("/api/users/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to change password");

            toast.success("Password changed successfully.");
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
            const res = await fetch("/api/users/me/export");
            if (!res.ok) throw new Error("Export failed");
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `focusnest-export-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Your data has been exported.");
        } catch {
            toast.error("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleNukeAccount = async () => {
        if (!nukePassword.trim()) {
            toast.error("Please enter your password to confirm.");
            return;
        }
        setIsNuking(true);
        try {
            const res = await fetch("/api/users/me/nuke", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: nukePassword }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to delete account");
            }
            toast.success("Account deleted. Goodbye.");
            window.location.href = "/";
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete account.");
        } finally {
            setIsNuking(false);
            setShowNukeModal(false);
            setNukePassword("");
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const addressJson = JSON.stringify(addressParts);

            const payload = {
                ...formData,
                address: addressJson
            };

            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Failed to update profile");
            }

            const updatedUser = await res.json();
            updateLocalUser(updatedUser);
            toast.success("Profile updated perfectly!");
        } catch (err) {
            toast.error("An error occurred while saving your profile");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-[calc(100vh-4rem)]">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border/50">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/20 border-4 border-background flex items-center justify-center shrink-0 shadow-xl">
                                {formData.profile_photo_url ? (
                                    <img src={formData.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-primary">{user.full_name[0]?.toUpperCase()}</span>
                                )}
                            </div>
                            <label
                                htmlFor="photoUpload"
                                className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer"
                            >
                                <Camera className="w-6 h-6" />
                            </label>
                        </div>
                        <div>
                            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{user.full_name}</h1>
                            <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4" /> {user.email}
                            </p>
                            {user.is_admin && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded mt-2">
                                    <Shield className="w-3 h-3" /> Admin
                                </span>
                            )}
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.03, boxShadow: "0 8px 28px rgba(124,58,237,0.45)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={isSaving}
                        className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white min-w-[130px] justify-center disabled:opacity-60 transition-all"
                        style={{
                            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                        }}
                    >
                        <motion.span
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                            animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                        />
                        {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
                    </motion.button>
                </div>

                {/* Content Section */}
                <div className="grid lg:grid-cols-2 gap-8">
                    <Card className="border-border/40 shadow-sm">
                        <CardContent className="p-6 space-y-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
                                <User className="w-5 h-5 text-primary" /> Personal Details
                            </h2>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-background/50 border-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Profile Photo URL</label>
                                <div className="relative">
                                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="photoUpload"
                                        name="profile_photo_url"
                                        value={formData.profile_photo_url}
                                        onChange={handleChange}
                                        placeholder="https://example.com/photo.jpg"
                                        className="pl-10 h-12 bg-background/50 border-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Date of Birth</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        name="date_of_birth"
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-background/50 border-input text-foreground [&::-webkit-calendar-picker-indicator]:dark:invert"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        name="phone_number"
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-background/50 border-input"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm h-fit">
                        <CardContent className="p-6 space-y-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
                                <MapPin className="w-5 h-5 text-emerald-500" /> Location Details
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Street Number</label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            name="street"
                                            value={addressParts.street}
                                            onChange={handleAddressChange}
                                            placeholder="123 Example St"
                                            className="pl-10 h-12 bg-background/50 border-input"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">City</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                name="city"
                                                value={addressParts.city}
                                                onChange={handleAddressChange}
                                                className="pl-10 h-12 bg-background/50 border-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">County</label>
                                        <div className="relative">
                                            <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                name="county"
                                                value={addressParts.county}
                                                onChange={handleAddressChange}
                                                className="pl-10 h-12 bg-background/50 border-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Postcode</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                name="postcode"
                                                value={addressParts.postcode}
                                                onChange={handleAddressChange}
                                                className="pl-10 h-12 bg-background/50 border-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Country</label>
                                        <div className="relative">
                                            <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                name="country"
                                                value={addressParts.country}
                                                onChange={handleAddressChange}
                                                className="pl-10 h-12 bg-background/50 border-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Security Section */}
                <div className="mt-8">
                    <Card className="border-border/40 shadow-sm border-destructive/20 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1 bg-destructive/50" />
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-destructive" /> Security Settings
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Manage your account security, change your password, and monitor active sessions.</p>
                                </div>
                                <Button variant="outline" onClick={() => setShowPasswordModal(true)} className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                                    Change Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* GDPR + Danger Zone */}
                <div className="mt-4 space-y-3">
                    {/* Export */}
                    <Card className="border-border/40 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-foreground">
                                        <Download className="w-4 h-4 text-blue-500" /> Export My Data
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Download a full copy of your data (tasks, sessions, profile) as JSON.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleExportData}
                                    disabled={isExporting}
                                    className="shrink-0 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/50"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {isExporting ? "Exporting..." : "Download JSON"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Nuke */}
                    <Card className="border-red-500/20 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1 bg-red-500/70" />
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-red-500">
                                        <AlertTriangle className="w-4 h-4" /> Delete Account
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This cannot be undone.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowNukeModal(true)}
                                    className="shrink-0 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>

            {/* Nuke Account Modal */}
            <AnimatePresence>
                {showNukeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowNukeModal(false); setNukePassword(""); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card border border-red-500/20 shadow-2xl p-6 rounded-3xl w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Delete Account
                                </h2>
                                <button onClick={() => { setShowNukeModal(false); setNukePassword(""); }} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground mb-5">
                                This will permanently delete your account, all tasks, sessions, and data. <strong className="text-foreground">This cannot be undone.</strong> Enter your password to confirm.
                            </p>
                            <div className="space-y-4">
                                <Input
                                    type="password"
                                    value={nukePassword}
                                    onChange={(e) => setNukePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="h-12 bg-surface-raised border-red-500/30 focus-visible:ring-red-500/50"
                                    onKeyDown={(e) => e.key === "Enter" && handleNukeAccount()}
                                />
                                <Button
                                    onClick={handleNukeAccount}
                                    disabled={isNuking || !nukePassword.trim()}
                                    className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold border-0"
                                >
                                    {isNuking ? "Deleting..." : "Yes, permanently delete my account"}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card border border-border/30 shadow-2xl p-6 rounded-3xl w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <KeyRound className="w-6 h-6 text-primary" /> Update Password
                                </h2>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Current Password</label>
                                    <Input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="h-12 bg-surface-raised border-input"
                                        placeholder="Enter current password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">New Password</label>
                                    <Input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="h-12 bg-surface-raised border-input"
                                        placeholder="At least 8 characters"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                                    <Input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="h-12 bg-surface-raised border-input"
                                        placeholder="Type exactly as above"
                                    />
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01, boxShadow: "0 8px 28px rgba(124,58,237,0.45)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleChangePassword}
                                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                className="relative overflow-hidden w-full h-12 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                                style={{
                                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                                    boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                                }}
                            >
                                <motion.span
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                                    animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                                />
                                {isChangingPassword ? "Updating..." : "Update Password"}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
