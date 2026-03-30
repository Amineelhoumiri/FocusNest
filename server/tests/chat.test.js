const request = require("supertest");
const express = require("express");

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");

const CHAT_SESSION_ID = "cccccccc-cccc-4ccc-aaaa-cccccccccccc";

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/chat", require("../routes/chat.routes"));

beforeEach(() => {
  encrypt.mockImplementation(async (v) => Buffer.from(v));
  decrypt.mockImplementation(async (v) => v.toString());
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/chat", () => {
  it("returns 201 with new chat session", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ chat_session_id: CHAT_SESSION_ID, created_at: new Date() }],
    });

    const res = await request(app).post("/api/chat");
    expect(res.status).toBe(201);
    expect(res.body.chat_session_id).toBe(CHAT_SESSION_ID);
  });
});

describe("GET /api/chat", () => {
  it("returns 200 with list of user chat sessions", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ chat_session_id: CHAT_SESSION_ID, created_at: new Date(), ended_at: null }],
    });

    const res = await request(app).get("/api/chat");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/chat/:chat_session_id", () => {
  it("returns 200 with decrypted messages", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ chat_session_id: CHAT_SESSION_ID }] }) // ownership check
      .mockResolvedValueOnce({
        rows: [{ chat_message_id: 1, role: "user", content: Buffer.from("Hello") }],
      });

    const res = await request(app).get(`/api/chat/${CHAT_SESSION_ID}`);
    expect(res.status).toBe(200);
    expect(res.body[0].content).toBe("Hello");
  });

  it("returns 404 when session belongs to another user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/chat/${CHAT_SESSION_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).get("/api/chat/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/chat/:chat_session_id/messages", () => {
  it("returns 201 with sent message", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ chat_session_id: CHAT_SESSION_ID, ended_at: null }] })
      .mockResolvedValueOnce({ rows: [{ chat_message_id: 1, role: "user", content: Buffer.from("Hello") }] })
      .mockResolvedValueOnce({ rows: [] }); // update session timestamp

    const res = await request(app)
      .post(`/api/chat/${CHAT_SESSION_ID}/messages`)
      .send({ role: "user", content: "Hello" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Hello");
  });

  it("returns 400 when content is missing", async () => {
    const res = await request(app)
      .post(`/api/chat/${CHAT_SESSION_ID}/messages`)
      .send({ role: "user" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when sending to an ended session", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ chat_session_id: CHAT_SESSION_ID, ended_at: new Date() }],
    });

    const res = await request(app)
      .post(`/api/chat/${CHAT_SESSION_ID}/messages`)
      .send({ role: "user", content: "Hello" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already ended/i);
  });

  it("returns 404 when session not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/api/chat/${CHAT_SESSION_ID}/messages`)
      .send({ role: "user", content: "Hello" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/chat/:chat_session_id", () => {
  it("returns 200 when ending an active session", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ chat_session_id: CHAT_SESSION_ID, ended_at: new Date() }],
    });

    const res = await request(app).patch(`/api/chat/${CHAT_SESSION_ID}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 when session already ended or not found", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/chat/${CHAT_SESSION_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).patch("/api/chat/bad-id");
    expect(res.status).toBe(400);
  });
});
