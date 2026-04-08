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
        const requestHost = `${req.protocol}://${req.get("host")}`;
        const url = spotifyService.getAuthUrl(state, requestHost);
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
    const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;

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

        const consentCheck = await pool.query(
            `SELECT is_consented_spotify FROM users WHERE user_id = $1`,
            [userId]
        );
        if (!consentCheck.rows[0]?.is_consented_spotify) {
            console.warn("🎵 [callback] Spotify OAuth blocked — user has not consented to Spotify integration:", userId);
            return res.redirect(`${clientUrl}/spotify?error=consent_required`);
        }

        // Step 2: Exchange auth code for tokens
        // The redirect URI must match what was used in getAuthUrl exactly
        const requestHost = `${req.protocol}://${req.get("host")}`;
        let tokens;
        try {
            tokens = await spotifyService.exchangeCode(code, requestHost);
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
            const SCOPES_STR = "user-read-private,user-read-currently-playing,user-read-playback-state,user-modify-playback-state,playlist-read-private,playlist-read-collaborative,streaming";
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
        const errClientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;
        return res.redirect(`${errClientUrl}/spotify?error=callback_failed`);
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

        // Check if the stored token has the scopes needed for playback
        const scopeRow = await pool.query(
            `SELECT scopes FROM spotify_accounts WHERE user_id = $1`, [req.user.user_id]
        );
        const scopes = scopeRow.rows[0]?.scopes || "";
        const needsReauth = !scopes.includes("streaming") || !scopes.includes("user-modify-playback-state");

        return res.json({ connected: true, display_name: displayName, needs_reauth: needsReauth });
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

        const playlistIdMatch = String(context_uri).match(/^spotify:playlist:([A-Za-z0-9]+)$/);
        if (!playlistIdMatch) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Only spotify:playlist: URIs are supported.",
            });
        }

        const curatedCheck = await pool.query(
            `SELECT 1 FROM curated_playlists WHERE source = $1 AND spotify_playlist_id = $2`,
            ["spotify", playlistIdMatch[1]]
        );
        if (curatedCheck.rows.length === 0) {
            return res.status(403).json({
                error: "NOT_ALLOWED",
                message: "Only focus curated playlists can be played from FocusNest.",
            });
        }

        const accessToken = await getValidAccessToken(req.user.user_id);
        if (!accessToken) {
            return res.status(403).json({ error: "NOT_CONNECTED", message: "Spotify not connected." });
        }

        console.log(`🎵 playPlaylist — context_uri: ${context_uri} | device_id: ${device_id || "none"}`);

        // Strategy for Web Playback SDK devices:
        // 1. Try playing directly on the SDK device (fastest path)
        // 2. If that fails, transfer playback to the device and retry
        // 3. If transfer also fails, play without a specific device (uses Spotify's active device)
        let played = false;

        // Attempt 1: play directly on the SDK device
        try {
            await spotifyService.playContext(accessToken, context_uri, device_id || null);
            played = true;
            console.log("🎵 playPlaylist: success on attempt 1");
        } catch (err1) {
            console.warn("🎵 playPlaylist attempt 1 failed:", err1.message);
        }

        // Attempt 2: transfer first, wait, then retry
        if (!played && device_id) {
            try {
                await spotifyService.transferPlayback(accessToken, device_id);
                await new Promise((r) => setTimeout(r, 1200));
                await spotifyService.playContext(accessToken, context_uri, device_id);
                played = true;
                console.log("🎵 playPlaylist: success on attempt 2 (after transfer)");
            } catch (err2) {
                console.warn("🎵 playPlaylist attempt 2 failed:", err2.message);
            }
        }

        // Attempt 3: play without specifying device (falls back to Spotify's active device)
        if (!played) {
            await spotifyService.playContext(accessToken, context_uri, null);
            console.log("🎵 playPlaylist: success on attempt 3 (no device_id)");
        }
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

// ─── 8. GET /api/spotify/token ────────────────────────────────────────────────
// Returns a valid, auto-refreshed access token for the Web Playback SDK.

const getToken = async (req, res) => {
    try {
        const accessToken = await getValidAccessToken(req.user.user_id);
        if (!accessToken) {
            return res.status(403).json({ error: "NOT_CONNECTED", message: "Spotify not connected." });
        }
        return res.json({ access_token: accessToken });
    } catch (err) {
        console.error("getToken error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get token" });
    }
};

// ─── 9. GET /api/spotify/curated ─────────────────────────────────────────────
// Returns the admin-curated list of binaural playlists.

const getCurated = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, spotify_playlist_id, name, description, image_url, created_at
             FROM curated_playlists ORDER BY created_at DESC`
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("getCurated error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get curated playlists" });
    }
};

// ─── 10. POST /api/spotify/curated ───────────────────────────────────────────
// Admin: add a playlist to the curated list.

const addCurated = async (req, res) => {
    try {
        const { spotify_playlist_id, name, description, image_url } = req.body;
        if (!spotify_playlist_id || !name) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "spotify_playlist_id and name are required." });
        }
        // Accept full URL (https://open.spotify.com/playlist/ID) or bare ID
        const playlistId = spotify_playlist_id.includes("spotify.com/playlist/")
            ? spotify_playlist_id.split("playlist/")[1].split("?")[0]
            : spotify_playlist_id.replace("spotify:playlist:", "");

        const result = await pool.query(
            `INSERT INTO curated_playlists (spotify_playlist_id, name, description, image_url, added_by)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (spotify_playlist_id) DO UPDATE SET name=$2, description=$3, image_url=$4
             RETURNING *`,
            [playlistId, name, description || null, image_url || null, req.user.user_id]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("addCurated error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to add curated playlist" });
    }
};

// ─── 11. DELETE /api/spotify/curated/:id ─────────────────────────────────────
// Admin: remove a playlist from the curated list.

const removeCurated = async (req, res) => {
    try {
        await pool.query(`DELETE FROM curated_playlists WHERE id = $1`, [req.params.id]);
        return res.status(204).send();
    } catch (err) {
        console.error("removeCurated error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to remove curated playlist" });
    }
};

module.exports = {
    getAuthUrl, handleCallback, getStatus, getNowPlaying, getPlaylists, playPlaylist, disconnect,
    getToken, getCurated, addCurated, removeCurated,
};
