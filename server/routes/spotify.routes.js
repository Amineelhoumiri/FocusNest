const express = require("express");
const auth = require("../middleware/auth");
const {
    getAuthUrl,
    handleCallback,
    getStatus,
    getNowPlaying,
    getPlaylists,
    playPlaylist,
    disconnect,
} = require("../controllers/spotify.controller");

const router = express.Router();

// Generate OAuth URL (user must be logged in)
router.get("/auth", auth, getAuthUrl);

// Spotify redirects here after user approves — no auth middleware
router.get("/callback", handleCallback);

// Check connection status + display name
router.get("/status", auth, getStatus);

// Current playing track
router.get("/now-playing", auth, getNowPlaying);

// User's playlists
router.get("/playlists", auth, getPlaylists);

// Start playback of a playlist URI
router.post("/play", auth, playPlaylist);

// Revoke and delete stored tokens
router.delete("/disconnect", auth, disconnect);

module.exports = router;
