const request = require("supertest");
const express = require("express");

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");

const pool = require("../config/db");
const { TEST_USER } = require("./helpers/mockAuth");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/consent", require("../routes/consent.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/consent/register", () => {
  it("returns 201 and inserts three consent_audit_log rows", async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ user_id: TEST_USER.user_id }] }) // upsert users
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE "user"
        .mockResolvedValueOnce({ rows: [] }) // INSERT core
        .mockResolvedValueOnce({ rows: [] }) // INSERT ai
        .mockResolvedValueOnce({ rows: [] }) // INSERT spotify
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(mockClient);
    pool.query.mockResolvedValueOnce({
      rows: [{
        user_id: TEST_USER.user_id,
        is_consented_core: true,
        is_consented_ai: true,
        is_consented_spotify: false,
      }],
    });

    const res = await request(app)
      .post("/api/consent/register")
      .send({
        user_id: TEST_USER.user_id,
        is_consented_core: true,
        is_consented_ai: true,
        is_consented_spotify: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.is_consented_core).toBe(true);
    expect(res.body.is_consented_ai).toBe(true);
    expect(res.body.is_consented_spotify).toBe(false);
    expect(mockClient.query).toHaveBeenCalledTimes(7);
  });

  it("returns 400 if core consent is not true", async () => {
    const res = await request(app)
      .post("/api/consent/register")
      .send({ is_consented_core: false, is_consented_ai: false, is_consented_spotify: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 403 if body user_id does not match session", async () => {
    const res = await request(app)
      .post("/api/consent/register")
      .send({
        user_id: "99999999-9999-9999-9999-999999999999",
        is_consented_core: true,
      });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/consent", () => {
  it("returns 200 when updating AI consent", async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)                                // BEGIN
        .mockResolvedValueOnce({ rows: [{ is_consented_ai: true }] })   // UPDATE users
        .mockResolvedValueOnce({ rows: [] })                             // INSERT audit log
        .mockResolvedValueOnce(undefined),                               // COMMIT
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/consent")
      .send({ is_consented_ai: true });

    expect(res.status).toBe(200);
    expect(res.body.is_consented_ai).toBe(true);
  });

  it("returns 200 when updating Spotify consent", async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ is_consented_spotify: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/consent")
      .send({ is_consented_spotify: false });

    expect(res.status).toBe(200);
  });

  it("returns 200 and logs two audit entries when updating both fields", async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ is_consented_ai: true, is_consented_spotify: true }] })
        .mockResolvedValueOnce({ rows: [] }) // AI audit
        .mockResolvedValueOnce({ rows: [] }) // Spotify audit
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/consent")
      .send({ is_consented_ai: true, is_consented_spotify: true });

    expect(res.status).toBe(200);
    // BEGIN + UPDATE + 2 audit inserts + COMMIT = 5 calls
    expect(mockClient.query).toHaveBeenCalledTimes(5);
  });

  it("returns 400 when no consent fields provided", async () => {
    const res = await request(app).patch("/api/consent").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("rolls back transaction on DB error", async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)          // BEGIN
        .mockRejectedValueOnce(new Error("DB fail")) // UPDATE fails
        .mockResolvedValueOnce(undefined),           // ROLLBACK
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/consent")
      .send({ is_consented_ai: true });

    expect(res.status).toBe(500);
    const rollbackCall = mockClient.query.mock.calls.find(([q]) => q === "ROLLBACK");
    expect(rollbackCall).toBeDefined();
  });
});

describe("GET /api/consent/history", () => {
  it("returns 200 with consent audit log", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { consent_type: "ai", consent_value: true, consented_at: new Date() },
        { consent_type: "spotify", consent_value: false, consented_at: new Date() },
      ],
    });

    const res = await request(app).get("/api/consent/history");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].consent_type).toBe("ai");
  });

  it("returns empty array when no consent history", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/consent/history");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
