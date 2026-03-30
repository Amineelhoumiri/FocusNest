const request = require("supertest");
const express = require("express");

// ── Mocks ────────────────────────────────────────────────────────────────────
const { TEST_USER } = require("./helpers/mockAuth");

jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(async (v) => Buffer.from(v)),
  decrypt: jest.fn(async (v) => v.toString()),
}));

const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");

beforeEach(() => {
  encrypt.mockImplementation(async (v) => Buffer.from(v));
  decrypt.mockImplementation(async (v) => v.toString());
});

const VALID_TASK_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_TASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/tasks", require("../routes/tasks.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/tasks", () => {
  it("returns 200 with decrypted task list", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ task_id: VALID_TASK_ID, task_name: Buffer.from("Buy groceries"), task_status: "Backlog" }],
    });

    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body[0].task_name).toBe("Buy groceries");
  });

  it("returns empty array when user has no tasks", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/tasks/:task_id", () => {
  it("returns 200 for own task", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ task_id: VALID_TASK_ID, task_name: Buffer.from("My task"), user_id: TEST_USER.user_id }],
    });

    const res = await request(app).get(`/api/tasks/${VALID_TASK_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.task_name).toBe("My task");
  });

  it("returns 404 for another user's task (ownership isolation)", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // WHERE user_id = $2 filters it out

    const res = await request(app).get(`/api/tasks/${OTHER_USER_TASK_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).get("/api/tasks/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/tasks", () => {
  it("returns 201 on valid creation", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ task_id: VALID_TASK_ID, task_name: Buffer.from("New task"), task_status: "Backlog" }],
    });

    const res = await request(app)
      .post("/api/tasks")
      .send({ task_name: "New task", energy_level: "High" });

    expect(res.status).toBe(201);
    expect(res.body.task_name).toBe("New task");
  });

  it("returns 400 when task_name is missing", async () => {
    const res = await request(app).post("/api/tasks").send({ energy_level: "High" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when energy_level is missing", async () => {
    const res = await request(app).post("/api/tasks").send({ task_name: "My task" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when trying to create second Doing task", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ task_id: "existing-doing" }] }); // existing Doing

    const res = await request(app)
      .post("/api/tasks")
      .send({ task_name: "Another task", energy_level: "Low", task_status: "Doing" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/one task/i);
  });
});

describe("PATCH /api/tasks/:task_id", () => {
  it("returns 200 on valid update", async () => {
    // task_status "Done" skips the Doing-conflict check — only one query fires
    pool.query.mockResolvedValueOnce({
      rows: [{ task_id: VALID_TASK_ID, task_name: Buffer.from("Updated"), task_status: "Done" }],
    });

    const res = await request(app)
      .patch(`/api/tasks/${VALID_TASK_ID}`)
      .send({ task_status: "Done" });

    expect(res.status).toBe(200);
  });

  it("returns 400 when no fields sent", async () => {
    const res = await request(app).patch(`/api/tasks/${VALID_TASK_ID}`).send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).patch("/api/tasks/bad-id").send({ task_status: "Done" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's task", async () => {
    // task_status "Done" → no Doing check → single UPDATE returns empty rows
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch(`/api/tasks/${VALID_TASK_ID}`)
      .send({ task_status: "Done" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/tasks/:task_id", () => {
  it("returns 204 on successful delete", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ task_id: VALID_TASK_ID }] });

    const res = await request(app).delete(`/api/tasks/${VALID_TASK_ID}`);
    expect(res.status).toBe(204);
  });

  it("returns 404 when task not found or belongs to another user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/tasks/${VALID_TASK_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).delete("/api/tasks/not-valid");
    expect(res.status).toBe(400);
  });
});
