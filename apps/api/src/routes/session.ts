import { Hono } from "hono";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export const sessionRoutes = new Hono();

interface WizardSession {
  shaclContent: string;
  jsonLdContent: string;
  outputPath: string;
  provenanceContent: string;
  assetName: string;
  createdAt: number;
  exported: boolean;
}

let currentSession: WizardSession | null = null;

// Queue state for batch review mode
let sessionQueue: WizardSession[] = [];
let queueIndex = 0;
let queueActive = false;

/**
 * POST /session
 * Creates a wizard session with SHACL + JSON-LD content and an output path.
 * Called by wizard_caller to hand off files to the browser UI.
 */
sessionRoutes.post("/session", async (c) => {
  const body = await c.req.parseBody();
  const shaclFile = body["shaclFile"];
  const jsonLdFile = body["jsonLdFile"];
  const provenanceFile = body["provenanceFile"];
  const outputPath = body["outputPath"];
  const assetName = body["assetName"];

  if (!shaclFile || typeof shaclFile === "string") {
    return c.text("Error: No SHACL file uploaded", 400);
  }
  if (!outputPath || typeof outputPath !== "string") {
    return c.text("Error: outputPath is required", 400);
  }

  const shaclContent = await (shaclFile as File).text();
  const jsonLdContent =
    jsonLdFile && typeof jsonLdFile !== "string" ? await (jsonLdFile as File).text() : "";
  const provenanceContent =
    provenanceFile && typeof provenanceFile !== "string"
      ? await (provenanceFile as File).text()
      : "";

  currentSession = {
    shaclContent,
    jsonLdContent,
    outputPath,
    provenanceContent,
    assetName: typeof assetName === "string" ? assetName : "",
    createdAt: Date.now(),
    exported: false,
  };

  return c.json({
    status: "ok",
    hasJsonLd: jsonLdContent.length > 0,
    hasProvenance: provenanceContent.length > 0,
    assetName: currentSession.assetName,
  });
});

/**
 * GET /session
 * Returns the current session state (for the frontend to auto-load).
 * In queue mode, returns the current queue item.
 */
sessionRoutes.get("/session", (c) => {
  const session = queueActive ? sessionQueue[queueIndex] ?? null : currentSession;

  if (!session) {
    return c.json({ active: false });
  }

  return c.json({
    active: true,
    shaclContent: session.shaclContent,
    jsonLdContent: session.jsonLdContent || null,
    provenanceContent: session.provenanceContent || null,
    assetName: session.assetName || null,
    exported: session.exported,
    // Queue metadata (omitted when not in queue mode)
    ...(queueActive && {
      queue: {
        total: sessionQueue.length,
        current: queueIndex,
        completed: sessionQueue.filter((s) => s.exported).length,
      },
    }),
  });
});

/**
 * POST /session/export
 * Frontend sends the final JSON-LD. API writes it to outputPath.
 * In queue mode, auto-advances to the next session.
 */
sessionRoutes.post("/session/export", async (c) => {
  const session = queueActive ? sessionQueue[queueIndex] ?? null : currentSession;

  if (!session) {
    return c.text("Error: No active session", 400);
  }

  const body = await c.req.json<{ jsonLd: unknown }>();
  if (!body.jsonLd) {
    return c.text("Error: jsonLd field is required", 400);
  }

  const outputDir = dirname(session.outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const content = JSON.stringify(body.jsonLd, null, 2);
  await writeFile(session.outputPath, content, "utf-8");
  session.exported = true;

  // In queue mode, auto-advance to the next unexported session
  let nextIndex: number | null = null;
  if (queueActive && queueIndex < sessionQueue.length - 1) {
    queueIndex++;
    nextIndex = queueIndex;
  }

  return c.json({
    status: "exported",
    path: session.outputPath,
    ...(queueActive && {
      queue: {
        total: sessionQueue.length,
        current: queueIndex,
        completed: sessionQueue.filter((s) => s.exported).length,
        allExported: sessionQueue.every((s) => s.exported),
        advanced: nextIndex !== null,
      },
    }),
  });
});

/**
 * GET /session/status
 * Polling endpoint for wizard_caller to check if export is done.
 * In queue mode, reports queue-level progress.
 */
sessionRoutes.get("/session/status", (c) => {
  if (queueActive) {
    return c.json({
      active: true,
      exported: sessionQueue.every((s) => s.exported),
      queue: {
        total: sessionQueue.length,
        current: queueIndex,
        completed: sessionQueue.filter((s) => s.exported).length,
        allExported: sessionQueue.every((s) => s.exported),
      },
    });
  }

  if (!currentSession) {
    return c.json({ active: false, exported: false });
  }
  return c.json({ active: true, exported: currentSession.exported });
});

/**
 * DELETE /session
 * Clears the current session and any active queue.
 */
sessionRoutes.delete("/session", (c) => {
  currentSession = null;
  sessionQueue = [];
  queueIndex = 0;
  queueActive = false;
  return c.json({ status: "cleared" });
});

// ── Queue endpoints ─────────────────────────────────────────────────

interface QueueSessionInput {
  shaclContent: string;
  jsonLdContent?: string;
  provenanceContent?: string;
  assetName?: string;
  outputPath: string;
}

/**
 * POST /session/queue
 * Create a batch queue of sessions for review mode.
 * Accepts { sessions: QueueSessionInput[] }.
 */
sessionRoutes.post("/session/queue", async (c) => {
  const body = await c.req.json<{ sessions: QueueSessionInput[] }>();

  if (!body.sessions || !Array.isArray(body.sessions) || body.sessions.length === 0) {
    return c.text("Error: sessions array is required and must not be empty", 400);
  }

  sessionQueue = body.sessions.map((s) => ({
    shaclContent: s.shaclContent,
    jsonLdContent: s.jsonLdContent ?? "",
    outputPath: s.outputPath,
    provenanceContent: s.provenanceContent ?? "",
    assetName: s.assetName ?? "",
    createdAt: Date.now(),
    exported: false,
  }));

  queueIndex = 0;
  queueActive = true;
  currentSession = null;

  return c.json({
    status: "ok",
    total: sessionQueue.length,
    assets: sessionQueue.map((s) => s.assetName),
  });
});

/**
 * GET /session/queue/status
 * Returns queue progress for batch_runner polling.
 */
sessionRoutes.get("/session/queue/status", (c) => {
  if (!queueActive) {
    return c.json({ active: false });
  }

  return c.json({
    active: true,
    total: sessionQueue.length,
    current: queueIndex,
    completed: sessionQueue.filter((s) => s.exported).length,
    allExported: sessionQueue.every((s) => s.exported),
    assets: sessionQueue.map((s, i) => ({
      name: s.assetName,
      exported: s.exported,
      current: i === queueIndex,
    })),
  });
});

/**
 * POST /session/queue/next
 * Advance to the next session in the queue.
 */
sessionRoutes.post("/session/queue/next", (c) => {
  if (!queueActive) {
    return c.text("Error: No active queue", 400);
  }

  if (queueIndex < sessionQueue.length - 1) {
    queueIndex++;
    return c.json({ status: "ok", current: queueIndex, assetName: sessionQueue[queueIndex]?.assetName });
  }

  return c.json({ status: "end", current: queueIndex, message: "Already at last session" });
});

/**
 * POST /session/queue/prev
 * Go back to the previous session in the queue.
 */
sessionRoutes.post("/session/queue/prev", (c) => {
  if (!queueActive) {
    return c.text("Error: No active queue", 400);
  }

  if (queueIndex > 0) {
    queueIndex--;
    return c.json({ status: "ok", current: queueIndex, assetName: sessionQueue[queueIndex]?.assetName });
  }

  return c.json({ status: "start", current: queueIndex, message: "Already at first session" });
});
