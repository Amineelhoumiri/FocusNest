import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Trash2, Eye, EyeOff, ShieldAlert, FileText, Database, MessageSquare, Users, Music, Plus, Waves, Youtube, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CuratedPlaylist {
    id: number;
    youtube_playlist_id: string;
    playlist_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    source: "youtube" | "spotify";
}

interface UsageLog {
    id: number;
    user_id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
    created_at: string;
}

interface ChatTokenStats {
    summary: {
        total_messages: string;
        total_tokens: string;
        user_tokens: string;
        assistant_tokens: string;
        unique_users: string;
    };
    daily: { date: string; tokens: string; messages: string }[];
}

interface Prompt {
    key: string;
    prompt: string;
    updated_at: string;
}

interface UserActivityRow {
    user_id: string;
    full_name: string | null;
    joined_at: string;
    last_login_at: string | null;
    focus_score: number;
    is_consented_ai: boolean;
    is_consented_spotify: boolean;
    total_tasks: string;
    tasks_done: string;
    messages_sent: string;
    total_messages: string;
    tokens_consumed: string;
    ai_calls: string;
    total_sessions: string;
    last_active_at: string | null;
}

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<"usage" | "chat" | "prompts" | "playlists" | "activity">("usage");

    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [chatStats, setChatStats] = useState<ChatTokenStats | null>(null);
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [curated, setCurated] = useState<CuratedPlaylist[]>([]);
    const [userActivity, setUserActivity] = useState<UserActivityRow[]>([]);
    const [newPlaylist, setNewPlaylist] = useState<{ youtube_playlist_id: string; name: string; description: string; source: "youtube" | "spotify" }>({ youtube_playlist_id: "", name: "", description: "", source: "youtube" });
    const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [newPrompt, setNewPrompt] = useState({ key: "", prompt: "" });
    const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (!user.is_admin) {
            toast.error("Unauthorized. Admin access required.");
            navigate("/dashboard");
            return;
        }
        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usageRes, chatRes, promptsRes, curatedRes, activityRes] = await Promise.all([
                fetch("/api/admin/usage"),
                fetch("/api/admin/chat-tokens"),
                fetch("/api/admin/prompts"),
                fetch("/api/music/curated", { credentials: "include" }),
                fetch("/api/admin/masked-activity"),
            ]);

            if (usageRes.ok) setUsageLogs(await usageRes.json());
            if (chatRes.ok) setChatStats(await chatRes.json());
            if (promptsRes.ok) setPrompts(await promptsRes.json());
            if (curatedRes.ok) setCurated(await curatedRes.json());
            if (activityRes.ok) {
                const data = await activityRes.json();
                setUserActivity(data.users ?? []);
            }

        } catch (err) {
            toast.error("Failed to load admin data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPlaylist = async () => {
        if (!newPlaylist.youtube_playlist_id.trim() || !newPlaylist.name.trim()) {
            toast.error("Playlist ID/URL and name are required.");
            return;
        }
        setIsAddingPlaylist(true);
        try {
            const res = await fetch("/api/music/curated", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPlaylist),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            toast.success("Playlist added!");
            setNewPlaylist({ youtube_playlist_id: "", name: "", description: "", source: "youtube" });
            fetchData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add playlist");
        } finally {
            setIsAddingPlaylist(false);
        }
    };

    const handleRemovePlaylist = async (id: number, name: string) => {
        if (!confirm(`Remove "${name}" from curated playlists?`)) return;
        try {
            await fetch(`/api/music/curated/${id}`, { method: "DELETE", credentials: "include" });
            toast.success("Playlist removed.");
            fetchData();
        } catch {
            toast.error("Failed to remove playlist.");
        }
    };

    const handlePromptCreate = async () => {
        if (!newPrompt.key.trim() || !newPrompt.prompt.trim()) {
            toast.error("Both key and prompt content are required.");
            return;
        }
        setIsCreatingPrompt(true);
        try {
            const res = await fetch("/api/admin/prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: newPrompt.key.trim(), prompt: newPrompt.prompt.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message ?? "Failed to create prompt");
            }
            toast.success(`Prompt "${newPrompt.key}" created`);
            setNewPrompt({ key: "", prompt: "" });
            fetchData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error creating prompt");
        } finally {
            setIsCreatingPrompt(false);
        }
    };

    const handlePromptUpdate = async (key: string, newPrompt: string) => {
        setIsSaving(key);
        try {
            const res = await fetch(`/api/admin/prompts/${key}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: newPrompt }),
            });
            if (!res.ok) throw new Error("Failed to update prompt");
            toast.success(`Prompt "${key}" updated successfully`);
            fetchData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error updating prompt");
        } finally {
            setIsSaving(null);
        }
    };

    const handlePromptDelete = async (key: string) => {
        if (!confirm(`Are you sure you want to delete the prompt "${key}"? This might break dependent AI features.`)) return;
        try {
            const res = await fetch(`/api/admin/prompts/${key}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete prompt");
            toast.success("Prompt deleted");
            fetchData();
        } catch (err) {
            toast.error("Error deleting prompt");
        }
    };

    const handleUserDelete = async (userId: string, name?: string | null) => {
        const label = name?.trim() ? `${name} (${userId.slice(0, 8)}…)` : userId;
        const ok = prompt(
            `Type DELETE to permanently remove this user and all associated data:\n\n${label}\n\nThis cannot be undone.`
        );
        if (ok !== "DELETE") return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({})) as { message?: string };
                throw new Error(data.message ?? "Failed to delete user");
            }
            toast.success("User deleted.");
            setUserActivity((prev) => prev.filter((u) => u.user_id !== userId));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete user.");
        }
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Aggregate metrics from openai_usage
    const totalApiCalls = usageLogs.length;
    const totalApiTokens = usageLogs.reduce((acc, log) => acc + (log.total_tokens || 0), 0);
    const totalApiCost = usageLogs.reduce((acc, log) => acc + (Number(log.cost) || 0), 0);

    // Chat message totals
    const chatTotalMessages = parseInt(chatStats?.summary.total_messages || "0");
    const chatTotalTokens = parseInt(chatStats?.summary.total_tokens || "0");
    const chatUserTokens = parseInt(chatStats?.summary.user_tokens || "0");
    const chatAssistantTokens = parseInt(chatStats?.summary.assistant_tokens || "0");
    const chatUniqueUsers = parseInt(chatStats?.summary.unique_users || "0");

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <ShieldAlert className="w-6 h-6 text-amber-500" />
                        Admin Control Panel
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage system prompts and monitor API usage costs.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-raised rounded-xl max-w-2xl mb-6">
                <button
                    onClick={() => setActiveTab("usage")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === "usage" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Database className="w-4 h-4" /> API Logs
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === "chat" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <MessageSquare className="w-4 h-4" /> Chat Tokens
                </button>
                <button
                    onClick={() => setActiveTab("prompts")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === "prompts" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <FileText className="w-4 h-4" /> Prompts
                </button>
                <button
                    onClick={() => setActiveTab("playlists")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === "playlists" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Music className="w-4 h-4" /> Playlists
                </button>
                <button
                    onClick={() => setActiveTab("activity")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === "activity" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Activity className="w-4 h-4" /> Activity
                </button>
            </div>

            {/* API Usage Tab */}
            {activeTab === "usage" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-card p-6 rounded-2xl">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Total API Calls</p>
                            <h3 className="text-3xl font-bold text-foreground">{totalApiCalls}</h3>
                        </div>
                        <div className="glass-card p-6 rounded-2xl">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Total Tokens Used</p>
                            <h3 className="text-3xl font-bold text-foreground">{totalApiTokens.toLocaleString()}</h3>
                            <p className="text-xs text-muted-foreground mt-1">across all AI breakdown / prioritize calls</p>
                        </div>
                        <div className="glass-card p-6 rounded-2xl border-amber-500/30">
                            <p className="text-sm font-medium text-amber-500 mb-1">Estimated Cost (USD)</p>
                            <h3 className="text-3xl font-bold text-amber-500">${totalApiCost.toFixed(4)}</h3>
                            <p className="text-xs text-amber-500/60 mt-1">from token_costs.json pricing</p>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-surface-raised/50 border-b border-border/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">User ID</th>
                                        <th className="px-6 py-4 font-medium">Model</th>
                                        <th className="px-6 py-4 font-medium text-right">Prompt</th>
                                        <th className="px-6 py-4 font-medium text-right">Completion</th>
                                        <th className="px-6 py-4 font-medium text-right">Total</th>
                                        <th className="px-6 py-4 font-medium text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {usageLogs.slice(0, 50).map((log) => (
                                        <tr key={log.id} className="hover:bg-accent/20 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap opacity-70">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs opacity-70 truncate max-w-[120px]">
                                                {log.user_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
                                                    {log.model}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right opacity-70">{(log.prompt_tokens || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right opacity-70">{(log.completion_tokens || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-medium">{(log.total_tokens || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-amber-500">${Number(log.cost).toFixed(5)}</td>
                                        </tr>
                                    ))}
                                    {usageLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                No usage logs recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {usageLogs.length > 50 && (
                                <div className="p-4 text-center text-xs text-muted-foreground bg-surface-raised/30 border-t border-border/30">
                                    Showing latest 50 logs.
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Chat Tokens Tab */}
            {activeTab === "chat" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Messages</p>
                            <h3 className="text-2xl font-bold text-foreground">{chatTotalMessages.toLocaleString()}</h3>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Tokens</p>
                            <h3 className="text-2xl font-bold text-foreground">{chatTotalTokens.toLocaleString()}</h3>
                        </div>
                        <div className="glass-card p-5 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Users className="w-3 h-3 text-violet-400" />
                                <p className="text-xs font-medium text-muted-foreground">Unique Users</p>
                            </div>
                            <h3 className="text-2xl font-bold text-foreground">{chatUniqueUsers}</h3>
                        </div>
                        <div className="glass-card p-5 rounded-2xl border-violet-500/20">
                            <p className="text-xs font-medium text-violet-400 mb-1">Avg Tokens / Message</p>
                            <h3 className="text-2xl font-bold text-violet-400">
                                {chatTotalMessages > 0 ? Math.round(chatTotalTokens / chatTotalMessages).toLocaleString() : "—"}
                            </h3>
                        </div>
                    </div>

                    {/* User vs assistant breakdown */}
                    <div className="glass-card p-6 rounded-2xl space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Token Breakdown by Role</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>User messages</span>
                                    <span>{chatUserTokens.toLocaleString()} tokens ({chatTotalTokens > 0 ? Math.round((chatUserTokens / chatTotalTokens) * 100) : 0}%)</span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                                        style={{ width: chatTotalTokens > 0 ? `${(chatUserTokens / chatTotalTokens) * 100}%` : "0%" }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Assistant messages</span>
                                    <span>{chatAssistantTokens.toLocaleString()} tokens ({chatTotalTokens > 0 ? Math.round((chatAssistantTokens / chatTotalTokens) * 100) : 0}%)</span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-700"
                                        style={{ width: chatTotalTokens > 0 ? `${(chatAssistantTokens / chatTotalTokens) * 100}%` : "0%" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily breakdown table */}
                    <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border/50 bg-surface-raised/30">
                            <h3 className="text-sm font-bold text-foreground">Daily Token Usage (last 30 days)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-surface-raised/50 border-b border-border/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Date</th>
                                        <th className="px-6 py-3 font-medium text-right">Messages</th>
                                        <th className="px-6 py-3 font-medium text-right">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {(chatStats?.daily || []).map((row) => (
                                        <tr key={row.date} className="hover:bg-accent/20 transition-colors">
                                            <td className="px-6 py-3 opacity-80">{new Date(row.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                                            <td className="px-6 py-3 text-right opacity-70">{parseInt(row.messages).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right font-medium text-violet-400">{parseInt(row.tokens).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {(!chatStats?.daily || chatStats.daily.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                                No chat message data yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Prompts Tab */}
            {activeTab === "prompts" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm">
                        <Eye className="w-5 h-5 shrink-0" />
                        <p>These system prompts control how the AI assistant behaves across the platform. Editing them will immediately affect all users.</p>
                    </div>

                    {/* Create new prompt */}
                    <div className="glass-card rounded-2xl p-5 space-y-3 border border-border/50">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            New prompt
                        </p>
                        <input
                            value={newPrompt.key}
                            onChange={(e) => setNewPrompt((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                            placeholder="key (e.g. coach_persona)"
                            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all font-mono"
                        />
                        <textarea
                            value={newPrompt.prompt}
                            onChange={(e) => setNewPrompt((p) => ({ ...p, prompt: e.target.value }))}
                            placeholder="System prompt content…"
                            rows={5}
                            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all resize-none"
                        />
                        <button
                            onClick={handlePromptCreate}
                            disabled={isCreatingPrompt || !newPrompt.key.trim() || !newPrompt.prompt.trim()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all"
                        >
                            {isCreatingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create prompt
                        </button>
                    </div>

                    <div className="space-y-6">
                        {prompts.map((p) => (
                            <PromptEditor
                                key={p.key}
                                promptData={p}
                                onSave={handlePromptUpdate}
                                onDelete={handlePromptDelete}
                                isSaving={isSaving === p.key}
                            />
                        ))}
                        {prompts.length === 0 && (
                            <div className="glass-card p-12 text-center rounded-2xl border-dashed">
                                <p className="text-muted-foreground">No system prompts found in the database.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
            {/* Playlists Tab */}
            {activeTab === "playlists" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">

                    <div className="flex items-center gap-2 p-4 rounded-xl text-sm"
                        style={{ background: "hsl(174 55% 40% / 0.08)", border: "1px solid hsl(174 55% 40% / 0.2)", color: "hsl(174 55% 40%)" }}>
                        <Waves className="w-4 h-4 shrink-0" />
                        <p>Add YouTube playlists (free, no account needed) or Spotify playlists (shown to Premium users).</p>
                    </div>

                    {/* Add form */}
                    <div className="glass-card rounded-2xl p-5 space-y-3 border border-border/50">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">Add playlist</p>
                            {/* Source toggle */}
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-raised">
                                <button
                                    onClick={() => setNewPlaylist((p) => ({ ...p, source: "youtube" }))}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${newPlaylist.source === "youtube" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                                    YouTube
                                </button>
                                <button
                                    onClick={() => setNewPlaylist((p) => ({ ...p, source: "spotify" }))}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${newPlaylist.source === "spotify" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <span className="w-3.5 h-3.5 flex items-center justify-center" style={{ color: "#1DB954" }}>♫</span>
                                    Spotify
                                </button>
                            </div>
                        </div>
                        <input
                            value={newPlaylist.youtube_playlist_id}
                            onChange={(e) => setNewPlaylist((p) => ({ ...p, youtube_playlist_id: e.target.value }))}
                            placeholder={newPlaylist.source === "spotify"
                                ? "Spotify playlist URL, URI, or ID (e.g. spotify:playlist:37i9dQZF1DX...)"
                                : "YouTube playlist URL or ID (e.g. PLxxxxxxx or https://youtube.com/playlist?list=PLxxxxxxx)"}
                            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <input
                            value={newPlaylist.name}
                            onChange={(e) => setNewPlaylist((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Display name (e.g. 40Hz Brain Food)"
                            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <input
                            value={newPlaylist.description}
                            onChange={(e) => setNewPlaylist((p) => ({ ...p, description: e.target.value }))}
                            placeholder="Short description (optional)"
                            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <button
                            onClick={handleAddPlaylist}
                            disabled={isAddingPlaylist}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                            style={{ background: "hsl(var(--primary))" }}
                        >
                            {isAddingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Playlist
                        </button>
                    </div>

                    {/* Curated list */}
                    <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                        <div className="px-5 py-3 border-b border-border/50 bg-surface-raised/30 flex items-center gap-2">
                            <Music className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">
                                {curated.length} curated playlist{curated.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        {curated.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-10">No playlists yet. Add one above.</p>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {curated.map((pl) => (
                                    <div key={pl.id} className="flex items-center gap-3 px-5 py-3">
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                            style={pl.source === "spotify"
                                                ? { background: "rgba(29,185,84,0.10)", border: "1px solid rgba(29,185,84,0.20)" }
                                                : { background: "hsl(174 55% 40% / 0.1)", border: "1px solid hsl(174 55% 40% / 0.2)" }}
                                        >
                                            {pl.source === "spotify"
                                                ? <span className="text-sm font-bold" style={{ color: "#1DB954" }}>♫</span>
                                                : <Youtube className="w-4 h-4 text-red-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                                                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase"
                                                    style={pl.source === "spotify"
                                                        ? { background: "rgba(29,185,84,0.12)", color: "#1DB954" }
                                                        : { background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
                                                    {pl.source}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground/50 truncate">
                                                {pl.youtube_playlist_id}{pl.description ? ` · ${pl.description}` : ""}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemovePlaylist(pl.id, pl.name)}
                                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Activity Tab — FR-A-02 Masked Data View */}
            {activeTab === "activity" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                    {/* Privacy notice + refresh */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
                        <EyeOff className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>
                            Content is <strong>end-to-end encrypted</strong> with AWS KMS and never decrypted server-side.
                            You can see metadata (timestamps, token counts, status) but task names and chat messages are always masked.
                        </p>
                        <button
                            onClick={fetchData}
                            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 hover:bg-violet-500/30 transition-all"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </button>
                    </div>

                    {/* Unified user overview table */}
                    <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/30">
                                        <th className="px-4 py-3 font-medium text-left text-muted-foreground">User</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Status</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Joined</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Last Login</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Score</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Consents</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Sessions</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Tasks</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Done %</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">Msgs</th>
                                        <th className="px-4 py-3 font-medium text-center text-muted-foreground">AI Calls</th>
                                        <th className="px-4 py-3 font-medium text-right text-muted-foreground">Tokens</th>
                                        <th className="px-4 py-3 font-medium text-left text-muted-foreground">Last Active</th>
                                        <th className="px-4 py-3 font-medium text-right text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {userActivity.length === 0 ? (
                                        <tr><td colSpan={14} className="px-4 py-10 text-center text-muted-foreground/50">No user data yet.</td></tr>
                                    ) : userActivity.map((u) => {
                                        const tasks     = parseInt(u.total_tasks);
                                        const done      = parseInt(u.tasks_done);
                                        const pct       = tasks > 0 ? Math.round((done / tasks) * 100) : 0;
                                        const tokens    = parseInt(u.tokens_consumed);
                                        const msgsSent  = parseInt(u.messages_sent);

                                        // Activity status based on last_active_at
                                        let status: "active" | "idle" | "dormant" = "dormant";
                                        if (u.last_active_at) {
                                            const daysSince = (Date.now() - new Date(u.last_active_at).getTime()) / 86_400_000;
                                            if (daysSince < 1)  status = "active";
                                            else if (daysSince < 7) status = "idle";
                                        }

                                        const statusCfg = {
                                            active:  { label: "Active",  cls: "bg-emerald-500/15 text-emerald-400" },
                                            idle:    { label: "Idle",    cls: "bg-amber-500/15 text-amber-400"     },
                                            dormant: { label: "Dormant", cls: "bg-muted/40 text-muted-foreground"  },
                                        }[status];

                                        // Flag heavy AI users (>500 tokens)
                                        const highToken = tokens > 500;

                                        return (
                                            <tr key={u.user_id} className="hover:bg-muted/20 transition-colors">
                                                {/* User */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-[11px] font-bold text-violet-400 shrink-0">
                                                            {(u.full_name ?? u.user_id).slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-foreground/80 leading-none mb-0.5">
                                                                {u.full_name ?? "—"}
                                                            </p>
                                                            <p className="font-mono text-[10px] text-muted-foreground/50">{u.user_id.slice(0, 8)}…</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.cls}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                {/* Joined */}
                                                <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums text-center">
                                                    {new Date(u.joined_at).toLocaleDateString()}
                                                </td>
                                                {/* Last Login */}
                                                <td className="px-4 py-3 text-xs tabular-nums text-center">
                                                    {u.last_login_at
                                                        ? <span className="text-muted-foreground/60">{new Date(u.last_login_at).toLocaleString()}</span>
                                                        : <span className="text-muted-foreground/30">—</span>}
                                                </td>
                                                {/* Focus Score */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-semibold tabular-nums text-sm ${(u.focus_score ?? 0) > 100 ? "text-emerald-400" : "text-muted-foreground/60"}`}>
                                                        {u.focus_score ?? 0}
                                                    </span>
                                                </td>
                                                {/* Consents */}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span title="AI consent" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.is_consented_ai ? "bg-violet-500/20 text-violet-400" : "bg-muted/30 text-muted-foreground/30"}`}>AI</span>
                                                        <span title="Spotify consent" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.is_consented_spotify ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/30 text-muted-foreground/30"}`}>♫</span>
                                                    </div>
                                                </td>
                                                {/* Sessions */}
                                                <td className="px-4 py-3 text-center font-semibold text-foreground/80">{u.total_sessions}</td>
                                                {/* Tasks */}
                                                <td className="px-4 py-3 text-center text-foreground/80">{tasks}</td>
                                                {/* Done % */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <div className="w-12 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">{pct}%</span>
                                                    </div>
                                                </td>
                                                {/* Messages sent */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-semibold tabular-nums ${msgsSent > 50 ? "text-amber-400" : "text-foreground/70"}`}>
                                                        {msgsSent}
                                                    </span>
                                                    {msgsSent > 50 && <span className="ml-1 text-[10px] text-amber-400/70">⚠</span>}
                                                </td>
                                                {/* AI calls */}
                                                <td className="px-4 py-3 text-center text-violet-400 font-semibold tabular-nums">{u.ai_calls}</td>
                                                {/* Tokens */}
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    <span className={highToken ? "text-red-400 font-semibold" : "text-muted-foreground/60"}>
                                                        {tokens.toLocaleString()}
                                                    </span>
                                                    {highToken && <span className="ml-1 text-[10px] text-red-400/70">🔥</span>}
                                                </td>
                                                {/* Last active */}
                                                <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums">
                                                    {u.last_active_at ? new Date(u.last_active_at).toLocaleString() : "Never"}
                                                </td>
                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUserDelete(u.user_id, u.full_name)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/15 border border-destructive/20 transition-colors"
                                                        title="Delete user (permanent)"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </motion.div>
            )}

        </div>
    );
};

// Extracted Editor Component to manage local un-saved state per prompt
const PromptEditor = ({
    promptData,
    onSave,
    onDelete,
    isSaving
}: {
    promptData: Prompt,
    onSave: (k: string, p: string) => void,
    onDelete: (k: string) => void,
    isSaving: boolean
}) => {
    const [localValue, setLocalValue] = useState(promptData.prompt);
    const isDirty = localValue !== promptData.prompt;

    return (
        <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
            <div className="flex items-center justify-between p-4 bg-surface-raised/50 border-b border-border/50">
                <div>
                    <h3 className="font-bold text-foreground font-mono">{promptData.key}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Last updated: {new Date(promptData.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onDelete(promptData.key)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete prompt configuration"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onSave(promptData.key, localValue)}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDirty
                            ? "bg-primary text-primary-foreground btn-glow"
                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        }`}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
            <div className="p-4">
                <textarea
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="w-full h-64 p-4 rounded-xl bg-background border border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm font-mono leading-relaxed resize-y custom-scrollbar"
                    placeholder="Enter system prompt instructions..."
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
