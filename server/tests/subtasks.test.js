const request = require("supertest");
const express = require("express");

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { TEST_USER } = require("./helpers/mockAuth");

jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));
jest.mock("../services/ai.service", () => ({
  generateTaskBreakdown: jest.fn(),
}));

const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");
const { generateTaskBreakdown } = require("../services/ai.service");

const TASK_ID    = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const SUBTASK_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/tasks/:task_id/subtasks", require("../routes/subtasks.routes"));

beforeEach(() => {
  encrypt.mockImplementation(async (v) => Buffer.from(v));
  decrypt.mockImplementation(async (v) => v.toString());
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/tasks/:task_id/subtasks", () => {
  it("returns 200 with subtask list", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] }) // task ownership check
      .mockResolvedValueOnce({
        rows: [{ subtask_id: SUBTASK_ID, subtask_name: Buffer.from("Step 1"), subtask_status: "Backlog" }],
      });

    const res = await request(app).get(`/api/tasks/${TASK_ID}/subtasks`);
    expect(res.status).toBe(200);
    expect(res.body[0].subtask_name).toBe("Step 1");
  });

  it("returns 404 when task not found or not owned", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/tasks/${TASK_ID}/subtasks`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid task_id UUID", async () => {
    const res = await request(app).get("/api/tasks/bad-id/subtasks");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tasks/:task_id/subtasks/:subtask_id", () => {
  it("returns 200 for valid subtask", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({
        rows: [{ subtask_id: SUBTASK_ID, subtask_name: Buffer.from("Step 1"), subtask_status: "Backlog" }],
      });

    const res = await request(app).get(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.subtask_name).toBe("Step 1");
  });

  it("returns 404 when subtask not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tasks/:task_id/subtasks", () => {
  it("returns 201 on valid creation", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({
        rows: [{ subtask_id: SUBTASK_ID, subtask_status: "Backlog", energy_level: "Low", is_approved: false }],
      });

    const res = await request(app)
      .post(`/api/tasks/${TASK_ID}/subtasks`)
      .send({ subtask_name: "Step 1", energy_level: "Low" });

    expect(res.status).toBe(201);
    expect(res.body.subtask_name).toBe("Step 1");
    expect(res.body.is_approved).toBe(false);
  });

  it("returns 400 when subtask_name is missing", async () => {
    const res = await request(app)
      .post(`/api/tasks/${TASK_ID}/subtasks`)
      .send({ energy_level: "Low" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid energy_level", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] });
    const res = await request(app)
      .post(`/api/tasks/${TASK_ID}/subtasks`)
      .send({ subtask_name: "Step", energy_level: "Ultra" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when task not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`/api/tasks/${TASK_ID}/subtasks`)
      .send({ subtask_name: "Step 1", energy_level: "Low" });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/tasks/:task_id/subtasks/:subtask_id", () => {
  it("returns 200 on valid update", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({
        rows: [{ subtask_id: SUBTASK_ID, subtask_status: "Done", is_approved: true }],
      });

    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`)
      .send({ subtask_status: "Done" });

    expect(res.status).toBe(200);
  });

  it("returns 400 when no fields provided", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] });
    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 409 when trying to set second Doing subtask", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })         // task check
      .mockResolvedValueOnce({ rows: [{ subtask_id: "other-id" }] });   // existing Doing

    const res = await request(app)
      .patch(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`)
      .send({ subtask_status: "Doing" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SINGLE_SUBTASK_VIOLATION");
  });
});

describe("DELETE /api/tasks/:task_id/subtasks/:subtask_id", () => {
  it("returns 204 on successful delete", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({ rows: [{ subtask_id: SUBTASK_ID }] });

    const res = await request(app).delete(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`);
    expect(res.status).toBe(204);
  });

  it("returns 404 when subtask not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ task_id: TASK_ID }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/tasks/${TASK_ID}/subtasks/${SUBTASK_ID}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tasks/:task_id/subtasks/generate", () => {
  it("returns 201 with AI-generated subtasks (is_approved=false)", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ task_name: Buffer.from("Write report") }], // task lookup
      })
      .mockResolvedValueOnce({ rows: [{ subtask_id: SUBTASK_ID, subtask_name: Buffer.from("Outline"), energy_level: "Low", is_approved: false }] })
      .mockResolvedValueOnce({ rows: [{ subtask_id: SUBTASK_ID, subtask_name: Buffer.from("Draft"), energy_level: "High", is_approved: false }] });

    generateTaskBreakdown.mockResolvedValueOnce({
      subtasks: [
        { subtask_name: "Outline", energy_level: "Low" },
        { subtask_name: "Draft", energy_level: "High" },
      ],
      chat_opening: "Let's break this down!",
    });

    const res = await request(app).post(`/api/tasks/${TASK_ID}/subtasks/generate`);
    expect(res.status).toBe(201);
    expect(res.body.subtasks).toHaveLength(2);
    expect(res.body.subtasks[0].is_approved).toBe(false);
    expect(res.body.chat_opening).toBe("Let's break this down!");
  });

  it("returns 400 for invalid task_id UUID", async () => {
    const res = await request(app).post("/api/tasks/not-a-uuid/subtasks/generate");
    expect(res.status).toBe(400);
  });

  it("returns 404 when task not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/tasks/${TASK_ID}/subtasks/generate`);
    expect(res.status).toBe(404);
  });

  it("returns 500 when AI returns invalid response", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ task_name: Buffer.from("Write report") }] });
    generateTaskBreakdown.mockResolvedValueOnce(null);

    const res = await request(app).post(`/api/tasks/${TASK_ID}/subtasks/generate`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI_ERROR");
  });
});
