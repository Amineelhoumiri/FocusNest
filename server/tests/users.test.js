const request = require("supertest");
const express = require("express");

// ── Mocks ────────────────────────────────────────────────────────────────────
const { mockAuthMiddleware, TEST_USER } = require("./helpers/mockAuth");

jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../config/db");
jest.mock("../services/encryption.service", () => ({
  encrypt: jest.fn(async (v) => Buffer.from(v)),
  decrypt: jest.fn(async (v) => v.toString()),
}));

const pool = require("../config/db");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/users", require("../routes/users.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/users/me", () => {
  it("returns 200 with user profile when authenticated", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          user_id: TEST_USER.user_id,
          full_name: "Test User",
          date_of_birth: null,
          address: null,
          profile_photo_url: null,
          phone_number: null,
          is_admin: false,
          created_at: new Date(),
          last_login_at: null,
          is_consented_core: true,
          is_consented_ai: false,
          is_consented_spotify: false,
          focus_score: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ streak: 3 }] }); // streak query

    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(TEST_USER.user_id);
    expect(res.body.email).toBe(TEST_USER.email);
    expect(res.body.streak).toBe(3);
  });

  it("returns 404 when user not in users table", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("returns 500 on DB error", async () => {
    pool.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/users/me", () => {
  it("returns 200 with updated fields", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ user_id: TEST_USER.user_id, full_name: "New Name" }],
    });

    const res = await request(app)
      .patch("/api/users/me")
      .send({ full_name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe("New Name");
  });

  it("returns 400 when no fields provided", async () => {
    const res = await request(app).patch("/api/users/me").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/users/me/score", () => {
  it("returns 200 with new focus_score", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ focus_score: 15 }] });

    const res = await request(app)
      .post("/api/users/me/score")
      .send({ points: 10 });

    expect(res.status).toBe(200);
    expect(res.body.focus_score).toBe(15);
  });

  it("returns 400 when points is missing", async () => {
    const res = await request(app).post("/api/users/me/score").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when points is negative", async () => {
    const res = await request(app)
      .post("/api/users/me/score")
      .send({ points: -5 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/users/me/password", () => {
  const bcrypt = require("bcrypt");

  it("returns 200 on successful password change", async () => {
    const hash = await bcrypt.hash("oldpass123", 10);
    pool.query
      .mockResolvedValueOnce({ rows: [{ password: hash }] }) // fetch account
      .mockResolvedValueOnce({ rows: [] }); // update

    const res = await request(app)
      .post("/api/users/me/password")
      .send({ currentPassword: "oldpass123", newPassword: "newpass456" });

    expect(res.status).toBe(200);
  });

  it("returns 401 when current password is wrong", async () => {
    const hash = await bcrypt.hash("correctpass", 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password: hash }] });

    const res = await request(app)
      .post("/api/users/me/password")
      .send({ currentPassword: "wrongpass", newPassword: "newpass456" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when new password is too short", async () => {
    const res = await request(app)
      .post("/api/users/me/password")
      .send({ currentPassword: "oldpass123", newPassword: "short" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/users/me/password").send({});
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/me/nuke", () => {
  const bcrypt = require("bcrypt");

  it("returns 204 for credential user with correct password", async () => {
    const hash = await bcrypt.hash("mypassword", 10);
    pool.query
      .mockResolvedValueOnce({ rows: [{ password: hash }] }) // account check
      .mockResolvedValueOnce({ rows: [] })                   // DELETE users
      .mockResolvedValueOnce({ rows: [] });                  // DELETE "user"

    const res = await request(app)
      .delete("/api/users/me/nuke")
      .send({ password: "mypassword" });

    expect(res.status).toBe(204);
  });

  it("returns 401 for wrong password", async () => {
    const hash = await bcrypt.hash("correctpass", 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password: hash }] });

    const res = await request(app)
      .delete("/api/users/me/nuke")
      .send({ password: "wrongpass" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when password not provided for credential user", async () => {
    const hash = await bcrypt.hash("mypassword", 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password: hash }] });

    const res = await request(app).delete("/api/users/me/nuke").send({});
    expect(res.status).toBe(400);
  });

  it("returns 204 for OAuth-only user (no password required)", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // no credential account found
      .mockResolvedValueOnce({ rows: [] })   // DELETE users
      .mockResolvedValueOnce({ rows: [] });  // DELETE "user"

    const res = await request(app).delete("/api/users/me/nuke").send({});
    expect(res.status).toBe(204);
  });
});

describe("GET /api/users/me/export", () => {
  it("returns 200 with full user data export", async () => {
    const mockUser = { user_id: TEST_USER.user_id, full_name: "Test", date_of_birth: null, address: null, created_at: new Date() };
    pool.query
      .mockResolvedValueOnce({ rows: [mockUser] })   // users
      .mockResolvedValueOnce({ rows: [{ task_id: "t1" }] }) // tasks
      .mockResolvedValueOnce({ rows: [] })           // sessions
      .mockResolvedValueOnce({ rows: [] })           // chat_sessions
      .mockResolvedValueOnce({ rows: [] });          // consent_audit_log

    const res = await request(app).get("/api/users/me/export");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body).toHaveProperty("exported_at");
  });
});
