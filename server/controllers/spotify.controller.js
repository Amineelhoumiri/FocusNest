const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");
const spotifyService = require("../services/spotify.service");

// ─── Helper: get a valid (auto-refreshed) access token for a user ─────────────

async function getValidAccessToken(userId) {
    const result = await pool.query(
        `SELECT * FROM spotify_accounts WHERE user_id = $1`,
        [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const accessToken = await decrypt(row.access_token.toString());

    // Refresh if expired or expires within 5 minutes
    const isExpired = new Date(row.expires_at) < new Date(Date.now() + 5 * 60 * 1000);
    if (isExpired) {
        const refreshToken = await decrypt(row.refresh_token.toString());
        const refreshed = await spotifyService.refreshAccessToken(refreshToken);
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

        await pool.query(
            `UPDATE spotify_accounts
             SET access_token = $1, expires_at = $2, refresh_token = $3
             WHERE user_id = $4`,
            [
                await encrypt(refreshed.access_token),
                newExpiresAt,
                await encrypt(refreshed.refresh_token),
                userId,
            ]
        );

        return refreshed.access_token;
    }

    return accessToken;
}

// ─── 1. GET /api/spotify/auth ─────────────────────────────────────────────────
// Returns a Spotify OAuth URL. State encodes the user_id as a signed JWT
// so the callback can identify which user is connecting — no cookie needed.

const getAuthUrl = (req, res) => {
    try {
        const state = jwt.sign(
            { user_id: req.user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );
        const url = spotifyService.getAuthUrl(state);
        console.log("🎵 Spotify auth URL generated:", url);
        return res.json({ url });
    } catch (err) {
        console.error("getAuthUrl error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to generate auth URL" });
    }
};

// ─── 2. GET /api/spotify/callback ────────────────────────────────────────────
// Spotify redirects the user here after they approve (or deny) the app.
// No auth middleware — this is a browser redirect from Spotify's servers.

const handleCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";

    console.log("🎵 Spotify callback hit — code:", !!code, "| state:", !!state, "| error:", error || "none");

    if (error) {
        console.error("🔴 Spotify OAuth error:", error, "| full query:", req.query);
        // error=access_denied → user declined OR app not in their test-user list (Dev Mode)
        // error=invalid_client → client_id / redirect_uri mismatch in Spotify Dashboard
        return res.redirect(`${clientUrl}/spotify?error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
        console.error("🔴 Spotify callback missing code/state | full query:", req.query);
        return res.redirect(`${clientUrl}/spotify?error=missing_params`);
    }

    try {
        // Step 1: Validate state JWT and extract user_id
        let userId;
        try {
            const decoded = jwt.verify(state, process.env.JWT_SECRET);
            userId = decoded.user_id;
        } catch (e) {
            console.error("🔴 [callback] JWT verify failed:", e.message);
            throw e;
        }

        // Step 2: Exchange auth code for tokens
        let tokens;
        try {
            tokens = await spotifyService.exchangeCode(code);
        } catch (e) {
            console.error("🔴 [callback] Code exchange failed:", e.message, e.response?.data || "");
            throw e;
        }
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Step 3: Fetch Spotify profile for display name + user ID
        let profile;
        try {
            profile = await spotifyService.getSpotifyProfile(tokens.access_token);
        } catch (e) {
            console.error("🔴 [callback] Profile fetch failed:", e.message);
            throw e;
        }

        // Step 4: Encrypt all sensitive fields before storing
        let encAccess, encRefresh, encSpotifyId;
        try {
            [encAccess, encRefresh, encSpotifyId] = await Promise.all([
                encrypt(tokens.access_token),
                encrypt(tokens.refresh_token),
                encrypt(profile.id),
            ]);
        } catch (e) {
            console.error("🔴 [callback] KMS encryption failed:", e.message);
            throw e;
        }

        // Step 5: Upsert — manual SELECT+INSERT/UPDATE avoids needing a UNIQUE
        // constraint on user_id (the schema only has a FK, not UNIQUE).
        try {
            const SCOPES_STR = "user-read-currently-playing,user-read-playback-state,user-modify-playback-state,playlist-read-private,playlist-read-collaborative,user-read-private";
            const existing = await pool.query(
                `SELECT spotify_acc_id FROM spotify_accounts WHERE user_id = $1`,
                [userId]
            );

            if (existing.rows.length > 0) {
                await pool.query(
                    `UPDATE spotify_accounts
                     SET spotify_user_id = $1,
                         access_token    = $2,
                         refresh_token   = $3,
                         expires_at      = $4,
                         scopes          = $5
                     WHERE user_id = $6`,
                    [encSpotifyId, encAccess, encRefresh, expiresAt, SCOPES_STR, userId]
                );
            } else {
                await pool.query(
                    `INSERT INTO spotify_accounts
                     (user_id, spotify_user_id, access_token, refresh_token, expires_at, scopes)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [userId, encSpotifyId, encAccess, encRefresh, expiresAt, SCOPES_STR]
                );
            }
        } catch (e) {
            console.error("🔴 [callback] DB upsert failed:", e.message);
            throw e;
        }

        console.log("✅ [callback] Spotify connected for user", userId);
        return res.redirect(`${clientUrl}/spotify?connected=true`);

    } catch (err) {
        console.error("🔴 handleCallback top-level error:", err.message, err.stack?.split("\n")[1] || "");
        const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";
        return res.redirect(`${clientUrl}/spotify?error=callback_failed`);
    }
};

// ─── 3. GET /api/spotify/status ───────────────────────────────────────────────

const getStatus = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT expires_at FROM spotify_accounts WHERE user_id = $1`,
            [req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.json({ connected: false });
        }

        let displayName = null;
        try {
            const accessToken = await getValidAccessToken(req.user.user_id);
            if (accessToken) {
                const profile = await spotifyService.getSpotifyProfile(accessToken);
                displayName = profile.display_name;
            }
        } catch {
            // Token may be stale — still report connected
        }

        return res.json({ connected: true, display_name: displayName });
    } catch (err) {
        console.error("getStatus error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get Spotify status" });
    }
};

// ─── 4. GET /api/spotify/now-playing ─────────────────────────────────────────

const getNowPlaying = async (req, res) => {
    try {
        const accessToken = await getValidAccessToken(req.user.user_id);
        if (!accessToken) {
            return res.status(403).json({ error: "NOT_CONNECTED", message: "Spotify not connected." });
        }

        const track = await spotifyService.getNowPlaying(accessToken);

        if (!track || !track.item) {
            return res.json({ playing: false });
        }

        return res.json({
            playing: track.is_playing,
            track: {
                name:     track.item.name,
                artist:   track.item.artists?.map((a) => a.name).join(", "),
                album:    track.item.album?.name,
                image:    track.item.album?.images?.[0]?.url || null,
                duration: track.item.duration_ms,
                progress: track.progress_ms,
                uri:      track.item.uri,
            },
        });
    } catch (err) {
        console.error("getNowPlaying error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get now playing" });
    }
};

// ─── 5. GET /api/spotify/playlists ───────────────────────────────────────────

const getPlaylists = async (req, res) => {
    try {
        const accessToken = await getValidAccessToken(req.user.user_id);
        if (!accessToken) {
            return res.status(403).json({ error: "NOT_CONNECTED", message: "Spotify not connected." });
        }

        const playlists = await spotifyService.getUserPlaylists(accessToken);

        return res.json(playlists.map((p) => ({
            id:     p.id,
            name:   p.name,
            uri:    p.uri,
            tracks: p.tracks?.total || 0,
            image:  p.images?.[0]?.url || null,
        })));
    } catch (err) {
        console.error("getPlaylists error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get playlists" });
    }
};

// ─── 6. POST /api/spotify/play ────────────────────────────────────────────────

const playPlaylist = async (req, res) => {
    try {
        const { context_uri, device_id } = req.body;
        if (!context_uri) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "context_uri is required." });
        }

        const accessToken = await getValidAccessToken(req.user.user_id);
        if (!accessToken) {
            return res.status(403).json({ error: "NOT_CONNECTED", message: "Spotify not connected." });
        }

        await spotifyService.playContext(accessToken, context_uri, device_id || null);
        return res.status(204).send();
    } catch (err) {
        console.error("playPlaylist error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to start playback. Make sure Spotify is open on a device." });
    }
};

// ─── 7. DELETE /api/spotify/disconnect ───────────────────────────────────────

const disconnect = async (req, res) => {
    try {
        await pool.query(`DELETE FROM spotify_accounts WHERE user_id = $1`, [req.user.user_id]);
        return res.status(204).send();
    } catch (err) {
        console.error("disconnect error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to disconnect Spotify" });
    }
};

module.exports = { getAuthUrl, handleCallback, getStatus, getNowPlaying, getPlaylists, playPlaylist, disconnect };
