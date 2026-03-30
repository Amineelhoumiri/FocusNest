const express = require("express");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
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
router.get("/auth",      auth, getAuthUrl);
router.get("/callback",       handleCallback);

// Status + connection
router.get("/status",    auth, getStatus);
router.delete("/disconnect", auth, disconnect);

// Playback
router.get("/now-playing", auth, getNowPlaying);
router.get("/playlists",   auth, getPlaylists);
router.post("/play",       auth, playPlaylist);

// Web Playback SDK token
router.get("/token", auth, getToken);

// Curated playlists (read: any user; write: admin only)
router.get("/curated",        auth,          getCurated);
router.post("/curated",       auth, isAdmin, addCurated);
router.delete("/curated/:id", auth, isAdmin, removeCurated);

module.exports = router;
