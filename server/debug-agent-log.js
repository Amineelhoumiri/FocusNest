/**
 * Debug-mode NDJSON (session bca148). Do not log secrets or PII.
 * Writes one JSON line per event to the workspace log file so we have evidence if HTTP ingest is unavailable.
 */
const fs = require("fs");
const path = require("path");

// #region agent log
/** Preferred path (debug ingest). Some environments deny writes under `.cursor` (EPERM). */
const DEBUG_LOG_PATH = path.join(__dirname, "..", ".cursor", "debug-bca148.log");
const DEBUG_LOG_FALLBACK_PATH = path.join(__dirname, "..", "debug-bca148.log");

function appendDebugLine(filePath, line) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, line);
}

function agentDebugLog(payload) {
    const entry = {
        sessionId: "bca148",
        timestamp: Date.now(),
        ...payload,
    };
    const line = `${JSON.stringify(entry)}\n`;
    try {
        appendDebugLine(DEBUG_LOG_PATH, line);
    } catch (e) {
        try {
            appendDebugLine(DEBUG_LOG_FALLBACK_PATH, line);
            if (process.env.NODE_ENV !== "production") {
                console.error(
                    "[debug-agent-log] primary path failed, using fallback:",
                    e && e.message,
                    DEBUG_LOG_FALLBACK_PATH
                );
            }
        } catch (e2) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[debug-agent-log] write failed:", e && e.message, DEBUG_LOG_PATH, e2 && e2.message);
            }
        }
    }
    fetch("http://127.0.0.1:7333/ingest/12dc1d1b-7d7e-49af-9577-0e593ee594fa", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "bca148",
        },
        body: JSON.stringify(entry),
    }).catch(() => {});
}
// #endregion

module.exports = { agentDebugLog };
