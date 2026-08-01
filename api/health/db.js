import { getErrorMessage, sendJson } from "../lib/http.js";
import { checkDatabaseConnection } from "../lib/users-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    if (!process.env.MONGODB_URI) {
      return sendJson(res, 500, { error: "MONGODB_URI is not configured" });
    }

    await checkDatabaseConnection();
    return sendJson(res, 200, { ok: true, database: "connected" });
  } catch (error) {
    console.error("GET /api/health/db failed:", error);
    return sendJson(res, 500, { ok: false, error: getErrorMessage(error) });
  }
}
