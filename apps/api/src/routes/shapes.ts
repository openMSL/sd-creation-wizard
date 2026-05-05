import { Hono } from "hono";
import { getShapeCache } from "../services/shape-cache.js";

export const shapesRoutes = new Hono();

/**
 * GET /getAvailableShapes
 * Returns all cached shapes grouped by ecosystem/category.
 */
shapesRoutes.get("/getAvailableShapes", (c) => {
  const cache = getShapeCache();
  return c.json(cache.availableShapes);
});

/**
 * GET /getAvailableShapesCategorized
 * Returns shapes for a specific ecosystem.
 */
shapesRoutes.get("/getAvailableShapesCategorized", (c) => {
  const ecosystem = c.req.query("ecosystem");
  if (!ecosystem) {
    return c.text("Error: ecosystem parameter required", 400);
  }

  const cache = getShapeCache();
  const result = cache.availableShapes[ecosystem];
  if (!result) {
    return c.json({});
  }
  return c.json(result);
});

/**
 * GET /getJSON
 * Returns the pre-converted JSON for a specific shape.
 */
shapesRoutes.get("/getJSON", (c) => {
  const ecosystem = c.req.query("ecosystem");
  const name = c.req.query("name");

  if (!ecosystem || !name) {
    return c.text("Error: ecosystem and name parameters required", 400);
  }

  // Guard against path traversal
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return c.text("Error: Invalid name parameter", 400);
  }

  const cache = getShapeCache();
  const json = cache.getProcessedJson(ecosystem, name);
  if (!json) {
    return c.text("Error: Shape not found", 404);
  }

  return c.json(json);
});

/**
 * GET /getSearchQuery/:ecoSystem/:query
 * Search shapes by filename substring.
 */
shapesRoutes.get("/getSearchQuery/:ecoSystem/:query", (c) => {
  const ecosystem = c.req.param("ecoSystem");
  const query = c.req.param("query")?.toLowerCase();

  if (!ecosystem || !query) {
    return c.text("Error: ecosystem and query parameters required", 400);
  }

  const cache = getShapeCache();
  const ecosystemShapes = cache.availableShapes[ecosystem];
  if (!ecosystemShapes) {
    return c.json({});
  }

  const results: Record<string, string[]> = {};
  for (const [category, files] of Object.entries(ecosystemShapes)) {
    const matching = (files as string[]).filter((f) => f.toLowerCase().includes(query));
    if (matching.length > 0) {
      results[category] = matching;
    }
  }

  return c.json(results);
});
