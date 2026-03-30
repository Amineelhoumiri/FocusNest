const express = require("express");
const auth    = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { getCurated, addCurated, removeCurated } = require("../controllers/music.controller");

const router = express.Router();

// Curated YouTube playlists — read: any authenticated user; write: admin only
router.get("/curated",        auth,          getCurated);
router.post("/curated",       auth, isAdmin, addCurated);
router.delete("/curated/:id", auth, isAdmin, removeCurated);

module.exports = router;
