const request = require("supertest");
const express = require("express");

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(async (s) => `enc:${s}`),
}));

const pool = require("../config/db");
const { encrypt } = require("../services/encryption.service");

const VALID_SESSION_ID = "cccccccc-cccc-4ccc-aaaa-cccccccccccc";
const VALID_TASK_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/sessions", require("../routes/sessions.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/sessions", () => {
  it("returns 201 on valid session start", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ session_id: VALID_SESSION_ID, task_id: VALID_TASK_ID, is_active: true }],
      });

    const res = await request(app)
      .post("/api/sessions")
      .send({ task_id: VALID_TASK_ID });

    expect(res.status).toBe(201);
    expect(res.body.is_active).toBe(true);
  });

  it("returns 409 when user already has an active session", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ session_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" }],
    });

    const res = await request(app)
      .post("/api/sessions")
      .send({ task_id: VALID_TASK_ID });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SESSION_ACTIVE");
    expect(res.body.active_session_id).toBeDefined();
  });

  it("returns 400 when task_id is missing", async () => {
    const res = await request(app).post("/api/sessions").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when task_id is not a valid UUID", async () => {
    const res = await request(app).post("/api/sessions").send({ task_id: "not-a-uuid" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/sessions", () => {
  it("returns 200 with session list", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { session_id: VALID_SESSION_ID, is_active: false, outcome: "completed" },
      ],
    });

    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].session_id).toBe(VALID_SESSION_ID);
  });

  it("returns empty array when no sessions", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/sessions/:session_id", () => {
  it("returns 200 on ending an active session", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ session_id: VALID_SESSION_ID, is_active: false, outcome: "completed" }],
    });

    const res = await request(app)
      .patch(`/api/sessions/${VALID_SESSION_ID}`)
      .send({ outcome: "completed", reflection_type: "none" });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it("returns 404 when session not found or already ended", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch(`/api/sessions/${VALID_SESSION_ID}`)
      .send({ outcome: "abandoned" });

    expect(res.status).toBe(404);
  });

  it("stores encrypted reflection_content when provided", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ session_id: VALID_SESSION_ID, is_active: false, reflection_type: "Distraction" }],
    });

    const res = await request(app)
      .patch(`/api/sessions/${VALID_SESSION_ID}`)
      .send({ outcome: "abandoned", reflection_type: "Distraction", reflection_content: "  Phone rang  " });

    expect(res.status).toBe(200);
    expect(encrypt).toHaveBeenCalledWith("Phone rang");
  });

  it("returns 400 for invalid session_id UUID", async () => {
    const res = await request(app).patch("/api/sessions/bad-id").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/sessions/:session_id/switch", () => {
  it("returns 200 on valid task switch", async () => {
    const NEW_TASK_ID = "dddddddd-dddd-4ddd-aaaa-dddddddddddd";
    pool.query.mockResolvedValueOnce({
      rows: [{ session_id: VALID_SESSION_ID, task_id: NEW_TASK_ID, is_active: true }],
    });

    const res = await request(app)
      .post(`/api/sessions/${VALID_SESSION_ID}/switch`)
      .send({ new_task_id: NEW_TASK_ID });

    expect(res.status).toBe(200);
    expect(res.body.task_id).toBe(NEW_TASK_ID);
  });

  it("returns 400 when new_task_id is missing", async () => {
    const res = await request(app)
      .post(`/api/sessions/${VALID_SESSION_ID}/switch`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when session not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/api/sessions/${VALID_SESSION_ID}/switch`)
      .send({ new_task_id: VALID_TASK_ID });

    expect(res.status).toBe(404);
  });
});
