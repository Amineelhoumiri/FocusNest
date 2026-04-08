const express = require("express");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { requireSpotifyConsent } = require("../middleware/consent.middleware");
const {
    getAuthUrl,
    handleCallback,
    getStatus,
    getNowPlaying,
    getPlaylists,
    playPlaylist,
    disconnect,
    getToken,
    getCurated,
    addCurated,
    removeCurated,
} = require("../controllers/spotify.controller");

const router = express.Router();

// OAuth
router.get("/auth",      auth, requireSpotifyConsent, getAuthUrl);
router.get("/callback",       handleCallback);

// Status + connection (disconnect must work without consent so users can unlink after revoking)
router.get("/status",    auth, requireSpotifyConsent, getStatus);
router.delete("/disconnect", auth, disconnect);

// Playback
router.get("/now-playing", auth, requireSpotifyConsent, getNowPlaying);
router.get("/playlists",   auth, requireSpotifyConsent, getPlaylists);
router.post("/play",       auth, requireSpotifyConsent, playPlaylist);

// Web Playback SDK token
router.get("/token", auth, requireSpotifyConsent, getToken);

// Curated playlists (read: any user; write: admin only)
router.get("/curated",        auth, requireSpotifyConsent, getCurated);
router.post("/curated",       auth, isAdmin, addCurated);
router.delete("/curated/:id", auth, isAdmin, removeCurated);

module.exports = router;
