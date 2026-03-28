const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { mockAuthMiddleware, TEST_USER } = require("./helpers/mockAuth");

jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(async (v) => Buffer.from(v)),
  decrypt: jest.fn(async (v) => v.toString()),
}));
jest.mock("../services/spotify.service");

const pool = require("../config/db");
const spotifyService = require("../services/spotify.service");
const { encrypt, decrypt } = require("../services/encryption.service");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:8080";

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/spotify", require("../routes/spotify.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  encrypt.mockImplementation(async (v) => Buffer.from(v));
  decrypt.mockImplementation(async (v) => v.toString());
});

describe("GET /api/spotify/auth", () => {
  it("returns 200 with OAuth URL", async () => {
    spotifyService.getAuthUrl.mockReturnValue("https://accounts.spotify.com/authorize?...");

    const res = await request(app).get("/api/spotify/auth");

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("spotify.com");
    expect(spotifyService.getAuthUrl).toHaveBeenCalledWith(expect.any(String));
  });
});

describe("GET /api/spotify/callback", () => {
  const makeState = () =>
    jwt.sign({ user_id: TEST_USER.user_id }, "test-secret", { expiresIn: "10m" });

  it("redirects to /spotify?connected=true on success (new account)", async () => {
    const state = makeState();
    spotifyService.exchangeCode.mockResolvedValue({
      access_token: "acc", refresh_token: "ref", expires_in: 3600,
    });
    spotifyService.getSpotifyProfile.mockResolvedValue({ id: "spotify_user", display_name: "Amine" });
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing account
      .mockResolvedValueOnce({ rows: [] }); // INSERT

    const res = await request(app).get(`/api/spotify/callback?code=abc&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:8080/spotify?connected=true");
  });

  it("redirects to /spotify?connected=true on success (existing account update)", async () => {
    const state = makeState();
    spotifyService.exchangeCode.mockResolvedValue({
      access_token: "acc", refresh_token: "ref", expires_in: 3600,
    });
    spotifyService.getSpotifyProfile.mockResolvedValue({ id: "spotify_user", display_name: "Amine" });
    pool.query
      .mockResolvedValueOnce({ rows: [{ spotify_acc_id: "existing" }] }) // existing account
      .mockResolvedValueOnce({ rows: [] }); // UPDATE

    const res = await request(app).get(`/api/spotify/callback?code=abc&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:8080/spotify?connected=true");
  });

  it("redirects with error when Spotify returns error", async () => {
    const res = await request(app).get("/api/spotify/callback?error=access_denied");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=access_denied");
  });

  it("redirects with error when code or state is missing", async () => {
    const res = await request(app).get("/api/spotify/callback?code=abc");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=missing_params");
  });

  it("redirects with error on invalid JWT state", async () => {
    const res = await request(app).get("/api/spotify/callback?code=abc&state=invalid-jwt");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=callback_failed");
  });
});

describe("GET /api/spotify/status", () => {
  it("returns connected: false when no account", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/spotify/status");

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });

  it("returns connected: true with display_name when account exists", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ expires_at: new Date(Date.now() + 60 * 60 * 1000) }] }) // status check
      .mockResolvedValueOnce({ rows: [{ access_token: Buffer.from("tok"), refresh_token: Buffer.from("ref"), expires_at: new Date(Date.now() + 60 * 60 * 1000) }] }) // getValidAccessToken
      .mockResolvedValueOnce({ rows: [{ scopes: "streaming user-modify-playback-state" }] }); // scopes check

    spotifyService.getSpotifyProfile.mockResolvedValue({ display_name: "Amine" });

    const res = await request(app).get("/api/spotify/status");

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.display_name).toBe("Amine");
  });
});

describe("GET /api/spotify/now-playing", () => {
  it("returns 403 when not connected", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/spotify/now-playing");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("NOT_CONNECTED");
  });

  it("returns playing: false when nothing is playing", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ access_token: Buffer.from("tok"), refresh_token: Buffer.from("ref"), expires_at: new Date(Date.now() + 3600 * 1000) }],
    });
    spotifyService.getNowPlaying.mockResolvedValue(null);

    const res = await request(app).get("/api/spotify/now-playing");

    expect(res.status).toBe(200);
    expect(res.body.playing).toBe(false);
  });

  it("returns track info when something is playing", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ access_token: Buffer.from("tok"), refresh_token: Buffer.from("ref"), expires_at: new Date(Date.now() + 3600 * 1000) }],
    });
    spotifyService.getNowPlaying.mockResolvedValue({
      is_playing: true,
      progress_ms: 1000,
      item: {
        name: "Test Song",
        artists: [{ name: "Test Artist" }],
        album: { name: "Test Album", images: [{ url: "http://img.jpg" }] },
        duration_ms: 200000,
        uri: "spotify:track:abc",
      },
    });

    const res = await request(app).get("/api/spotify/now-playing");

    expect(res.status).toBe(200);
    expect(res.body.playing).toBe(true);
    expect(res.body.track.name).toBe("Test Song");
    expect(res.body.track.artist).toBe("Test Artist");
  });
});

describe("GET /api/spotify/playlists", () => {
  it("returns 403 when not connected", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/spotify/playlists");

    expect(res.status).toBe(403);
  });

  it("returns formatted playlists", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ access_token: Buffer.from("tok"), refresh_token: Buffer.from("ref"), expires_at: new Date(Date.now() + 3600 * 1000) }],
    });
    spotifyService.getUserPlaylists.mockResolvedValue([
      { id: "p1", name: "Chill", uri: "spotify:playlist:p1", tracks: { total: 10 }, images: [{ url: "http://img.jpg" }] },
    ]);

    const res = await request(app).get("/api/spotify/playlists");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Chill");
    expect(res.body[0].tracks).toBe(10);
  });
});

describe("POST /api/spotify/play", () => {
  it("returns 400 when context_uri is missing", async () => {
    const res = await request(app).post("/api/spotify/play").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-playlist spotify URIs", async () => {
    const res = await request(app)
      .post("/api/spotify/play")
      .send({ context_uri: "spotify:album:abcabcabcabcabcabcabc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 403 NOT_ALLOWED when playlist is not in curated list", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/spotify/play")
      .send({ context_uri: "spotify:playlist:notInCuratedList12" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("NOT_ALLOWED");
    expect(spotifyService.playContext).not.toHaveBeenCalled();
  });

  it("returns 403 NOT_CONNECTED when curated but Spotify not linked", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/spotify/play")
      .send({ context_uri: "spotify:playlist:curatedplaylistid1" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("NOT_CONNECTED");
  });

  it("returns 204 on successful playback start", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })
      .mockResolvedValueOnce({
        rows: [{ access_token: Buffer.from("tok"), refresh_token: Buffer.from("ref"), expires_at: new Date(Date.now() + 3600 * 1000) }],
      });
    spotifyService.playContext.mockResolvedValue();

    const res = await request(app)
      .post("/api/spotify/play")
      .send({ context_uri: "spotify:playlist:curatedplaylistid1" });
    expect(res.status).toBe(204);
  });
});

describe("DELETE /api/spotify/disconnect", () => {
  it("returns 204 and deletes the account", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/spotify/disconnect");

    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM spotify_accounts"),
      [TEST_USER.user_id]
    );
  });
});
