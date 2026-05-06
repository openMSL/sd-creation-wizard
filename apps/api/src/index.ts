import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { shapesRoutes } from "./routes/shapes.js";
import { convertRoutes } from "./routes/convert.js";
import { sessionRoutes } from "./routes/session.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.onError(errorHandler);

app.route("/", shapesRoutes);
app.route("/", convertRoutes);
app.route("/", sessionRoutes);

const port = parseInt(process.env["PORT"] ?? "8080", 10);

console.log(`SD Creation Wizard API starting on port ${port}`);
serve({ fetch: app.fetch, port });
