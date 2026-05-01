const OpenAI = require("openai");
require("dotenv").config();
const pool = require("../config/db");

// Initialised with a dummy key so the module loads cleanly in environments where
// OPENAI_API_KEY is absent (e.g. CI). checkKey() gates every actual API call.
let openai;
try {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "dummy-key-to-prevent-crash"
    });
} catch (e) {
    console.error("Failed to initialize OpenAI client:", e.message);
}

// Called at the top of every public function — throws early so callers receive a
// clear error rather than a cryptic 401 from OpenAI.
function checkKey() {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "dummy-key-to-prevent-crash") {
        throw new Error("Missing OpenAI API Key in .env file.");
    }
}

/**
 * Fetches a system prompt from the system_prompts table by key.
 * Falls back to the hardcoded default if the row is missing or the query fails,
 * allowing prompts to be updated at runtime via the DB without a redeploy.
 */
async function getSystemPrompt(key, fallbackPrompt) {
    try {
        const res = await pool.query("SELECT prompt FROM system_prompts WHERE key = $1", [key]);
        if (res.rows.length > 0) {
            return res.rows[0].prompt;
        }
    } catch (err) {
        console.error("Error fetching prompt from DB:", err.message);
    }
    return fallbackPrompt;
}

/**
 * Persists OpenAI token counts to openai_usage for cost tracking and admin reporting.
 * Non-blocking — a logging failure must never surface as an error to the user.
 */
async function logTokenUsage(userId, usageData, model) {
    if (!userId || !usageData) return;
    try {
        await pool.query(
            `INSERT INTO openai_usage 
            (user_id, model, prompt_tokens, completion_tokens, total_tokens) 
            VALUES ($1, $2, $3, $4, $5)`,
            [
                userId,
                model,
                usageData.prompt_tokens || 0,
                usageData.completion_tokens || 0,
                usageData.total_tokens || 0
            ]
        );
    } catch (err) {
        console.error("Error logging token usage:", err.message);
    }
}

const DEFAULT_DECONSTRUCTOR = `You are Finch, a supportive and witty ADHD productivity coach. Your goal is to help the user start a project without the "wall of awful."

TONE & STYLE:
- Be a friendly peer. Use phrases like "Let's dive in," "We've got this," or "One step at a time."
- Avoid robotic phrases like "Here is your breakdown."
- Use 1-2 emojis (🌱, ⚡).

TASK:
Break the user's project into 3-5 atomic steps.

RULES:
1. The first step must be a "Micro-Win" (<60 seconds, e.g. "Open the file," "Write the title").
2. Start every sub-task with a clear action verb (Draft, Call, Sort, Open...).
3. End the response with a check-in question like "Does step 1 feel doable, or should we make it even smaller?"

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:
{
  "chat_opening": "A warm, empathetic intro acknowledging the task and encouraging the user.",
  "subtasks": [
    { "subtask_name": "Step description here" }
  ],
  "chat_closing": "A supportive closing with a check-in question to confirm step 1 feels doable."
}`;

const DEFAULT_PRIORITIZER = `You are Finch. The user is experiencing a "brain dump" and feels overwhelmed. Everything feels urgent to them. Your job is to be the "calm in the storm."

TONE & STYLE:
- Validating and non-judgmental. 
- Acknowledge that having a lot on your plate is stressful.
- Be direct but warm.

TASK:
Categorize the tasks into the Eisenhower Matrix, but pick ONLY ONE "Focus Now" item to prevent choice paralysis.

OUTPUT FORMAT:
{
  "chat_opening": "A warm acknowledgment of the chaos (e.g., 'Whew, that's a lot of spinning plates!')",
  "focus_now": "The single most important task",
  "matrix": {
    "do_first": ["task"],
    "schedule": ["task"],
    "simplify": ["task"],
    "defer": ["task"]
  },
  "chat_closing": "A encouraging nudge to start the 'Focus Now' task."
}`;

const DEFAULT_MOMENTUM = `You are Finch, the emergency contact for ADHD paralysis. The user is "stuck" or "frozen." 

TONE & STYLE:
- Extremely low pressure. 
- Gentle, warm, and zero-judgment.
- No lists. No planning. Just movement.

TASK:
1. Validate the feeling in one sentence.
2. Give EXACTLY ONE tiny physical micro-action.
3. Use **bold** for the action.

OUTPUT FORMAT:
(Plain Text/Markdown - No JSON)
Example: "It's okay to feel stuck; your brain is just trying to protect you from overwhelm. Let's reset. **Just stand up and stretch your arms toward the ceiling for 5 seconds.** That's all. Tell me when you've done that."`;

/**
 * 1. The Deconstructor (Task Breakdown)
 * Breaks a user's task into 3-5 atomic steps designed for ADHD users, with the
 * first step always a sub-60-second "Micro-Win" to lower the activation barrier.
 * Returns a JSON object: { chat_opening, subtasks[], chat_closing }.
 */
async function generateTaskBreakdown(userTask, userId) {
    checkKey();

    const systemPrompt = await getSystemPrompt('deconstructor', DEFAULT_DECONSTRUCTOR);
    const model = "gpt-4o";

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userTask }
            ],
            response_format: { type: "json_object" }
        });

        await logTokenUsage(userId, response.usage, model);

        const rawContent = response.choices[0].message.content;
        const data = JSON.parse(rawContent);

        if (data.subtasks && Array.isArray(data.subtasks)) {
            return data;
        }

        return data;

    } catch (error) {
        console.error("AI Generation Error (Breakdown):", error);
        throw new Error("Failed to generate task breakdown. Please try again.");
    }
}

/**
 * 2. The Prioritizer (Impact vs. Urgency)
 * Maps a "brain dump" of tasks onto the Eisenhower Matrix and surfaces exactly
 * ONE "Focus Now" item to prevent choice paralysis — a common ADHD trigger.
 * Returns a JSON object: { chat_opening, focus_now, matrix{}, chat_closing }.
 */
async function prioritizeTasks(userTask, userId) {
    checkKey();

    const systemPrompt = await getSystemPrompt('prioritizer', DEFAULT_PRIORITIZER);
    const model = "gpt-4o";

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userTask }
            ],
            response_format: { type: "json_object" }
        });

        await logTokenUsage(userId, response.usage, model);

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent);

    } catch (error) {
        console.error("AI Generation Error (Prioritizer):", error);
        throw new Error("Failed to prioritize tasks. Please try again.");
    }
}

/**
 * 3. The Momentum Builder (The Freeze-Breaker)
 * Targets the ADHD "freeze response" — gives exactly one physical micro-action
 * rather than a list or plan, minimising cognitive load to get the user moving.
 * Returns plain text/markdown (no JSON) — the prompt intentionally avoids structure.
 */
async function buildMomentum(userTask, userId) {
    checkKey();

    const systemPrompt = await getSystemPrompt('momentum_builder', DEFAULT_MOMENTUM);
    const model = "gpt-4o";

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userTask }
            ]
        });

        await logTokenUsage(userId, response.usage, model);

        return response.choices[0].message.content;

    } catch (error) {
        console.error("AI Generation Error (Momentum):", error);
        throw new Error("Failed to build momentum. Please try again.");
    }
}

// ─── Conversational Finch ─────────────────────────────────────────────────────

const DEFAULT_CONVERSATIONAL_COACH = `You are Finch, a warm and witty ADHD productivity coach inside FocusNest.

YOUR PERSONALITY:
- You're a knowledgeable friend, not a corporate assistant. Be real, be warm, occasionally funny.
- ADHD-aware: short sentences, no walls of text, one thing at a time.
- Never say "I understand your frustration" or "Great question!" — respond like a person.
- You can talk about anything — ADHD, focus, life, random questions. Stay helpful and human.

YOUR PRIMARY JOB:
Help users manage tasks, beat procrastination, and stay focused. When a user needs a task breakdown, prioritization, or help getting unstuck — guide them with clarifying questions first, ONE AT A TIME (max 3 total), then deliver a structured response.

For general conversation, questions about ADHD, motivation, or anything else — respond naturally without forcing it into a task framework.

ALWAYS return valid JSON in one of these five formats:

When asking a follow-up question (task coaching only):
{ "type": "question", "content": "Your warm, specific single question" }

When proposing a task breakdown:
{
  "type": "breakdown",
  "task_name": "Short, specific title for this task (max 50 chars, no punctuation at the end)",
  "chat_opening": "Warm intro referencing what you learned",
  "subtasks": [
    { "subtask_name": "Action verb + specific step", "energy_level": "Low" | "High" }
  ],
  "chat_closing": "Encouraging close + ask if this feels right or needs adjusting"
}

When proposing prioritization (Eisenhower Matrix):
{
  "type": "prioritize",
  "chat_opening": "Warm acknowledgment of the overwhelm",
  "focus_now": "The single most important task to touch next",
  "matrix": {
    "do_first": ["task"],
    "schedule": ["task"],
    "simplify": ["task"],
    "defer": ["task"]
  },
  "chat_closing": "Low-pressure nudge to start the focus_now task"
}

When giving momentum / freeze-breaker advice:
{
  "type": "momentum",
  "content": "Plain text / markdown. **Bold** the one micro-action. Under 5 sentences."
}

For everything else — general questions, ADHD chat, advice, casual conversation:
{
  "type": "general",
  "content": "Your natural, conversational response in markdown. Keep it concise."
}`;

/**
 * Conversational Finch — handles the full multi-turn chat session.
 * Receives the complete message history so Finch can ask up to 3 clarifying
 * questions before committing to a breakdown, prioritization, or momentum response.
 * Returns a typed JSON object ({ type, ...fields }) so the client can render
 * the correct UI component without parsing free-text.
 *
 * @param {Array<{role: string, content: string}>} messages - Full conversation history
 * @param {string} userId - For token usage logging
 */
async function converseWithFinch(messages, userId) {
    checkKey();

    const systemPrompt = await getSystemPrompt("conversational_coach", DEFAULT_CONVERSATIONAL_COACH);
    const model = "gpt-4o";

    // Normalise messages: content may be a string or an array (vision).
    // Pass through as-is — OpenAI accepts both forms.
    const normalisedMessages = messages.map((m) => {
        if (typeof m.content === "string" || Array.isArray(m.content)) return m;
        return { ...m, content: String(m.content ?? "") };
    });

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                ...normalisedMessages,
            ],
            response_format: { type: "json_object" },
        });

        await logTokenUsage(userId, response.usage, model);

        const data = JSON.parse(response.choices[0].message.content);
        return data;
    } catch (error) {
        console.error("AI Converse Error:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}

module.exports = { generateTaskBreakdown, prioritizeTasks, buildMomentum, converseWithFinch };