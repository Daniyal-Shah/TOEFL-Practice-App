import { getErrorMessage, sendJson } from "../lib/http.js";
import { getStatistics } from "../lib/stats-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const statistics = await getStatistics();
    return sendJson(res, 200, statistics);
  } catch (error) {
    console.error("GET /api/statistics failed:", error);
    return sendJson(res, 500, { error: getErrorMessage(error) });
  }
}
