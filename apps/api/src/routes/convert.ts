import { Hono } from "hono";
import { extractShaclModel } from "@sd-creation-wizard/shacl-core";
import type { ResponseShaclJsonPair } from "@sd-creation-wizard/shacl-core";
import { prefillFromJsonLd } from "../services/prefill.js";

export const convertRoutes = new Hono();

/**
 * POST /convertFile
 * Accepts multipart form with field "file" (SHACL Turtle).
 * Returns ShaclModel JSON.
 */
convertRoutes.post("/convertFile", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.text("Error: No file uploaded or invalid file field", 400);
  }

  try {
    const content = await (file as File).text();
    const model = extractShaclModel(content);
    return c.json(model);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`Error: ${message}`, 400);
  }
});

/**
 * POST /convertAndPrefillFile
 * Accepts multipart form with "file" (SHACL Turtle) and "jsonFile" (JSON-LD).
 * Returns { shaclModel, matchedSubjects }.
 */
convertRoutes.post("/convertAndPrefillFile", async (c) => {
  const body = await c.req.parseBody();
  const shaclFile = body["file"];
  const jsonFile = body["jsonFile"];

  if (!shaclFile || typeof shaclFile === "string") {
    return c.text("Error: No SHACL file uploaded", 400);
  }
  if (!jsonFile || typeof jsonFile === "string") {
    return c.text("Error: No JSON-LD file uploaded", 400);
  }

  try {
    const shaclContent = await (shaclFile as File).text();
    const jsonContent = await (jsonFile as File).text();

    const shaclModel = extractShaclModel(shaclContent);
    const matchedSubjects = prefillFromJsonLd(shaclModel, shaclModel.prefixList, jsonContent);

    const response: ResponseShaclJsonPair = { shaclModel, matchedSubjects };
    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`Error: ${message}`, 400);
  }
});
