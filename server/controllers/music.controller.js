const pool = require("../config/db");

// ─── GET /api/music/curated ───────────────────────────────────────────────────
// Returns admin-curated playlists. Optionally filter by ?source=youtube|spotify.

const getCurated = async (req, res) => {
    try {
        const { source } = req.query;
        if (source === "spotify") {
            const u = await pool.query(
                `SELECT is_consented_spotify FROM users WHERE user_id = $1`,
                [req.user.user_id]
            );
            if (!u.rows[0]?.is_consented_spotify) {
                return res.status(403).json({
                    error: "CONSENT_REQUIRED",
                    message: "Spotify integration consent is required.",
                });
            }
        }
        const params = [];
        let where = "";
        if (source === "youtube" || source === "spotify") {
            where = " WHERE source = $1";
            params.push(source);
        }
        const result = await pool.query(
            `SELECT id,
                    spotify_playlist_id AS youtube_playlist_id,
                    spotify_playlist_id AS playlist_id,
                    name, description, image_url, source, created_at
             FROM curated_playlists${where} ORDER BY created_at DESC`,
            params
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("getCurated error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get curated playlists" });
    }
};

// ─── POST /api/music/curated ──────────────────────────────────────────────────
// Admin: add a playlist to the curated list.
// source='youtube': accepts bare PLxxxxxxx ID or full YouTube URL
// source='spotify': accepts bare ID, spotify:playlist:ID URI, or open.spotify.com URL

const addCurated = async (req, res) => {
    try {
        const { youtube_playlist_id, name, description, image_url, source = "youtube" } = req.body;
        if (!youtube_playlist_id || !name) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "youtube_playlist_id and name are required." });
        }
        if (source !== "youtube" && source !== "spotify") {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "source must be 'youtube' or 'spotify'." });
        }

        let playlistId = youtube_playlist_id.trim();

        if (source === "spotify") {
            // Accept: open.spotify.com/playlist/ID, spotify:playlist:ID, or bare ID
            if (playlistId.includes("open.spotify.com/playlist/")) {
                playlistId = playlistId.split("playlist/")[1].split("?")[0];
            } else if (playlistId.startsWith("spotify:playlist:")) {
                playlistId = playlistId.replace("spotify:playlist:", "");
            }
        } else {
            // YouTube: extract ?list= from full URL
            if (playlistId.includes("youtube.com") || playlistId.includes("youtu.be")) {
                try {
                    const url = new URL(playlistId);
                    playlistId = url.searchParams.get("list") || playlistId;
                } catch {
                    // Not a valid URL — use as-is
                }
            }
        }

        const result = await pool.query(
            `INSERT INTO curated_playlists (spotify_playlist_id, name, description, image_url, added_by, source)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (spotify_playlist_id) DO UPDATE SET name=$2, description=$3, image_url=$4, source=$6
             RETURNING id,
                       spotify_playlist_id AS youtube_playlist_id,
                       spotify_playlist_id AS playlist_id,
                       name, description, image_url, source, created_at`,
            [playlistId, name, description || null, image_url || null, req.user.user_id, source]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("addCurated error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to add curated playlist" });
    }
};

// ─── DELETE /api/music/curated/:id ───────────────────────────────────────────
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

module.exports = { getCurated, addCurated, removeCurated };
