const request = require("supertest");
const express = require("express");

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { TEST_USER } = require("./helpers/mockAuth");

// Admin user mock — is_admin: true
const mockAdminMiddleware = (req, res, next) => {
  req.user = { ...TEST_USER, is_admin: true };
  next();
};

jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { ...require("./helpers/mockAuth").TEST_USER, is_admin: true };
  next();
});
jest.mock("../middleware/isAdmin", () => (req, res, next) => next());
jest.mock("../config/db");

const pool = require("../config/db");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/admin", require("../routes/admin.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/admin/usage", () => {
  it("returns 200 with usage logs and cost calculations", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, model: "gpt-4o-mini", prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, created_at: new Date() },
      ],
    });

    const res = await request(app).get("/api/admin/usage");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("cost");
    expect(typeof res.body[0].cost).toBe("number");
  });

  it("returns 200 with empty array when no usage", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/api/admin/usage");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/admin/chat-tokens", () => {
  it("returns 200 with summary and daily breakdown", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ total_messages: 10, total_tokens: 500, user_tokens: 200, assistant_tokens: 300, unique_users: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [{ date: "2026-03-20", tokens: 500, messages: 10 }],
      });

    const res = await request(app).get("/api/admin/chat-tokens");
    expect(res.status).toBe(200);
    expect(res.body.summary.total_tokens).toBe(500);
    expect(res.body.daily).toHaveLength(1);
  });
});

describe("DELETE /api/admin/users/:user_id", () => {
  it("returns 204 on successful delete", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // DELETE users
      .mockResolvedValueOnce({ rows: [] }); // DELETE "user"

    const res = await request(app).delete("/api/admin/users/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid user_id", async () => {
    const res = await request(app).delete("/api/admin/users/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/prompts", () => {
  it("returns 200 with system prompts list", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ key: "breakdown", prompt: "Break this task down..." }],
    });

    const res = await request(app).get("/api/admin/prompts");
    expect(res.status).toBe(200);
    expect(res.body[0].key).toBe("breakdown");
  });
});

describe("PATCH /api/admin/prompts/:key", () => {
  it("returns 200 on valid update", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ key: "breakdown", prompt: "New prompt text" }],
    });

    const res = await request(app)
      .patch("/api/admin/prompts/breakdown")
      .send({ prompt: "New prompt text" });

    expect(res.status).toBe(200);
    expect(res.body.prompt).toBe("New prompt text");
  });

  it("returns 400 when prompt body is missing", async () => {
    const res = await request(app)
      .patch("/api/admin/prompts/breakdown")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when prompt key not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/api/admin/prompts/nonexistent")
      .send({ prompt: "text" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/prompts/:key", () => {
  it("returns 204 on successful delete", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ key: "breakdown" }] });

    const res = await request(app).delete("/api/admin/prompts/breakdown");
    expect(res.status).toBe(204);
  });

  it("returns 404 when key not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/admin/prompts/nonexistent");
    expect(res.status).toBe(404);
  });
});
