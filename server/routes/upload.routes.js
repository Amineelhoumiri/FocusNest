const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const auth = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * POST /api/upload/parse
 * Accepts a file upload and returns extracted text content.
 * Supports: PDF, plain text, and other text-based files.
 */
router.post("/parse", auth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { mimetype, originalname, buffer } = req.file;
  const isPdf = mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf");

  try {
    if (isPdf) {
      const result = await pdfParse(buffer);
      return res.json({ text: result.text, pages: result.numpages ?? null });
    }

    // For text-based files decode as UTF-8
    const text = buffer.toString("utf-8");
    return res.json({ text });
  } catch (err) {
    console.error("File parse error:", err.message);
    return res.status(422).json({ error: "Could not extract text from this file." });
  }
});

module.exports = router;
