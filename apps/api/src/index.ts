import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { shapesRoutes } from "./routes/shapes.js";
import { convertRoutes } from "./routes/convert.js";
import { sessionRoutes } from "./routes/session.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.use("*", bodyLimit({ maxSize: 10 * 1024 * 1024 })); // 10 MB
app.onError(errorHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/", shapesRoutes);
app.route("/", convertRoutes);
app.route("/", sessionRoutes);

const port = parseInt(process.env["PORT"] ?? "3007", 10);

console.log(`SD Creation Wizard API starting on port ${port}`);
serve({ fetch: app.fetch, port });
