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
 */
sessionRoutes.get("/session", (c) => {
  if (!currentSession) {
    return c.json({ active: false });
  }

  return c.json({
    active: true,
    shaclContent: currentSession.shaclContent,
    jsonLdContent: currentSession.jsonLdContent || null,
    provenanceContent: currentSession.provenanceContent || null,
    assetName: currentSession.assetName || null,
    exported: currentSession.exported,
  });
});

/**
 * POST /session/export
 * Frontend sends the final JSON-LD. API writes it to outputPath.
 * wizard_caller polls GET /session/status to know when done.
 */
sessionRoutes.post("/session/export", async (c) => {
  if (!currentSession) {
    return c.text("Error: No active session", 400);
  }

  const body = await c.req.json<{ jsonLd: unknown }>();
  if (!body.jsonLd) {
    return c.text("Error: jsonLd field is required", 400);
  }

  const outputDir = dirname(currentSession.outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const content = JSON.stringify(body.jsonLd, null, 2);
  await writeFile(currentSession.outputPath, content, "utf-8");
  currentSession.exported = true;

  return c.json({ status: "exported", path: currentSession.outputPath });
});

/**
 * GET /session/status
 * Polling endpoint for wizard_caller to check if export is done.
 */
sessionRoutes.get("/session/status", (c) => {
  if (!currentSession) {
    return c.json({ active: false, exported: false });
  }
  return c.json({ active: true, exported: currentSession.exported });
});

/**
 * DELETE /session
 * Clears the current session.
 */
sessionRoutes.delete("/session", (c) => {
  currentSession = null;
  return c.json({ status: "cleared" });
});
