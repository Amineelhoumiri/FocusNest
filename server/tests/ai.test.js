const request = require("supertest");
const express = require("express");

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock("../middleware/auth", () => require("./helpers/mockAuth").mockAuthMiddleware);
jest.mock("../services/ai.service");

const { TEST_USER } = require("./helpers/mockAuth");
const aiService = require("../services/ai.service");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/ai", require("../routes/ai.routes"));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/ai/breakdown", () => {
  it("returns 200 with breakdown result", async () => {
    aiService.generateTaskBreakdown.mockResolvedValue("Step 1: Do this. Step 2: Do that.");

    const res = await request(app)
      .post("/api/ai/breakdown")
      .send({ task: "Build a rocket" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBe("Step 1: Do this. Step 2: Do that.");
    expect(aiService.generateTaskBreakdown).toHaveBeenCalledWith("Build a rocket", TEST_USER.user_id);
  });

  it("returns 500 when AI service throws", async () => {
    aiService.generateTaskBreakdown.mockRejectedValue(new Error("OpenAI timeout"));

    const res = await request(app)
      .post("/api/ai/breakdown")
      .send({ task: "Build a rocket" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI breakdown request failed");
  });
});

describe("POST /api/ai/prioritize", () => {
  it("returns 200 with prioritization result", async () => {
    aiService.prioritizeTasks.mockResolvedValue("Focus on task A first because...");

    const res = await request(app)
      .post("/api/ai/prioritize")
      .send({ task: "Email, report, meeting prep" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(aiService.prioritizeTasks).toHaveBeenCalledWith(
      "Email, report, meeting prep",
      TEST_USER.user_id
    );
  });

  it("returns 500 when AI service throws", async () => {
    aiService.prioritizeTasks.mockRejectedValue(new Error("OpenAI error"));

    const res = await request(app)
      .post("/api/ai/prioritize")
      .send({ task: "task list" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI prioritization request failed");
  });
});

describe("POST /api/ai/momentum", () => {
  it("returns 200 with momentum nudge", async () => {
    aiService.buildMomentum.mockResolvedValue("Start with just opening the file — that's it.");

    const res = await request(app)
      .post("/api/ai/momentum")
      .send({ task: "Write the report" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBe("Start with just opening the file — that's it.");
    expect(aiService.buildMomentum).toHaveBeenCalledWith("Write the report", TEST_USER.user_id);
  });

  it("returns 500 when AI service throws", async () => {
    aiService.buildMomentum.mockRejectedValue(new Error("Network error"));

    const res = await request(app)
      .post("/api/ai/momentum")
      .send({ task: "task" });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/ai/converse", () => {
  it("returns 200 with AI reply", async () => {
    aiService.converseWithFinch.mockResolvedValue("That sounds tough. Let's break it down.");

    const messages = [
      { role: "user", content: "I feel overwhelmed" },
    ];

    const res = await request(app)
      .post("/api/ai/converse")
      .send({ messages });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBe("That sounds tough. Let's break it down.");
    expect(aiService.converseWithFinch).toHaveBeenCalledWith(messages, TEST_USER.user_id);
  });

  it("returns 400 when messages array is missing", async () => {
    const res = await request(app)
      .post("/api/ai/converse")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("messages array is required");
  });

  it("returns 400 when messages is an empty array", async () => {
    const res = await request(app)
      .post("/api/ai/converse")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("messages array is required");
  });

  it("returns 500 when AI service throws", async () => {
    aiService.converseWithFinch.mockRejectedValue(new Error("OpenAI error"));

    const res = await request(app)
      .post("/api/ai/converse")
      .send({ messages: [{ role: "user", content: "Hi" }] });

    expect(res.status).toBe(500);
  });
});
